import { NextRequest, NextResponse } from "next/server";
import { getDueReportsAdmin, markReportGeneratedAdmin, getAreaAdmin, updateReportAdmin, getReportAdmin } from "@/lib/firestore/admin";
import { initializeEarthEngine, getEarthEngine } from "@/lib/earthEngine";
import { calculateIndex, getSentinel2Collection, getMostRecentImage } from "@/lib/indices/calculations";
import { sendEmail } from "@/lib/email/resend";
import { sendReportWhatsAppWithPDF } from "@/lib/whatsapp/meta";
import { generateReportPDF } from "@/lib/pdf/generateReportPDF";
import { IndexType, ReportFrequency, Report } from "@/types/report";
import { getFrequencyLabel } from "@/lib/utils/reports";
import { calculatePolygonArea, squareMetersToKm } from "@/lib/utils/geometry";
import { compositeIndexOverlay } from '@/lib/images/compositeImage';
import { renderMapWithTiles } from '@/lib/images/tileRenderer';
import { uploadImageWithDedup, uploadPDFAdmin } from "@/lib/storage/admin-upload";
import sharp from 'sharp';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // Maximum 5 minutes (Vercel Pro limit)

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();
  
  try {
    console.log(`[Report Generate] Starting report generation at ${timestamp}`);
    
    // Check for authorization (optional: add API key check)
    const authHeader = request.headers.get("authorization");
    // For now, we'll allow calls without auth for cron jobs
    // In production, add proper authentication

    // Check for force parameter (for testing specific reports)
    const forceReportId = request.nextUrl.searchParams.get('forceReportId');
    
    let reports: Report[] = [];
    
    if (forceReportId) {
      // Force processing a specific report (for testing)
      console.log(`[Report Generate] Force mode: Processing report ${forceReportId} (bypassing nextRun check)`);
      const report = await getReportAdmin(forceReportId);
      
      if (!report) {
        return NextResponse.json({ 
          error: `Report ${forceReportId} not found`,
          timestamp,
        }, { status: 404 });
      }
      
      if (report.status !== 'active') {
        return NextResponse.json({ 
          error: `Report ${forceReportId} is not active (status: ${report.status})`,
          timestamp,
        }, { status: 400 });
      }
      
      reports = [report];
      console.log(`[Report Generate] Force processing report: ${report.id}, deliveryMethod: ${report.deliveryMethod}`);
    } else {
      // Get all due reports using Admin SDK (bypasses Firestore rules)
      console.log(`[Report Generate] Fetching due reports...`);
      reports = await getDueReportsAdmin();

      if (reports.length === 0) {
        console.log(`[Report Generate] No reports due for generation`);
        return NextResponse.json({ 
          message: "No reports due for generation",
          timestamp,
          checkedAt: timestamp,
        });
      }
    }
    
    console.log(`[Report Generate] Found ${reports.length} report(s) to process`);

    // Initialize Earth Engine
    await initializeEarthEngine();
    const ee = getEarthEngine();

    const results = [];
    const TIME_BUDGET_MS = 240000; // 4 minutes (leave 1 minute buffer before 5min timeout)
    const startProcessingTime = Date.now();

    for (let i = 0; i < reports.length; i++) {
      const report = reports[i];
      const elapsed = Date.now() - startProcessingTime;
      
      // Check if we're running out of time
      if (elapsed > TIME_BUDGET_MS) {
        console.log(`[Report Generate] ⚠️ Time budget exceeded (${elapsed}ms). Processed ${i}/${reports.length} reports. Remaining will be processed in next run.`);
        break;
      }
      
      console.log(`[Report Generate] Processing report ${i + 1}/${reports.length}: ${report.id} (${elapsed}ms elapsed)`);
      
      try {
        // Get area coordinates using Admin SDK (bypasses Firestore rules)
        const areas = await Promise.all(
          report.areaIds.map((areaId) => getAreaAdmin(areaId))
        );

        const validAreas = areas.filter((area) => area !== null);

        if (validAreas.length === 0) {
          console.error(`Report ${report.id} has no valid areas`);
          continue;
        }

        // Process each index for each area
        // Note: We now always fetch the most recent data (last 60 days)
        // Use the same image data structure as the send route for high-quality images
        const imageData: Array<{
          areaName: string;
          indexType: IndexType;
          imageUrl: string;
          thumbnailUrl?: string;
          baseSatelliteUrl?: string; // RGB base satellite image from Earth Engine
          stats: { min: number; max: number; mean: number };
          centerLat?: number;
          centerLng?: number;
          coordinates?: { lat: number; lng: number }[];
        }> = [];

        for (const area of validAreas) {
          if (!area) continue;

          // Create polygon
          const coordinates = area.coordinates.map((coord: any) => ({
            lat: coord.latitude || coord.lat,
            lng: coord.longitude || coord.lng,
          }));

          const polygon = ee.Geometry.Polygon(
            [coordinates.map((coord: any) => [coord.lng, coord.lat])],
            "EPSG:4326"
          );

          // Process each requested index
          for (const indexType of report.indices) {
            console.log(`[Report Generate] Processing index: ${indexType} for area: ${area.name}`);
            
            try {
            // Get Sentinel-2 collection (automatically uses last 60 days, most recent data)
            const collection = getSentinel2Collection(report.cloudCoverage)
              .filterBounds(polygon); // Filter by polygon early to reduce processing

            // Select the most recent image
            const image = getMostRecentImage(collection);
            
              // OPTIMIZATION: Clip image to polygon bounding box BEFORE index calculation
              // This dramatically reduces processing (99%+ reduction for small areas)
              console.log(`[Report Generate] Clipping image to bounding box (cost optimization)...`);
              const bbox = polygon.bounds();
              const bufferMeters = 1000; // 1km buffer
              const bufferedBbox = bbox.buffer(bufferMeters);
              const clippedImage = image.clip(bufferedBbox);
              
              // Calculate index on clipped image (much smaller area)
              const indexImage = calculateIndex(clippedImage, indexType);
              
              // Clip to exact polygon for statistics
            const clipped = indexImage.clip(polygon);

              // OPTIMIZATION: Adaptive resolution scaling based on area size
              const polygonAreaM2 = calculatePolygonArea(coordinates);
              const areaKm2 = squareMetersToKm(polygonAreaM2);
              let scale = 100; // Default 100m resolution
              
              if (areaKm2 > 100) {
                scale = 250; // 250m for areas > 100 km²
              } else if (areaKm2 > 50) {
                scale = 200; // 200m for areas > 50 km²
              } else if (areaKm2 > 10) {
                scale = 150; // 150m for areas > 10 km²
              }

              // Get statistics with optimized parameters
              console.log(`[Report Generate] Computing statistics for ${indexType} (scale: ${scale}m, area: ${areaKm2.toFixed(2)} km²)...`);
            const stats = clipped.reduceRegion({
              reducer: ee.Reducer.minMax().combine({
                reducer2: ee.Reducer.mean(),
                sharedInputs: true,
              }),
              geometry: polygon,
                scale: scale, // Adaptive resolution
              maxPixels: 1e9,
                bestEffort: true, // Use best effort mode to avoid timeouts
                tileScale: 4, // Increase tile scale for better performance
            });

              // Use getInfo() instead of get() for better reliability, with timeout
            const statsValue = await new Promise<any>((resolve, reject) => {
              const timeout = setTimeout(() => {
                console.error(`[Report Generate] Statistics computation timed out for ${indexType} (area: ${areaKm2.toFixed(2)} km²)`);
                reject(new Error(`Statistics computation timeout after 90 seconds. Area size: ${areaKm2.toFixed(2)} km²`));
              }, 90000); // 90 second timeout (same as send route)

              stats.getInfo((value: any, error?: Error) => {
                clearTimeout(timeout);
                if (error) {
                  console.error(`[Report Generate] Statistics error for ${indexType}:`, error);
                  reject(error);
                } else {
                  console.log(`[Report Generate] ✅ Statistics received for ${indexType}`);
                  resolve(value);
                }
              });
            });

              // Generate tile URL for Earth Engine overlay (use callback to avoid filesystem issues)
              console.log(`[Report Generate] Generating tile URL for ${indexType}...`);
            const mapId = await Promise.race([
              new Promise<any>((resolve, reject) => {
                clipped.getMapId(
                  {
                    min: statsValue[`${indexType}_min`],
                    max: statsValue[`${indexType}_max`],
                    palette:
                      indexType === "NDVI" || indexType === "NDRE"
                        ? ["red", "yellow", "green"]
                        : ["blue", "cyan", "yellow", "orange", "red"],
                  },
                  (result: any, error?: Error) => {
                    if (error) {
                      console.error(`[Report Generate] getMapId error for ${indexType}:`, error);
                      reject(error);
                    } else {
                      console.log(`[Report Generate] Tile URL generated for ${indexType}`);
                      resolve(result);
                    }
                  }
                );
              }),
              new Promise((_, reject) => {
                setTimeout(() => reject(new Error("Tile URL generation timeout after 30 seconds")), 30000);
              })
            ]) as any;

              const tileUrl = mapId?.tile_fetcher?.url_format || mapId?.urlFormat || mapId?.url_format || "";
              if (!tileUrl) {
                throw new Error(`Failed to extract tile URL from mapId for ${indexType}`);
              }
              console.log(`[Report Generate] Extracted tile URL: ${tileUrl.substring(0, 100)}...`);

              // Generate base satellite and overlay thumbnails (same as send route)
              let thumbnailUrl: string | null = null;
              let baseSatelliteUrl: string | null = null;
              
              try {
                // Calculate bounding box with padding
                let minLat = coordinates[0].lat;
                let maxLat = coordinates[0].lat;
                let minLng = coordinates[0].lng;
                let maxLng = coordinates[0].lng;
                
                for (const coord of coordinates) {
                  if (coord.lat < minLat) minLat = coord.lat;
                  if (coord.lat > maxLat) maxLat = coord.lat;
                  if (coord.lng < minLng) minLng = coord.lng;
                  if (coord.lng > maxLng) maxLng = coord.lng;
                }
                
                // Add 5% padding
                const latPadding = (maxLat - minLat) * 0.05;
                const lngPadding = (maxLng - minLng) * 0.05;
                
                // Store bounds for later use
                const boundsData = {
                  minLat: minLat - latPadding,
                  maxLat: maxLat + latPadding,
                  minLng: minLng - lngPadding,
                  maxLng: maxLng + lngPadding,
                };
                
                // Create bounding box as a polygon for Earth Engine
                const paddedBounds = ee.Geometry.Polygon([[
                  [boundsData.minLng, boundsData.minLat],
                  [boundsData.maxLng, boundsData.minLat],
                  [boundsData.maxLng, boundsData.maxLat],
                  [boundsData.minLng, boundsData.maxLat],
                  [boundsData.minLng, boundsData.minLat]
                ]]);
                
                console.log(`[Report Generate] Generating Earth Engine images for bounding box`);
                
                // Generate RGB base satellite image from the SAME Sentinel-2 image
                console.log(`[Report Generate] Generating RGB base satellite image...`);
                baseSatelliteUrl = await new Promise<string>((resolve, reject) => {
                  (image as any).getThumbURL({
                    dimensions: 1200,
                    format: 'png',
                    region: paddedBounds,
                    bands: ['B4', 'B3', 'B2'], // RGB bands
                    min: [0, 0, 0],
                    max: [3000, 3000, 3000], // Typical Sentinel-2 reflectance values
                  }, (url: string, error?: Error) => {
                    if (error) reject(error);
                    else resolve(url);
                  });
                });
                console.log(`[Report Generate] ✅ RGB base satellite image generated`);
                
                // Generate index overlay thumbnail for the SAME bounding box
                if (typeof (indexImage as any).getThumbURL === 'function') {
                  console.log(`[Report Generate] Generating index overlay thumbnail...`);
                  thumbnailUrl = await new Promise<string>((resolve, reject) => {
                    (indexImage as any).getThumbURL({
                      dimensions: 1200, // Same dimensions as base image
                      format: 'png',
                      region: paddedBounds, // Same bounding box as base image
                      min: statsValue[`${indexType}_min`],
                      max: statsValue[`${indexType}_max`],
                      palette: indexType === "NDVI" || indexType === "NDRE"
                        ? ["red", "yellow", "green"]
                        : ["blue", "cyan", "yellow", "orange", "red"],
                    }, (url: string, error?: Error) => {
                      if (error) reject(error);
                      else resolve(url);
                    });
                  });
                  console.log(`[Report Generate] ✅ Index overlay thumbnail generated`);
                }
              } catch (thumbError: any) {
                console.log(`[Report Generate] Thumbnail generation failed: ${thumbError.message}`);
              }

            // Calculate center coordinates for tile selection
            const centerLat = coordinates.reduce((sum: number, coord: any) => sum + coord.lat, 0) / coordinates.length;
            const centerLng = coordinates.reduce((sum: number, coord: any) => sum + coord.lng, 0) / coordinates.length;
              console.log(`[Report Generate] Calculated center: lat=${centerLat}, lng=${centerLng}`);

            imageData.push({
              areaName: area.name,
              indexType,
                imageUrl: tileUrl,
                thumbnailUrl: thumbnailUrl || undefined,
                baseSatelliteUrl: baseSatelliteUrl || undefined, // Base RGB satellite image
              stats: {
                min: statsValue[`${indexType}_min`],
                max: statsValue[`${indexType}_max`],
                mean: statsValue[`${indexType}_mean`],
              },
              centerLat,
              centerLng,
                coordinates, // Pass coordinates for composite generation
              });
              console.log(`[Report Generate] Completed ${indexType} for ${area.name}`);
            } catch (indexError: any) {
              console.error(`[Report Generate] ⚠️ Error processing ${indexType} for ${area.name}:`, indexError);
              console.error(`[Report Generate] Continuing with next index/area...`);
              // Don't throw - continue processing other indices/areas
              // This allows partial success (e.g., if NDVI fails but NDRE succeeds)
            }
          }
        }

        // Check if we have any image data to process
        if (imageData.length === 0) {
          console.error(`[Report Generate] ⚠️ No image data generated for report ${report.id} - all indices failed. Skipping report.`);
          results.push({ reportId: report.id, status: "error", error: "All indices failed to process" });
          continue;
        }

        // Generate email content using the same high-quality method as send route
        console.log(`[Report Generate] Generating email HTML with ${imageData.length} image(s)...`);
        const emailResult = await generateReportEmail(report, imageData);
        const emailHtml = emailResult.html;
        const imageBuffers = emailResult.imageBuffers;
        const uploadedImageUrls = emailResult.imageUrls; // Image URLs already uploaded to Firebase Storage

        // Generate PDF using the image buffers from email generation
        console.log(`[Report Generate] Generating PDF for report ${report.id}...`);
        const pdfImageData = imageData.map((data, idx) => {
          const imageBuffer = imageBuffers[idx];
          const base64Image = imageBuffer && imageBuffer.length > 0 
            ? imageBuffer.toString('base64') 
            : undefined;
          
          return {
          areaName: data.areaName,
          indexType: data.indexType,
            imageUrl: base64Image ? `data:image/png;base64,${base64Image}` : undefined,
          stats: data.stats,
          };
        });
        
        let pdfBuffer: Buffer | null = null;
        try {
          pdfBuffer = await Promise.race([
            generateReportPDF(report, pdfImageData),
            new Promise<Buffer>((_, reject) => {
              setTimeout(() => reject(new Error("PDF generation timeout after 30 seconds")), 30000);
            })
          ]);
          console.log(`[Report Generate] ✅ PDF generated successfully (${pdfBuffer.length} bytes)`);
        } catch (pdfError: any) {
          console.error(`[Report Generate] ❌ PDF generation failed (continuing without PDF):`, pdfError.message);
          pdfBuffer = null;
        }

        // Send report via email or WhatsApp based on deliveryMethod
        const reportDate = new Date().toLocaleDateString("es-MX");
        
        if (report.deliveryMethod === "whatsapp") {
          // Send via WhatsApp with PDF link
          if (!report.phoneNumber) {
            throw new Error("Phone number is required for WhatsApp delivery");
          }
          
          console.log(`[Report Generate] Processing WhatsApp report for ${report.phoneNumber}...`);
          
          try {
            // Upload PDF to Firebase Storage
            let pdfUrl: string | undefined;
            if (pdfBuffer && pdfBuffer.length > 0) {
              console.log(`[Report Generate] Uploading PDF to Firebase Storage...`);
              pdfUrl = await uploadPDFAdmin(report.id!, pdfBuffer);
              console.log(`[Report Generate] ✅ PDF uploaded: ${pdfUrl}`);
            } else {
              console.log(`[Report Generate] ⚠️ No PDF buffer available - skipping PDF upload`);
            }

            // Update report with PDF URL and image URLs
            const updateData: any = {};
            if (pdfUrl) {
              updateData.pdfUrl = pdfUrl;
            }
            if (uploadedImageUrls && uploadedImageUrls.length > 0) {
              updateData.imageUrls = uploadedImageUrls;
            }
            
            if (Object.keys(updateData).length > 0) {
              await updateReportAdmin(report.id!, updateData);
              console.log(`[Report Generate] ✅ Report updated with URLs`);
            }

            // Send WhatsApp template with PDF URL
            const reportName = report.name || `Reporte ${getFrequencyLabel(report.frequency)}`;
            if (pdfUrl) {
              await sendReportWhatsAppWithPDF(
                report.phoneNumber,
                reportName,
                pdfUrl
              );
              console.log(`[Report Generate] ✅ WhatsApp template sent to ${report.phoneNumber}`);
            } else {
              throw new Error("PDF URL is required to send WhatsApp template");
            }

            // Mark report as generated
            await markReportGeneratedAdmin(report.id!);
            
            console.log(`[Report Generate] ✅ WhatsApp report sent successfully for report ${report.id} to ${report.phoneNumber}`);
          } catch (whatsappError: any) {
            console.error(`[Report Generate] ❌ WhatsApp sending failed:`, whatsappError);
            throw new Error(`Failed to send WhatsApp report: ${whatsappError.message}`);
          }
        } else {
          // Send via email
          if (!report.email) {
            throw new Error("Email is required for email delivery");
          }
          const emailAddress = report.email;
          
          const attachments = pdfBuffer ? [{
            filename: `reporte-copernigeo-${reportDate.replace(/\//g, "-")}.pdf`,
            content: pdfBuffer,
            contentType: "application/pdf",
          }] : undefined;
          
          await sendEmail(
            emailAddress,
            `Reporte de Monitoreo - ${reportDate}`,
            emailHtml,
            undefined,
            attachments
          );
          
          console.log(`[Report Generate] PDF generated and email sent for report ${report.id}`);

          // Mark report as generated
          await markReportGeneratedAdmin(report.id!);
        }

        results.push({ reportId: report.id, status: "success" });
      } catch (error: any) {
        console.error(`Error generating report ${report.id}:`, error);
        results.push({ reportId: report.id, status: "error", error: error.message });
      }
    }

    const duration = Date.now() - startTime;
    const processedCount = results.length;
    const remainingCount = reports.length - processedCount;
    
    console.log(`[Report Generate] ✅ Completed processing ${processedCount}/${reports.length} report(s) in ${duration}ms`);
    
    if (remainingCount > 0) {
      console.log(`[Report Generate] ⚠️ ${remainingCount} report(s) remaining - will be processed in next cron run`);
    }
    
    return NextResponse.json({ 
      results, 
      total: reports.length,
      processed: processedCount,
      remaining: remainingCount,
      timestamp,
      duration: `${duration}ms`,
      message: remainingCount > 0 
        ? `${processedCount} reports processed, ${remainingCount} will be processed in next run`
        : `All ${processedCount} reports processed successfully`,
    });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`[Report Generate] ❌ Error in report generation (${duration}ms):`, error);
    console.error(`[Report Generate] Error stack:`, error.stack);
    return NextResponse.json(
      { 
        error: error.message || "Failed to generate reports",
        timestamp,
        duration: `${duration}ms`,
      },
      { status: 500 }
    );
  }
}

/**
 * Get image dimensions using sharp
 */
async function getImageDimensions(buffer: Buffer): Promise<{ width: number; height: number } | null> {
  try {
    const metadata = await sharp(buffer).metadata();
    if (metadata.width && metadata.height) {
      return {
        width: metadata.width,
        height: metadata.height,
      };
    }
    return null;
  } catch (error: any) {
    console.error('[Report Generate] Error getting image dimensions:', error.message);
    return null;
  }
}

async function generateReportEmail(
  report: any,
  imageData: Array<{
    areaName: string;
    indexType: IndexType;
    imageUrl: string;
    thumbnailUrl?: string;
    baseSatelliteUrl?: string; // RGB base satellite image from Earth Engine
    stats: { min: number; max: number; mean: number };
    centerLat?: number;
    centerLng?: number;
    coordinates?: { lat: number; lng: number }[]; // Add coordinates for composite generation
  }>
): Promise<{ html: string; imageBuffers: Buffer[]; imageUrls: Array<{areaName: string; indexType: string; url: string}> }> {
  const reportDate = new Date().toLocaleDateString("es-MX", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  let imagesHtml = "";
  const imageBuffers: Buffer[] = []; // Store buffers for PDF generation
  const imageUrls: Array<{areaName: string; indexType: string; url: string}> = []; // Store image URLs for WhatsApp
  
  console.log(`[Report Generate] Starting to process ${imageData.length} images for email...`);
  for (let i = 0; i < imageData.length; i++) {
    const data = imageData[i];
    console.log(`[Report Generate] Processing image ${i + 1}/${imageData.length}: ${data.areaName} - ${data.indexType}`);
    
    // Download index overlay and base satellite image from Earth Engine
    let overlayBuffer: Buffer | null = null;
    let baseBuffer: Buffer | null = null;
    let contentType: string = 'image/png';
    
    // Download base satellite image from Earth Engine
    if (data.baseSatelliteUrl) {
      console.log(`[Report Generate] Downloading base satellite image from Earth Engine...`);
      try {
        const response = await fetch(data.baseSatelliteUrl, {
          headers: { 'User-Agent': 'CoperniGeo-Email-Service/1.0' },
        });
        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          baseBuffer = Buffer.from(arrayBuffer);
          console.log(`[Report Generate] ✅ Base satellite image downloaded (${baseBuffer.length} bytes)`);
          contentType = response.headers.get('content-type') || 'image/png';
        }
      } catch (baseError: any) {
        console.log(`[Report Generate] Base satellite download error: ${baseError.message}`);
      }
    }
    
    // Download index overlay from Earth Engine
    if (data.thumbnailUrl) {
      console.log(`[Report Generate] Downloading index overlay from Earth Engine...`);
      try {
        const response = await fetch(data.thumbnailUrl, {
          headers: { 'User-Agent': 'CoperniGeo-Email-Service/1.0' },
        });
        if (response.ok) {
      const arrayBuffer = await response.arrayBuffer();
          overlayBuffer = Buffer.from(arrayBuffer);
          console.log(`[Report Generate] ✅ Index overlay downloaded (${overlayBuffer.length} bytes)`);
        }
      } catch (thumbError: any) {
        console.log(`[Report Generate] Index overlay download error: ${thumbError.message}`);
      }
    }
    
    // Use headless browser to render Google Maps + Earth Engine tiles (same as send route)
    let finalImageBuffer: Buffer | null = null;
    
    if (data.coordinates && data.coordinates.length >= 3 && data.imageUrl) {
      try {
        console.log(`[Report Generate] Rendering map with headless browser (Google Maps + EE tiles)...`);
        
        finalImageBuffer = await renderMapWithTiles(
          data.coordinates,
          data.imageUrl,
          {
            width: 1200,
            height: 1200,
            polygonColor: '#5db815',
            indexOpacity: 0.7,
          }
        );
        
        console.log(`[Report Generate] ✅ Headless browser screenshot captured (${finalImageBuffer.length} bytes)`);
        contentType = 'image/png';
      } catch (renderError: any) {
        console.error(`[Report Generate] Headless browser rendering failed: ${renderError.message}`);
        
        // Fallback to Earth Engine composite
        if (baseBuffer && overlayBuffer) {
          try {
            console.log(`[Report Generate] Falling back to Earth Engine composite...`);
            finalImageBuffer = await compositeIndexOverlay(
              baseBuffer,
              overlayBuffer,
              data.coordinates,
              0.7,
              '#5db815'
            );
            console.log(`[Report Generate] ✅ Earth Engine composite generated (${finalImageBuffer.length} bytes)`);
            contentType = 'image/png';
          } catch (compositeError: any) {
            console.error(`[Report Generate] Composite also failed: ${compositeError.message}`);
    }
        }
      }
    }
      
    // Upload final image to Firebase Storage
    if (finalImageBuffer) {
      try {
        console.log(`[Report Generate] Uploading image ${i + 1} to Firebase Storage...`);
        const imageUrl = await uploadImageWithDedup(finalImageBuffer, data.areaName, data.indexType, contentType);
        console.log(`[Report Generate] ✅ Image uploaded successfully: ${imageUrl.substring(0, 100)}...`);
        
        // Store buffer for PDF generation
        imageBuffers.push(finalImageBuffer);
        
        // Store image URL for WhatsApp
        imageUrls.push({
          areaName: data.areaName,
          indexType: data.indexType,
          url: imageUrl,
        });
        
        // Get image dimensions to calculate aspect ratio
        const dimensions = await getImageDimensions(finalImageBuffer);
        
        let imageStyle = 'display: block; width: auto; height: auto; border-radius: 5px;';
        
        if (dimensions && dimensions.width > 0 && dimensions.height > 0) {
          const aspectRatio = dimensions.height / dimensions.width;
          const maxWidth = 600; // Max width for email
          const calculatedHeight = Math.round(maxWidth * aspectRatio);
          imageStyle = `display: block; width: ${maxWidth}px; height: ${calculatedHeight}px; max-width: 100%; border-radius: 5px; object-fit: contain;`;
        }
        
        const imageTag = `<img src="${imageUrl}" alt="${data.areaName} - ${data.indexType}" style="${imageStyle}" />`;
    
    imagesHtml += `
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom: 20px;">
        <tr>
          <td style="padding: 15px; border: 1px solid #ddd; border-radius: 5px; background-color: white;">
        <h3 style="color: #5db815; margin-top: 0;">${data.areaName} - ${data.indexType}</h3>
            <p style="margin-top: 10px; margin-bottom: 15px;"><strong>Valores:</strong> Mín: ${data.stats.min.toFixed(3)}, Máx: ${data.stats.max.toFixed(3)}, Promedio: ${data.stats.mean.toFixed(3)}</p>
            <table cellpadding="0" cellspacing="0" border="0" width="100%" align="center" style="margin: 15px auto;">
              <tr>
                <td align="center">
        ${imageTag}
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    `;
      } catch (uploadError: any) {
        console.error(`[Report Generate] Failed to upload image ${i + 1}:`, uploadError.message);
        imagesHtml += `
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom: 20px;">
        <tr>
          <td style="padding: 15px; border: 1px solid #ddd; border-radius: 5px; background-color: white;">
            <h3 style="color: #5db815; margin-top: 0;">${data.areaName} - ${data.indexType}</h3>
            <p style="margin-top: 10px; margin-bottom: 10px;"><strong>Valores:</strong> Mín: ${data.stats.min.toFixed(3)}, Máx: ${data.stats.max.toFixed(3)}, Promedio: ${data.stats.mean.toFixed(3)}</p>
            <p style="color: #666; font-style: italic;">Imagen no disponible - ver en dashboard</p>
          </td>
        </tr>
      </table>
    `;
        imageBuffers.push(Buffer.alloc(0));
      }
    } else {
      imagesHtml += `
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom: 20px;">
        <tr>
          <td style="padding: 15px; border: 1px solid #ddd; border-radius: 5px; background-color: white;">
            <h3 style="color: #5db815; margin-top: 0;">${data.areaName} - ${data.indexType}</h3>
            <p style="margin-top: 10px; margin-bottom: 10px;"><strong>Valores:</strong> Mín: ${data.stats.min.toFixed(3)}, Máx: ${data.stats.max.toFixed(3)}, Promedio: ${data.stats.mean.toFixed(3)}</p>
            <p style="color: #666; font-style: italic;">Imagen no disponible - ver en dashboard</p>
          </td>
        </tr>
      </table>
    `;
      imageBuffers.push(Buffer.alloc(0));
    }
  }
  
  // Build the complete email HTML template (same as send route)
  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f4f3f4;">
        <tr>
          <td align="center" style="padding: 20px;">
            <table cellpadding="0" cellspacing="0" border="0" width="600" style="max-width: 600px;">
              <!-- Header -->
              <tr>
                <td style="background-color: #5db815; color: white; padding: 20px; border-radius: 5px 5px 0 0;">
                  <h1 style="margin: 0; font-size: 24px;">Reporte de Monitoreo CoperniGeo</h1>
                </td>
              </tr>
              <!-- Content -->
              <tr>
                <td style="background-color: #ffffff; padding: 20px;">
          <p>Hola,</p>
          <p>Aquí está tu reporte de monitoreo satelital generado el ${reportDate}.</p>
          
                  <h2 style="color: #242424;">Configuración del Reporte</h2>
          <ul>
            <li><strong>Frecuencia:</strong> ${getFrequencyLabel(report.frequency)}</li>
            <li><strong>Índices:</strong> ${report.indices.join(", ")}</li>
            <li><strong>Cobertura de nubes:</strong> ${report.cloudCoverage}%</li>
          </ul>

                  <h2 style="color: #242424;">Resultados</h2>
                </td>
              </tr>
              <!-- Images -->
              <tr>
                <td style="background-color: #ffffff; padding: 0 20px 20px 20px;">
          ${imagesHtml}
                </td>
              </tr>
              <!-- Button -->
              <tr>
                <td style="background-color: #ffffff; padding: 0 20px 20px 20px;" align="center">
                  <a href="https://copernigeo.com/dashboard/imagenes" style="display: inline-block; padding: 12px 24px; background-color: #5db815; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">Ver en Dashboard</a>
                </td>
              </tr>
              <!-- PDF Notice -->
              <tr>
                <td style="background-color: #ffffff; padding: 0 20px 20px 20px;">
                  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top: 20px; padding: 15px; background-color: #e0f2fe; border-left: 4px solid #0284c7; border-radius: 4px;">
                    <tr>
                      <td>
                    <strong>📎 PDF Adjunto:</strong> Este reporte incluye un PDF detallado con todos los resultados y estadísticas adjunto a este correo.
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <!-- Footer -->
              <tr>
                <td style="background-color: #ffffff; padding: 0 20px 20px 20px;">
                  <p style="margin-top: 30px; font-size: 12px; color: #666; text-align: center;">
                    Este es un reporte automático de CoperniGeo. Para modificar la configuración, visita tu dashboard.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
  
  console.log(`[Report Generate] Generated email HTML with ${imageBuffers.length} image buffers and ${imageUrls.length} image URLs for PDF generation`);
  
  return { html: emailHtml, imageBuffers, imageUrls };
}


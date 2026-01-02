import { NextRequest, NextResponse } from "next/server";
import { getReportAdmin, markReportGeneratedAdmin, getAreaAdmin, updateReportAdmin } from "@/lib/firestore/admin";
import { initializeEarthEngine, getEarthEngine } from "@/lib/earthEngine";
import { calculateIndex, getSentinel2Collection, getMostRecentImage } from "@/lib/indices/calculations";
import { sendEmail } from "@/lib/email/resend";
import { sendReportWhatsApp, sendReportWhatsAppWithPDF } from "@/lib/whatsapp/meta";
import { generateReportPDF } from "@/lib/pdf/generateReportPDF";
import { IndexType } from "@/types/report";
import { getFrequencyLabel } from "@/lib/utils/reports";
import { calculatePolygonArea, squareMetersToKm } from "@/lib/utils/geometry";
import { uploadImageWithDedup, uploadPDFAdmin } from "@/lib/storage/admin-upload";
import { compositeIndexOverlay } from '@/lib/images/compositeImage';
import { renderMapWithTiles } from '@/lib/images/tileRenderer';
import sharp from 'sharp';

export const dynamic = 'force-dynamic';
export const maxDuration = 120; // Allow up to 120 seconds for processing (reports may take longer)

// v3.8 - Headless browser with Google Maps + Earth Engine tiles (fix tile loading)

/**
 * POST /api/reports/[id]/send
 * Generate and send a report immediately with current data
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log(`[Report Send] Starting report send for ID: ${params.id}`);
  try {
    // Get the report using Admin SDK (bypasses Firestore rules)
    console.log(`[Report Send] Fetching report from Firestore (Admin SDK)...`);
    const report = await getReportAdmin(params.id);
    
    if (!report) {
      console.error(`[Report Send] Report not found: ${params.id}`);
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    if (!report.id) {
      console.error(`[Report Send] Report ID is missing`);
      return NextResponse.json({ error: "Report ID is missing" }, { status: 400 });
    }
    
    console.log(`[Report Send] Report found: ${report.id}, areas: ${report.areaIds.length}, indices: ${report.indices.join(", ")}`);

    // Get area coordinates using Admin SDK (bypasses Firestore rules)
    const areas = await Promise.all(
      report.areaIds.map((areaId) => getAreaAdmin(areaId))
    );

    const validAreas = areas.filter((area) => area !== null);

    if (validAreas.length === 0) {
      return NextResponse.json(
        { error: "Report has no valid areas" },
        { status: 400 }
      );
    }

    // Initialize Earth Engine
    console.log(`[Report Send] Initializing Earth Engine...`);
    await initializeEarthEngine();
    const ee = getEarthEngine();
    console.log(`[Report Send] Earth Engine initialized`);

    // Process each index for each area using current data (most recent images)
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

    console.log(`[Report Send] Processing ${validAreas.length} areas with ${report.indices.length} indices each...`);
    for (const area of validAreas) {
      if (!area) continue;
      console.log(`[Report Send] Processing area: ${area.name}`);

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
        console.log(`[Report Send] Processing index: ${indexType} for area: ${area.name}`);
        
        try {
          // Get Sentinel-2 collection (automatically uses last 60 days, most recent data)
          const collection = getSentinel2Collection(report.cloudCoverage)
            .filterBounds(polygon); // Filter by polygon early to reduce processing

          // Select the most recent image
          const image = getMostRecentImage(collection);
          
          // OPTIMIZATION: Clip image to polygon bounding box BEFORE index calculation
          // This dramatically reduces processing (99%+ reduction for small areas)
          console.log(`[Report Send] Clipping image to bounding box (cost optimization)...`);
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
          console.log(`[Report Send] Computing statistics for ${indexType} (scale: ${scale}m, area: ${areaKm2.toFixed(2)} km²)...`);
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

          // Use getInfo() instead of get() for better reliability, with longer timeout
          const statsValue = await new Promise<any>((resolve, reject) => {
            const timeout = setTimeout(() => {
              console.error(`[Report Send] Statistics computation timed out for ${indexType}`);
              reject(new Error(`Statistics computation timeout after 90 seconds. Area size: ${areaKm2.toFixed(2)} km²`));
            }, 90000); // 90 second timeout (same as satellite route)

            stats.getInfo((value: any, error?: Error) => {
              clearTimeout(timeout);
              if (error) {
                console.error(`[Report Send] Statistics error for ${indexType}:`, error);
                reject(error);
              } else {
                console.log(`[Report Send] Statistics received for ${indexType}`);
                resolve(value);
              }
            });
          });
          
          console.log(`[Report Send] Statistics computed for ${indexType}:`, statsValue);

          // Generate image URL - use getMapId for tiles and also try to get thumbnail
          console.log(`[Report Send] Generating tile URL for ${indexType}...`);
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
                  if (error) reject(error);
                  else resolve(result);
                }
              );
            }),
            new Promise((_, reject) => {
              setTimeout(() => reject(new Error("Tile URL generation timeout after 30 seconds")), 30000);
            })
          ]) as any;
          
          console.log(`[Report Send] Tile URL generated for ${indexType}`);
          const tileUrl = mapId?.tile_fetcher?.url_format || mapId?.urlFormat || mapId?.url_format || "";
          console.log(`[Report Send] Extracted tile URL: ${tileUrl.substring(0, 150)}...`);

          // Generate both base satellite and index overlay from Earth Engine
          // This ensures perfect alignment as both use the same coordinate system
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
            
            console.log(`[Report Send] Generating Earth Engine images for bounding box`);
            console.log(`[Report Send] Bounding box:`, boundsData);
            
            // Generate RGB base satellite image from the SAME Sentinel-2 image
            console.log(`[Report Send] Generating RGB base satellite image...`);
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
            console.log(`[Report Send] ✅ RGB base satellite image generated`);
            
            // Generate index overlay thumbnail for the SAME bounding box
            if (typeof (indexImage as any).getThumbURL === 'function') {
              console.log(`[Report Send] Generating index overlay thumbnail...`);
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
              console.log(`[Report Send] ✅ Index overlay thumbnail generated`);
            }
          } catch (thumbError: any) {
            console.log(`[Report Send] Thumbnail generation failed: ${thumbError.message}`);
          }

          // Calculate center coordinates for tile selection
          const centerLat = coordinates.reduce((sum: number, coord: any) => sum + coord.lat, 0) / coordinates.length;
          const centerLng = coordinates.reduce((sum: number, coord: any) => sum + coord.lng, 0) / coordinates.length;
          console.log(`[Report Send] Calculated center: lat=${centerLat}, lng=${centerLng}`);

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
          console.log(`[Report Send] Completed ${indexType} for ${area.name}`);
        } catch (indexError: any) {
          console.error(`[Report Send] Error processing ${indexType} for ${area.name}:`, indexError);
          throw new Error(`Failed to process ${indexType} for ${area.name}: ${indexError.message}`);
        }
      }
    }
    
    console.log(`[Report Send] Completed processing all areas. Total image data: ${imageData.length} items`);

    // Generate email content (async function that downloads images)
    console.log(`[Report Send] Generating email HTML with images...`);
    console.log(`[Report Send] Image data count: ${imageData.length}`);
    imageData.forEach((data, idx) => {
      console.log(`[Report Send] Image ${idx + 1}: ${data.areaName} - ${data.indexType}, URL: ${data.imageUrl.substring(0, 100)}..., center: (${data.centerLat}, ${data.centerLng})`);
    });
    const emailResult = await generateReportEmail(report, imageData);
    const emailHtml = emailResult.html;
    const imageAttachments = emailResult.attachments;
    const imageBuffers = emailResult.imageBuffers;
    const uploadedImageUrls = emailResult.imageUrls; // Image URLs already uploaded to Firebase Storage

    // Generate PDF
    console.log(`[Report Send] Generating PDF for report ${report.id}...`);
    let pdfBuffer: Buffer | null = null;
    
    try {
      console.log(`[Report Send] Starting PDF generation with ${imageData.length} image data items...`);
      
      // Prepare image data with base64 encoded images for PDF
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
      
      pdfBuffer = await Promise.race([
        generateReportPDF(report, pdfImageData),
        new Promise<Buffer>((_, reject) => {
          setTimeout(() => reject(new Error("PDF generation timeout after 30 seconds")), 30000);
        })
      ]);
      console.log(`[Report Send] ✅ PDF generated successfully (${pdfBuffer.length} bytes)`);
    } catch (pdfError: any) {
      console.error(`[Report Send] ❌ PDF generation failed (continuing without PDF):`, pdfError.message);
      console.error(`[Report Send] PDF error stack:`, pdfError.stack);
      // Continue without PDF if generation fails - this is not critical
      pdfBuffer = null;
    }

    // Send report via email or WhatsApp based on deliveryMethod
    const reportDate = new Date().toLocaleDateString("es-MX");
    
    if (report.deliveryMethod === "whatsapp") {
      // Send via WhatsApp with PDF link
      if (!report.phoneNumber) {
        throw new Error("Phone number is required for WhatsApp delivery");
      }
      
      console.log(`[Report Send] Processing WhatsApp report for ${report.phoneNumber}...`);
      
      try {
        // Upload PDF to Firebase Storage
        let pdfUrl: string | undefined;
        if (pdfBuffer && pdfBuffer.length > 0) {
          console.log(`[Report Send] Uploading PDF to Firebase Storage...`);
          pdfUrl = await uploadPDFAdmin(report.id, pdfBuffer);
          console.log(`[Report Send] ✅ PDF uploaded: ${pdfUrl}`);
        } else {
          console.log(`[Report Send] ⚠️ No PDF buffer available - skipping PDF upload`);
        }

        // Image URLs are already uploaded in generateReportEmail, use those
        // uploadedImageUrls comes from emailResult above

        // Update report with PDF URL and image URLs
        const updateData: any = {};
        if (pdfUrl) {
          updateData.pdfUrl = pdfUrl;
        }
        if (uploadedImageUrls && uploadedImageUrls.length > 0) {
          updateData.imageUrls = uploadedImageUrls;
        }
        
        if (Object.keys(updateData).length > 0) {
          await updateReportAdmin(report.id, updateData);
          console.log(`[Report Send] ✅ Report updated with URLs`);
        }

        // Send WhatsApp template with PDF URL
        const reportName = report.name || `Reporte ${getFrequencyLabel(report.frequency)}`;
        if (pdfUrl) {
          await sendReportWhatsAppWithPDF(
            report.phoneNumber,
            reportName,
            pdfUrl,
            report.id
          );
          console.log(`[Report Send] ✅ WhatsApp template sent to ${report.phoneNumber}`);
        } else {
          throw new Error("PDF URL is required to send WhatsApp template");
        }

        // Mark report as generated
        await markReportGeneratedAdmin(report.id);
        
        console.log(`[Report Send] ✅ WhatsApp report sent successfully for report ${report.id} to ${report.phoneNumber}`);
      } catch (whatsappError: any) {
        console.error(`[Report Send] ❌ WhatsApp sending failed:`, whatsappError);
        throw new Error(`Failed to send WhatsApp report: ${whatsappError.message}`);
      }

      return NextResponse.json({
        success: true,
        message: "WhatsApp report sent successfully",
        reportId: report.id,
      });
    } else {
      // Send via email (default)
      if (!report.email) {
        throw new Error("Email is required for email delivery");
      }
      
      const emailAddress = report.email; // TypeScript now knows this is string
      console.log(`[Report Send] Sending email to ${emailAddress}...`);
    
    // Log PDF status before sending
    if (pdfBuffer && pdfBuffer.length > 0) {
      console.log(`[Report Send] PDF buffer ready: ${pdfBuffer.length} bytes, will attach to email`);
    } else {
      console.log(`[Report Send] ⚠️ No PDF buffer available (pdfBuffer is ${pdfBuffer}) - email will be sent without PDF attachment`);
    }
    
    try {
      console.log(`[Report Send] Preparing email...`);
        
        // Combine PDF attachment (if available) with inline image attachments
        const allAttachments: Array<{
          filename: string;
          content: Buffer;
          contentType: string;
          cid?: string;
        }> = [];
        
        // Note: No image attachments needed - images are hosted on Firebase Storage
        // and embedded in HTML using public URLs
        if (imageAttachments && imageAttachments.length > 0) {
          console.log(`[Report Send] Note: ${imageAttachments.length} images are hosted on Firebase Storage (no attachments needed)`);
        }
        
        // Add PDF attachment if available
        if (pdfBuffer) {
          console.log(`[Report Send] Adding PDF attachment...`);
          allAttachments.push({
            filename: `reporte-copernigeo-${reportDate.replace(/\//g, "-")}.pdf`,
            content: pdfBuffer,
            contentType: "application/pdf",
          });
        }
        
      await sendEmail(
          emailAddress,
        `Reporte de Monitoreo - ${reportDate}`,
        emailHtml,
        undefined,
          allAttachments.length > 0 ? allAttachments : undefined
      );
        console.log(`[Report Send] ✅ Email sent successfully for report ${report.id} to ${emailAddress}${pdfBuffer ? " with PDF attachment" : " (no PDF)"}${imageAttachments && imageAttachments.length > 0 ? ` and ${imageAttachments.length} inline images` : ""}`);
    } catch (emailError: any) {
      console.error(`[Report Send] ❌ Email sending failed:`, emailError);
      throw new Error(`Failed to send email: ${emailError.message}`);
      }
    }

    // Mark report as generated using Admin SDK (bypasses Firestore rules)
    await markReportGeneratedAdmin(report.id);

    return NextResponse.json({
      success: true,
      message: "Report sent successfully",
      reportId: report.id,
    });
  } catch (error: any) {
    console.error(`Error sending report ${params.id}:`, error);
    return NextResponse.json(
      { error: error.message || "Failed to send report" },
      { status: 500 }
    );
  }
}

/**
 * Convert lat/lng to tile coordinates
 */
function latLngToTile(lat: number, lng: number, zoom: number): { x: number; y: number } {
  const n = Math.pow(2, zoom);
  const x = Math.floor((lng + 180) / 360 * n);
  const latRad = lat * Math.PI / 180;
  const y = Math.floor((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n);
  return { x, y };
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
    console.error('[Email] Error getting image dimensions:', error.message);
    return null;
  }
}

/**
 * Download Earth Engine tile as base64 image for email embedding
 */
async function downloadTileAsBase64(
  tileUrl: string, 
  areaName: string, 
  indexType: string,
  centerLat?: number,
  centerLng?: number
): Promise<string | null> {
  try {
    // Use zoom level 12 for a good overview of the AOI
    const zoom = 12;
    let x: number, y: number;
    
    if (centerLat !== undefined && centerLng !== undefined) {
      // Use actual center coordinates to get the correct tile
      const tileCoords = latLngToTile(centerLat, centerLng, zoom);
      x = tileCoords.x;
      y = tileCoords.y;
    } else {
      // Fallback to center tile if coordinates not available
      x = 1 << (zoom - 1);
      y = 1 << (zoom - 1);
    }
    
    let url = tileUrl;
    console.log(`[Email] Original tile URL format: ${tileUrl.substring(0, 200)}...`);
    
    if (url.includes("{x}") || url.includes("{y}") || url.includes("{z}")) {
      url = url
        .replace(/{x}/g, x.toString())
        .replace(/{y}/g, y.toString())
        .replace(/{z}/g, zoom.toString());
    } else if (url.includes("$")) {
      // Earth Engine sometimes uses $x, $y, $z format
      url = url
        .replace(/\$x/g, x.toString())
        .replace(/\$y/g, y.toString())
        .replace(/\$z/g, zoom.toString());
    } else {
      // If no placeholders, try to append query params
      const separator = url.includes('?') ? '&' : '?';
      url = `${tileUrl}${separator}x=${x}&y=${y}&z=${zoom}`;
    }
    
    console.log(`[Email] Downloading tile for ${areaName} - ${indexType} (tile ${x},${y} at zoom ${zoom})...`);
    console.log(`[Email] Final URL: ${url.substring(0, 200)}...`);
    
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'CoperniGeo-Email-Service/1.0',
        },
      });
      
      if (!response.ok) {
        console.error(`[Email] Failed to download tile: ${response.status} ${response.statusText}`);
        console.error(`[Email] Response headers:`, Object.fromEntries(response.headers.entries()));
        const errorText = await response.text().catch(() => '');
        console.error(`[Email] Error response body: ${errorText.substring(0, 200)}`);
        return null;
      }
    
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const base64 = buffer.toString('base64');
      
      // Determine content type (usually PNG for Earth Engine tiles)
      const contentType = response.headers.get('content-type') || 'image/png';
      
      console.log(`[Email] ✅ Tile downloaded and converted to base64 (${base64.length} chars, buffer size: ${buffer.length} bytes)`);
      return `data:${contentType};base64,${base64}`;
    } catch (fetchError: any) {
      console.error(`[Email] Fetch error downloading tile for ${areaName} - ${indexType}:`, fetchError.message);
      console.error(`[Email] Fetch error stack:`, fetchError.stack);
      return null;
    }
  } catch (error: any) {
    console.error(`[Email] Error downloading tile for ${areaName} - ${indexType}:`, error.message);
    console.error(`[Email] Error stack:`, error.stack);
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
): Promise<{ html: string; attachments: Array<{ filename: string; content: Buffer; contentType: string; cid?: string }>; imageBuffers: Buffer[]; imageUrls: Array<{areaName: string; indexType: string; url: string}> }> {
  const reportDate = new Date().toLocaleDateString("es-MX", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  let imagesHtml = "";
  const imageAttachments: Array<{
    filename: string;
    content: Buffer;
    contentType: string;
    cid?: string;
  }> = [];
  const imageBuffers: Buffer[] = []; // Store buffers for PDF generation
  const imageUrls: Array<{areaName: string; indexType: string; url: string}> = []; // Store image URLs for WhatsApp
  
  console.log(`[Email] Starting to process ${imageData.length} images for email (uploading to Firebase Storage with Admin SDK)...`);
  for (let i = 0; i < imageData.length; i++) {
    const data = imageData[i];
    console.log(`[Email] Processing image ${i + 1}/${imageData.length}: ${data.areaName} - ${data.indexType}`);
    console.log(`[Email] Tile URL: ${data.imageUrl.substring(0, 150)}...`);
    console.log(`[Email] Index overlay URL: ${data.thumbnailUrl ? data.thumbnailUrl.substring(0, 150) + '...' : 'not available'}`);
    console.log(`[Email] Base satellite URL: ${data.baseSatelliteUrl ? data.baseSatelliteUrl.substring(0, 150) + '...' : 'not available'}`);
    console.log(`[Email] Center coordinates: lat=${data.centerLat}, lng=${data.centerLng}`);
    
    // Download index overlay and base satellite image from Earth Engine
    let overlayBuffer: Buffer | null = null;
    let baseBuffer: Buffer | null = null;
    let contentType: string = 'image/png';
    
    // Download base satellite image from Earth Engine
    if (data.baseSatelliteUrl) {
      console.log(`[Email] Downloading base satellite image from Earth Engine...`);
      try {
        const response = await fetch(data.baseSatelliteUrl, {
          headers: { 'User-Agent': 'CoperniGeo-Email-Service/1.0' },
        });
        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          baseBuffer = Buffer.from(arrayBuffer);
          
          const metadata = await sharp(baseBuffer).metadata();
          console.log(`[Email] ✅ Base satellite image downloaded (${baseBuffer.length} bytes, ${metadata.width}x${metadata.height})`);
          contentType = response.headers.get('content-type') || 'image/png';
        } else {
          console.log(`[Email] Base satellite download failed: ${response.status}`);
        }
      } catch (baseError: any) {
        console.log(`[Email] Base satellite download error: ${baseError.message}`);
      }
    }
    
    // Download index overlay from Earth Engine
    if (data.thumbnailUrl) {
      console.log(`[Email] Downloading index overlay from Earth Engine...`);
      try {
        const response = await fetch(data.thumbnailUrl, {
          headers: { 'User-Agent': 'CoperniGeo-Email-Service/1.0' },
        });
        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          overlayBuffer = Buffer.from(arrayBuffer);
          
          const metadata = await sharp(overlayBuffer).metadata();
          console.log(`[Email] ✅ Index overlay downloaded (${overlayBuffer.length} bytes, ${metadata.width}x${metadata.height})`);
        } else {
          console.log(`[Email] Index overlay download failed: ${response.status}, trying tile download...`);
        }
      } catch (thumbError: any) {
        console.log(`[Email] Index overlay download error: ${thumbError.message}, trying tile download...`);
      }
    }
    
    // Use headless browser to render Google Maps + Earth Engine tiles
    // This ensures perfect alignment since both are rendered on the same map
    let finalImageBuffer: Buffer | null = null;
    
    if (data.coordinates && data.coordinates.length >= 3 && data.imageUrl) {
      try {
        console.log(`[Email] Rendering map with headless browser (Google Maps + EE tiles)...`);
        console.log(`[Email] Tile URL: ${data.imageUrl.substring(0, 100)}...`);
        
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
        
        console.log(`[Email] ✅ Headless browser screenshot captured (${finalImageBuffer.length} bytes)`);
        contentType = 'image/png';
      } catch (renderError: any) {
        console.error(`[Email] Headless browser rendering failed: ${renderError.message}`);
        
        // Fallback to Earth Engine composite
        if (baseBuffer && overlayBuffer) {
          try {
            console.log(`[Email] Falling back to Earth Engine composite...`);
            finalImageBuffer = await compositeIndexOverlay(
              baseBuffer,
              overlayBuffer,
              data.coordinates,
              0.7,
              '#5db815'
            );
            console.log(`[Email] ✅ Earth Engine composite generated (${finalImageBuffer.length} bytes)`);
            contentType = 'image/png';
          } catch (compositeError: any) {
            console.error(`[Email] Composite also failed: ${compositeError.message}`);
          }
        }
      }
    } else {
      console.log(`[Email] Missing coordinates or tile URL - cannot render map`);
    }
      
    // Upload final image to Firebase Storage
    if (finalImageBuffer) {
      // Upload to Firebase Storage using Admin SDK with deduplication
      try {
        console.log(`[Email] Uploading image ${i + 1} to Firebase Storage (Admin SDK with deduplication)...`);
        const imageUrl = await uploadImageWithDedup(finalImageBuffer, data.areaName, data.indexType, contentType);
        console.log(`[Email] ✅ Image uploaded successfully: ${imageUrl.substring(0, 100)}...`);
        
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
          // Calculate aspect ratio and lock dimensions
          const aspectRatio = dimensions.height / dimensions.width;
          const maxWidth = 600; // Max width for email
          const calculatedHeight = Math.round(maxWidth * aspectRatio);
          
          // Lock aspect ratio with calculated dimensions
          imageStyle = `display: block; width: ${maxWidth}px; height: ${calculatedHeight}px; max-width: 100%; border-radius: 5px; object-fit: contain;`;
          console.log(`[Email] Image ${i + 1} dimensions: ${dimensions.width}x${dimensions.height}, aspect ratio: ${aspectRatio.toFixed(3)}, calculated: ${maxWidth}x${calculatedHeight}`);
        } else {
          console.log(`[Email] Could not get dimensions for image ${i + 1}, using auto sizing`);
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
        console.log(`[Email] Image ${i + 1} embedded using Firebase Storage public URL`);
      } catch (uploadError: any) {
        console.error(`[Email] Failed to upload image ${i + 1}:`, uploadError.message);
        // Fallback: show data without image
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
        // Push empty buffer for PDF (no image available)
        imageBuffers.push(Buffer.alloc(0));
      }
    } else {
      // No image buffer available at all
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
      // Push empty buffer for PDF
      imageBuffers.push(Buffer.alloc(0));
    }
  }
  
  // Build the complete email HTML template using tables for better email client compatibility
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
  
  console.log(`[Email] Generated email HTML with ${imageAttachments.length} inline image attachments`);
  console.log(`[Email] Stored ${imageBuffers.length} image buffers for PDF generation`);
  console.log(`[Email] Stored ${imageUrls.length} image URLs for WhatsApp`);
  
  // Return HTML, attachments, image buffers for PDF, and image URLs for WhatsApp
  return { html: emailHtml, attachments: imageAttachments, imageBuffers, imageUrls };
}


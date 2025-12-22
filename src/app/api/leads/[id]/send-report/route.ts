import { NextRequest, NextResponse } from "next/server";
import { getFirestore } from "firebase-admin/firestore";
import { getAdminApp } from "@/lib/firebase-admin";
import { sendEmail } from "@/lib/email/resend";
import { generateCropHealthPDF } from "@/lib/pdf/generateCropHealthPDF";
import { initializeEarthEngine, getEarthEngine } from "@/lib/earthEngine";
import * as ee from "@google/earthengine";
import { 
  calculateIndex, 
  getSentinel2Collection, 
  getMostRecentImage 
} from "@/lib/indices/calculations";
import { IndexType } from "@/types/report";
import { compositeIndexOverlay } from "@/lib/images/compositeImage";
import { renderMapWithTiles } from "@/lib/images/tileRenderer";
import { Lead } from "@/types/lead";

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Generate and send crop health report PDF for a lead
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const leadId = params.id;
    console.log(`[Lead Report] Generating report for lead ${leadId}...`);

    // Get lead data using Admin SDK
    const db = getFirestore(getAdminApp());
    const leadDocRef = db.collection("leads").doc(leadId);
    const leadDoc = await leadDocRef.get();
    
    if (!leadDoc.exists) {
      return NextResponse.json(
        { error: "Lead not found" },
        { status: 404 }
      );
    }
    
    const leadData = leadDoc.data();
    if (!leadData) {
      return NextResponse.json(
        { error: "Lead data is empty" },
        { status: 404 }
      );
    }
    
    const lead: Lead = {
      id: leadDoc.id,
      email: leadData.email,
      farmName: leadData.farmName,
      country: leadData.country,
      coordinates: leadData.coordinates,
      status: leadData.status,
      createdAt: leadData.createdAt?.toDate(),
      updatedAt: leadData.updatedAt?.toDate(),
    };

    if (!lead.coordinates || lead.coordinates.length < 3) {
      return NextResponse.json(
        { error: "Lead does not have valid coordinates" },
        { status: 400 }
      );
    }

    if (lead.status !== 'snapshot_requested') {
      return NextResponse.json(
        { error: "Lead status is not 'snapshot_requested'" },
        { status: 400 }
      );
    }

    // Generate NDVI image
    console.log(`[Lead Report] Generating NDVI image...`);
    let ndviImageBase64: string = "";
    
    try {
      // Initialize Earth Engine
      await initializeEarthEngine();
      const ee = getEarthEngine();

      // Create polygon from coordinates
      const polygon = ee.Geometry.Polygon(
        [lead.coordinates.map((coord) => [coord.lng, coord.lat])],
        "EPSG:4326"
      );

      // Try with increasing cloud coverage tolerance if no images found
      let image: ee.Image | null = null;
      const cloudCoverageOptions = [20, 30, 40, 50];
      
      for (const cloudCoverage of cloudCoverageOptions) {
        console.log(`[Lead Report] Trying with ${cloudCoverage}% cloud coverage...`);
        const collection = getSentinel2Collection(cloudCoverage)
          .filterBounds(polygon);

        // Check if collection has images (same approach as dashboard)
        const imageCount = await new Promise<number>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error("Image count check timed out"));
          }, 30000);
          
          collection.size().getInfo((count: number, error?: Error) => {
            clearTimeout(timeout);
            if (error) reject(error);
            else resolve(count);
          });
        });

        console.log(`[Lead Report] Found ${imageCount} images with ${cloudCoverage}% cloud coverage`);

        if (imageCount > 0) {
          // Get the most recent image (same as dashboard)
          image = getMostRecentImage(collection);
          console.log(`[Lead Report] ✅ Found image with ${cloudCoverage}% cloud coverage tolerance`);
          break;
        }
      }
      
      if (!image) {
        console.warn(`[Lead Report] ⚠️ No satellite images found even with 50% cloud coverage. Using placeholder.`);
        // Don't throw error - continue with empty image (will show placeholder in PDF)
        ndviImageBase64 = "";
      } else {
        // Clip image to polygon bounding box BEFORE index calculation (same optimization as dashboard)
        console.log(`[Lead Report] Clipping image to bounding box (cost optimization)...`);
        const bbox = polygon.bounds();
        const bufferMeters = 1000; // 1km buffer
        const bufferedBbox = bbox.buffer(bufferMeters);
        const clippedImage = image.clip(bufferedBbox);
        
        // Calculate NDVI on clipped image
        const ndvi = calculateIndex(clippedImage, "NDVI" as IndexType);
        
        // Clip to exact polygon for display
        const clipped = ndvi.clip(polygon);
        
        // Get statistics first (needed for proper visualization)
        console.log(`[Lead Report] Computing statistics...`);
        const stats = clipped.reduceRegion({
          reducer: ee.Reducer.minMax().combine({
            reducer2: ee.Reducer.mean(),
            sharedInputs: true,
          }),
          geometry: polygon,
          scale: 100,
          maxPixels: 1e9,
          bestEffort: true,
        });

        const statsValue = await new Promise<any>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error("Statistics computation timed out"));
          }, 60000);
          
          stats.getInfo((value: any, error?: Error) => {
            clearTimeout(timeout);
            if (error) {
              reject(error);
            } else {
              resolve(value);
            }
          });
        });

        const minValue = statsValue.NDVI_min;
        const maxValue = statsValue.NDVI_max;
        console.log(`[Lead Report] Statistics: min=${minValue}, max=${maxValue}`);

        // Get tile URL for headless browser rendering (same as automated reports)
        console.log(`[Lead Report] Generating tile URL...`);
        const mapId = await new Promise<any>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error("Tile URL generation timed out"));
          }, 60000);
          
          clipped.getMapId(
            {
              min: minValue,
              max: maxValue,
              palette: ["red", "yellow", "green"],
            },
            (result: any, error?: Error) => {
              clearTimeout(timeout);
              if (error) {
                reject(error);
              } else {
                resolve(result);
              }
            }
          );
        });

        // Extract tile URL (same as automated reports)
        const tileUrl = mapId?.urlFormat || mapId?.tile_fetcher?.url_format || mapId?.url_format;
        
        if (!tileUrl) {
          throw new Error(`Failed to generate tile URL. MapId structure: ${JSON.stringify(Object.keys(mapId || {}))}`);
        }
        
        console.log(`[Lead Report] Tile URL generated: ${tileUrl.substring(0, 100)}...`);

        // Calculate bounding box with padding for fallback composite
        let minLat = lead.coordinates[0].lat;
        let maxLat = lead.coordinates[0].lat;
        let minLng = lead.coordinates[0].lng;
        let maxLng = lead.coordinates[0].lng;
        
        for (const coord of lead.coordinates) {
          if (coord.lat < minLat) minLat = coord.lat;
          if (coord.lat > maxLat) maxLat = coord.lat;
          if (coord.lng < minLng) minLng = coord.lng;
          if (coord.lng > maxLng) maxLng = coord.lng;
        }
        
        // Add 5% padding
        const latPadding = (maxLat - minLat) * 0.05;
        const lngPadding = (maxLng - minLng) * 0.05;
        
        const paddedBounds = ee.Geometry.Polygon([[
          [minLng - lngPadding, minLat - latPadding],
          [maxLng + lngPadding, minLat - latPadding],
          [maxLng + lngPadding, maxLat + latPadding],
          [minLng - lngPadding, maxLat + latPadding],
          [minLng - lngPadding, minLat - latPadding]
        ]]);

        // Try headless browser rendering first (Google Maps + Earth Engine tiles)
        let finalImageBuffer: Buffer | null = null;
        
        try {
          console.log(`[Lead Report] Rendering map with headless browser (Google Maps + EE tiles)...`);
          finalImageBuffer = await renderMapWithTiles(
            lead.coordinates,
            tileUrl,
            {
              width: 1200,
              height: 1200,
              polygonColor: '#5db815',
              indexOpacity: 0.7,
            }
          );
          
          console.log(`[Lead Report] ✅ Headless browser screenshot captured (${finalImageBuffer.length} bytes)`);
        } catch (renderError: any) {
          console.error(`[Lead Report] Headless browser rendering failed: ${renderError.message}`);
          
          // Fallback to Earth Engine composite (same as automated reports)
          console.log(`[Lead Report] Falling back to Earth Engine composite...`);
          
          // Generate base satellite image (RGB) and index overlay for composite
          console.log(`[Lead Report] Generating RGB base satellite image...`);
          const baseSatelliteUrl = await new Promise<string>((resolve, reject) => {
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
          console.log(`[Lead Report] ✅ RGB base satellite image generated`);
          
          console.log(`[Lead Report] Generating NDVI overlay thumbnail...`);
          const thumbnailUrl = await new Promise<string>((resolve, reject) => {
            (clipped as any).getThumbURL({
              dimensions: 1200, // Same dimensions as base image
              format: 'png',
              region: paddedBounds, // Same bounding box as base image
              min: minValue,
              max: maxValue,
              palette: ["red", "yellow", "green"],
            }, (url: string, error?: Error) => {
              if (error) reject(error);
              else resolve(url);
            });
          });
          console.log(`[Lead Report] ✅ Index overlay thumbnail generated`);

          // Download both images
          console.log(`[Lead Report] Downloading base satellite image...`);
          const baseResponse = await fetch(baseSatelliteUrl, {
            headers: { 'User-Agent': 'CoperniGeo-Email-Service/1.0' },
          });
          
          if (!baseResponse.ok) {
            throw new Error(`Failed to download base image: ${baseResponse.status} ${baseResponse.statusText}`);
          }
          
          const baseArrayBuffer = await baseResponse.arrayBuffer();
          const baseBuffer = Buffer.from(baseArrayBuffer);
          console.log(`[Lead Report] ✅ Base satellite image downloaded (${baseBuffer.length} bytes)`);
          
          console.log(`[Lead Report] Downloading index overlay...`);
          const overlayResponse = await fetch(thumbnailUrl, {
            headers: { 'User-Agent': 'CoperniGeo-Email-Service/1.0' },
          });
          
          if (!overlayResponse.ok) {
            throw new Error(`Failed to download overlay: ${overlayResponse.status} ${overlayResponse.statusText}`);
          }
          
          const overlayArrayBuffer = await overlayResponse.arrayBuffer();
          const overlayBuffer = Buffer.from(overlayArrayBuffer);
          console.log(`[Lead Report] ✅ Index overlay downloaded (${overlayBuffer.length} bytes)`);

          // Composite the images (base + overlay + polygon outline)
          try {
            finalImageBuffer = await compositeIndexOverlay(
              baseBuffer,
              overlayBuffer,
              lead.coordinates,
              0.7, // opacity
              '#5db815' // polygon color
            );
            console.log(`[Lead Report] ✅ Earth Engine composite generated (${finalImageBuffer.length} bytes)`);
          } catch (compositeError: any) {
            console.error(`[Lead Report] Composite also failed: ${compositeError.message}`);
            throw new Error(`Both headless browser and composite failed: ${compositeError.message}`);
          }
        }

        if (!finalImageBuffer) {
          throw new Error("Failed to generate image - both headless browser and composite methods failed");
        }

        // Convert to base64 data URI
        const base64String = finalImageBuffer.toString('base64');
        
        if (!base64String || base64String.length === 0) {
          throw new Error("Image buffer is empty after conversion to base64");
        }
        
        ndviImageBase64 = `data:image/png;base64,${base64String}`;
        console.log(`[Lead Report] ✅ NDVI image generated (${base64String.length} chars base64)`);
        console.log(`[Lead Report] Image data URI starts with: ${ndviImageBase64.substring(0, 50)}...`);
        console.log(`[Lead Report] Full data URI length: ${ndviImageBase64.length}`);
      }
    } catch (imageError: any) {
      console.error(`[Lead Report] ❌ Error generating NDVI image:`, imageError);
      console.error(`[Lead Report] Error stack:`, imageError.stack);
      // Use empty string if image generation fails (will show placeholder in PDF)
      ndviImageBase64 = "";
    }

    // Format dates
    const analysisDate = new Date().toLocaleDateString("es-MX", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    // Generate PDF
    console.log(`[Lead Report] Generating PDF...`);
    console.log(`[Lead Report] Image base64 length: ${ndviImageBase64 ? ndviImageBase64.length : 0}`);
    let pdfBuffer: Buffer;
    try {
      pdfBuffer = await generateCropHealthPDF({
        fieldName: lead.farmName || "Campo",
        region: lead.country,
        analysisDate: analysisDate,
        ndviImageUrl: ndviImageBase64 || "",
      });
      console.log(`[Lead Report] ✅ PDF generated (${pdfBuffer.length} bytes)`);
    } catch (pdfError: any) {
      console.error(`[Lead Report] ❌ PDF generation failed:`, pdfError);
      throw new Error(`Failed to generate PDF: ${pdfError.message}`);
    }

    // Send email with PDF
    console.log(`[Lead Report] Sending email to ${lead.email}...`);
    const emailSubject = "Tu informe satelital de salud del cultivo - CoperniGeo";
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #242424; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #5db815; font-size: 28px; margin-bottom: 10px;">CoperniGeo</h1>
            <p style="color: #898989; font-size: 16px;">Informe satelital de salud del cultivo</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
            <h2 style="color: #242424; font-size: 20px; margin-bottom: 15px;">¡Tu informe está listo!</h2>
            <p style="color: #242424; margin-bottom: 15px;">
              Hemos analizado tu campo y generado un informe detallado sobre la salud de tu cultivo.
            </p>
            <p style="color: #242424;">
              Encontrarás el informe completo adjunto en formato PDF.
            </p>
          </div>
          
          <div style="background: #f0f9ff; border: 2px solid #5db815; border-radius: 8px; padding: 25px; text-align: center; margin-bottom: 30px;">
            <h3 style="color: #242424; font-size: 18px; margin-bottom: 15px;">
              Una sola imagen muestra el problema. El seguimiento continuo lo previene.
            </h3>
            <p style="color: #242424; margin-bottom: 20px;">
              Este informe muestra el estado actual de tu cultivo. Para monitorear la evolución semana a semana y recibir alertas tempranas, considera nuestro servicio de seguimiento continuo.
            </p>
            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://copernigeo.com'}/precios" 
               style="display: inline-block; background: #5db815; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600;">
              Ver planes de monitoreo
            </a>
          </div>
          
          <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e5e5;">
            <p style="color: #898989; font-size: 12px; margin-bottom: 10px;">
              Este informe se basa en imágenes satelitales y no reemplaza inspecciones en campo.
            </p>
            <p style="color: #5db815; font-weight: 600;">CoperniGeo</p>
          </div>
        </body>
      </html>
    `;

    await sendEmail(
      lead.email,
      emailSubject,
      emailHtml,
      undefined,
      [{
        filename: `informe-salud-cultivo-${lead.farmName || 'campo'}-${analysisDate.replace(/\s+/g, '-')}.pdf`,
        content: pdfBuffer,
        contentType: "application/pdf",
      }]
    );

    console.log(`[Lead Report] ✅ Email sent successfully to ${lead.email}`);

    return NextResponse.json({
      success: true,
      message: "Report generated and sent successfully",
    });
  } catch (error: any) {
    console.error(`[Lead Report] ❌ Error:`, error);
    return NextResponse.json(
      { error: error.message || "Failed to generate and send report" },
      { status: 500 }
    );
  }
}


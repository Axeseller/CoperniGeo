import { NextRequest, NextResponse } from "next/server";
import { getReport, markReportGenerated } from "@/lib/firestore/reports";
import { getArea } from "@/lib/firestore/areas";
import { initializeEarthEngine, getEarthEngine } from "@/lib/earthEngine";
import { calculateIndex, getSentinel2Collection, getMostRecentImage } from "@/lib/indices/calculations";
import { sendEmail } from "@/lib/email/resend";
import { generateReportPDF } from "@/lib/pdf/generateReportPDF";
import { IndexType } from "@/types/report";
import { getFrequencyLabel } from "@/lib/utils/reports";
import { calculatePolygonArea, squareMetersToKm } from "@/lib/utils/geometry";

export const dynamic = 'force-dynamic';
export const maxDuration = 120; // Allow up to 120 seconds for processing (reports may take longer)

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
    // Get the report
    console.log(`[Report Send] Fetching report from Firestore...`);
    const report = await getReport(params.id);
    
    if (!report) {
      console.error(`[Report Send] Report not found: ${params.id}`);
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    if (!report.id) {
      console.error(`[Report Send] Report ID is missing`);
      return NextResponse.json({ error: "Report ID is missing" }, { status: 400 });
    }
    
    console.log(`[Report Send] Report found: ${report.id}, areas: ${report.areaIds.length}, indices: ${report.indices.join(", ")}`);

    // Get area coordinates
    const areas = await Promise.all(
      report.areaIds.map((areaId) => getArea(areaId))
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
      stats: { min: number; max: number; mean: number };
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

          // Generate image URL
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

          imageData.push({
            areaName: area.name,
            indexType,
            imageUrl: mapId?.tile_fetcher?.url_format || mapId?.urlFormat || "",
            stats: {
              min: statsValue[`${indexType}_min`],
              max: statsValue[`${indexType}_max`],
              mean: statsValue[`${indexType}_mean`],
            },
          });
          console.log(`[Report Send] Completed ${indexType} for ${area.name}`);
        } catch (indexError: any) {
          console.error(`[Report Send] Error processing ${indexType} for ${area.name}:`, indexError);
          throw new Error(`Failed to process ${indexType} for ${area.name}: ${indexError.message}`);
        }
      }
    }
    
    console.log(`[Report Send] Completed processing all areas. Total image data: ${imageData.length} items`);

    // Generate email content
    console.log(`[Report Send] Generating email HTML...`);
    const emailHtml = generateReportEmail(report, imageData);

    // Generate PDF
    console.log(`[Report Send] Generating PDF for report ${report.id}...`);
    let pdfBuffer: Buffer | null = null;
    
    try {
      console.log(`[Report Send] Starting PDF generation with ${imageData.length} image data items...`);
      pdfBuffer = await Promise.race([
        generateReportPDF(report, imageData.map((data) => ({
          areaName: data.areaName,
          indexType: data.indexType,
          imageUrl: data.imageUrl,
          stats: data.stats,
        }))),
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

    // Send email with PDF attachment
    const reportDate = new Date().toLocaleDateString("es-MX");
    console.log(`[Report Send] Sending email to ${report.email}...`);
    
    // Log PDF status before sending
    if (pdfBuffer && pdfBuffer.length > 0) {
      console.log(`[Report Send] PDF buffer ready: ${pdfBuffer.length} bytes, will attach to email`);
    } else {
      console.log(`[Report Send] ⚠️ No PDF buffer available (pdfBuffer is ${pdfBuffer}) - email will be sent without PDF attachment`);
    }
    
    try {
      console.log(`[Report Send] Preparing email...`);
      await sendEmail(
        report.email,
        `Reporte de Monitoreo - ${reportDate}`,
        emailHtml,
        undefined,
        pdfBuffer ? [{
          filename: `reporte-copernigeo-${reportDate.replace(/\//g, "-")}.pdf`,
          content: pdfBuffer,
          contentType: "application/pdf",
        }] : undefined
      );
      console.log(`[Report Send] ✅ Email sent successfully for report ${report.id} to ${report.email}${pdfBuffer ? " with PDF attachment" : " (no PDF)"}`);
    } catch (emailError: any) {
      console.error(`[Report Send] ❌ Email sending failed:`, emailError);
      throw new Error(`Failed to send email: ${emailError.message}`);
    }

    // Mark report as generated (updates lastGenerated and nextRun)
    await markReportGenerated(report.id);

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

function generateReportEmail(
  report: any,
  imageData: Array<{
    areaName: string;
    indexType: IndexType;
    imageUrl: string;
    stats: { min: number; max: number; mean: number };
  }>
): string {
  const reportDate = new Date().toLocaleDateString("es-MX", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  let imagesHtml = "";
  for (const data of imageData) {
    imagesHtml += `
      <div style="margin-bottom: 20px; padding: 15px; border: 1px solid #ddd; border-radius: 5px;">
        <h3 style="color: #16a34a; margin-top: 0;">${data.areaName} - ${data.indexType}</h3>
        <p><strong>Valores:</strong> Mín: ${data.stats.min.toFixed(3)}, Máx: ${data.stats.max.toFixed(3)}, Promedio: ${data.stats.mean.toFixed(3)}</p>
        <p><em>Nota: Las imágenes están disponibles en el dashboard.</em></p>
      </div>
    `;
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #16a34a; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
        .content { background-color: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; }
        .button { display: inline-block; padding: 10px 20px; background-color: #16a34a; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0;">Reporte de Monitoreo CoperniGeo</h1>
        </div>
        <div class="content">
          <p>Hola,</p>
          <p>Aquí está tu reporte de monitoreo satelital generado el ${reportDate}.</p>
          
          <h2>Configuración del Reporte</h2>
          <ul>
            <li><strong>Frecuencia:</strong> ${getFrequencyLabel(report.frequency)}</li>
            <li><strong>Índices:</strong> ${report.indices.join(", ")}</li>
            <li><strong>Cobertura de nubes:</strong> ${report.cloudCoverage}%</li>
          </ul>

          <h2>Resultados</h2>
          ${imagesHtml}

                  <a href="https://copernigeo.com/dashboard/imagenes" class="button">Ver en Dashboard</a>
                  
                  <p style="margin-top: 20px; padding: 15px; background-color: #e0f2fe; border-left: 4px solid #0284c7; border-radius: 4px;">
                    <strong>📎 PDF Adjunto:</strong> Este reporte incluye un PDF detallado con todos los resultados y estadísticas adjunto a este correo.
                  </p>
                  
                  <p style="margin-top: 30px; font-size: 12px; color: #666;">
                    Este es un reporte automático de CoperniGeo. Para modificar la configuración, visita tu dashboard.
                  </p>
        </div>
      </div>
    </body>
    </html>
  `;
}


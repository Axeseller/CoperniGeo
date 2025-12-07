import { NextRequest, NextResponse } from "next/server";
import { getDueReports, markReportGenerated } from "@/lib/firestore/reports";
import { getArea } from "@/lib/firestore/areas";
import { initializeEarthEngine, getEarthEngine } from "@/lib/earthEngine";
import { calculateIndex, getSentinel2Collection, getMostRecentImage } from "@/lib/indices/calculations";
import { uploadFile } from "@/lib/storage/upload";
import { sendEmail } from "@/lib/email/resend";
import { generateReportPDF } from "@/lib/pdf/generateReportPDF";
import { IndexType, ReportFrequency } from "@/types/report";
import { getFrequencyLabel } from "@/lib/utils/reports";

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Check for authorization (optional: add API key check)
    const authHeader = request.headers.get("authorization");
    // For now, we'll allow calls without auth for cron jobs
    // In production, add proper authentication

    // Get all due reports
    const reports = await getDueReports();

    if (reports.length === 0) {
      return NextResponse.json({ message: "No reports due for generation" });
    }

    // Initialize Earth Engine
    await initializeEarthEngine();
    const ee = getEarthEngine();

    const results = [];

    for (const report of reports) {
      try {
        // Get area coordinates
        const areas = await Promise.all(
          report.areaIds.map((areaId) => getArea(areaId))
        );

        const validAreas = areas.filter((area) => area !== null);

        if (validAreas.length === 0) {
          console.error(`Report ${report.id} has no valid areas`);
          continue;
        }

        // Process each index for each area
        // Note: We now always fetch the most recent data (last 60 days)
        const imageData: Array<{
          areaName: string;
          indexType: IndexType;
          imageUrl: string;
          stats: { min: number; max: number; mean: number };
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
            // Get Sentinel-2 collection (automatically uses last 60 days, most recent data)
            const collection = getSentinel2Collection(report.cloudCoverage)
              .filterBounds(polygon); // Filter by polygon early to reduce processing

            // Select the most recent image
            const image = getMostRecentImage(collection);
            
            // Calculate index and clip to polygon
            const indexImage = calculateIndex(image, indexType);
            const clipped = indexImage.clip(polygon);

            // Get statistics
            const stats = clipped.reduceRegion({
              reducer: ee.Reducer.minMax().combine({
                reducer2: ee.Reducer.mean(),
                sharedInputs: true,
              }),
              geometry: polygon,
              scale: 100,
              maxPixels: 1e9,
            });

            const statsValue = await new Promise<any>((resolve, reject) => {
              stats.get((value: any, error?: Error) => {
                if (error) reject(error);
                else resolve(value);
              });
            });

            // Generate image URL (simplified - in production, export to Cloud Storage)
            const mapId = clipped.getMapId({
              min: statsValue[`${indexType}_min`],
              max: statsValue[`${indexType}_max`],
              palette:
                indexType === "NDVI" || indexType === "NDRE"
                  ? ["red", "yellow", "green"]
                  : ["blue", "cyan", "yellow", "orange", "red"],
            });

            imageData.push({
              areaName: area.name,
              indexType,
              imageUrl: mapId.tile_fetcher.url_format,
              stats: {
                min: statsValue[`${indexType}_min`],
                max: statsValue[`${indexType}_max`],
                mean: statsValue[`${indexType}_mean`],
              },
            });
          }
        }

        // Generate email content
        const emailHtml = generateReportEmail(report, imageData);

        // Generate PDF
        console.log(`[Report Generate] Generating PDF for report ${report.id}...`);
        const pdfBuffer = await generateReportPDF(report, imageData.map((data) => ({
          areaName: data.areaName,
          indexType: data.indexType,
          imageUrl: data.imageUrl,
          stats: data.stats,
        })));

        // Send email with PDF attachment
        const reportDate = new Date().toLocaleDateString("es-MX");
        await sendEmail(
          report.email,
          `Reporte de Monitoreo - ${reportDate}`,
          emailHtml,
          undefined,
          [{
            filename: `reporte-copernigeo-${reportDate.replace(/\//g, "-")}.pdf`,
            content: pdfBuffer,
            contentType: "application/pdf",
          }]
        );
        
        console.log(`[Report Generate] PDF generated and email sent for report ${report.id}`);

        // Mark report as generated
        await markReportGenerated(report.id!);

        results.push({ reportId: report.id, status: "success" });
      } catch (error: any) {
        console.error(`Error generating report ${report.id}:`, error);
        results.push({ reportId: report.id, status: "error", error: error.message });
      }
    }

    return NextResponse.json({ results, total: reports.length });
  } catch (error: any) {
    console.error("Error in report generation:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate reports" },
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


import { NextRequest, NextResponse } from "next/server";
import { getDueReportsAdmin, markReportGeneratedAdmin, getAreaAdmin } from "@/lib/firestore/admin";
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

    // Get all due reports using Admin SDK (bypasses Firestore rules)
    const reports = await getDueReportsAdmin();

    if (reports.length === 0) {
      return NextResponse.json({ message: "No reports due for generation" });
    }

    // Initialize Earth Engine
    await initializeEarthEngine();
    const ee = getEarthEngine();

    const results = [];

    for (const report of reports) {
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
        const imageData: Array<{
          areaName: string;
          indexType: IndexType;
          imageUrl: string;
          stats: { min: number; max: number; mean: number };
          centerLat?: number;
          centerLng?: number;
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

            // Calculate center coordinates for tile selection
            const centerLat = coordinates.reduce((sum: number, coord: any) => sum + coord.lat, 0) / coordinates.length;
            const centerLng = coordinates.reduce((sum: number, coord: any) => sum + coord.lng, 0) / coordinates.length;

            imageData.push({
              areaName: area.name,
              indexType,
              imageUrl: mapId.tile_fetcher.url_format,
              stats: {
                min: statsValue[`${indexType}_min`],
                max: statsValue[`${indexType}_max`],
                mean: statsValue[`${indexType}_mean`],
              },
              centerLat,
              centerLng,
            });
          }
        }

        // Generate email content (async function that downloads images)
        const emailHtml = await generateReportEmail(report, imageData);

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

        // Mark report as generated using Admin SDK (bypasses Firestore rules)
        await markReportGeneratedAdmin(report.id!);

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

async function generateReportEmail(
  report: any,
  imageData: Array<{
    areaName: string;
    indexType: IndexType;
    imageUrl: string;
    stats: { min: number; max: number; mean: number };
    centerLat?: number;
    centerLng?: number;
  }>
): Promise<string> {
  const reportDate = new Date().toLocaleDateString("es-MX", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Import the download function (we'll define it here for this file)
  const downloadTileAsBase64 = async (
    tileUrl: string, 
    areaName: string, 
    indexType: string,
    centerLat?: number,
    centerLng?: number
  ): Promise<string | null> => {
    try {
      const zoom = 12;
      let x: number, y: number;
      
      if (centerLat !== undefined && centerLng !== undefined) {
        const n = Math.pow(2, zoom);
        x = Math.floor((centerLng + 180) / 360 * n);
        const latRad = centerLat * Math.PI / 180;
        y = Math.floor((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n);
      } else {
        x = 1 << (zoom - 1);
        y = 1 << (zoom - 1);
      }
      
      let url = tileUrl;
      if (url.includes("{x}") || url.includes("{y}") || url.includes("{z}")) {
        url = url.replace(/{x}/g, x.toString()).replace(/{y}/g, y.toString()).replace(/{z}/g, zoom.toString());
      } else {
        url = `${tileUrl}&x=${x}&y=${y}&z=${zoom}`;
      }
      
      const response = await fetch(url, { headers: { 'User-Agent': 'CoperniGeo-Email-Service/1.0' } });
      if (!response.ok) return null;
      
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const base64 = buffer.toString('base64');
      const contentType = response.headers.get('content-type') || 'image/png';
      return `data:${contentType};base64,${base64}`;
    } catch (error) {
      return null;
    }
  };

  let imagesHtml = "";
  for (const data of imageData) {
    const imageBase64 = await downloadTileAsBase64(data.imageUrl, data.areaName, data.indexType, data.centerLat, data.centerLng);
    const imageTag = imageBase64 
      ? `<img src="${imageBase64}" alt="${data.areaName} - ${data.indexType}" style="max-width: 100%; height: auto; border-radius: 5px; margin: 10px 0;" />`
      : `<p style="color: #666; font-style: italic;">Imagen no disponible - ver en dashboard</p>`;
    
    imagesHtml += `
      <div style="margin-bottom: 20px; padding: 15px; border: 1px solid #ddd; border-radius: 5px; background-color: white;">
        <h3 style="color: #5db815; margin-top: 0;">${data.areaName} - ${data.indexType}</h3>
        ${imageTag}
        <p style="margin-top: 10px;"><strong>Valores:</strong> Mín: ${data.stats.min.toFixed(3)}, Máx: ${data.stats.max.toFixed(3)}, Promedio: ${data.stats.mean.toFixed(3)}</p>
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
        .header { background-color: #5db815; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
        .content { background-color: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; }
        .button { display: inline-block; padding: 10px 20px; background-color: #5db815; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
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


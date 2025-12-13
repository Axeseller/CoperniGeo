import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { ReportPDF } from "./reportTemplate";
import { IndexType } from "@/types/report";
import { Report } from "@/types/report";

interface ImageData {
  areaName: string;
  indexType: IndexType;
  imageUrl?: string; // Earth Engine tile URL
  imageBase64?: string; // Base64 encoded image for PDF
  stats: {
    min: number;
    max: number;
    mean: number;
  };
}

/**
 * Download image from Earth Engine tile URL and convert to base64
 * Note: For now, we'll skip images to keep it simple - can be added later
 */
async function downloadImageAsBase64(imageUrl: string): Promise<string | null> {
  try {
    // Earth Engine tile URLs are complex - for now we'll skip images
    // Images can be added later by properly handling tile URLs
    console.log(`[PDF] Image download skipped for ${imageUrl.substring(0, 50)}...`);
    return null;
  } catch (error) {
    console.error(`Error downloading image:`, error);
    return null;
  }
}

/**
 * Process image data to include base64 encoded images for PDF
 */
async function processImageData(imageData: ImageData[]): Promise<ImageData[]> {
  // Skip image processing for now - can be enhanced later
  return imageData.map((data) => ({
    ...data,
    imageBase64: undefined,
  }));
}

/**
 * Generate PDF buffer from report data
 */
export async function generateReportPDF(
  report: Report,
  imageData: Array<{
    areaName: string;
    indexType: IndexType;
    imageUrl?: string; // Base64 data URI: "data:image/png;base64,..."
    stats: {
      min: number;
      max: number;
      mean: number;
    };
  }>
): Promise<Buffer> {
  // Format report date
  const reportDate = new Date().toLocaleDateString("es-MX", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  
  // Prepare image data for PDF template
  // imageData.imageUrl should already be a base64 data URI from the send route
  const pdfImageData = imageData.map((data) => ({
    areaName: data.areaName,
    indexType: data.indexType,
    imageUrl: data.imageUrl, // Should be base64 data URI: "data:image/png;base64,..."
    stats: data.stats,
  }));
  
  console.log(`[PDF] Preparing ${pdfImageData.length} images for PDF. Images with data: ${pdfImageData.filter(d => d.imageUrl).length}`);
  
  // Create PDF Document using the template component
  const pdfDoc = (
    <ReportPDF
      report={{
        frequency: report.frequency,
        indices: report.indices,
        cloudCoverage: report.cloudCoverage,
        email: report.email,
      }}
      imageData={pdfImageData}
      reportDate={reportDate}
    />
  );
  
  // Render to buffer using the correct import
  const pdfBuffer = await renderToBuffer(pdfDoc);
  return Buffer.from(pdfBuffer);
}


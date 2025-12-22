import puppeteer from "puppeteer-core";
import fs from "fs";
import path from "path";

/**
 * Get browser instance (similar to tileRenderer pattern)
 */
async function getBrowserForPDF(): Promise<any> {
  const isVercel = process.env.VERCEL || process.env.VERCEL_ENV;
  
  if (isVercel) {
    // Use @sparticuz/chromium-min for Vercel
    try {
      const chromiumModule = await import("@sparticuz/chromium-min");
      const chromium = chromiumModule.default || chromiumModule;
      
      return await puppeteer.launch({
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath(),
        headless: chromium.headless,
      });
    } catch (error: any) {
      console.warn("[PDF] Chromium-min failed, trying fallback:", error.message);
      throw error;
    }
  } else {
    // Use local puppeteer for development
    const puppeteerLocal = await import("puppeteer");
    return await puppeteerLocal.default.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
  }
}

/**
 * Generate PDF from HTML template for crop health report
 */
export async function generateCropHealthPDF(
  templateData: {
    fieldName: string;
    region: string;
    analysisDate: string;
    ndviImageUrl: string; // Base64 data URI: "data:image/png;base64,..."
  }
): Promise<Buffer> {
  // Read the HTML template
  const templatePath = path.join(process.cwd(), "src/lib/pdf/cropHealthReport.html");
  let htmlTemplate = fs.readFileSync(templatePath, "utf-8");

  // Replace template variables
  htmlTemplate = htmlTemplate.replace(/\{\{fieldName\}\}/g, templateData.fieldName || "Campo");
  htmlTemplate = htmlTemplate.replace(/\{\{region\}\}/g, templateData.region || "N/A");
  htmlTemplate = htmlTemplate.replace(/\{\{analysisDate\}\}/g, templateData.analysisDate);
  
  // Replace image URL - use base64 data URI directly (same approach as report emails)
  const hasImage = templateData.ndviImageUrl && 
                   templateData.ndviImageUrl.trim().length > 0 && 
                   templateData.ndviImageUrl.startsWith('data:image');
  
  console.log(`[PDF] Image check: hasImage=${hasImage}, length=${templateData.ndviImageUrl?.length || 0}, startsWith=${templateData.ndviImageUrl?.substring(0, 20) || 'N/A'}`);
  
  if (hasImage) {
    // Replace the placeholder with the actual base64 image
    htmlTemplate = htmlTemplate.replace(/\{\{ndviImageUrl\}\}/g, templateData.ndviImageUrl);
    console.log(`[PDF] ✅ Image URL replaced in template (${templateData.ndviImageUrl.length} chars)`);
  } else {
    // Replace the entire img tag with placeholder div if no image
    const imgTagRegex = /<img\s+src="\{\{ndviImageUrl\}\}"\s+alt="Mapa de vigor del cultivo"\s*\/?>/g;
    htmlTemplate = htmlTemplate.replace(
      imgTagRegex,
      '<div style="color: #898989; text-align: center; padding: 40px;">Imagen no disponible</div>'
    );
    console.log(`[PDF] ⚠️ No valid image URL, using placeholder. Image URL was: ${templateData.ndviImageUrl || 'EMPTY'}`);
  }

  let browser;
  try {
    browser = await getBrowserForPDF();
    const page = await browser.newPage();
    
    // Set viewport for consistent rendering
    await page.setViewport({
      width: 1200,
      height: 1600,
      deviceScaleFactor: 2,
    });
    
    // Set content and wait for images to load
    await page.setContent(htmlTemplate, {
      waitUntil: ["networkidle0", "load"],
    });

    // Wait for images to be fully loaded and verify they're visible
    try {
      await page.evaluate(() => {
        return Promise.all(
          Array.from(document.images).map((img) => {
            if (img.complete && img.naturalWidth > 0) {
              console.log(`[PDF] Image already loaded: width=${img.naturalWidth}, height=${img.naturalHeight}`);
              return Promise.resolve();
            }
            return new Promise((resolve, reject) => {
              img.onload = () => {
                if (img.naturalWidth > 0) {
                  console.log(`[PDF] Image loaded: width=${img.naturalWidth}, height=${img.naturalHeight}`);
                  resolve();
                } else {
                  reject(new Error("Image has no width"));
                }
              };
              img.onerror = (e) => {
                console.error(`[PDF] Image error:`, e);
                reject(new Error("Image failed to load"));
              };
              // Timeout after 10 seconds for base64 images
              setTimeout(() => reject(new Error("Image load timeout")), 10000);
            });
          })
        );
      });
      console.log(`[PDF] ✅ All images loaded successfully`);
    } catch (err: any) {
      console.warn("[PDF] Image loading issue:", err.message);
      // Log image info for debugging
      const imageInfo = await page.evaluate(() => {
        const imgs = Array.from(document.images);
        return imgs.map((img, idx) => ({
          index: idx + 1,
          srcLength: img.src.length,
          srcPreview: img.src.substring(0, 50),
          complete: img.complete,
          naturalWidth: img.naturalWidth,
          naturalHeight: img.naturalHeight,
        }));
      });
      console.log(`[PDF] Image debug info:`, JSON.stringify(imageInfo, null, 2));
    }

    // Generate PDF with better page break handling
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      margin: {
        top: "15mm",
        right: "15mm",
        bottom: "15mm",
        left: "15mm",
      },
    });

    await browser.close();
    return Buffer.from(pdfBuffer);
  } catch (error: any) {
    if (browser) {
      await browser.close();
    }
    console.error("[PDF] Error generating crop health PDF:", error);
    throw new Error(`Failed to generate PDF: ${error.message}`);
  }
}


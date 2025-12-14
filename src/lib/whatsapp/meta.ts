/**
 * Send WhatsApp message using Meta (Facebook) Graph API
 */

interface WhatsAppTemplateParams {
  type: "text";
  parameter_name: string;
  text: string;
}

interface WhatsAppTemplateComponent {
  type: "body";
  parameters: WhatsAppTemplateParams[];
}

interface WhatsAppMessagePayload {
  messaging_product: "whatsapp";
  to: string;
  type: "template";
  template: {
    name: string;
    language: {
      code: string;
    };
    components: WhatsAppTemplateComponent[];
  };
}

/**
 * Send a WhatsApp message using Meta Graph API
 */
export async function sendWhatsAppMessage(
  to: string,
  templateName: string,
  templateParams: Record<string, string>
): Promise<void> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

  if (!phoneNumberId) {
    throw new Error("WHATSAPP_PHONE_NUMBER_ID is not set in environment variables");
  }

  if (!accessToken) {
    throw new Error("WHATSAPP_ACCESS_TOKEN is not set in environment variables");
  }

  // Convert template params to WhatsApp format
  // Parameters must include parameter_name matching the template
  const components: WhatsAppTemplateComponent[] = [
    {
      type: "body",
      parameters: Object.entries(templateParams).map(([name, value]) => ({
        type: "text",
        parameter_name: name,
        text: value,
      })),
    },
  ];

  const payload: WhatsAppMessagePayload = {
    messaging_product: "whatsapp",
    to: to.replace(/\D/g, ""), // Remove non-digits (format: 523318450745)
    type: "template",
    template: {
      name: templateName,
      language: {
        code: "es",
      },
      components,
    },
  };

  const url = `https://graph.facebook.com/v24.0/${phoneNumberId}/messages`;

  console.log(`[WhatsApp] Sending message to ${to} using template ${templateName}...`);
  console.log(`[WhatsApp] URL: ${url}`);
  console.log(`[WhatsApp] Payload:`, JSON.stringify(payload, null, 2));

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[WhatsApp] ❌ API error: ${response.status} ${response.statusText}`);
      console.error(`[WhatsApp] Error response:`, errorText);
      throw new Error(
        `WhatsApp API error: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    const result = await response.json();
    console.log(`[WhatsApp] ✅ Message sent successfully:`, JSON.stringify(result, null, 2));
  } catch (error: any) {
    console.error(`[WhatsApp] ❌ Failed to send message:`, error);
    throw new Error(`Failed to send WhatsApp message: ${error.message || "Unknown error"}`);
  }
}

/**
 * Send automated report notification via WhatsApp
 */
export async function sendReportWhatsApp(
  phoneNumber: string,
  indices: string[],
  areas: string[]
): Promise<void> {
  // Format indices: "NDVI, NDRE y EVI"
  let indicesText = "";
  if (indices.length === 1) {
    indicesText = indices[0];
  } else if (indices.length === 2) {
    indicesText = `${indices[0]} y ${indices[1]}`;
  } else {
    indicesText = `${indices.slice(0, -1).join(", ")} y ${indices[indices.length - 1]}`;
  }

  // Format areas: "cerca de berries"
  const areasText = areas.length === 1 ? areas[0] : areas.join(", ");

  console.log(`[WhatsApp] Formatted message:`);
  console.log(`[WhatsApp]   - Indices: ${indicesText}`);
  console.log(`[WhatsApp]   - Areas: ${areasText}`);

  // Send parameters in the correct order: indexes first, then areas
  // Using an object with guaranteed property order
  const params: Record<string, string> = {};
  params.indexes = indicesText;
  params.areas = areasText;

  await sendWhatsAppMessage(phoneNumber, "reporte_automatico", params);
}

/**
 * Send report delivery notification via WhatsApp with PDF URL
 * Uses "enviodereporte" template with nombre_reporte and pdf_url parameters
 */
export async function sendReportWhatsAppWithPDF(
  phoneNumber: string,
  reportName: string,
  pdfUrl: string
): Promise<void> {
  console.log(`[WhatsApp] Sending report delivery notification:`);
  console.log(`[WhatsApp]   - Report Name: ${reportName}`);
  console.log(`[WhatsApp]   - PDF URL: ${pdfUrl}`);

  // Send parameters: nombre_reporte and pdf_url
  const params: Record<string, string> = {};
  params.nombre_reporte = reportName;
  params.pdf_url = pdfUrl;

  await sendWhatsAppMessage(phoneNumber, "enviodereporte", params);
}

/**
 * Send image via WhatsApp using direct URL
 * No Media API upload needed - uses Firebase Storage public URL
 */
export async function sendWhatsAppImage(
  to: string,
  imageUrl: string
): Promise<void> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

  if (!phoneNumberId) {
    throw new Error("WHATSAPP_PHONE_NUMBER_ID is not set in environment variables");
  }

  if (!accessToken) {
    throw new Error("WHATSAPP_ACCESS_TOKEN is not set in environment variables");
  }

  const payload = {
    messaging_product: "whatsapp",
    to: to.replace(/\D/g, ""), // Remove non-digits
    type: "image",
    image: {
      link: imageUrl,
    },
  };

  const url = `https://graph.facebook.com/v24.0/${phoneNumberId}/messages`;

  console.log(`[WhatsApp] Sending image to ${to}...`);
  console.log(`[WhatsApp] Image URL: ${imageUrl}`);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[WhatsApp] ❌ API error: ${response.status} ${response.statusText}`);
      console.error(`[WhatsApp] Error response:`, errorText);
      throw new Error(
        `WhatsApp API error: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    const result = await response.json();
    console.log(`[WhatsApp] ✅ Image sent successfully:`, JSON.stringify(result, null, 2));
  } catch (error: any) {
    console.error(`[WhatsApp] ❌ Failed to send image:`, error);
    throw new Error(`Failed to send WhatsApp image: ${error.message || "Unknown error"}`);
  }
}

/**
 * Send document (PDF) via WhatsApp using direct URL
 * No Media API upload needed - uses Firebase Storage public URL
 */
export async function sendWhatsAppDocument(
  to: string,
  pdfUrl: string,
  filename: string
): Promise<void> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

  if (!phoneNumberId) {
    throw new Error("WHATSAPP_PHONE_NUMBER_ID is not set in environment variables");
  }

  if (!accessToken) {
    throw new Error("WHATSAPP_ACCESS_TOKEN is not set in environment variables");
  }

  const payload = {
    messaging_product: "whatsapp",
    to: to.replace(/\D/g, ""), // Remove non-digits
    type: "document",
    document: {
      link: pdfUrl,
      filename: filename,
    },
  };

  const url = `https://graph.facebook.com/v24.0/${phoneNumberId}/messages`;

  console.log(`[WhatsApp] Sending document to ${to}...`);
  console.log(`[WhatsApp] PDF URL: ${pdfUrl}`);
  console.log(`[WhatsApp] Filename: ${filename}`);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[WhatsApp] ❌ API error: ${response.status} ${response.statusText}`);
      console.error(`[WhatsApp] Error response:`, errorText);
      throw new Error(
        `WhatsApp API error: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    const result = await response.json();
    console.log(`[WhatsApp] ✅ Document sent successfully:`, JSON.stringify(result, null, 2));
  } catch (error: any) {
    console.error(`[WhatsApp] ❌ Failed to send document:`, error);
    throw new Error(`Failed to send WhatsApp document: ${error.message || "Unknown error"}`);
  }
}



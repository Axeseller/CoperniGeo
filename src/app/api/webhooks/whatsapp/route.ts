import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export const dynamic = 'force-dynamic';

/**
 * GET /api/webhooks/whatsapp
 * Webhook verification endpoint (required by Meta)
 * Meta sends a GET request with hub.mode, hub.verify_token, and hub.challenge
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;

  // Debug logging (server-side only)
  console.log("[Webhook] Verification request received", {
    mode,
    hasToken: !!token,
    tokenLength: token?.length,
    hasVerifyToken: !!verifyToken,
    verifyTokenLength: verifyToken?.length,
    challenge: challenge?.substring(0, 20) + "...",
  });

  if (!verifyToken || verifyToken.trim() === "") {
    console.error("[Webhook] WHATSAPP_WEBHOOK_VERIFY_TOKEN is not set or empty");
    console.error("[Webhook] Available env vars:", Object.keys(process.env).filter(k => k.includes("WHATSAPP")));
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  // Verify the webhook
  if (mode === "subscribe" && token === verifyToken) {
    console.log("[Webhook] ✅ Webhook verified successfully");
    return new NextResponse(challenge, { status: 200 });
  } else {
    // Log failure details (but don't expose tokens in response)
    console.error("[Webhook] ❌ Webhook verification failed", {
      mode,
      tokenMatch: token === verifyToken,
      tokenLengthsMatch: token?.length === verifyToken?.length,
      modeMatch: mode === "subscribe",
    });
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
}

/**
 * POST /api/webhooks/whatsapp
 * Handle incoming WhatsApp messages
 */
export async function POST(request: NextRequest) {
  try {
    // Verify webhook signature
    // Meta signs webhooks using the App Secret, not the verify token
    const signature = request.headers.get("X-Hub-Signature-256");
    let appSecret = process.env.WHATSAPP_APP_SECRET;
    
    // Trim App Secret in case it has whitespace (common when copying from Meta)
    if (appSecret) {
      appSecret = appSecret.trim();
    }

    // Read body as text for signature verification
    // Important: Read as raw text, not JSON, to match what Meta signed
    const body = await request.text();
    
    // Debug logging
    console.log("[Webhook] POST request received", {
      hasSignature: !!signature,
      signatureHeader: signature?.substring(0, 30),
      hasAppSecret: !!appSecret,
      appSecretLength: appSecret?.length,
      appSecretPreview: appSecret ? appSecret.substring(0, 8) + "..." : "none",
      bodyLength: body.length,
      bodyPreview: body.substring(0, 150),
      contentType: request.headers.get("content-type"),
    });
    
    // Verify signature if App Secret is configured and signature is provided
    if (signature && appSecret) {
      // Remove "sha256=" prefix if present (Meta sends it with this prefix)
      const providedSignature = signature.replace(/^sha256=/, "").trim();
      
      // Calculate expected signature using the raw body
      // Meta signs the exact raw body bytes as received
      const expectedSignature = crypto
        .createHmac("sha256", appSecret)
        .update(body, "utf8") // Explicitly specify encoding
        .digest("hex");

      console.log("[Webhook] Signature comparison", {
        providedSignature: providedSignature.substring(0, 16) + "...",
        expectedSignature: expectedSignature.substring(0, 16) + "...",
        providedLength: providedSignature.length,
        expectedLength: expectedSignature.length,
        match: expectedSignature === providedSignature,
      });

      if (expectedSignature !== providedSignature) {
        console.error("[Webhook] ❌ Invalid signature - signatures do not match");
        return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
      } else {
        console.log("[Webhook] ✅ Signature verified successfully");
      }
    } else if (signature && !appSecret) {
      // Log warning if signature is provided but App Secret is not configured
      console.warn("[Webhook] ⚠️ Signature provided but WHATSAPP_APP_SECRET is not set - skipping verification");
      console.warn("[Webhook] Available env vars:", Object.keys(process.env).filter(k => k.includes("WHATSAPP")));
    } else {
      console.log("[Webhook] No signature provided - processing without verification");
    }

    const data = JSON.parse(body);

    // Handle different webhook event types
    if (data.object === "whatsapp_business_account") {
      // Process incoming messages
      if (data.entry && data.entry.length > 0) {
        for (const entry of data.entry) {
          if (entry.changes && entry.changes.length > 0) {
            for (const change of entry.changes) {
              if (change.value.messages && change.value.messages.length > 0) {
                for (const message of change.value.messages) {
                  await handleIncomingMessage(message, change.value.contacts?.[0]);
                }
              }
            }
          }
        }
      }
    }

    // Always return 200 to acknowledge receipt
    return NextResponse.json({ status: "ok" }, { status: 200 });
  } catch (error: any) {
    console.error("[Webhook] ❌ Error processing webhook:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * Handle incoming WhatsApp message
 */
async function handleIncomingMessage(message: any, contact: any) {
  const from = message.from; // Phone number
  const messageType = message.type;
  const messageId = message.id;

  console.log(`[Webhook] Received message from ${from}, type: ${messageType}`);

  // Handle text messages
  if (messageType === "text") {
    const text = message.text?.body || "";
    const normalizedText = text.toLowerCase().trim();

    console.log(`[Webhook] Message text: "${text}"`);
    console.log(`[Webhook] Normalized text: "${normalizedText}"`);

    // Check if user wants to see the report
    if (normalizedText === "quiero ver el reporte" || normalizedText.includes("quiero ver")) {
      console.log(`[Webhook] ✅ Matched report request pattern`);
      await handleViewReportRequest(from);
      return;
    } else {
      console.log(`[Webhook] Message does not match report request pattern`);
    }
  }

  // Handle button/interactive messages
  if (messageType === "interactive") {
    const buttonId = message.interactive?.button_reply?.id;
    const buttonText = message.interactive?.button_reply?.title;

    if (buttonId === "view_report" || buttonText === "Ver reporte" || buttonText?.toLowerCase().includes("ver reporte")) {
      await handleViewReportRequest(from);
      return;
    }
  }

  console.log(`[Webhook] Message not handled: ${messageType}`);
}

/**
 * Handle "quiero ver el reporte" request
 * Sends PDF and images to user via WhatsApp
 */
async function handleViewReportRequest(phoneNumber: string) {
  try {
    console.log(`[Webhook] Handling view report request from ${phoneNumber}`);

    // Import here to avoid circular dependencies
    const { getUserMostRecentReportByPhone } = await import("@/lib/firestore/admin");
    const { sendWhatsAppDocument, sendWhatsAppImage } = await import("@/lib/whatsapp/meta");

    // Get user's most recent report
    const report = await getUserMostRecentReportByPhone(phoneNumber);

    if (!report) {
      console.log(`[Webhook] No report found for phone number: ${phoneNumber}`);
      // Could send a message saying no report found, but we're in 24-hour window
      return;
    }

    console.log(`[Webhook] Found report: ${report.id}, name: ${report.name || "N/A"}`);

    // Send PDF if available
    if (report.pdfUrl) {
      const filename = `${report.name || "reporte"}.pdf`;
      await sendWhatsAppDocument(phoneNumber, report.pdfUrl, filename);
      console.log(`[Webhook] ✅ PDF sent to ${phoneNumber}`);
    }

    // Send individual images if available
    if (report.imageUrls && report.imageUrls.length > 0) {
      for (const img of report.imageUrls) {
        await sendWhatsAppImage(phoneNumber, img.url);
        console.log(`[Webhook] ✅ Image sent: ${img.areaName} - ${img.indexType}`);
        // Small delay between images to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    console.log(`[Webhook] ✅ All media sent to ${phoneNumber}`);
  } catch (error: any) {
    console.error(`[Webhook] ❌ Error handling view report request:`, error);
    // Don't throw - we've already acknowledged the webhook
  }
}


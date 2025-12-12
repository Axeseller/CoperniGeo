import { Resend } from "resend";

// Lazy initialization to avoid build-time errors
let resendInstance: Resend | null = null;

function getResendClient(): Resend {
  if (!resendInstance) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error("RESEND_API_KEY is not set");
    }
    resendInstance = new Resend(apiKey);
  }
  return resendInstance;
}

export function getResend(): Resend {
  return getResendClient();
}

/**
 * Send an email using Resend
 */
export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  from?: string,
  attachments?: Array<{
    filename: string;
    content: Buffer | Uint8Array;
    contentType?: string;
    cid?: string; // Content-ID for inline images
  }>
): Promise<void> {
  const resend = getResendClient();
  // Use verified copernigeo.com domain
  const fromEmail = from || process.env.RESEND_FROM_EMAIL || "noreply@copernigeo.com";

  const emailOptions: any = {
    from: fromEmail,
    to,
    subject,
    html,
  };

  // Add attachments if provided
  // Resend expects attachments with content as base64 string
  if (attachments && attachments.length > 0) {
    console.log(`[Email] Preparing ${attachments.length} attachment(s)...`);
    emailOptions.attachments = attachments.map((att) => {
      // Convert Buffer/Uint8Array to base64 string (Resend expects base64)
      let contentBase64: string;
      if (Buffer.isBuffer(att.content)) {
        contentBase64 = att.content.toString('base64');
      } else if (att.content instanceof Uint8Array) {
        contentBase64 = Buffer.from(att.content).toString('base64');
      } else {
        throw new Error("Attachment content must be Buffer or Uint8Array");
      }
      
      console.log(`[Email] Attachment prepared: ${att.filename} (${contentBase64.length} chars base64)${att.cid ? `, CID: ${att.cid}` : ''}`);
      const attachment: any = {
        filename: att.filename,
        content: contentBase64,
      };
      // Add Content-ID for inline images
      // Resend supports both 'cid' and 'content_id' - using 'content_id' for inline images
      if (att.cid) {
        attachment.content_id = att.cid;
        // Mark as inline attachment (not regular attachment)
        attachment.disposition = 'inline';
      }
      return attachment;
    });
    console.log(`[Email] All attachments prepared successfully`);
  }

  console.log(`[Email] Sending email to ${to}...`);
  console.log(`[Email] Email options:`, {
    from: emailOptions.from,
    to: emailOptions.to,
    subject: emailOptions.subject,
    hasAttachments: !!emailOptions.attachments && emailOptions.attachments.length > 0,
    attachmentCount: emailOptions.attachments?.length || 0,
  });
  
  try {
    const result = await resend.emails.send(emailOptions);
    console.log(`[Email] ✅ Email sent successfully:`, JSON.stringify(result, null, 2));
    
    // Check if result indicates an error
    if (result.error) {
      console.error(`[Email] ❌ Resend API returned an error:`, result.error);
      throw new Error(`Resend API error: ${JSON.stringify(result.error)}`);
    }
    
    if (result.data) {
      console.log(`[Email] Email ID: ${result.data.id}`);
    }
  } catch (error: any) {
    console.error(`[Email] ❌ Failed to send email:`, error);
    console.error(`[Email] Error details:`, {
      message: error.message,
      name: error.name,
      stack: error.stack,
      response: error.response?.data || error.response,
    });
    
    // Re-throw with more context
    throw new Error(`Failed to send email via Resend: ${error.message || 'Unknown error'}`);
  }
}


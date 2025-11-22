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
  from?: string
): Promise<void> {
  const resend = getResendClient();
  const fromEmail = from || process.env.RESEND_FROM_EMAIL || "noreply@copernigeo.com";

  await resend.emails.send({
    from: fromEmail,
    to,
    subject,
    html,
  });
}


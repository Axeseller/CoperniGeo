import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export const resendClient = resend;

/**
 * Send an email using Resend
 */
export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  from?: string
): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not set");
  }

  const fromEmail = from || process.env.RESEND_FROM_EMAIL || "noreply@copernigeo.com";

  await resend.emails.send({
    from: fromEmail,
    to,
    subject,
    html,
  });
}


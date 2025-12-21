import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/email/resend";

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, company, message } = body;

    // Validate required fields
    if (!name || !email || !message) {
      return NextResponse.json(
        { error: "Por favor completa todos los campos requeridos" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Email inválido" },
        { status: 400 }
      );
    }

    // Create email HTML content
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #5db815; border-bottom: 2px solid #5db815; padding-bottom: 10px;">
          Nuevo Mensaje de Contacto - CoperniGeo
        </h2>
        
        <div style="margin-top: 20px;">
          <p><strong>Nombre:</strong> ${name}</p>
          <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
          ${company ? `<p><strong>Empresa/Organización:</strong> ${company}</p>` : ''}
        </div>
        
        <div style="margin-top: 30px; padding: 15px; background-color: #f9f9f9; border-left: 4px solid #5db815;">
          <h3 style="margin-top: 0; color: #121212;">Mensaje:</h3>
          <p style="white-space: pre-wrap; color: #333;">${message}</p>
        </div>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666;">
          <p>Este mensaje fue enviado desde el formulario de contacto de CoperniGeo.</p>
          <p>Puedes responder directamente a este email para contactar al remitente.</p>
        </div>
      </div>
    `;

    // Send email to contact@copernigeo.com
    await sendEmail(
      "contact@copernigeo.com",
      `Nuevo Mensaje de Contacto de ${name}`,
      emailHtml,
      undefined,
      undefined
    );

    // Also send a confirmation email to the user
    const confirmationHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #5db815; border-bottom: 2px solid #5db815; padding-bottom: 10px;">
          Gracias por Contactarnos
        </h2>
        
        <p>Hola ${name},</p>
        
        <p>Hemos recibido tu mensaje y nos pondremos en contacto contigo lo antes posible.</p>
        
        <div style="margin-top: 30px; padding: 15px; background-color: #f9f9f9; border-left: 4px solid #5db815;">
          <p style="margin: 0;"><strong>Tu mensaje:</strong></p>
          <p style="white-space: pre-wrap; color: #333; margin-top: 10px;">${message}</p>
        </div>
        
        <p style="margin-top: 30px;">
          Si tienes alguna pregunta urgente, puedes contactarnos directamente en 
          <a href="mailto:contact@copernigeo.com" style="color: #5db815;">contact@copernigeo.com</a>
        </p>
        
        <p style="margin-top: 30px;">
          Saludos,<br>
          El equipo de CoperniGeo
        </p>
      </div>
    `;

    try {
      await sendEmail(
        email,
        "Hemos recibido tu mensaje - CoperniGeo",
        confirmationHtml,
        undefined,
        undefined
      );
    } catch (confirmationError: any) {
      // Log but don't fail if confirmation email fails
      console.error("[Contact API] Failed to send confirmation email:", confirmationError);
    }

    return NextResponse.json({
      success: true,
      message: "Mensaje enviado exitosamente",
    });
  } catch (error: any) {
    console.error("[Contact API] Error processing contact form:", error);
    return NextResponse.json(
      { error: error.message || "Error al enviar el mensaje. Por favor intenta de nuevo." },
      { status: 500 }
    );
  }
}


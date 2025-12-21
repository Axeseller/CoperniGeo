import { NextRequest, NextResponse } from "next/server";
import { createUserPlanAdmin, getRemainingBasicPlanSpotsAdmin } from "@/lib/firestore/admin";

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, feedbackAgreement, cropType, hectares } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "userId es requerido" },
        { status: 400 }
      );
    }

    // Check if spots are still available
    const remaining = await getRemainingBasicPlanSpotsAdmin();
    if (remaining <= 0) {
      return NextResponse.json(
        { error: "No hay espacios disponibles para el plan básico" },
        { status: 400 }
      );
    }

    // Create user plan using Admin SDK
    await createUserPlanAdmin(
      userId,
      "basic",
      feedbackAgreement,
      cropType,
      hectares
    );

    return NextResponse.json({
      success: true,
      message: "Plan básico asignado exitosamente",
      remaining: remaining - 1,
    });
  } catch (error: any) {
    console.error("[API] Error signing up for basic plan:", error);
    return NextResponse.json(
      { error: error.message || "Error al asignar plan básico" },
      { status: 500 }
    );
  }
}


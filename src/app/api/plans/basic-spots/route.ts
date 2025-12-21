import { NextRequest, NextResponse } from "next/server";
import { getRemainingBasicPlanSpotsAdmin } from "@/lib/firestore/admin";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const remaining = await getRemainingBasicPlanSpotsAdmin();
    return NextResponse.json({ remaining, total: 15 });
  } catch (error: any) {
    console.error("[API] Error getting basic plan spots:", error);
    return NextResponse.json(
      { error: "Error al obtener espacios disponibles" },
      { status: 500 }
    );
  }
}


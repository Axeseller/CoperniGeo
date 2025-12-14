import { NextRequest, NextResponse } from "next/server";
import { getReportAdmin, getAreaAdmin } from "@/lib/firestore/admin";
import { sendReportWhatsApp } from "@/lib/whatsapp/meta";

export const dynamic = 'force-dynamic';

/**
 * POST /api/reports/[id]/confirm-whatsapp
 * Send WhatsApp confirmation message when a report with WhatsApp delivery is created
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log(`[WhatsApp Confirm] Sending confirmation for report ID: ${params.id}`);
  try {
    // Get the report using Admin SDK
    const report = await getReportAdmin(params.id);
    
    if (!report) {
      console.error(`[WhatsApp Confirm] Report not found: ${params.id}`);
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    if (report.deliveryMethod !== "whatsapp") {
      return NextResponse.json({ error: "Report is not configured for WhatsApp delivery" }, { status: 400 });
    }

    if (!report.phoneNumber) {
      return NextResponse.json({ error: "Phone number is required for WhatsApp delivery" }, { status: 400 });
    }
    
    console.log(`[WhatsApp Confirm] Report found: ${report.id}, areas: ${report.areaIds.length}, indices: ${report.indices.join(", ")}`);

    // Get area names
    const areas = await Promise.all(
      report.areaIds.map((areaId) => getAreaAdmin(areaId))
    );
    const areaNames = areas
      .filter((area) => area !== null)
      .map((area) => area!.name);

    console.log(`[WhatsApp Confirm] Sending confirmation to ${report.phoneNumber}...`);
    console.log(`[WhatsApp Confirm] Indices: ${report.indices.join(", ")}`);
    console.log(`[WhatsApp Confirm] Areas: ${areaNames.join(", ")}`);

    // Send WhatsApp confirmation message
    await sendReportWhatsApp(
      report.phoneNumber,
      report.indices,
      areaNames
    );

    console.log(`[WhatsApp Confirm] ✅ Confirmation sent successfully to ${report.phoneNumber}`);

    return NextResponse.json({
      success: true,
      message: "WhatsApp confirmation sent successfully",
      reportId: report.id,
    });
  } catch (error: any) {
    console.error(`[WhatsApp Confirm] Error:`, error);
    return NextResponse.json(
      { error: error.message || "Failed to send WhatsApp confirmation" },
      { status: 500 }
    );
  }
}


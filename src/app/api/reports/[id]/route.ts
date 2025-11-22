import { NextRequest, NextResponse } from "next/server";
import {
  getReport,
  updateReport,
  deleteReport,
  createReport,
} from "@/lib/firestore/reports";
import { Report } from "@/types/report";

// GET /api/reports/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const report = await getReport(params.id);
    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }
    return NextResponse.json(report);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to get report" },
      { status: 500 }
    );
  }
}

// PUT /api/reports/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    await updateReport(params.id, body);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to update report" },
      { status: 500 }
    );
  }
}

// DELETE /api/reports/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await deleteReport(params.id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to delete report" },
      { status: 500 }
    );
  }
}


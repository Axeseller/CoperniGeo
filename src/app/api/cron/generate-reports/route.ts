import { NextRequest, NextResponse } from "next/server";

/**
 * Cron job endpoint to generate reports
 * Configure in vercel.json to run daily
 */
export async function GET(request: NextRequest) {
  try {
    // Verify this is a cron request (optional: add secret verification)
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Call the report generation endpoint
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || request.nextUrl.origin;
    const response = await fetch(`${baseUrl}/api/reports/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to generate reports", details: data },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Reports generation triggered",
      results: data,
    });
  } catch (error: any) {
    console.error("Error in cron job:", error);
    return NextResponse.json(
      { error: error.message || "Cron job failed" },
      { status: 500 }
    );
  }
}


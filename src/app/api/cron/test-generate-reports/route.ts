import { NextRequest, NextResponse } from "next/server";

/**
 * Test endpoint to manually trigger report generation (for verification)
 * This allows testing cron jobs without waiting for the scheduled time
 * 
 * Usage:
 *   GET /api/cron/test-generate-reports
 *   POST /api/cron/test-generate-reports
 * 
 * Optional query params:
 *   - dryRun=true: Only check for due reports without actually generating them
 */
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  return handleTestRequest(request);
}

export async function POST(request: NextRequest) {
  return handleTestRequest(request);
}

async function handleTestRequest(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const dryRun = searchParams.get('dryRun') === 'true';

    console.log(`[Test Cron] Manual trigger requested (dryRun: ${dryRun})`);

    // Call the report generation endpoint
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || request.nextUrl.origin;
    const generateUrl = `${baseUrl}/api/reports/generate`;
    
    console.log(`[Test Cron] Calling ${generateUrl}...`);
    
    const response = await fetch(generateUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { 
          success: false,
          error: "Failed to generate reports", 
          details: data,
          message: "Check the logs for more details"
        },
        { status: response.status }
      );
    }

    // If dry run, just return the count without generating
    if (dryRun) {
      return NextResponse.json({
        success: true,
        message: "Dry run completed - reports would be generated",
        dryRun: true,
        results: data,
      });
    }

    return NextResponse.json({
      success: true,
      message: "Reports generation triggered successfully",
      dryRun: false,
      results: data,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("[Test Cron] Error in test cron job:", error);
    return NextResponse.json(
      { 
        success: false,
        error: error.message || "Test cron job failed",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}


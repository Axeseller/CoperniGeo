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
  const startTime = Date.now();
  const timestamp = new Date().toISOString();
  
  try {
    const searchParams = request.nextUrl.searchParams;
    const dryRun = searchParams.get('dryRun') === 'true';

    console.log(`[Test Cron] Manual trigger requested at ${timestamp} (dryRun: ${dryRun})`);

    // For dry run, we can directly check for due reports without calling generate
    if (dryRun) {
      try {
        const { getDueReportsAdmin } = await import("@/lib/firestore/admin");
        const reports = await getDueReportsAdmin();
        
        const duration = Date.now() - startTime;
        return NextResponse.json({
          success: true,
          message: "Dry run completed",
          dryRun: true,
          reportsFound: reports.length,
          reports: reports.map(r => ({
            id: r.id,
            name: r.name,
            frequency: r.frequency,
            nextRun: r.nextRun?.toISOString(),
            lastGenerated: r.lastGenerated?.toISOString(),
            status: r.status,
          })),
          timestamp,
          duration: `${duration}ms`,
        });
      } catch (error: any) {
        const duration = Date.now() - startTime;
        console.error("[Test Cron] Error in dry run:", error);
        return NextResponse.json(
          { 
            success: false,
            error: error.message || "Dry run failed",
            timestamp,
            duration: `${duration}ms`,
          },
          { status: 500 }
        );
      }
    }

    // For actual generation, call the report generation endpoint
    // Use relative URL to avoid issues with external routing
    const generateUrl = new URL("/api/reports/generate", request.url);
    
    // Pass through forceReportId if provided (for testing specific reports)
    const forceReportId = searchParams.get('forceReportId');
    if (forceReportId) {
      generateUrl.searchParams.set('forceReportId', forceReportId);
      console.log(`[Test Cron] Force mode: Will process report ${forceReportId} (bypassing nextRun check)`);
    }
    
    console.log(`[Test Cron] Calling ${generateUrl.toString()}...`);
    
    // Add timeout to prevent hanging
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 minute timeout
    
    try {
      const response = await fetch(generateUrl.toString(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const contentType = response.headers.get("content-type") || "";
      const duration = Date.now() - startTime;

      if (!response.ok) {
        let errorData: any;
        if (contentType.includes("application/json")) {
          errorData = await response.json();
        } else {
          const text = await response.text();
          console.error(`[Test Cron] Non-JSON error response:`, text.substring(0, 500));
          errorData = { error: `HTTP ${response.status}`, message: text.substring(0, 200) };
        }
        return NextResponse.json(
          { 
            success: false,
            error: "Failed to generate reports", 
            details: errorData,
            message: "Check the logs for more details",
            timestamp,
            duration: `${duration}ms`,
          },
          { status: response.status }
        );
      }

      // Parse JSON only if content-type is correct
      let data: any;
      if (contentType.includes("application/json")) {
        data = await response.json();
      } else {
        const text = await response.text();
        console.error(`[Test Cron] Expected JSON but got:`, contentType, text.substring(0, 500));
        return NextResponse.json(
          { 
            success: false,
            error: "Invalid response format from report generation endpoint",
            timestamp,
            duration: `${duration}ms`,
          },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "Reports generation triggered successfully",
        dryRun: false,
        results: data,
        timestamp,
        duration: `${duration}ms`,
      });
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      const duration = Date.now() - startTime;
      
      if (fetchError.name === 'AbortError') {
        return NextResponse.json(
          { 
            success: false,
            error: "Request timeout - report generation took too long",
            timestamp,
            duration: `${duration}ms`,
          },
          { status: 504 }
        );
      }
      throw fetchError;
    }
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error("[Test Cron] Error in test cron job:", error);
    console.error("[Test Cron] Error stack:", error.stack);
    return NextResponse.json(
      { 
        success: false,
        error: error.message || "Test cron job failed",
        timestamp,
        duration: `${duration}ms`,
      },
      { status: 500 }
    );
  }
}


import { NextRequest, NextResponse } from "next/server";

/**
 * Cron job endpoint to generate reports
 * Configure in vercel.json to run daily
 */
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();
  
  try {
    console.log(`[Cron] Report generation cron job triggered at ${timestamp}`);
    
    // Verify this is a cron request (optional: add secret verification)
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.error(`[Cron] Unauthorized: Invalid or missing authorization header`);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Call the report generation endpoint
    // Use relative URL to avoid issues with external routing
    const generateUrl = new URL("/api/reports/generate", request.url);
    
    console.log(`[Cron] Calling report generation endpoint: ${generateUrl.toString()}`);
    
    const response = await fetch(generateUrl.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const contentType = response.headers.get("content-type") || "";
    const duration = Date.now() - startTime;

    if (!response.ok) {
      let errorData: any;
      if (contentType.includes("application/json")) {
        errorData = await response.json();
      } else {
        const text = await response.text();
        console.error(`[Cron] Non-JSON error response:`, text.substring(0, 500));
        errorData = { error: `HTTP ${response.status}`, message: text.substring(0, 200) };
      }
      console.error(`[Cron] Report generation failed (${response.status}):`, errorData);
      return NextResponse.json(
        { error: "Failed to generate reports", details: errorData },
        { status: response.status }
      );
    }

    // Parse JSON only if content-type is correct
    let data: any;
    if (contentType.includes("application/json")) {
      data = await response.json();
    } else {
      const text = await response.text();
      console.error(`[Cron] Expected JSON but got:`, contentType, text.substring(0, 500));
      return NextResponse.json(
        { error: "Invalid response format from report generation endpoint" },
        { status: 500 }
      );
    }

    console.log(`[Cron] ✅ Report generation completed successfully in ${duration}ms`);
    console.log(`[Cron] Results:`, JSON.stringify(data, null, 2));

    return NextResponse.json({
      success: true,
      message: "Reports generation triggered",
      results: data,
      timestamp,
      duration: `${duration}ms`,
    });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`[Cron] ❌ Error in cron job (${duration}ms):`, error);
    console.error(`[Cron] Error stack:`, error.stack);
    return NextResponse.json(
      { 
        error: error.message || "Cron job failed",
        timestamp,
        duration: `${duration}ms`,
      },
      { status: 500 }
    );
  }
}


import { NextRequest, NextResponse } from "next/server";
import { createShortLink } from "@/lib/firestore/short-links";

export const dynamic = 'force-dynamic';

/**
 * POST /api/short-links/create
 * Create a short link for a long URL
 * 
 * Body: { longUrl: string, reportId?: string }
 * Returns: { shortCode: string, shortUrl: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { longUrl, reportId } = body;

    if (!longUrl || typeof longUrl !== 'string') {
      return NextResponse.json(
        { error: "longUrl is required and must be a string" },
        { status: 400 }
      );
    }

    // Validate URL format
    try {
      new URL(longUrl);
    } catch {
      return NextResponse.json(
        { error: "Invalid URL format" },
        { status: 400 }
      );
    }

    // Create short link
    const shortCode = await createShortLink(longUrl, reportId);

    // Build the short URL using the app domain
    // Remove trailing slash from appUrl to avoid double slashes
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://copernigeo.com').replace(/\/$/, '');
    const shortUrl = `${appUrl}/s/${shortCode}`;

    return NextResponse.json({
      shortCode,
      shortUrl,
    });
  } catch (error: any) {
    console.error("[API] Error creating short link:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create short link" },
      { status: 500 }
    );
  }
}


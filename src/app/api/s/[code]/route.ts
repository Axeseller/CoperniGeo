import { NextRequest, NextResponse } from "next/server";
import { getShortLinkAndTrack } from "@/lib/firestore/short-links";

export const dynamic = 'force-dynamic';

/**
 * GET /api/s/[code]
 * Redirect short link to long URL
 * Tracks clicks automatically
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const code = params.code;

    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        { error: "Invalid short code" },
        { status: 400 }
      );
    }

    // Get the long URL and track the click
    const longUrl = await getShortLinkAndTrack(code);

    if (!longUrl) {
      // Return 404 page or redirect to homepage
      return NextResponse.redirect(
        new URL('/', request.url),
        { status: 302 }
      );
    }

    // Redirect to the long URL
    return NextResponse.redirect(longUrl, { status: 302 });
  } catch (error: any) {
    console.error("[API] Error redirecting short link:", error);
    // On error, redirect to homepage
    return NextResponse.redirect(
      new URL('/', request.url),
      { status: 302 }
    );
  }
}


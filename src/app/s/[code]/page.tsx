import { redirect } from "next/navigation";
import { getShortLinkAndTrack } from "@/lib/firestore/short-links";
import ShortLinkRedirect from "./ShortLinkRedirect";

export const dynamic = 'force-dynamic';

/**
 * Short link redirect page
 * Handles branded short URLs like https://copernigeo.com/s/abcde123
 */
export default async function ShortLinkPage({
  params,
}: {
  params: Promise<{ code: string }> | { code: string };
}) {
  try {
    // Handle both Promise and direct params (Next.js 14/15 compatibility)
    const resolvedParams = params instanceof Promise ? await params : params;
    const code = resolvedParams.code;

    console.log(`[Short Link Page] Processing code: ${code}`);

    if (!code || typeof code !== "string") {
      console.error(`[Short Link Page] Invalid code: ${code}`);
      redirect("/");
    }

    // Get the long URL and track the click
    console.log(`[Short Link Page] Looking up code: ${code}`);
    const longUrl = await getShortLinkAndTrack(code);

    if (!longUrl) {
      console.error(`[Short Link Page] Code not found in database: ${code}`);
      // Redirect to homepage if code not found
      redirect("/");
    }

    console.log(`[Short Link Page] ✅ Redirecting to: ${longUrl}`);
    // Use client component for external URL redirect
    return <ShortLinkRedirect url={longUrl} />;
  } catch (error: any) {
    console.error("[Short Link Page] ❌ Error redirecting:", error);
    console.error("[Short Link Page] Error stack:", error.stack);
    // On error, redirect to homepage
    redirect("/");
  }
}


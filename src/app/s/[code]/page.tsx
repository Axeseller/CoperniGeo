import { redirect } from "next/navigation";
import { getShortLinkAndTrack } from "@/lib/firestore/short-links";

/**
 * Short link redirect page
 * Handles branded short URLs like https://copernigeo.com/s/abcde123
 */
export default async function ShortLinkPage({
  params,
}: {
  params: { code: string };
}) {
  try {
    const code = params.code;

    if (!code || typeof code !== "string") {
      redirect("/");
    }

    // Get the long URL and track the click
    const longUrl = await getShortLinkAndTrack(code);

    if (!longUrl) {
      // Redirect to homepage if code not found
      redirect("/");
    }

    // Redirect to the long URL
    redirect(longUrl);
  } catch (error: any) {
    console.error("[Short Link] Error redirecting:", error);
    // On error, redirect to homepage
    redirect("/");
  }
}


"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

interface ShortLinkRedirectProps {
  url: string;
}

/**
 * Client component to handle external URL redirects
 * Next.js redirect() doesn't work well for external URLs, so we use client-side redirect
 */
export default function ShortLinkRedirect({ url }: ShortLinkRedirectProps) {
  const router = useRouter();

  useEffect(() => {
    // Check if URL is external (starts with http:// or https://)
    const isExternal = url.startsWith("http://") || url.startsWith("https://");
    
    if (isExternal) {
      // Use window.location for external URLs
      window.location.href = url;
    } else {
      // Use router for internal URLs
      router.push(url);
    }
  }, [url, router]);

  // Show loading state while redirecting
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f4f3f4]">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#5db815] mb-4"></div>
        <p className="text-[#242424]">Redirigiendo...</p>
      </div>
    </div>
  );
}


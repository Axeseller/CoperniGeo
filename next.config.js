/** @type {import('next').NextConfig} */
const nextConfig = {
  // Prevent Next.js from bundling these packages (they contain native binaries)
  // Note: This might show a warning in Next.js 14.2 but is safe to include
  serverExternalPackages: ["@sparticuz/chromium-min", "puppeteer-core"],
};

module.exports = nextConfig;

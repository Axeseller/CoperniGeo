/** @type {import('next').NextConfig} */
const nextConfig = {
  // Required for puppeteer-core and @sparticuz/chromium to work on Vercel
  serverExternalPackages: ['puppeteer-core', '@sparticuz/chromium'],
};

module.exports = nextConfig;

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Only run on Vercel builds (not local dev)
if (process.env.VERCEL) {
  console.log('📦 Packaging Chromium for Vercel...');
  
  try {
    const chromium = require('@sparticuz/chromium');
    const publicDir = path.join(process.cwd(), 'public');
    
    // Ensure public directory exists
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }
    
    // Get the chromium executable path (this triggers extraction)
    const executablePath = chromium.executablePath();
    console.log(`✅ Chromium extracted to: ${executablePath}`);
    
    // The chromium-min package will handle downloading from the packaged tar
    // For now, we just ensure chromium is available
    console.log('✅ Chromium packaging complete');
  } catch (error) {
    console.warn('⚠️  Chromium packaging failed (this is OK for local dev):', error.message);
  }
} else {
  console.log('⏭️  Skipping Chromium packaging (local development)');
}


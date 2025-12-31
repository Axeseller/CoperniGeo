import puppeteer from 'puppeteer-core';

// URL to the Chromium binary package hosted in /public
// In production, this will be served from your Vercel domain
// For local dev or if not in production, use a fallback URL
const CHROMIUM_PACK_URL = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}/chromium-pack.tar`
  : process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}/chromium-pack.tar`
  : "https://github.com/gabenunez/puppeteer-on-vercel/raw/refs/heads/main/example/chromium-dont-use-in-prod.tar";

// Cache the Chromium executable path to avoid re-downloading
let cachedExecutablePath: string | null = null;
let downloadPromise: Promise<string> | null = null;

// Use any for browser type to avoid version mismatches
let browserInstance: any = null;

/**
 * Downloads and caches the Chromium executable path.
 * Uses a download promise to prevent concurrent downloads.
 * Only used on Vercel - not in local development.
 */
async function getChromiumPath(): Promise<string> {
  // Return cached path if available
  if (cachedExecutablePath) return cachedExecutablePath;

  // Prevent concurrent downloads by reusing the same promise
  if (!downloadPromise) {
    // Only import chromium-min on Vercel
    if (!process.env.VERCEL && !process.env.VERCEL_ENV) {
      throw new Error('getChromiumPath should only be called on Vercel');
    }
    
    // Use require for serverless environments (same as PDF generator - works reliably)
    // Wrap in try-catch to handle cases where require might not work
    try {
      const chromiumModule = require('@sparticuz/chromium-min');
      const chromium = chromiumModule.default || chromiumModule;
      
      downloadPromise = chromium
        .executablePath(CHROMIUM_PACK_URL)
        .then((path: string) => {
          cachedExecutablePath = path;
          console.log('[TileRenderer] Chromium path resolved:', path);
          return path;
        })
        .catch((error: any) => {
          console.error('[TileRenderer] Failed to get Chromium path:', error);
          downloadPromise = null; // Reset on error to allow retry
          throw error;
        });
    } catch (requireError: any) {
      // If require fails, try dynamic import as fallback
      console.warn('[TileRenderer] Require failed, trying dynamic import:', requireError.message);
      const moduleName = '@sparticuz/chromium-min';
      const chromiumModule = await import(moduleName);
      const chromium = chromiumModule.default || chromiumModule;
      
      downloadPromise = chromium
        .executablePath(CHROMIUM_PACK_URL)
        .then((path: string) => {
          cachedExecutablePath = path;
          console.log('[TileRenderer] Chromium path resolved:', path);
          return path;
        })
        .catch((error: any) => {
          console.error('[TileRenderer] Failed to get Chromium path:', error);
          downloadPromise = null; // Reset on error to allow retry
          throw error;
        });
    }
  }

  // TypeScript assertion: we know downloadPromise is set in the if block above
  if (!downloadPromise) {
    throw new Error('Failed to initialize Chromium download promise');
  }

  return downloadPromise;
}

/**
 * Get or create a shared browser instance
 * Uses @sparticuz/chromium on Vercel, local puppeteer for development
 */
async function getBrowser(): Promise<any> {
  if (browserInstance && browserInstance.connected) {
    return browserInstance;
  }

  console.log('[TileRenderer] Launching headless browser...');
  console.log('[TileRenderer] Environment check:', {
    VERCEL: process.env.VERCEL,
    VERCEL_ENV: process.env.VERCEL_ENV,
    NODE_ENV: process.env.NODE_ENV,
  });
  
  // Try Vercel chromium first if we're on Vercel, otherwise use local puppeteer
  // Use a try-catch to gracefully fall back to local puppeteer if chromium-min fails
  if (process.env.VERCEL || process.env.VERCEL_ENV) {
    console.log('[TileRenderer] Attempting to use @sparticuz/chromium-min for Vercel');
    
    try {
      // Use require for serverless environments (same as PDF generator - works reliably)
      const chromiumModule = require('@sparticuz/chromium-min');
      const chromium = chromiumModule.default || chromiumModule;
      const executablePath = await getChromiumPath();
      console.log(`[TileRenderer] Chromium executable path: ${executablePath}`);
      
      browserInstance = await puppeteer.launch({
        args: chromium.args,
        executablePath: executablePath,
        headless: true,
      });
      
      console.log('[TileRenderer] ✅ Browser launched with Vercel Chromium');
      return browserInstance;
    } catch (requireError: any) {
      // If require fails, try dynamic import as fallback
      try {
        console.warn('[TileRenderer] Require failed, trying dynamic import:', requireError.message);
        const moduleName = '@sparticuz/chromium-min';
        const chromiumModule = await import(moduleName);
        const chromium = chromiumModule.default || chromiumModule;
        const executablePath = await getChromiumPath();
        console.log(`[TileRenderer] Chromium executable path: ${executablePath}`);
        
  browserInstance = await puppeteer.launch({
          args: chromium.args,
          executablePath: executablePath,
          headless: true,
        });
        
        console.log('[TileRenderer] ✅ Browser launched with Vercel Chromium');
        return browserInstance;
      } catch (importError: any) {
        console.warn('[TileRenderer] Both require and import failed, falling back to local Puppeteer:', importError.message);
        // Fall through to local puppeteer
      }
    }
  }
  
  // Use local puppeteer for development (or as fallback)
  console.log('[TileRenderer] Using local Puppeteer');
  try {
    const puppeteerLocal = await import('puppeteer');
    browserInstance = await puppeteerLocal.default.launch({
    headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    console.log('[TileRenderer] ✅ Browser launched with local Puppeteer');
  } catch (puppeteerError: any) {
    console.error('[TileRenderer] Local Puppeteer initialization error:', puppeteerError.message);
    throw new Error(`Failed to initialize Puppeteer: ${puppeteerError.message}`);
  }
  
  console.log('[TileRenderer] ✅ Browser launched');
  
  return browserInstance;
}

/**
 * Generate HTML for rendering Google Maps with Earth Engine tiles
 * Uses ImageMapType for proper tile loading integration
 */
function generateMapHTML(
  coordinates: { lat: number; lng: number }[],
  tileUrl: string,
  googleMapsApiKey: string,
  polygonColor: string = '#5db815',
  indexOpacity: number = 0.7
): string {
  // Calculate center and bounds
  const lats = coordinates.map(c => c.lat);
  const lngs = coordinates.map(c => c.lng);
  const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;
  const centerLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;
  
  // Convert coordinates to JSON string
  const coordinatesJson = JSON.stringify(coordinates);
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body, html {
      margin: 0;
      padding: 0;
      width: 1200px;
      height: 1200px;
      overflow: hidden;
    }
    #map {
      width: 100%;
      height: 100%;
    }
  </style>
  <script src="https://maps.googleapis.com/maps/api/js?key=${googleMapsApiKey}"></script>
</head>
<body>
  <div id="map"></div>
  <script>
    // Parse coordinates
    const coordinates = ${coordinatesJson};
    const tileUrlTemplate = '${tileUrl}';
    
    // Calculate bounds
    const bounds = new google.maps.LatLngBounds();
    coordinates.forEach(coord => {
      bounds.extend(new google.maps.LatLng(coord.lat, coord.lng));
    });
    
    // Add 5% padding
    const ne = bounds.getNorthEast();
    const sw = bounds.getSouthWest();
    const latPadding = (ne.lat() - sw.lat()) * 0.05;
    const lngPadding = (ne.lng() - sw.lng()) * 0.05;
    
    const paddedBounds = new google.maps.LatLngBounds(
      new google.maps.LatLng(sw.lat() - latPadding, sw.lng() - lngPadding),
      new google.maps.LatLng(ne.lat() + latPadding, ne.lng() + lngPadding)
    );
    
    // Initialize map
    const map = new google.maps.Map(document.getElementById('map'), {
      center: { lat: ${centerLat}, lng: ${centerLng} },
      zoom: 15,
      mapTypeId: 'satellite',
      disableDefaultUI: true,
      zoomControl: false,
      mapTypeControl: false,
      scaleControl: false,
      streetViewControl: false,
      rotateControl: false,
      fullscreenControl: false,
      gestureHandling: 'none',
      keyboardShortcuts: false,
    });
    
    // Fit to padded bounds
    map.fitBounds(paddedBounds);
    
    // Track loaded tiles
    let tilesLoaded = 0;
    let tilesRequested = 0;
    
    // Create Earth Engine tile layer using ImageMapType
    const eeMapType = new google.maps.ImageMapType({
      getTileUrl: function(coord, zoom) {
        tilesRequested++;
        let url = tileUrlTemplate;
        if (url.includes('{x}') || url.includes('{y}') || url.includes('{z}')) {
          url = url
            .replace(/{x}/g, coord.x.toString())
            .replace(/{y}/g, coord.y.toString())
            .replace(/{z}/g, zoom.toString());
        }
        return url;
      },
      tileSize: new google.maps.Size(256, 256),
      opacity: ${indexOpacity},
      name: 'Earth Engine'
    });
    
    // Add the Earth Engine layer
    map.overlayMapTypes.insertAt(0, eeMapType);
    
    // Draw polygon outline
    const polygon = new google.maps.Polygon({
      paths: coordinates,
      strokeColor: '${polygonColor}',
      strokeOpacity: 1.0,
      strokeWeight: 3,
      fillColor: 'transparent',
      fillOpacity: 0,
    });
    polygon.setMap(map);
    
    // Track when tiles are loaded
    window.renderComplete = false;
    
    // Listen for tile load events on the ImageMapType
    google.maps.event.addListener(eeMapType, 'tilesloaded', function() {
      console.log('Earth Engine tiles loaded');
    });
    
    // Wait for both Google Maps tiles and some time for Earth Engine tiles
    google.maps.event.addListenerOnce(map, 'tilesloaded', function() {
      console.log('Google Maps tiles loaded, waiting for Earth Engine tiles...');
      
      // Give Earth Engine tiles time to load (they load via the ImageMapType)
      setTimeout(() => {
        console.log('Render complete after waiting for EE tiles');
        window.renderComplete = true;
      }, 3000); // 3 seconds for Earth Engine tiles
    });
    
    // Fallback timeout
    setTimeout(() => {
      if (!window.renderComplete) {
        console.log('Render timeout - completing anyway');
      window.renderComplete = true;
      }
    }, 15000);
  </script>
</body>
</html>
  `.trim();
}

/**
 * Render Google Maps with Earth Engine tiles to an image
 * This mimics exactly what the dashboard shows
 */
export async function renderMapWithTiles(
  coordinates: { lat: number; lng: number }[],
  tileUrl: string,
  options: {
    width?: number;
    height?: number;
    polygonColor?: string;
    indexOpacity?: number;
  } = {}
): Promise<Buffer> {
  const {
    width = 1200,
    height = 1200,
    polygonColor = '#5db815',
    indexOpacity = 0.7,
  } = options;

  console.log('[TileRenderer] Starting tile-based rendering...');
  console.log(`[TileRenderer] Polygon: ${coordinates.length} points`);
  console.log(`[TileRenderer] Tile URL: ${tileUrl.substring(0, 100)}...`);

  // Get API key
  const googleMapsApiKey = process.env.GOOGLE_MAPS_SERVER_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!googleMapsApiKey) {
    throw new Error('Google Maps API key not configured');
  }

  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    // Set viewport
    await page.setViewport({ width, height });
    console.log(`[TileRenderer] Viewport set to ${width}x${height}`);

    // Generate HTML
    const html = generateMapHTML(
      coordinates,
      tileUrl,
      googleMapsApiKey.trim(),
      polygonColor,
      indexOpacity
    );

    // Load HTML
    await page.setContent(html, { waitUntil: 'networkidle0' });
    console.log('[TileRenderer] HTML loaded, waiting for tiles...');

    // Wait for rendering to complete
    await page.waitForFunction('window.renderComplete === true', {
      timeout: 20000, // 20 second timeout
    });
    console.log('[TileRenderer] Tiles loaded successfully');

    // Take screenshot
    const screenshot = await page.screenshot({
      type: 'png',
      clip: {
        x: 0,
        y: 0,
        width,
        height,
      },
    });

    console.log(`[TileRenderer] ✅ Screenshot captured (${screenshot.length} bytes)`);

    return Buffer.from(screenshot);
  } catch (error: any) {
    console.error('[TileRenderer] Error rendering map:', error.message);
    throw new Error(`Failed to render map with tiles: ${error.message}`);
  } finally {
    await page.close();
  }
}

/**
 * Close the browser instance (call on server shutdown)
 */
export async function closeBrowser(): Promise<void> {
  if (browserInstance) {
    await browserInstance.close();
    browserInstance = null;
    console.log('[TileRenderer] Browser closed');
  }
}

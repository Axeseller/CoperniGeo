import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium-min';

// Use any for browser type to avoid version mismatches
let browserInstance: any = null;

/**
 * Get or create a shared browser instance
 * Uses @sparticuz/chromium on Vercel, local puppeteer for development
 */
async function getBrowser(): Promise<any> {
  if (browserInstance && browserInstance.connected) {
    return browserInstance;
  }

  console.log('[TileRenderer] Launching headless browser...');
  
  // Use @sparticuz/chromium-min on Vercel (recommended by Vercel docs)
  if (process.env.VERCEL) {
    console.log('[TileRenderer] Using @sparticuz/chromium-min for Vercel');
    
    try {
      // Force chromium-min to extract to /tmp (Vercel allows /tmp)
      // This prevents it from trying to extract to non-existent relative paths
      if (!process.env.CHROMIUM_PATH) {
        process.env.CHROMIUM_PATH = '/tmp';
      }
      if (!process.env.TMPDIR) {
        process.env.TMPDIR = '/tmp';
      }
      if (!process.env.TMP) {
        process.env.TMP = '/tmp';
      }
      
      // @sparticuz/chromium-min will extract to /tmp automatically
      const executablePath = await chromium.executablePath();
      console.log(`[TileRenderer] Chromium executable path: ${executablePath}`);
      
      browserInstance = await puppeteer.launch({
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--disable-software-rasterizer',
          '--disable-extensions',
          '--single-process', // Required for Vercel serverless
        ],
        defaultViewport: { width: 1920, height: 1080 },
        executablePath: executablePath,
        headless: true,
      });
    } catch (chromiumError: any) {
      console.error('[TileRenderer] Chromium initialization error:', chromiumError.message);
      console.error('[TileRenderer] Error details:', {
        message: chromiumError.message,
        code: chromiumError.code,
        path: chromiumError.path,
        stack: chromiumError.stack?.substring(0, 500),
      });
      throw new Error(`Failed to initialize Chromium on Vercel: ${chromiumError.message}`);
    }
  } else {
    // Use local puppeteer for development
    console.log('[TileRenderer] Using local Puppeteer for development');
    const puppeteerLocal = await import('puppeteer');
    browserInstance = await puppeteerLocal.default.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
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

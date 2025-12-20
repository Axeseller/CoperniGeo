import puppeteerCore from 'puppeteer-core';
import type { Browser } from 'puppeteer-core';

let browserInstance: Browser | null = null;

/**
 * Get or create a shared browser instance
 * Reusing the browser significantly improves performance
 * Uses @sparticuz/chromium for serverless environments (Vercel)
 */
async function getBrowser(): Promise<Browser> {
  if (browserInstance && browserInstance.connected) {
    return browserInstance;
  }

  console.log('[TileRenderer] Launching headless browser...');
  
  // Check if we're in a serverless environment (Vercel)
  const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME;
  
  if (isServerless) {
    // Use @sparticuz/chromium for serverless environments
    console.log('[TileRenderer] Using @sparticuz/chromium for serverless environment');
    
    // Dynamic import to avoid bundling issues
    const chromiumModule = await import('@sparticuz/chromium');
    const chromium = chromiumModule.default || chromiumModule;
    
    browserInstance = await puppeteerCore.launch({
      args: [...chromium.args, '--hide-scrollbars', '--disable-web-security'],
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });
  } else {
    // Use local Puppeteer for development
    console.log('[TileRenderer] Using local Puppeteer');
    const puppeteer = await import('puppeteer');
    browserInstance = await puppeteer.default.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    });
  }
  
  console.log('[TileRenderer] ✅ Browser launched');
  
  return browserInstance;
}

/**
 * Generate HTML for rendering Google Maps with Earth Engine tiles
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
    
    // Add Earth Engine tile overlay (SAME as dashboard!)
    const overlay = new google.maps.ImageMapType({
      getTileUrl: function(coord, zoom) {
        if (coord.x < 0 || coord.y < 0) return null;
        const maxCoord = Math.pow(2, zoom);
        if (coord.x >= maxCoord || coord.y >= maxCoord) return null;
        
        let url = '${tileUrl}';
        if (url.includes('{x}') || url.includes('{y}') || url.includes('{z}')) {
          url = url
            .replace(/{x}/g, coord.x.toString())
            .replace(/{y}/g, coord.y.toString())
            .replace(/{z}/g, zoom.toString());
        } else {
          url = url + '&x=' + coord.x + '&y=' + coord.y + '&z=' + zoom;
        }
        return url;
      },
      tileSize: new google.maps.Size(256, 256),
      opacity: ${indexOpacity},
      name: 'Earth Engine Overlay',
    });
    
    map.overlayMapTypes.push(overlay);
    
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
    
    // Signal that rendering is complete
    window.renderComplete = false;
    
    // Wait for tiles to load
    google.maps.event.addListenerOnce(map, 'tilesloaded', function() {
      // Wait an additional second for Earth Engine tiles
      setTimeout(() => {
        window.renderComplete = true;
        console.log('Map rendering complete');
      }, 2000);
    });
    
    // Fallback timeout
    setTimeout(() => {
      window.renderComplete = true;
      console.log('Map rendering timeout');
    }, 10000);
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
      timeout: 15000,
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


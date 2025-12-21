import puppeteerCore from 'puppeteer-core';

// Use any for browser type to avoid version mismatches between puppeteer-core and puppeteer
let browserInstance: any = null;

/**
 * Get or create a shared browser instance
 * Reusing the browser significantly improves performance
 * Uses @sparticuz/chromium for serverless environments (Vercel)
 */
async function getBrowser(): Promise<any> {
  if (browserInstance && browserInstance.connected) {
    return browserInstance;
  }

  console.log('[TileRenderer] Launching headless browser...');
  
  // Check if we're in a serverless environment (Vercel)
  const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME;
  
  if (isServerless) {
    // Use @sparticuz/chromium for serverless environments
    console.log('[TileRenderer] Using @sparticuz/chromium for serverless environment');
    
    try {
      // Dynamic import to avoid bundling issues
      const chromiumModule = await import('@sparticuz/chromium');
      const chromium = chromiumModule.default || chromiumModule;
      
      const executablePath = await chromium.executablePath();
      console.log(`[TileRenderer] Chromium executable path: ${executablePath}`);
      
      browserInstance = await puppeteerCore.launch({
        args: [...chromium.args, '--hide-scrollbars', '--disable-web-security'],
        defaultViewport: chromium.defaultViewport,
        executablePath,
        headless: chromium.headless,
      });
    } catch (chromiumError: any) {
      console.error('[TileRenderer] Failed to load @sparticuz/chromium:', chromiumError.message);
      throw new Error(`Failed to initialize Chromium for serverless: ${chromiumError.message}`);
    }
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
    
    // Custom overlay that clips Earth Engine tiles to the polygon
    class ClippedTileOverlay extends google.maps.OverlayView {
      constructor(tileUrl, polygon, opacity) {
        super();
        this.tileUrl = tileUrl;
        this.polygon = polygon;
        this.opacity = opacity;
        this.tiles = new Map();
        this.canvas = null;
      }
      
      onAdd() {
        this.canvas = document.createElement('canvas');
        this.canvas.style.position = 'absolute';
        this.canvas.style.pointerEvents = 'none';
        const panes = this.getPanes();
        panes.overlayLayer.appendChild(this.canvas);
      }
      
      draw() {
        const projection = this.getProjection();
        if (!projection) return;
        
        const mapDiv = this.getMap().getDiv();
        const width = mapDiv.offsetWidth;
        const height = mapDiv.offsetHeight;
        
        this.canvas.width = width;
        this.canvas.height = height;
        this.canvas.style.left = '0px';
        this.canvas.style.top = '0px';
        this.canvas.style.width = width + 'px';
        this.canvas.style.height = height + 'px';
        
        const ctx = this.canvas.getContext('2d');
        ctx.clearRect(0, 0, width, height);
        
        // Convert polygon coordinates to pixel coordinates
        const pixelCoords = this.polygon.map(coord => {
          const latLng = new google.maps.LatLng(coord.lat, coord.lng);
          const pixel = projection.fromLatLngToDivPixel(latLng);
          return pixel;
        });
        
        // Create clipping path from polygon
        ctx.save();
        ctx.beginPath();
        pixelCoords.forEach((pixel, i) => {
          if (i === 0) {
            ctx.moveTo(pixel.x, pixel.y);
          } else {
            ctx.lineTo(pixel.x, pixel.y);
          }
        });
        ctx.closePath();
        ctx.clip();
        
        // Draw loaded tiles within the clipping region
        const zoom = this.getMap().getZoom();
        const tileSize = 256;
        
        // Calculate which tiles we need
        const mapBounds = this.getMap().getBounds();
        if (!mapBounds) return;
        
        const neTile = this.latLngToTile(mapBounds.getNorthEast(), zoom);
        const swTile = this.latLngToTile(mapBounds.getSouthWest(), zoom);
        
        // Load and draw tiles
        for (let x = swTile.x; x <= neTile.x; x++) {
          for (let y = neTile.y; y <= swTile.y; y++) {
            const tileKey = zoom + '/' + x + '/' + y;
            let img = this.tiles.get(tileKey);
            
            if (!img) {
              img = new Image();
              img.crossOrigin = 'anonymous';
              let url = this.tileUrl;
              if (url.includes('{x}') || url.includes('{y}') || url.includes('{z}')) {
                url = url
                  .replace(/{x}/g, x.toString())
                  .replace(/{y}/g, y.toString())
                  .replace(/{z}/g, zoom.toString());
              }
              img.src = url;
              img.onload = () => this.draw();
              this.tiles.set(tileKey, img);
            }
            
            if (img.complete && img.naturalWidth > 0) {
              // Calculate tile position in pixels
              const tileLatLng = this.tileToLatLng(x, y, zoom);
              const tilePixel = projection.fromLatLngToDivPixel(tileLatLng);
              
              const nextTileLatLng = this.tileToLatLng(x + 1, y + 1, zoom);
              const nextTilePixel = projection.fromLatLngToDivPixel(nextTileLatLng);
              
              const tileWidth = nextTilePixel.x - tilePixel.x;
              const tileHeight = nextTilePixel.y - tilePixel.y;
              
              ctx.globalAlpha = this.opacity;
              ctx.drawImage(img, tilePixel.x, tilePixel.y, tileWidth, tileHeight);
            }
          }
        }
        
        ctx.restore();
        
        // Draw polygon outline on top
        ctx.strokeStyle = '${polygonColor}';
        ctx.lineWidth = 3;
        ctx.beginPath();
        pixelCoords.forEach((pixel, i) => {
          if (i === 0) {
            ctx.moveTo(pixel.x, pixel.y);
          } else {
            ctx.lineTo(pixel.x, pixel.y);
          }
        });
        ctx.closePath();
        ctx.stroke();
      }
      
      latLngToTile(latLng, zoom) {
        const lat = latLng.lat();
        const lng = latLng.lng();
        const x = Math.floor((lng + 180) / 360 * Math.pow(2, zoom));
        const y = Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom));
        return { x, y };
      }
      
      tileToLatLng(x, y, zoom) {
        const n = Math.PI - 2 * Math.PI * y / Math.pow(2, zoom);
        const lat = 180 / Math.PI * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
        const lng = x / Math.pow(2, zoom) * 360 - 180;
        return new google.maps.LatLng(lat, lng);
      }
      
      onRemove() {
        if (this.canvas && this.canvas.parentNode) {
          this.canvas.parentNode.removeChild(this.canvas);
        }
      }
    }
    
    // Create and add the clipped overlay
    const clippedOverlay = new ClippedTileOverlay(
      '${tileUrl}',
      coordinates,
      ${indexOpacity}
    );
    clippedOverlay.setMap(map);
    
    // Redraw on map changes
    map.addListener('bounds_changed', () => clippedOverlay.draw());
    map.addListener('zoom_changed', () => clippedOverlay.draw());
    
    // Draw polygon outline (backup, in case overlay doesn't draw it)
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


# Automated Reports Image Generation Workflow

This document explains how images are generated for automated reports in CoperniGeo, including the headless browser approach on Vercel and the fallback composite method.

## Table of Contents

1. [Overview](#overview)
2. [Workflow Architecture](#workflow-architecture)
3. [Earth Engine Data Preparation](#earth-engine-data-preparation)
4. [Image Generation: Two-Stage Approach](#image-generation-two-stage-approach)
5. [Headless Browser on Vercel](#headless-browser-on-vercel)
6. [Composite Fallback Method](#composite-fallback-method)
7. [Code Structure](#code-structure)
8. [Key Components](#key-components)
9. [Environment Setup](#environment-setup)

## Overview

Automated reports generate high-quality satellite imagery showing crop health indices (NDVI, NDRE, EVI) overlaid on Google Maps satellite imagery. The system uses a **two-stage approach**:

1. **Primary Method**: Headless browser rendering (Google Maps + Earth Engine tiles)
2. **Fallback Method**: Earth Engine composite (base satellite + index overlay)

The headless browser approach provides the best visual quality by rendering Google Maps satellite imagery with Earth Engine tiles overlaid, exactly matching what users see in the dashboard.

## Workflow Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  API Route: /api/reports/[id]/send                         │
│  or /api/reports/generate                                   │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  1. Earth Engine Initialization                             │
│     - Authenticate with service account                     │
│     - Initialize Earth Engine                              │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  2. Process Each Area & Index                               │
│     - Get Sentinel-2 image collection                      │
│     - Calculate index (NDVI, NDRE, EVI)                     │
│     - Compute statistics (min, max, mean)                   │
│     - Generate tile URL for Earth Engine                    │
│     - Generate base satellite thumbnail (RGB)               │
│     - Generate index overlay thumbnail                      │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  3. Generate Email HTML (generateReportEmail)               │
│     For each image:                                         │
│     ┌──────────────────────────────────────┐               │
│     │ 3a. Try Headless Browser             │               │
│     │     (renderMapWithTiles)              │               │
│     └──────────────┬───────────────────────┘               │
│                    │                                         │
│                    ▼                                         │
│     ┌──────────────────────────────────────┐               │
│     │ 3b. If fails → Composite Fallback    │               │
│     │     (compositeIndexOverlay)           │               │
│     └──────────────┬───────────────────────┘               │
│                    │                                         │
│                    ▼                                         │
│     ┌──────────────────────────────────────┐               │
│     │ 3c. Upload to Firebase Storage       │               │
│     │     Embed in email HTML              │               │
│     └──────────────────────────────────────┘               │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  4. Generate PDF                                            │
│     - Use image buffers from email generation               │
│     - Convert to base64 for PDF embedding                   │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  5. Send Email                                              │
│     - HTML with embedded images                             │
│     - PDF attachment                                        │
└─────────────────────────────────────────────────────────────┘
```

## Earth Engine Data Preparation

### Step 1: Get Sentinel-2 Image

```typescript
// Filter Sentinel-2 collection by cloud coverage and area
const collection = getSentinel2Collection(cloudCoverage)
  .filterBounds(polygon);

// Get most recent image
const image = getMostRecentImage(collection);
```

### Step 2: Calculate Index

```typescript
// Clip image to bounding box for cost optimization
const bbox = polygon.bounds();
const bufferedBbox = bbox.buffer(1000); // 1km buffer
const clippedImage = image.clip(bufferedBbox);

// Calculate index (NDVI, NDRE, or EVI)
const indexImage = calculateIndex(clippedImage, indexType);

// Clip to exact polygon for display
const clipped = indexImage.clip(polygon);
```

### Step 3: Compute Statistics

```typescript
const stats = clipped.reduceRegion({
  reducer: ee.Reducer.minMax().combine({
    reducer2: ee.Reducer.mean(),
    sharedInputs: true,
  }),
  geometry: polygon,
  scale: 100, // 100m resolution for stats
  maxPixels: 1e9,
  bestEffort: true,
});
```

### Step 4: Generate URLs

Three types of URLs are generated:

1. **Tile URL** (for headless browser):
   ```typescript
   const mapId = await new Promise((resolve, reject) => {
     clipped.getMapId({
       min: statsValue[`${indexType}_min`],
       max: statsValue[`${indexType}_max`],
       palette: ["red", "yellow", "green"],
     }, (result, error) => {
       if (error) reject(error);
       else resolve(result);
     });
   });
   const tileUrl = mapId?.urlFormat;
   ```

2. **Base Satellite Thumbnail** (RGB, for composite fallback):
   ```typescript
   const baseSatelliteUrl = await new Promise((resolve, reject) => {
     image.getThumbURL({
       dimensions: 1200,
       format: 'png',
       region: paddedBounds,
       bands: ['B4', 'B3', 'B2'], // RGB bands
       min: [0, 0, 0],
       max: [3000, 3000, 3000],
     }, (url, error) => {
       if (error) reject(error);
       else resolve(url);
     });
   });
   ```

3. **Index Overlay Thumbnail** (for composite fallback):
   ```typescript
   const thumbnailUrl = await new Promise((resolve, reject) => {
     clipped.getThumbURL({
       dimensions: 1200,
       format: 'png',
       region: paddedBounds,
       min: statsValue[`${indexType}_min`],
       max: statsValue[`${indexType}_max`],
       palette: ["red", "yellow", "green"],
     }, (url, error) => {
       if (error) reject(error);
       else resolve(url);
     });
   });
   ```

## Image Generation: Two-Stage Approach

### Stage 1: Headless Browser (Primary Method)

**File**: `src/lib/images/tileRenderer.ts`

The headless browser approach renders Google Maps satellite imagery with Earth Engine tiles overlaid, providing the best visual quality and matching the dashboard view.

**Process**:
1. Launch headless browser (Chromium on Vercel, Puppeteer locally)
2. Load HTML page with Google Maps JavaScript API
3. Add Earth Engine tiles as custom map layer
4. Draw polygon outline
5. Take screenshot
6. Return image buffer

**Advantages**:
- Perfect alignment (both rendered on same map)
- Google Maps satellite imagery (high quality)
- Matches dashboard exactly
- No image compositing needed

**When Used**:
- When `@sparticuz/chromium-min` is available on Vercel
- When browser can be launched successfully

### Stage 2: Composite Fallback (Secondary Method)

**File**: `src/lib/images/compositeImage.ts`

If the headless browser fails, the system falls back to compositing Earth Engine images.

**Process**:
1. Download base satellite image (RGB) from Earth Engine
2. Download index overlay from Earth Engine
3. Apply opacity to overlay (0.7)
4. Mask overlay to only show inside polygon
5. Composite: base + masked overlay + polygon outline
6. Return image buffer

**Advantages**:
- No browser required
- Works even if Chromium unavailable
- Still produces good quality images

**When Used**:
- When headless browser fails
- When Chromium cannot be initialized
- As a reliable fallback

## Headless Browser on Vercel

### Chromium Setup

Vercel's serverless environment requires special handling for Chromium:

1. **Package**: `@sparticuz/chromium-min` (lightweight Chromium for serverless)
2. **Postinstall Script**: Creates tar archive of Chromium binary
   - File: `scripts/postinstall.mjs`
   - Output: `public/chromium-pack.tar`
3. **Runtime Download**: Chromium is downloaded and extracted at runtime

### Chromium Path Resolution

**File**: `src/lib/images/tileRenderer.ts` → `getChromiumPath()`

```typescript
async function getChromiumPath(): Promise<string> {
  // Try require() first (more reliable in serverless)
  try {
    const chromiumModule = require('@sparticuz/chromium-min');
    const chromium = chromiumModule.default || chromiumModule;
    
    // Download and extract Chromium from tar archive
    const executablePath = await chromium.executablePath(CHROMIUM_PACK_URL);
    return executablePath;
  } catch (requireError) {
    // Fallback to dynamic import
    const chromiumModule = await import('@sparticuz/chromium-min');
    // ... same process
  }
}
```

**CHROMIUM_PACK_URL**:
- Production: `https://${VERCEL_PROJECT_PRODUCTION_URL}/chromium-pack.tar`
- Preview: `https://${VERCEL_URL}/chromium-pack.tar`
- Fallback: GitHub URL (for development)

### Browser Launch

**File**: `src/lib/images/tileRenderer.ts` → `getBrowser()`

```typescript
async function getBrowser(): Promise<any> {
  if (process.env.VERCEL || process.env.VERCEL_ENV) {
    // Use Vercel Chromium
    const chromium = require('@sparticuz/chromium-min');
    const executablePath = await getChromiumPath();
    
    browserInstance = await puppeteer.launch({
      args: chromium.args,
      executablePath: executablePath,
      headless: true,
    });
  } else {
    // Use local Puppeteer for development
    const puppeteerLocal = await import('puppeteer');
    browserInstance = await puppeteerLocal.default.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
  }
  
  return browserInstance;
}
```

### Map Rendering

**File**: `src/lib/images/tileRenderer.ts` → `renderMapWithTiles()`

The function generates HTML that:
1. Loads Google Maps JavaScript API
2. Creates a map centered on the polygon
3. Adds Earth Engine tiles as a custom `ImageMapType`
4. Draws polygon outline
5. Takes a screenshot

**Key HTML Structure**:
```html
<!DOCTYPE html>
<html>
<head>
  <script src="https://maps.googleapis.com/maps/api/js?key=API_KEY"></script>
</head>
<body>
  <div id="map" style="width: 1200px; height: 1200px;"></div>
  <script>
    // Initialize map
    const map = new google.maps.Map(document.getElementById('map'), {
      center: { lat: centerLat, lng: centerLng },
      zoom: zoomLevel,
      mapTypeId: 'satellite',
    });
    
    // Add Earth Engine tiles
    const eeLayer = new google.maps.ImageMapType({
      getTileUrl: (coord, zoom) => {
        return tileUrl.replace('{x}', coord.x)
                      .replace('{y}', coord.y)
                      .replace('{z}', zoom);
      },
      tileSize: new google.maps.Size(256, 256),
      opacity: 0.7,
    });
    map.overlayMapTypes.push(eeLayer);
    
    // Draw polygon
    const polygon = new google.maps.Polygon({
      paths: coordinates,
      strokeColor: '#5db815',
      strokeWeight: 4,
      fillColor: '#5db815',
      fillOpacity: 0.0,
    });
    polygon.setMap(map);
  </script>
</body>
</html>
```

## Composite Fallback Method

**File**: `src/lib/images/compositeImage.ts` → `compositeIndexOverlay()`

### Process

1. **Download Images**:
   - Base satellite image (RGB) from `baseSatelliteUrl`
   - Index overlay from `thumbnailUrl`

2. **Resize Overlay**:
   - Ensure overlay matches base image dimensions
   - Both should be 1200x1200 (or same aspect ratio)

3. **Apply Opacity**:
   - Modify alpha channel: `alpha = alpha * opacity` (default 0.7)
   - Makes overlay semi-transparent

4. **Generate Polygon Mask**:
   - Create SVG mask showing polygon area
   - Convert to PNG buffer
   - Extract as grayscale mask (white = inside, black = outside)

5. **Mask Overlay**:
   - Only show overlay inside polygon
   - Multiply overlay alpha by mask value
   - Pixels outside polygon become transparent

6. **Generate Polygon Outline**:
   - Create SVG with polygon path
   - Stroke color: `#5db815` (green)
   - Stroke width scales with image size

7. **Composite Final Image**:
   ```
   Final Image = Base Image + Masked Overlay + Polygon Outline
   ```
   - Uses Sharp library for compositing
   - All layers blended with 'over' mode

### Critical Alignment

Both base and overlay images **must** use the same:
- Bounding box (with 5% padding)
- Dimensions (1200px)
- Coordinate system (EPSG:4326)

This ensures perfect pixel alignment when compositing.

## Code Structure

### Main API Routes

1. **`src/app/api/reports/[id]/send/route.ts`**
   - Generates and sends report immediately
   - Processes all areas and indices
   - Calls `generateReportEmail()` for HTML generation

2. **`src/app/api/reports/generate/route.ts`**
   - Cron job endpoint for scheduled reports
   - Gets all due reports
   - Same processing as send route

### Image Generation Functions

1. **`src/lib/images/tileRenderer.ts`**
   - `renderMapWithTiles()`: Headless browser rendering
   - `getBrowser()`: Browser instance management
   - `getChromiumPath()`: Chromium path resolution

2. **`src/lib/images/compositeImage.ts`**
   - `compositeIndexOverlay()`: Composite image generation
   - `calculateBoundingBox()`: Bounding box calculation
   - `generatePolygonSVG()`: Polygon outline generation
   - `generatePolygonMaskBuffer()`: Mask generation

### Email Generation

**`src/app/api/reports/[id]/send/route.ts`** → `generateReportEmail()`

This function:
1. Iterates through each image data item
2. Tries headless browser first
3. Falls back to composite if browser fails
4. Uploads final image to Firebase Storage
5. Embeds image URL in email HTML
6. Stores image buffer for PDF generation

## Key Components

### 1. Earth Engine Integration

**Files**:
- `src/lib/earthEngine.ts`: Initialization and authentication
- `src/lib/indices/calculations.ts`: Index calculations

**Key Functions**:
- `initializeEarthEngine()`: Authenticate and initialize
- `getSentinel2Collection()`: Get filtered image collection
- `getMostRecentImage()`: Get latest image
- `calculateIndex()`: Calculate NDVI, NDRE, or EVI

### 2. Image Processing

**Libraries**:
- `sharp`: Image manipulation and compositing
- `puppeteer-core`: Headless browser control
- `@sparticuz/chromium-min`: Chromium for Vercel

### 3. Storage

**File**: `src/lib/storage/admin-upload.ts`

- `uploadImageWithDedup()`: Upload images to Firebase Storage
- Handles deduplication (deletes old images)
- Returns public URL for email embedding

### 4. Email Generation

**File**: `src/lib/email/resend.ts`

- `sendEmail()`: Send email via Resend API
- Supports HTML content and attachments
- Handles inline images and PDF attachments

## Environment Setup

### Required Environment Variables

```bash
# Google Earth Engine
GOOGLE_EARTH_ENGINE_PRIVATE_KEY=...
GOOGLE_EARTH_ENGINE_CLIENT_EMAIL=...
GOOGLE_EARTH_ENGINE_PROJECT_ID=...

# Google Maps (for headless browser)
GOOGLE_MAPS_SERVER_API_KEY=...
# or
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=...

# Resend (for emails)
RESEND_API_KEY=...
RESEND_FROM_EMAIL=noreply@copernigeo.com

# Firebase (for storage)
FIREBASE_PROJECT_ID=...
FIREBASE_PRIVATE_KEY=...
FIREBASE_CLIENT_EMAIL=...
```

### Required Dependencies

```json
{
  "dependencies": {
    "@google/earthengine": "^1.7.1",
    "@sparticuz/chromium-min": "^143.0.0",
    "puppeteer-core": "^23.7.1",
    "sharp": "^0.34.5",
    "resend": "^6.5.2"
  },
  "devDependencies": {
    "@sparticuz/chromium": "^141.0.0",
    "puppeteer": "^24.33.0"
  }
}
```

### Postinstall Script

**File**: `scripts/postinstall.mjs`

Creates Chromium tar archive during build:
```javascript
// Finds @sparticuz/chromium package
// Creates tar archive: public/chromium-pack.tar
// Used at runtime to download/extract Chromium
```

### Vercel Configuration

**File**: `next.config.js`

```javascript
const nextConfig = {
  serverExternalPackages: [
    "@sparticuz/chromium-min",
    "puppeteer-core"
  ],
};
```

**Note**: Next.js 14.2 may show a warning about `serverExternalPackages`, but it's safe to include.

## Error Handling

### Headless Browser Failures

If headless browser fails, the system:
1. Logs the error
2. Falls back to composite method
3. Continues processing (doesn't fail entire report)

### Composite Failures

If composite also fails:
1. Logs the error
2. Continues without image for that area/index
3. Email still sent (with other images)

### Chromium Initialization

Multiple fallback strategies:
1. Try `require('@sparticuz/chromium-min')`
2. Try `await import('@sparticuz/chromium-min')`
3. Fall back to local Puppeteer (development)
4. If all fail, use composite method

## Performance Considerations

### Caching

- **Browser Instance**: Reused across multiple renders
- **Chromium Path**: Cached after first resolution
- **Image Buffers**: Stored for PDF generation

### Cost Optimization

1. **Image Clipping**: Clip to bounding box before index calculation
2. **Scale**: Use 100m scale for statistics (faster)
3. **Best Effort**: Use `bestEffort: true` for large areas

### Timeouts

- **Earth Engine**: 60-second timeout for operations
- **PDF Generation**: 30-second timeout
- **Image Downloads**: Standard fetch timeouts

## Troubleshooting

### Chromium Not Found

**Symptoms**: "Cannot find module '@sparticuz/chromium-min'"

**Solutions**:
1. Check `package.json` includes `@sparticuz/chromium-min`
2. Verify postinstall script ran successfully
3. Check `public/chromium-pack.tar` exists
4. Verify environment variables (VERCEL, VERCEL_ENV)

### Browser Launch Fails

**Symptoms**: "Could not find Chrome" or "Failed to initialize Puppeteer"

**Solutions**:
1. System falls back to composite automatically
2. Check Chromium tar archive is accessible
3. Verify CHROMIUM_PACK_URL is correct
4. Check Vercel function logs for detailed errors

### Image Alignment Issues

**Symptoms**: Overlay doesn't align with base image

**Solutions**:
1. Ensure both images use same bounding box
2. Verify same dimensions (1200x1200)
3. Check padding calculation (5% on all sides)
4. Ensure same coordinate system (EPSG:4326)

## Future Improvements

1. **Image Caching**: Cache generated images to reduce Earth Engine costs
2. **Parallel Processing**: Process multiple images concurrently
3. **Higher Resolution**: Support 2x resolution for retina displays
4. **Custom Styles**: Allow custom polygon colors and opacity
5. **Error Recovery**: Retry failed operations automatically


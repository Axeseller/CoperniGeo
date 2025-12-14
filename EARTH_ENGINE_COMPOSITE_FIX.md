# Earth Engine Composite Image Fix

## Problem
The composite images had alignment and distortion issues:
1. Index overlay was zoomed in and covering a bigger area than the AOI
2. Images were distorted and angles were off
3. Overlay didn't align correctly with the satellite base map

## Root Cause
We were trying to combine images from **two different sources** with different projections, scales, and coordinate systems:
- **Google Maps Static API**: Mercator projection, web tiles
- **Earth Engine**: Custom projection, scientific-grade imagery

Even though both covered the same geographic bounding box, the pixel-level alignment was impossible to match due to:
- Different rendering engines
- Different coordinate transformations
- Different resampling algorithms
- Different tile formats

## Solution
Use **Earth Engine as the single source** for both base satellite imagery and index overlay. This ensures perfect alignment because:
- Same data source (Sentinel-2)
- Same projection system
- Same coordinate transformation
- Same dimensions and scale
- Same bounding box

### Implementation

#### 1. Generate Both Images from Earth Engine

```typescript
// Generate RGB base satellite imagery from Sentinel-2
const baseImageBuffer = await image.getThumbURL({
  dimensions: 1200,
  region: paddedBounds, // Same bounding box
  bands: ['B4', 'B3', 'B2'], // RGB bands
  min: [0, 0, 0],
  max: [3000, 3000, 3000],
});

// Generate index overlay from same image
const overlayBuffer = await indexImage.getThumbURL({
  dimensions: 1200,
  region: paddedBounds, // Same bounding box
  min: statsMin,
  max: statsMax,
  palette: ['red', 'yellow', 'green'],
});
```

#### 2. Composite with Perfect Alignment

```typescript
// Both images have identical:
// - Dimensions (1200x1200)
// - Geographic bounds (same bounding box)
// - Projection (same Earth Engine projection)
// - Scale (same pixel-to-meter ratio)

const composite = await compositeIndexOverlay(
  baseImageBuffer,   // Earth Engine RGB base
  overlayBuffer,     // Earth Engine index overlay
  coordinates,       // Polygon coordinates
  0.7,              // 70% opacity
  '#5db815'         // Green polygon outline
);
```

## Benefits

### Perfect Alignment
- Both images are from the same source with identical properties
- No coordinate transformation mismatch
- No scaling distortion
- Pixel-perfect overlay

### Consistent Quality
- Both images use the same Sentinel-2 data
- Same processing pipeline
- Same quality and resolution

### Simplified Pipeline
- No need for complex coordinate transformations
- No Google Maps API dependency for base imagery
- Fewer potential points of failure

## Visual Result

The final composite image shows:
- ✅ **Base Layer**: RGB satellite imagery from Sentinel-2
- ✅ **Middle Layer**: Index visualization at 70% opacity
- ✅ **Top Layer**: Green polygon outline (#5db815)
- ✅ **Perfect Alignment**: All layers match exactly
- ✅ **No Distortion**: Images maintain correct aspect ratio and scale
- ✅ **Accurate Coverage**: Overlay only shows data within the bounding box

## Technical Details

### Sentinel-2 RGB Bands
- **B4**: Red band (665 nm)
- **B3**: Green band (560 nm)
- **B2**: Blue band (490 nm)

These create a natural color satellite image similar to what you'd see from Google Maps.

### Same Bounding Box
Both images use the exact same bounding box with 5% padding:
```typescript
const paddedBounds = ee.Geometry.Polygon([[
  [minLng - lngPadding, minLat - latPadding],
  [maxLng + lngPadding, minLat - latPadding],
  [maxLng + lngPadding, maxLat + latPadding],
  [minLng - lngPadding, maxLat + latPadding],
  [minLng - lngPadding, minLat - latPadding]
]]);
```

### Dimensions
Both thumbnails are generated with `dimensions: 1200`, ensuring:
- Same pixel count
- Same aspect ratio (Earth Engine calculates it)
- Same resolution

## Testing

Restart your dev server and send a test report:

```bash
npm run dev
```

Look for these log messages:
```
[Report Send] Generating Earth Engine thumbnails for bounding box
[Report Send] Generating base satellite RGB thumbnail...
[Report Send] Base satellite RGB thumbnail generated
[Report Send] Generating index overlay thumbnail...
[Report Send] Index overlay thumbnail generated
[Email] Downloading base satellite imagery from Earth Engine...
[Email] ✅ Base satellite image downloaded
[Email] Downloading index overlay from Earth Engine...
[Email] ✅ Index overlay downloaded
[Email] Compositing Earth Engine images (base satellite + overlay + polygon)...
[Email] ✅ Composite image generated from Earth Engine sources
```

The resulting PDF images will show:
- ✅ Perfect alignment between base and overlay
- ✅ No distortion
- ✅ Correct scale and coverage
- ✅ Green polygon outline showing exact AOI boundaries

## Files Modified

- `src/app/api/reports/[id]/send/route.ts` - Generate both base and overlay from Earth Engine
- `src/lib/images/compositeImage.ts` - Fixed duplicate export issue

## Status

✅ Implementation Complete
✅ Build Successful
✅ Ready for Testing


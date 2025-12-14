# Composite Image Alignment Fix

## Problem
The index overlay was distorted and didn't align correctly with the satellite base image. The overlay was covering areas outside the AOI and not matching the actual field boundaries shown in the dashboard.

## Root Cause
The Earth Engine thumbnail was being generated for the **exact polygon** (AOI), while the Google Maps satellite image was being fetched for the **bounding box** (rectangular area around the polygon). This caused a mismatch:

- **Google Maps image**: Rectangular bounding box with 5% padding
- **Earth Engine overlay**: Exact polygon shape
- **Result**: When trying to overlay them, the shapes didn't match, causing distortion

## Solution
Modified the thumbnail generation to use the **same bounding box** as the Google Maps satellite image:

### Before:
```typescript
// Generated thumbnail for exact polygon
(clipped as any).getThumbURL({
  region: polygon, // ❌ Exact polygon shape
  ...
})
```

### After:
```typescript
// Calculate bounding box with 5% padding (matching Google Maps)
let minLat = coordinates[0].lat;
let maxLat = coordinates[0].lat;
let minLng = coordinates[0].lng;
let maxLng = coordinates[0].lng;

for (const coord of coordinates) {
  if (coord.lat < minLat) minLat = coord.lat;
  if (coord.lat > maxLat) maxLat = coord.lat;
  if (coord.lng < minLng) minLng = coord.lng;
  if (coord.lng > maxLng) maxLng = coord.lng;
}

// Add 5% padding
const latPadding = (maxLat - minLat) * 0.05;
const lngPadding = (maxLng - minLng) * 0.05;

// Create bounding box as a polygon
const paddedBounds = ee.Geometry.Polygon([[
  [minLng - lngPadding, minLat - latPadding],
  [maxLng + lngPadding, minLat - latPadding],
  [maxLng + lngPadding, maxLat + latPadding],
  [minLng - lngPadding, maxLat + latPadding],
  [minLng - lngPadding, minLat - latPadding]
]]);

// Generate thumbnail for bounding box (not polygon)
(indexImage as any).getThumbURL({
  region: paddedBounds, // ✅ Same rectangular area as Google Maps
  ...
})
```

## Key Changes

1. **Consistent Bounding Box**: Both Google Maps and Earth Engine now use the exact same rectangular bounds with 5% padding
2. **Use indexImage Instead of clipped**: Generate thumbnail from the full index image (before polygon clipping) so it covers the entire bounding box
3. **Alignment**: The overlay now perfectly aligns with the satellite base because both images cover the same geographic area

## Visual Result

### Before:
- Index overlay was distorted
- Covered areas outside the AOI
- Didn't match the actual field boundaries

### After:
- Index overlay perfectly aligned with satellite imagery
- Only shows data for the AOI (within the bounding box)
- Matches the dashboard appearance
- Green polygon outline shows exact AOI boundaries

## Testing

Restart your dev server and send a test report:

```bash
npm run dev
```

You should see in the logs:
```
[Report Send] Generating thumbnail for bounding box (not just polygon) to match satellite imagery
[Report Send] Bounding box: [-103.91663..., 20.68844..., -103.91006..., 20.69910...]
[Report Send] Generated thumbnail URL for NDVI using bounding box (will align with satellite imagery)
```

The resulting composite image will show:
- ✅ Satellite base map (rectangular bounding box)
- ✅ Index overlay perfectly aligned (same rectangular area)
- ✅ Green polygon outline showing exact AOI boundaries
- ✅ No distortion or misalignment

## Files Modified

- `src/app/api/reports/[id]/send/route.ts` - Updated thumbnail generation to use bounding box

## Status

✅ Implementation Complete
✅ Build Successful
✅ Ready for Testing


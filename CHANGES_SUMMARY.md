# Summary of Changes - GEE Cost Optimization

## Overview
This document summarizes all changes made to optimize Google Earth Engine (GEE) usage and reduce costs by:
1. Removing date selection (always fetch most recent data)
2. Implementing comprehensive caching system
3. Adding multiple cost-saving optimizations

## Changes Made

### 1. UI Changes

#### Removed Date Selection
- **File**: `src/components/map/MapControls.tsx`
- **Changes**:
  - Removed "Fecha inicio" (start date) input field
  - Removed "Fecha fin" (end date) input field
  - Removed date state variables (`startDate`, `endDate`)
  - Added informational text: "Se cargará la imagen más reciente disponible"

#### Button Renamed
- **File**: `src/components/map/MapControls.tsx`
- **Changes**:
  - Changed button text from "Cargar Imagen" to "Cargar Imagen Más Reciente"

#### Updated Component Props
- **Files**: 
  - `src/components/map/MapControls.tsx`
  - `src/app/dashboard/imagenes/page.tsx`
- **Changes**:
  - Removed `startDate` and `endDate` from `onLoadImage` function signature
  - Updated all calls to remove date parameters

### 2. API Changes

#### Updated Request Type
- **File**: `src/types/satellite.ts`
- **Changes**:
  - Removed `startDate` and `endDate` from `SatelliteImageRequest` interface
  - Added comment explaining date parameters removed

#### Always Fetch Most Recent Data
- **File**: `src/app/api/satellite/process/route.ts`
- **Changes**:
  - Removed date parameter parsing
  - Always queries last 60 days of Sentinel-2 data
  - Automatically selects most recent image
  - Gets actual image date for accurate caching

#### Processing Logic Updates
- **File**: `src/lib/indices/calculations.ts`
- **Changes**:
  - Updated `getSentinel2Collection()` to only take `cloudCoverage` parameter
  - Automatically sets date range to last 60 days (reduced from 90)
  - Added `getMostRecentImage()` helper function

### 3. Caching System

#### New Cache Module
- **File**: `src/lib/firestore/cache.ts`
- **Features**:
  - `generateCacheHash()`: Creates SHA-256 hash from AOI + date + parameters
  - `getCachedResult()`: Retrieves cached results from Firestore
  - `setCachedResult()`: Stores results in Firestore cache
  - Cache TTL: 30 days
  - Coordinate normalization (5 decimal places) for better cache hits

#### Cache Integration
- **File**: `src/app/api/satellite/process/route.ts`
- **Changes**:
  - Check cache after determining image date
  - Return cached result instantly if found (zero GEE cost)
  - Store results in cache after processing
  - Cache key includes: coordinates + indexType + cloudCoverage + imageDate

### 4. Optimizations

#### Adaptive Resolution Scaling
- **File**: `src/app/api/satellite/process/route.ts`
- **Changes**:
  - Automatically adjusts resolution based on area size
  - Larger areas = lower resolution = lower costs
  - Scales: 100m → 150m → 200m → 250m based on area

#### Collection Size Reduction
- **File**: `src/lib/indices/calculations.ts`
- **Changes**:
  - Reduced date range from 90 to 60 days
  - Early polygon bounds filtering
  - Cloud coverage filtering before processing

#### Processing Optimizations
- **File**: `src/app/api/satellite/process/route.ts`
- **Changes**:
  - Shared inputs in reducers
  - Best effort mode enabled
  - Increased tile scale for performance
  - Optimized timeout values

### 5. Firestore Rules Update

#### Added Cache Collection Rules
- **File**: `firestore.rules.example`
- **Changes**:
  - Added `satellite_cache` collection rules
  - Allows read/write by any authenticated user (shared cache)
  - Documents cached with hash as document ID

## Important Notes

### Firestore Cache Implementation
**⚠️ IMPORTANT**: The cache system uses client-side Firestore (`firebase/firestore`) which requires authentication. Since API routes run server-side, you may need to:

1. **Option A**: Use Firebase Admin SDK for server-side cache operations
   - Install: `npm install firebase-admin`
   - Initialize Admin SDK in API routes
   - Update cache functions to use Admin SDK

2. **Option B**: Keep current implementation if authentication works
   - Ensure API routes can access Firestore with proper auth
   - May require passing auth tokens from client

3. **Option C**: Use a different caching solution
   - Redis, Vercel KV, or in-memory cache
   - Simpler for server-side use

### Updating Firestore Rules
Don't forget to update your Firestore security rules to include the cache collection:

```javascript
// Satellite cache collection (shared cache for all authenticated users)
match /satellite_cache/{cacheHash} {
  // Allow read by any authenticated user (cache is shared to benefit everyone)
  allow read: if isAuthenticated();
  
  // Allow write by any authenticated user (API routes will write here)
  allow write: if isAuthenticated();
}
```

Copy this to your `firestore.rules.example` file and deploy to Firebase Console.

## Testing Checklist

- [ ] Remove date inputs from UI
- [ ] Button shows "Cargar Imagen Más Reciente"
- [ ] API always returns most recent image
- [ ] Cache is checked before processing
- [ ] Cached results return instantly
- [ ] Results are stored in cache after processing
- [ ] Adaptive resolution works for different area sizes
- [ ] Firestore rules allow cache access

## Expected Benefits

1. **Cost Reduction**: 60-80% reduction in GEE costs (estimated)
2. **Faster Responses**: Instant responses for cached requests
3. **Better UX**: Simplified interface, always get latest data
4. **Scalability**: Cache grows with usage, benefits all users

## Next Steps

1. Update Firestore security rules in Firebase Console
2. Test the caching system end-to-end
3. Monitor cache hit rates
4. Consider migrating to Firebase Admin SDK for server-side cache
5. Add cache statistics/monitoring dashboard (optional)


# GEE Cost Optimization Strategies

This document outlines the optimizations implemented to reduce Google Earth Engine (GEE) usage and costs.

## 1. Caching System

### Overview
All satellite image processing results are cached in Firestore to avoid duplicate GEE requests.

### Cache Key
- **Hash Components**: AOI coordinates + Index type + Cloud coverage + Image date
- **Hash Algorithm**: SHA-256
- **Precision**: Coordinates rounded to 5 decimal places (~1 meter) for better cache hits

### Cache TTL
- **Duration**: 30 days
- **Rationale**: Satellite images don't change, so cached results remain valid

### Benefits
- **Zero GEE cost** for cached requests
- **Instant response** for repeated analyses
- **Automatic expiration** after 30 days

## 2. Most Recent Data Only

### Overview
Removed date selection UI - always fetch the most recent available image.

### Implementation
- Automatically queries last 60 days of Sentinel-2 data
- Selects most recent image with lowest cloud coverage
- Reduces collection size compared to custom date ranges

### Benefits
- **Simplified UX** - users don't need to know when images are available
- **Smaller collections** - only queries recent data (60 days vs. potentially years)
- **Better cache hits** - most users will request recent data

## 3. Adaptive Resolution Scaling

### Overview
Automatically adjusts resolution based on area size to optimize cost vs. quality.

### Scaling Rules
- **< 10 km²**: 100m resolution (highest quality)
- **10-50 km²**: 150m resolution
- **50-100 km²**: 200m resolution
- **> 100 km²**: 250m resolution (lower cost)

### Benefits
- **Lower GEE costs** for large areas
- **Maintains quality** for small areas
- **Automatic optimization** - no user configuration needed

## 4. Collection Size Reduction

### Overview
Optimized date range and filtering to minimize collection size.

### Changes
- Reduced date range from 90 to 60 days
- Early filtering by polygon bounds
- Cloud coverage filtering before processing

### Benefits
- **Smaller collections** = faster queries
- **Less data processed** = lower costs
- **Sentinel-2 revisits every 5 days**, so 60 days provides 12+ revisits (plenty of coverage)

## 5. Processing Optimizations

### Overview
Various optimizations to reduce computation time and costs.

### Techniques
- **Shared inputs** in reducers (min/max/mean computed together)
- **Best effort mode** to avoid timeouts
- **Increased tile scale** for better performance
- **Early polygon bounds filtering**

### Benefits
- **Faster processing** = lower compute costs
- **More reliable** = fewer failed requests
- **Better user experience** = faster responses

## 6. Smart Cache Checking

### Overview
Cache is checked after determining which image will be used.

### Flow
1. Query GEE for most recent image (minimal cost)
2. Get image date
3. Check cache with specific date
4. Return cached result OR proceed with processing

### Benefits
- **Accurate caching** - cache key includes actual image date
- **Minimal GEE usage** - only queries metadata first
- **Prevents duplicate processing** of same image

## 7. Bounding Box Clipping Before Index Calculation

### Overview
**MOST COST-EFFICIENT OPTIMIZATION**: Clip image to polygon's bounding box BEFORE calculating the index.

### The Problem
Sentinel-2 images cover ~109x109 km tiles (~12,000 km²). If a user's polygon is only 1 km², we were processing the entire 12,000 km² tile, wasting 99.99% of computation.

### The Solution
1. Get the bounding box of the user's polygon
2. Add a small 1km buffer for edge pixels
3. Clip the raw image to this bounding box BEFORE calculating the index
4. Calculate the index only on the clipped (smaller) area
5. Then clip to the exact polygon for statistics

### Benefits
- **Massive cost reduction**: Process only the AOI area instead of full tile
- **10-100x fewer pixels processed**: Example: 1 km² polygon in 12,000 km² tile = 12,000x reduction
- **Faster processing**: Smaller area = faster computation
- **Same accuracy**: Statistics and display still use exact polygon

### Example Impact
- **Before**: 1 km² polygon = processing ~12,000 km² (entire Sentinel-2 tile)
- **After**: 1 km² polygon = processing ~3 km² (bounding box + buffer)
- **Cost savings**: ~99.97% reduction in pixels processed

## Monitoring & Maintenance

### Cache Statistics
- Monitor cache hit rate
- Track cache size and growth
- Identify frequently accessed areas

### Future Optimizations
1. **Pre-warming cache** for popular areas
2. **Batch processing** for multiple indices at once
3. **Smart date range selection** based on image availability
4. **Compression** of cached tile URLs
5. **Cache invalidation** when new images become available

## Cost Estimation

### Before Optimizations
- Every request = Full GEE processing
- Average cost: ~$0.01-0.05 per request (depending on area size)
- No caching = repeated requests are expensive

### After Optimizations
- **First request**: Same as before (~$0.01-0.05)
- **Cached requests**: $0.00 (no GEE usage)
- **Expected cache hit rate**: 60-80% (most users repeat analyses)

### Expected Savings
- **60-80% reduction** in GEE costs
- **Instant responses** for cached requests
- **Better user experience** with faster load times


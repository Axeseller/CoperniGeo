import { NextRequest, NextResponse } from "next/server";
import { initializeEarthEngine, getEarthEngine } from "@/lib/earthEngine";
import { 
  calculateIndex, 
  getSentinel2Collection, 
  getMostRecentImage 
} from "@/lib/indices/calculations";
import { SatelliteImageRequest, SatelliteImageResponse } from "@/types/satellite";
import { IndexType } from "@/types/report";
import { 
  generateCacheHash, 
  getCachedResult, 
  setCachedResult,
  type CacheKey 
} from "@/lib/firestore/cache";

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Allow up to 60 seconds for processing

/**
 * Process satellite image with caching and optimizations to reduce GEE usage
 */
export async function POST(request: NextRequest) {
  try {
    console.log("[Satellite API] Starting request processing...");

    // Parse request body
    const body: SatelliteImageRequest = await request.json();
    const { coordinates, indexType, cloudCoverage } = body;

    console.log("[Satellite API] Request parameters:", {
      coordinatesCount: coordinates?.length,
      indexType,
      cloudCoverage,
    });

    // Validate input
    if (!coordinates || coordinates.length < 3) {
      console.error("[Satellite API] Invalid coordinates");
      return NextResponse.json(
        { error: "Invalid coordinates. At least 3 points required for a polygon." },
        { status: 400 }
      );
    }

    if (!["NDVI", "NDRE", "EVI"].includes(indexType)) {
      console.error("[Satellite API] Invalid index type:", indexType);
      return NextResponse.json(
        { error: "Invalid index type. Must be NDVI, NDRE, or EVI." },
        { status: 400 }
      );
    }

    // Step 1: We'll check cache after getting the image date
    // For now, proceed to get the most recent image first
    console.log("[Satellite API] Fetching most recent image...");

    // Step 2: Initialize Earth Engine
    console.log("[Satellite API] Initializing Earth Engine...");
    await initializeEarthEngine();
    const ee = getEarthEngine();
    console.log("[Satellite API] Earth Engine initialized successfully");

    // Step 3: Create polygon from coordinates
    console.log("[Satellite API] Creating polygon...");
    const polygon = ee.Geometry.Polygon(
      [coordinates.map((coord) => [coord.lng, coord.lat])],
      "EPSG:4326"
    );

    // Step 4: Get Sentinel-2 collection (automatically fetches last 90 days)
    console.log("[Satellite API] Getting Sentinel-2 collection (last 90 days)...");
    const collection = getSentinel2Collection(cloudCoverage)
      .filterBounds(polygon); // Filter by polygon early to reduce processing

    // Step 5: Check if there are any images
    console.log("[Satellite API] Checking for available images...");
    const imageCount = await new Promise<number>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Image count check timed out"));
      }, 30000); // 30 second timeout

      collection.size().getInfo((count: number, error?: Error) => {
        clearTimeout(timeout);
        if (error) reject(error);
        else resolve(count);
      });
    });

    console.log("[Satellite API] Found", imageCount, "images");

    if (imageCount === 0) {
      console.warn("[Satellite API] No images found");
      return NextResponse.json(
        { 
          error: "No satellite images found for the specified area. Try:\n1. Increasing cloud coverage tolerance\n2. Verifying the area is on land (not ocean)" 
        },
        { status: 404 }
      );
    }

    // Step 6: Select the most recent image
    console.log("[Satellite API] Selecting most recent image...");
    const image = getMostRecentImage(collection);
    
    // Get image date for caching (check cache now that we know the date)
    let imageDate: string;
    try {
      // Get system:time_start property for the actual image date
      const imageDateValue = await new Promise<string>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Image date fetch timed out"));
        }, 10000); // 10 second timeout for date
        
        image.get("system:time_start").getInfo((timestamp: number, error?: Error) => {
          clearTimeout(timeout);
          if (error) reject(error);
          else {
            // Convert timestamp to date string
            const date = new Date(timestamp);
            resolve(date.toISOString().split("T")[0]);
          }
        });
      });
      imageDate = imageDateValue || new Date().toISOString().split("T")[0];
    } catch (error: any) {
      console.warn("[Satellite API] Could not get image date, using current date:", error.message);
      imageDate = new Date().toISOString().split("T")[0];
    }
    
    // Now check cache with the actual image date
    console.log("[Satellite API] Checking cache for image date:", imageDate);
    const cacheKey: CacheKey = {
      coordinates,
      indexType,
      cloudCoverage,
      imageDate: imageDate, // Use actual image date
    };
    
    const cacheHash = generateCacheHash(cacheKey);
    const cachedResult = await getCachedResult(cacheHash);
    
    if (cachedResult) {
      console.log("[Satellite API] ✓ Cache hit! Returning cached result (no GEE cost)");
      return NextResponse.json({
        tileUrl: cachedResult.tileUrl,
        minValue: cachedResult.minValue,
        maxValue: cachedResult.maxValue,
        meanValue: cachedResult.meanValue,
        date: cachedResult.date,
        indexType: cachedResult.indexType,
        cached: true, // Indicate this is from cache
      } as SatelliteImageResponse & { cached?: boolean });
    }
    
    console.log("[Satellite API] Cache miss. Processing with GEE...");

    // Step 7: Calculate the requested index
    console.log("[Satellite API] Calculating index:", indexType);
    const indexImage = calculateIndex(image, indexType as IndexType);

    // Step 8: Clip to polygon
    console.log("[Satellite API] Clipping to polygon...");
    const clipped = indexImage.clip(polygon);

    // Step 9: Get statistics with optimized parameters to reduce GEE costs
    // Calculate optimal scale based on polygon area (larger areas = lower resolution = lower cost)
    const polygonArea = polygon.area().getInfo();
    const areaKm2 = polygonArea / 1000000; // Convert m² to km²
    let scale = 100; // Default 100m resolution
    
    if (areaKm2 > 100) {
      scale = 250; // 250m for areas > 100 km²
    } else if (areaKm2 > 50) {
      scale = 200; // 200m for areas > 50 km²
    } else if (areaKm2 > 10) {
      scale = 150; // 150m for areas > 10 km²
    }
    
    console.log("[Satellite API] Computing statistics (optimized scale:", scale, "m, area:", areaKm2.toFixed(2), "km²)...");
    const stats = clipped.reduceRegion({
      reducer: ee.Reducer.minMax().combine({
        reducer2: ee.Reducer.mean(),
        sharedInputs: true, // Share inputs to reduce computation
      }),
      geometry: polygon,
      scale: scale, // Adaptive resolution based on area size
      maxPixels: 1e9,
      bestEffort: true, // Use best effort mode to avoid timeouts
      tileScale: 4, // Increase tile scale for better performance
    });

    console.log("[Satellite API] Fetching statistics (with 90s timeout)...");
    const statsValue = await new Promise<any>((resolve, reject) => {
      const timeout = setTimeout(() => {
        console.error("[Satellite API] Statistics computation timed out");
        reject(new Error("Statistics computation timed out. Try reducing the area size."));
      }, 90000); // 90 second timeout

      stats.getInfo((value: any, error?: Error) => {
        clearTimeout(timeout);
        if (error) {
          console.error("[Satellite API] Statistics error:", error);
          reject(error);
        } else {
          console.log("[Satellite API] Statistics received:", value);
          resolve(value);
        }
      });
    });

    console.log("[Satellite API] Statistics computed successfully");

    // Step 10: Validate statistics
    const minKey = `${indexType}_min`;
    const maxKey = `${indexType}_max`;
    const meanKey = `${indexType}_mean`;

    if (statsValue[minKey] === undefined || statsValue[maxKey] === undefined) {
      console.error("[Satellite API] Invalid statistics keys:", Object.keys(statsValue));
      throw new Error(`Statistics missing expected keys. Received: ${Object.keys(statsValue).join(", ")}`);
    }

    // Step 11: Generate tile URL for map overlay
    console.log("[Satellite API] Generating tile URL...");
    const minValue = statsValue[minKey];
    const maxValue = statsValue[maxKey];

    // getMapId returns a Promise in Node.js Earth Engine client
    const mapId = await new Promise<any>((resolve, reject) => {
      const timeout = setTimeout(() => {
        console.error("[Satellite API] getMapId timed out");
        reject(new Error("Tile URL generation timed out"));
      }, 60000); // 60 second timeout

      clipped.getMapId(
        {
          min: minValue,
          max: maxValue,
          palette: indexType === "NDVI" || indexType === "NDRE"
            ? ["red", "yellow", "green"] // Red to green for NDVI/NDRE
            : ["blue", "cyan", "yellow", "orange", "red"], // Blue to red for EVI
        },
        (result: any, error?: Error) => {
          clearTimeout(timeout);
          if (error) {
            console.error("[Satellite API] getMapId error:", error);
            reject(error);
          } else {
            console.log("[Satellite API] getMapId result received");
            resolve(result);
          }
        }
      );
    });

    // Extract tile URL
    const tileUrl = mapId?.urlFormat || mapId?.tile_fetcher?.url_format || mapId?.url_format;
    
    if (!tileUrl) {
      console.error("[Satellite API] Invalid mapId structure:", mapId);
      throw new Error(`Failed to generate tile URL from Earth Engine. MapId structure: ${JSON.stringify(Object.keys(mapId || {}))}`);
    }

    // Step 12: Prepare response
    const response: SatelliteImageResponse = {
      tileUrl: tileUrl,
      minValue,
      maxValue,
      meanValue: statsValue[meanKey] || (minValue + maxValue) / 2,
      date: imageDate, // Use actual image date
      indexType: indexType as IndexType,
    };

    // Step 13: Store result in cache (async, don't wait)
    setCachedResult(cacheHash, cacheKey, response, imageDate).catch((error) => {
      console.error("[Satellite API] Failed to cache result (non-critical):", error);
    });

    console.log("[Satellite API] Response prepared successfully and cached");
    return NextResponse.json(response);
  } catch (error: any) {
    console.error("[Satellite API] Error processing satellite image:", error);
    console.error("[Satellite API] Error stack:", error.stack);
    return NextResponse.json(
      { 
        error: error.message || "Failed to process satellite image",
        details: process.env.NODE_ENV === "development" ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

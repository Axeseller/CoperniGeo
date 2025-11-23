import { NextRequest, NextResponse } from "next/server";
import { initializeEarthEngine, getEarthEngine } from "@/lib/earthEngine";
import { calculateIndex, getSentinel2Collection } from "@/lib/indices/calculations";
import { SatelliteImageRequest, SatelliteImageResponse } from "@/types/satellite";
import { IndexType } from "@/types/report";

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Allow up to 60 seconds for processing (Vercel Pro: 300s, Hobby: 10s)

export async function POST(request: NextRequest) {
  try {
    console.log("[Satellite API] Starting request processing...");

    // Initialize Earth Engine
    console.log("[Satellite API] Initializing Earth Engine...");
    await initializeEarthEngine();
    const ee = getEarthEngine();
    console.log("[Satellite API] Earth Engine initialized successfully");

    // Parse request body
    const body: SatelliteImageRequest = await request.json();
    const { coordinates, indexType, cloudCoverage, startDate, endDate } = body;

    console.log("[Satellite API] Request parameters:", {
      coordinatesCount: coordinates?.length,
      indexType,
      cloudCoverage,
      startDate,
      endDate,
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

    // Create polygon from coordinates
    console.log("[Satellite API] Creating polygon...");
    const polygon = ee.Geometry.Polygon(
      [coordinates.map((coord) => [coord.lng, coord.lat])],
      "EPSG:4326"
    );

    // Get Sentinel-2 collection
    console.log("[Satellite API] Getting Sentinel-2 collection...");
    const collection = getSentinel2Collection(startDate, endDate, cloudCoverage)
      .filterBounds(polygon); // Filter by polygon to reduce processing time

    // Check if there are any images
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
      console.warn("[Satellite API] No images found for the given parameters");
      return NextResponse.json(
        { 
          error: "No satellite images found for the specified area and date range. Try:\n1. Increasing the date range\n2. Increasing cloud coverage tolerance\n3. Verifying the area is on land (not ocean)" 
        },
        { status: 404 }
      );
    }

    // Select the most recent image
    console.log("[Satellite API] Selecting most recent image...");
    const image = collection.sort("system:time_start", false).first();

    // Calculate the requested index
    console.log("[Satellite API] Calculating index:", indexType);
    const indexImage = calculateIndex(image, indexType as IndexType);

    // Clip to polygon
    console.log("[Satellite API] Clipping to polygon...");
    const clipped = indexImage.clip(polygon);

    // Get statistics with optimized parameters
    console.log("[Satellite API] Computing statistics...");
    const stats = clipped.reduceRegion({
      reducer: ee.Reducer.minMax().combine({
        reducer2: ee.Reducer.mean(),
        sharedInputs: true,
      }),
      geometry: polygon,
      scale: 100, // 100 meters resolution
      maxPixels: 1e9,
      bestEffort: true, // Use best effort mode to avoid timeouts
      tileScale: 4, // Increase tile scale for better performance
    });

    console.log("[Satellite API] Fetching statistics (with 120s timeout)...");
    const statsValue = await new Promise<any>((resolve, reject) => {
      const timeout = setTimeout(() => {
        console.error("[Satellite API] Statistics computation timed out after 120 seconds");
        reject(new Error("Statistics computation timed out after 120 seconds. Try reducing the area size or date range."));
      }, 120000); // 120 second timeout (increased from 60)

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

    console.log("[Satellite API] Statistics computed successfully:", statsValue);

    // Check if statistics are valid
    const minKey = `${indexType}_min`;
    const maxKey = `${indexType}_max`;
    const meanKey = `${indexType}_mean`;

    if (statsValue[minKey] === undefined || statsValue[maxKey] === undefined) {
      console.error("[Satellite API] Invalid statistics keys:", Object.keys(statsValue));
      throw new Error(`Statistics missing expected keys. Received: ${Object.keys(statsValue).join(", ")}`);
    }

    // Generate tile URL for map overlay
    console.log("[Satellite API] Generating tile URL...");
    const minValue = statsValue[minKey];
    const maxValue = statsValue[maxKey];

    console.log("[Satellite API] Calling getMapId with params:", {
      min: minValue,
      max: maxValue,
      palette: indexType === "NDVI" || indexType === "NDRE"
        ? ["red", "yellow", "green"]
        : ["blue", "cyan", "yellow", "orange", "red"]
    });

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
            console.log("[Satellite API] getMapId result:", result);
            resolve(result);
          }
        }
      );
    });

    console.log("[Satellite API] Map ID generated successfully:", {
      hasMapId: !!mapId,
      hasUrlFormat: !!mapId?.urlFormat,
      keys: mapId ? Object.keys(mapId) : []
    });

    // Check the structure - it might be mapId.urlFormat instead of mapId.tile_fetcher.url_format
    const tileUrl = mapId?.urlFormat || mapId?.tile_fetcher?.url_format || mapId?.url_format;
    
    if (!tileUrl) {
      console.error("[Satellite API] Invalid mapId structure:", mapId);
      throw new Error(`Failed to generate tile URL from Earth Engine. MapId structure: ${JSON.stringify(Object.keys(mapId || {}))}`);
    }

    const response: SatelliteImageResponse = {
      tileUrl: tileUrl,
      minValue,
      maxValue,
      meanValue: statsValue[meanKey] || (minValue + maxValue) / 2,
      date: new Date().toISOString(),
      indexType: indexType as IndexType,
    };

    console.log("[Satellite API] Response prepared successfully");
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


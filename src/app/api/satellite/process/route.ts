import { NextRequest, NextResponse } from "next/server";
import { initializeEarthEngine, getEarthEngine } from "@/lib/earthEngine";
import { calculateIndex, getSentinel2Collection } from "@/lib/indices/calculations";
import { SatelliteImageRequest, SatelliteImageResponse } from "@/types/satellite";
import { IndexType } from "@/types/report";

export const dynamic = 'force-dynamic';

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
    const collection = getSentinel2Collection(startDate, endDate, cloudCoverage);

    // Select the most recent image
    console.log("[Satellite API] Selecting most recent image...");
    const image = collection.sort("system:time_start", false).first();

    // Calculate the requested index
    console.log("[Satellite API] Calculating index:", indexType);
    const indexImage = calculateIndex(image, indexType as IndexType);

    // Clip to polygon
    console.log("[Satellite API] Clipping to polygon...");
    const clipped = indexImage.clip(polygon);

    // Get statistics
    console.log("[Satellite API] Computing statistics...");
    const stats = clipped.reduceRegion({
      reducer: ee.Reducer.minMax().combine({
        reducer2: ee.Reducer.mean(),
        sharedInputs: true,
      }),
      geometry: polygon,
      scale: 100, // 100 meters resolution
      maxPixels: 1e9,
    });

    console.log("[Satellite API] Fetching statistics...");
    const statsValue = await new Promise<any>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Statistics computation timed out"));
      }, 60000); // 60 second timeout

      stats.get((value: any, error?: Error) => {
        clearTimeout(timeout);
        if (error) {
          console.error("[Satellite API] Statistics error:", error);
          reject(error);
        } else {
          console.log("[Satellite API] Statistics received:", statsValue);
          resolve(value);
        }
      });
    });

    console.log("[Satellite API] Statistics:", statsValue);

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

    const mapId = clipped.getMapId({
      min: minValue,
      max: maxValue,
      palette: indexType === "NDVI" || indexType === "NDRE"
        ? ["red", "yellow", "green"] // Red to green for NDVI/NDRE
        : ["blue", "cyan", "yellow", "orange", "red"], // Blue to red for EVI
    });

    console.log("[Satellite API] Map ID generated:", mapId);

    if (!mapId?.tile_fetcher?.url_format) {
      throw new Error("Failed to generate tile URL from Earth Engine");
    }

    const response: SatelliteImageResponse = {
      tileUrl: mapId.tile_fetcher.url_format,
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


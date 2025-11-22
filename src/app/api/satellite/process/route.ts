import { NextRequest, NextResponse } from "next/server";
import { initializeEarthEngine, getEarthEngine } from "@/lib/earthEngine";
import { calculateIndex, getSentinel2Collection } from "@/lib/indices/calculations";
import { SatelliteImageRequest, SatelliteImageResponse } from "@/types/satellite";
import { IndexType } from "@/types/report";

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Initialize Earth Engine
    await initializeEarthEngine();
    const ee = getEarthEngine();

    // Parse request body
    const body: SatelliteImageRequest = await request.json();
    const { coordinates, indexType, cloudCoverage, startDate, endDate } = body;

    // Validate input
    if (!coordinates || coordinates.length < 3) {
      return NextResponse.json(
        { error: "Invalid coordinates. At least 3 points required for a polygon." },
        { status: 400 }
      );
    }

    if (!["NDVI", "NDRE", "EVI"].includes(indexType)) {
      return NextResponse.json(
        { error: "Invalid index type. Must be NDVI, NDRE, or EVI." },
        { status: 400 }
      );
    }

    // Create polygon from coordinates
    const polygon = ee.Geometry.Polygon(
      [coordinates.map((coord) => [coord.lng, coord.lat])],
      "EPSG:4326"
    );

    // Get Sentinel-2 collection
    const collection = getSentinel2Collection(startDate, endDate, cloudCoverage);

    // Select the most recent image
    const image = collection.sort("system:time_start", false).first();

    // Calculate the requested index
    const indexImage = calculateIndex(image, indexType as IndexType);

    // Clip to polygon
    const clipped = indexImage.clip(polygon);

    // Get statistics
    const stats = clipped.reduceRegion({
      reducer: ee.Reducer.minMax().combine({
        reducer2: ee.Reducer.mean(),
        sharedInputs: true,
      }),
      geometry: polygon,
      scale: 100, // 100 meters resolution
      maxPixels: 1e9,
    });

    const statsValue = await new Promise<any>((resolve, reject) => {
      stats.get((value: any, error?: Error) => {
        if (error) reject(error);
        else resolve(value);
      });
    });

    // Generate tile URL for map overlay
    const mapId = clipped.getMapId({
      min: statsValue[`${indexType}_min`],
      max: statsValue[`${indexType}_max`],
      palette: indexType === "NDVI" || indexType === "NDRE"
        ? ["red", "yellow", "green"] // Red to green for NDVI/NDRE
        : ["blue", "cyan", "yellow", "orange", "red"], // Blue to red for EVI
    });

    const response: SatelliteImageResponse = {
      tileUrl: mapId.tile_fetcher.url_format,
      minValue: statsValue[`${indexType}_min`],
      maxValue: statsValue[`${indexType}_max`],
      meanValue: statsValue[`${indexType}_mean`],
      date: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error("Error processing satellite image:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process satellite image" },
      { status: 500 }
    );
  }
}


/**
 * Firestore cache for satellite image processing results
 * Caches GEE processing results to avoid duplicate requests and reduce costs
 */

import {
  collection,
  doc,
  getDoc,
  setDoc,
  Timestamp,
  QueryDocumentSnapshot,
  DocumentData,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { SatelliteImageResponse } from "@/types/satellite";
import { IndexType } from "@/types/report";
import { createHash } from "crypto";

const CACHE_COLLECTION = "satellite_cache";
const CACHE_TTL_DAYS = 30; // Cache results for 30 days

export interface CacheKey {
  coordinates: { lat: number; lng: number }[];
  indexType: IndexType;
  cloudCoverage: number;
  imageDate: string; // Date of the satellite image used (required for accurate caching)
}

export interface CachedResult extends SatelliteImageResponse {
  cachedAt: Date;
  imageDate: string; // Date of the satellite image
  hash: string;
}

/**
 * Generate a hash from cache key parameters
 * Hash includes: normalized coordinates + indexType + cloudCoverage + imageDate
 */
export function generateCacheHash(key: CacheKey): string {
  // Normalize coordinates by sorting and rounding to reduce precision for better cache hits
  // Round to 5 decimal places (~1 meter precision)
  const normalizedCoords = key.coordinates
    .map((c) => ({
      lat: Math.round(c.lat * 100000) / 100000,
      lng: Math.round(c.lng * 100000) / 100000,
    }))
    .sort((a, b) => {
      if (a.lat !== b.lat) return a.lat - b.lat;
      return a.lng - b.lng;
    });

  const hashString = JSON.stringify({
    coords: normalizedCoords,
    indexType: key.indexType,
    cloudCoverage: key.cloudCoverage,
    imageDate: key.imageDate || "latest", // Use "latest" for most recent images
  });

  return createHash("sha256").update(hashString).digest("hex");
}

/**
 * Check if cached result exists and is still valid
 */
export async function getCachedResult(
  hash: string
): Promise<CachedResult | null> {
  try {
    const db = getDb();
    const cacheRef = doc(db, CACHE_COLLECTION, hash);
    const cacheDoc = await getDoc(cacheRef);

    if (!cacheDoc.exists()) {
      return null;
    }

    const data = cacheDoc.data();
    const cachedAt = data.cachedAt?.toDate();
    
    // Check if cache is expired
    if (cachedAt) {
      const ageInDays = (Date.now() - cachedAt.getTime()) / (1000 * 60 * 60 * 24);
      if (ageInDays > CACHE_TTL_DAYS) {
        console.log(`[Cache] Cache expired (${ageInDays.toFixed(1)} days old)`);
        return null;
      }
    }

    return {
      tileUrl: data.tileUrl,
      minValue: data.minValue,
      maxValue: data.maxValue,
      meanValue: data.meanValue,
      date: data.date,
      indexType: data.indexType,
      cachedAt: cachedAt || new Date(),
      imageDate: data.imageDate || data.date,
      hash: hash,
    } as CachedResult;
  } catch (error: any) {
    console.error("[Cache] Error reading from cache:", error);
    return null; // Return null on error to allow processing to continue
  }
}

/**
 * Store result in cache
 */
export async function setCachedResult(
  hash: string,
  key: CacheKey,
  result: SatelliteImageResponse,
  imageDate: string // Date of the satellite image used
): Promise<void> {
  try {
    const db = getDb();
    const cacheRef = doc(db, CACHE_COLLECTION, hash);

    await setDoc(
      cacheRef,
      {
        ...result,
        imageDate: imageDate,
        cachedAt: Timestamp.now(),
        hash: hash,
        // Store coordinates for debugging/cleanup purposes
        coordinates: key.coordinates,
        indexType: key.indexType,
        cloudCoverage: key.cloudCoverage,
      },
      { merge: false } // Overwrite existing cache
    );

    console.log(`[Cache] Stored result in cache with hash: ${hash.substring(0, 8)}...`);
  } catch (error: any) {
    console.error("[Cache] Error storing in cache:", error);
    // Don't throw - caching failure shouldn't block the request
  }
}

/**
 * Get cache statistics (useful for monitoring)
 */
export async function getCacheStats(): Promise<{
  totalEntries: number;
  oldestEntry?: Date;
  newestEntry?: Date;
}> {
  // This would require a query - for now just return basic info
  // Can be enhanced later with proper queries
  return {
    totalEntries: 0,
  };
}


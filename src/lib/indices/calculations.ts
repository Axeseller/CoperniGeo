import * as ee from "@google/earthengine";
import { IndexType } from "@/types/report";

/**
 * Calculate NDVI (Normalized Difference Vegetation Index)
 * Formula: (NIR - Red) / (NIR + Red)
 * Sentinel-2 bands: NIR = B8, Red = B4
 */
export function calculateNDVI(image: ee.Image): ee.Image {
  const nir = image.select("B8");
  const red = image.select("B4");
  return nir.subtract(red).divide(nir.add(red)).rename("NDVI");
}

/**
 * Calculate NDRE (Normalized Difference Red Edge)
 * Formula: (NIR - Red Edge) / (NIR + Red Edge)
 * Sentinel-2 bands: NIR = B8, Red Edge = B5
 */
export function calculateNDRE(image: ee.Image): ee.Image {
  const nir = image.select("B8");
  const redEdge = image.select("B5");
  return nir.subtract(redEdge).divide(nir.add(redEdge)).rename("NDRE");
}

/**
 * Calculate EVI (Enhanced Vegetation Index)
 * Formula: 2.5 * ((NIR - Red) / (NIR + 6*Red - 7.5*Blue + 1))
 * Sentinel-2 bands: NIR = B8, Red = B4, Blue = B2
 */
export function calculateEVI(image: ee.Image): ee.Image {
  const nir = image.select("B8");
  const red = image.select("B4");
  const blue = image.select("B2");
  const numerator = nir.subtract(red);
  const denominator = nir.add(red.multiply(6)).subtract(blue.multiply(7.5)).add(1);
  return numerator.divide(denominator).multiply(2.5).rename("EVI");
}

/**
 * Calculate the specified index for an image
 */
export function calculateIndex(image: ee.Image, indexType: IndexType): ee.Image {
  switch (indexType) {
    case "NDVI":
      return calculateNDVI(image);
    case "NDRE":
      return calculateNDRE(image);
    case "EVI":
      return calculateEVI(image);
    default:
      throw new Error(`Unknown index type: ${indexType}`);
  }
}

/**
 * Get Sentinel-2 collection with cloud masking and filtering
 * Fetches the most recent data (last 60 days) to reduce GEE costs
 * Sentinel-2 revisits every 5 days, so 60 days gives plenty of coverage
 */
export function getSentinel2Collection(cloudCoverage: number): ee.ImageCollection {
  // Reduced to 60 days to minimize collection size and reduce GEE costs
  // Sentinel-2 revisits every 5 days, so 60 days provides 12+ revisits
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 60); // Look back 60 days (reduced from 90)
  
  const startDateStr = startDate.toISOString().split("T")[0];
  const endDateStr = endDate.toISOString().split("T")[0];
  
  const collection = ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
    .filterDate(startDateStr, endDateStr)
    .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", cloudCoverage));

  // Apply cloud masking for better quality
  return collection.map((image: ee.Image) => {
    const cloudMask = image.select("QA60");
    const clouds = cloudMask.bitwiseAnd(1024).or(cloudMask.bitwiseAnd(2048));
    return image.updateMask(clouds.not());
  });
}

/**
 * Get the most recent image from a collection
 */
export function getMostRecentImage(collection: ee.ImageCollection): ee.Image {
  return collection.sort("system:time_start", false).first();
}

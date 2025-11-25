/**
 * Calculate the area of a polygon using the Shoelace formula (for Earth's surface)
 * Uses the Haversine formula to account for Earth's curvature
 * 
 * @param coordinates Array of {lat, lng} coordinates defining the polygon
 * @returns Area in square meters
 */
export function calculatePolygonArea(coordinates: { lat: number; lng: number }[]): number {
  if (coordinates.length < 3) {
    return 0;
  }

  // Earth's radius in meters
  const EARTH_RADIUS = 6378137;

  // Convert degrees to radians
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  let area = 0;

  // Use the Spherical Excess method for accurate area calculation on a sphere
  for (let i = 0; i < coordinates.length; i++) {
    const p1 = coordinates[i];
    const p2 = coordinates[(i + 1) % coordinates.length];

    const lat1 = toRad(p1.lat);
    const lat2 = toRad(p2.lat);
    const lng1 = toRad(p1.lng);
    const lng2 = toRad(p2.lng);

    // Haversine formula component
    area += (lng2 - lng1) * (2 + Math.sin(lat1) + Math.sin(lat2));
  }

  area = Math.abs((area * EARTH_RADIUS * EARTH_RADIUS) / 2);

  return area;
}

/**
 * Convert square meters to square kilometers
 */
export function squareMetersToKm(sqMeters: number): number {
  return sqMeters / 1_000_000;
}

/**
 * Convert square meters to hectares
 */
export function squareMetersToHectares(sqMeters: number): number {
  return sqMeters / 10_000;
}

/**
 * Format area for display with appropriate units
 */
export function formatArea(coordinates: { lat: number; lng: number }[]): {
  km2: string;
  hectares: string;
} {
  const areaSqMeters = calculatePolygonArea(coordinates);
  const areaKm2 = squareMetersToKm(areaSqMeters);
  const areaHectares = squareMetersToHectares(areaSqMeters);

  return {
    km2: areaKm2.toFixed(2),
    hectares: areaHectares.toFixed(2),
  };
}


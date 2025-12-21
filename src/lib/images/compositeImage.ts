import sharp from 'sharp';

/**
 * Calculate bounding box from polygon coordinates
 */
export function calculateBoundingBox(
  coordinates: { lat: number; lng: number }[],
  paddingPercent: number = 5
): { minLat: number; maxLat: number; minLng: number; maxLng: number } {
  if (coordinates.length === 0) {
    throw new Error('Cannot calculate bounding box for empty coordinates');
  }

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

  // Add padding
  const latPadding = (maxLat - minLat) * (paddingPercent / 100);
  const lngPadding = (maxLng - minLng) * (paddingPercent / 100);

  return {
    minLat: minLat - latPadding,
    maxLat: maxLat + latPadding,
    minLng: minLng - lngPadding,
    maxLng: maxLng + lngPadding,
  };
}

/**
 * Calculate the optimal zoom level for a bounding box to fit in given dimensions
 */
function calculateZoomLevel(
  bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number },
  width: number,
  height: number
): number {
  const WORLD_DIM = 256;
  const ZOOM_MAX = 21;

  const latRange = bounds.maxLat - bounds.minLat;
  const lngRange = bounds.maxLng - bounds.minLng;

  // Calculate zoom for longitude
  const lngZoom = Math.log2((width * 360) / (lngRange * WORLD_DIM));
  
  // Calculate zoom for latitude (accounting for Mercator projection)
  const latRad1 = bounds.minLat * Math.PI / 180;
  const latRad2 = bounds.maxLat * Math.PI / 180;
  const yMin = Math.log(Math.tan(Math.PI / 4 + latRad1 / 2));
  const yMax = Math.log(Math.tan(Math.PI / 4 + latRad2 / 2));
  const yRange = Math.abs(yMax - yMin);
  const latZoom = Math.log2((height * 2 * Math.PI) / (yRange * WORLD_DIM));

  // Use the smaller zoom to ensure everything fits, then floor it
  const zoom = Math.min(lngZoom, latZoom, ZOOM_MAX);
  return Math.floor(zoom);
}

/**
 * Calculate the exact geographic bounds that Google Maps will return
 * for a given center, zoom, and image size
 */
function calculateGoogleMapsBounds(
  centerLat: number,
  centerLng: number,
  zoom: number,
  width: number,
  height: number
): { minLat: number; maxLat: number; minLng: number; maxLng: number } {
  const WORLD_DIM = 256;
  const scale = Math.pow(2, zoom);
  
  // Convert center to pixel coordinates
  const centerX = ((centerLng + 180) / 360) * WORLD_DIM * scale;
  const latRad = centerLat * Math.PI / 180;
  const centerY = (1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * WORLD_DIM * scale;
  
  // Calculate corner pixels
  const minX = centerX - width / 2;
  const maxX = centerX + width / 2;
  const minY = centerY - height / 2;
  const maxY = centerY + height / 2;
  
  // Convert back to lat/lng
  const minLng = (minX / (WORLD_DIM * scale)) * 360 - 180;
  const maxLng = (maxX / (WORLD_DIM * scale)) * 360 - 180;
  
  const n1 = Math.PI - 2 * Math.PI * minY / (WORLD_DIM * scale);
  const maxLat = 180 / Math.PI * Math.atan(0.5 * (Math.exp(n1) - Math.exp(-n1)));
  
  const n2 = Math.PI - 2 * Math.PI * maxY / (WORLD_DIM * scale);
  const minLat = 180 / Math.PI * Math.atan(0.5 * (Math.exp(n2) - Math.exp(-n2)));
  
  return { minLat, maxLat, minLng, maxLng };
}

/**
 * Fetch Google Maps Static API satellite image with exact bounds calculation
 * Returns both the image buffer and the exact geographic bounds
 */
export async function fetchGoogleMapsSatelliteWithBounds(
  coordinates: { lat: number; lng: number }[],
  targetSize: number = 1200
): Promise<{ buffer: Buffer; bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number }; width: number; height: number }> {
  // Try server-side key first (unrestricted), fall back to client-side key
  let apiKey = process.env.GOOGLE_MAPS_SERVER_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  
  if (!apiKey) {
    throw new Error('Google Maps API key is not configured');
  }
  apiKey = apiKey.trim();
  
  console.log(`[GoogleMaps] Using API key: ${apiKey.substring(0, 10)}... (length: ${apiKey.length})`);

  // Calculate initial bounds from polygon with padding
  const initialBounds = calculateBoundingBox(coordinates, 5);
  
  // Calculate center
  const centerLat = (initialBounds.minLat + initialBounds.maxLat) / 2;
  const centerLng = (initialBounds.minLng + initialBounds.maxLng) / 2;
  
  // Google Maps max size is 640x640 with scale=2 = 1280x1280
  const maxGoogleSize = 640;
  const scale = 2;
  
  // Calculate aspect ratio from bounds
  const latRange = initialBounds.maxLat - initialBounds.minLat;
  const lngRange = initialBounds.maxLng - initialBounds.minLng;
  const avgLat = centerLat;
  const latDistortion = Math.cos(avgLat * Math.PI / 180);
  const aspectRatio = (lngRange * latDistortion) / latRange; // width/height in real world
  
  // Calculate dimensions maintaining aspect ratio
  let width: number, height: number;
  if (aspectRatio > 1) {
    // Wider than tall
    width = Math.min(maxGoogleSize, Math.round(targetSize / scale));
    height = Math.round(width / aspectRatio);
  } else {
    // Taller than wide
    height = Math.min(maxGoogleSize, Math.round(targetSize / scale));
    width = Math.round(height * aspectRatio);
  }
  
  // Ensure within limits
  width = Math.max(100, Math.min(maxGoogleSize, width));
  height = Math.max(100, Math.min(maxGoogleSize, height));
  
  // Calculate zoom level
  const zoom = calculateZoomLevel(initialBounds, width * scale, height * scale);
  
  // Calculate the EXACT bounds Google Maps will return
  const exactBounds = calculateGoogleMapsBounds(centerLat, centerLng, zoom, width * scale, height * scale);
  
  console.log(`[GoogleMaps] Center: ${centerLat.toFixed(6)}, ${centerLng.toFixed(6)}`);
  console.log(`[GoogleMaps] Zoom: ${zoom}, Size: ${width}x${height} (scale ${scale} = ${width*scale}x${height*scale})`);
  console.log(`[GoogleMaps] Exact bounds: [${exactBounds.minLng.toFixed(6)}, ${exactBounds.minLat.toFixed(6)}, ${exactBounds.maxLng.toFixed(6)}, ${exactBounds.maxLat.toFixed(6)}]`);

  // Fetch from Google Maps using center and zoom (not visible)
  const url = new URL('https://maps.googleapis.com/maps/api/staticmap');
  url.searchParams.set('center', `${centerLat},${centerLng}`);
  url.searchParams.set('zoom', zoom.toString());
  url.searchParams.set('size', `${width}x${height}`);
  url.searchParams.set('scale', scale.toString());
  url.searchParams.set('maptype', 'satellite');
  url.searchParams.set('key', apiKey);

  console.log(`[GoogleMaps] URL: ${url.toString().substring(0, 150)}...`);

  const response = await fetch(url.toString());
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google Maps API error: ${response.status} - ${errorText.substring(0, 200)}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  
  console.log(`[GoogleMaps] ✅ Satellite image fetched (${buffer.length} bytes)`);
  
  return {
    buffer,
    bounds: exactBounds,
    width: width * scale,
    height: height * scale,
  };
}

/**
 * Convert lat/lng coordinates to pixel coordinates within image bounds
 */
function latLngToPixel(
  lat: number,
  lng: number,
  bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number },
  imageWidth: number,
  imageHeight: number
): { x: number; y: number } {
  // Normalize coordinates to 0-1 range
  const normalizedX = (lng - bounds.minLng) / (bounds.maxLng - bounds.minLng);
  const normalizedY = (bounds.maxLat - lat) / (bounds.maxLat - bounds.minLat); // Inverted Y axis

  // Convert to pixel coordinates
  const x = Math.round(normalizedX * imageWidth);
  const y = Math.round(normalizedY * imageHeight);

  return { x, y };
}

/**
 * Generate polygon mask as raw pixels for reliable masking
 * Returns a PNG where white (255) = inside polygon, black (0) = outside
 */
async function generatePolygonMaskBuffer(
  coordinates: { lat: number; lng: number }[],
  bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number },
  imageWidth: number,
  imageHeight: number
): Promise<Buffer> {
  const points = coordinates.map((coord) => {
    const pixel = latLngToPixel(coord.lat, coord.lng, bounds, imageWidth, imageHeight);
    return `${pixel.x},${pixel.y}`;
  }).join(' ');

  // Create SVG mask with explicit BLACK background and WHITE polygon
  // This ensures clear 0/255 values when we extract the red channel
  const svg = `
    <svg width="${imageWidth}" height="${imageHeight}" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="${imageWidth}" height="${imageHeight}" fill="black"/>
      <polygon points="${points}" fill="white"/>
    </svg>
  `;

  // Render SVG to PNG
  const maskPng = await sharp(Buffer.from(svg))
    .png()
    .toBuffer();
  
  return maskPng;
}

/**
 * Generate SVG polygon outline (just the border)
 */
function generatePolygonSVG(
  coordinates: { lat: number; lng: number }[],
  bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number },
  imageWidth: number,
  imageHeight: number,
  color: string = '#5db815',
  strokeWidth: number = 4
): string {
  const points = coordinates.map((coord) => {
    const pixel = latLngToPixel(coord.lat, coord.lng, bounds, imageWidth, imageHeight);
    return `${pixel.x},${pixel.y}`;
  }).join(' ');

  const svg = `
    <svg width="${imageWidth}" height="${imageHeight}" xmlns="http://www.w3.org/2000/svg">
      <polygon points="${points}" 
               fill="none" 
               stroke="${color}" 
               stroke-width="${strokeWidth}" 
               stroke-linejoin="round"/>
    </svg>
  `;

  return svg;
}

/**
 * Composite index overlay on base satellite image with polygon outline
 * Both images MUST be from Earth Engine with the same bounding box and dimensions
 */
export async function compositeIndexOverlay(
  baseImageBuffer: Buffer,
  overlayImageBuffer: Buffer,
  coordinates: { lat: number; lng: number }[],
  opacity: number = 0.7,
  polygonColor: string = '#5db815'
): Promise<Buffer> {
  try {
    console.log(`[Composite] Starting Earth Engine image composition...`);
    
    // Get base image metadata
    const baseImage = sharp(baseImageBuffer);
    const baseMetadata = await baseImage.metadata();
    const imageWidth = baseMetadata.width || 1200;
    const imageHeight = baseMetadata.height || 1200;
    
    console.log(`[Composite] Base image dimensions: ${imageWidth}x${imageHeight}`);

    // Get overlay metadata to verify dimensions match
    const overlayMetadata = await sharp(overlayImageBuffer).metadata();
    console.log(`[Composite] Overlay dimensions: ${overlayMetadata.width}x${overlayMetadata.height}`);
    
    // Both images should have identical dimensions since they're from Earth Engine with same params
    // But resize anyway to be safe
    const resizedOverlay = await sharp(overlayImageBuffer)
      .resize(imageWidth, imageHeight, { fit: 'fill' })
      .toBuffer();

    console.log(`[Composite] Overlay resized to match base image`);

    // Calculate bounding box with 5% padding - SAME as Earth Engine generation
    // This is critical for alignment!
    const bounds = calculateBoundingBox(coordinates, 5);

    // Generate polygon outline
    const polygonSVG = generatePolygonSVG(
      coordinates,
      bounds,
      imageWidth,
      imageHeight,
      polygonColor,
      Math.max(3, Math.round(imageWidth / 300)) // Scale stroke width with image size
    );

    console.log(`[Composite] Generated polygon outline`);

    // Apply opacity to overlay and mask it to only show inside polygon
    const overlayWithOpacity = await sharp(resizedOverlay)
      .ensureAlpha()
      .modulate({ brightness: 1 })
      .toBuffer()
      .then(async (buf) => {
        // Adjust alpha channel to achieve opacity
        const img = sharp(buf);
        const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
        
        // Modify alpha channel (every 4th byte in RGBA)
        for (let i = 3; i < data.length; i += 4) {
          data[i] = Math.round(data[i] * opacity);
        }
        
        return sharp(data, {
          raw: {
            width: info.width,
            height: info.height,
            channels: 4,
          },
        }).png().toBuffer();
      });

    console.log(`[Composite] Applied ${opacity} opacity to overlay`);
    
    // Generate polygon mask - extract the alpha channel we'll use for masking
    const maskPngBuffer = await generatePolygonMaskBuffer(
      coordinates,
      bounds,
      imageWidth,
      imageHeight
    );
    
    // Extract the red channel from mask PNG as grayscale (white polygon = 255, black bg = 0)
    const maskData = await sharp(maskPngBuffer)
      .extractChannel('red')
      .raw()
      .toBuffer();
    
    // Debug: count white vs black pixels in mask
    let whitePixels = 0;
    let blackPixels = 0;
    for (let i = 0; i < maskData.length; i++) {
      if (maskData[i] > 128) whitePixels++;
      else blackPixels++;
    }
    console.log(`[Composite] Mask data: ${maskData.length} pixels, ${whitePixels} inside polygon, ${blackPixels} outside`);
    
    // Get the overlay with opacity as RGBA raw data
    const overlayData = await sharp(overlayWithOpacity)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    
    // Apply mask: multiply each pixel's alpha by the mask value
    const maskedData = Buffer.alloc(overlayData.data.length);
    for (let i = 0; i < overlayData.data.length; i += 4) {
      const pixelIndex = i / 4;
      const maskValue = maskData[pixelIndex] || 0;
      
      // Copy RGB channels
      maskedData[i] = overlayData.data[i];     // R
      maskedData[i + 1] = overlayData.data[i + 1]; // G
      maskedData[i + 2] = overlayData.data[i + 2]; // B
      
      // Multiply alpha by mask (mask is 0-255, alpha is 0-255)
      // If mask is 255 (white/inside polygon), keep full alpha
      // If mask is 0 (black/outside polygon), set alpha to 0
      maskedData[i + 3] = Math.round((overlayData.data[i + 3] * maskValue) / 255);
    }
    
    // Convert back to PNG
    const maskedOverlay = await sharp(maskedData, {
      raw: {
        width: overlayData.info.width,
        height: overlayData.info.height,
        channels: 4,
      },
    }).png().toBuffer();
    
    console.log(`[Composite] Applied polygon mask to overlay (only shows inside AOI)`);

    // Final composite: base + masked overlay + polygon outline
    const finalImage = await sharp(baseImageBuffer)
      .composite([
        {
          input: maskedOverlay, // Use masked overlay instead of full overlay
          blend: 'over',
        },
        {
          input: Buffer.from(polygonSVG),
          blend: 'over',
        },
      ])
      .png()
      .toBuffer();

    console.log(`[Composite] ✅ Composite image created successfully (${finalImage.length} bytes)`);

    return finalImage;
  } catch (error: any) {
    console.error('[Composite] Error creating composite image:', error.message);
    throw new Error(`Failed to create composite image: ${error.message}`);
  }
}

/**
 * Note: Google Maps fetching functions (fetchGoogleMapsSatelliteImage, generateCompositeReportImage)
 * are kept for backward compatibility but are no longer used.
 * All composite images now use Earth Engine for both base and overlay for perfect alignment.
 */

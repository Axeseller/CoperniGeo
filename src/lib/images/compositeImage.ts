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
 * Fetch Google Maps Static API satellite image for bounding box
 * Calculates proper dimensions to match Earth Engine's aspect ratio
 * @param bounds - The bounding box to fetch
 * @param maxDimension - The maximum dimension (like Earth Engine's dimensions: 1200)
 */
export async function fetchGoogleMapsSatelliteImage(
  bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number },
  maxDimension: number = 1200
): Promise<Buffer> {
  // Try server-side key first (unrestricted), fall back to client-side key
  let apiKey = process.env.GOOGLE_MAPS_SERVER_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  
  if (!apiKey) {
    throw new Error('Google Maps API key is not configured (need GOOGLE_MAPS_SERVER_API_KEY or NEXT_PUBLIC_GOOGLE_MAPS_API_KEY)');
  }
  
  // Trim whitespace and validate key
  apiKey = apiKey.trim();
  
  if (apiKey.length < 30) {
    console.error(`[Composite] API key appears truncated or invalid. Length: ${apiKey.length}, Key: ${apiKey}`);
    throw new Error(`Google Maps API key appears invalid (too short: ${apiKey.length} characters)`);
  }
  
  console.log(`[Composite] Using API key: ${apiKey.substring(0, 10)}... (length: ${apiKey.length})`);

  // Calculate width and height based on bounding box aspect ratio
  // This matches how Earth Engine calculates dimensions with 'dimensions: 1200'
  const latRange = bounds.maxLat - bounds.minLat;
  const lngRange = bounds.maxLng - bounds.minLng;
  
  // Account for latitude distortion (at equator, 1 degree lng = 1 degree lat in meters)
  // As we move away from equator, longitude degrees become smaller
  const avgLat = (bounds.maxLat + bounds.minLat) / 2;
  const latDistortion = Math.cos(avgLat * Math.PI / 180);
  const adjustedLngRange = lngRange * latDistortion;
  
  // Determine which dimension should be the max
  let width: number, height: number;
  if (adjustedLngRange > latRange) {
    // Wider than tall
    width = maxDimension;
    height = Math.round(maxDimension * (latRange / adjustedLngRange));
  } else {
    // Taller than wide
    height = maxDimension;
    width = Math.round(maxDimension * (adjustedLngRange / latRange));
  }
  
  // Google Maps Static API max size is 640x640 (or 1280x1280 with scale=2)
  // We'll use scale=2 to get up to 1280x1280
  const maxGoogleSize = 640; // Will be doubled with scale=2
  const scale = 2;
  
  // Cap dimensions proportionally to Google's limits
  const maxDim = Math.max(width, height);
  if (maxDim > maxGoogleSize) {
    const ratio = maxGoogleSize / maxDim;
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
  }
  
  // Ensure minimum dimensions
  width = Math.max(100, width);
  height = Math.max(100, height);
  
  console.log(`[Composite] Calculated dimensions: ${width}x${height} (scale ${scale} = ${width*scale}x${height*scale})`);

  // Use 'visible' parameter to force Google Maps to show the exact bounding box
  const url = new URL('https://maps.googleapis.com/maps/api/staticmap');
  
  // Set visible parameter with all four corners of the bounding box
  const visiblePath = `${bounds.minLat},${bounds.minLng}|${bounds.maxLat},${bounds.maxLng}`;
  url.searchParams.set('visible', visiblePath);
  
  url.searchParams.set('size', `${width}x${height}`);
  url.searchParams.set('scale', scale.toString());
  url.searchParams.set('maptype', 'satellite');
  url.searchParams.set('key', apiKey);

  console.log(`[Composite] Fetching Google Maps for exact bounds: [${bounds.minLng}, ${bounds.minLat}, ${bounds.maxLng}, ${bounds.maxLat}]`);
  console.log(`[Composite] Google Maps URL: ${url.toString().substring(0, 150)}...`);

  try {
    const response = await fetch(url.toString());
    
    if (!response.ok) {
      // Get the actual error response from Google Maps API
      const errorText = await response.text();
      console.error('[Composite] Google Maps API error response:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
        url: url.toString().replace(apiKey, 'API_KEY_HIDDEN')
      });
      
      // Parse common Google Maps API errors
      if (response.status === 403) {
        if (errorText.includes('billing')) {
          throw new Error(`Google Maps API billing not enabled. Please enable billing in Google Cloud Console.`);
        } else if (errorText.includes('REQUEST_DENIED')) {
          throw new Error(`Google Maps API request denied. Error: ${errorText}`);
        } else {
          throw new Error(`Google Maps API 403 Forbidden. Response: ${errorText.substring(0, 200)}`);
        }
      }
      
      throw new Error(`Google Maps API error: ${response.status} ${response.statusText} - ${errorText.substring(0, 200)}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    console.log(`[Composite] ✅ Google Maps satellite image fetched (${buffer.length} bytes)`);
    return buffer;
  } catch (error: any) {
    console.error('[Composite] Failed to fetch Google Maps satellite image:', error.message);
    throw new Error(`Failed to fetch satellite base image: ${error.message}`);
  }
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

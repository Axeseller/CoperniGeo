import { getAdminStorage } from '@/lib/firebase-admin';
import { createHash } from 'crypto';

/**
 * Check if a file exists in Firebase Storage
 */
async function fileExists(path: string): Promise<boolean> {
  try {
    const storage = getAdminStorage();
    const bucket = storage.bucket();
    const file = bucket.file(path);
    const [exists] = await file.exists();
    console.log(`[Admin Storage] File existence check for ${path}: ${exists}`);
    return exists;
  } catch (error: any) {
    console.error(`[Admin Storage] Error checking file existence:`, error.message);
    return false;
  }
}

/**
 * Get public URL for an existing file in Firebase Storage
 */
async function getFileUrl(path: string): Promise<string> {
  const storage = getAdminStorage();
  const bucket = storage.bucket();
  return `https://storage.googleapis.com/${bucket.name}/${path}`;
}

/**
 * Delete all existing images with matching area/index prefix
 * This ensures old cached images are removed before uploading new ones
 */
async function deleteExistingImages(
  areaName: string,
  indexType: string
): Promise<void> {
  try {
    const storage = getAdminStorage();
    const bucket = storage.bucket();
    const safeAreaName = areaName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
    const prefix = `email-images/${safeAreaName}-${indexType.toLowerCase()}-`;
    
    console.log(`[Admin Storage] Deleting old images with prefix: ${prefix}`);
    
    // List all files with this prefix
    const [files] = await bucket.getFiles({ prefix });
    
    if (files && files.length > 0) {
      console.log(`[Admin Storage] Found ${files.length} old image(s) to delete`);
      
      // Delete all matching files
      await Promise.all(files.map(file => file.delete()));
      
      console.log(`[Admin Storage] ✅ Deleted ${files.length} old image(s)`);
    } else {
      console.log(`[Admin Storage] No old images found to delete`);
    }
  } catch (error: any) {
    console.error(`[Admin Storage] Error deleting old images:`, error.message);
    // Don't throw - continue with upload even if deletion fails
  }
}

/**
 * Generate a deterministic path based on image content hash
 * This allows us to reuse images with the same content
 */
function generateImagePath(areaName: string, indexType: string, imageBuffer: Buffer): string {
  // Create hash of image content for deduplication
  const contentHash = createHash('sha256').update(imageBuffer).digest('hex').substring(0, 16);
  const safeAreaName = areaName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
  return `email-images/${safeAreaName}-${indexType.toLowerCase()}-${contentHash}.png`;
}

/**
 * Upload a file to Firebase Storage using Admin SDK (server-side only)
 * Returns a public URL that can be used in emails
 * Checks if file already exists to avoid duplicate uploads
 */
export async function uploadFileAdmin(
  fileBuffer: Buffer,
  path: string,
  contentType: string = 'image/png'
): Promise<string> {
  try {
    const storage = getAdminStorage();
    const bucket = storage.bucket();
    const file = bucket.file(path);

    // Check if file already exists
    const exists = await fileExists(path);
    if (exists) {
      console.log(`[Admin Storage] ✅ File already exists, skipping upload: ${path}`);
      return await getFileUrl(path);
    }

    // Upload the file
    await file.save(fileBuffer, {
      contentType,
      metadata: {
        cacheControl: 'public, max-age=31536000', // Cache for 1 year
      },
    });

    // Make the file publicly accessible
    await file.makePublic();

    // Get the public URL
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${path}`;
    
    console.log(`[Admin Storage] ✅ File uploaded successfully: ${path}`);
    return publicUrl;
  } catch (error: any) {
    console.error(`[Admin Storage] ❌ Upload failed:`, error.message);
    throw new Error(`Failed to upload file to Firebase Storage: ${error.message}`);
  }
}

/**
 * Upload image with content-based deduplication
 * Deletes old images first to ensure fresh content
 */
export async function uploadImageWithDedup(
  imageBuffer: Buffer,
  areaName: string,
  indexType: string,
  contentType: string = 'image/png'
): Promise<string> {
  // Delete any old images for this area/index to avoid serving stale cached versions
  await deleteExistingImages(areaName, indexType);
  
  // Generate content-based path and upload new image
  const path = generateImagePath(areaName, indexType, imageBuffer);
  console.log(`[Admin Storage] Generated new path for upload: ${path}`);
  return await uploadFileAdmin(imageBuffer, path, contentType);
}

/**
 * Delete a file from Firebase Storage (cleanup)
 */
export async function deleteFileAdmin(path: string): Promise<void> {
  try {
    const storage = getAdminStorage();
    const bucket = storage.bucket();
    const file = bucket.file(path);

    await file.delete();
    console.log(`[Admin Storage] ✅ File deleted: ${path}`);
  } catch (error: any) {
    console.error(`[Admin Storage] ⚠️ Delete failed:`, error.message);
    // Don't throw - deletion failures are non-critical
  }
}


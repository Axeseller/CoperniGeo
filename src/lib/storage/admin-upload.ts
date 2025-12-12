import { getAdminStorage } from '@/lib/firebase-admin';

/**
 * Upload a file to Firebase Storage using Admin SDK (server-side only)
 * Returns a public URL that can be used in emails
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


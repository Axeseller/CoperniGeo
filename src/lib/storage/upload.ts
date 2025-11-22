import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getStorageInstance } from "@/lib/firebase";

/**
 * Upload a file to Firebase Storage
 */
export async function uploadFile(
  file: Buffer | Uint8Array,
  path: string,
  contentType: string = "application/pdf"
): Promise<string> {
  const storage = getStorageInstance();
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file, { contentType });
  return await getDownloadURL(storageRef);
}

/**
 * Get download URL for a file in Firebase Storage
 */
export async function getFileUrl(path: string): Promise<string> {
  const storage = getStorageInstance();
  const storageRef = ref(storage, path);
  return await getDownloadURL(storageRef);
}


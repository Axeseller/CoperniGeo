import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getAdminApp } from '@/lib/firebase-admin';

/**
 * Get Firestore instance using Admin SDK (server-side only)
 */
function getAdminFirestore() {
  return getFirestore(getAdminApp());
}

const SHORT_LINKS_COLLECTION = 'shortLinks';

export interface ShortLink {
  id?: string;
  code: string;
  longUrl: string;
  reportId?: string;
  createdAt: Date | Timestamp;
  clicks?: number;
  lastClickedAt?: Date | Timestamp;
}

/**
 * Generate a random short code (alphanumeric, 8 characters)
 * Format: abcde123 (lowercase letters + numbers)
 */
function generateShortCode(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Create a short link and store it in Firestore
 * @param longUrl The URL to shorten
 * @param reportId Optional report ID for tracking
 * @returns The short code
 */
export async function createShortLink(
  longUrl: string,
  reportId?: string
): Promise<string> {
  try {
    const db = getAdminFirestore();
    
    // Generate a unique code (retry if collision occurs)
    let code: string;
    let attempts = 0;
    const maxAttempts = 10;
    
    do {
      code = generateShortCode();
      attempts++;
      
      // Check if code already exists
      const existingDoc = await db
        .collection(SHORT_LINKS_COLLECTION)
        .where('code', '==', code)
        .limit(1)
        .get();
      
      if (existingDoc.empty) {
        break; // Code is unique
      }
      
      if (attempts >= maxAttempts) {
        throw new Error('Failed to generate unique short code after multiple attempts');
      }
    } while (true);
    
    // Create the short link document
    const shortLinkData: Omit<ShortLink, 'id'> = {
      code,
      longUrl,
      createdAt: Timestamp.now(),
      clicks: 0,
    };
    
    if (reportId) {
      shortLinkData.reportId = reportId;
    }
    
    await db.collection(SHORT_LINKS_COLLECTION).add(shortLinkData);
    
    console.log(`[Short Links] ✅ Created short link: ${code} -> ${longUrl}`);
    return code;
  } catch (error: any) {
    console.error(`[Short Links] ❌ Error creating short link:`, error.message);
    throw error;
  }
}

/**
 * Get a short link by code and increment click count
 * @param code The short code
 * @returns The long URL, or null if not found
 */
export async function getShortLinkAndTrack(code: string): Promise<string | null> {
  try {
    console.log(`[Short Links] Looking up code: ${code}`);
    const db = getAdminFirestore();
    
    // Find the short link by code
    console.log(`[Short Links] Querying Firestore collection: ${SHORT_LINKS_COLLECTION}`);
    const querySnapshot = await db
      .collection(SHORT_LINKS_COLLECTION)
      .where('code', '==', code)
      .limit(1)
      .get();
    
    console.log(`[Short Links] Query returned ${querySnapshot.size} document(s)`);
    
    if (querySnapshot.empty) {
      console.log(`[Short Links] ⚠️ Code not found in database: ${code}`);
      // Debug: Check if any documents exist in the collection
      const allDocs = await db.collection(SHORT_LINKS_COLLECTION).limit(5).get();
      console.log(`[Short Links] Debug: Collection has ${allDocs.size} total document(s)`);
      if (allDocs.size > 0) {
        allDocs.docs.forEach((doc, idx) => {
          const data = doc.data();
          console.log(`[Short Links] Debug doc ${idx + 1}: code=${data.code}, longUrl=${data.longUrl?.substring(0, 50)}...`);
        });
      }
      return null;
    }
    
    const doc = querySnapshot.docs[0];
    const data = doc.data() as ShortLink;
    
    console.log(`[Short Links] Found document: code=${data.code}, longUrl=${data.longUrl?.substring(0, 50)}...`);
    
    // Increment click count and update last clicked timestamp
    await doc.ref.update({
      clicks: (data.clicks || 0) + 1,
      lastClickedAt: Timestamp.now(),
    });
    
    console.log(`[Short Links] ✅ Redirecting ${code} -> ${data.longUrl} (clicks: ${(data.clicks || 0) + 1})`);
    return data.longUrl;
  } catch (error: any) {
    console.error(`[Short Links] ❌ Error getting short link:`);
    console.error(`[Short Links] Error message: ${error.message}`);
    console.error(`[Short Links] Error code: ${error.code || 'N/A'}`);
    console.error(`[Short Links] Error stack: ${error.stack || 'N/A'}`);
    throw error;
  }
}

/**
 * Get short link data without tracking (for admin purposes)
 */
export async function getShortLink(code: string): Promise<ShortLink | null> {
  try {
    const db = getAdminFirestore();
    
    const querySnapshot = await db
      .collection(SHORT_LINKS_COLLECTION)
      .where('code', '==', code)
      .limit(1)
      .get();
    
    if (querySnapshot.empty) {
      return null;
    }
    
    const doc = querySnapshot.docs[0];
    const data = doc.data();
    
    return {
      id: doc.id,
      ...data,
      createdAt: data.createdAt?.toDate(),
      lastClickedAt: data.lastClickedAt?.toDate(),
    } as ShortLink;
  } catch (error: any) {
    console.error(`[Short Links] ❌ Error getting short link data:`, error.message);
    throw error;
  }
}


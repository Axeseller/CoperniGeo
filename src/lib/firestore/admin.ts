import { getFirestore } from 'firebase-admin/firestore';
import { getAdminApp } from '@/lib/firebase-admin';
import { Area } from '@/types/area';
import { Report } from '@/types/report';

/**
 * Get Firestore instance using Admin SDK (server-side only)
 * Admin SDK bypasses security rules
 */
function getAdminFirestore() {
  return getFirestore(getAdminApp());
}

/**
 * Get a report by ID using Admin SDK (bypasses security rules)
 * For server-side use only (API routes, cron jobs, etc.)
 */
export async function getReportAdmin(reportId: string): Promise<Report | null> {
  try {
    const db = getAdminFirestore();
    const docRef = db.collection('reports').doc(reportId);
    const docSnap = await docRef.get();
    
    if (!docSnap.exists) {
      return null;
    }
    
    const data = docSnap.data();
    if (!data) return null;
    
    return {
      id: docSnap.id,
      ...data,
      lastGenerated: data.lastGenerated?.toDate(),
      nextRun: data.nextRun?.toDate(),
      createdAt: data.createdAt?.toDate(),
    } as Report;
  } catch (error: any) {
    console.error(`[Admin Firestore] Error fetching report ${reportId}:`, error.message);
    throw error;
  }
}

/**
 * Get an area by ID using Admin SDK (bypasses security rules)
 * For server-side use only (API routes, cron jobs, etc.)
 */
export async function getAreaAdmin(areaId: string): Promise<Area | null> {
  try {
    const db = getAdminFirestore();
    const docRef = db.collection('areas').doc(areaId);
    const docSnap = await docRef.get();
    
    if (!docSnap.exists) {
      return null;
    }
    
    const data = docSnap.data();
    if (!data) return null;
    
    // Handle coordinates (stored as plain objects)
    const coordinates = (data.coordinates || []).map((coord: any) => ({
      lat: coord.lat || coord.latitude || 0,
      lng: coord.lng || coord.longitude || 0,
    }));
    
    return {
      id: docSnap.id,
      name: data.name,
      userId: data.userId,
      coordinates,
      createdAt: data.createdAt?.toDate(),
      updatedAt: data.updatedAt?.toDate(),
    } as Area;
  } catch (error: any) {
    console.error(`[Admin Firestore] Error fetching area ${areaId}:`, error.message);
    throw error;
  }
}

/**
 * Mark a report as generated using Admin SDK
 * Updates lastGenerated and calculates next run date
 */
export async function markReportGeneratedAdmin(reportId: string): Promise<void> {
  try {
    const db = getAdminFirestore();
    const docRef = db.collection('reports').doc(reportId);
    
    // Get current report to calculate next run
    const docSnap = await docRef.get();
    if (!docSnap.exists) {
      throw new Error(`Report ${reportId} not found`);
    }
    
    const report = docSnap.data() as Report;
    const now = new Date();
    
    // Calculate next run date based on frequency
    const nextRun = calculateNextRun(report.frequency, now);
    
    await docRef.update({
      lastGenerated: now,
      nextRun: nextRun,
    });
    
    console.log(`[Admin Firestore] ✅ Report ${reportId} marked as generated. Next run: ${nextRun.toISOString()}`);
  } catch (error: any) {
    console.error(`[Admin Firestore] Error marking report as generated:`, error.message);
    throw error;
  }
}

/**
 * Calculate next run date based on frequency
 */
function calculateNextRun(frequency: string, lastRun: Date): Date {
  const next = new Date(lastRun);
  
  switch (frequency) {
    case "3days":
      next.setDate(next.getDate() + 3);
      break;
    case "5days":
      next.setDate(next.getDate() + 5);
      break;
    case "weekly":
      next.setDate(next.getDate() + 7);
      break;
    case "monthly":
      next.setMonth(next.getMonth() + 1);
      break;
  }
  
  return next;
}

/**
 * Get all reports that are due to run (for cron jobs)
 */
export async function getDueReportsAdmin(): Promise<Report[]> {
  try {
    const db = getAdminFirestore();
    const now = new Date();
    
    const querySnapshot = await db.collection('reports')
      .where('status', '==', 'active')
      .where('nextRun', '<=', now)
      .get();
    
    return querySnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        lastGenerated: data.lastGenerated?.toDate(),
        nextRun: data.nextRun?.toDate(),
        createdAt: data.createdAt?.toDate(),
      } as Report;
    });
  } catch (error: any) {
    console.error(`[Admin Firestore] Error fetching due reports:`, error.message);
    throw error;
  }
}

/**
 * Get user's most recent report by phone number
 * Orders by lastGenerated DESC and returns the first one
 * 
 * Handles phone number format variations:
 * - WhatsApp sends: 5213318450745 (with leading 1)
 * - Database might store: 523318450745 (without leading 1)
 */
export async function getUserMostRecentReportByPhone(phoneNumber: string): Promise<Report | null> {
  try {
    const db = getAdminFirestore();
    
    // Normalize phone number (remove non-digits)
    let normalizedPhone = phoneNumber.replace(/\D/g, "");
    
    console.log(`[Admin Firestore] Searching for phone number: ${normalizedPhone}`);
    
    // Try the number as-is first
    let querySnapshot = await db.collection('reports')
      .where('phoneNumber', '==', normalizedPhone)
      .where('deliveryMethod', '==', 'whatsapp')
      .orderBy('lastGenerated', 'desc')
      .limit(1)
      .get();
    
    // If not found and number starts with "521" (Mexico country code + 1), try removing the "1"
    // WhatsApp format: 5213318450745 -> Database format: 523318450745
    if (querySnapshot.empty && normalizedPhone.startsWith('521') && normalizedPhone.length === 13) {
      const alternativePhone = '52' + normalizedPhone.substring(3); // Remove the "1" after country code
      console.log(`[Admin Firestore] Trying alternative format: ${alternativePhone}`);
      
      try {
        querySnapshot = await db.collection('reports')
          .where('phoneNumber', '==', alternativePhone)
          .where('deliveryMethod', '==', 'whatsapp')
          .orderBy('lastGenerated', 'desc')
          .limit(1)
          .get();
      } catch (error: any) {
        // If index error, try without ordering as fallback
        if (error.message?.includes('index') || error.code === 9) {
          console.log(`[Admin Firestore] Index error, trying fallback query without ordering`);
          const allReports = await db.collection('reports')
            .where('phoneNumber', '==', alternativePhone)
            .where('deliveryMethod', '==', 'whatsapp')
            .get();
          
          if (!allReports.empty) {
            // Sort in memory by lastGenerated (or createdAt if lastGenerated doesn't exist)
            const sortedDocs = allReports.docs.sort((a, b) => {
              const aData = a.data();
              const bData = b.data();
              // Prefer lastGenerated, fallback to createdAt
              const aTime = aData.lastGenerated?.toDate()?.getTime() || 
                           aData.createdAt?.toDate()?.getTime() || 0;
              const bTime = bData.lastGenerated?.toDate()?.getTime() || 
                           bData.createdAt?.toDate()?.getTime() || 0;
              return bTime - aTime; // Descending
            });
            querySnapshot = { docs: [sortedDocs[0]], empty: false } as any;
          }
        } else {
          throw error;
        }
      }
      
      // If still empty, try fallback query without ordering (in case reports don't have lastGenerated)
      if (querySnapshot.empty) {
        console.log(`[Admin Firestore] Ordered query returned empty, trying fallback without ordering`);
        const allReports = await db.collection('reports')
          .where('phoneNumber', '==', alternativePhone)
          .where('deliveryMethod', '==', 'whatsapp')
          .get();
        
        if (!allReports.empty) {
          // Sort in memory by lastGenerated (or createdAt if lastGenerated doesn't exist)
          const sortedDocs = allReports.docs.sort((a, b) => {
            const aData = a.data();
            const bData = b.data();
            // Prefer lastGenerated, fallback to createdAt
            const aTime = aData.lastGenerated?.toDate()?.getTime() || 
                         aData.createdAt?.toDate()?.getTime() || 0;
            const bTime = bData.lastGenerated?.toDate()?.getTime() || 
                         bData.createdAt?.toDate()?.getTime() || 0;
            return bTime - aTime; // Descending
          });
          querySnapshot = { docs: [sortedDocs[0]], empty: false } as any;
          console.log(`[Admin Firestore] ✅ Found report using fallback query: ${sortedDocs[0].id}`);
        }
      }
    }
    
    // If still not found, try the reverse: if it's 12 digits starting with "52", try adding "1"
    // Database format: 523318450745 -> WhatsApp format: 5213318450745
    if (querySnapshot.empty && normalizedPhone.startsWith('52') && normalizedPhone.length === 12) {
      const alternativePhone = '521' + normalizedPhone.substring(2); // Add "1" after country code
      console.log(`[Admin Firestore] Trying alternative format: ${alternativePhone}`);
      
      querySnapshot = await db.collection('reports')
        .where('phoneNumber', '==', alternativePhone)
        .where('deliveryMethod', '==', 'whatsapp')
        .orderBy('lastGenerated', 'desc')
        .limit(1)
        .get();
    }
    
    if (querySnapshot.empty) {
      // Debug: Check if any reports exist with this phone number (without filters)
      console.log(`[Admin Firestore] No reports found for phone number: ${normalizedPhone}`);
      console.log(`[Admin Firestore] Debug: Checking if any reports exist with phone ${normalizedPhone}...`);
      
      try {
        const debugQuery = await db.collection('reports')
          .where('phoneNumber', '==', normalizedPhone)
          .limit(5)
          .get();
        
        if (!debugQuery.empty) {
          console.log(`[Admin Firestore] Debug: Found ${debugQuery.docs.length} report(s) with phone ${normalizedPhone}, but deliveryMethod filter may not match`);
          debugQuery.docs.forEach((doc, idx) => {
            const data = doc.data();
            console.log(`[Admin Firestore] Debug Report ${idx + 1}: id=${doc.id}, deliveryMethod=${data.deliveryMethod}, phoneNumber=${data.phoneNumber}`);
          });
        } else {
          // Try the alternative format
          const altPhone = normalizedPhone.startsWith('521') && normalizedPhone.length === 13 
            ? '52' + normalizedPhone.substring(3)
            : normalizedPhone.startsWith('52') && normalizedPhone.length === 12
            ? '521' + normalizedPhone.substring(2)
            : null;
          
          if (altPhone) {
            console.log(`[Admin Firestore] Debug: Trying alternative format ${altPhone}...`);
            const altDebugQuery = await db.collection('reports')
              .where('phoneNumber', '==', altPhone)
              .limit(5)
              .get();
            
            if (!altDebugQuery.empty) {
              console.log(`[Admin Firestore] Debug: Found ${altDebugQuery.docs.length} report(s) with phone ${altPhone}`);
              altDebugQuery.docs.forEach((doc, idx) => {
                const data = doc.data();
                console.log(`[Admin Firestore] Debug Report ${idx + 1}: id=${doc.id}, deliveryMethod=${data.deliveryMethod}, phoneNumber=${data.phoneNumber}`);
              });
            }
          }
        }
      } catch (debugError: any) {
        console.error(`[Admin Firestore] Debug query error:`, debugError.message);
      }
      
      return null;
    }
    
    const doc = querySnapshot.docs[0];
    const data = doc.data();
    
    console.log(`[Admin Firestore] ✅ Found report: ${doc.id} for phone: ${data.phoneNumber}`);
    
    return {
      id: doc.id,
      ...data,
      lastGenerated: data.lastGenerated?.toDate(),
      nextRun: data.nextRun?.toDate(),
      createdAt: data.createdAt?.toDate(),
    } as Report;
  } catch (error: any) {
    console.error(`[Admin Firestore] Error fetching report by phone:`, error.message);
    throw error;
  }
}

/**
 * Update a report using Admin SDK
 * For server-side use only (API routes, cron jobs, etc.)
 */
export async function updateReportAdmin(
  reportId: string,
  updates: Partial<Report>
): Promise<void> {
  try {
    const db = getAdminFirestore();
    const docRef = db.collection('reports').doc(reportId);
    
    await docRef.update(updates);
    
    console.log(`[Admin Firestore] ✅ Report ${reportId} updated successfully`);
  } catch (error: any) {
    console.error(`[Admin Firestore] Error updating report:`, error.message);
    throw error;
  }
}


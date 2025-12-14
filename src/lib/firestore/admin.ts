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
 */
export async function getUserMostRecentReportByPhone(phoneNumber: string): Promise<Report | null> {
  try {
    const db = getAdminFirestore();
    
    // Normalize phone number (remove non-digits)
    const normalizedPhone = phoneNumber.replace(/\D/g, "");
    
    const querySnapshot = await db.collection('reports')
      .where('phoneNumber', '==', normalizedPhone)
      .where('deliveryMethod', '==', 'whatsapp')
      .orderBy('lastGenerated', 'desc')
      .limit(1)
      .get();
    
    if (querySnapshot.empty) {
      console.log(`[Admin Firestore] No reports found for phone number: ${normalizedPhone}`);
      return null;
    }
    
    const doc = querySnapshot.docs[0];
    const data = doc.data();
    
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


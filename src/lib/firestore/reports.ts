import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  Timestamp,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { Report, ReportFrequency } from "@/types/report";

const REPORTS_COLLECTION = "reports";

/**
 * Calculate next run date based on frequency
 */
function calculateNextRun(frequency: ReportFrequency, lastRun?: Date): Date {
  const now = lastRun ? new Date(lastRun) : new Date();
  const next = new Date(now);
  
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
 * Get all reports for a user
 */
export async function getUserReports(userId: string): Promise<Report[]> {
  const db = getDb();
  const q = query(collection(db, REPORTS_COLLECTION), where("userId", "==", userId));
  const querySnapshot = await getDocs(q);
  
  return querySnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    lastGenerated: doc.data().lastGenerated?.toDate(),
    nextRun: doc.data().nextRun?.toDate(),
    createdAt: doc.data().createdAt?.toDate(),
  })) as Report[];
}

/**
 * Get active reports that are due to run
 */
export async function getDueReports(): Promise<Report[]> {
  const db = getDb();
  const now = Timestamp.now();
  const q = query(
    collection(db, REPORTS_COLLECTION),
    where("status", "==", "active"),
    where("nextRun", "<=", now)
  );
  
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    lastGenerated: doc.data().lastGenerated?.toDate(),
    nextRun: doc.data().nextRun?.toDate(),
    createdAt: doc.data().createdAt?.toDate(),
  })) as Report[];
}

/**
 * Get a single report by ID
 */
export async function getReport(reportId: string): Promise<Report | null> {
  const db = getDb();
  const docRef = doc(db, REPORTS_COLLECTION, reportId);
  const docSnap = await getDoc(docRef);
  
  if (!docSnap.exists()) {
    return null;
  }
  
  const data = docSnap.data();
  return {
    id: docSnap.id,
    ...data,
    lastGenerated: data.lastGenerated?.toDate(),
    nextRun: data.nextRun?.toDate(),
    createdAt: data.createdAt?.toDate(),
  } as Report;
}

/**
 * Create a new report
 */
export async function createReport(
  report: Omit<Report, "id" | "nextRun" | "createdAt" | "lastGenerated">
): Promise<string> {
  try {
  const nextRun = calculateNextRun(report.frequency);
    
    // Normalize phone number if provided (remove all non-digits)
    // This ensures consistent storage format
    // Firestore doesn't allow undefined values, so we must filter them out
    const normalizedReport: any = {
      userId: report.userId,
      areaIds: report.areaIds,
      indices: report.indices,
      cloudCoverage: report.cloudCoverage,
      frequency: report.frequency,
      deliveryMethod: report.deliveryMethod,
      status: report.status,
    };
    
    // Only include phoneNumber if provided
    if (report.phoneNumber) {
      normalizedReport.phoneNumber = report.phoneNumber.replace(/\D/g, "");
    }
    
    // Only include email if provided
    if (report.email) {
      normalizedReport.email = report.email;
    }
    
    // Only include name if provided
    if (report.name) {
      normalizedReport.name = report.name;
    }
  
  const db = getDb();
  const reportDataRaw = {
      ...normalizedReport,
    nextRun: Timestamp.fromDate(nextRun),
    createdAt: Timestamp.now(),
  };
  
  // Remove any undefined values (Firestore doesn't allow undefined)
  const reportData: any = {};
  Object.keys(reportDataRaw).forEach((key) => {
    const value = (reportDataRaw as any)[key];
    if (value !== undefined) {
      reportData[key] = value;
    }
  });
    
    console.log("[Firestore] Creating report with data:", {
      userId: reportData.userId,
      deliveryMethod: reportData.deliveryMethod,
      phoneNumber: reportData.phoneNumber,
      email: reportData.email,
      areaIds: reportData.areaIds?.length,
      indices: reportData.indices,
      frequency: reportData.frequency,
      status: reportData.status,
      hasName: !!reportData.name,
      cloudCoverage: reportData.cloudCoverage,
    });
  
  const docRef = await addDoc(collection(db, REPORTS_COLLECTION), reportData);
    console.log("[Firestore] ✅ Report created successfully with ID:", docRef.id);
  return docRef.id;
  } catch (error: any) {
    console.error("[Firestore] ❌ Error creating report:", error);
    console.error("[Firestore] Error code:", error.code);
    console.error("[Firestore] Error message:", error.message);
    console.error("[Firestore] Error details:", error);
    
    // Provide more helpful error messages
    if (error.code === "permission-denied") {
      throw new Error("No tienes permiso para crear reportes. Verifica que estés autenticado.");
    } else if (error.code === "invalid-argument") {
      throw new Error("Los datos del reporte son inválidos. Verifica todos los campos.");
    }
    
    throw error;
  }
}

/**
 * Update an existing report
 */
export async function updateReport(
  reportId: string,
  updates: Partial<Omit<Report, "id" | "userId" | "createdAt">>
): Promise<void> {
  const db = getDb();
  const docRef = doc(db, REPORTS_COLLECTION, reportId);
  
  // Filter out undefined values (Firestore doesn't allow undefined)
  const updateData: any = {};
  Object.keys(updates).forEach((key) => {
    const value = (updates as any)[key];
    if (value !== undefined) {
      updateData[key] = value;
    }
  });
  
  // Normalize phone number if provided
  if (updateData.phoneNumber) {
    updateData.phoneNumber = updateData.phoneNumber.replace(/\D/g, "");
  }
  
  // Recalculate nextRun if frequency changed
  if (updates.frequency) {
    const currentReport = await getReport(reportId);
    if (currentReport) {
      updateData.nextRun = Timestamp.fromDate(
        calculateNextRun(updates.frequency, currentReport.lastGenerated)
      );
    }
  }
  
  await updateDoc(docRef, updateData);
}

/**
 * Mark report as generated and calculate next run
 */
export async function markReportGenerated(reportId: string): Promise<void> {
  const report = await getReport(reportId);
  if (!report) {
    throw new Error("Report not found");
  }
  
  const db = getDb();
  const now = new Date();
  const nextRun = calculateNextRun(report.frequency, now);
  
  await updateDoc(doc(db, REPORTS_COLLECTION, reportId), {
    lastGenerated: Timestamp.fromDate(now),
    nextRun: Timestamp.fromDate(nextRun),
  });
}

/**
 * Delete a report
 */
export async function deleteReport(reportId: string): Promise<void> {
  const db = getDb();
  const docRef = doc(db, REPORTS_COLLECTION, reportId);
  await deleteDoc(docRef);
}


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
import { db } from "@/lib/firebase";
import { Report, ReportFrequency } from "@/types/report";

const REPORTS_COLLECTION = "reports";

/**
 * Calculate next run date based on frequency
 */
function calculateNextRun(frequency: ReportFrequency, lastRun?: Date): Date {
  const now = lastRun ? new Date(lastRun) : new Date();
  const next = new Date(now);
  
  switch (frequency) {
    case "daily":
      next.setDate(next.getDate() + 1);
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
  const nextRun = calculateNextRun(report.frequency);
  
  const reportData = {
    ...report,
    nextRun: Timestamp.fromDate(nextRun),
    createdAt: Timestamp.now(),
  };
  
  const docRef = await addDoc(collection(db, REPORTS_COLLECTION), reportData);
  return docRef.id;
}

/**
 * Update an existing report
 */
export async function updateReport(
  reportId: string,
  updates: Partial<Omit<Report, "id" | "userId" | "createdAt">>
): Promise<void> {
  const docRef = doc(db, REPORTS_COLLECTION, reportId);
  const updateData: any = { ...updates };
  
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
  const docRef = doc(db, REPORTS_COLLECTION, reportId);
  await deleteDoc(docRef);
}


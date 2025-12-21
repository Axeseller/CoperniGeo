import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  Timestamp,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { UserPlan, PlanType } from "@/types/plan";

const PLANS_COLLECTION = "userPlans";
const BASIC_PLAN_LIMIT = 15;

/**
 * Get user plan
 */
export async function getUserPlan(userId: string): Promise<UserPlan | null> {
  try {
    const db = getDb();
    const plansQuery = query(
      collection(db, PLANS_COLLECTION),
      where("userId", "==", userId),
      where("status", "==", "active")
    );
    
    const snapshot = await getDocs(plansQuery);
    
    if (snapshot.empty) {
      return null;
    }
    
    const planDoc = snapshot.docs[0];
    const data = planDoc.data();
    
    return {
      id: planDoc.id,
      userId: data.userId,
      planType: data.planType,
      startDate: data.startDate?.toDate(),
      endDate: data.endDate?.toDate(),
      status: data.status,
      feedbackAgreement: data.feedbackAgreement,
      cropType: data.cropType,
      hectares: data.hectares,
      createdAt: data.createdAt?.toDate(),
      updatedAt: data.updatedAt?.toDate(),
    } as UserPlan;
  } catch (error: any) {
    console.error("[Firestore] Error getting user plan:", error);
    throw error;
  }
}

/**
 * Create a new user plan
 */
export async function createUserPlan(
  userId: string,
  planType: PlanType,
  feedbackAgreement?: boolean,
  cropType?: string,
  hectares?: number
): Promise<string> {
  try {
    const db = getDb();
    const now = new Date();
    const endDate = new Date(now);
    endDate.setFullYear(endDate.getFullYear() + 1); // 1 year from now
    
    const planData: any = {
      userId,
      planType,
      startDate: Timestamp.fromDate(now),
      endDate: Timestamp.fromDate(endDate),
      status: "active",
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };
    
    if (feedbackAgreement !== undefined) {
      planData.feedbackAgreement = feedbackAgreement;
    }
    if (cropType) {
      planData.cropType = cropType;
    }
    if (hectares !== undefined) {
      planData.hectares = hectares;
    }
    
    const docRef = await addDoc(collection(db, PLANS_COLLECTION), planData);
    console.log("[Firestore] ✅ User plan created successfully with ID:", docRef.id);
    return docRef.id;
  } catch (error: any) {
    console.error("[Firestore] ❌ Error creating user plan:", error);
    throw error;
  }
}

/**
 * Get count of active basic plans
 */
export async function getBasicPlanCount(): Promise<number> {
  try {
    const db = getDb();
    const plansQuery = query(
      collection(db, PLANS_COLLECTION),
      where("planType", "==", "basic"),
      where("status", "==", "active")
    );
    
    const snapshot = await getDocs(plansQuery);
    return snapshot.size;
  } catch (error: any) {
    console.error("[Firestore] Error getting basic plan count:", error);
    throw error;
  }
}

/**
 * Get remaining basic plan spots
 */
export async function getRemainingBasicPlanSpots(): Promise<number> {
  try {
    const count = await getBasicPlanCount();
    return Math.max(0, BASIC_PLAN_LIMIT - count);
  } catch (error: any) {
    console.error("[Firestore] Error getting remaining basic plan spots:", error);
    throw error;
  }
}


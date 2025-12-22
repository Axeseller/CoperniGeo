import {
  collection,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  Timestamp,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { Lead, LeadFormData, LeadStatus } from "@/types/lead";

const LEADS_COLLECTION = "leads";

/**
 * Create a new lead (no authentication required)
 */
export async function createLead(
  leadData: LeadFormData
): Promise<string> {
  try {
    const db = getDb();
    const now = Timestamp.now();
    
    const leadDoc = {
      email: leadData.email,
      country: leadData.country,
      status: 'lead' as LeadStatus,
      createdAt: now,
      updatedAt: now,
    };
    
    if (leadData.farmName) {
      (leadDoc as any).farmName = leadData.farmName;
    }
    
    const docRef = await addDoc(collection(db, LEADS_COLLECTION), leadDoc);
    console.log("[Firestore] ✅ Lead created successfully with ID:", docRef.id);
    return docRef.id;
  } catch (error: any) {
    console.error("[Firestore] ❌ Error creating lead:", error);
    throw error;
  }
}

/**
 * Update a lead with geometry and status
 * Converts GeoJSON to Firestore-compatible format (flat array of {lat, lng} objects)
 */
export async function updateLeadWithGeometry(
  leadId: string,
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon,
  status: LeadStatus = 'snapshot_requested'
): Promise<void> {
  try {
    const db = getDb();
    const docRef = doc(db, LEADS_COLLECTION, leadId);
    
    // Convert GeoJSON to Firestore-compatible format (same as areas)
    // GeoJSON Polygon: coordinates: [[[lng, lat], [lng, lat], ...]]
    // Firestore format: coordinates: [{lat: number, lng: number}, ...]
    let coordinates: { lat: number; lng: number }[] = [];
    
    if (geometry.type === "Polygon") {
      // Polygon has one ring (exterior), take the first array
      const ring = geometry.coordinates[0];
      coordinates = ring.map((coord: number[]) => ({
        lat: coord[1], // GeoJSON is [lng, lat]
        lng: coord[0],
      }));
    } else if (geometry.type === "MultiPolygon") {
      // MultiPolygon: take the first polygon's exterior ring
      const firstPolygon = geometry.coordinates[0];
      const ring = firstPolygon[0];
      coordinates = ring.map((coord: number[]) => ({
        lat: coord[1],
        lng: coord[0],
      }));
    }
    
    await updateDoc(docRef, {
      coordinates: coordinates, // Store as flat array like areas: [{lat: number, lng: number}]
      status: status,
      updatedAt: Timestamp.now(),
    });
    
    console.log("[Firestore] ✅ Lead updated with geometry successfully");
  } catch (error: any) {
    console.error("[Firestore] ❌ Error updating lead:", error);
    throw error;
  }
}

/**
 * Update a lead status (e.g., for manual mapping)
 */
export async function updateLeadStatus(
  leadId: string,
  status: LeadStatus
): Promise<void> {
  try {
    const db = getDb();
    const docRef = doc(db, LEADS_COLLECTION, leadId);
    
    await updateDoc(docRef, {
      status: status,
      updatedAt: Timestamp.now(),
    });
    
    console.log("[Firestore] ✅ Lead status updated successfully");
  } catch (error: any) {
    console.error("[Firestore] ❌ Error updating lead status:", error);
    throw error;
  }
}

/**
 * Get a lead by ID
 */
export async function getLead(leadId: string): Promise<Lead | null> {
  try {
    const db = getDb();
    const docRef = doc(db, LEADS_COLLECTION, leadId);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      return null;
    }
    
    const data = docSnap.data();
    return {
      id: docSnap.id,
      email: data.email,
      farmName: data.farmName,
      country: data.country,
      coordinates: data.coordinates,
      status: data.status,
      createdAt: data.createdAt?.toDate(),
      updatedAt: data.updatedAt?.toDate(),
    } as Lead;
  } catch (error: any) {
    console.error("[Firestore] ❌ Error getting lead:", error);
    throw error;
  }
}


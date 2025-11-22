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
import { Area } from "@/types/area";
import { GeoPoint } from "firebase/firestore";

const AREAS_COLLECTION = "areas";

/**
 * Convert coordinates array to Firestore GeoPoint array
 */
function coordinatesToGeoPoints(
  coordinates: { lat: number; lng: number }[]
): GeoPoint[] {
  return coordinates.map((coord) => new GeoPoint(coord.lat, coord.lng));
}

/**
 * Convert GeoPoint array to coordinates array
 */
function geoPointsToCoordinates(geoPoints: GeoPoint[]): { lat: number; lng: number }[] {
  return geoPoints.map((gp) => ({ lat: gp.latitude, lng: gp.longitude }));
}

/**
 * Get all areas for a user
 */
export async function getUserAreas(userId: string): Promise<Area[]> {
  const db = getDb();
  const q = query(collection(db, AREAS_COLLECTION), where("userId", "==", userId));
  const querySnapshot = await getDocs(q);
  
  return querySnapshot.docs.map((doc) => {
    const data = doc.data();
    const geoPoints = data.coordinates as GeoPoint[];
    return {
      id: doc.id,
      ...data,
      coordinates: geoPointsToCoordinates(geoPoints),
      createdAt: data.createdAt?.toDate(),
      updatedAt: data.updatedAt?.toDate(),
    } as Area;
  });
}

/**
 * Get a single area by ID
 */
export async function getArea(areaId: string): Promise<Area | null> {
  const db = getDb();
  const docRef = doc(db, AREAS_COLLECTION, areaId);
  const docSnap = await getDoc(docRef);
  
  if (!docSnap.exists()) {
    return null;
  }
  
  const data = docSnap.data();
  const geoPoints = data.coordinates as GeoPoint[];
  return {
    id: docSnap.id,
    ...data,
    coordinates: geoPointsToCoordinates(geoPoints),
    createdAt: data.createdAt?.toDate(),
    updatedAt: data.updatedAt?.toDate(),
  } as Area;
}

/**
 * Create a new area
 */
export async function createArea(area: Omit<Area, "id" | "createdAt" | "updatedAt">): Promise<string> {
  const db = getDb();
  const areaData = {
    ...area,
    coordinates: coordinatesToGeoPoints(area.coordinates as any),
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };
  
  const docRef = await addDoc(collection(db, AREAS_COLLECTION), areaData);
  return docRef.id;
}

/**
 * Update an existing area
 */
export async function updateArea(
  areaId: string,
  updates: Partial<Omit<Area, "id" | "userId" | "createdAt">>
): Promise<void> {
  const db = getDb();
  const docRef = doc(db, AREAS_COLLECTION, areaId);
  const updateData: any = {
    ...updates,
    updatedAt: Timestamp.now(),
  };
  
  if (updates.coordinates) {
    updateData.coordinates = coordinatesToGeoPoints(updates.coordinates as any);
  }
  
  await updateDoc(docRef, updateData);
}

/**
 * Delete an area
 */
export async function deleteArea(areaId: string): Promise<void> {
  const db = getDb();
  const docRef = doc(db, AREAS_COLLECTION, areaId);
  await deleteDoc(docRef);
}


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
  QueryDocumentSnapshot,
  DocumentData,
} from "firebase/firestore";
import { getDb, getAuthInstance } from "@/lib/firebase";
import { Area } from "@/types/area";
import { GeoPoint } from "firebase/firestore";

const AREAS_COLLECTION = "areas";

/**
 * Get all areas for a user
 */
export async function getUserAreas(userId: string): Promise<Area[]> {
  const db = getDb();
  console.log("Querying areas for userId:", userId);
  
  try {
    const q = query(collection(db, AREAS_COLLECTION), where("userId", "==", userId));
    const querySnapshot = await getDocs(q);
    
    console.log("Firestore query returned", querySnapshot.docs.length, "documents");
    
    const areas = querySnapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => {
      const data = doc.data();
      // Handle both GeoPoint objects and plain objects from Firestore
      const coordinates = data.coordinates || [];
      
      if (!coordinates || !Array.isArray(coordinates)) {
        console.warn("Area", doc.id, "has invalid coordinates:", data.coordinates);
      }
      
      // Coordinates are stored as plain objects {lat: number, lng: number}
      const coords = coordinates.map((coord: any) => {
        // Handle GeoPoint (if somehow present)
        if (coord instanceof GeoPoint || (coord.latitude !== undefined && coord.longitude !== undefined)) {
          return { lat: coord.latitude, lng: coord.longitude };
        }
        // Handle plain {lat, lng} format (what we're saving now)
        if (coord.lat !== undefined && coord.lng !== undefined) {
          return { lat: coord.lat, lng: coord.lng };
        }
        return { lat: 0, lng: 0 }; // Fallback
      });
      
      return {
        id: doc.id,
        name: data.name,
        userId: data.userId,
        coordinates: coords,
        createdAt: data.createdAt?.toDate(),
        updatedAt: data.updatedAt?.toDate(),
      } as Area;
    });
    
    console.log("Processed areas:", areas.length);
    return areas;
  } catch (error: any) {
    console.error("Error querying areas from Firestore:", error);
    console.error("Error details:", {
      code: error.code,
      message: error.message,
      stack: error.stack,
    });
    throw error;
  }
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
  // Coordinates are stored as plain objects {lat: number, lng: number}
  const coordinates = data.coordinates || [];
  const coords = coordinates.map((coord: any) => {
    // Handle GeoPoint (if somehow present from old data)
    if (coord instanceof GeoPoint || (coord.latitude !== undefined && coord.longitude !== undefined)) {
      return { lat: coord.latitude, lng: coord.longitude };
    }
    // Handle plain {lat, lng} format (what we're saving now)
    if (coord.lat !== undefined && coord.lng !== undefined) {
      return { lat: coord.lat, lng: coord.lng };
    }
    return { lat: 0, lng: 0 }; // Fallback
  });
  
  return {
    id: docSnap.id,
    name: data.name,
    userId: data.userId,
    coordinates: coords,
    createdAt: data.createdAt?.toDate(),
    updatedAt: data.updatedAt?.toDate(),
  } as Area;
}

/**
 * Create a new area
 * Simple, clean implementation that just works
 */
export async function createArea(area: Omit<Area, "id" | "createdAt" | "updatedAt">): Promise<string> {
  console.log("🔵 createArea called with:", {
    name: area.name,
    userId: area.userId,
    coordinatesCount: area.coordinates?.length
  });
  
  try {
    const db = getDb();
    const auth = getAuthInstance();
    
    // Get current user
    const currentUser = auth.currentUser;
    console.log("🔵 Current user:", currentUser?.uid);
    
    if (!currentUser || currentUser.uid !== area.userId) {
      throw new Error("Usuario no autenticado o userId no coincide");
    }
    
    // Validate
    if (!area.coordinates || area.coordinates.length < 3) {
      throw new Error("El área debe tener al menos 3 coordenadas");
    }
    
    // Convert coordinates to plain objects: [{lat: number, lng: number}]
    const coordinates = area.coordinates.map((coord: any) => ({
      lat: typeof coord.lat === 'number' ? coord.lat : coord.latitude || 0,
      lng: typeof coord.lng === 'number' ? coord.lng : coord.longitude || 0,
    }));
    
    console.log("🔵 Coordinates prepared:", coordinates.length, "points");
    
    // Prepare document data
    const areaData = {
      name: area.name,
      userId: area.userId,
      coordinates: coordinates,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };
    
    console.log("🔵 About to call addDoc...");
    
    // Save to Firestore using addDoc (creates document with auto-generated ID)
    const areasCollection = collection(db, AREAS_COLLECTION);
    
    // Add a timeout to detect hanging writes
    const addDocPromise = addDoc(areasCollection, areaData);
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error("TIMEOUT: addDoc no completó en 15 segundos. Verifica:\n1. Firestore está habilitado en Firebase Console\n2. Las reglas de seguridad permiten escrituras\n3. No hay bloqueadores de red activos"));
      }, 15000);
    });
    
    const docRef = await Promise.race([addDocPromise, timeoutPromise]);
    
    console.log("✅ Area saved successfully with ID:", docRef.id);
    return docRef.id;
  } catch (error: any) {
    console.error("❌ Error saving area:", error);
    console.error("Error code:", error.code);
    console.error("Error message:", error.message);
    
    if (error.code === "permission-denied") {
      throw new Error("Permiso denegado. Verifica las reglas de seguridad de Firestore.");
    }
    
    throw error;
  }
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
        // Save coordinates as plain objects
        updateData.coordinates = updates.coordinates.map((coord: any) => {
          if (coord && typeof coord === 'object' && 'lat' in coord && 'lng' in coord) {
            return { lat: Number(coord.lat), lng: Number(coord.lng) };
          }
          if (coord && typeof coord === 'object' && 'latitude' in coord && 'longitude' in coord) {
            return { lat: Number(coord.latitude), lng: Number(coord.longitude) };
          }
          return { lat: 0, lng: 0 };
        });
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


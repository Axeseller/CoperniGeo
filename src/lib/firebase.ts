import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { 
  getFirestore, 
  Firestore, 
  initializeFirestore,
  memoryLocalCache,
  persistentLocalCache,
  persistentSingleTabManager
} from "firebase/firestore";
import { getStorage, FirebaseStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Lazy initialization to avoid build-time errors
let app: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let dbInstance: Firestore | null = null;
let storageInstance: FirebaseStorage | null = null;

function getApp(): FirebaseApp {
  if (!app) {
    if (getApps().length === 0) {
      app = initializeApp(firebaseConfig);
    } else {
      app = getApps()[0];
    }
  }
  return app;
}

// Lazy getters - only initialize when actually called
export function getAuthInstance(): Auth {
  if (!authInstance) {
    authInstance = getAuth(getApp());
  }
  return authInstance;
}

export function getDb(): Firestore {
  if (!dbInstance) {
    const app = getApp();
    console.log("Initializing Firestore for app:", app.name, "Project ID:", firebaseConfig.projectId);
    
    // Initialize Firestore with memory-only cache (no offline persistence)
    // This prevents writes from hanging due to offline persistence issues
    dbInstance = initializeFirestore(app, {
      localCache: memoryLocalCache()
    });
    
    console.log("✅ Firestore initialized with memory-only cache (no offline persistence)");
  }
  return dbInstance;
}

export function getStorageInstance(): FirebaseStorage {
  if (!storageInstance) {
    storageInstance = getStorage(getApp());
  }
  return storageInstance;
}

// Note: Do NOT export auth, db, or storage directly as constants
// They would initialize immediately during import, causing build errors
// Use getAuthInstance(), getDb(), and getStorageInstance() instead

export default getApp;


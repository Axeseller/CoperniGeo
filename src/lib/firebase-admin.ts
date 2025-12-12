import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getStorage, Storage } from 'firebase-admin/storage';

let adminApp: App | null = null;
let adminStorage: Storage | null = null;

export function getAdminApp(): App {
  if (!adminApp) {
    // Check if already initialized
    const apps = getApps();
    if (apps.length > 0) {
      adminApp = apps[0];
    } else {
      // Initialize with service account credentials
      const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;
      const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
      const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
      const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;

      if (!privateKey || !clientEmail || !projectId) {
        throw new Error('Missing Firebase Admin credentials. Please set FIREBASE_ADMIN_PRIVATE_KEY, FIREBASE_ADMIN_CLIENT_EMAIL, and NEXT_PUBLIC_FIREBASE_PROJECT_ID in your environment variables.');
      }

      // Replace escaped newlines in private key
      const formattedPrivateKey = privateKey.replace(/\\n/g, '\n');

      adminApp = initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey: formattedPrivateKey,
        }),
        storageBucket,
      });

      console.log('✅ Firebase Admin SDK initialized');
    }
  }
  return adminApp;
}

export function getAdminStorage(): Storage {
  if (!adminStorage) {
    adminStorage = getStorage(getAdminApp());
  }
  return adminStorage;
}


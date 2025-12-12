# Firebase Admin SDK Setup

## Overview
Firebase Admin SDK is now configured for server-side operations, including uploading images to Firebase Storage for use in email reports.

## Required Environment Variables

Add these to your `.env.local` file (or `.env` for production):

### Option 1: Using Existing Service Account (Recommended if you already have Earth Engine credentials)

If you're already using a service account for Earth Engine, you can use the same credentials:

```env
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_ADMIN_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com
```

**Note:** If you're using the same service account as Earth Engine, you can copy the values:
- `FIREBASE_ADMIN_PRIVATE_KEY` = same as `EARTH_ENGINE_PRIVATE_KEY`
- `FIREBASE_ADMIN_CLIENT_EMAIL` = same as `EARTH_ENGINE_CLIENT_EMAIL`

### Option 2: Create a New Service Account (If you want separate credentials)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your Firebase project
3. Go to **IAM & Admin > Service Accounts**
4. Click **Create Service Account**
5. Name it "firebase-admin" or similar
6. Grant it the **"Firebase Admin SDK Administrator"** role
7. Click **Done**
8. Click on the newly created service account
9. Go to the **Keys** tab
10. Click **Add Key > Create new key**
11. Choose **JSON** format
12. Download the key file

From the downloaded JSON file, extract:
```env
FIREBASE_ADMIN_PRIVATE_KEY="[copy the private_key field]"
FIREBASE_ADMIN_CLIENT_EMAIL=[copy the client_email field]
```

### Already Configured (No action needed)
```env
NEXT_PUBLIC_FIREBASE_PROJECT_ID=copernigeo  # Already in your .env
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=copernigeo.firebasestorage.app  # Already in your .env
```

## Example .env.local

```env
# Firebase Admin SDK (Server-side only)
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n"
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-xxxxx@copernigeo.iam.gserviceaccount.com

# Firebase Client SDK (Already configured)
NEXT_PUBLIC_FIREBASE_PROJECT_ID=copernigeo
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=copernigeo.firebasestorage.app
# ... other Firebase client vars ...
```

## Firebase Storage Rules

Make sure your Firebase Storage rules allow public read access for email images:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Allow public read access for email images
    match /email-images/{allPaths=**} {
      allow read: if true;
      allow write: if false; // Only server (Admin SDK) can write
    }
    
    // Your existing rules for other paths...
  }
}
```

## Verification

After setting up, restart your Next.js development server:

```bash
npm run dev
```

When you send a report, you should see in the logs:
- `✅ Firebase Admin SDK initialized`
- `[Admin Storage] ✅ File uploaded successfully: email-images/...`

## What This Fixes

1. **Inline Images in Emails**: Images are now uploaded to Firebase Storage and embedded in emails using public URLs
2. **Email Client Compatibility**: Works reliably in Gmail, Outlook, and all major email clients
3. **No Distortion**: Images maintain proper aspect ratio with explicit width constraints
4. **PDF Generation**: Fixed the PDF rendering error

## Security Note

- The Admin SDK private key gives full access to your Firebase project
- **NEVER** commit this to version control
- Add `.env.local` to `.gitignore` (should already be there)
- Use environment variables in production (Vercel, etc.)


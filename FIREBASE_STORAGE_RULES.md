# Firebase Security Rules (Storage & Firestore)

## ⚠️ IMPORTANT: You Need BOTH Sets of Rules

CoperniGeo uses:
- **Firestore** (database) for areas, reports, cache
- **Firebase Storage** (files) for images, PDFs

You must deploy **BOTH** `firestore.rules` AND `storage.rules`

---

# Firebase Storage Security Rules

## Overview
This document explains the Firebase Storage security rules for CoperniGeo and how to deploy them.

## Rules Structure

### 1. Email Images (`/email-images/`)
**Purpose**: Store satellite imagery for email reports

**Access**:
- ✅ **Read**: Public (anyone can view)
- ❌ **Write**: Only Admin SDK (server-side)
- ❌ **Delete**: Only Admin SDK (server-side)

**Reason**: Images need to be publicly accessible for email clients to display them. Only the server should create/delete these images.

### 2. User Reports (`/reports/{userId}/`)
**Purpose**: Store generated PDF reports per user

**Access**:
- ✅ **Read**: Only the owner (authenticated user)
- ✅ **Write**: Only the owner (max 10MB PDFs)
- ✅ **Delete**: Only the owner

**Reason**: Reports contain user-specific data and should only be accessible by the owner.

### 3. User Uploads (`/user-uploads/{userId}/`)
**Purpose**: Future feature for user-uploaded images/documents

**Access**:
- ✅ **Read**: Only the owner
- ✅ **Write**: Only the owner (max 10MB images)
- ✅ **Delete**: Only the owner

**Reason**: User files should be private to the owner.

### 4. Public Assets (`/public/`)
**Purpose**: Company logos, static assets, etc.

**Access**:
- ✅ **Read**: Public (anyone)
- ❌ **Write**: Only Admin SDK
- ❌ **Delete**: Only Admin SDK

**Reason**: Public assets should be readable by all but managed only by admins.

### 5. Cache (`/cache/`)
**Purpose**: Cached satellite imagery data (if needed)

**Access**:
- ✅ **Read**: Authenticated users only
- ❌ **Write**: Only Admin SDK
- ❌ **Delete**: Only Admin SDK

**Reason**: Cached data should only be accessible to logged-in users.

---

# Firebase Firestore Security Rules

## Collections

### 1. Areas (`/areas/`)
**Purpose**: User-created polygons (AOIs)

**Access**:
- ✅ **Read**: Owner only
- ✅ **Write**: Owner only (with validation)
- ✅ **Delete**: Owner only

**Validation**: 
- Must have name, userId, coordinates (≥3 points)
- userId must match authenticated user

### 2. Reports (`/reports/`)
**Purpose**: Report configurations and schedules

**Access**:
- ✅ **Read**: Owner only
- ✅ **Write**: Owner + Server (for status updates)
- ✅ **Delete**: Owner only

**Validation**:
- Must have valid frequency (3days, 5days, weekly, monthly)
- Must have valid email format
- Must have at least one index

### 3. Cache (`/cache/`)
**Purpose**: Satellite imagery cache (shared)

**Access**:
- ✅ **Read**: Any authenticated user
- ❌ **Write**: Only Admin SDK (server)

**Reason**: Cache is shared across users for efficiency

### 4. Users (`/users/`)
**Purpose**: User profiles (future feature)

**Access**:
- ✅ **Read/Write/Delete**: Owner only

---

## How to Deploy

### Deploy BOTH Rules Sets

### Option 1: Firebase Console (Easiest)

#### For Firestore Rules:
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (CoperniGeo)
3. Navigate to **Firestore Database** in the left sidebar
4. Click on the **Rules** tab
5. Copy the contents of `firestore.rules` file
6. Paste into the editor
7. Click **Publish**

#### For Storage Rules:
1. In the same Firebase Console
2. Navigate to **Storage** in the left sidebar
3. Click on the **Rules** tab
4. Copy the contents of `storage.rules` file
5. Paste into the editor
6. Click **Publish**

### Option 2: Firebase CLI

If you have Firebase CLI installed:

```bash
# Login to Firebase (if not already logged in)
firebase login

# Initialize Firebase in your project (if not already done)
firebase init firestore
firebase init storage

# Deploy both rules
firebase deploy --only firestore:rules,storage
```

## Security Features

### ✅ What's Secure:
1. **No Public Writes**: Only authenticated operations or Admin SDK can write
2. **User Isolation**: Users can only access their own data
3. **File Type Validation**: Only specific file types allowed (images, PDFs)
4. **Size Limits**: Maximum 10MB per file
5. **Default Deny**: Anything not explicitly allowed is denied

### ✅ What Works:
1. **Email Images**: Display properly in emails (public read)
2. **User Reports**: Securely stored per user
3. **Admin Operations**: Server (Admin SDK) has full access
4. **User Uploads**: Users can manage their own files

## Testing Rules

After deploying **BOTH** rules sets, test that:

### Firestore (Database):
1. ✅ Logged-in users can see their own areas
2. ✅ Logged-in users can create new areas
3. ✅ Logged-in users can see their own reports
4. ✅ Logged-in users can create new reports
5. ❌ Users cannot see other users' areas/reports
6. ❌ Unauthenticated users cannot access any data

### Storage (Files):
1. ✅ Email images are publicly accessible:
   ```
   https://storage.googleapis.com/copernigeo.firebasestorage.app/email-images/[image-name].png
   ```
2. ✅ Users can upload PDFs to their own folder
3. ❌ Users cannot access other users' files
4. ❌ Unauthenticated users cannot write files

## Migration from Test Rules

Your current test rules probably look like:
```javascript
allow read, write: if true; // TESTING ONLY
```

The new rules are **more restrictive** but **maintain functionality**:
- Email images still work (public read)
- User data is protected (owner-only access)
- Server operations work (Admin SDK bypasses rules)

## Troubleshooting

### Issue: "Permission denied" when viewing areas/reports
**Solution**: 
1. Check that you deployed **Firestore rules** (not just Storage)
2. Verify user is logged in (check browser console)
3. Confirm userId in documents matches authenticated user

### Issue: "Permission denied" when creating areas
**Solution**: 
1. Deploy `firestore.rules` to Firestore Database Rules
2. Check that user is authenticated
3. Verify area has at least 3 coordinates

### Issue: "Permission denied" when sending reports
**Solution**: Make sure `FIREBASE_ADMIN_PRIVATE_KEY` and `FIREBASE_ADMIN_CLIENT_EMAIL` are set in your `.env.local`

### Issue: Email images not displaying
**Solution**: 
1. Check that images are uploaded to `/email-images/` path
2. Verify the Storage bucket name is correct
3. Ensure **Storage rules** are published

### Issue: Satellite images not loading
**Solution**: 
1. Verify user is authenticated (cache requires auth)
2. Check that **Firestore rules** allow cache reads
3. Satellite images come from Earth Engine (not Firebase), check Earth Engine credentials

## Rollback Plan

If you need to rollback to test rules temporarily:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if request.auth != null; // Require auth
    }
  }
}
```

**⚠️ Never use `if true` in production!**


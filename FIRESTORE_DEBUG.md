# Firestore Debugging Guide

## Problem: Timeout on Firestore Operations

Both read and write operations are timing out after 10 seconds, which suggests:
1. Firestore security rules are blocking operations silently
2. Firestore database may not be enabled or configured correctly
3. Network/connectivity issues

## Debugging Steps

### Step 1: Verify Firestore is Enabled

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **copernigeo**
3. Go to **Firestore Database**
4. Check if you see "Create database" button - if yes, Firestore is NOT enabled
   - Click "Create database"
   - Choose **Native mode** (NOT Datastore mode)
   - Select a location
   - Click "Enable"

### Step 2: Check Current Security Rules

1. In Firebase Console, go to **Firestore Database** > **Rules**
2. Check what rules are currently published
3. **Temporarily** use these minimal rules to test:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

**WARNING**: These rules allow any authenticated user to read/write everything. Only use for testing!

### Step 3: Verify Firebase Configuration

Check your `.env.local` file has all required variables:
- NEXT_PUBLIC_FIREBASE_API_KEY
- NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
- NEXT_PUBLIC_FIREBASE_PROJECT_ID
- NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
- NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
- NEXT_PUBLIC_FIREBASE_APP_ID

### Step 4: Check Network Tab

1. Open DevTools (F12)
2. Go to **Network** tab
3. Filter by "firestore"
4. Try saving an area
5. Look for requests to `firestore.googleapis.com`
6. Check the request status:
   - **Pending** = Timeout issue (rules blocking or not enabled)
   - **403** = Permission denied (rules blocking)
   - **400** = Bad request (data format issue)
   - **No request** = Firestore not initialized correctly

### Step 5: Test with Browser Console

Open browser console and run:

```javascript
import { getDb } from '@/lib/firebase';
import { collection, addDoc, getDocs } from 'firebase/firestore';

const db = getDb();
const testCollection = collection(db, 'test');
const testDoc = { test: true, timestamp: new Date() };

// Test write
addDoc(testCollection, testDoc).then(doc => {
  console.log('Write success:', doc.id);
}).catch(err => {
  console.error('Write error:', err);
});

// Test read
getDocs(testCollection).then(snap => {
  console.log('Read success:', snap.docs.length, 'docs');
}).catch(err => {
  console.error('Read error:', err);
});
```

## Common Issues

### Issue 1: Firestore Not Enabled
**Symptom**: Timeouts, no error messages
**Solution**: Enable Firestore in Native mode (Step 1)

### Issue 2: Security Rules Too Restrictive
**Symptom**: Read works but write times out
**Solution**: Use minimal rules temporarily (Step 2)

### Issue 3: Wrong Database Mode
**Symptom**: Errors about "datastore" or different API
**Solution**: Use Native mode, not Datastore mode

### Issue 4: Authentication Not Working
**Symptom**: Operations time out, auth.currentUser is null
**Solution**: Check Firebase Auth is properly configured


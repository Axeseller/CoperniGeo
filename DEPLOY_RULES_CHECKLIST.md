# 🚀 Deploy Firebase Rules - Quick Checklist

## ⚠️ You Need BOTH Rules Sets!

CoperniGeo uses:
- ✅ **Firestore** (database) → `firestore.rules`
- ✅ **Storage** (files) → `storage.rules`

## Quick Deploy Steps

### Step 1: Deploy Firestore Rules (Database)

1. Open https://console.firebase.google.com/
2. Select **CoperniGeo** project
3. Click **Firestore Database** (left sidebar)
4. Click **Rules** tab
5. Copy ALL contents from `firestore.rules`
6. Paste into editor
7. Click **Publish**
8. ✅ Done!

### Step 2: Deploy Storage Rules (Files)

1. Stay in Firebase Console
2. Click **Storage** (left sidebar)
3. Click **Rules** tab
4. Copy ALL contents from `storage.rules`
5. Paste into editor
6. Click **Publish**
7. ✅ Done!

## What Each Rules File Controls

### `firestore.rules` → Database Access
Controls access to:
- ✅ Your saved areas (polygons)
- ✅ Your report configurations
- ✅ Satellite imagery cache
- ✅ User profiles

**If this is missing**: You can't see/create areas or reports!

### `storage.rules` → File Access
Controls access to:
- ✅ Email images (satellite imagery in emails)
- ✅ PDF reports (if saved)
- ✅ User uploaded files

**If this is missing**: Email images won't work!

## Verify Deployment

After deploying BOTH:

### Test Firestore:
- [ ] Log in to your app
- [ ] Can you see your saved areas?
- [ ] Can you create a new area?
- [ ] Can you see your reports?

### Test Storage:
- [ ] Send a test report email
- [ ] Can you see images in the email?

## If Something Doesn't Work

### "Permission denied" when viewing areas:
→ Deploy `firestore.rules` to **Firestore Database** section

### "Permission denied" when creating areas:
→ Check you're logged in + `firestore.rules` is deployed

### Email images not showing:
→ Deploy `storage.rules` to **Storage** section

### Still having issues?
→ Check browser console (F12) for specific error messages
→ Verify you're logged in (check Firebase Auth in console)

## Pro Tip: Use Firebase CLI

```bash
# Deploy both at once
firebase deploy --only firestore:rules,storage

# Or separately
firebase deploy --only firestore:rules
firebase deploy --only storage
```

---

**✨ Once both are deployed, your app will be secure AND functional!**


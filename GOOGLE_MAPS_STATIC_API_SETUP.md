# Google Maps Static API Setup Guide

## Problem
Getting `403 Forbidden` error when trying to fetch satellite imagery from Google Maps Static API.

## Solution

### Step 1: Enable Maps Static API

1. Go to [Google Cloud Console - APIs & Services](https://console.cloud.google.com/apis/library)
2. Make sure you're in the correct project (CoperniGeo)
3. Search for "Maps Static API"
4. Click on "Maps Static API"
5. Click the **"ENABLE"** button
6. Wait for it to enable (takes a few seconds)

### Step 2: Verify API Key Settings

1. Go to [API Credentials](https://console.cloud.google.com/apis/credentials)
2. Click on your API key
3. Check the following:

   **Application restrictions:**
   - Should be "None" ✅ (you confirmed this)

   **API restrictions:**
   - Option 1: Select "Don't restrict key" (easiest)
   - Option 2: Select "Restrict key" and add these APIs:
     - Maps JavaScript API (already needed for frontend)
     - Maps Static API (needed for server-side satellite images)

4. Click **"Save"**

### Step 3: Enable Billing (if not already enabled)

The Maps Static API requires billing to be enabled:

1. Go to [Billing](https://console.cloud.google.com/billing)
2. Link a billing account to your project
3. Note: Google provides $200/month free credit, which covers ~28,000 static map requests

### Step 4: Restart Your Application

After enabling the API and saving changes:

```bash
# Stop the current dev server (Ctrl+C)
npm run dev
```

### Step 5: Test the Composite Images

Send another test report and check the logs for:
- ✅ `[Composite] ✅ Google Maps satellite image fetched`
- ✅ `[Composite] ✅ Composite image created successfully`
- ✅ `[Email] ✅ Composite image generated`

## Common Issues

### Issue: Still getting 403 after enabling API
**Solution**: Wait 2-5 minutes for Google's changes to propagate, then restart your server.

### Issue: Billing not enabled
**Solution**: Enable billing in Google Cloud Console. The first $200/month is free.

### Issue: API key restrictions
**Solution**: Make sure Maps Static API is in your allowed APIs list.

## Pricing

Maps Static API pricing:
- First 28,000 requests/month: **FREE** (covered by $200 credit)
- After that: $2 per 1,000 requests

For CoperniGeo's typical usage:
- ~10 reports/day × 3 indices = 30 images/day = 900 images/month
- **Well within free tier** ✅

## Verification

Once set up correctly, you should see in the logs:

```
[Composite] Fetching Google Maps satellite image: https://maps.googleapis.com/...
[Composite] ✅ Google Maps satellite image fetched (XXXXX bytes)
[Composite] Starting image composition...
[Composite] ✅ Composite image created successfully (XXXXX bytes)
[Email] ✅ Composite image generated (XXXXX bytes)
```

And your email/PDF images will show:
- Satellite base imagery ✅
- Index overlay at 70% opacity ✅
- Green polygon outline ✅


# Custom URL Shortener Setup

This document explains the custom URL shortener implementation for CoperniGeo report links.

## Overview

The custom URL shortener creates branded short links (e.g., `https://copernigeo.com/s/abcde123`) that redirect to long Firebase Storage URLs. This provides:

- **Branded URLs**: Links use your domain (`copernigeo.com`)
- **User-friendly**: Short, memorable codes instead of long URLs
- **Analytics**: Click tracking built into Firestore
- **No external dependencies**: Uses Firebase services you already use

## Architecture

1. **Short Link Generation**: When a report is sent via WhatsApp, a short code is generated and stored in Firestore
2. **Redirect Handling**: When users click the short link, they're redirected to the original PDF URL
3. **Click Tracking**: Each click is automatically tracked (count and timestamp)

## Components

### 1. Firestore Collection: `shortLinks`

Stores short link mappings:
- `code`: The short code (e.g., "abcde123")
- `longUrl`: The original URL to redirect to
- `reportId`: Optional report ID for tracking
- `createdAt`: Timestamp when link was created
- `clicks`: Number of times the link was clicked
- `lastClickedAt`: Timestamp of last click

### 2. API Routes

- **`/api/short-links/create`**: Creates a new short link (used internally)
- **`/api/s/[code]`**: API endpoint for redirects (alternative to page route)

### 3. Page Route

- **`/s/[code]`**: User-facing redirect page (handles clicks from WhatsApp)

### 4. Firestore Rules

The `shortLinks` collection allows:
- **Public read access**: Anyone can read to get the long URL
- **Server-only writes**: Only Admin SDK can create/update links

## Setup

### 1. Firestore Index

**No manual index needed!** Firestore automatically creates single-field indexes, so queries on the `code` field work out of the box.

If you need to query by other fields in the future (e.g., `reportId` or `createdAt`), you can create composite indexes then.

### 2. Environment Variables

Ensure `NEXT_PUBLIC_APP_URL` is set in your environment:

```bash
NEXT_PUBLIC_APP_URL=https://copernigeo.com
```

This is used to build the branded short URLs.

### 3. Firestore Rules Deployment

Deploy the updated Firestore rules:

```bash
firebase deploy --only firestore:rules
```

This ensures the `shortLinks` collection has the correct security rules (public read, server-only write).

## How It Works

### Link Generation Flow

1. Report is generated and PDF is uploaded to Firebase Storage
2. `sendReportWhatsAppWithPDF()` is called with the PDF URL
3. A short code is generated (8 alphanumeric characters)
4. Short code and long URL are stored in Firestore
5. Branded short URL is created: `https://copernigeo.com/s/{code}`
6. Short URL is sent via WhatsApp message template

### Redirect Flow

1. User clicks short link: `https://copernigeo.com/s/abcde123`
2. Next.js page route `/s/[code]` handles the request
3. Firestore query finds the short link by code
4. Click count is incremented and timestamp updated
5. User is redirected to the original PDF URL

## Code Generation

Short codes are generated using:
- **Length**: 8 characters
- **Characters**: Lowercase letters (a-z) and numbers (0-9)
- **Format**: `abcde123` (example)
- **Collision handling**: If a code already exists, a new one is generated (up to 10 attempts)

## Analytics

Each short link tracks:
- **Total clicks**: Incremented on each redirect
- **Last clicked**: Timestamp of most recent click
- **Report ID**: Optional link to the report (for analytics)

## Testing

### Test Short Link Creation

```bash
curl -X POST https://copernigeo.com/api/short-links/create \
  -H "Content-Type: application/json" \
  -d '{"longUrl": "https://example.com/report.pdf", "reportId": "test123"}'
```

Response:
```json
{
  "shortCode": "abcde123",
  "shortUrl": "https://copernigeo.com/s/abcde123"
}
```

### Test Redirect

Visit: `https://copernigeo.com/s/abcde123`

Should redirect to the original URL.

## Troubleshooting

### Short link not redirecting

1. Check Firestore rules allow public read access to `shortLinks`
2. Verify the code exists in Firestore
3. Check server logs for errors

### Code generation fails

- Check Firestore connection
- Verify Admin SDK is properly initialized
- Check for Firestore quota limits

### Links not being created

- Verify `NEXT_PUBLIC_APP_URL` is set
- Check server logs for errors in `createShortLink()`
- Ensure Firestore rules allow writes (server-side only)

## Maintenance

### Cleanup Old Links

You can create a Cloud Function or cron job to clean up old short links:

```typescript
// Example: Delete links older than 1 year with no clicks
const oneYearAgo = new Date();
oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

const oldLinks = await db.collection('shortLinks')
  .where('createdAt', '<', oneYearAgo)
  .where('clicks', '==', 0)
  .get();
```

### Monitoring

Monitor:
- Short link creation rate
- Click-through rates
- Failed redirects (404s)

## Future Enhancements

- Custom short codes (user-defined)
- Link expiration dates
- Password-protected links
- Advanced analytics dashboard
- Bulk link creation


# Stripe Extension Troubleshooting Guide

## Issue: Extension Not Writing to Firestore

If the Stripe Extension isn't creating customer/subscription documents in Firestore after payment, check the following:

## 1. Verify Extension Installation

1. Go to Firebase Console → Extensions
2. Check if "Stripe Payments" extension is installed
3. Verify it's enabled and running

## 2. Check Extension Configuration

The extension needs to be configured with:
- **Stripe API Key**: Your Stripe secret key
- **Webhook Signing Secret**: A webhook secret (the extension creates its own webhook)
- **Products Collection Path**: Should be `/products`
- **Customers Collection Path**: Should be `/customers`
- **Sync Users**: Should be enabled

## 3. Verify Product Metadata

For the extension to set custom claims, your Stripe product must have:
- **Metadata key**: `firebaseRole`
- **Metadata value**: `"avanzado"` (for Avanzado plan)

To check:
1. Go to Stripe Dashboard → Products
2. Click on your "Avanzado" product
3. Scroll to "Metadata"
4. Ensure there's a key `firebaseRole` with value `avanzado`

## 4. Check Extension Webhook

The extension creates its own webhook endpoint. Check:
1. Go to Stripe Dashboard → Developers → Webhooks
2. Look for a webhook with URL containing `firebase` or your project ID
3. Verify it's receiving events (check the "Events" tab)
4. Ensure these events are enabled:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`

## 5. Check Extension Logs

1. Go to Firebase Console → Extensions → Stripe Payments
2. Click on "Logs" or "View logs"
3. Look for errors or warnings
4. Check if events are being processed

## 6. Manual Test

After a successful payment, check Firestore:
1. Go to Firebase Console → Firestore Database
2. Check `/customers/{userId}` - should exist after payment
3. Check `/customers/{userId}/subscriptions` - should have subscription document
4. Check `/products` - should have your product data

## 7. Verify Checkout Session Metadata

Our checkout session includes:
- `metadata.firebaseUserId`: The Firebase user ID
- `client_reference_id`: The Firebase user ID

The extension should use these to link the Stripe customer to the Firebase user.

## 8. Alternative: Manual Customer Creation

If the extension still doesn't work, you can manually create the customer document:

```javascript
// In Firestore, create:
/customers/{userId} = {
  stripeId: "cus_xxxxx", // From Stripe customer ID
  email: "user@example.com",
  // ... other fields
}
```

But this is not recommended - the extension should handle this automatically.

## 9. Check Extension Version

Make sure you're using a recent version of the Stripe Extension. Older versions might have bugs.

## 10. Reinstall Extension

If nothing works:
1. Uninstall the extension
2. Reinstall it with correct configuration
3. Test with a new payment

## Common Issues

### Issue: Extension webhook not receiving events
**Solution**: Check Stripe webhook endpoint is active and events are enabled

### Issue: Custom claims not updating
**Solution**: 
1. Verify product metadata `firebaseRole` is set
2. User needs to refresh token: `getIdToken(true)`
3. Check extension logs for errors

### Issue: Customer document not created
**Solution**: 
1. Check extension logs
2. Verify checkout session has `metadata.firebaseUserId`
3. Check if extension webhook is receiving `checkout.session.completed` events

## Testing Checklist

- [ ] Extension is installed and enabled
- [ ] Product has `firebaseRole` metadata set
- [ ] Extension webhook is active in Stripe
- [ ] Webhook events are being received
- [ ] Extension logs show no errors
- [ ] Checkout session includes `metadata.firebaseUserId`
- [ ] Customer document appears in Firestore after payment
- [ ] Subscription document appears in Firestore after payment


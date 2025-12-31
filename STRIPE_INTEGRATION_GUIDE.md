# Stripe Integration Guide - Firestore Security Rules

## Overview

The Firestore security rules have been updated to integrate with the Firebase Stripe Extension. Satellite imagery access is now restricted to users with active plans (basic, avanzado, or empresarial).

## Key Changes

### 1. Satellite Imagery Access Control
- **Users without plans**: Cannot access satellite imagery cache
- **Users with active plans**: Can access satellite imagery (basic, avanzado, or empresarial)
- **CTA Flow**: Still works (handled server-side via Admin SDK, bypasses rules)

### 2. Stripe Extension Collections
Added rules for Stripe Extension collections:
- `/customers/{uid}` - User's Stripe customer data
- `/customers/{uid}/checkout_sessions` - Checkout sessions
- `/customers/{uid}/subscriptions` - Active subscriptions
- `/customers/{uid}/payments` - Payment history
- `/products` - Stripe products (public read)
- `/prices` - Stripe prices (public read)
- `/tax_rates` - Tax rates (public read)

### 3. Plan Detection
The rules check for active plans in two ways:
1. **Stripe Custom Claims** (`stripeRole`): Set by Stripe Extension based on product metadata
2. **userPlans Collection**: Fallback for basic plan (free, no Stripe subscription)

## Stripe Product Configuration

### Setting Up Products in Stripe

1. **Create Products in Stripe Dashboard**
   - Go to Stripe Dashboard → Products
   - Create products for each plan tier

2. **Configure Product Metadata for Custom Claims**

   For the **Avanzado** plan product:
   - Add metadata: `firebaseRole` = `"avanzado"`
   - This will set `stripeRole: "avanzado"` as a custom claim on the user

   For the **Empresarial** plan product:
   - Add metadata: `firebaseRole` = `"empresarial"`
   - This will set `stripeRole: "empresarial"` as a custom claim on the user

   **Note**: Basic plan doesn't use Stripe (it's free), so it uses the `userPlans` collection instead.

3. **Create Prices**
   - Create annual prices for each product
   - Link prices to products

### Example Stripe Product Setup

**Avanzado Plan:**
```
Product Name: Avanzado
Description: Monitoreo satelital avanzado para cultivos
Metadata:
  firebaseRole: "avanzado"
Price: $2,000 MXN/year (recurring, annual)
```

**Empresarial Plan:**
```
Product Name: Empresarial
Description: Soluciones a medida para organizaciones
Metadata:
  firebaseRole: "empresarial"
Price: Custom (contact sales)
```

## How It Works

### Plan Detection Flow

1. **User subscribes to Avanzado via Stripe**
   - Stripe Extension creates subscription in Firestore
   - Extension sets custom claim: `stripeRole: "avanzado"`
   - User can now access satellite imagery

2. **User signs up for Basic plan (free)**
   - No Stripe subscription needed
   - System creates document in `userPlans` collection
   - Rules check `userPlans` collection for basic plan access

3. **User without any plan**
   - No `stripeRole` custom claim
   - No active `userPlans` document
   - Cannot access satellite imagery cache
   - Can still complete CTA flow (server-side bypass)

### Custom Claims

The Stripe Extension automatically sets custom claims on the user's auth token:
- `stripeRole: "avanzado"` - For Avanzado subscribers
- `stripeRole: "empresarial"` - For Empresarial subscribers

**Important**: Users need to refresh their auth token to get updated custom claims:
```javascript
import { getAuth } from 'firebase/auth';

async function refreshUserToken() {
  const auth = getAuth();
  await auth.currentUser?.getIdToken(true); // Force refresh
  const decodedToken = await auth.currentUser?.getIdTokenResult();
  return decodedToken?.claims.stripeRole;
}
```

## CTA Flow (Free Report)

The CTA flow still works for users without plans because:
- Lead creation/updates happen server-side via Admin SDK
- Satellite imagery generation happens server-side (bypasses Firestore rules)
- Email is sent directly, not through Firestore

## Testing

### Test Plan Access

1. **Test Basic Plan Access:**
   ```javascript
   // Create a basic plan in userPlans collection
   // User should be able to read cache
   ```

2. **Test Avanzado Plan Access:**
   ```javascript
   // Subscribe user to Avanzado via Stripe (test mode)
   // Wait for Stripe Extension to set custom claim
   // Refresh user token
   // User should be able to read cache
   ```

3. **Test No Plan Access:**
   ```javascript
   // User with no plan
   // Should NOT be able to read cache
   // Should get permission denied error
   ```

### Test Stripe Extension

1. **Verify Stripe Extension is installed:**
   - Check Firebase Console → Extensions
   - Should see "Stripe Payments" extension

2. **Verify Custom Claims:**
   - After subscription, check user's auth token
   - Should contain `stripeRole` claim

3. **Verify Firestore Collections:**
   - Check `/customers/{uid}` collection
   - Check `/customers/{uid}/subscriptions` collection
   - Should contain subscription data

## Security Notes

1. **Cache Access**: Only authenticated users with active plans can read cache
2. **Stripe Data**: Users can only access their own Stripe customer data
3. **Products/Prices**: Public read access (needed for pricing page)
4. **Leads**: No authentication required (for CTA flow)
5. **Server-Side**: Admin SDK bypasses all rules (for CTA flow and report generation)

## Troubleshooting

### User can't access satellite imagery

1. **Check if user has active plan:**
   - Check `stripeRole` custom claim
   - Check `userPlans` collection for basic plan

2. **Refresh auth token:**
   - Custom claims may not be updated
   - Force refresh: `getIdToken(true)`

3. **Check Stripe subscription status:**
   - Verify subscription is active in Stripe
   - Check Firestore `/customers/{uid}/subscriptions`

### Custom claims not updating

1. **Wait for Stripe Extension:**
   - Extension updates claims asynchronously
   - May take a few seconds after subscription

2. **Check Stripe Extension logs:**
   - Firebase Console → Extensions → Stripe Payments → Logs

3. **Verify product metadata:**
   - Ensure `firebaseRole` metadata is set correctly
   - Check product in Stripe Dashboard

## Next Steps

1. ✅ Deploy updated Firestore rules
2. ✅ Configure Stripe products with `firebaseRole` metadata
3. ✅ Test plan access with different user types
4. ✅ Update client code to refresh tokens after subscription
5. ✅ Monitor Stripe Extension logs for any issues


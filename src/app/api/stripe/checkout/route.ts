import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { getAdminApp } from "@/lib/firebase-admin";
import Stripe from "stripe";

// Lazy initialization to avoid build-time errors when env vars aren't set
function getStripe(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY environment variable is not set");
  }
  return new Stripe(secretKey, {
    apiVersion: "2025-12-15.clover",
});
}

export const dynamic = 'force-dynamic';

/**
 * Create a Stripe checkout session for Avanzado plan
 */
export async function POST(request: NextRequest) {
  try {
    // Get Firebase auth token from request (optional - can be called without auth for public checkout)
    const authHeader = request.headers.get("authorization");
    let userId: string | null = null;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      try {
        const token = authHeader.split("Bearer ")[1];
        const auth = getAuth(getAdminApp());
        const decodedToken = await auth.verifyIdToken(token);
        userId = decodedToken.uid;
      } catch (error) {
        // If token is invalid, continue without userId (guest checkout)
        console.log("[Stripe Checkout] No valid auth token, proceeding as guest");
      }
    }

    // Get request body to extract origin
    const body = await request.json().catch(() => ({}));
    const clientOrigin = body.origin;

    // Get price ID from environment variable
    // The buy button ID is: buy_btn_1Shhi4LJ2plhXJURpwRjenTU
    // Note: The price ID must be set via STRIPE_AVANZADO_PRICE_ID environment variable
    // You can find the price ID in your Stripe Dashboard > Products > [Your Product] > Pricing
    const priceId = process.env.STRIPE_AVANZADO_PRICE_ID;
    
    if (!priceId || !priceId.startsWith("price_")) {
      return NextResponse.json(
        { 
          error: "Stripe price ID not configured. Please set STRIPE_AVANZADO_PRICE_ID environment variable with a valid price ID (starts with 'price_'). You can find this in your Stripe Dashboard > Products." 
        },
        { status: 500 }
      );
    }

    // Get the origin from the request to support both local development and production
    // Priority: 1. Client-provided origin, 2. Request origin header, 3. Referer header, 4. Environment variable
    let origin = clientOrigin || request.headers.get("origin");
    
    if (!origin) {
      // Try to extract from referer header
      const referer = request.headers.get("referer");
      if (referer) {
        try {
          const url = new URL(referer);
          origin = `${url.protocol}//${url.host}`;
        } catch (e) {
          // If referer parsing fails, continue
        }
      }
    }
    
    // Fallback to environment variable or localhost
    if (!origin) {
      origin = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    }

    // Create checkout session
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${origin}/dashboard/planes?success=true`,
      cancel_url: `${origin}/precios?canceled=true`,
      allow_promotion_codes: true,
    };

    // If user is authenticated, link the customer
    if (userId) {
      const { getFirestore } = await import("firebase-admin/firestore");
      const db = getFirestore(getAdminApp());
      const customerDoc = await db.collection("customers").doc(userId).get();
      
      if (customerDoc.exists) {
        const customerData = customerDoc.data();
        const stripeCustomerId = customerData?.stripeId;
        if (stripeCustomerId) {
          sessionParams.customer = stripeCustomerId;
        }
      }
      
      // Always include Firebase user ID in metadata for Stripe Extension to link
      // The extension uses this to create/update the customer document
      sessionParams.metadata = {
        ...sessionParams.metadata,
        firebaseUserId: userId,
      };
      
      // Also set client_reference_id which some extensions use
      sessionParams.client_reference_id = userId;
    }

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create(sessionParams);

    return NextResponse.json({
      url: session.url,
    });
  } catch (error: any) {
    console.error("[Stripe Checkout] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create checkout session" },
      { status: 500 }
    );
  }
}


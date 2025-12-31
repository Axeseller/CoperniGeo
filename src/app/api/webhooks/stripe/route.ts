import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getAdminApp } from "@/lib/firebase-admin";
import { getAuth } from "firebase-admin/auth";

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
 * POST /api/webhooks/stripe
 * Handle Stripe webhook events for subscription updates
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get("stripe-signature");

    if (!signature) {
      console.error("[Stripe Webhook] No signature found");
      return NextResponse.json(
        { error: "No signature" },
        { status: 400 }
      );
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error("[Stripe Webhook] STRIPE_WEBHOOK_SECRET not configured");
      return NextResponse.json(
        { error: "Webhook secret not configured" },
        { status: 500 }
      );
    }

    let event: Stripe.Event;

    try {
      // Verify webhook signature
      const stripe = getStripe();
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: any) {
      console.error("[Stripe Webhook] Signature verification failed:", err.message);
      return NextResponse.json(
        { error: `Webhook signature verification failed: ${err.message}` },
        { status: 400 }
      );
    }

    console.log(`[Stripe Webhook] Received event: ${event.type}`);

    // Handle checkout session completed - this is when payment succeeds
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      console.log(`[Stripe Webhook] Checkout session completed: ${session.id}`);
      console.log(`[Stripe Webhook] Customer: ${session.customer}`);
      console.log(`[Stripe Webhook] Metadata:`, session.metadata);
      
      // The Stripe Extension should handle this, but we can log for debugging
      if (session.metadata?.firebaseUserId) {
        console.log(`[Stripe Webhook] Firebase user ID in metadata: ${session.metadata.firebaseUserId}`);
      }
    }

    // Handle subscription events
    if (
      event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.updated"
    ) {
      await handleSubscriptionEvent(event.data.object as Stripe.Subscription);
    }

    // Always return 200 to acknowledge receipt
    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error: any) {
    console.error("[Stripe Webhook] Error:", error);
    return NextResponse.json(
      { error: error.message || "Webhook handler failed" },
      { status: 500 }
    );
  }
}

/**
 * Handle subscription created/updated events
 */
async function handleSubscriptionEvent(subscription: Stripe.Subscription) {
  try {
    console.log(`[Stripe Webhook] Processing subscription ${subscription.id} for customer ${subscription.customer}`);

    // Get Firebase user ID from customer metadata or Firestore
    const { getFirestore } = await import("firebase-admin/firestore");
    const db = getFirestore(getAdminApp());

    // Find the Firebase user ID by Stripe customer ID
    // The Stripe Extension stores this in /customers/{uid} with stripeId field
    const customersRef = db.collection("customers");
    const customerQuery = await customersRef
      .where("stripeId", "==", subscription.customer)
      .limit(1)
      .get();

    if (customerQuery.empty) {
      console.log(`[Stripe Webhook] No Firebase user found for Stripe customer ${subscription.customer}`);
      return;
    }

    const customerDoc = customerQuery.docs[0];
    const userId = customerDoc.id;

    console.log(`[Stripe Webhook] Found Firebase user ${userId} for subscription ${subscription.id}`);

    // Refresh the user's auth token to update custom claims
    // The Stripe Extension should handle this, but we can force a refresh
    try {
      const auth = getAuth(getAdminApp());
      await auth.revokeRefreshTokens(userId);
      console.log(`[Stripe Webhook] Revoked refresh tokens for user ${userId} to force token refresh`);
    } catch (error) {
      console.error(`[Stripe Webhook] Error revoking tokens:`, error);
      // Continue even if token revocation fails
    }

    // Log subscription status for debugging
    console.log(`[Stripe Webhook] Subscription status: ${subscription.status}`);
    console.log(`[Stripe Webhook] Subscription product: ${subscription.items.data[0]?.price.product}`);

    // The Stripe Extension will handle updating Firestore with the subscription data
    // We just need to ensure the user's token is refreshed so they see the updated plan immediately
  } catch (error: any) {
    console.error("[Stripe Webhook] Error handling subscription event:", error);
    throw error;
  }
}


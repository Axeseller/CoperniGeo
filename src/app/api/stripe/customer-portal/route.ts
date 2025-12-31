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
 * Create a Stripe customer portal session
 */
export async function POST(request: NextRequest) {
  try {
    // Get Firebase auth token from request
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const token = authHeader.split("Bearer ")[1];
    const auth = getAuth(getAdminApp());
    const decodedToken = await auth.verifyIdToken(token);
    const userId = decodedToken.uid;

    // Get user's Stripe customer ID from Firestore
    const { getFirestore } = await import("firebase-admin/firestore");
    const db = getFirestore(getAdminApp());
    const customerDoc = await db.collection("customers").doc(userId).get();

    if (!customerDoc.exists) {
      return NextResponse.json(
        { error: "No Stripe customer found. Please subscribe first." },
        { status: 404 }
      );
    }

    const customerData = customerDoc.data();
    const stripeCustomerId = customerData?.stripeId;

    if (!stripeCustomerId) {
      return NextResponse.json(
        { error: "No Stripe customer ID found" },
        { status: 404 }
      );
    }

    // Create portal session with configuration
    const stripe = getStripe();
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/planes`,
      // Use the configured portal (optional - will use default if not specified)
      // configuration: 'bpc_1ShghLLJ2plhXJURTw6XfBOv',
    });

    return NextResponse.json({
      url: portalSession.url,
    });
  } catch (error: any) {
    console.error("[Stripe Portal] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create portal session" },
      { status: 500 }
    );
  }
}


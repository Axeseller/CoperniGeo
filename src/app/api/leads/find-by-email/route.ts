import { NextRequest, NextResponse } from "next/server";
import { getFirestore } from "firebase-admin/firestore";
import { getAdminApp } from "@/lib/firebase-admin";

export const dynamic = 'force-dynamic';

/**
 * Find a lead by email and return its ID
 * Used to find existing leads created from homepage CTA
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    const db = getFirestore(getAdminApp());
    const normalizedEmail = email.toLowerCase().trim();
    
    // Query for leads with this email
    const leadsQuery = await db.collection('leads')
      .where('email', '==', normalizedEmail)
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();

    if (leadsQuery.empty) {
      return NextResponse.json({ leadId: null });
    }

    const leadDoc = leadsQuery.docs[0];
    return NextResponse.json({ leadId: leadDoc.id });
  } catch (error: any) {
    console.error("[API] Error finding lead by email:", error);
    return NextResponse.json(
      { error: "Error finding lead" },
      { status: 500 }
    );
  }
}


import { NextRequest, NextResponse } from "next/server";
import { getFirestore } from "firebase-admin/firestore";
import { getAdminApp } from "@/lib/firebase-admin";

export const dynamic = 'force-dynamic';

/**
 * Check if a lead with the given email has already completed the CTA flow
 * Returns true if a lead exists with coordinates or status 'snapshot_requested'
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
      .get();

    if (leadsQuery.empty) {
      return NextResponse.json({ hasCompleted: false });
    }

    // Check if any lead has completed the flow
    for (const docSnap of leadsQuery.docs) {
      const data = docSnap.data();
      const hasCoordinates = data.coordinates && Array.isArray(data.coordinates) && data.coordinates.length >= 3;
      const hasSnapshotRequested = data.status === 'snapshot_requested';
      
      if (hasCoordinates || hasSnapshotRequested) {
        return NextResponse.json({ hasCompleted: true });
      }
    }

    return NextResponse.json({ hasCompleted: false });
  } catch (error: any) {
    console.error("[API] Error checking email:", error);
    // Fail open - allow them to proceed if there's an error
    return NextResponse.json({ hasCompleted: false });
  }
}


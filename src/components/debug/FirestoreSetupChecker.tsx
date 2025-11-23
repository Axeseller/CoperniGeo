"use client";

import React, { useState } from "react";
import { getDb, getAuthInstance } from "@/lib/firebase";
import { collection, addDoc, getDocs, deleteDoc, doc } from "firebase/firestore";

/**
 * A component that checks if Firestore is properly enabled and configured
 */
export default function FirestoreSetupChecker() {
  const [results, setResults] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const addResult = (message: string, emoji: string = "📋") => {
    setResults((prev) => [...prev, `${emoji} ${message}`]);
    console.log(`${emoji} ${message}`);
  };

  const checkFirestoreSetup = async () => {
    setLoading(true);
    setResults([]);

    try {
      addResult("Starting Firestore Setup Check...", "🔍");
      addResult("", "");

      // Step 1: Check authentication
      addResult("Step 1: Checking Authentication", "1️⃣");
      const auth = getAuthInstance();
      const user = auth.currentUser;

      if (!user) {
        addResult("ERROR: No user authenticated", "❌");
        addResult("Please sign in to continue", "⚠️");
        setLoading(false);
        return;
      }

      addResult(`User authenticated: ${user.email}`, "✅");
      addResult("", "");

      // Step 2: Check Firestore instance
      addResult("Step 2: Checking Firestore Instance", "2️⃣");
      const db = getDb();
      const projectId = db.app.options.projectId;
      addResult(`Firestore instance created`, "✅");
      addResult(`Project ID: ${projectId}`, "📌");
      addResult("", "");

      // Step 3: Test READ operation
      addResult("Step 3: Testing READ Operation", "3️⃣");
      addResult("Attempting to read from 'areas' collection...", "🔄");

      try {
        const areasRef = collection(db, "areas");
        const snapshot = await getDocs(areasRef);
        addResult(`READ SUCCESS: Found ${snapshot.docs.length} documents`, "✅");
      } catch (readError: any) {
        addResult(`READ FAILED: ${readError.message}`, "❌");
        addResult(`Error code: ${readError.code}`, "⚠️");
      }
      addResult("", "");

      // Step 4: Test WRITE operation (most critical)
      addResult("Step 4: Testing WRITE Operation", "4️⃣");
      addResult("This is the critical test - writes are failing", "⚠️");
      addResult("Attempting to write a test document...", "🔄");

      try {
        const testCollection = collection(db, "_firestore_setup_test");
        const testData = {
          test: true,
          timestamp: new Date().toISOString(),
          userId: user.uid,
          message: "If you see this in Firebase Console, writes are working!"
        };

        // Set a 10-second timeout for the write
        const writePromise = addDoc(testCollection, testData);
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error("Write timeout after 10 seconds")), 10000);
        });

        const docRef = await Promise.race([writePromise, timeoutPromise]);

        addResult(`WRITE SUCCESS: Document ID: ${docRef.id}`, "✅");
        addResult("🎉 Firestore IS working! The issue was resolved!", "🎉");
        
        // Clean up test document
        try {
          await deleteDoc(doc(db, "_firestore_setup_test", docRef.id));
          addResult("Test document cleaned up", "🧹");
        } catch (e) {
          // Ignore cleanup errors
        }

      } catch (writeError: any) {
        addResult("", "");
        addResult("═════════════════════════════════════════", "❌");
        addResult("WRITE FAILED - FIRESTORE IS NOT ENABLED", "❌");
        addResult("═════════════════════════════════════════", "❌");
        addResult("", "");

        if (writeError.message.includes("timeout") || writeError.message.includes("Timeout")) {
          addResult("The write operation timed out", "⏱️");
          addResult("This means Firestore database is NOT enabled", "🚫");
        } else {
          addResult(`Error: ${writeError.message}`, "⚠️");
          addResult(`Code: ${writeError.code}`, "⚠️");
        }

        addResult("", "");
        addResult("📋 SOLUTION: Enable Firestore Database", "🔧");
        addResult("", "");
        addResult("Follow these steps EXACTLY:", "👇");
        addResult("", "");
        addResult("1. Open Firebase Console:", "1️⃣");
        addResult("   https://console.firebase.google.com/", "🔗");
        addResult("", "");
        addResult("2. Select your project: copernigeo", "2️⃣");
        addResult("", "");
        addResult("3. Look at the left sidebar menu", "3️⃣");
        addResult("   Find 'Build' section", "📁");
        addResult("   Click 'Firestore Database'", "📊");
        addResult("", "");
        addResult("4. What do you see?", "4️⃣");
        addResult("", "");
        addResult("   Option A: 'Create database' button", "🅰️");
        addResult("   → This means Firestore is NOT enabled", "⚠️");
        addResult("   → Click 'Create database'", "👆");
        addResult("   → Choose 'Production mode' or 'Test mode'", "📝");
        addResult("   → Select a location (same as your Auth region)", "🌎");
        addResult("   → Wait 2-3 minutes for provisioning", "⏳");
        addResult("", "");
        addResult("   Option B: You see 'Data', 'Rules', 'Indexes' tabs", "🅱️");
        addResult("   → Firestore IS enabled", "✅");
        addResult("   → Check if you see any collections/documents", "📄");
        addResult("   → Go to 'Rules' tab and check permissions", "🔒");
        addResult("", "");
        addResult("5. After enabling Firestore:", "5️⃣");
        addResult("   → Come back to this page", "↩️");
        addResult("   → Refresh the page (Ctrl+Shift+R)", "🔄");
        addResult("   → Run this test again", "🧪");
        addResult("", "");
        addResult("═════════════════════════════════════════", "");
      }

    } catch (error: any) {
      addResult("", "");
      addResult(`Unexpected error: ${error.message}`, "❌");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-red-50 to-orange-50 p-6 rounded-lg shadow-lg border-2 border-red-300">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-2xl font-bold text-red-900">🔧 Firestore Setup Checker</h3>
        <button
          onClick={checkFirestoreSetup}
          disabled={loading}
          className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 disabled:opacity-50 font-semibold shadow-md transition-all"
        >
          {loading ? "Checking..." : "🔍 Check Firestore Setup"}
        </button>
      </div>

      <div className="bg-gray-900 text-green-400 p-4 rounded-md font-mono text-sm overflow-auto max-h-[600px] shadow-inner">
        <pre className="whitespace-pre-wrap">
          {results.length === 0
            ? "Click the button above to check if Firestore is properly enabled...\n\nThis will test both READ and WRITE operations to determine the exact issue."
            : results.join("\n")}
        </pre>
      </div>

      <div className="mt-4 bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
        <p className="text-sm text-yellow-900 font-semibold mb-2">⚠️ Why writes are failing:</p>
        <p className="text-sm text-yellow-800">
          If this test shows &quot;WRITE FAILED&quot;, it means <strong>Firestore database is not enabled</strong> in your 
          Firebase project. The Firebase SDK can initialize and even read some data, but writes require the 
          actual Firestore database service to be provisioned in Firebase Console.
        </p>
      </div>
    </div>
  );
}


"use client";

import React, { useState } from "react";
import { getDb, getAuthInstance } from "@/lib/firebase";
import { collection, addDoc, getDocs, enableNetwork, disableNetwork } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

/**
 * Comprehensive Firestore connectivity diagnostic component
 * This will help identify why Firestore is not responding
 */
export default function FirestoreConnectionTest() {
  const [results, setResults] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const addResult = (message: string) => {
    setResults((prev) => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testFirestoreConnection = async () => {
    setLoading(true);
    setResults([]);
    
    try {
      addResult("🔍 Starting Firestore Diagnostic Test...\n");
      
      // Step 1: Check authentication
      addResult("Step 1: Checking authentication...");
      const auth = getAuthInstance();
      let user = auth.currentUser;
      
      if (!user) {
        addResult("⚠️ No current user, waiting for auth state...");
        user = await new Promise((resolve, reject) => {
          const unsubscribe = onAuthStateChanged(auth, (u) => {
            unsubscribe();
            if (u) resolve(u);
            else reject(new Error("No user"));
          });
          setTimeout(() => {
            unsubscribe();
            reject(new Error("Auth timeout"));
          }, 3000);
        }) as any;
      }
      
      if (user) {
        addResult(`✅ User authenticated: ${user.uid} (${user.email})`);
      } else {
        addResult("❌ No user authenticated - cannot test Firestore");
        setLoading(false);
        return;
      }
      
      // Step 2: Get Firestore instance
      addResult("\nStep 2: Initializing Firestore...");
      const db = getDb();
      addResult(`✅ Firestore instance created`);
      addResult(`   Project ID: ${db.app?.options?.projectId || "unknown"}`);
      addResult(`   App name: ${db.app?.name || "unknown"}`);
      
      // Step 3: Check network status
      addResult("\nStep 3: Checking network connection...");
      try {
        await enableNetwork(db);
        addResult("✅ Network enabled");
      } catch (networkError: any) {
        addResult(`❌ Failed to enable network: ${networkError.message}`);
      }
      
      // Step 4: Try a simple read (no timeout - let it respond naturally)
      addResult("\nStep 4: Testing read operation...");
      const testReadCollection = collection(db, "_connection_test_read");
      
      try {
        const readSnapshot = await getDocs(testReadCollection);
        addResult(`✅ Read SUCCESS - Found ${readSnapshot.docs.length} documents`);
        addResult("   🎉 Firestore reads are working!");
      } catch (readError: any) {
        addResult(`❌ Read failed: ${readError.message}`);
        if (readError.code) {
          addResult(`   Error code: ${readError.code}`);
          if (readError.code === "permission-denied") {
            addResult("   → This means Firestore IS enabled but rules are blocking");
          } else if (readError.code === "unavailable") {
            addResult("   → This means Firestore might not be enabled or network issue");
          }
        }
      }
      
      // Step 5: Try a simple write (no timeout - let it respond naturally)
      addResult("\nStep 5: Testing write operation...");
      const testWriteCollection = collection(db, "_connection_test_write");
      const testData = {
        test: true,
        timestamp: new Date().toISOString(),
        userId: user.uid,
      };
      
      try {
        const writeResult = await addDoc(testWriteCollection, testData);
        if (writeResult?.id) {
          addResult(`✅ Write SUCCESS - Document ID: ${writeResult.id}`);
          addResult("   🎉 Firestore writes ARE working!");
        } else {
          addResult("⚠️ Write returned but no document ID");
        }
      } catch (writeError: any) {
        addResult(`❌ Write failed: ${writeError.message}`);
        if (writeError.code) {
          addResult(`   Error code: ${writeError.code}`);
          if (writeError.code === "permission-denied") {
            addResult("   → Rules are blocking writes");
            addResult("   → Go to Firestore > Rules and use:");
            addResult("      match /{document=**} {");
            addResult("        allow read, write: if request.auth != null;");
            addResult("      }");
          } else if (writeError.code === "unavailable") {
            addResult("   → Firestore is unavailable - check if enabled");
          }
        }
      }
      
      // Step 6: Network tab instructions
      addResult("\nStep 6: Manual Network Check");
      addResult("   1. Open DevTools (F12)");
      addResult("   2. Go to Network tab");
      addResult("   3. Filter for 'firestore'");
      addResult("   4. Try saving an area again");
      addResult("   5. Look for requests to firestore.googleapis.com");
      addResult("   6. Check status:");
      addResult("      - PENDING (red) → Not enabled or network blocked");
      addResult("      - 403 → Security rules blocking");
      addResult("      - 404 → Wrong project ID or database name");
      addResult("      - No requests → SDK not initialized");
      
      addResult("\n✅ Diagnostic complete!");
      
    } catch (error: any) {
      addResult(`\n❌ Diagnostic error: ${error.message}`);
      addResult(`   Stack: ${error.stack?.split('\n')[0]}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg space-y-4 border-2 border-red-200">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold text-gray-900">🔧 Firestore Connection Diagnostic</h3>
        <button
          onClick={testFirestoreConnection}
          disabled={loading}
          className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 disabled:opacity-50 font-semibold"
        >
          {loading ? "Running Tests..." : "Run Full Diagnostic"}
        </button>
      </div>
      
      <div className="bg-gray-900 text-green-400 p-4 rounded-md font-mono text-xs overflow-auto max-h-96">
        <pre className="whitespace-pre-wrap">
          {results.length === 0 
            ? "Click 'Run Full Diagnostic' to start testing Firestore connectivity..."
            : results.join("\n")}
        </pre>
      </div>
      
      <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-md">
        <p className="text-sm text-yellow-800 font-semibold mb-2">⚠️ Most Common Issue:</p>
        <p className="text-sm text-yellow-700">
          If both read and write timeout, <strong>Firestore is likely NOT enabled</strong> in Firebase Console.
          Go to Firebase Console → Firestore Database → Click &quot;Create database&quot; if you see that button.
        </p>
      </div>
    </div>
  );
}


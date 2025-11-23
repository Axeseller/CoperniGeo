"use client";

import { useState } from "react";
import { getDb, getAuthInstance } from "@/lib/firebase";
import { collection, addDoc, getDocs, Timestamp } from "firebase/firestore";

export default function FirestoreTest() {
  const [result, setResult] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const testFirestore = async () => {
    setLoading(true);
    setResult("Testing...\n");

    try {
      const db = getDb();
      const auth = getAuthInstance();
      const user = auth.currentUser;

      if (!user) {
        setResult("❌ ERROR: User not authenticated");
        setLoading(false);
        return;
      }

      setResult((prev) => prev + `✅ User authenticated: ${user.uid}\n`);
      setResult((prev) => prev + `✅ Firestore initialized\n`);

      // Test 1: Simple write
      setResult((prev) => prev + `\n🧪 Test 1: Writing test document...\n`);
      const testCollection = collection(db, "test");
      const testData = {
        test: true,
        timestamp: Timestamp.now(),
        userId: user.uid,
      };

      const writePromise = addDoc(testCollection, testData);
      const writeTimeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Write timeout after 10s")), 10000)
      );

      try {
        const docRef = await Promise.race([writePromise, writeTimeout]) as any;
        setResult((prev) => prev + `✅ Write SUCCESS: Document ID = ${docRef.id}\n`);
      } catch (writeError: any) {
        setResult((prev) => prev + `❌ Write FAILED: ${writeError.message}\n`);
        if (writeError.code) {
          setResult((prev) => prev + `   Error code: ${writeError.code}\n`);
        }
        setLoading(false);
        return;
      }

      // Test 2: Simple read
      setResult((prev) => prev + `\n🧪 Test 2: Reading test documents...\n`);
      const readPromise = getDocs(testCollection);
      const readTimeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Read timeout after 10s")), 10000)
      );

      try {
        const snapshot = await Promise.race([readPromise, readTimeout]) as any;
        setResult((prev) => prev + `✅ Read SUCCESS: Found ${snapshot.docs.length} documents\n`);
      } catch (readError: any) {
        setResult((prev) => prev + `❌ Read FAILED: ${readError.message}\n`);
        if (readError.code) {
          setResult((prev) => prev + `   Error code: ${readError.code}\n`);
        }
      }

      setResult((prev) => prev + `\n✅ All tests completed!`);
    } catch (error: any) {
      setResult((prev) => prev + `\n❌ FATAL ERROR: ${error.message}\n`);
      setResult((prev) => prev + `Stack: ${error.stack}\n`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-md">
      <h3 className="text-lg font-semibold mb-4">Firestore Connection Test</h3>
      <button
        onClick={testFirestore}
        disabled={loading}
        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 mb-4"
      >
        {loading ? "Testing..." : "Run Firestore Test"}
      </button>
      <pre className="bg-gray-100 p-4 rounded text-xs font-mono whitespace-pre-wrap max-h-96 overflow-auto">
        {result || "Click the button to run tests..."}
      </pre>
    </div>
  );
}


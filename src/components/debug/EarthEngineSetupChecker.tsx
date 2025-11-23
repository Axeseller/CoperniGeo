"use client";

import React, { useState } from "react";

/**
 * A component that helps diagnose Earth Engine setup issues
 */
export default function EarthEngineSetupChecker() {
  const [results, setResults] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const addResult = (message: string, emoji: string = "📋") => {
    setResults((prev) => [...prev, `${emoji} ${message}`]);
    console.log(`${emoji} ${message}`);
  };

  const checkEarthEngineSetup = async () => {
    setLoading(true);
    setResults([]);

    try {
      addResult("Starting Earth Engine Setup Check...", "🔍");
      addResult("", "");

      // Step 1: Check if credentials are configured
      addResult("Step 1: Checking Server-Side Configuration", "1️⃣");
      addResult("Calling test API endpoint...", "🔄");

      try {
        const response = await fetch("/api/earth-engine/test", {
          method: "POST",
        });

        const data = await response.json();

        if (response.ok && data.success) {
          addResult("", "");
          addResult("═════════════════════════════════════════", "✅");
          addResult("EARTH ENGINE IS WORKING!", "✅");
          addResult("═════════════════════════════════════════", "✅");
          addResult("", "");
          addResult(`Test result: ${data.message}`, "🎉");
          addResult("You can now load satellite images!", "🛰️");
        } else {
          addResult("", "");
          addResult("═════════════════════════════════════════", "❌");
          addResult("EARTH ENGINE IS NOT CONFIGURED", "❌");
          addResult("═════════════════════════════════════════", "❌");
          addResult("", "");
          addResult(`Error: ${data.error || "Unknown error"}`, "⚠️");
          
          if (data.details) {
            addResult("", "");
            addResult("Details:", "📋");
            addResult(data.details, "");
          }

          // Provide solution steps
          addResult("", "");
          addResult("═══════════ SOLUTION ═══════════", "🔧");
          addResult("", "");
          addResult("You need to configure Google Earth Engine with a Service Account", "📝");
          addResult("", "");
          
          addResult("STEP 0: Enable Earth Engine API (MOST IMPORTANT!)", "0️⃣");
          addResult("", "");
          addResult("This is usually the missing step!", "⚠️");
          addResult("", "");
          addResult("1. Go to: https://console.cloud.google.com/apis/library/earthengine.googleapis.com?project=copernigeo", "🔗");
          addResult("2. Click the 'ENABLE' button", "▶️");
          addResult("3. Wait for it to enable (takes a few seconds)", "⏳");
          addResult("", "");
          
          addResult("STEP 1: Verify Service Account Exists", "1️⃣");
          addResult("", "");
          addResult("1. Go to: https://console.cloud.google.com/iam-admin/serviceaccounts?project=copernigeo", "🔗");
          addResult("2. You should see your service account listed", "👀");
          addResult("3. If not, create one:", "");
          addResult("   - Click 'Create Service Account'", "➕");
          addResult("   - Name it: 'earth-engine-service'", "✏️");
          addResult("   - Click 'Create and Continue'", "▶️");
          addResult("", "");
          
          addResult("STEP 2: Assign Roles", "2️⃣");
          addResult("", "");
          addResult("In the 'Grant this service account access' section:", "🔐");
          addResult("Add these roles:", "");
          addResult("  • Earth Engine Resource Admin", "");
          addResult("  • Earth Engine Resource Writer", "");
          addResult("  • Service Account Token Creator", "");
          addResult("Then click 'Continue' and 'Done'", "✅");
          addResult("", "");
          
          addResult("STEP 3: Create and Download JSON Key", "3️⃣");
          addResult("", "");
          addResult("1. Click on the service account you just created", "👆");
          addResult("2. Go to the 'Keys' tab", "🔑");
          addResult("3. Click 'Add Key' > 'Create new key'", "➕");
          addResult("4. Choose 'JSON' format", "📄");
          addResult("5. Click 'Create' - a JSON file will download", "💾");
          addResult("", "");
          
          addResult("STEP 4: Register with Earth Engine", "4️⃣");
          addResult("", "");
          addResult("1. Go to: https://code.earthengine.google.com/register", "🔗");
          addResult("2. Sign in with your Google account", "👤");
          addResult("3. Choose 'Noncommercial' or 'Commercial' use", "📋");
          addResult("4. Complete the registration form", "✍️");
          addResult("5. Wait for approval email (usually instant)", "📧");
          addResult("", "");
          
          addResult("STEP 5: Add Credentials to .env.local", "5️⃣");
          addResult("", "");
          addResult("Open the JSON file you downloaded and copy:", "📄");
          addResult("", "");
          addResult("1. Find 'client_email' - it looks like:", "");
          addResult("   earth-engine-service@copernigeo.iam.gserviceaccount.com", "");
          addResult("", "");
          addResult("2. Find 'private_key' - it looks like:", "");
          addResult("   -----BEGIN PRIVATE KEY-----\\nMIIEvg...\\n-----END PRIVATE KEY-----\\n", "");
          addResult("", "");
          addResult("3. Add to your .env.local file:", "✏️");
          addResult("", "");
          addResult("EARTH_ENGINE_CLIENT_EMAIL=<paste client_email here>", "");
          addResult("EARTH_ENGINE_PRIVATE_KEY=\\\"<paste full private_key here>\\\"", "");
          addResult("", "");
          addResult("⚠️ IMPORTANT: Keep the quotes around the private key!", "⚠️");
          addResult("⚠️ IMPORTANT: Keep the backslash-n characters in the private key!", "⚠️");
          addResult("", "");
          
          addResult("STEP 6: Restart Your Dev Server", "6️⃣");
          addResult("", "");
          addResult("1. Stop the dev server (Ctrl+C in terminal)", "🛑");
          addResult("2. Run: npm run dev", "▶️");
          addResult("3. Wait for server to start", "⏳");
          addResult("4. Come back to this page", "↩️");
          addResult("5. Click 'Check Earth Engine Setup' again", "🔄");
          addResult("", "");
          addResult("═══════════════════════════════════════", "");
        }
      } catch (error: any) {
        addResult("", "");
        addResult("═════════════════════════════════════════", "❌");
        addResult("FAILED TO CONNECT TO SERVER", "❌");
        addResult("═════════════════════════════════════════", "❌");
        addResult("", "");
        addResult(`Error: ${error.message}`, "⚠️");
        addResult("", "");
        addResult("Make sure your dev server is running", "🔄");
        addResult("Run: npm run dev", "💻");
      }

    } catch (error: any) {
      addResult("", "");
      addResult(`Unexpected error: ${error.message}`, "❌");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-6 rounded-lg shadow-lg border-2 border-blue-300">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-2xl font-bold text-blue-900">🛰️ Earth Engine Setup Checker</h3>
        <button
          onClick={checkEarthEngineSetup}
          disabled={loading}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-semibold shadow-md transition-all"
        >
          {loading ? "Checking..." : "🔍 Check Earth Engine Setup"}
        </button>
      </div>

      <div className="bg-gray-900 text-cyan-400 p-4 rounded-md font-mono text-sm overflow-auto max-h-[600px] shadow-inner">
        <pre className="whitespace-pre-wrap">
          {results.length === 0
            ? "Click the button above to check if Earth Engine is properly configured...\n\nThis will test if your service account credentials are set up correctly."
            : results.join("\n")}
        </pre>
      </div>

      <div className="mt-4 bg-blue-50 border-l-4 border-blue-400 p-4 rounded">
        <p className="text-sm text-blue-900 font-semibold mb-2">📘 About Earth Engine:</p>
        <p className="text-sm text-blue-800">
          Google Earth Engine provides satellite imagery (Copernicus Sentinel-2) for agricultural monitoring.
          It requires a service account with proper credentials to access the data programmatically.
        </p>
      </div>
    </div>
  );
}


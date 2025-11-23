import { NextResponse } from "next/server";
import { initializeEarthEngine, getEarthEngine } from "@/lib/earthEngine";

export const dynamic = 'force-dynamic';

/**
 * Test endpoint to verify Earth Engine configuration
 */
export async function POST() {
  try {
    console.log("🧪 Testing Earth Engine setup...");
    
    // Check if credentials are present
    const hasPrivateKey = !!process.env.EARTH_ENGINE_PRIVATE_KEY;
    const hasClientEmail = !!process.env.EARTH_ENGINE_CLIENT_EMAIL;
    const hasCredentialsFile = !!process.env.GOOGLE_APPLICATION_CREDENTIALS;
    
    console.log("Credentials check:", {
      hasPrivateKey,
      hasClientEmail,
      hasCredentialsFile,
      clientEmail: process.env.EARTH_ENGINE_CLIENT_EMAIL?.substring(0, 30) + "...",
    });
    
    if (!hasPrivateKey && !hasClientEmail && !hasCredentialsFile) {
      return NextResponse.json(
        {
          success: false,
          error: "No Earth Engine credentials found",
          details: "Missing EARTH_ENGINE_PRIVATE_KEY and EARTH_ENGINE_CLIENT_EMAIL environment variables, or GOOGLE_APPLICATION_CREDENTIALS",
          needsSetup: true,
        },
        { status: 500 }
      );
    }
    
    if (hasPrivateKey && !hasClientEmail) {
      return NextResponse.json(
        {
          success: false,
          error: "EARTH_ENGINE_CLIENT_EMAIL is missing",
          details: "You have EARTH_ENGINE_PRIVATE_KEY but EARTH_ENGINE_CLIENT_EMAIL is not set",
          needsSetup: true,
        },
        { status: 500 }
      );
    }
    
    if (!hasPrivateKey && hasClientEmail) {
      return NextResponse.json(
        {
          success: false,
          error: "EARTH_ENGINE_PRIVATE_KEY is missing",
          details: "You have EARTH_ENGINE_CLIENT_EMAIL but EARTH_ENGINE_PRIVATE_KEY is not set",
          needsSetup: true,
        },
        { status: 500 }
      );
    }
    
    // Try to initialize Earth Engine
    console.log("Attempting to initialize Earth Engine...");
    await initializeEarthEngine();
    
    // Try a simple operation
    console.log("Testing Earth Engine with a simple operation...");
    const ee = getEarthEngine();
    const point = ee.Geometry.Point([0, 0]);
    
    // Get info about the point (tests if Earth Engine is actually working)
    const pointInfo = await new Promise<any>((resolve, reject) => {
      point.getInfo((value: any, error?: Error) => {
        if (error) {
          console.error("Earth Engine getInfo error:", error);
          reject(error);
        } else {
          console.log("Earth Engine getInfo success:", value);
          resolve(value);
        }
      });
    });
    
    console.log("✅ Earth Engine test successful!");
    
    return NextResponse.json({
      success: true,
      message: "Earth Engine is properly configured and working!",
      testResult: pointInfo,
      credentials: {
        clientEmail: process.env.EARTH_ENGINE_CLIENT_EMAIL,
        method: hasCredentialsFile ? "credentials_file" : "environment_variables",
      },
    });
    
  } catch (error: any) {
    console.error("❌ Earth Engine test failed:", error);
    console.error("Error details:", {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });
    
    let errorMessage = error.message || "Unknown error";
    let details = error.stack || "";
    
    // Provide specific guidance based on error
    if (errorMessage.includes("authentication") || errorMessage.includes("authenticateViaPrivateKey")) {
      errorMessage = "Earth Engine authentication failed";
      details = "Your credentials might be incorrect or malformed. Check:\n" +
        "1. EARTH_ENGINE_CLIENT_EMAIL is the full email from the service account\n" +
        "2. EARTH_ENGINE_PRIVATE_KEY includes the full key with -----BEGIN PRIVATE KEY----- and -----END PRIVATE KEY-----\n" +
        "3. The private key preserves \\n newline characters";
    } else if (errorMessage.includes("initialization") || errorMessage.includes("initialize")) {
      errorMessage = "Earth Engine initialization failed";
      details = "The service account might not be registered with Earth Engine. Check:\n" +
        "1. Your Google account is registered at https://code.earthengine.google.com/register\n" +
        "2. The service account has the correct roles in Google Cloud Console:\n" +
        "   - Earth Engine Resource Admin\n" +
        "   - Earth Engine Resource Writer";
    }
    
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        details: details,
        needsSetup: true,
      },
      { status: 500 }
    );
  }
}


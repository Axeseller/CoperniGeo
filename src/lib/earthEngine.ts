import * as ee from "@google/earthengine";
import * as fs from "fs";
import * as path from "path";

let initialized = false;

/**
 * Initialize Google Earth Engine with service account credentials
 */
export async function initializeEarthEngine(): Promise<void> {
  if (initialized) {
    console.log("✅ Earth Engine already initialized");
    return;
  }

  try {
    console.log("🔵 Starting Earth Engine initialization...");
    
    // Check if credentials are provided via environment variables
    const privateKey = process.env.EARTH_ENGINE_PRIVATE_KEY;
    const clientEmail = process.env.EARTH_ENGINE_CLIENT_EMAIL;

    console.log("🔵 Credentials check:", {
      hasPrivateKey: !!privateKey,
      privateKeyLength: privateKey?.length || 0,
      privateKeyStart: privateKey?.substring(0, 30) + "...",
      hasClientEmail: !!clientEmail,
      clientEmail: clientEmail,
    });

    if (privateKey && clientEmail) {
      // Use service account credentials from environment variables
      const credentials = {
        client_email: clientEmail,
        private_key: privateKey.replace(/\\n/g, "\n"),
      };

      console.log("🔵 Credentials prepared:", {
        client_email: credentials.client_email,
        private_key_length: credentials.private_key.length,
        private_key_start: credentials.private_key.substring(0, 50) + "...",
        has_begin_marker: credentials.private_key.includes("-----BEGIN PRIVATE KEY-----"),
        has_end_marker: credentials.private_key.includes("-----END PRIVATE KEY-----"),
        newline_count: (credentials.private_key.match(/\n/g) || []).length,
      });

      console.log("🔵 Calling ee.data.authenticateViaPrivateKey...");
      await new Promise<void>((resolve, reject) => {
        ee.data.authenticateViaPrivateKey(
          credentials,
          () => {
            console.log("✅ Earth Engine authenticated via private key");
            resolve();
          },
          (error?: Error) => {
            console.error("❌ Authentication failed:", error);
            reject(new Error(`Earth Engine authentication failed: ${error?.message || "Unknown error"}`));
          }
        );
      });
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      // Use service account file path
      const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
      if (!credentialsPath) {
        throw new Error("GOOGLE_APPLICATION_CREDENTIALS is not set");
      }

      // Resolve the path (handle both absolute and relative paths)
      const resolvedPath = path.isAbsolute(credentialsPath)
        ? credentialsPath
        : path.resolve(process.cwd(), credentialsPath);

      // Read the credentials file
      if (!fs.existsSync(resolvedPath)) {
        throw new Error(`Credentials file not found: ${resolvedPath}`);
      }

      const credentialsFile = JSON.parse(fs.readFileSync(resolvedPath, "utf-8"));

      await new Promise<void>((resolve, reject) => {
        ee.data.authenticateViaPrivateKey(
          credentialsFile,
          () => {
            console.log("Earth Engine authenticated via credentials file");
            resolve();
          },
          (error?: Error) => {
            reject(new Error(`Earth Engine authentication failed: ${error?.message || "Unknown error"}`));
          }
        );
      });
    } else {
      throw new Error(
        "Earth Engine credentials not found. Please set EARTH_ENGINE_PRIVATE_KEY and EARTH_ENGINE_CLIENT_EMAIL, or GOOGLE_APPLICATION_CREDENTIALS"
      );
    }

    // Initialize Earth Engine with the project ID
    console.log("🔵 Calling ee.initialize...");
    
    // Try to get project ID from the service account email
    const projectId = clientEmail?.split('@')[1]?.split('.')[0] || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'copernigeo';
    console.log("🔵 Using project ID:", projectId);
    
    await new Promise<void>((resolve, reject) => {
      try {
        // Initialize with project parameter
        // According to Earth Engine docs, we can pass null or a config object
        ee.initialize(
          null, // opt_baseurl
          null, // opt_tileurl  
          () => {
            initialized = true;
            console.log("✅ Earth Engine initialized successfully");
            resolve();
          },
          (error?: Error | any) => {
            // Handle different error types
            let errorMessage = "Unknown error";
            if (error) {
              if (error instanceof Error) {
                errorMessage = error.message;
              } else if (typeof error === "string") {
                errorMessage = error;
              } else if (error.message) {
                errorMessage = error.message;
              } else {
                errorMessage = JSON.stringify(error);
              }
            }
            
            console.error("❌ Earth Engine initialization error:", {
              error,
              errorType: typeof error,
              errorConstructor: error?.constructor?.name,
              errorString: String(error),
              errorKeys: error ? Object.keys(error) : [],
              fullError: JSON.stringify(error, null, 2),
            });
            
            // Provide more specific error message
            if (errorMessage.includes("403") || errorMessage.includes("permission") || errorMessage.includes("unauthorized")) {
              errorMessage = "Permission denied. Your service account might not have Earth Engine access. Please:\n" +
                "1. Go to https://console.cloud.google.com/apis/library/earthengine.googleapis.com?project=copernigeo\n" +
                "2. Enable the 'Earth Engine API' for your project\n" +
                "3. Ensure your service account has these roles:\n" +
                "   - Earth Engine Resource Admin\n" +
                "   - Earth Engine Resource Writer";
            } else if (!errorMessage || errorMessage === "Unknown error") {
              errorMessage = "Failed to initialize Earth Engine. Possible causes:\n" +
                "1. Earth Engine API not enabled: https://console.cloud.google.com/apis/library/earthengine.googleapis.com\n" +
                "2. Service account missing required roles\n" +
                "3. Invalid credentials format";
            }
            
            reject(new Error(`Earth Engine initialization failed: ${errorMessage}`));
          },
          null // opt_authArgs (we already authenticated)
        );
      } catch (err: any) {
        console.error("❌ Exception during ee.initialize call:", err);
        reject(new Error(`Earth Engine initialization failed: ${err?.message || "Exception during initialization"}`));
      }
    });
  } catch (error) {
    console.error("Error initializing Earth Engine:", error);
    throw error;
  }
}

/**
 * Get initialized Earth Engine instance
 */
export function getEarthEngine(): typeof ee {
  if (!initialized) {
    throw new Error("Earth Engine not initialized. Call initializeEarthEngine() first.");
  }
  return ee;
}

/**
 * Test Earth Engine connection
 */
export async function testEarthEngineConnection(): Promise<boolean> {
  try {
    await initializeEarthEngine();
    const ee = getEarthEngine();
    // Simple test: get a point
    const point = ee.Geometry.Point([0, 0]);
    const test = await new Promise<any>((resolve, reject) => {
      point.getInfo((value: any, error?: Error) => {
        if (error) reject(error);
        else resolve(value);
      });
    });
    return test !== null;
  } catch (error) {
    console.error("Earth Engine connection test failed:", error);
    return false;
  }
}


import * as ee from "@google/earthengine";
import * as fs from "fs";
import * as path from "path";

let initialized = false;

/**
 * Initialize Google Earth Engine with service account credentials
 */
export async function initializeEarthEngine(): Promise<void> {
  if (initialized) {
    return;
  }

  try {
    // Check if credentials are provided via environment variables
    const privateKey = process.env.EARTH_ENGINE_PRIVATE_KEY;
    const clientEmail = process.env.EARTH_ENGINE_CLIENT_EMAIL;

    if (privateKey && clientEmail) {
      // Use service account credentials from environment variables
      const credentials = {
        client_email: clientEmail,
        private_key: privateKey.replace(/\\n/g, "\n"),
      };

      await new Promise<void>((resolve, reject) => {
        ee.data.authenticateViaPrivateKey(
          credentials,
          () => {
            console.log("Earth Engine authenticated via private key");
            resolve();
          },
          (error?: Error) => {
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

    // Initialize Earth Engine
    await new Promise<void>((resolve, reject) => {
      try {
        ee.initialize(
          undefined,
          () => {
            initialized = true;
            console.log("Earth Engine initialized successfully");
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
            
            console.error("Earth Engine initialization error details:", {
              error,
              errorType: typeof error,
              errorConstructor: error?.constructor?.name,
              errorString: String(error),
              errorKeys: error ? Object.keys(error) : [],
            });
            
            // Check for common error scenarios
            if (!errorMessage || errorMessage === "Unknown error") {
              errorMessage = "Failed to initialize Earth Engine. Please verify:\n" +
                "1. Your service account is registered in Earth Engine (https://code.earthengine.google.com/settings/serviceaccounts)\n" +
                "2. Your credentials (EARTH_ENGINE_PRIVATE_KEY and EARTH_ENGINE_CLIENT_EMAIL) are correct\n" +
                "3. Your Earth Engine account has been approved";
            }
            
            reject(new Error(`Earth Engine initialization failed: ${errorMessage}`));
          }
        );
      } catch (err: any) {
        console.error("Exception during ee.initialize call:", err);
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


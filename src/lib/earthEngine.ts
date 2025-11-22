import * as ee from "@google/earthengine";

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

      await ee.data.authenticateViaPrivateKey(
        credentials,
        () => {
          console.log("Earth Engine authenticated via private key");
        },
        (error: Error) => {
          throw new Error(`Earth Engine authentication failed: ${error.message}`);
        }
      );
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      // Use service account file path
      await ee.data.authenticateViaPrivateKey(
        require(process.env.GOOGLE_APPLICATION_CREDENTIALS),
        () => {
          console.log("Earth Engine authenticated via credentials file");
        },
        (error: Error) => {
          throw new Error(`Earth Engine authentication failed: ${error.message}`);
        }
      );
    } else {
      throw new Error(
        "Earth Engine credentials not found. Please set EARTH_ENGINE_PRIVATE_KEY and EARTH_ENGINE_CLIENT_EMAIL, or GOOGLE_APPLICATION_CREDENTIALS"
      );
    }

    // Initialize Earth Engine
    await new Promise<void>((resolve, reject) => {
      ee.initialize(
        null,
        null,
        () => {
          initialized = true;
          resolve();
        },
        (error: Error) => {
          reject(new Error(`Earth Engine initialization failed: ${error.message}`));
        }
      );
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
    const test = point.getInfo();
    return test !== null;
  } catch (error) {
    console.error("Earth Engine connection test failed:", error);
    return false;
  }
}


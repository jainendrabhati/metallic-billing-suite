
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000/api';

export interface LicenseData {
  name: string;
  activation_key: string;
}

export interface LicenseResponse {
  id: number;
  name: string;
  activation_key: string;
  created_at: string;
}

export const licenseAPI = {
  saveLicense: async (licenseData: LicenseData) => {
    const response = await fetch(`${API_BASE_URL}/license`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(licenseData),
    });
    if (!response.ok) {
      throw new Error("Failed to save license");
    }
    return response.json();
  },

  getLicense: async (): Promise<LicenseResponse> => {
    const response = await fetch(`${API_BASE_URL}/license`);
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error("No license found");
      }
      throw new Error("Failed to fetch license");
    }
    return response.json();
  },

  validateLicense: async () => {
    const response = await fetch(`${API_BASE_URL}/license/validate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("License validation failed");
      }
      throw new Error("Failed to validate license");
    }
    return response.json();
  },

authenticateLicense: async (licenseData: LicenseData) => {
  try {
    // Case 1: Offline
    if (!navigator.onLine) {
      console.log("App is offline, allowing local authentication");
      await licenseAPI.saveLicense(licenseData);
      return { success: true, offline: true };
    }

    // Prepare request data
    const externalRequestData = {
      name: licenseData.name,
      key: licenseData.activation_key,
    };

    try {
      const response = await fetch(
        "https://deemskrvkghcjlnyzpnw.supabase.co/functions/v1/validate-key",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(externalRequestData),
          signal: AbortSignal.timeout(5000),
        }
      );

      const data = await response.json().catch(() => null);

      if (response.status === 200 && data?.success === true) {
        // ✅ Valid license - save and return success
        await licenseAPI.saveLicense(licenseData);
        return { success: true, message: data.message || "License validated successfully" };
      } else {
        // ❌ Invalid license - throw error for proper handling
        throw new Error(data?.error || "Invalid license key");
      }
    } catch (fetchError: any) {
      // Case 2: Network/timeout error → allow offline usage
      if (fetchError.name === "AbortError" || fetchError.message?.includes("fetch")) {
        console.warn("External license validation failed, allowing offline usage:", fetchError);
        await licenseAPI.saveLicense(licenseData);
        return { success: true, offline: true, message: "Offline mode - using locally saved license" };
      }
      // Re-throw non-network errors
      throw fetchError;
    }
  } catch (error: any) {
    // Case 3: Network errors should allow offline usage
    if (
      error.name === "AbortError" ||
      error.message?.includes("fetch") ||
      error.message?.includes("Failed to fetch") ||
      error.message?.includes("NetworkError")
    ) {
      console.log("Could not connect to license server, allowing offline usage");
      await licenseAPI.saveLicense(licenseData);
      return { success: true, offline: true, message: "Offline mode - using locally saved license" };
    }
    throw error;
  }
},
};

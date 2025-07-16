
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

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
      // Transform the data format for external server
      const externalRequestData = {
        name: licenseData.name,
        key: licenseData.activation_key
      };

      // First try to authenticate with external server
      const response = await fetch('https://deemskrvkghcjlnyzpnw.supabase.co/functions/v1/validate-key', {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(externalRequestData),
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });

      if (response.status === 200) {
        // If authentication successful, save license locally
        await licenseAPI.saveLicense(licenseData);
        return { success: true };
      } else {
        throw new Error("Authentication failed"); 
      }
    } catch (error: any) {
      if (error.name === 'AbortError' || error.message.includes('fetch')) {
        throw new Error("Could not connect to license server" );
      }
      throw error;
    }
  },
};
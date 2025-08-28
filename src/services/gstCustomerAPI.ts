const API_BASE_URL = "http://localhost:5000/api";

export interface GSTCustomer {
  id: number;
  customer_name: string;
  customer_address?: string;
  customer_gstin?: string;
  created_at: string;
  updated_at: string;
}

export const gstCustomerAPI = {
  search: async (query: string): Promise<GSTCustomer[]> => {
    const response = await fetch(`${API_BASE_URL}/gst-customers/search?q=${encodeURIComponent(query)}`);
    if (!response.ok) {
      throw new Error('Failed to search GST customers');
    }
    return response.json();
  },

  createOrUpdate: async (data: {
    customer_name: string;
    customer_address?: string;
    customer_gstin?: string;
  }): Promise<GSTCustomer> => {
    const response = await fetch(`${API_BASE_URL}/gst-customers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to create/update GST customer');
    }
    return response.json();
  },

  getAll: async (): Promise<GSTCustomer[]> => {
    const response = await fetch(`${API_BASE_URL}/gst-customers`);
    if (!response.ok) {
      throw new Error('Failed to fetch GST customers');
    }
    return response.json();
  },
};
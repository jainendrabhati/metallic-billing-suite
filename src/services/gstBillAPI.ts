const API_BASE_URL = "http://localhost:5000/api";

export interface GSTBillItem {
  id?: number;
  description: string;
  hsn: string;
  weight: number;
  rate: number;
  amount: number;
}

export interface GSTBill {
  id?: number;
  bill_number: string;
  date: string;
  customer_name: string;
  customer_address: string;
  customer_gstin: string;
  items: GSTBillItem[];
  total_amount_before_tax: number;
  cgst_percentage: number;
  sgst_percentage: number;
  igst_percentage: number;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  grand_total: number;
  amount_in_words: string;
  created_at?: string;
  updated_at?: string;
}

export const gstBillAPI = {
  getAll: async (): Promise<GSTBill[]> => {
    const response = await fetch(`${API_BASE_URL}/gst-bills`);
    if (!response.ok) {
      throw new Error('Failed to fetch GST bills');
    }
    return response.json();
  },

  getById: async (id: number): Promise<GSTBill> => {
    const response = await fetch(`${API_BASE_URL}/gst-bills/${id}`);
    if (!response.ok) {
      throw new Error('Failed to fetch GST bill');
    }
    return response.json();
  },

  create: async (bill: Omit<GSTBill, 'id' | 'created_at' | 'updated_at'>): Promise<GSTBill> => {
    const response = await fetch(`${API_BASE_URL}/gst-bills`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(bill),
    });
    if (!response.ok) {
      throw new Error('Failed to create GST bill');
    }
    return response.json();
  },

  update: async (id: number, bill: Partial<GSTBill>): Promise<GSTBill> => {
    const response = await fetch(`${API_BASE_URL}/gst-bills/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(bill),
    });
    if (!response.ok) {
      throw new Error('Failed to update GST bill');
    }
    return response.json();
  },

  delete: async (id: number): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/gst-bills/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error('Failed to delete GST bill');
    }
  },

  exportToExcel: async (filters?: { startDate?: string; endDate?: string; customerName?: string }): Promise<Blob> => {
    const queryParams = new URLSearchParams();
    if (filters?.startDate) queryParams.append('start_date', filters.startDate);
    if (filters?.endDate) queryParams.append('end_date', filters.endDate);
    if (filters?.customerName) queryParams.append('customer_name', filters.customerName);

    const response = await fetch(`${API_BASE_URL}/gst-bills/export?${queryParams.toString()}`);
    if (!response.ok) {
      throw new Error('Failed to export GST bills');
    }
    return response.blob();
  },

  exportToCSV: async (filters?: { startDate?: string; endDate?: string; customerName?: string }): Promise<Blob> => {
    const queryParams = new URLSearchParams();
    if (filters?.startDate) queryParams.append('start_date', filters.startDate);
    if (filters?.endDate) queryParams.append('end_date', filters.endDate);
    if (filters?.customerName) queryParams.append('customer_name', filters.customerName);

    const response = await fetch(`${API_BASE_URL}/gst-bills/export-csv?${queryParams.toString()}`);
    if (!response.ok) {
      throw new Error('Failed to export GST bills to CSV');
    }
    return response.blob();
  },
};
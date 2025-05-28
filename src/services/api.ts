
const API_BASE_URL = 'http://localhost:5000/api';

export interface Customer {
  id: number;
  name: string;
  mobile: string;
  address: string;
  total_bills: number;
  total_amount: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface Bill {
  id: number;
  customer_id: number;
  customer_name?: string;
  item: string;
  weight: number;
  tunch: number;
  wages: number;
  wastage: number;
  total_fine: number;
  total_amount: number;
  payment_type: 'credit' | 'debit';
  payment_status: 'paid' | 'unpaid' | 'partial';
  partial_amount: number;
  description: string;
  gst_number: string;
  date: string;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: number;
  bill_id?: number;
  bill_number?: string;
  customer_id: number;
  customer_name?: string;
  amount: number;
  transaction_type: 'credit' | 'debit';
  status: 'paid' | 'unpaid' | 'partial';
  description: string;
  created_at: string;
  updated_at: string;
}

export interface Expense {
  id: number;
  description: string;
  amount: number;
  category: string;
  status: 'paid' | 'pending';
  date: string;
  created_at: string;
  updated_at: string;
}

// Customer API
export const customerAPI = {
  getAll: async (): Promise<Customer[]> => {
    const response = await fetch(`${API_BASE_URL}/customers`);
    return response.json();
  },
  
  create: async (customer: Omit<Customer, 'id' | 'total_bills' | 'total_amount' | 'status' | 'created_at' | 'updated_at'>): Promise<Customer> => {
    const response = await fetch(`${API_BASE_URL}/customers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(customer),
    });
    return response.json();
  },
  
  search: async (query: string): Promise<Customer[]> => {
    const response = await fetch(`${API_BASE_URL}/customers/search?q=${encodeURIComponent(query)}`);
    return response.json();
  },
  
  getById: async (id: number): Promise<Customer> => {
    const response = await fetch(`${API_BASE_URL}/customers/${id}`);
    return response.json();
  },
};

// Bill API
export const billAPI = {
  getAll: async (): Promise<Bill[]> => {
    const response = await fetch(`${API_BASE_URL}/bills`);
    return response.json();
  },
  
  create: async (bill: Omit<Bill, 'id' | 'customer_name' | 'total_fine' | 'total_amount' | 'created_at' | 'updated_at'>): Promise<Bill> => {
    const response = await fetch(`${API_BASE_URL}/bills`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bill),
    });
    return response.json();
  },
  
  getById: async (id: number): Promise<Bill> => {
    const response = await fetch(`${API_BASE_URL}/bills/${id}`);
    return response.json();
  },
};

// Transaction API
export const transactionAPI = {
  getAll: async (filters?: { start_date?: string; end_date?: string; customer_name?: string }): Promise<Transaction[]> => {
    const params = new URLSearchParams();
    if (filters?.start_date) params.append('start_date', filters.start_date);
    if (filters?.end_date) params.append('end_date', filters.end_date);
    if (filters?.customer_name) params.append('customer_name', filters.customer_name);
    
    const response = await fetch(`${API_BASE_URL}/transactions?${params.toString()}`);
    return response.json();
  },
  
  exportCSV: async (filters?: { start_date?: string; end_date?: string; customer_name?: string }) => {
    const params = new URLSearchParams();
    if (filters?.start_date) params.append('start_date', filters.start_date);
    if (filters?.end_date) params.append('end_date', filters.end_date);
    if (filters?.customer_name) params.append('customer_name', filters.customer_name);
    
    const response = await fetch(`${API_BASE_URL}/transactions/export/csv?${params.toString()}`);
    return response.json();
  },
  
  exportPDF: async (filters?: { start_date?: string; end_date?: string; customer_name?: string }) => {
    const params = new URLSearchParams();
    if (filters?.start_date) params.append('start_date', filters.start_date);
    if (filters?.end_date) params.append('end_date', filters.end_date);
    if (filters?.customer_name) params.append('customer_name', filters.customer_name);
    
    const response = await fetch(`${API_BASE_URL}/transactions/export/pdf?${params.toString()}`);
    return response.json();
  },
};

// Expense API
export const expenseAPI = {
  getAll: async (): Promise<Expense[]> => {
    const response = await fetch(`${API_BASE_URL}/expenses`);
    return response.json();
  },
  
  create: async (expense: Omit<Expense, 'id' | 'created_at' | 'updated_at'>): Promise<Expense> => {
    const response = await fetch(`${API_BASE_URL}/expenses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(expense),
    });
    return response.json();
  },
  
  update: async (id: number, expense: Partial<Expense>): Promise<Expense> => {
    const response = await fetch(`${API_BASE_URL}/expenses/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(expense),
    });
    return response.json();
  },
};

// Settings API
export const settingsAPI = {
  downloadBackup: async () => {
    const response = await fetch(`${API_BASE_URL}/settings/backup`);
    return response.json();
  },
  
  uploadBackup: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch(`${API_BASE_URL}/settings/restore`, {
      method: 'POST',
      body: formData,
    });
    return response.json();
  },
  
  getFirmSettings: async () => {
    const response = await fetch(`${API_BASE_URL}/settings/firm`);
    return response.json();
  },
  
  updateFirmSettings: async (settings: any) => {
    const response = await fetch(`${API_BASE_URL}/settings/firm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    return response.json();
  },
};

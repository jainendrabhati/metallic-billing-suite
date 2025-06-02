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
  bill_number: string;
  customer_id: number;
  customer_name?: string;
  item: string;
  weight: number;
  tunch: number;
  wages: number;
  wastage: number;
  silver_amount: number;
  total_fine: number;
  total_amount: number;
  total_wages?: number;
  payment_type: 'credit' | 'debit';
  slip_no: string;
  description: string;
  date: string;
  created_at: string;
  updated_at: string;
}

export interface StockItem {
  id: number;
  item_name: string;
  current_weight: number;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface ExpenseDashboard {
  total_expenses: number;
  net_fine: number;
  total_bill_amount: number;
  total_silver_amount: number;
  total_wages_weight: number;
  balance_sheet: {
    silver_balance: number;
    rupee_balance: number;
  };
}

export interface Transaction {
  id: number;
  bill_id?: number;
  bill_number?: string;
  customer_id: number;
  customer_name?: string;
  amount: number;
  transaction_type: 'credit' | 'debit';
  description: string;
  created_at: string;
  updated_at: string;
  weight?: number;
  tunch?: number;
  wages?: number;
  wastage?: number;
  silver_amount?: number;
  total_wages?: number;
  item?: string;
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

export interface Employee {
  id: number;
  name: string;
  position: string;
  monthly_salary: number;
  present_days: number;
  total_days: number;
  calculated_salary: number;
  paid_amount: number;
  remaining_amount: number;
  created_at: string;
  updated_at: string;
}

export interface EmployeePayment {
  id: number;
  employee_id: number;
  employee_name?: string;
  amount: number;
  payment_date: string;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface Stock {
  id: number;
  amount: number;
  transaction_type: 'add' | 'deduct';
  item_name: string;
  description: string;
  created_at: string;
}

export interface FirmSettings {
  id: number;
  firm_name: string;
  gst_number: string;
  address: string;
  logo_path?: string;
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

  getPending: async (): Promise<any[]> => {
    const response = await fetch(`${API_BASE_URL}/customers/pending`);
    return response.json();
  },

  getBills: async (customerId: number): Promise<Bill[]> => {
    const response = await fetch(`${API_BASE_URL}/customers/${customerId}/bills`);
    return response.json();
  },
};

// Bill API
export const billAPI = {
  getAll: async (): Promise<Bill[]> => {
    const response = await fetch(`${API_BASE_URL}/bills`);
    return response.json();
  },
  
  create: async (bill: Omit<Bill, 'id' | 'bill_number' | 'customer_name' | 'total_fine' | 'total_amount' | 'created_at' | 'updated_at'>): Promise<Bill> => {
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

// Stock Item API
export const stockItemAPI = {
  getAll: async (): Promise<StockItem[]> => {
    const response = await fetch(`${API_BASE_URL}/stock-items`);
    return response.json();
  },
  
  create: async (item: Omit<StockItem, 'id' | 'created_at' | 'updated_at'>): Promise<StockItem> => {
    const response = await fetch(`${API_BASE_URL}/stock-items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });
    return response.json();
  },
  
  update: async (id: number, item: Partial<StockItem>): Promise<StockItem> => {
    const response = await fetch(`${API_BASE_URL}/stock-items/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });
    return response.json();
  },
  
  delete: async (id: number): Promise<{ message: string }> => {
    const response = await fetch(`${API_BASE_URL}/stock-items/${id}`, {
      method: 'DELETE',
    });
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
  
  getById: async (id: number): Promise<Transaction> => {
    const response = await fetch(`${API_BASE_URL}/transactions/${id}`);
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

// Enhanced Stock API
export const stockAPI = {
  getCurrent: async (): Promise<{ current_stock: number }> => {
    const response = await fetch(`${API_BASE_URL}/stock`);
    return response.json();
  },
  
  addTransaction: async (amount: number, type: "add" | "deduct", item_name: string, description: string): Promise<{ message: string; new_stock: number }> => {
    const response = await fetch(`${API_BASE_URL}/stock/transaction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, transaction_type: type, item_name, description }),
    });
    return response.json();
  },
  
  getHistory: async (): Promise<Stock[]> => {
    const response = await fetch(`${API_BASE_URL}/stock/history`);
    return response.json();
  },
};

// Enhanced Expense API
export const expenseAPI = {
  getAll: async (): Promise<Expense[]> => {
    const response = await fetch(`${API_BASE_URL}/expenses`);
    return response.json();
  },
  
  getDashboard: async (): Promise<ExpenseDashboard> => {
    const response = await fetch(`${API_BASE_URL}/expenses/dashboard`);
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
  
  getFirmSettings: async (): Promise<FirmSettings> => {
    const response = await fetch(`${API_BASE_URL}/settings/firm`);
    return response.json();
  },
  
  updateFirmSettings: async (settings: Partial<FirmSettings>): Promise<FirmSettings> => {
    const response = await fetch(`${API_BASE_URL}/settings/firm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    return response.json();
  },
};

// Employee API
export const employeeAPI = {
  getAll: async (): Promise<Employee[]> => {
    const response = await fetch(`${API_BASE_URL}/employees`);
    return response.json();
  },
  
  create: async (employee: Omit<Employee, 'id' | 'calculated_salary' | 'remaining_amount' | 'created_at' | 'updated_at'>): Promise<Employee> => {
    const response = await fetch(`${API_BASE_URL}/employees`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(employee),
    });
    return response.json();
  },
  
  update: async (id: number, employee: Partial<Employee>): Promise<Employee> => {
    const response = await fetch(`${API_BASE_URL}/employees/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(employee),
    });
    return response.json();
  },
  
  getById: async (id: number): Promise<Employee> => {
    const response = await fetch(`${API_BASE_URL}/employees/${id}`);
    return response.json();
  },
};

// Employee Payment API
export const employeePaymentAPI = {
  getAll: async (): Promise<EmployeePayment[]> => {
    const response = await fetch(`${API_BASE_URL}/employee-payments`);
    return response.json();
  },
  
  getByEmployeeId: async (employeeId: number): Promise<EmployeePayment[]> => {
    const response = await fetch(`${API_BASE_URL}/employee-payments/employee/${employeeId}`);
    return response.json();
  },
  
  create: async (payment: Omit<EmployeePayment, 'id' | 'employee_name' | 'created_at' | 'updated_at'>): Promise<EmployeePayment> => {
    const response = await fetch(`${API_BASE_URL}/employee-payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payment),
    });
    return response.json();
  },
};

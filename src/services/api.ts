
import { format } from 'date-fns';

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
  item_name: string;
  item: string;
  weight: number;
  tunch: number;
  wages: number;
  wastage: number;
  silver_amount: number;
  total_fine: number;
  total_amount: number;
  total_wages: number;
  payment_type: string;
  slip_no: string;
  description: string;
  date: string;
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

export interface Employee {
  id: number;
  name: string;
  position: string;
  monthly_salary: number;
  present_days: number;
  total_days: number;
  paid_amount: number;
  created_at: string;
  updated_at: string;
}

export interface EmployeePayment {
  id: number;
  employee_id: number;
  amount: number;
  payment_date: string;
  description: string;
  created_at: string;
  updated_at: string;
}

export const customerAPI = {
  getAll: async (): Promise<Customer[]> => {
    const response = await fetch(`${API_BASE_URL}/customers`);
    if (!response.ok) {
      throw new Error('Failed to fetch customers');
    }
    return response.json();
  },

  getById: async (id: number): Promise<Customer> => {
    const response = await fetch(`${API_BASE_URL}/customers/${id}`);
    if (!response.ok) {
      throw new Error('Failed to fetch customer');
    }
    return response.json();
  },

  create: async (data: Omit<Customer, 'id' | 'total_bills' | 'total_amount' | 'status' | 'created_at' | 'updated_at'>): Promise<Customer> => {
    const response = await fetch(`${API_BASE_URL}/customers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to create customer');
    }
    return response.json();
  },

  search: async (name: string): Promise<Customer[]> => {
    const response = await fetch(`${API_BASE_URL}/customers/search?name=${name}`);
    if (!response.ok) {
      throw new Error('Failed to search customers');
    }
    return response.json();
  },

  getPendingList: async (): Promise<any[]> => {
    const response = await fetch(`${API_BASE_URL}/customers/pending`);
    if (!response.ok) {
      throw new Error('Failed to fetch pending customers');
    }
    return response.json();
  },
};

export const billAPI = {
  getAll: async (): Promise<Bill[]> => {
    const response = await fetch(`${API_BASE_URL}/bills`);
    if (!response.ok) {
      throw new Error('Failed to fetch bills');
    }
    return response.json();
  },

  getById: async (id: number): Promise<Bill> => {
    const response = await fetch(`${API_BASE_URL}/bills/${id}`);
    if (!response.ok) {
      throw new Error('Failed to fetch bill');
    }
    return response.json();
  },

  create: async (data: Omit<Bill, 'id' | 'bill_number' | 'total_fine' | 'total_amount' | 'total_wages' | 'created_at' | 'updated_at' | 'customer_name'>): Promise<Bill> => {
    // Calculate total_fine and total_amount here before sending to the backend
    const totalFine = data.weight * ((data.tunch - data.wastage) / 100);
    const totalAmount = (data.weight * (data.wages / 1000)) + (data.payment_type === 'credit' ? data.silver_amount : 0);

    const billData = {
      ...data,
      total_fine: totalFine,
      total_amount: totalAmount,
    };

    const response = await fetch(`${API_BASE_URL}/bills`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(billData),
    });

    if (!response.ok) {
      throw new Error('Failed to create bill');
    }
    return response.json();
  },

  getByCustomer: async (customerId: number): Promise<Bill[]> => {
    const response = await fetch(`${API_BASE_URL}/bills/customer/${customerId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch bills for customer');
    }
    return response.json();
  },
};

export const stockItemAPI = {
  getAll: async (): Promise<any[]> => {
    const response = await fetch(`${API_BASE_URL}/stock_items`);
    if (!response.ok) {
      throw new Error('Failed to fetch stock items');
    }
    return response.json();
  },

  create: async (data: { item_name: string; current_weight: number; description: string }): Promise<any> => {
    const response = await fetch(`${API_BASE_URL}/stock_items`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to create stock item');
    }
    return response.json();
  },

  update: async (id: number, data: { item_name?: string; current_weight?: number; description?: string }): Promise<any> => {
    const response = await fetch(`${API_BASE_URL}/stock_items/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to update stock item');
    }
    return response.json();
  },

  delete: async (id: number): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/stock_items/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error('Failed to delete stock item');
    }
  },
};

export const stockAPI = {
  getAll: async (): Promise<any[]> => {
    const response = await fetch(`${API_BASE_URL}/stock_items`);
    if (!response.ok) {
      throw new Error('Failed to fetch stock items');
    }
    return response.json();
  },

  create: async (data: { item_name: string; current_stock: number; description: string }): Promise<any> => {
    const response = await fetch(`${API_BASE_URL}/stock_items`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to create stock item');
    }
    return response.json();
  },

  update: async (id: number, data: { item_name?: string; current_stock?: number; description?: string }): Promise<any> => {
    const response = await fetch(`${API_BASE_URL}/stock_items/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to update stock item');
    }
    return response.json();
  },

  delete: async (id: number): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/stock_items/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error('Failed to delete stock item');
    }
  },
};

export const expenseAPI = {
  getAll: async (): Promise<Expense[]> => {
    const response = await fetch(`${API_BASE_URL}/expenses`);
    if (!response.ok) {
      throw new Error('Failed to fetch expenses');
    }
    return response.json();
  },

  create: async (data: Omit<Expense, 'id' | 'created_at' | 'updated_at'>): Promise<Expense> => {
    const response = await fetch(`${API_BASE_URL}/expenses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to create expense');
    }
    return response.json();
  },

  update: async (id: number, data: Partial<Expense>): Promise<Expense> => {
    const response = await fetch(`${API_BASE_URL}/expenses/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to update expense');
    }
    return response.json();
  },

  getDashboard: async (): Promise<any> => {
    const response = await fetch(`${API_BASE_URL}/expenses/dashboard`);
    if (!response.ok) {
      throw new Error('Failed to fetch expense dashboard');
    }
    return response.json();
  },
};

export const employeeAPI = {
  getAll: async (): Promise<Employee[]> => {
    const response = await fetch(`${API_BASE_URL}/employees`);
    if (!response.ok) {
      throw new Error('Failed to fetch employees');
    }
    return response.json();
  },

  create: async (data: Omit<Employee, 'id' | 'created_at' | 'updated_at'>): Promise<Employee> => {
    const response = await fetch(`${API_BASE_URL}/employees`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to create employee');
    }
    return response.json();
  },

  update: async (id: number, data: Partial<Employee>): Promise<Employee> => {
    const response = await fetch(`${API_BASE_URL}/employees/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to update employee');
    }
    return response.json();
  },
};

export const employeePaymentAPI = {
  getAll: async (): Promise<EmployeePayment[]> => {
    const response = await fetch(`${API_BASE_URL}/employee_payments`);
    if (!response.ok) {
      throw new Error('Failed to fetch employee payments');
    }
    return response.json();
  },

  create: async (data: Omit<EmployeePayment, 'id' | 'created_at' | 'updated_at'>): Promise<EmployeePayment> => {
    const response = await fetch(`${API_BASE_URL}/employee_payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to create employee payment');
    }
    return response.json();
  },
};

export const settingsAPI = {
  getFirmSettings: async (): Promise<any> => {
    const response = await fetch(`${API_BASE_URL}/settings/firm`);
    if (!response.ok) {
      throw new Error('Failed to fetch firm settings');
    }
    return response.json();
  },

  updateFirmSettings: async (data: any): Promise<any> => {
    const response = await fetch(`${API_BASE_URL}/settings/firm`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to update firm settings');
    }
    return response.json();
  },

  downloadBackup: async (): Promise<Blob> => {
    const response = await fetch(`${API_BASE_URL}/settings/backup`);
    if (!response.ok) {
      throw new Error('Failed to download backup');
    }
    return response.blob();
  },

  uploadBackup: async (file: File): Promise<any> => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch(`${API_BASE_URL}/settings/restore`, {
      method: 'POST',
      body: formData,
    });
    if (!response.ok) {
      throw new Error('Failed to upload backup');
    }
    return response.json();
  },
};

export const transactionAPI = {
  getAll: async (params?: { start_date?: string; end_date?: string; customer_name?: string }) => {
    const queryParams = new URLSearchParams();
    if (params?.start_date) queryParams.append('start_date', params.start_date);
    if (params?.end_date) queryParams.append('end_date', params.end_date);
    if (params?.customer_name) queryParams.append('customer_name', params.customer_name);
    
    const response = await fetch(`${API_BASE_URL}/transactions?${queryParams}`);
    if (!response.ok) throw new Error('Failed to fetch transactions');
    return response.json();
  },

  update: async (id: number, data: any) => {
    const response = await fetch(`${API_BASE_URL}/transactions/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update transaction');
    return response.json();
  },

  exportCSV: async (params?: { start_date?: string; end_date?: string; customer_name?: string }) => {
    const queryParams = new URLSearchParams();
    if (params?.start_date) queryParams.append('start_date', params.start_date);
    if (params?.end_date) queryParams.append('end_date', params.end_date);
    if (params?.customer_name) queryParams.append('customer_name', params.customer_name);
    
    const response = await fetch(`${API_BASE_URL}/transactions/export/csv?${queryParams}`);
    if (!response.ok) throw new Error('Failed to export CSV');
    return response.blob();
  },

  exportPDF: async (params?: { start_date?: string; end_date?: string; customer_name?: string }) => {
    const queryParams = new URLSearchParams();
    if (params?.start_date) queryParams.append('start_date', params.start_date);
    if (params?.end_date) queryParams.append('end_date', params.end_date);
    if (params?.customer_name) queryParams.append('customer_name', params.customer_name);
    
    const response = await fetch(`${API_BASE_URL}/transactions/export/pdf?${queryParams}`);
    if (!response.ok) throw new Error('Failed to export PDF');
    return response.blob();
  },
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

// Type definitions
export interface Customer {
  id: number;
  name: string;
  mobile: string;
  address: string;
  created_at: string;
  updated_at: string;
}

export interface Bill {
  id: number;
  bill_number: string;
  customer_name: string;
  item: string;
  weight: number;
  tunch: number;
  wastage: number;
  wages: number;
  total_fine: number;
  total_amount: number;
  silver_amount: number;
  payment_type: 'credit' | 'debit';
  date: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface Employee {
  id: number;
  name: string;
  mobile: string;
  address: string;
  position: string;
  monthly_salary: number;
  total_calculated_salary?: number;
  total_paid_amount?: number;
  remaining_amount?: number;
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
}

export interface EmployeeSalary {
  id: number;
  employee_id: number;
  month: string;
  year: number;
  monthly_salary: number;
  present_days: number;
  total_days: number;
  calculated_salary: number;
  created_at: string;
}

export interface Expense {
  id: number;
  description: string;
  amount: number;
  date: string;
  category: string;
  status?: string;
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

export interface StockTransaction {
  id: number;
  item_name: string;
  transaction_type: 'add' | 'deduct';
  amount: number;
  description: string;
  created_at: string;
}

export const customerAPI = {
  getAll: async () => {
    const response = await fetch(`${API_BASE_URL}/customers`);
    if (!response.ok) {
      throw new Error("Failed to fetch customers");
    }
    return response.json();
  },

  getById: async (id: number) => {
    const response = await fetch(`${API_BASE_URL}/customers/${id}`);
    if (!response.ok) {
      throw new Error("Failed to fetch customer");
    }
    return response.json();
  },

  search: async (query: string) => {
    const response = await fetch(`${API_BASE_URL}/customers/search?q=${encodeURIComponent(query)}`);
    if (!response.ok) {
      throw new Error("Failed to search customers");
    }
    return response.json();
  },

  getPendingCustomers: async () => {
    const response = await fetch(`${API_BASE_URL}/customers/pending`);
    if (!response.ok) {
      throw new Error("Failed to fetch pending customers");
    }
    return response.json();
  },

  getPendingList: async () => {
    const response = await fetch(`${API_BASE_URL}/customers/pending-list`);
    if (!response.ok) {
      throw new Error("Failed to fetch pending list");
    }
    return response.json();
  },

  getCustomerBills: async (customerId: number) => {
    const response = await fetch(`${API_BASE_URL}/customers/${customerId}/bills`);
    if (!response.ok) {
      throw new Error("Failed to fetch customer bills");
    }
    return response.json();
  },

  create: async (customerData: any) => {
    const response = await fetch(`${API_BASE_URL}/customers`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(customerData),
    });
    if (!response.ok) {
      throw new Error("Failed to create customer");
    }
    return response.json();
  },

  update: async (id: number, customerData: any) => {
    const response = await fetch(`${API_BASE_URL}/customers/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(customerData),
    });
    if (!response.ok) {
      throw new Error("Failed to update customer");
    }
    return response.json();
  },

  delete: async (id: number) => {
    const response = await fetch(`${API_BASE_URL}/customers/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      throw new Error("Failed to delete customer");
    }
    return response.json();
  },
};

export const billAPI = {
  getAll: async () => {
    const response = await fetch(`${API_BASE_URL}/bills`);
    if (!response.ok) {
      throw new Error("Failed to fetch bills");
    }
    return response.json();
  },

  create: async (billData: any) => {
    const response = await fetch(`${API_BASE_URL}/bills`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(billData),
    });
    if (!response.ok) {
      throw new Error("Failed to create bill");
    }
    return response.json();
  },

  update: async (id: number, billData: any) => {
    const response = await fetch(`${API_BASE_URL}/bills/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(billData),
    });
    if (!response.ok) {
      throw new Error("Failed to update bill");
    }
    return response.json();
  },

  delete: async (id: number) => {
    const response = await fetch(`${API_BASE_URL}/bills/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      throw new Error("Failed to delete bill");
    }
    return response.json();
  },
};

export const transactionAPI = {
  getAll: async () => {
    const response = await fetch(`${API_BASE_URL}/transactions`);
    if (!response.ok) {
      throw new Error("Failed to fetch transactions");
    }
    return response.json();
  },

  getFiltered: async (filters: { start_date?: string; end_date?: string; customer_name?: string }) => {
    // Always append all filters, even if blank
    const params = new URLSearchParams();
    params.append("start_date", filters.start_date || "");
    params.append("end_date", filters.end_date || "");
    params.append("customer_name", filters.customer_name || "");
    const response = await fetch(`${API_BASE_URL}/transactions/filtered?${params.toString()}`);
    if (!response.ok) {
      throw new Error("Failed to fetch filtered transactions");
    }
    return response.json();
  },

  create: async (transactionData: any) => {
    const response = await fetch(`${API_BASE_URL}/transactions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(transactionData),
    });
    if (!response.ok) {
      throw new Error("Failed to create transaction");
    }
    return response.json();
  },

  update: async (id: number, transactionData: any) => {
    const response = await fetch(`${API_BASE_URL}/transactions/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(transactionData),
    });
    if (!response.ok) {
      throw new Error("Failed to update transaction");
    }
    return response.json();
  },

  delete: async (id: number) => {
    const response = await fetch(`${API_BASE_URL}/transactions/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      throw new Error("Failed to delete transaction");
    }
    return response.json();
  },

  exportCSV: async (filters: { start_date?: string; end_date?: string; customer_name?: string }) => {
    // Always append all filters, even if blank
    const params = new URLSearchParams();
    params.append("start_date", filters.start_date || "");
    params.append("end_date", filters.end_date || "");
    params.append("customer_name", filters.customer_name || "");
    const response = await fetch(`${API_BASE_URL}/transactions/export/csv?${params.toString()}`);
    if (!response.ok) {
      throw new Error("Failed to export CSV");
    }
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;

    const contentDisposition = response.headers.get("Content-Disposition");
    let filename = "transactions.csv";
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="(.+)"/);
      if (filenameMatch && filenameMatch.length > 1) {
        filename = filenameMatch[1];
      }
    }
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
    return { success: true };
  },

  exportPDF: async (filters: { start_date?: string; end_date?: string; customer_name?: string }) => {
    // Always append all filters, even if blank
    const params = new URLSearchParams();
    params.append("start_date", filters.start_date || "");
    params.append("end_date", filters.end_date || "");
    params.append("customer_name", filters.customer_name || "");
    const response = await fetch(`${API_BASE_URL}/transactions/export/pdf?${params.toString()}`);
    if (!response.ok) {
      throw new Error("Failed to export PDF");
    }
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const contentDisposition = response.headers.get("Content-Disposition");
    let filename = "transactions.pdf";
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="(.+)"/);
      if (filenameMatch && filenameMatch.length > 1) {
        filename = filenameMatch[1];
      }
    }
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
    return { success: true };
  },
};

export const employeeAPI = {
  getAll: async () => {
    const response = await fetch(`${API_BASE_URL}/employees`);
    if (!response.ok) {
      throw new Error("Failed to fetch employees");
    }
    return response.json();
  },

  create: async (employeeData: any) => {
    const response = await fetch(`${API_BASE_URL}/employees`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(employeeData),
    });
    if (!response.ok) {
      throw new Error("Failed to create employee");
    }
    return response.json();
  },

  update: async (id: number, employeeData: any) => {
    const response = await fetch(`${API_BASE_URL}/employees/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(employeeData),
    });
    if (!response.ok) {
      throw new Error("Failed to update employee");
    }
    return response.json();
  },

  delete: async (id: number) => {
    const response = await fetch(`${API_BASE_URL}/employees/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      throw new Error("Failed to delete employee");
    }
    return response.json();
  },
};

export const employeePaymentAPI = {
  getAll: async () => {
    const response = await fetch(`${API_BASE_URL}/employee-payments`);
    if (!response.ok) {
      throw new Error("Failed to fetch employee payments");
    }
    return response.json();
  },

  getByEmployeeId: async (employeeId: number) => {
    const response = await fetch(`${API_BASE_URL}/employee-payments/employee/${employeeId}`);
    if (!response.ok) {
      throw new Error("Failed to fetch employee payments");
    }
    return response.json();
  },

  create: async (paymentData: any) => {
    const response = await fetch(`${API_BASE_URL}/employee-payments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(paymentData),
    });
    if (!response.ok) {
      throw new Error("Failed to create employee payment");
    }
    return response.json();
  },
};

export const employeeSalaryAPI = {
  getAll: async () => {
    const response = await fetch(`${API_BASE_URL}/employee-salaries`);
    if (!response.ok) {
      throw new Error("Failed to fetch employee salaries");
    }
    return response.json();
  },

  getByEmployeeId: async (employeeId: number) => {
    const response = await fetch(`${API_BASE_URL}/employee-salaries/employee/${employeeId}`);
    if (!response.ok) {
      throw new Error("Failed to fetch employee salaries");
    }
    return response.json();
  },

  create: async (salaryData: any) => {
    const response = await fetch(`${API_BASE_URL}/employee-salaries`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(salaryData),
    });
    if (!response.ok) {
      throw new Error("Failed to create employee salary");
    }
    return response.json();
  },
};

export const stockAPI = {
  getAll: async () => {
    const response = await fetch(`${API_BASE_URL}/stock`);
    if (!response.ok) {
      throw new Error("Failed to fetch stock");
    }
    return response.json();
  },

  getCurrent: async () => {
    const response = await fetch(`${API_BASE_URL}/stock/current`);
    if (!response.ok) {
      throw new Error("Failed to fetch current stock");
    }
    return response.json();
  },

  getHistory: async () => {
    const response = await fetch(`${API_BASE_URL}/stock/history`);
    if (!response.ok) {
      throw new Error("Failed to fetch stock history");
    }
    return response.json();
  },

  addTransaction: async (amount: number, type: 'add' | 'deduct', itemName: string, description: string) => {
    const response = await fetch(`${API_BASE_URL}/stock/transaction`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount,
        transaction_type: type,
        item_name: itemName,
        description,
      }),
    });
    if (!response.ok) {
      throw new Error("Failed to add stock transaction");
    }
    return response.json();
  },

  create: async (stockData: any) => {
    const response = await fetch(`${API_BASE_URL}/stock`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(stockData),
    });
    if (!response.ok) {
      throw new Error("Failed to create stock");
    }
    return response.json();
  },

  update: async (id: number, stockData: any) => {
    const response = await fetch(`${API_BASE_URL}/stock/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(stockData),
    });
    if (!response.ok) {
      throw new Error("Failed to update stock");
    }
    return response.json();
  },

  delete: async (id: number) => {
    const response = await fetch(`${API_BASE_URL}/stock/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      throw new Error("Failed to delete stock");
    }
    return response.json();
  },
};

export const stockItemAPI = {
  getAll: async () => {
    const response = await fetch(`${API_BASE_URL}/stock-items`);
    if (!response.ok) {
      throw new Error("Failed to fetch stock items");
    }
    return response.json();
  },

  create: async (itemData: any) => {
    const response = await fetch(`${API_BASE_URL}/stock-items`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(itemData),
    });
    if (!response.ok) {
      throw new Error("Failed to create stock item");
    }
    return response.json();
  },

  update: async (id: number, itemData: any) => {
    const response = await fetch(`${API_BASE_URL}/stock-items/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(itemData),
    });
    if (!response.ok) {
      throw new Error("Failed to update stock item");
    }
    return response.json();
  },

  delete: async (id: number) => {
    const response = await fetch(`${API_BASE_URL}/stock-items/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      throw new Error("Failed to delete stock item");
    }
    return response.json();
  },
};

export const expenseAPI = {
  getAll: async () => {
    const response = await fetch(`${API_BASE_URL}/expenses`);
    if (!response.ok) {
      throw new Error("Failed to fetch expenses");
    }
    return response.json();
  },

  getDashboard: async () => {
    const response = await fetch(`${API_BASE_URL}/expenses/dashboard`);
    if (!response.ok) {
      throw new Error("Failed to fetch expenses dashboard");
    }
    return response.json();
  },

  create: async (expenseData: any) => {
    const response = await fetch(`${API_BASE_URL}/expenses`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(expenseData),
    });
    if (!response.ok) {
      throw new Error("Failed to create expense");
    }
    return response.json();
  },

  update: async (id: number, expenseData: any) => {
    const response = await fetch(`${API_BASE_URL}/expenses/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(expenseData),
    });
    if (!response.ok) {
      throw new Error("Failed to update expense");
    }
    return response.json();
  },

  delete: async (id: number) => {
    const response = await fetch(`${API_BASE_URL}/expenses/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      throw new Error("Failed to delete expense");
    }
    return response.json();
  },
};

export const settingsAPI = {
  getFirmSettings: async () => {
    const response = await fetch(`${API_BASE_URL}/settings`);
    if (!response.ok) {
      throw new Error("Failed to fetch firm settings");
    }
    return response.json();
  },

  updateFirmSettings: async (settingsData: any) => {
    const response = await fetch(`${API_BASE_URL}/settings`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(settingsData),
    });
    if (!response.ok) {
      throw new Error("Failed to update firm settings");
    }
    return response.json();
  },

  getGoogleDriveSettings: async () => {
    const response = await fetch(`${API_BASE_URL}/google-drive/settings`);
    if (!response.ok) {
      throw new Error("Failed to fetch Google Drive settings");
    }
    return response.json();
  },

  updateGoogleDriveSettings: async (settingsData: any) => {
    const response = await fetch(`${API_BASE_URL}/google-drive/settings`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(settingsData),
    });
    if (!response.ok) {
      throw new Error("Failed to update Google Drive settings");
    }
    return response.json();
  },

  authenticateGoogleDrive: async (settingsData: any) => {
    const response = await fetch(`${API_BASE_URL}/google-drive/authenticate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(settingsData),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to authenticate Google Drive");
    }
    return response.json();
  },

  downloadBackup: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/backup/download`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to download backup');
      }

      // Get the filename from the Content-Disposition header or create a default
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = 'metalic_backup.zip';
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      // Convert response to blob
      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
      
      return { success: true, filename };
    } catch (error) {
      console.error('Download backup error:', error);
      throw error;
    }
  },

  uploadBackup: async (file: File) => {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_BASE_URL}/backup/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload backup');
      }

      return response.json();
    } catch (error: any) {
      console.error('Upload backup error:', error);
      throw error;
    }
  },
};

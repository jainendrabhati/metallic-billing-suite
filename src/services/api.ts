import { API_BASE_URL } from "@/config";

export const customerAPI = {
  getAll: async () => {
    const response = await fetch(`${API_BASE_URL}/customers`);
    if (!response.ok) {
      throw new Error("Failed to fetch customers");
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

export const stockAPI = {
  getAll: async () => {
    const response = await fetch(`${API_BASE_URL}/stock`);
    if (!response.ok) {
      throw new Error("Failed to fetch stock");
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

export const expenseAPI = {
  getAll: async () => {
    const response = await fetch(`${API_BASE_URL}/expenses`);
    if (!response.ok) {
      throw new Error("Failed to fetch expenses");
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

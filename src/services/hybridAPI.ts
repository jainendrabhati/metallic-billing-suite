import { localhostBypass } from './localhostBypass';
import { offlineService } from './offlineService';

class HybridAPIService {
  private async tryLocalServer(operation: () => Promise<any>): Promise<any> {
    try {
      return await operation();
    } catch (error) {
      console.warn('Local server request failed:', error);
      throw error;
    }
  }

  // Customer operations
  async getCustomers() {
    try {
      return await this.tryLocalServer(() => localhostBypass.makeRequest('/customers'));
    } catch {
      return await offlineService.getCustomers();
    }
  }

  async createCustomer(customerData: any) {
    try {
      return await this.tryLocalServer(() => 
        localhostBypass.makeRequest('/customers', {
          method: 'POST',
          body: JSON.stringify(customerData),
        })
      );
    } catch {
      return await offlineService.createCustomer(customerData);
    }
  }

  async updateCustomer(id: number, customerData: any) {
    try {
      return await this.tryLocalServer(() =>
        localhostBypass.makeRequest(`/customers/${id}`, {
          method: 'PUT',
          body: JSON.stringify(customerData),
        })
      );
    } catch {
      return await offlineService.updateCustomer(id.toString(), customerData);
    }
  }

  async deleteCustomer(id: number) {
    try {
      return await this.tryLocalServer(() =>
        localhostBypass.makeRequest(`/customers/${id}`, {
          method: 'DELETE',
        })
      );
    } catch {
      return await offlineService.deleteCustomer(id.toString());
    }
  }

  // Bill operations
  async getBills() {
    try {
      return await this.tryLocalServer(() => localhostBypass.makeRequest('/bills'));
    } catch {
      return await offlineService.getBills();
    }
  }

  async createBill(billData: any) {
    try {
      return await this.tryLocalServer(() =>
        localhostBypass.makeRequest('/bills', {
          method: 'POST',
          body: JSON.stringify(billData),
        })
      );
    } catch {
      return await offlineService.createBill(billData);
    }
  }

  async updateBill(id: number, billData: any) {
    try {
      return await this.tryLocalServer(() =>
        localhostBypass.makeRequest(`/bills/${id}`, {
          method: 'PUT',
          body: JSON.stringify(billData),
        })
      );
    } catch {
      return await offlineService.updateBill(id.toString(), billData);
    }
  }

  // Transaction operations
  async getTransactions() {
    try {
      return await this.tryLocalServer(() => localhostBypass.makeRequest('/transactions'));
    } catch {
      return await offlineService.getTransactions();
    }
  }

  async createTransaction(transactionData: any) {
    try {
      return await this.tryLocalServer(() =>
        localhostBypass.makeRequest('/transactions', {
          method: 'POST',
          body: JSON.stringify(transactionData),
        })
      );
    } catch {
      throw new Error('Transaction creation unavailable offline');
    }
  }

  // Dashboard data
  async getDashboardData() {
    try {
      return await this.tryLocalServer(() => localhostBypass.makeRequest('/dashboard'));
    } catch {
      return {
        recent_transactions: [],
        pending_customers: [],
        current_stock: [],
        recent_bills: [],
        totals: { customers: 0, bills: 0, transactions: 0, expenses: 0 },
        today_statistics: {
          total_bills: 0,
          debit_bills: 0,
          credit_bills: 0,
          total_debit_amount: 0,
          total_credit_amount: 0,
          stock_wise_fine: {}
        },
        offline_mode: true
      };
    }
  }

  // Settings operations
  async getSettings() {
    try {
      return await this.tryLocalServer(() => localhostBypass.makeRequest('/settings'));
    } catch {
      return await offlineService.getSettings();
    }
  }

  // Additional operations needed by the app
  async getPendingCustomers() {
    try {
      return await this.tryLocalServer(() => localhostBypass.makeRequest('/customers/pending-list'));
    } catch {
      return [];
    }
  }

  async getEmployees() {
    try {
      return await this.tryLocalServer(() => localhostBypass.makeRequest('/employees'));
    } catch {
      return [];
    }
  }

  async getExpenses() {
    try {
      return await this.tryLocalServer(() => localhostBypass.makeRequest('/expenses'));
    } catch {
      return [];
    }
  }

  async getCustomerById(id: number) {
    try {
      return await this.tryLocalServer(() => localhostBypass.makeRequest(`/customers/${id}`));
    } catch {
      const customers = await offlineService.getCustomers();
      return customers.find((c: any) => c.id === id);
    }
  }

  async updateSettings(settingsData: any) {
    try {
      return await this.tryLocalServer(() =>
        localhostBypass.makeRequest('/settings', {
          method: 'PUT',
          body: JSON.stringify(settingsData),
        })
      );
    } catch (error) {
      console.warn('Local server unavailable for settings update:', error);
      throw error;
    }
  }

  // Server status
  isLocalServerAvailable(): boolean {
    return true; // Always assume available since we bypass network detection
  }

  async checkServerStatus(): Promise<boolean> {
    try {
      return await localhostBypass.checkHealth();
    } catch {
      return false;
    }
  }
}

export const hybridAPI = new HybridAPIService();
// Offline Service for Electron App with full CRUD support
import { API_BASE_URL } from '../config';

interface CachedData {
  customers: any[];
  bills: any[];
  transactions: any[];
  expenses: any[];
  employees: any[];
  settings: any;
  lastUpdated: number;
}

interface OfflineOperation {
  id: string;
  type: 'CREATE' | 'UPDATE' | 'DELETE';
  entity: 'customers' | 'bills' | 'transactions' | 'expenses' | 'employees' | 'settings';
  data: any;
  timestamp: number;
  endpoint: string;
  method: string;
}

class OfflineService {
  private cache: CachedData = {
    customers: [],
    bills: [],
    transactions: [],
    expenses: [],
    employees: [],
    settings: null,
    lastUpdated: 0
  };

  private operationQueue: OfflineOperation[] = [];
  private isElectron = typeof window !== 'undefined' && (window as any).electronAPI;
  private isOnline = navigator.onLine;
  private readonly CACHE_KEY = 'app_offline_cache';
  private readonly QUEUE_KEY = 'app_offline_queue';
  private readonly BACKUP_KEY = 'app_emergency_backup';
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private autoSaveInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.initializeOfflineSupport();
    this.loadFromLocalStorage();
    this.loadQueueFromStorage();
    this.setupEmergencyBackup();
    this.startAutoSave();
  }

  private initializeOfflineSupport() {
    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.syncWhenOnline();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });

    // Handle app closing - save everything before exit
    window.addEventListener('beforeunload', this.emergencySave.bind(this));

    // For Electron specifically
    if (this.isElectron) {
      // Listen for app closing events
      if ((window as any).electronAPI?.onAppClosing) {
        (window as any).electronAPI.onAppClosing(() => {
          this.emergencySave();
        });
      }
    }

    // If running in Electron, set up periodic sync
    if (this.isElectron) {
      setInterval(() => {
        if (this.isOnline) {
          this.processOfflineQueue();
          this.syncData();
        }
      }, 30000);
    }
  }

  private loadFromLocalStorage() {
    try {
      const cachedData = localStorage.getItem(this.CACHE_KEY);
      if (cachedData) {
        this.cache = JSON.parse(cachedData);
      }
    } catch (error) {
      console.error('Failed to load cached data:', error);
    }
  }

  private loadQueueFromStorage() {
    try {
      const queueData = localStorage.getItem(this.QUEUE_KEY);
      if (queueData) {
        this.operationQueue = JSON.parse(queueData);
      }
    } catch (error) {
      console.error('Failed to load operation queue:', error);
    }
  }

  private saveToLocalStorage() {
    try {
      localStorage.setItem(this.CACHE_KEY, JSON.stringify(this.cache));
    } catch (error) {
      console.error('Failed to save data to cache:', error);
    }
  }

  private saveQueueToStorage() {
    try {
      localStorage.setItem(this.QUEUE_KEY, JSON.stringify(this.operationQueue));
    } catch (error) {
      console.error('Failed to save operation queue:', error);
    }
  }

  private setupEmergencyBackup() {
    // Load any emergency backup data if it exists
    try {
      const emergencyData = localStorage.getItem(this.BACKUP_KEY);
      if (emergencyData) {
        const backup = JSON.parse(emergencyData);
        console.log('Found emergency backup data, restoring...');
        
        // Merge emergency backup with current data
        if (backup.operationQueue && backup.operationQueue.length > 0) {
          this.operationQueue = [...this.operationQueue, ...backup.operationQueue];
          this.saveQueueToStorage();
        }
        
        if (backup.cache && backup.cache.lastUpdated > this.cache.lastUpdated) {
          this.cache = backup.cache;
          this.saveToLocalStorage();
        }
        
        // Clear the emergency backup after restoring
        localStorage.removeItem(this.BACKUP_KEY);
        console.log('Emergency backup restored and cleared');
      }
    } catch (error) {
      console.error('Failed to restore emergency backup:', error);
    }
  }

  private startAutoSave() {
    // Auto-save every 10 seconds to ensure data persistence
    this.autoSaveInterval = setInterval(() => {
      this.saveToLocalStorage();
      this.saveQueueToStorage();
    }, 10000);
  }

  private emergencySave() {
    try {
      // Save current state as emergency backup
      const emergencyData = {
        cache: this.cache,
        operationQueue: this.operationQueue,
        timestamp: Date.now()
      };
      
      localStorage.setItem(this.BACKUP_KEY, JSON.stringify(emergencyData));
      localStorage.setItem(this.CACHE_KEY, JSON.stringify(this.cache));
      localStorage.setItem(this.QUEUE_KEY, JSON.stringify(this.operationQueue));
      
      console.log('Emergency save completed');
    } catch (error) {
      console.error('Emergency save failed:', error);
    }
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private updateLocalCache(entity: string, operation: OfflineOperation) {
    const entityData = this.cache[entity as keyof CachedData] as any[];
    
    switch (operation.type) {
      case 'CREATE':
        if (Array.isArray(entityData)) {
          entityData.push({ ...operation.data, _offline_id: operation.id });
        } else if (entity === 'settings') {
          this.cache.settings = operation.data;
        }
        break;
      
      case 'UPDATE':
        if (Array.isArray(entityData)) {
          const index = entityData.findIndex(item => 
            item.id === operation.data.id || item._offline_id === operation.data._offline_id
          );
          if (index !== -1) {
            entityData[index] = { ...entityData[index], ...operation.data };
          }
        } else if (entity === 'settings') {
          this.cache.settings = { ...this.cache.settings, ...operation.data };
        }
        break;
      
      case 'DELETE':
        if (Array.isArray(entityData)) {
          const index = entityData.findIndex(item => 
            item.id === operation.data.id || item._offline_id === operation.data._offline_id
          );
          if (index !== -1) {
            entityData.splice(index, 1);
          }
        }
        break;
    }
    
    this.saveToLocalStorage();
  }

  private async processOfflineQueue() {
    if (!this.isOnline || this.operationQueue.length === 0) return;

    console.log(`Processing ${this.operationQueue.length} offline operations...`);

    const processedOperations: string[] = [];

    for (const operation of this.operationQueue) {
      try {
        await this.executeOperation(operation);
        processedOperations.push(operation.id);
        console.log(`Synced operation: ${operation.type} ${operation.entity}`);
      } catch (error) {
        console.error('Failed to sync operation:', operation, error);
        // Keep failed operations in queue for retry
      }
    }

    // Remove successfully processed operations
    this.operationQueue = this.operationQueue.filter(
      op => !processedOperations.includes(op.id)
    );
    this.saveQueueToStorage();

    if (processedOperations.length > 0) {
      // Refresh cache after successful sync
      await this.syncData();
    }
  }

  private async executeOperation(operation: OfflineOperation): Promise<any> {
    const options: RequestInit = {
      method: operation.method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (operation.method !== 'GET' && operation.method !== 'DELETE') {
      options.body = JSON.stringify(operation.data);
    }

    const response = await fetch(`${API_BASE_URL}${operation.endpoint}`, options);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  }

  private queueOperation(
    type: OfflineOperation['type'],
    entity: OfflineOperation['entity'],
    endpoint: string,
    method: string,
    data: any
  ): string {
    const operation: OfflineOperation = {
      id: this.generateId(),
      type,
      entity,
      data,
      timestamp: Date.now(),
      endpoint,
      method
    };

    this.operationQueue.push(operation);
    this.saveQueueToStorage();
    this.updateLocalCache(entity, operation);

    // Try to sync immediately if online
    if (this.isOnline) {
      this.processOfflineQueue();
    }

    return operation.id;
  }

  // CRUD Operations with offline support
  async createCustomer(customerData: any): Promise<any> {
    // Always add to local cache immediately for instant UI feedback
    const tempId = this.generateId();
    const customerWithId = { ...customerData, _offline_id: tempId, _pending: !this.isOnline };
    
    // Add to cache immediately so UI shows the new customer
    this.cache.customers.unshift(customerWithId);
    this.saveToLocalStorage();

    if (this.isOnline) {
      try {
        const response = await fetch(`${API_BASE_URL}/customers`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(customerData)
        });
        
        if (response.ok) {
          const result = await response.json();
          // Replace temp entry with real entry
          const index = this.cache.customers.findIndex(c => c._offline_id === tempId);
          if (index !== -1) {
            this.cache.customers[index] = result;
            this.saveToLocalStorage();
          }
          return result;
        }
      } catch (error) {
        console.warn('Failed to create customer online, queuing for offline:', error);
      }
    }

    // Queue for offline processing if offline or failed online
    this.queueOperation('CREATE', 'customers', '/customers', 'POST', customerData);
    return customerWithId;
  }

  async updateCustomer(id: string, customerData: any): Promise<any> {
    // Update cache immediately for instant UI feedback
    const index = this.cache.customers.findIndex(c => c.id === id || c._offline_id === id);
    const updatedCustomer = { id, ...customerData, _pending: !this.isOnline };
    
    if (index !== -1) {
      this.cache.customers[index] = { ...this.cache.customers[index], ...updatedCustomer };
      this.saveToLocalStorage();
    }

    if (this.isOnline) {
      try {
        const response = await fetch(`${API_BASE_URL}/customers/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(customerData)
        });
        
        if (response.ok) {
          const result = await response.json();
          // Update cache with server response
          if (index !== -1) {
            this.cache.customers[index] = result;
            this.saveToLocalStorage();
          }
          return result;
        }
      } catch (error) {
        console.warn('Failed to update customer online, queuing for offline:', error);
      }
    }

    // Queue for offline processing if offline or failed online
    this.queueOperation('UPDATE', 'customers', `/customers/${id}`, 'PUT', { id, ...customerData });
    return updatedCustomer;
  }

  async deleteCustomer(id: string): Promise<void> {
    // Remove from cache immediately for instant UI feedback
    this.cache.customers = this.cache.customers.filter(c => c.id !== id && c._offline_id !== id);
    this.saveToLocalStorage();

    if (this.isOnline) {
      try {
        const response = await fetch(`${API_BASE_URL}/customers/${id}`, {
          method: 'DELETE'
        });
        
        if (response.ok) {
          return;
        }
      } catch (error) {
        console.warn('Failed to delete customer online, queuing for offline:', error);
      }
    }

    // Queue for offline processing if offline or failed online
    this.queueOperation('DELETE', 'customers', `/customers/${id}`, 'DELETE', { id });
  }

  // Similar methods for other entities...
  async createBill(billData: any): Promise<any> {
    // Always add to local cache immediately for instant UI feedback
    const tempId = this.generateId();
    const billWithId = { ...billData, _offline_id: tempId, _pending: !this.isOnline };
    
    // Add to cache immediately so UI shows the new bill
    this.cache.bills.unshift(billWithId);
    this.saveToLocalStorage();

    if (this.isOnline) {
      try {
        const response = await fetch(`${API_BASE_URL}/bills`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(billData)
        });
        
        if (response.ok) {
          const result = await response.json();
          // Replace temp entry with real entry
          const index = this.cache.bills.findIndex(b => b._offline_id === tempId);
          if (index !== -1) {
            this.cache.bills[index] = result;
            this.saveToLocalStorage();
          }
          return result;
        }
      } catch (error) {
        console.warn('Failed to create bill online, queuing for offline:', error);
      }
    }

    // Queue for offline processing if offline or failed online
    this.queueOperation('CREATE', 'bills', '/bills', 'POST', billData);
    return billWithId;
  }

  async updateBill(id: string, billData: any): Promise<any> {
    // Update cache immediately for instant UI feedback
    const index = this.cache.bills.findIndex(b => b.id === id || b._offline_id === id);
    const updatedBill = { id, ...billData, _pending: !this.isOnline };
    
    if (index !== -1) {
      this.cache.bills[index] = { ...this.cache.bills[index], ...updatedBill };
      this.saveToLocalStorage();
    }

    if (this.isOnline) {
      try {
        const response = await fetch(`${API_BASE_URL}/bills/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(billData)
        });
        
        if (response.ok) {
          const result = await response.json();
          // Update cache with server response
          if (index !== -1) {
            this.cache.bills[index] = result;
            this.saveToLocalStorage();
          }
          return result;
        }
      } catch (error) {
        console.warn('Failed to update bill online, queuing for offline:', error);
      }
    }

    // Queue for offline processing if offline or failed online
    this.queueOperation('UPDATE', 'bills', `/bills/${id}`, 'PUT', { id, ...billData });
    return updatedBill;
  }

  private isCacheValid(): boolean {
    const now = Date.now();
    return (now - this.cache.lastUpdated) < this.CACHE_DURATION;
  }

  private async makeRequest(url: string, options?: RequestInit): Promise<any> {
    if (!this.isOnline) {
      throw new Error('No internet connection available');
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Request failed:', error);
      throw error;
    }
  }

  private async syncData() {
    if (!this.isOnline) return;

    try {
      const [customers, bills, transactions, expenses, employees, settings] = await Promise.all([
        this.makeRequest(`${API_BASE_URL}/customers`),
        this.makeRequest(`${API_BASE_URL}/bills`),
        this.makeRequest(`${API_BASE_URL}/transactions`),
        this.makeRequest(`${API_BASE_URL}/expenses`),
        this.makeRequest(`${API_BASE_URL}/employees`),
        this.makeRequest(`${API_BASE_URL}/settings`)
      ]);

      this.cache = {
        customers,
        bills,
        transactions,
        expenses: expenses.expenses || [],
        employees,
        settings,
        lastUpdated: Date.now()
      };

      this.saveToLocalStorage();
      console.log('Data synced successfully');
    } catch (error) {
      console.error('Failed to sync data:', error);
    }
  }

  private async syncWhenOnline() {
    console.log('Back online, processing offline operations...');
    await this.processOfflineQueue();
    await this.syncData();
  }

  // Public API methods with offline fallback
  async getCustomers(): Promise<any[]> {
    if (this.isOnline && (!this.isCacheValid() || this.cache.customers.length === 0)) {
      try {
        const customers = await this.makeRequest(`${API_BASE_URL}/customers`);
        this.cache.customers = customers;
        this.cache.lastUpdated = Date.now();
        this.saveToLocalStorage();
        return customers;
      } catch (error) {
        console.warn('Failed to fetch customers online, using cache:', error);
      }
    }
    return this.cache.customers;
  }

  async getBills(): Promise<any[]> {
    if (this.isOnline && (!this.isCacheValid() || this.cache.bills.length === 0)) {
      try {
        const bills = await this.makeRequest(`${API_BASE_URL}/bills`);
        this.cache.bills = bills;
        this.cache.lastUpdated = Date.now();
        this.saveToLocalStorage();
        return bills;
      } catch (error) {
        console.warn('Failed to fetch bills online, using cache:', error);
      }
    }
    return this.cache.bills;
  }

  async getTransactions(): Promise<any[]> {
    if (this.isOnline && (!this.isCacheValid() || this.cache.transactions.length === 0)) {
      try {
        const transactions = await this.makeRequest(`${API_BASE_URL}/transactions`);
        this.cache.transactions = transactions;
        this.cache.lastUpdated = Date.now();
        this.saveToLocalStorage();
        return transactions;
      } catch (error) {
        console.warn('Failed to fetch transactions online, using cache:', error);
      }
    }
    return this.cache.transactions;
  }

  async getExpenses(): Promise<any> {
    if (this.isOnline && (!this.isCacheValid() || this.cache.expenses.length === 0)) {
      try {
        const expenses = await this.makeRequest(`${API_BASE_URL}/expenses`);
        this.cache.expenses = expenses.expenses || [];
        this.cache.lastUpdated = Date.now();
        this.saveToLocalStorage();
        return expenses;
      } catch (error) {
        console.warn('Failed to fetch expenses online, using cache:', error);
      }
    }
    return { expenses: this.cache.expenses, dashboard: {} };
  }

  async getEmployees(): Promise<any[]> {
    if (this.isOnline && (!this.isCacheValid() || this.cache.employees.length === 0)) {
      try {
        const employees = await this.makeRequest(`${API_BASE_URL}/employees`);
        this.cache.employees = employees;
        this.cache.lastUpdated = Date.now();
        this.saveToLocalStorage();
        return employees;
      } catch (error) {
        console.warn('Failed to fetch employees online, using cache:', error);
      }
    }
    return this.cache.employees;
  }

  async getSettings(): Promise<any> {
    if (this.isOnline && (!this.isCacheValid() || !this.cache.settings)) {
      try {
        const settings = await this.makeRequest(`${API_BASE_URL}/settings`);
        this.cache.settings = settings;
        this.cache.lastUpdated = Date.now();
        this.saveToLocalStorage();
        return settings;
      } catch (error) {
        console.warn('Failed to fetch settings online, using cache:', error);
      }
    }
    return this.cache.settings;
  }

  async getPendingList(): Promise<any[]> {
    if (this.isOnline && (!this.isCacheValid() || this.cache.customers.length === 0)) {
      try {
        const pendingList = await this.makeRequest(`${API_BASE_URL}/customers/pending-list`);
        this.cache.lastUpdated = Date.now();
        this.saveToLocalStorage();
        return pendingList;
      } catch (error) {
        console.warn('Failed to fetch pending list online, using cache:', error);
      }
    }
    // Return empty array if no cache available for pending list
    return [];
  }

  // Status methods
  isConnected(): boolean {
    return this.isOnline;
  }

  getPendingOperationsCount(): number {
    return this.operationQueue.length;
  }

  getPendingOperations(): OfflineOperation[] {
    return [...this.operationQueue];
  }

  getCacheStatus(): { isValid: boolean; lastUpdated: Date | null } {
    return {
      isValid: this.isCacheValid(),
      lastUpdated: this.cache.lastUpdated ? new Date(this.cache.lastUpdated) : null
    };
  }

  async forceSync(): Promise<void> {
    if (this.isOnline) {
      await this.processOfflineQueue();
      await this.syncData();
    } else {
      throw new Error('Cannot sync while offline');
    }
  }

  clearCache(): void {
    this.cache = {
      customers: [],
      bills: [],
      transactions: [],
      expenses: [],
      employees: [],
      settings: null,
      lastUpdated: 0
    };
    this.operationQueue = [];
    localStorage.removeItem(this.CACHE_KEY);
    localStorage.removeItem(this.QUEUE_KEY);
    localStorage.removeItem(this.BACKUP_KEY);
  }

  // Cleanup method for proper disposal
  destroy(): void {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
    }
    
    // Save everything one last time
    this.emergencySave();
    
    // Remove event listeners
    window.removeEventListener('beforeunload', this.emergencySave);
  }
}

export const offlineService = new OfflineService();
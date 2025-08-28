import { useState, useEffect } from 'react';
import { offlineService } from '../services/offlineService';
import { toast } from 'sonner';

export interface OfflineStatus {
  isOnline: boolean;
  pendingOperations: number;
  lastSync: Date | null;
  isSyncing: boolean;
}

export const useOfflineOperations = () => {
  const [status, setStatus] = useState<OfflineStatus>({
    isOnline: navigator.onLine,
    pendingOperations: 0,
    lastSync: null,
    isSyncing: false
  });

  useEffect(() => {
    const updateStatus = () => {
      const cacheStatus = offlineService.getCacheStatus();
      setStatus({
        isOnline: offlineService.isConnected(),
        pendingOperations: offlineService.getPendingOperationsCount(),
        lastSync: cacheStatus.lastUpdated,
        isSyncing: false
      });
    };

    // Initial status
    updateStatus();

    // Listen for online/offline events
    const handleOnline = () => {
      setStatus(prev => ({ ...prev, isOnline: true, isSyncing: true }));
      toast.success('Back online! Syncing data...');
      
      // Small delay to allow sync to start
      setTimeout(() => {
        updateStatus();
        toast.success('Data synced successfully!');
      }, 2000);
    };

    const handleOffline = () => {
      setStatus(prev => ({ ...prev, isOnline: false }));
      toast.warning('You are now offline. Changes will be synced when you reconnect.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Update status periodically
    const interval = setInterval(updateStatus, 5000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  const forceSync = async () => {
    if (!status.isOnline) {
      toast.error('Cannot sync while offline');
      return;
    }

    setStatus(prev => ({ ...prev, isSyncing: true }));
    
    try {
      await offlineService.forceSync();
      toast.success('Data synced successfully!');
    } catch (error) {
      toast.error('Failed to sync data');
      console.error('Sync failed:', error);
    } finally {
      setStatus(prev => ({ ...prev, isSyncing: false }));
    }
  };

  const clearOfflineData = () => {
    offlineService.clearCache();
    setStatus(prev => ({ ...prev, pendingOperations: 0, lastSync: null }));
    toast.info('Offline data cleared');
  };

  // CRUD operations with offline support
  const createRecord = async (entity: string, data: any) => {
    try {
      let result;
      
      switch (entity) {
        case 'customers':
          result = await offlineService.createCustomer(data);
          break;
        case 'bills':
          result = await offlineService.createBill(data);
          break;
        default:
          throw new Error(`Unsupported entity: ${entity}`);
      }

      if (result._pending) {
        toast.info(`${entity.slice(0, -1)} created offline. Will sync when online.`);
      } else {
        toast.success(`${entity.slice(0, -1)} created successfully!`);
      }

      // Update status
      setStatus(prev => ({ 
        ...prev, 
        pendingOperations: offlineService.getPendingOperationsCount() 
      }));

      return result;
    } catch (error) {
      toast.error(`Failed to create ${entity.slice(0, -1)}`);
      throw error;
    }
  };

  const updateRecord = async (entity: string, id: string, data: any) => {
    try {
      let result;
      
      switch (entity) {
        case 'customers':
          result = await offlineService.updateCustomer(id, data);
          break;
        case 'bills':
          result = await offlineService.updateBill(id, data);
          break;
        default:
          throw new Error(`Unsupported entity: ${entity}`);
      }

      if (result._pending) {
        toast.info(`${entity.slice(0, -1)} updated offline. Will sync when online.`);
      } else {
        toast.success(`${entity.slice(0, -1)} updated successfully!`);
      }

      // Update status
      setStatus(prev => ({ 
        ...prev, 
        pendingOperations: offlineService.getPendingOperationsCount() 
      }));

      return result;
    } catch (error) {
      toast.error(`Failed to update ${entity.slice(0, -1)}`);
      throw error;
    }
  };

  const deleteRecord = async (entity: string, id: string) => {
    try {
      switch (entity) {
        case 'customers':
          await offlineService.deleteCustomer(id);
          break;
        default:
          throw new Error(`Unsupported entity: ${entity}`);
      }

      if (!status.isOnline) {
        toast.info(`${entity.slice(0, -1)} marked for deletion. Will sync when online.`);
      } else {
        toast.success(`${entity.slice(0, -1)} deleted successfully!`);
      }

      // Update status
      setStatus(prev => ({ 
        ...prev, 
        pendingOperations: offlineService.getPendingOperationsCount() 
      }));

    } catch (error) {
      toast.error(`Failed to delete ${entity.slice(0, -1)}`);
      throw error;
    }
  };

  return {
    status,
    forceSync,
    clearOfflineData,
    createRecord,
    updateRecord,
    deleteRecord,
    // Expose the service for direct access if needed
    offlineService
  };
};
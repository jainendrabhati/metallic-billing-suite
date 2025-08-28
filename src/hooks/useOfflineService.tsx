import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { offlineService } from '../services/offlineService';
import { toast } from 'sonner';

export const useOfflineService = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingOperations, setPendingOperations] = useState(0);
  const queryClient = useQueryClient();

  useEffect(() => {
    const updateStatus = () => {
      setIsOnline(offlineService.isConnected());
      setPendingOperations(offlineService.getPendingOperationsCount());
    };

    // Initial status
    updateStatus();

    // Listen for online/offline events
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('Back online! Syncing data...');
      
      // Trigger query invalidation to refresh UI
      setTimeout(() => {
        queryClient.invalidateQueries();
        updateStatus();
      }, 2000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.warning('You are now offline. Changes will be saved locally.');
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
  }, [queryClient]);

  // Enhanced CRUD operations that work with React Query
  const createCustomer = async (customerData: any) => {
    try {
      const result = await offlineService.createCustomer(customerData);
      
      // Immediately update React Query cache
      queryClient.setQueryData(['customers'], (oldData: any) => {
        if (!oldData) return [result];
        return [result, ...oldData];
      });

      if (result._pending) {
        toast.info('Customer created offline. Will sync when online.');
      } else {
        toast.success('Customer created successfully!');
      }

      setPendingOperations(offlineService.getPendingOperationsCount());
      return result;
    } catch (error) {
      toast.error('Failed to create customer');
      throw error;
    }
  };

  const updateCustomer = async (id: string, customerData: any) => {
    try {
      const result = await offlineService.updateCustomer(id, customerData);
      
      // Immediately update React Query cache
      queryClient.setQueryData(['customers'], (oldData: any) => {
        if (!oldData) return [result];
        return oldData.map((customer: any) => 
          (customer.id === id || customer._offline_id === id) ? result : customer
        );
      });

      if (result._pending) {
        toast.info('Customer updated offline. Will sync when online.');
      } else {
        toast.success('Customer updated successfully!');
      }

      setPendingOperations(offlineService.getPendingOperationsCount());
      return result;
    } catch (error) {
      toast.error('Failed to update customer');
      throw error;
    }
  };

  const deleteCustomer = async (id: string) => {
    try {
      await offlineService.deleteCustomer(id);
      
      // Immediately update React Query cache
      queryClient.setQueryData(['customers'], (oldData: any) => {
        if (!oldData) return [];
        return oldData.filter((customer: any) => 
          customer.id !== id && customer._offline_id !== id
        );
      });

      if (!isOnline) {
        toast.info('Customer deleted offline. Will sync when online.');
      } else {
        toast.success('Customer deleted successfully!');
      }

      setPendingOperations(offlineService.getPendingOperationsCount());
    } catch (error) {
      toast.error('Failed to delete customer');
      throw error;
    }
  };

  const createBill = async (billData: any) => {
    try {
      const result = await offlineService.createBill(billData);
      
      // Immediately update React Query cache
      queryClient.setQueryData(['bills'], (oldData: any) => {
        if (!oldData) return [result];
        return [result, ...oldData];
      });

      if (result._pending) {
        toast.info('Bill created offline. Will sync when online.');
      } else {
        toast.success('Bill created successfully!');
      }

      setPendingOperations(offlineService.getPendingOperationsCount());
      return result;
    } catch (error) {
      toast.error('Failed to create bill');
      throw error;
    }
  };

  const updateBill = async (id: string, billData: any) => {
    try {
      const result = await offlineService.updateBill(id, billData);
      
      // Immediately update React Query cache
      queryClient.setQueryData(['bills'], (oldData: any) => {
        if (!oldData) return [result];
        return oldData.map((bill: any) => 
          (bill.id === id || bill._offline_id === id) ? result : bill
        );
      });

      if (result._pending) {
        toast.info('Bill updated offline. Will sync when online.');
      } else {
        toast.success('Bill updated successfully!');
      }

      setPendingOperations(offlineService.getPendingOperationsCount());
      return result;
    } catch (error) {
      toast.error('Failed to update bill');
      throw error;
    }
  };

  const forceSync = async () => {
    if (!isOnline) {
      toast.error('Cannot sync while offline');
      return;
    }

    try {
      toast.info('Syncing data...');
      await offlineService.forceSync();
      queryClient.invalidateQueries();
      setPendingOperations(0);
      toast.success('Data synced successfully!');
    } catch (error) {
      toast.error('Failed to sync data');
      console.error('Sync failed:', error);
    }
  };

  return {
    isOnline,
    pendingOperations,
    createCustomer,
    updateCustomer,
    deleteCustomer,
    createBill,
    updateBill,
    forceSync,
    // Expose the service for direct access if needed
    offlineService
  };
};
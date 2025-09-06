import { useState, useEffect } from 'react';
import { hybridAPI } from '../services/hybridAPI';
import { toast } from 'sonner';

export const useHybridAPI = () => {
  const [isLocalServerAvailable, setIsLocalServerAvailable] = useState(true);
  const [isCheckingServer, setIsCheckingServer] = useState(false);

  useEffect(() => {
    const checkServer = async () => {
      const available = await hybridAPI.checkServerStatus();
      setIsLocalServerAvailable(available);
      
      if (!available) {
        toast.warning('Local server unavailable. Using offline mode.');
      }
    };

    checkServer();
    
    // Check server status every 30 seconds
    const interval = setInterval(checkServer, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const forceServerCheck = async () => {
    setIsCheckingServer(true);
    try {
      const available = await hybridAPI.checkServerStatus();
      setIsLocalServerAvailable(available);
      
      if (available) {
        toast.success('Local server is available!');
      } else {
        toast.error('Local server is not responding');
      }
      
      return available;
    } catch (error) {
      toast.error('Failed to check server status');
      return false;
    } finally {
      setIsCheckingServer(false);
    }
  };

  return {
    isLocalServerAvailable,
    isCheckingServer,
    forceServerCheck,
    api: hybridAPI
  };
};
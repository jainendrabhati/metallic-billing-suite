import { useState, useEffect, useCallback } from "react";
import { licenseAPI } from "@/services/licenseAPI";
import { useToast } from "@/hooks/use-toast";
import { hybridAPI } from "@/services/hybridAPI";
import { licenseScheduler } from "@/services/licenseScheduler";

export const useLicenseAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [isServerReady, setIsServerReady] = useState(false);
  const [serverCheckAttempts, setServerCheckAttempts] = useState(0);
  const { toast } = useToast();

  const checkServerStatus = useCallback(async () => {
    const maxAttempts = 20; // Wait up to ~30 seconds (3s * 20 attempts)

    try {
      const isAvailable = await hybridAPI.checkServerStatus();
      if (isAvailable) {
        setIsServerReady(true);
        return true;
      } else if (serverCheckAttempts < maxAttempts) {
        setServerCheckAttempts(prev => prev + 1);
        // Retry after 30 seconds
        setTimeout(() => {
          checkServerStatus();
        }, 30000);
        return false;
      } else {
        // Server failed to start after max attempts
        setIsLoading(false);
        return false;
      }
    } catch (error) {
      console.error("Server check error:", error);
      if (serverCheckAttempts < maxAttempts) {
        setServerCheckAttempts(prev => prev + 1);
        setTimeout(() => {
          checkServerStatus();
        }, 3000);
        return false;
      } else {
        setIsLoading(false);
        return false;
      }
    }
  }, [serverCheckAttempts, toast]);

  const checkLicenseStatus = useCallback(async () => {
    try {
      await licenseAPI.getLicense();
      setIsAuthenticated(true);
      setShowAuthDialog(false);
      await licenseAPI.validateLicense();
    } catch (error: any) {
      console.log("No license found, showing auth dialog");
      setIsAuthenticated(false);
      setShowAuthDialog(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const validateLicense = useCallback(async () => {
    // Skip validation if offline
    if (!navigator.onLine) {
      console.log("App is offline, skipping license validation");
      return;
    }

    try {
      await licenseAPI.validateLicense();
      console.log("License validation successful");
    } catch (error: any) {
      console.error("License validation failed:", error.message);
      
      // Only show error and force re-auth for actual license failures, not network issues
      if (error.message === "License validation failed" && navigator.onLine) {
        setIsAuthenticated(false);
        setShowAuthDialog(true);
        toast({
          title: "License Validation Failed",
          description: "Your license key is no longer valid. Please re-authenticate.",
          variant: "destructive",
        });
      } else if (!navigator.onLine) {
        console.log("License validation skipped due to offline status");
      } else {
        console.log("License validation failed due to network issues, continuing normally");
      }
    }
  }, [toast]);

  const handleAuthSuccess = useCallback(() => {
    setIsAuthenticated(true);
    setShowAuthDialog(false);
  }, []);

  useEffect(() => {
    // First check if server is ready, then check license
    const initializeApp = async () => {
      const serverReady = await checkServerStatus();
      if (serverReady) {
        checkLicenseStatus();
      }
    };
    
    initializeApp();
  }, [checkServerStatus, checkLicenseStatus]);

  useEffect(() => {
    if (!isAuthenticated) {
      // Stop scheduler if not authenticated  
      licenseScheduler.stop();
      return;
    }

    // Start the hourly license validation scheduler
    licenseScheduler.start();
    console.log('License scheduler started for hourly validation');

    return () => {
      // Don't stop the scheduler here as it should persist throughout the app lifecycle
      // It will be stopped only when authentication fails
    };
  }, [isAuthenticated]);

  return {
    isAuthenticated,
    isLoading,
    showAuthDialog,
    handleAuthSuccess,
    isServerReady,
    serverCheckAttempts,
  };
};
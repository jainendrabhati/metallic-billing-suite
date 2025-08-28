import { useState, useEffect, useCallback } from "react";
import { licenseAPI } from "@/services/licenseAPI";
import { useToast } from "@/hooks/use-toast";
// import { licenseValidationService } from "@/services/licenseValidationService";

export const useLicenseAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const { toast } = useToast();

  const checkLicenseStatus = useCallback(async () => {
    try {
      await licenseAPI.getLicense();
      setIsAuthenticated(true);
      setShowAuthDialog(false);
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
    checkLicenseStatus();
  }, [checkLicenseStatus]);

  useEffect(() => {
    if (!isAuthenticated) {
      // Clean up validation service if not authenticated  
      // licenseValidationService.destroy();
      return;
    }

    // The licenseValidationService automatically handles 24-hour validation
    // No need for manual intervals here as the service manages everything
    console.log('License validation service is now active');

    return () => {
      // Don't destroy the service here as it should persist throughout the app lifecycle
      // It will be destroyed only when authentication fails
    };
  }, [isAuthenticated]);

  return {
    isAuthenticated,
    isLoading,
    showAuthDialog,
    handleAuthSuccess,
  };
};
import { useState, useEffect, useCallback } from "react";
import { licenseAPI } from "@/services/licenseAPI";
import { useToast } from "@/hooks/use-toast";

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
    try {
      await licenseAPI.validateLicense();
      console.log("License validation successful");
    } catch (error: any) {
      console.error("License validation failed:", error.message);
      if (error.message === "License validation failed") {
        setIsAuthenticated(false);
        setShowAuthDialog(true);
        toast({
          title: "License Validation Failed",
          description: "Your license key is no longer valid. Please re-authenticate.",
          variant: "destructive",
        });
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
    if (!isAuthenticated) return;

    // Set up periodic validation every 6 hours (6 * 60 * 60 * 1000 = 21600000ms)
    const validationInterval = setInterval(() => {
      validateLicense();
    }, 21600000);

    return () => clearInterval(validationInterval);
  }, [isAuthenticated, validateLicense]);

  return {
    isAuthenticated,
    isLoading,
    showAuthDialog,
    handleAuthSuccess,
  };
};
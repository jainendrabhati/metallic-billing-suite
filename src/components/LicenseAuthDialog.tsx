
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { licenseAPI, LicenseData } from "@/services/licenseAPI";
import { useToast } from "@/hooks/use-toast";

interface LicenseAuthDialogProps {
  open: boolean;
  onAuthSuccess: () => void;
}

const LicenseAuthDialog = ({ open, onAuthSuccess }: LicenseAuthDialogProps) => {
  const [formData, setFormData] = useState<LicenseData>({
    name: "",
    activation_key: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.activation_key.trim()) {
      toast({
        title: "Validation Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const result = await licenseAPI.authenticateLicense(formData);
      toast({
        title: "Authentication Successful",
        description: result.offline 
          ? "License saved for offline use" 
          : "License validated successfully",
      });
      onAuthSuccess();
    } catch (error: any) {
      console.error("License authentication error:", error);
      toast({
        title: "Authentication Failed",
        description: error.message || "Failed to authenticate license key",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof LicenseData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.value
    }));
  };

  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-md" hideCloseButton>
        <DialogHeader>
          <DialogTitle>License Authentication Required</DialogTitle>
          <DialogDescription>
            Please enter your name and activation key to use this application.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              type="text"
              value={formData.name}
              onChange={handleInputChange("name")}
              placeholder="Enter your name"
              disabled={isLoading}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="activation_key">Activation Key *</Label>
            <Input
              id="activation_key"
              type="text"
              value={formData.activation_key}
              onChange={handleInputChange("activation_key")}
              placeholder="Enter your activation key"
              disabled={isLoading}
            />
          </div>
          
          <Button 
            type="submit" 
            className="w-full" 
            disabled={isLoading}
          >
            {isLoading ? "Authenticating..." : "Authenticate"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default LicenseAuthDialog;
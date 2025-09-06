import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Clock, Mail, CheckCircle } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { settingsAPI } from "@/services/api";
import { useToast } from "@/hooks/use-toast";

interface GoogleDriveSettingsProps {
  email: string;
  backupTime: string;
  autoBackupEnabled: boolean;
  onEmailChange: (email: string) => void;
  onBackupTimeChange: (time: string) => void;
  onAutoBackupChange: (enabled: boolean) => void;
}

const GoogleDriveSettings = ({
  email,
  backupTime,
  autoBackupEnabled,
  onEmailChange,
  onBackupTimeChange,
  onAutoBackupChange
}: GoogleDriveSettingsProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: driveSettings } = useQuery({
    queryKey: ['googleDriveSettings'],
    queryFn: settingsAPI.getGoogleDriveSettings,
  });

  const authenticateMutation = useMutation({
    mutationFn: settingsAPI.authenticateGoogleDrive,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['googleDriveSettings'] });
      toast({
        title: "Success",
        description: "Google Drive authenticated successfully! Auto-backup is now active.",
      });
    },
    onError: (error: any) => {
      console.error("Google Drive authentication error:", error);
      
      let errorMessage = "Authentication failed. Please try again.";
      let errorDetails = "";
      
      if (error.response?.data) {
        errorMessage = error.response.data.error || errorMessage;
        errorDetails = error.response.data.details || "";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Authentication Failed",
        description: `${errorMessage} ${errorDetails}`.trim(),
        variant: "destructive",
      });
    },
  });

  const updateSettingsMutation = useMutation({
    mutationFn: settingsAPI.updateGoogleDriveSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['googleDriveSettings'] });
      toast({
        title: "Settings Updated",
        description: "Google Drive backup settings saved successfully!",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleAuthenticate = () => {
    if (!email) {
      toast({
        title: "Email Required",
        description: "Please enter your Google account email address.",
        variant: "destructive",
      });
      return;
    }

    const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailPattern.test(email)) {
        toast({
          title: "Invalid Email",
          description: "Please enter a valid email address.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Authenticating...",
        description: "Please complete the authentication in your browser.",
      });

    authenticateMutation.mutate({
      email: email.trim().toLowerCase(),
      backup_time: backupTime,
      auto_backup_enabled: autoBackupEnabled,
    });
  };

  const handleUpdateSettings = () => {
    updateSettingsMutation.mutate({
      email: email,
      backup_time: backupTime,
      auto_backup_enabled: autoBackupEnabled,
    });
  };

  const isAuthenticated = driveSettings?.authenticated;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Google Drive Auto Backup
          {isAuthenticated && (
            <CheckCircle className="h-4 w-4 text-green-500" />
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="googleEmail" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Google Drive Email
          </Label>
          <Input
            id="googleEmail"
            type="email"
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            placeholder="Enter your Google account email"
            className="mt-1"
            disabled={authenticateMutation.isPending}
          />
          {isAuthenticated && (
            <p className="text-sm text-green-600 mt-1">
              ✓ Authenticated with {driveSettings?.email}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="backupTime" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Daily Backup Time
          </Label>
          <Input
            id="backupTime"
            type="time"
            value={backupTime}
            onChange={(e) => onBackupTimeChange(e.target.value)}
            className="mt-1"
            disabled={authenticateMutation.isPending}
          />
          <p className="text-sm text-gray-600 mt-1">
            Automatic backup will run daily at this time
          </p>
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="autoBackup" className="text-sm font-medium">
            Enable Auto Backup
          </Label>
          <Switch
            id="autoBackup"
            checked={autoBackupEnabled}
            onCheckedChange={onAutoBackupChange}
            disabled={authenticateMutation.isPending}
          />
        </div>

        <div className="space-y-2"> 
            <Button 
              onClick={handleAuthenticate}
              className="w-full flex items-center gap-2"
              disabled={authenticateMutation.isPending || !email}
            >
              <Mail className="h-4 w-4" />
              {authenticateMutation.isPending ? "Authenticating..." : "Authenticate & Setup Backup"}
            </Button>
        </div>

       <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <h4 className="font-medium text-amber-800 mb-2">⚠️ Authentication Tips</h4>
          <ul className="text-sm text-amber-700 space-y-1">
            <li>• Make sure to complete the OAuth flow in your browser</li>
            <li>• Select the correct Google account when prompted</li>
            <li>• Grant all required permissions for Google Drive access</li>
            <li>• If authentication fails, try closing browser and trying again</li>
          </ul>
        </div>

        {isAuthenticated && autoBackupEnabled && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="font-medium text-green-800 mb-1">✅ Backup Active</h4>
            <p className="text-sm text-green-700">
              Your data will be automatically backed up to your Google Drive daily at {backupTime}.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default GoogleDriveSettings;
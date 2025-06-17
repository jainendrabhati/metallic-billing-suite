
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

const GoogleDriveSettings = () => {
  const [settings, setSettings] = useState({
    email: "",
    backupTime: "20:00",
    autoBackupEnabled: false,
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: driveSettings } = useQuery({
    queryKey: ['googleDriveSettings'],
    queryFn: settingsAPI.getGoogleDriveSettings,
  });

  useEffect(() => {
    if (driveSettings) {
      setSettings({
        email: driveSettings.email || "",
        backupTime: driveSettings.backup_time || "20:00",
        autoBackupEnabled: driveSettings.auto_backup_enabled || false,
      });
    }
  }, [driveSettings]);

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
      toast({
        title: "Authentication Failed",
        description: error.message || "Please check your credentials and try again.",
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
    if (!settings.email) {
      toast({
        title: "Email Required",
        description: "Please enter your Google account email address.",
        variant: "destructive",
      });
      return;
    }

    authenticateMutation.mutate({
      email: settings.email,
      backup_time: settings.backupTime,
      auto_backup_enabled: settings.autoBackupEnabled,
    });
  };

  const handleUpdateSettings = () => {
    updateSettingsMutation.mutate({
      email: settings.email,
      backup_time: settings.backupTime,
      auto_backup_enabled: settings.autoBackupEnabled,
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
            value={settings.email}
            onChange={(e) => setSettings(prev => ({ ...prev, email: e.target.value }))}
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
            value={settings.backupTime}
            onChange={(e) => setSettings(prev => ({ ...prev, backupTime: e.target.value }))}
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
            checked={settings.autoBackupEnabled}
            onCheckedChange={(checked) => 
              setSettings(prev => ({ ...prev, autoBackupEnabled: checked }))
            }
            disabled={authenticateMutation.isPending}
          />
        </div>

        <div className="space-y-2">
          {!isAuthenticated ? (
            <Button 
              onClick={handleAuthenticate}
              className="w-full flex items-center gap-2"
              disabled={authenticateMutation.isPending || !settings.email}
            >
              <Mail className="h-4 w-4" />
              {authenticateMutation.isPending ? "Authenticating..." : "Authenticate & Setup Backup"}
            </Button>
          ) : (
            <Button 
              onClick={handleUpdateSettings}
              variant="outline"
              className="w-full"
              disabled={updateSettingsMutation.isPending}
            >
              {updateSettingsMutation.isPending ? "Saving..." : "Update Backup Settings"}
            </Button>
          )}
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-800 mb-2">📁 How Auto Backup Works</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Each user authenticates with their own Google account</li>
            <li>• Backups are stored in the user's personal Google Drive</li>
            <li>• Daily backups include all data exported as CSV files in ZIP format</li>
            <li>• Backups are stored in "Metalic Jewelry Backups" folder</li>
            <li>• No storage cost for you - users use their own Google Drive storage</li>
          </ul>
        </div>

        {isAuthenticated && settings.autoBackupEnabled && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="font-medium text-green-800 mb-1">✅ Backup Active</h4>
            <p className="text-sm text-green-700">
              Your data will be automatically backed up to your Google Drive daily at {settings.backupTime}.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default GoogleDriveSettings;

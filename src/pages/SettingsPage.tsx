
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Download, Upload, Save, Image } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { settingsAPI } from "@/services/api";
import { useToast } from "@/hooks/use-toast";

const SettingsPage = () => {
  const [firmSettings, setFirmSettings] = useState({
    firmName: "",
    gstNumber: "",
    address: "",
    firmLogo: null as File | null,
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: settings } = useQuery({
    queryKey: ['firmSettings'],
    queryFn: settingsAPI.getFirmSettings,
    onSuccess: (data) => {
      setFirmSettings({
        firmName: data.firm_name || "",
        gstNumber: data.gst_number || "",
        address: data.address || "",
        firmLogo: null,
      });
    },
  });

  const updateSettingsMutation = useMutation({
    mutationFn: settingsAPI.updateFirmSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['firmSettings'] });
      toast({
        title: "Success",
        description: "Settings saved successfully!",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  const downloadBackupMutation = useMutation({
    mutationFn: settingsAPI.downloadBackup,
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Backup downloaded successfully!",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to download backup. Please try again.",
        variant: "destructive",
      });
    },
  });

  const uploadBackupMutation = useMutation({
    mutationFn: settingsAPI.uploadBackup,
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast({
        title: "Success",
        description: "Database restored successfully!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to restore backup. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setFirmSettings(prev => ({ ...prev, firmLogo: file }));
    }
  };

  const handleDownloadBackup = () => {
    downloadBackupMutation.mutate();
  };

  const handleUploadBackup = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.name.endsWith('.zip')) {
        uploadBackupMutation.mutate(file);
      } else {
        toast({
          title: "Error",
          description: "Please upload a valid ZIP file.",
          variant: "destructive",
        });
      }
    }
  };

  const handleSaveSettings = () => {
    updateSettingsMutation.mutate({
      firm_name: firmSettings.firmName,
      gst_number: firmSettings.gstNumber,
      address: firmSettings.address,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Settings</h1>
        <Button 
          onClick={handleSaveSettings} 
          className="flex items-center gap-2"
          disabled={updateSettingsMutation.isPending}
        >
          <Save className="h-4 w-4" />
          {updateSettingsMutation.isPending ? "Saving..." : "Save Settings"}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Firm Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="firmName">Firm Name</Label>
              <Input
                id="firmName"
                value={firmSettings.firmName}
                onChange={(e) => setFirmSettings(prev => ({ ...prev, firmName: e.target.value }))}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="gstNumber">GST Number</Label>
              <Input
                id="gstNumber"
                value={firmSettings.gstNumber}
                onChange={(e) => setFirmSettings(prev => ({ ...prev, gstNumber: e.target.value }))}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                value={firmSettings.address}
                onChange={(e) => setFirmSettings(prev => ({ ...prev, address: e.target.value }))}
                className="mt-1"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="logo">Firm Logo</Label>
              <div className="mt-1 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center">
                {firmSettings.firmLogo ? (
                  <div className="space-y-2">
                    <Image className="h-8 w-8 text-gray-400 mx-auto" />
                    <p className="text-sm text-gray-600 dark:text-gray-400">{firmSettings.firmLogo.name}</p>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => document.getElementById('logo-upload')?.click()}
                    >
                      Change Logo
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Image className="h-8 w-8 text-gray-400 mx-auto" />
                    <p className="text-sm text-gray-600 dark:text-gray-400">Upload your firm logo</p>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => document.getElementById('logo-upload')?.click()}
                    >
                      Choose File
                    </Button>
                  </div>
                )}
                <input
                  id="logo-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Data Backup & Restore</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h3 className="font-medium">Download Backup</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Download a complete backup of your database as CSV files in ZIP format
              </p>
              <Button 
                onClick={handleDownloadBackup} 
                className="w-full flex items-center gap-2"
                disabled={downloadBackupMutation.isPending}
              >
                <Download className="h-4 w-4" />
                {downloadBackupMutation.isPending ? "Downloading..." : "Download Backup"}
              </Button>
            </div>

            <div className="border-t pt-4">
              <div className="space-y-2">
                <h3 className="font-medium">Upload Backup</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Restore data from a previously downloaded backup ZIP file
                </p>
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 text-center">
                  <Upload className="h-6 w-6 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    Choose backup ZIP file to upload
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => document.getElementById('backup-upload')?.click()}
                    disabled={uploadBackupMutation.isPending}
                  >
                    {uploadBackupMutation.isPending ? "Uploading..." : "Select File"}
                  </Button>
                  <input
                    id="backup-upload"
                    type="file"
                    accept=".zip"
                    onChange={handleUploadBackup}
                    className="hidden"
                  />
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
                <h4 className="font-medium text-yellow-800 dark:text-yellow-200 mb-1">⚠️ Important Note</h4>
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  Uploading a backup will replace all existing data. Make sure to download 
                  a current backup before proceeding.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SettingsPage;

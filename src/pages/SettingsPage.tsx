import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Download, Upload, Save, Image, Clock, Mail, Building2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { settingsAPI } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import GoogleDriveSettings from "@/components/GoogleDriveSettings";
import AppSidebar from "@/components/AppSidebar";
import { useSidebar } from "@/components/SidebarProvider";
import Navbar from "@/components/Navbar";

const SettingsPage = () => {
  const [firmSettings, setFirmSettings] = useState({
    firmName: "",
    gstNumber: "",
    address: "",
    mobile: "",
    email: "",
    accountNumber: "",
    accountHolderName: "",
    ifscCode: "",
    branchAddress: "",
    city: "",
    firmLogo: null as File | null,
  });

  const [googleDriveSettings, setGoogleDriveSettings] = useState({
    email: "",
    backupTime: "20:00",
    autoBackupEnabled: false,
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isOpen } = useSidebar();

  const { data: settings } = useQuery({
    queryKey: ["firmSettings"],
    queryFn: settingsAPI.getFirmSettings,
  });

  const { data: driveSettings } = useQuery({
    queryKey: ["googleDriveSettings"],
    queryFn: settingsAPI.getGoogleDriveSettings,
  });

  useEffect(() => {
    if (settings) {
      setFirmSettings({
        firmName: settings.firm_name || "",
        gstNumber: settings.gst_number || "",
        address: settings.address || "",
        accountNumber: settings.account_number || "",
        accountHolderName: settings.account_holder_name || "",
        ifscCode: settings.ifsc_code || "",
        branchAddress: settings.branch_address || "",
        city: settings.city || "",
        firmLogo: null,
        mobile: settings.mobile || "",
        email: settings.email || "",
      });
    }
  }, [settings]);

  useEffect(() => {
    if (driveSettings) {
      setGoogleDriveSettings({
        email: driveSettings.email || "",
        backupTime: driveSettings.backup_time || "20:00",
        autoBackupEnabled: driveSettings.auto_backup_enabled || false,
      });
    }
  }, [driveSettings]);

  const updateSettingsMutation = useMutation({
  mutationFn: (data: Record<string, any>) => settingsAPI.updateFirmSettings(data),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["firmSettings"] });
    toast({ title: "Success", description: "Settings saved successfully!" });
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
  let payload: any;

  if (firmSettings.firmLogo) {
    // Send FormData if we have a file
    const formData = new FormData();
    formData.append("firm_name", firmSettings.firmName);
    formData.append("gst_number", firmSettings.gstNumber);
    formData.append("address", firmSettings.address);
    formData.append("city", firmSettings.city);
    formData.append("account_number", firmSettings.accountNumber);
    formData.append("account_holder_name", firmSettings.accountHolderName);
    formData.append("mobile", firmSettings.mobile);
    formData.append("email", firmSettings.email);
    formData.append("ifsc_code", firmSettings.ifscCode);
    formData.append("branch_address", firmSettings.branchAddress);
    formData.append("firm_logo", firmSettings.firmLogo);
    payload = formData;
  } else {
    // Send JSON if no file
    payload = {
      firm_name: firmSettings.firmName,
      gst_number: firmSettings.gstNumber,
      address: firmSettings.address,
      city: firmSettings.city,
      mobile: firmSettings.mobile,
      email: firmSettings.email,
      account_number: firmSettings.accountNumber,
      account_holder_name: firmSettings.accountHolderName,
      ifsc_code: firmSettings.ifscCode,
      branch_address: firmSettings.branchAddress,
    };
  }

  console.log("Payload being sent:", payload instanceof FormData ? Object.fromEntries(payload.entries()) : payload);

  updateSettingsMutation.mutate(payload);
};


  return (
    <>
      <AppSidebar />
      <div className={`transition-all duration-300 ${isOpen ? "ml-64" : "ml-16"}`}>
        <Navbar />
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
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
                    onChange={(e) =>
                      setFirmSettings((prev) => ({ ...prev, firmName: e.target.value }))
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="gstNumber">GST Number</Label>
                  <Input
                    id="gstNumber"
                    value={firmSettings.gstNumber}
                    onChange={(e) =>
                      setFirmSettings((prev) => ({ ...prev, gstNumber: e.target.value }))
                    }
                    className="mt-1"
                  />
                </div>
                 <div>
                  <Label htmlFor="mobile">Mobile</Label>
                  <Input
                    id="mobile"
                    value={firmSettings.mobile}
                    onChange={(e) =>
                      setFirmSettings((prev) => ({ ...prev, mobile: e.target.value }))
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    value={firmSettings.email}
                    onChange={(e) =>
                      setFirmSettings((prev) => ({ ...prev, email: e.target.value }))
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="address">Address</Label>
                  <Textarea
                    id="address"
                    value={firmSettings.address}
                    onChange={(e) =>
                      setFirmSettings((prev) => ({ ...prev, address: e.target.value }))
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={firmSettings.city}
                    onChange={(e) =>
                      setFirmSettings((prev) => ({ ...prev, city: e.target.value }))
                    }
                    className="mt-1"
                  />
                </div>
              </CardContent>
            </Card>

            <GoogleDriveSettings />

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Banking Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="accountNumber">Account Holder Name & Number</Label>
                  <Input
                    id="accountNumber"
                    value={firmSettings.accountNumber}
                    onChange={(e) =>
                      setFirmSettings((prev) => ({ ...prev, accountNumber: e.target.value }))
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="accountHolderName">Bank Name </Label>
                  <Input
                    id="accountHolderName"
                    value={firmSettings.accountHolderName}
                    onChange={(e) =>
                      setFirmSettings((prev) => ({ ...prev, accountHolderName: e.target.value }))
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="ifscCode">IFSC Code</Label>
                  <Input
                    id="ifscCode"
                    value={firmSettings.ifscCode}
                    onChange={(e) =>
                      setFirmSettings((prev) => ({ ...prev, ifscCode: e.target.value }))
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="branchAddress">Branch Address</Label>
                  <Textarea
                    id="branchAddress"
                    value={firmSettings.branchAddress}
                    onChange={(e) =>
                      setFirmSettings((prev) => ({ ...prev, branchAddress: e.target.value }))
                    }
                    className="mt-1"
                  />
                </div>
                 <div>
                  <Label htmlFor="firmLogo">Firm Logo</Label>
                  <div className="mt-1">
                    <Input
                      id="firmLogo"
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setFirmSettings(prev => ({ ...prev, firmLogo: file }));
                        }
                      }}
                      className="border-gray-300 focus:border-blue-500"
                    />
                    <p className="text-sm text-gray-500 mt-1">Upload your firm logo (JPG, PNG, etc.)</p>
                    {settings?.firm_logo_url && (
                      <div className="mt-2">
                        <img 
                          src={settings.firm_logo_url} 
                          alt="Current logo" 
                          className="h-16 w-16 object-contain border rounded"
                        />
                        <p className="text-xs text-gray-500 mt-1">Current logo</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Manual Data Backup & Restore</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h3 className="font-medium">Download Backup</h3>
                  <p className="text-sm text-gray-600">
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
                    <p className="text-sm text-gray-600">
                      Restore data from a previously downloaded backup ZIP file
                    </p>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                      <Upload className="h-6 w-6 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600 mb-2">
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
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <h4 className="font-medium text-yellow-800 mb-1">⚠️ Important Note</h4>
                    <p className="text-sm text-yellow-700">
                      Uploading a backup will replace all existing data. Make sure to download 
                      a current backup before proceeding.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
};

export default SettingsPage;

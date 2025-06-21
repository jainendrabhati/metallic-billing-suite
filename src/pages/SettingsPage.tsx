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

const SettingsPage = () => {
  const [firmSettings, setFirmSettings] = useState({
    firmName: "",
    gstNumber: "",
    address: "",
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
        firmLogo: null, // logos are handled via file upload
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
    mutationFn: settingsAPI.updateFirmSettings,
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

  const handleSaveSettings = () => {
    const formData = new FormData();
    formData.append("firm_name", firmSettings.firmName);
    formData.append("gst_number", firmSettings.gstNumber);
    formData.append("address", firmSettings.address);
    formData.append("account_number", firmSettings.accountNumber);
    formData.append("account_holder_name", firmSettings.accountHolderName);
    formData.append("ifsc_code", firmSettings.ifscCode);
    formData.append("branch_address", firmSettings.branchAddress);
    formData.append("city", firmSettings.city);

    if (firmSettings.firmLogo) {
      formData.append("firm_logo", firmSettings.firmLogo);
    }

    updateSettingsMutation.mutate(formData);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFirmSettings((prev) => ({ ...prev, firmLogo: file }));
    }
  };

  return (
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
            {[
              { id: "firmName", label: "Firm Name", value: firmSettings.firmName },
              { id: "gstNumber", label: "GST Number", value: firmSettings.gstNumber },
              { id: "address", label: "Address", value: firmSettings.address, type: "textarea" },
              { id: "city", label: "City", value: firmSettings.city },
            ].map((field) => (
              <div key={field.id}>
                <Label htmlFor={field.id}>{field.label}</Label>
                {field.type === "textarea" ? (
                  <Textarea
                    id={field.id}
                    value={field.value}
                    onChange={(e) =>
                      setFirmSettings((prev) => ({ ...prev, [field.id]: e.target.value }))
                    }
                    className="mt-1"
                  />
                ) : (
                  <Input
                    id={field.id}
                    value={field.value}
                    onChange={(e) =>
                      setFirmSettings((prev) => ({ ...prev, [field.id]: e.target.value }))
                    }
                    className="mt-1"
                  />
                )}
              </div>
            ))}

            <div>
              <Label htmlFor="firmLogo">Firm Logo</Label>
              <div className="mt-1 border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                {firmSettings.firmLogo ? (
                  <div className="space-y-2">
                    <Image className="h-8 w-8 text-gray-400 mx-auto" />
                    <p className="text-sm text-gray-600">{firmSettings.firmLogo.name}</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => document.getElementById("logo-upload")?.click()}
                    >
                      Change Logo
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Image className="h-8 w-8 text-gray-400 mx-auto" />
                    <p className="text-sm text-gray-600">Upload your firm logo</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => document.getElementById("logo-upload")?.click()}
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

        <GoogleDriveSettings />

        <Card>
          <CardHeader>

            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Banking Details
            </CardTitle>

          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { id: "accountNumber", label: "Account Number", value: firmSettings.accountNumber },
              {
                id: "accountHolderName",
                label: "Account Holder Name",
                value: firmSettings.accountHolderName,
              },
              { id: "ifscCode", label: "IFSC Code", value: firmSettings.ifscCode },
              {
                id: "branchAddress",
                label: "Branch Address",
                value: firmSettings.branchAddress,
                type: "textarea",
              },
            ].map((field) => (
              <div key={field.id}>
                <Label htmlFor={field.id}>{field.label}</Label>
                {field.type === "textarea" ? (
                  <Textarea
                    id={field.id}
                    value={field.value}
                    onChange={(e) =>
                      setFirmSettings((prev) => ({ ...prev, [field.id]: e.target.value }))
                    }
                    className="mt-1"
                  />
                ) : (
                  <Input
                    id={field.id}
                    value={field.value}
                    onChange={(e) =>
                      setFirmSettings((prev) => ({ ...prev, [field.id]: e.target.value }))
                    }
                    className="mt-1"
                  />
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SettingsPage;


import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Download, Upload, Save, Image } from "lucide-react";

const SettingsPage = () => {
  const [firmSettings, setFirmSettings] = useState({
    firmName: "Metalic Jewelers",
    gstNumber: "24ABCDE1234F1Z5",
    address: "123 Business Street, City, State - 400001",
    firmLogo: null as File | null,
  });

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setFirmSettings(prev => ({ ...prev, firmLogo: file }));
    }
  };

  const handleDownloadBackup = () => {
    console.log("Downloading backup...");
    // Add backup download logic here
  };

  const handleUploadBackup = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      console.log("Uploading backup:", file.name);
      // Add backup upload logic here
    }
  };

  const handleSaveSettings = () => {
    console.log("Saving settings:", firmSettings);
    // Add save logic here
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <Button onClick={handleSaveSettings} className="flex items-center gap-2">
          <Save className="h-4 w-4" />
          Save Settings
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
              <div className="mt-1 border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                {firmSettings.firmLogo ? (
                  <div className="space-y-2">
                    <Image className="h-8 w-8 text-gray-400 mx-auto" />
                    <p className="text-sm text-gray-600">{firmSettings.firmLogo.name}</p>
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
                    <p className="text-sm text-gray-600">Upload your firm logo</p>
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
              <p className="text-sm text-gray-600">
                Download a complete backup of your database in Excel/CSV format
              </p>
              <Button 
                onClick={handleDownloadBackup} 
                className="w-full flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Download Backup
              </Button>
            </div>

            <div className="border-t pt-4">
              <div className="space-y-2">
                <h3 className="font-medium">Upload Backup</h3>
                <p className="text-sm text-gray-600">
                  Restore data from a previously downloaded backup file
                </p>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                  <Upload className="h-6 w-6 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600 mb-2">
                    Choose backup file to upload
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => document.getElementById('backup-upload')?.click()}
                  >
                    Select File
                  </Button>
                  <input
                    id="backup-upload"
                    type="file"
                    accept=".csv,.xlsx,.xls"
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
  );
};

export default SettingsPage;

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Search, Calendar as CalendarIcon, Download, FileSpreadsheet, FileText, Edit, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { gstBillAPI, GSTBill } from "@/services/gstBillAPI";
import AppSidebar from "@/components/AppSidebar";
import { useSidebar } from "@/components/SidebarProvider";
import Navbar from "@/components/Navbar";
import { generatePDFHeader, generateBankDetailsSection } from "@/components/PDFTemplateHeader";
import { settingsAPI } from "@/services/api";
import GSTBillEditDialog from "@/components/GSTBillEditDialog";

const GSTBillLogsPage = () => {
  const { isOpen } = useSidebar();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedBill, setSelectedBill] = useState<GSTBill | null>(null);

  const { data: gstBills = [], isLoading } = useQuery({
    queryKey: ['gst-bills'],
    queryFn: gstBillAPI.getAll,
  });

  const { data: firmSettings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsAPI.getFirmSettings(),
  });

  const filteredBills = gstBills.filter(bill => {
    const matchesSearch = bill.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bill.bill_number?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const billDate = new Date(bill.date);
    const matchesStartDate = !startDate || billDate >= startDate;
    const matchesEndDate = !endDate || billDate <= endDate;
    
    return matchesSearch && matchesStartDate && matchesEndDate;
  });

   const deleteGSTBillMutation = useMutation({
    mutationFn: gstBillAPI.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gst-bills'] });
      toast({
        title: "Success",
        description: "GST bill deleted successfully!",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete GST bill.",
        variant: "destructive",
      });
    },
  });

  const handleDeleteBill = (id: number) => {
    if (window.confirm("Are you sure you want to delete this GST bill?")) {
      deleteGSTBillMutation.mutate(id);
    }
  };

  const handleEditBill = (bill: GSTBill) => {
    setSelectedBill(bill);
    setEditDialogOpen(true);
  };

  const handleExportToExcel = async () => {
    try {
      const filters = {
        startDate: startDate ? format(startDate, 'yyyy-MM-dd') : undefined,
        endDate: endDate ? format(endDate, 'yyyy-MM-dd') : undefined,
        customerName: searchTerm || undefined,
      };
      
      const blob = await gstBillAPI.exportToExcel(filters);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `gst-bills-${format(new Date(), 'dd-MM-yyyy')}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Success",
        description: "GST bills exported to Excel successfully!",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to export GST bills to Excel.",
        variant: "destructive",
      });
    }
  };

  const generateBillPDF = (bill: GSTBill) => {
    const printContent = `
     <html>
        <head>
          <title>.</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; font-size: 12px; }
            .header { text-align: center; border: 2px solid #000; padding: 15px; margin-bottom: 20px; }
            .invoice-details { display: flex; justify-content: space-between; margin: 20px 0; }
            .table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            .table th, .table td { border: 1px solid #000; padding: 8px; text-align: left; font-size: 11px; }
            .table th { background-color: #f0f0f0; font-weight: bold; text-align: center; }
            .totals { margin-top: 20px; }
            .footer { margin-top: 30px; }
            @media print { body { margin: 0; } }
          </style>
        </head>
        <body>
          
             ${generatePDFHeader({ firmSettings, title: "BILL RECEIPT" })}
          

          <div class="invoice-details">
            <div style="width: 50%;">
             
              <strong>Date:</strong> ${format(new Date(bill.date), 'dd/MM/yyyy')}<br>
              <strong>Time:</strong> ${bill.time}<br>
              <strong>Place of Delivery:</strong> ${bill.place}<br><br>
              <strong>To,</strong><br>
              M/s ${bill.customer_name}<br>
              ${bill.customer_address}<br>
              <strong>GSTIN No.:</strong> ${bill.customer_gstin}
            </div>
            <div style="width: 45%; text-align: right;">
              <strong>Your Order No.:</strong> _________________ <strong>Date:</strong> _______<br>
              <strong>R.R./G.R. No.:</strong> _________________ <strong>Date:</strong> _______<br>
              <strong>Vehicle No.:</strong> _________________________________<br>
             
            </div>
          </div>

          <table class="table">
            <thead>
              <tr>
                <th width="5%">S.No</th>
                <th width="40%">Particulars</th>
                <th width="10%">HSN</th>
                <th width="10%">Weight</th>
                <th width="10%">Rate</th>
                <th width="15%">Amount</th>
                
              </tr>
            </thead>
            <tbody>
              ${bill.items.map((item, index) => `
                <tr>
                  <td style="text-align: center;">${index + 1}</td>
                  <td>${item.description}</td>
                  <td style="text-align: center;">${item.hsn}</td>
                  <td style="text-align: center;">${item.weight}</td>
                  <td style="text-align: right;">₹${item.rate.toFixed(2)}</td>
                  <td style="text-align: right;">₹${item.amount.toFixed(2)}</td>
                  
                </tr>
              `).join('')}
              ${Array.from({ length: Math.max(0, 8 - bill.items.length) }, (_, i) => `
                <tr>
                  <td>&nbsp;</td>
                  <td>&nbsp;</td>
                  <td>&nbsp;</td>
                  <td>&nbsp;</td>
                  <td>&nbsp;</td>
                  <td>&nbsp;</td>
                 
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="totals">
            <table style="width: 100%; margin-top: 20px;">
              <tr>
                <td style="width: 50%; vertical-align: top;">
                  <strong>Bank Name:</strong> ${firmSettings?.account_holder_name}<br>
                  <strong>Branch:</strong> ${firmSettings?.branch_address || 'Benad Road, Jaipur'}<br>
                  <strong>A/c Name & Number:</strong> ${firmSettings?.account_number || '61338285502'}<br>
                  <strong>IFSC Code:</strong> ${firmSettings?.ifsc_code || 'SBIN0032380'}<br><br>
                  <strong>Rs. in words:</strong> ${bill.amount_in_words}
                </td>
                <td style="width: 50%; vertical-align: top;">
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="border: 1px solid #000; padding: 5px;">Total Amount before Tax</td>
                      <td style="border: 1px solid #000; padding: 5px; text-align: right;">₹${bill.total_amount_before_tax.toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td style="border: 1px solid #000; padding: 5px;">CGST@ ${bill.cgst_percentage}%</td>
                      <td style="border: 1px solid #000; padding: 5px; text-align: right;">₹${bill.cgst_amount.toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td style="border: 1px solid #000; padding: 5px;">SGST@ ${bill.sgst_percentage}%</td>
                      <td style="border: 1px solid #000; padding: 5px; text-align: right;">₹${bill.sgst_amount.toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td style="border: 1px solid #000; padding: 5px;">IGST@ ${bill.igst_percentage}%</td>
                      <td style="border: 1px solid #000; padding: 5px; text-align: right;">₹${bill.igst_amount.toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td style="border: 1px solid #000; padding: 5px; font-weight: bold;">Grand Total</td>
                      <td style="border: 1px solid #000; padding: 5px; text-align: right; font-weight: bold;">₹${bill.grand_total.toFixed(2)}</td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </div>

          <div class="footer" style="margin-top: 50px;">
            <div style="float: right; text-align: center;">
              <strong>For: ${firmSettings?.firm_name || 'TOLARAM & SONS'}</strong><br><br><br>
              <strong>Prop./Manager</strong>
            </div>
           
          </div>
        </body>
      </html>
    `;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
      printWindow.close();
    }
  };

  if (isLoading) {
    return (
      <>
        <AppSidebar />
        <div className={`transition-all duration-300 ${isOpen ? "ml-64" : "ml-16"}`}>
          <Navbar />
          <div className="flex items-center justify-center py-12">
            <div className="text-gray-500">Loading GST bills...</div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <AppSidebar />
      <div className={`transition-all duration-300 ${isOpen ? "ml-64" : "ml-16"}`}>
        <Navbar />
        <div className="min-h-screen bg-gray-50 p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">GST Bill Logs</h1>
                <p className="text-gray-600 mt-1">View and manage all GST invoices</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{filteredBills.length}</div>
                  <div className="text-sm text-gray-500">Total Bills</div>
                </div>
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  Filters & Export
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                  <div>
                    <Label htmlFor="search">Search by Customer/Bill Number</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="search"
                        placeholder="Search bills..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label>Start Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !startDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {startDate ? format(startDate, "PPP") : <span>Start date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={startDate}
                          onSelect={setStartDate}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div>
                    <Label>End Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !endDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {endDate ? format(endDate, "PPP") : <span>End date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={endDate}
                          onSelect={setEndDate}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div>
                    <Button onClick={handleExportToExcel} className="w-full flex items-center gap-2">
                      <FileSpreadsheet className="h-4 w-4" />
                      Export to Excel
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>GST Bills History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {filteredBills.length === 0 ? (
                    <div className="text-center py-12">
                      <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No GST bills found</h3>
                      <p className="text-gray-500">
                        {gstBills.length === 0 
                          ? "No GST bills have been created yet" 
                          : "No bills match your current filters"
                        }
                      </p>
                    </div>
                  ) : (
                    filteredBills.map((bill) => (
                      <div key={bill.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                        <div className="flex-1 grid grid-cols-5 gap-4 items-center">
                          <div>
                            <div className="font-semibold text-gray-900">Bill #{bill.bill_number}</div>
                            <div className="text-sm text-gray-500">
                              {format(new Date(bill.date), 'dd/MM/yyyy')}
                            </div>
                          </div>
                          <div>
                            <div className="font-medium">{bill.customer_name}</div>
                            <div className="text-sm text-gray-500">
                              {bill.customer_gstin ? `GSTIN: ${bill.customer_gstin}` : 'No GSTIN'}
                            </div>
                          </div>
                          <div className="text-center">
                            <Badge variant="secondary">
                              {bill.items.length} item{bill.items.length !== 1 ? 's' : ''}
                            </Badge>
                          </div>
                          <div className="text-center">
                            <div className="font-bold text-green-600">₹{bill.grand_total.toFixed(2)}</div>
                            <div className="text-xs text-gray-500">Grand Total</div>
                          </div>
                           
                          <div className="flex justify-center">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditBill(bill)}
                              className="flex items-center gap-1"
                            >
                              <Edit className="h-3 w-3" />
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => generateBillPDF(bill)}
                              className="flex items-center gap-1"
                            >
                              <Download className="h-3 w-3" />
                              PDF
                            </Button>
                             <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteBill(bill.id!)}
                              className="flex items-center gap-1"
                            >
                              <Trash2 className="h-3 w-3" />
                              Delete
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
       <GSTBillEditDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        bill={selectedBill}
      />
    </>
  );
};

export default GSTBillLogsPage;
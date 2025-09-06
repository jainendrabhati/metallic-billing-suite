import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Calendar as CalendarIcon, Download, FileText, Eye, Search, FileSpreadsheet, Edit, Trash2 } from "lucide-react";
import PDFPreviewModal from "@/components/PDFPreviewModal";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { gstBillAPI, GSTBill, GSTBillItem } from "@/services/gstBillAPI";
import { settingsAPI } from "@/services/api";
import AppSidebar from "@/components/AppSidebar";
import { gstCustomerAPI, GSTCustomer } from "@/services/gstCustomerAPI";
import { useSidebar } from "@/components/SidebarProvider";
import Navbar from "@/components/Navbar";
import { generatePDFHeader, generateBankDetailsSection } from "@/components/PDFTemplateHeader";
import GSTBillEditDialog from "@/components/GSTBillEditDialog";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

const GSTBillPage = () => {
  const { isOpen } = useSidebar();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [billNumber, setBillNumber] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerGstin, setCustomerGstin] = useState("");
  const [items, setItems] = useState<GSTBillItem[]>([
    { description: "", hsn: "0", weight: 0, rate: 0, amount: 0 }
  ]);
  const [cgstPercentage, setCgstPercentage] = useState(0);
  const [sgstPercentage, setSgstPercentage] = useState(0);
  const [igstPercentage, setIgstPercentage] = useState(0);
  const [time, setTime] = useState(format(new Date(), "HH:mm"));
  const [place, setPlace] = useState("");
  const [isPDFPreviewOpen, setIsPDFPreviewOpen] = useState(false);
  const [pdfContent, setPdfContent] = useState("");
  const [printContent, setPrintContent] = useState("");
  const [customerSuggestions, setCustomerSuggestions] = useState<GSTCustomer[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedBill, setSelectedBill] = useState<GSTBill | null>(null);

  const { data: firmSettings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsAPI.getFirmSettings(),
  });

  const { data: gstBills = [], isLoading } = useQuery({
    queryKey: ['gst-bills'],
    queryFn: gstBillAPI.getAll,
  });

  const createBillMutation = useMutation({
    mutationFn: gstBillAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gst-bills'] });
      toast({
        title: "Success",
        description: "GST Bill created successfully!",
      });
      resetForm();
      setIsDialogOpen(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create GST bill.",
        variant: "destructive",
      });
    },
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

  const resetForm = () => {
    setBillNumber("");
    setCustomerName("");
    setCustomerAddress("");
    setCustomerGstin("");
    setDate(new Date());
    setTime(format(new Date(), "HH:mm"));
    setPlace("");
    setItems([{ description: "", hsn: "0", weight: 0, rate: 0, amount: 0 }]);
  };

  const addItem = () => {
    setItems([...items, { description: "", hsn: "0", weight: 0, rate: 0, amount: 0 }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof GSTBillItem, value: string | number) => {
    const updatedItems = [...items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };

    if (field === 'rate' || field === 'weight') {
      updatedItems[index].amount = updatedItems[index].rate * updatedItems[index].weight/1000;
    }

    setItems(updatedItems);
  };

  const calculateTotals = () => {
    const totalAmountBeforeTax = items.reduce((sum, item) => sum + item.amount, 0);
    const cgstAmount = (totalAmountBeforeTax * cgstPercentage) / 100;
    const sgstAmount = (totalAmountBeforeTax * sgstPercentage) / 100;
    const igstAmount = (totalAmountBeforeTax * igstPercentage) / 100;
    const grandTotal = totalAmountBeforeTax + cgstAmount + sgstAmount + igstAmount;

    return {
      totalAmountBeforeTax,
      cgstAmount,
      sgstAmount,
      igstAmount,
      grandTotal
    };
  };

  const numberToWords = (num: number): string => {
    return `Rupees ${Math.floor(num)} only`;
  };

  const handleCustomerNameChange = async (value: string) => {
    setCustomerName(value);
    if (value.length >= 2) {
      try {
        const suggestions = await gstCustomerAPI.search(value);
        setCustomerSuggestions(suggestions);
        setShowSuggestions(true);
      } catch (error) {
        console.error('Error searching customers:', error);
      }
    } else {
      setShowSuggestions(false);
      setCustomerSuggestions([]);
    }
  };

  // Handle customer selection from suggestions
  const handleCustomerSelect = (customer: GSTCustomer) => {
    setCustomerName(customer.customer_name);
    setCustomerAddress(customer.customer_address || "");
    setCustomerGstin(customer.customer_gstin || "");
    setShowSuggestions(false);
    setCustomerSuggestions([]);
  };

  // Filter bills for logs functionality
  const filteredBills = gstBills.filter(bill => {
    const matchesSearch = bill.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         bill.bill_number?.toLowerCase().includes(searchTerm.toLowerCase());
    const billDate = new Date(bill.date);
    const matchesStartDate = !startDate || billDate >= startDate;
    const matchesEndDate = !endDate || billDate <= endDate;

    return matchesSearch && matchesStartDate && matchesEndDate;
  });

  const handleDeleteBill = (id: number) => {
    deleteGSTBillMutation.mutate(id);
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

  const generateBillPDFContent = (bill: GSTBill) => {
    return `<html>
<head>
  <title>GST Bill Preview</title>
  <style>
    body { 
      font-family: Arial, sans-serif; 
      margin: 20px; 
      font-size: 14px; 
    }
    .header { 
      text-align: center; 
      border: 2px solid #000; 
      padding: 15px; 
      margin-bottom: 20px; 
    }
    .invoice-details { 
      display: flex; 
      justify-content: space-between; 
      margin: 20px 0; 
    }
    .table { 
      width: 100%; 
      border-collapse: collapse; 
      margin: 20px 0; 
    }
    .table th, .table td { 
      border: 1px solid #000; 
      padding: 8px; 
      text-align: left; 
      font-size: 14px; 
    }
    .table th { 
      background-color: #f0f0f0; 
      font-weight: bold; 
      text-align: center; 
    }
    .totals { 
      margin-top: 20px; 
    }
    .footer { 
      margin-top: 30px; 
    }
    @media print { 
      body { 
        margin: 0; 
      } 
    }
  </style>
</head>
<body>
  ${generatePDFHeader({ firmSettings, title: "BILL RECEIPT" })}
  
  <div class="invoice-details">
    <div style="width: 50%;">
      <strong>Invoice No.:</strong> ${bill.bill_number}<br>
      <strong>Date:</strong> ${format(new Date(bill.date), 'dd/MM/yyyy')}<br><br>
      <strong>To,</strong><br>
      ${bill.customer_name}<br>
      ${bill.customer_address}<br>
      <strong>GSTIN No.:</strong> ${bill.customer_gstin}
    </div>
    <div style="width: 55%; text-align: right;">
      <strong>Your Order No.:</strong> _________________ <strong>Date:</strong> _______<br>
      <strong>R.R./G.R. No.:</strong> _________________ <strong>Date:</strong> _______<br>
      <strong>Vehicle No.:</strong> _________________________________<br>
      <strong>Time, Date & Place of Delivery:</strong> ${bill.time}, ${format(new Date(bill.date), 'dd/MM/yyyy')}, ${bill.place}<br>
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
      ${bill.items.map((item, index) => 
        `<tr>
          <td style="text-align: center;">${index + 1}</td>
          <td style="text-align: center;">${item.description}</td>
          <td style="text-align: center;">${item.hsn}</td>
          <td style="text-align: center;">${item.weight}</td>
          <td style="text-align: right;">₹${item.rate.toFixed(2)}</td>
          <td style="text-align: right;">₹${item.amount.toFixed(2)}</td>
        </tr>`
      ).join('')}
      ${Array.from({ length: Math.max(0, 8 - bill.items.length) }, (_, i) => 
        `<tr>
          <td>&nbsp;</td>
          <td>&nbsp;</td>
          <td>&nbsp;</td>
          <td>&nbsp;</td>
          <td>&nbsp;</td>
          <td>&nbsp;</td>
        </tr>`
      ).join('')}
    </tbody>
  </table>

  <div class="totals">
    <table style="width: 100%; margin-top: 20px;">
      <tr>
        <td style="width: 50%; vertical-align: top;font-size: 14px;">
          <strong>Bank Name:</strong> ${firmSettings?.account_holder_name }<br>
          <strong>Branch:</strong> ${firmSettings?.branch_address || 'Benad Road, Jaipur'}<br>
          <strong>A/c Name & Number:</strong> ${firmSettings?.account_number || '61338285502'}<br>
          <strong>IFSC Code:</strong> ${firmSettings?.ifsc_code || 'SBIN0032380'}<br><br>
          <strong>Rs. in words:</strong> ${bill.amount_in_words}
        </td>
        <td style="width: 50%; vertical-align: top;font-size: 14px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="border: 1px solid #000; padding: 5px;font-size: 14px;">Total Amount before Tax</td>
              <td style="border: 1px solid #000; padding: 5px; text-align: right;font-size: 14px;">₹${bill.total_amount_before_tax.toFixed(2)}</td>
            </tr>
            <tr>
              <td style="border: 1px solid #000; padding: 5px;font-size: 14px;">CGST@ ${bill.cgst_percentage}%</td>
              <td style="border: 1px solid #000; padding: 5px; text-align: right;font-size: 14px;">₹${bill.cgst_amount.toFixed(2)}</td>
            </tr>
            <tr>
              <td style="border: 1px solid #000; padding: 5px;font-size: 14px;">SGST@ ${bill.sgst_percentage}%</td>
              <td style="border: 1px solid #000; padding: 5px; text-align: right;font-size: 14px;">₹${bill.sgst_amount.toFixed(2)}</td>
            </tr>
            <tr>
              <td style="border: 1px solid #000; padding: 5px;font-size: 14px;">IGST@ ${bill.igst_percentage}%</td>
              <td style="border: 1px solid #000; padding: 5px; text-align: right;font-size: 14px;">₹${bill.igst_amount.toFixed(2)}</td>
            </tr>
            <tr>
              <td style="border: 1px solid #000; padding: 5px; font-weight: bold;font-size: 14px;">Grand Total</td>
              <td style="border: 1px solid #000; padding: 5px; text-align: right; font-weight: bold;font-size: 14px;">₹${bill.grand_total.toFixed(2)}</td>
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
</html>`;
  };

  const handleBillPDFPreview = (bill: GSTBill) => {
    const content = generateBillPDFContent(bill);
    setPrintContent(content);
    setIsPDFPreviewOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!billNumber || !customerName || !date || !time || !place || items.length === 0) {
      toast({
        title: "Error",
        description: "Please fill in all required fields including time and place.",
        variant: "destructive",
      });
      return;
    }

    const totals = calculateTotals();
    const billData: Omit<GSTBill, 'id' | 'created_at' | 'updated_at'> = {
      bill_number: billNumber,
      date: format(date, "yyyy-MM-dd"),
      time: time,
      place: place,
      customer_name: customerName,
      customer_address: customerAddress,
      customer_gstin: customerGstin,
      items: items,
      total_amount_before_tax: totals.totalAmountBeforeTax,
      cgst_percentage: cgstPercentage,
      sgst_percentage: sgstPercentage,
      igst_percentage: igstPercentage,
      cgst_amount: totals.cgstAmount,
      sgst_amount: totals.sgstAmount,
      igst_amount: totals.igstAmount,
      grand_total: totals.grandTotal,
      amount_in_words: numberToWords(totals.grandTotal),
    };

    createBillMutation.mutate(billData);
  };

  const generatePDFContent = () => {
    const totals = calculateTotals();
    return `<html>
<head>
  <title>GST Tax Invoice</title>
  <style>
    body { 
      font-family: Arial, sans-serif; 
      margin: 20px; 
      font-size: 12px; 
    }
    .header { 
      text-align: center; 
      border: 2px solid #000; 
      padding: 15px; 
      margin-bottom: 20px; 
    }
    .invoice-details { 
      display: flex; 
      justify-content: space-between; 
      margin: 20px 0; 
    }
    .table { 
      width: 100%; 
      border-collapse: collapse; 
      margin: 20px 0; 
    }
    .table th, .table td { 
      border: 1px solid #000; 
      padding: 8px; 
      text-align: left; 
      font-size: 11px; 
    }
    .table th { 
      background-color: #f0f0f0; 
      font-weight: bold; 
      text-align: center; 
    }
    .totals { 
      margin-top: 20px; 
    }
    .footer { 
      margin-top: 30px; 
    }
    @media print { 
      body { 
        margin: 0; 
      } 
    }
  </style>
</head>
<body>
  ${generatePDFHeader({ firmSettings, title: "BILL RECEIPT" })}
  
  <div class="invoice-details">
    <div style="width: 50%;">
      <strong>Invoice No.:</strong> ${billNumber}<br>
      <strong>Date:</strong> ${date ? format(date, 'dd/MM/yyyy') : ''}<br>
      <strong>Time:</strong> ${time}<br>
      <strong>Place of Delivery:</strong> ${place}<br><br>
      <strong>To,</strong><br>
      M/s ${customerName}<br>
      ${customerAddress}<br>
      <strong>GSTIN No.:</strong> ${customerGstin}
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
      ${items.map((item, index) => 
        `<tr>
          <td style="text-align: center;">${index + 1}</td>
          <td>${item.description}</td>
          <td style="text-align: center;">${item.hsn}</td>
          <td style="text-align: center;">${item.weight}</td>
          <td style="text-align: right;">₹${item.rate.toFixed(2)}</td>
          <td style="text-align: right;">₹${item.amount.toFixed(2)}</td>
        </tr>`
      ).join('')}
      ${Array.from({ length: Math.max(0, 8 - items.length) }, (_, i) => 
        `<tr>
          <td>&nbsp;</td>
          <td>&nbsp;</td>
          <td>&nbsp;</td>
          <td>&nbsp;</td>
          <td>&nbsp;</td>
          <td>&nbsp;</td>
        </tr>`
      ).join('')}
    </tbody>
  </table>

  <div class="totals">
    <table style="width: 100%; margin-top: 20px;">
      <tr>
        <td style="width: 50%; vertical-align: top;">
          <strong>Bank Name:</strong> ${firmSettings?.account_holder_name }<br>
          <strong>Branch:</strong> ${firmSettings?.branch_address || 'Benad Road, Jaipur'}<br>
          <strong>A/c No.:</strong> ${firmSettings?.account_number || '61338285502'}<br>
          <strong>IFSC Code:</strong> ${firmSettings?.ifsc_code || 'SBIN0032380'}<br><br>
          <strong>Rs. in words:</strong> ${numberToWords(totals.grandTotal)}
        </td>
        <td style="width: 50%; vertical-align: top;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="border: 1px solid #000; padding: 5px;">Total Amount before Tax</td>
              <td style="border: 1px solid #000; padding: 5px; text-align: right;">₹${totals.totalAmountBeforeTax.toFixed(2)}</td>
            </tr>
            <tr>
              <td style="border: 1px solid #000; padding: 5px;">CGST@ ${cgstPercentage}%</td>
              <td style="border: 1px solid #000; padding: 5px; text-align: right;">₹${totals.cgstAmount.toFixed(2)}</td>
            </tr>
            <tr>
              <td style="border: 1px solid #000; padding: 5px;">SGST@ ${sgstPercentage}%</td>
              <td style="border: 1px solid #000; padding: 5px; text-align: right;">₹${totals.sgstAmount.toFixed(2)}</td>
            </tr>
            <tr>
              <td style="border: 1px solid #000; padding: 5px;">IGST@ ${igstPercentage}%</td>
              <td style="border: 1px solid #000; padding: 5px; text-align: right;">₹${totals.igstAmount.toFixed(2)}</td>
            </tr>
            <tr>
              <td style="border: 1px solid #000; padding: 5px; font-weight: bold;">Grand Total</td>
              <td style="border: 1px solid #000; padding: 5px; text-align: right; font-weight: bold;">₹${totals.grandTotal.toFixed(2)}</td>
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
</html>`;
  };

  const handlePreviewPDF = () => {
    const content = generatePDFContent();
    setPdfContent(content);
    setPrintContent(content);
    setIsPDFPreviewOpen(true);
  };

  const handlePrintPDF = () => {
    const content = printContent || generatePDFContent();
    
    
  };

  const handleDownloadPDF = () => {
    const content = printContent || generatePDFContent();
    
    
    setIsPDFPreviewOpen(false);
  };

  const totals = calculateTotals();

  return (
    <>
      <AppSidebar />
      <div className={`transition-all duration-300 ${isOpen ? "ml-64" : "ml-16"}`}>
        <Navbar />
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">GST Bill Management</h1>
                <p className="text-gray-600 mt-1">Create and manage GST invoices</p>
              </div>

              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button 
                    className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                    onClick={resetForm}
                  >
                    <Plus className="h-4 w-4" />
                    New GST Bill
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Create New GST Bill</DialogTitle>
                  </DialogHeader>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="billNumber">Bill Number *</Label>
                        <Input
                          id="billNumber"
                          value={billNumber}
                          onChange={(e) => setBillNumber(e.target.value)}
                          placeholder="Enter bill number"
                        />
                      </div>

                      <div className="relative">
                        <Label htmlFor="customerName">Customer Name *</Label>
                        <Input
                          id="customerName"
                          value={customerName}
                          onChange={(e) => handleCustomerNameChange(e.target.value)}
                          placeholder="Enter customer name"
                          onFocus={() => customerSuggestions.length > 0 && setShowSuggestions(true)}
                        />
                        {showSuggestions && customerSuggestions.length > 0 && (
                          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                            {customerSuggestions.map((customer) => (
                              <div
                                key={customer.id}
                                className="px-4 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                                onClick={() => handleCustomerSelect(customer)}
                              >
                                <div className="font-medium text-gray-900">{customer.customer_name}</div>
                                {customer.customer_gstin && (
                                  <div className="text-sm text-gray-600">GST: {customer.customer_gstin}</div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="customerGstin">Customer GSTIN</Label>
                        <Input
                          id="customerGstin"
                          value={customerGstin}
                          onChange={(e) => setCustomerGstin(e.target.value)}
                          placeholder="Enter customer GSTIN"
                        />
                      </div>

                      <div>
                        <Label>Date *</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !date && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {date ? format(date, "PPP") : <span>Pick a date</span>}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={date}
                              onSelect={setDate}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>

                      <div>
                        <Label htmlFor="time">Time *</Label>
                        <Input
                          id="time"
                          type="time"
                          value={time}
                          onChange={(e) => setTime(e.target.value)}
                        />
                      </div>

                      <div>
                        <Label htmlFor="place">Place *</Label>
                        <Input
                          id="place"
                          value={place}
                          onChange={(e) => setPlace(e.target.value)}
                          placeholder="Enter place of delivery"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="customerAddress">Customer Address</Label>
                      <Textarea
                        id="customerAddress"
                        value={customerAddress}
                        onChange={(e) => setCustomerAddress(e.target.value)}
                        placeholder="Enter customer address"
                        rows={2}
                      />
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label className="text-lg font-semibold">Items</Label>
                        <Button type="button" onClick={addItem} size="sm">
                          <Plus className="h-4 w-4 mr-1" />
                          Add Item
                        </Button>
                      </div>

                      {items.map((item, index) => (
                        <Card key={index}>
                          <CardContent className="p-4">
                            <div className="grid grid-cols-6 gap-4 items-end">
                              <div>
                                <Label>Description *</Label>
                                <Input
                                  value={item.description}
                                  onChange={(e) => updateItem(index, 'description', e.target.value)}
                                  placeholder="Item description"
                                />
                              </div>
                              <div>
                                <Label>HSN Code</Label>
                                <Input
                                  value={item.hsn}
                                  onChange={(e) => updateItem(index, 'hsn', e.target.value)}
                                  placeholder="HSN code"
                                />
                              </div>
                              <div>
                                <Label>Weight</Label>
                                <Input
                                  type="number"
                                  step="0.001"
                                  value={item.weight}
                                  onChange={(e) => updateItem(index, 'weight', parseFloat(e.target.value) || 0)}
                                  placeholder="0.000"
                                />
                              </div>
                              <div>
                                <Label>Rate Per KG (₹)</Label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={item.rate}
                                  onChange={(e) => updateItem(index, 'rate', parseFloat(e.target.value) || 0)}
                                  placeholder="0.00"
                                />
                              </div>
                              <div>
                                <Label>Amount (₹)</Label>
                                <Input
                                  type="number"
                                  value={item.amount.toFixed(2)}
                                  readOnly
                                  className="bg-gray-100"
                                />
                              </div>
                              <div>
                                {items.length > 1 && (
                                  <Button
                                    type="button"
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => removeItem(index)}
                                  >
                                    Remove
                                  </Button>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label>CGST (%)</Label>
                        <Input
                          type="number"
                          step="0.1"
                          value={cgstPercentage}
                          onChange={(e) => setCgstPercentage(parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div>
                        <Label>SGST (%)</Label>
                        <Input
                          type="number"
                          step="0.1"
                          value={sgstPercentage}
                          onChange={(e) => setSgstPercentage(parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div>
                        <Label>IGST (%)</Label>
                        <Input
                          type="number"
                          step="0.1"
                          value={igstPercentage}
                          onChange={(e) => setIgstPercentage(parseFloat(e.target.value) || 0)}
                        />
                      </div>
                    </div>

                    <Card>
                      <CardContent className="p-4">
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span>Total Amount before Tax:</span>
                            <span>₹{totals.totalAmountBeforeTax.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>CGST ({cgstPercentage}%):</span>
                            <span>₹{totals.cgstAmount.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>SGST ({sgstPercentage}%):</span>
                            <span>₹{totals.sgstAmount.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>IGST ({igstPercentage}%):</span>
                            <span>₹{totals.igstAmount.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between font-bold text-lg border-t pt-2">
                            <span>Grand Total:</span>
                            <span>₹{totals.grandTotal.toFixed(2)}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <div className="flex gap-3">
                      <Button
                        type="submit"
                        className="flex-1"
                        disabled={createBillMutation.isPending}
                      >
                        {createBillMutation.isPending ? "Creating..." : "Create GST Bill"}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <Tabs defaultValue="create" className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">GST Bill History</h2>
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
                  <CardTitle>GST Bills</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {isLoading ? (
                      <div className="text-center py-12">
                        <div className="text-gray-500">Loading GST bills...</div>
                      </div>
                    ) : filteredBills.length === 0 ? (
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
                            <div className="flex justify-center gap-2">
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
                                onClick={() => handleBillPDFPreview(bill)}
                                className="flex items-center gap-1"
                              >
                                <Download className="h-3 w-3" />
                                PDF
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => setSelectedBill(bill)}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Bill</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete{" "}
                                      <span className="font-semibold">
                                        Bill #{selectedBill?.bill_number}
                                      </span>
                                      ? This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => {
                                        if (selectedBill) {
                                          handleDeleteBill(selectedBill.id!);
                                        }
                                      }}
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </Tabs>
          </div>
        </div>
      </div>

      <PDFPreviewModal
        isOpen={isPDFPreviewOpen}
        onOpenChange={setIsPDFPreviewOpen}
        title="GST Bill Preview"
        content={printContent}
        onDownload={handleDownloadPDF}
        onPrint={handlePrintPDF}
      />

      <GSTBillEditDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        bill={selectedBill}
      />
    </>
  );
};

export default GSTBillPage;
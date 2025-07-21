import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Calendar as CalendarIcon, Download, FileText } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { gstBillAPI, GSTBill, GSTBillItem } from "@/services/gstBillAPI";
import { settingsAPI } from "@/services/api";
import AppSidebar from "@/components/AppSidebar";
import { useSidebar } from "@/components/SidebarProvider";
import Navbar from "@/components/Navbar";

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
    { description: "", hsn: "", weight: 0, rate: 0, amount: 0 }
  ]);
  const [cgstPercentage, setCgstPercentage] = useState(1.5);
  const [sgstPercentage, setSgstPercentage] = useState(1.5);
  const [igstPercentage, setIgstPercentage] = useState(3);

  const { data: firmSettings } = useQuery({
    queryKey: ['firmSettings'],
    queryFn: settingsAPI.getFirmSettings,
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

  const resetForm = () => {
    setBillNumber("");
    setCustomerName("");
    setCustomerAddress("");
    setCustomerGstin("");
    setDate(new Date());
    setItems([{ description: "", hsn: "", weight: 0, rate: 0, amount: 0 }]);
  };

  const addItem = () => {
    setItems([...items, { description: "", hsn: "", weight: 0, rate: 0, amount: 0 }]);
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!billNumber || !customerName || !date || items.length === 0) {
      toast({
        title: "Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    const totals = calculateTotals();
    
    const billData: Omit<GSTBill, 'id' | 'created_at' | 'updated_at'> = {
      bill_number: billNumber,
      date: format(date, "yyyy-MM-dd"),
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

  const generatePDF = () => {
    const totals = calculateTotals();
    const printContent = `
      <html>
        <head>
          <title>GST Tax Invoice</title>
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
          <div class="header">
            <h2>${firmSettings?.firm_name || 'TOLARAM & SONS'}</h2>
            <p><strong>SILVER ART & CRAFT</strong></p>
            <p>${firmSettings?.address || 'Plot No. 120, Shree Dev Nagar, Benad Road, Jaipur (Raj.) -302039'}</p>
            <p>Email: ${firmSettings?.email || 'tolaramkumar0403@gmail.com'} | State Code: 08</p>
            <p><strong>GSTIN:</strong> ${firmSettings?.gst_number || '08BGHPP0571K1Z3'} | <strong>PAN:</strong> BGHPP0571K</p>
            <div style="float: right; margin-top: -60px;">
              <strong>TAX INVOICE</strong><br>
              Mob.: ${firmSettings?.phone_number || '7339696995'}<br>
              ${firmSettings?.alternate_phone || '9521474939'}
            </div>
          </div>

          <div class="invoice-details">
            <div style="width: 50%;">
              <strong>Invoice No.:</strong> ${billNumber}<br>
              <strong>Date:</strong> ${date ? format(date, 'dd/MM/yyyy') : ''}<br><br>
              <strong>To,</strong><br>
              M/s ${customerName}<br>
              ${customerAddress}<br>
              <strong>GSTIN No.:</strong> ${customerGstin}
            </div>
            <div style="width: 45%; text-align: right;">
              <strong>Your Order No.:</strong> _________________ <strong>Date:</strong> _______<br>
              <strong>R.R./G.R. No.:</strong> _________________ <strong>Date:</strong> _______<br>
              <strong>Vehicle No.:</strong> _________________________________<br>
              <strong>Time, Date & Place of Delivery:</strong> ___________________
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
              ${items.map((item, index) => `
                <tr>
                  <td style="text-align: center;">${index + 1}</td>
                  <td>${item.description}</td>
                  <td style="text-align: center;">${item.hsn}</td>
                  <td style="text-align: center;">${item.weight}</td>
                  <td style="text-align: right;">₹${item.rate.toFixed(2)}</td>
                  <td style="text-align: right;">₹${item.amount.toFixed(2)}</td>
                  
                </tr>
              `).join('')}
              ${Array.from({ length: Math.max(0, 8 - items.length) }, (_, i) => `
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
                  <strong>Bank Name:</strong> ${firmSettings?.bank_name || 'STATE BANK OF INDIA'}<br>
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
            
            <div style="clear: both; margin-top: 40px;">
              <p style="font-size: 10px;">
                1. All Subject to ${firmSettings?.city || 'Jaipur'} Jurisdiction<br>
                2. Goods once sold are not returnable in any case.<br>
                3. Our responsibility ceases as soon as the goods leave our godown.<br>
                4. If any payment of our bill is not made within 7 days, interest @ 24% will be charged.<br>
                5. E. & O.E
              </p>
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
                  <Button className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700" onClick={resetForm}>
                    <Plus className="h-4 w-4" />
                    New GST Bill
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Create New GST Bill</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="billNumber">Bill Number *</Label>
                        <Input
                          id="billNumber"
                          value={billNumber}
                          onChange={(e) => setBillNumber(e.target.value)}
                          placeholder="Enter bill number"
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
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="customerName">Customer Name *</Label>
                        <Input
                          id="customerName"
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          placeholder="Enter customer name"
                        />
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
                                <Label>Rate (₹)</Label>
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
                      <Button type="button" variant="outline" onClick={generatePDF}>
                        <Download className="h-4 w-4 mr-2" />
                        Preview PDF
                      </Button>
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

            <Card className="bg-gradient-to-r from-green-400 to-blue-500 text-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  GST Bill Generator
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-4">
                  Create professional GST invoices with automatic tax calculations. 
                  Bills are stored separately and don't affect other financial records.
                </p>
                <div className="text-center">
                  <Button onClick={() => setIsDialogOpen(true)} size="lg" variant="secondary">
                    <Plus className="h-5 w-5 mr-2" />
                    Create New GST Bill
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
};

export default GSTBillPage;

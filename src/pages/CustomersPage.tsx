
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Search, UserPlus, Phone, MapPin, Users, Eye, FileText, Download, Calendar, Edit, Plus } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customerAPI, billAPI } from "@/services/api";
import { format, intlFormat } from "date-fns";
import AppSidebar from "@/components/AppSidebar";
import Navbar from "@/components/Navbar";
import { useSidebar } from "@/components/SidebarProvider";
import EditCustomerDialog from "@/components/EditCustomerDialog";
import { useToast } from "@/hooks/use-toast";
import { generatePDFHeader, generateBankDetailsSection } from "@/components/PDFTemplateHeader";
import { settingsAPI } from "@/services/api";


const CustomersPage = () => {
  const { isOpen } = useSidebar();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [editingCustomer, setEditingCustomer] = useState<any>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  
  
  // Create customer form state
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerMobile, setNewCustomerMobile] = useState("");
  const [newCustomerAddress, setNewCustomerAddress] = useState("");

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: customerAPI.getAll,
  });

  const { data: firmSettings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsAPI.getFirmSettings(),
  });

  // Create customer mutation
  const createCustomerMutation = useMutation({
    mutationFn: customerAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast({
        title: "Success",
        description: "Customer created successfully!",
      });
      setIsCreateDialogOpen(false);
      setNewCustomerName("");
      setNewCustomerMobile("");
      setNewCustomerAddress("");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create customer.",
        variant: "destructive",
      });
    },
  });

  const { data: bills = [] } = useQuery({
    queryKey: ['bills'],
    queryFn: billAPI.getAll,
  });

  const { data: selectedCustomer } = useQuery({
    queryKey: ['customer', selectedCustomerId],
    queryFn: () => selectedCustomerId ? customerAPI.getById(selectedCustomerId) : null,
    enabled: !!selectedCustomerId,
  });

  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.mobile.includes(searchTerm);
    
    if (!fromDate && !toDate) return matchesSearch;
    
    const customerBills = bills.filter(bill => bill.customer_id === customer.id);
    
    if (customerBills.length === 0) return false;
    
    const hasValidDateRange = customerBills.some(bill => {
      const billDate = new Date(bill.date);
      const from = fromDate ? new Date(fromDate) : null;
      const to = toDate ? new Date(toDate) : null;
      
      if (from && to) {
        return billDate >= from && billDate <= to;
      } else if (from) {
        return billDate >= from;
      } else if (to) {
        return billDate <= to;
      }
      return true;
    });
    
    return matchesSearch && hasValidDateRange;
  });

  const getCustomerBills = (customerId: number) => {
    let customerBills = bills.filter(bill => bill.customer_id === customerId);
    
    // Apply date filter to bills
    if (fromDate || toDate) {
      customerBills = customerBills.filter(bill => {
        const billDate = new Date(bill.date);
        const from = fromDate ? new Date(fromDate) : null;
        const to = toDate ? new Date(toDate) : null;
        
        if (from && to) {
          return billDate >= from && billDate <= to;
        } else if (from) {
          return billDate >= from;
        } else if (to) {
          return billDate <= to;
        }
        return true;
      });
    }
    
    return customerBills;
  };

  const groupBillsByItemType = (customerBills: any[]) => {
    const grouped: Record<string, any[]> = {};
    customerBills.forEach(bill => {
      const itemType =  bill.item || 'Other';
      if (!grouped[itemType]) {
        grouped[itemType] = [];
      }
      grouped[itemType].push(bill);
    });
    return grouped;
  };

  const calculateItemTypeTotals = (itemBills: any[]) => {
    const creditBills = itemBills.filter(bill => bill.payment_type === 'credit');
    const debitBills = itemBills.filter(bill => bill.payment_type === 'debit');
    
    const totalCreditFine = creditBills.reduce((sum, bill) => sum + bill.total_fine, 0);
    const totalDebitFine = debitBills.reduce((sum, bill) => sum + bill.total_fine, 0);
    const totalCreditAmount = creditBills.reduce((sum, bill) => sum + bill.total_amount, 0);
    const totalDebitAmount = debitBills.reduce((sum, bill) => sum + bill.total_amount, 0);
    
    const netFine = totalCreditFine - totalDebitFine;
    const netAmount = totalCreditAmount - totalDebitAmount;
    
    return {
      totalCreditFine,
      totalDebitFine,
      totalCreditAmount,
      totalDebitAmount,
      netFine,
      netAmount
    };
  };

  const downloadCustomerPDF = async (customer: any) => {
    try {
      const customerBills = getCustomerBills(customer.id);
      const groupedBills = groupBillsByItemType(customerBills);
      
      // Create PDF content
      const pdfContent = generatePDFContent(customer, groupedBills);
      
      // Create and download PDF
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Customer Details - ${customer.name}</title>
               <style>
                @page { 
                  size: portrait; 
                  margin: 0.5in; 
                }
                body { 
                  font-family: Arial, sans-serif; 
                  font-size: 12px; 
                  margin: 0; 
                  padding: 20px;
                }
                .header { 
                  text-align: center; 
                  margin-bottom: 20px; 
                  border-bottom: 2px solid #333;
                  padding-bottom: 10px;
                }
                .customer-info { 
                  display: grid; 
                  grid-template-columns: 1fr 1fr; 
                  gap: 20px; 
                  margin-bottom: 20px; 
                }
                .info-section { 
                  border: 1px solid #ddd; 
                  padding: 15px; 
                  border-radius: 5px;
                }
                .info-title { 
                  font-weight: bold; 
                  color: #333; 
                  margin-bottom: 10px;
                  font-size: 14px;
                }
                .info-item { 
                  margin-bottom: 8px; 
                }
                .info-label { 
                  font-weight: bold; 
                  color: #666; 
                }
                .item-type-header {
                  background-color: #f5f5f5;
                  padding: 10px;
                  font-weight: bold;
                  font-size: 14px;
                  margin-top: 20px;
                  border: 1px solid #ddd;
                }
                .item-totals {
                  background-color: #e8f4fd;
                  padding: 10px;
                  margin-bottom: 10px;
                  border: 1px solid #ddd;
                }
                table { 
                  width: 100%; 
                  border-collapse: collapse; 
                  margin-top: 10px;
                  margin-bottom: 20px;
                  table-layout: fixed;
                }
                th, td { 
                  border: 1px solid #ddd; 
                  padding: 4px; 
                  text-align: left;
                  font-size: 9px;
                  word-wrap: break-word;
                  overflow: hidden;
                }
                th { 
                  background-color: #f5f5f5; 
                  font-weight: bold;
                }
                th:nth-child(1), td:nth-child(1) { width: 8%; } /* Date */
                th:nth-child(2), td:nth-child(2) { width: 8%; } /* Slip No */
                th:nth-child(3), td:nth-child(3) { width: 12%; } /* Item Name */
                th:nth-child(4), td:nth-child(4) { width: 8%; } /* Weight */
                th:nth-child(5), td:nth-child(5) { width: 8%; } /* Tunch */
                th:nth-child(6), td:nth-child(6) { width: 8%; } /* Wastage */
                th:nth-child(7), td:nth-child(7) { width: 8%; } /* Wages */
                th:nth-child(8), td:nth-child(8) { width: 10%; } /* Total Fine */
                th:nth-child(9), td:nth-child(9) { width: 10%; } /* Total Amount */
                th:nth-child(10), td:nth-child(10) { width: 12%; } /* Description */
                th:nth-child(11), td:nth-child(11) { width: 8%; } /* Type */
                .date-filter { 
                  text-align: center; 
                  margin-bottom: 15px; 
                  color: #666;
                  font-style: italic;
                }
                @media print {
                  button { display: none; }
                }
              </style>
            </head>
            <body>
              ${pdfContent}
              <div style="margin-top: 20px; text-align: center;">
                <button onclick="window.print()" style="padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer;">Print PDF</button>
              </div>
            </body>
          </html>
        `);
        printWindow.document.close();
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
    }
  };

  const generatePDFContent = (customer: any, groupedBills: Record<string, any[]>) => {
    const dateRange = fromDate || toDate ? 
      `Date Range: ${fromDate ? format(new Date(fromDate), 'dd/MM/yyyy') : 'All'} to ${toDate ? format(new Date(toDate), 'dd/MM/yyyy') : 'All'}` : 
      'All Records';

    const allBills = Object.values(groupedBills).flat();
    const totalNetAmount = allBills.reduce((sum, bill) => sum + (bill.payment_type === 'credit' ? bill.total_amount : -bill.total_amount), 0);

    let itemTypeSections = '';
    Object.entries(groupedBills).forEach(([itemType, itemBills]) => {
      const totals = calculateItemTypeTotals(itemBills);
      
      itemTypeSections += `
        <div class="item-type-header">${itemType.toUpperCase()}</div>
        <div class="item-totals" style="display: flex; justify-content: space-between; flex-wrap: wrap; gap: 10px;">
  <!-- Left side: First 3 items -->
  <div style="display: flex; gap: 12px;">
    <strong>Total Credited Amount:</strong> ₹${totals.totalCreditAmount.toFixed(2)} | 
    <strong>Total Debited Amount:</strong> ₹${totals.totalDebitAmount.toFixed(2)} | 
    <strong>Total Amount :</strong> ₹${totals.netAmount.toFixed(2)} 
  </div>

  <!-- Right side: Next 3 items -->
  <div style="display: flex; gap: 12px;">
    <strong>Total Credited ${itemType} Fine:</strong> ${totals.totalCreditFine.toFixed(2)}g | 
    <strong>Total Debited ${itemType} Fine:</strong> ${totals.totalDebitFine.toFixed(2)}g | 
    <strong>Total ${itemType}:</strong> ${totals.netFine.toFixed(2)}g 
  </div>
</div>
       <table>
  <thead>
    <tr>
      <th style="text-align: center;">Date</th>
      <th style="text-align: center;">Slip No.</th>
      <th style="text-align: center;">Item Name</th>
      <th style="text-align: center;">Weight (g)</th>
      <th style="text-align: center;">Tunch (%)</th>
      <th style="text-align: center;">Wastage (%)</th>
      <th style="text-align: center;">Wages</th>
      <th style="text-align: center;">Total Fine (g)</th>
      <th style="text-align: center;">Total Amount</th>
      <th style="text-align: center;">Description</th>
      <th style="text-align: center;">Type</th>
    </tr>
  </thead>
  <tbody>
    ${itemBills
      .slice()
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .map(
        (bill) => `
        <tr>
          <td style="text-align: center;">${format(new Date(bill.date), 'dd/MM/yyyy')}</td>
          <td style="text-align: center;">${bill.slip_no}</td>
          <td style="text-align: center;">${bill.item_name}</td>
          <td style="text-align: center;">${bill.weight?.toFixed(2) || 'N/A'}</td>
          <td style="text-align: center;">${bill.tunch?.toFixed(2) || 'N/A'}</td>
          <td style="text-align: center;">${bill.wastage?.toFixed(2) || 'N/A'}</td>
          <td style="text-align: center;">₹${bill.wages?.toFixed(2) || '0.00'}</td>
          <td style="text-align: center;">${bill.total_fine?.toFixed(2) || 'N/A'}</td>
          <td style="text-align: center;">₹${bill.total_amount?.toFixed(2) || '0.00'}</td>
          <td style="text-align: center;">${bill.description || 'N/A'}</td>
          <td style="text-align: center;">${bill.payment_type?.toUpperCase() || 'N/A'}</td>
        </tr>
      `
      )
      .join('')}
  </tbody>
</table>

      `;
    });

    return `
      <div class="header">
        ${generatePDFHeader({ firmSettings, title: "BILL RECEIPT" })}
      </div>
      
      <div class="customer-info">
        <div class="info-section">
          <div class="info-title">Personal Information</div>
          
          <div class="info-item">
            <span class="info-label">Name:</span> ${customer.name}
          </div>
          <div class="info-item">
            <span class="info-label">Mobile:</span> ${customer.mobile}
          </div>
          <div class="info-item">
            <span class="info-label">Address:</span> ${customer.address}
          </div>
        </div>
        
        <div class="info-section">
          <div class="info-title">Account Summary</div>
          <div class="info-item">
            <span class="info-label">Total Bills:</span> ${allBills.length}
          </div>
          <div class="info-item">
            <span class="info-label">Total Amount:</span> ₹${totalNetAmount.toFixed(2)} ${totalNetAmount >= 0 ? '(Credit)' : '(Debit)'}
          </div>
        </div>
      </div>
      
      ${itemTypeSections}
    `;
  };

  const handleCreateCustomer = () => {
    if (!newCustomerName || !newCustomerMobile || !newCustomerAddress) {
      toast({
        title: "Error",
        description: "Please fill in all fields.",
        variant: "destructive",
      });
      return;
    }
    
    createCustomerMutation.mutate({
      name: newCustomerName,
      mobile: newCustomerMobile,
      address: newCustomerAddress,
    });
  };

  const clearDateFilter = () => {
    setFromDate("");
    setToDate("");
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-500">Loading customers...</div>
        </div>
      </div>
    );
  }

  return (
    <>
      <AppSidebar />
      <div className={`transition-all duration-300 ${isOpen ? "ml-64" : "ml-16"}`}>
        <Navbar />
        <div className="h-screen overflow-hidden bg-gray-50 flex flex-col">
          <div className="bg-white border-b border-gray-200 p-4 flex-shrink-0">
             <div className="flex items-center justify-between mb-4">
               <div>
                 <h1 className="text-2xl font-bold text-gray-900">Customer Management</h1>
                 <p className="text-gray-600 text-sm">Comprehensive customer database and relationship management</p>
               </div>
               <div className="flex items-center gap-4">
                 <Button 
                   onClick={() => setIsCreateDialogOpen(true)}
                   className="bg-blue-600 hover:bg-blue-700 text-white"
                 >
                   <Plus className="h-4 w-4 mr-2" />
                   Add Customer
                 </Button>
                 <div className="relative w-80">
                   <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                   <Input
                     placeholder="Search customers by name or mobile..."
                     value={searchTerm}
                     onChange={(e) => setSearchTerm(e.target.value)}
                     className="pl-10 bg-white border-gray-300 focus:border-blue-500"
                   />
                 </div>
               </div>
             </div>
            
            {/* Date Filter Section */}
            <Card className="mb-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Calendar className="h-5 w-5" />
                  Date Filter
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <Label htmlFor="fromDate">From Date</Label>
                    <Input
                      type="date"
                      id="fromDate"
                      value={fromDate}
                      onChange={(e) => setFromDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="toDate">To Date</Label>
                    <Input
                      type="date"
                      id="toDate"
                      value={toDate}
                      onChange={(e) => setToDate(e.target.value)}
                    />
                  </div>
                  <div className="flex items-end">
                    <Button onClick={clearDateFilter} variant="outline" className="w-full">
                      Clear Filter
                    </Button>
                  </div>
                </div>
                {(fromDate || toDate) && (
                  <div className="mt-2 text-sm text-blue-600">
                    Active filter: {fromDate ? format(new Date(fromDate), 'dd/MM/yyyy') : 'All'} to {toDate ? format(new Date(toDate), 'dd/MM/yyyy') : 'All'}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {filteredCustomers.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No customers found</h3>
                <p className="text-gray-500">
                  {(fromDate || toDate) ? 'No customers found for the selected date range' : 'Get started by adding your first customer'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredCustomers
                    .slice() // avoid mutating original array
                    .sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()))
                    .map((customer) => {
                      const customerBills = getCustomerBills(customer.id);

                      const totalFine = customerBills.reduce((sum, bill) => 
                        sum + (bill.payment_type === 'credit' ? bill.total_fine : -bill.total_fine),
                      0);

                      const totalAmount = customerBills.reduce((sum, bill) => 
                        sum + (bill.payment_type === 'credit' ? bill.total_amount : -bill.total_amount),
                      0);

                  return (
                    <Card key={customer.id} className="border border-gray-200 hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 grid grid-cols-3 gap-4 items-center">
                            <div>
                              <div className="font-semibold text-gray-900">{customer.name}</div>
                              <div className="text-sm text-gray-500">CUST-{customer.id.toString().padStart(4, '0')}</div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4 text-blue-600" />
                              <span className="text-gray-700">{customer.mobile}</span>
                            </div>
                            <div className="flex items-start gap-2">
                              <MapPin className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                              <span className="text-gray-700 line-clamp-2">{customer.address}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 ml-4">
                            <div className="text-center">
                              <div className="font-semibold text-gray-900">{customerBills.length}</div>
                              <div className="text-sm text-gray-500">Bills</div>
                            </div>
                            
                            
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="border-blue-300 hover:bg-blue-50 text-blue-700"
                              onClick={() => {
                                setEditingCustomer(customer);
                                setEditDialogOpen(true);
                              }}
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              Edit
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="border-green-300 hover:bg-green-50 text-green-700"
                              onClick={() => downloadCustomerPDF(customer)}
                            >
                              <Download className="h-4 w-4 mr-1" />
                              Download PDF
                            </Button>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="border-gray-300 hover:bg-gray-50"
                                  onClick={() => setSelectedCustomerId(customer.id)}
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  View Profile
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
                                <DialogHeader>
                                  <DialogTitle className="text-2xl font-bold text-gray-900">
                                    Customer Profile - {customer.name}
                                  </DialogTitle>
                                </DialogHeader>
                                {selectedCustomer && (
                                  <div className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                      <Card>
                                        <CardHeader>
                                          <CardTitle className="text-lg">Personal Information</CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-3">
                                          <div>
                                            <label className="text-sm font-medium text-gray-600">Full Name</label>
                                            <p className="text-gray-900 font-semibold">{selectedCustomer.name}</p>
                                          </div>
                                          <div>
                                            <label className="text-sm font-medium text-gray-600">Mobile Number</label>
                                            <p className="text-gray-900">{selectedCustomer.mobile}</p>
                                          </div>
                                          <div>
                                            <label className="text-sm font-medium text-gray-600">Address</label>
                                            <p className="text-gray-900">{selectedCustomer.address}</p>
                                          </div>
                                        </CardContent>
                                      </Card>
                                      
                                      <Card>
                                        <CardHeader>
                                          <CardTitle className="text-lg">Account Summary</CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-3">
                                          <div>
                                            <label className="text-sm font-medium text-gray-600">Total Bills</label>
                                            <p className="text-2xl font-bold text-blue-600">{getCustomerBills(selectedCustomer.id).length}</p>
                                          </div>
                                          
                                          <div>
                                            <label className="text-sm font-medium text-gray-600">Total Remaining Amount</label>
                                            <p className="text-2xl font-bold text-blue-600">
                                              ₹{getCustomerBills(selectedCustomer.id).reduce((sum, bill) => 
                                                sum + (bill.payment_type === 'credit' ? bill.total_amount : -bill.total_amount), 0
                                              ).toFixed(2)} {getCustomerBills(selectedCustomer.id).reduce((sum, bill) => 
                                                sum + (bill.payment_type === 'credit' ? bill.total_amount : -bill.total_amount), 0
                                              ) < 0 ? '(Debit)' : '(Credit)'}
                                            </p>
                                          </div>
                                        </CardContent>
                                      </Card>
                                    </div>
                                    
                                    {/* Bills grouped by item type */}
                                    {Object.entries(groupBillsByItemType(getCustomerBills(selectedCustomer.id))).map(([itemType, itemBills]) => {
                                      const totals = calculateItemTypeTotals(itemBills);
                                      return (
                                        <Card key={itemType}>
                                          <CardHeader>
                                            <CardTitle className="flex items-center gap-2">
                                              <FileText className="h-5 w-5" />
                                              {itemType.toUpperCase()} Bills
                                            </CardTitle>
                                            <div className="text-sm text-gray-600">
                                              Credit: {totals.totalCreditFine.toFixed(2)}g, ₹{totals.totalCreditAmount.toFixed(2)} | 
                                              Debit: {totals.totalDebitFine.toFixed(2)}g, ₹{totals.totalDebitAmount.toFixed(2)} | 
                                              Total: {totals.netFine.toFixed(2)}g {totals.netFine >= 0 ? '(Credit)' : '(Debit)'}
                                            </div>
                                          </CardHeader>
                                          <CardContent>
                                            <div className="overflow-x-auto">
                                              <Table>
                                                <TableHeader>
                                                  <TableRow>
                                                    <TableHead>Date</TableHead>
                                                    <TableHead>Slip No.</TableHead>
                                                    <TableHead>Item Name</TableHead>
                                                    <TableHead>Weight (g)</TableHead>
                                                    <TableHead>Tunch (%)</TableHead>
                                                    <TableHead>Wastage (%)</TableHead>
                                                    <TableHead>Wages</TableHead>
                                                    <TableHead>Total Fine (g)</TableHead>
                                                    <TableHead>Description</TableHead>
                                                    <TableHead>Total Amount</TableHead>
                                                    <TableHead>Type</TableHead>
                                                  </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                  {itemBills.slice(0, 10).map((bill) => (
                                                    <TableRow key={bill.id}>
                                                      <TableCell>{format(new Date(bill.date), 'dd/MM/yyyy')}</TableCell>
                                                      <TableCell className="font-medium">{bill.slip_no}</TableCell>
                                                      <TableCell className="font-medium">{bill.item_name}</TableCell>
                                                      <TableCell>{bill.weight.toFixed(2)}</TableCell>
                                                      <TableCell>{bill.tunch.toFixed(2)}</TableCell>
                                                      <TableCell>{bill.wastage.toFixed(2)}</TableCell>
                                                      <TableCell>₹{bill.wages.toFixed(2)}</TableCell>
                                                      <TableCell>{bill.total_fine.toFixed(2)}</TableCell>
                                                      <TableCell>{bill.description || 'None'}</TableCell>
                                                      <TableCell className="font-semibold text-green-600">₹{bill.total_amount.toFixed(2)}</TableCell>
                                                      <TableCell>
                                                        <Badge 
                                                          variant={bill.payment_type === 'credit' ? 'default' : 'secondary'}
                                                          className={`text-xs ${bill.payment_type === 'credit' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
                                                        >
                                                          {bill.payment_type.toUpperCase()}
                                                        </Badge>
                                                      </TableCell>
                                                    </TableRow>
                                                  ))}
                                                </TableBody>
                                              </Table>
                                            </div>
                                          </CardContent>
                                        </Card>
                                      );
                                    })}
                                  </div>
                                )}
                              </DialogContent>
                            </Dialog>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Create Customer Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Customer</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label htmlFor="customerName">Customer Name</Label>
              <Input
                id="customerName"
                value={newCustomerName}
                onChange={(e) => setNewCustomerName(e.target.value)}
                placeholder="Enter customer name"
              />
            </div>
            <div>
              <Label htmlFor="customerMobile">Mobile Number</Label>
              <Input
                id="customerMobile"
                value={newCustomerMobile}
                onChange={(e) => setNewCustomerMobile(e.target.value)}
                placeholder="Enter mobile number"
              />
            </div>
            <div>
              <Label htmlFor="customerAddress">Address</Label>
              <Input
                id="customerAddress"
                value={newCustomerAddress}
                onChange={(e) => setNewCustomerAddress(e.target.value)}
                placeholder="Enter address"
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateCustomer}
                disabled={createCustomerMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {createCustomerMutation.isPending ? "Creating..." : "Create Customer"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      <EditCustomerDialog 
        customer={editingCustomer}
        isOpen={editDialogOpen}
        onClose={() => {
          setEditDialogOpen(false);
          setEditingCustomer(null);
        }}
      />
    </>  
  );
};

export default CustomersPage;
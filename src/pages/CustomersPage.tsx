import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Search, UserPlus, Phone, MapPin, Users, Eye, FileText, Download, Calendar } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { customerAPI, billAPI } from "@/services/api";
import { format } from "date-fns";
import AppSidebar from "@/components/AppSidebar";
import Navbar from "@/components/Navbar";
import { useSidebar } from "@/components/SidebarProvider";


  


  

const CustomersPage = () => {
  const { isOpen } = useSidebar();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  
  const { data: customers = [], isLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: customerAPI.getAll,
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

  const downloadCustomerPDF = async (customer: any) => {
    try {
      const customerBills = getCustomerBills(customer.id);
      
      // Create PDF content
      const pdfContent = generatePDFContent(customer, customerBills);
      
      // Create and download PDF
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Customer Details - ${customer.name}</title>
              <style>
                @page { 
                  size: landscape; 
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
                table { 
                  width: 100%; 
                  border-collapse: collapse; 
                  margin-top: 20px;
                }
                th, td { 
                  border: 1px solid #ddd; 
                  padding: 8px; 
                  text-align: left;
                  font-size: 10px;
                }
                th { 
                  background-color: #f5f5f5; 
                  font-weight: bold;
                }
                .summary { 
                  margin-top: 20px; 
                  padding: 15px; 
                  background-color: #f9f9f9; 
                  border-radius: 5px;
                }
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

  const generatePDFContent = (customer: any, customerBills: any[]) => {
    const dateRange = fromDate || toDate ? 
      `Date Range: ${fromDate ? format(new Date(fromDate), 'dd/MM/yyyy') : 'All'} to ${toDate ? format(new Date(toDate), 'dd/MM/yyyy') : 'All'}` : 
      'All Records';

    const totalCreditAmount = customerBills.filter(bill => bill.payment_type === 'credit').reduce((sum, bill) => sum + bill.total_amount, 0);
    const totalDebitAmount = customerBills.filter(bill => bill.payment_type === 'debit').reduce((sum, bill) => sum + bill.total_amount, 0);
    const totalCreditFine = customerBills.filter(bill => bill.payment_type === 'credit').reduce((sum, bill) => sum + bill.total_fine, 0);
    const totalDebitFine = customerBills.filter(bill => bill.payment_type === 'debit').reduce((sum, bill) => sum + bill.total_fine, 0);
    const netAmount = totalCreditAmount - totalDebitAmount;
    const netFine = totalCreditFine - totalDebitFine;

    return `
      <div class="header">
        <h1>Customer Details Report</h1>
        <div class="date-filter">${dateRange}</div>
      </div>
      
      <div class="customer-info">
        <div class="info-section">
          <div class="info-title">Personal Information</div>
          <div class="info-item">
            <span class="info-label">Customer ID:</span> CUST-${customer.id.toString().padStart(4, '0')}
          </div>
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
            <span class="info-label">Total Bills:</span> ${customerBills.length}
          </div>
          <div class="info-item">
            <span class="info-label">Net Amount:</span> ₹${netAmount.toFixed(2)}
          </div>
          <div class="info-item">
            <span class="info-label">Net Fine:</span> ${netFine.toFixed(2)}g
          </div>
          <div class="info-item">
            <span class="info-label">Customer Since:</span> ${format(new Date(customer.created_at), 'dd MMM yyyy')}
          </div>
        </div>
      </div>
      
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Slip No.</th>
            <th>Item Name</th>
            <th>Weight (g)</th>
            <th>Tunch (%)</th>
            <th>Wastage (%)</th>
            <th>Wages</th>
            <th>Credit Amount</th>
            <th>Total Fine (g)</th>
            <th>Total Amount</th>
            <th>Description</th>
           
            <th>Type</th>
          </tr>
        </thead>
        <tbody>
          ${customerBills.map(bill => `
            <tr>
              <td>${format(new Date(bill.date), 'dd/MM/yyyy')}</td>
              <td>${bill.slip_no}</td>
              <td>${bill.item_name || bill.item || 'N/A'}</td>
              <td>${bill.weight?.toFixed(2) || 'N/A'}</td>
              <td>${bill.tunch?.toFixed(2) || 'N/A'}</td>
              <td>${bill.wastage?.toFixed(2) || 'N/A'}</td>
              <td>₹${bill.wages?.toFixed(2) || '0.00'}</td>
              <td>₹${bill.silver_amount?.toFixed(2) || '0.00'}</td>
              <td>${bill.total_fine?.toFixed(2) || 'N/A'}</td>
              <td>₹${bill.total_amount?.toFixed(2) || '0.00'}</td>
              <td>${bill.description || 'N/A'}</td>
              
              <td>${bill.payment_type?.toUpperCase() || 'N/A'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      
      <div class="summary">
        <div class="info-title">Summary</div>
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 20px;">
          <div>
            <span class="info-label">Total Amount:</span><br>
            ₹${(totalCreditAmount - totalDebitAmount).toFixed(2)}
          </div>
          
          <div>
            <span class="info-label">Total Fine:</span><br>
            ${(totalCreditFine - totalDebitFine).toFixed(2)}g
          </div>
         
        </div>
      </div>
    `;
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
            {filteredCustomers.map((customer) => (
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
                    <div className="flex items-center gap-2 ml-4">
                      <div className="text-center">
                        <div className="font-semibold text-gray-900">{getCustomerBills(customer.id).length}</div>
                        <div className="text-sm text-gray-500">Bills</div>
                      </div>
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
                                      <label className="text-sm font-medium text-gray-600">Customer Since</label>
                                      <p className="text-gray-900">{format(new Date(selectedCustomer.created_at), 'dd MMM yyyy')}</p>
                                    </div>
                                    <div>
                                      <label className="text-sm font-medium text-gray-600">Last Updated</label>
                                      <p className="text-gray-900">{format(new Date(selectedCustomer.updated_at), 'dd MMM yyyy HH:mm')}</p>
                                    </div>
                                  </CardContent>
                                </Card>
                              </div>
                              
                              <Card>
                                <CardHeader>
                                  <CardTitle className="flex items-center gap-2">
                                    <FileText className="h-5 w-5" />
                                    Bills {(fromDate || toDate) && '(Filtered by Date)'}
                                  </CardTitle>
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
                                          <TableHead>Total Amount</TableHead>
                                          
                                          <TableHead>Type</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {getCustomerBills(selectedCustomer.id).slice(0, 10).map((bill) => (
                                          <TableRow key={bill.id}>
                                            <TableCell>{format(new Date(bill.date), 'dd/MM/yyyy')}</TableCell>
                                            <TableCell className="font-medium">{bill.slip_no}</TableCell>
                                            <TableCell>{bill.item_name || bill.item}</TableCell>
                                            <TableCell>{bill.weight.toFixed(2)}</TableCell>
                                            <TableCell>{bill.tunch.toFixed(2)}</TableCell>
                                            <TableCell>{bill.wastage.toFixed(2)}</TableCell>
                                            <TableCell>₹{bill.wages.toFixed(2)}</TableCell>
                                            <TableCell>{(bill.weight * ((bill.tunch + bill.wastage) / 100)).toFixed(2)}</TableCell>
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
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
    </div>
     </>  
  );
};

export default CustomersPage;

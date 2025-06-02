
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChevronDown, ChevronUp, Clock, Users, TrendingUp, TrendingDown, Eye, Printer } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { customerAPI, billAPI } from "@/services/api";
import { format } from "date-fns";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const PendingListPage = () => {
  const [expandedCustomers, setExpandedCustomers] = useState<Set<number>>(new Set());
  const [selectedBill, setSelectedBill] = useState<any>(null);
  const [showBillDialog, setShowBillDialog] = useState(false);

  const { data: pendingCustomers = [], isLoading } = useQuery({
    queryKey: ['customers', 'pending'],
    queryFn: customerAPI.getPending,
  });

  const toggleCustomerExpansion = (customerId: number) => {
    const newExpanded = new Set(expandedCustomers);
    if (newExpanded.has(customerId)) {
      newExpanded.delete(customerId);
    } else {
      newExpanded.add(customerId);
    }
    setExpandedCustomers(newExpanded);
  };

  const { data: customerBills = {} } = useQuery({
    queryKey: ['customer-bills', Array.from(expandedCustomers)],
    queryFn: async () => {
      const billsData: { [key: number]: any[] } = {};
      for (const customerId of expandedCustomers) {
        billsData[customerId] = await customerAPI.getBills(customerId);
      }
      return billsData;
    },
    enabled: expandedCustomers.size > 0,
  });

  const handleBillDetails = async (billId: number) => {
    try {
      const billDetails = await billAPI.getById(billId);
      setSelectedBill(billDetails);
      setShowBillDialog(true);
    } catch (error) {
      console.error('Error fetching bill details:', error);
    }
  };

  const handlePrintBill = (bill: any) => {
    const totalWages = (bill.wages || 0) * (bill.weight || 0);
    const printContent = `
      <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
        <h2 style="text-align: center; margin-bottom: 30px;">Bill Details</h2>
        <div style="border: 1px solid #ccc; padding: 20px; border-radius: 8px;">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
            <div>
              <strong>Bill Number:</strong> ${bill.bill_number || 'N/A'}<br>
              <strong>Customer:</strong> ${bill.customer_name}<br>
              <strong>Item:</strong> ${bill.item}<br>
              <strong>Payment Type:</strong> ${bill.payment_type.toUpperCase()}
            </div>
            <div>
              <strong>Weight:</strong> ${bill.weight || 'N/A'} gm<br>
              <strong>Tunch:</strong> ${bill.tunch || 'N/A'}%<br>
              <strong>Wastage:</strong> ${bill.wastage || 'N/A'}%<br>
              <strong>Wages:</strong> ₹${bill.wages || 'N/A'}/gm
            </div>
          </div>
          <div style="margin-bottom: 20px;">
            <strong>Total Fine:</strong> ${bill.total_fine || 'N/A'} gm<br>
            <strong>Total Wages:</strong> ₹${totalWages.toFixed(2)}<br>
            <strong>Total Amount:</strong> ₹${bill.total_amount.toLocaleString()}
            ${bill.silver_amount ? `<br><strong>Silver Amount:</strong> ₹${bill.silver_amount.toLocaleString()}` : ''}
          </div>
          <div style="text-align: right;">
            <strong>Date:</strong> ${format(new Date(bill.date), 'dd/MM/yyyy')}
          </div>
        </div>
      </div>
    `;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading pending customers...</div>
      </div>
    );
  }

  return (
    <div className="h-screen overflow-hidden bg-gray-50 flex flex-col">
      <div className="bg-white border-b border-gray-200 p-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Pending List</h1>
            <p className="text-gray-600 text-sm">Customers with outstanding balances</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{pendingCustomers.length}</div>
              <div className="text-sm text-gray-500">Pending Customers</div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {pendingCustomers.length === 0 ? (
          <div className="text-center py-12">
            <Clock className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No pending customers</h3>
            <p className="text-gray-500">All customers have settled their accounts</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingCustomers.map((customer) => (
              <Card key={customer.customer_id} className="border border-gray-200">
                <Collapsible>
                  <CollapsibleTrigger asChild>
                    <CardContent className="p-4 cursor-pointer hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 grid grid-cols-6 gap-4 items-center">
                          <div>
                            <div className="font-semibold text-gray-900">{customer.customer_name}</div>
                            <div className="text-sm text-gray-500">{customer.customer_mobile}</div>
                          </div>
                          <div className="text-sm text-gray-700">{customer.customer_address}</div>
                          <div className="text-center">
                            <div className={`font-bold ${customer.pending_fine >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {customer.pending_fine.toFixed(4)}g
                            </div>
                            <div className="text-xs text-gray-500">Pending Fine</div>
                          </div>
                          <div className="text-center">
                            <div className={`font-bold ${customer.pending_amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              ₹{Math.abs(customer.pending_amount).toLocaleString()}
                            </div>
                            <div className="text-xs text-gray-500">Pending Amount</div>
                          </div>
                          <div className="text-center">
                            <Badge 
                              variant={customer.pending_amount >= 0 ? 'default' : 'destructive'}
                              className={customer.pending_amount >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}
                            >
                              {customer.pending_amount >= 0 ? 'CREDIT' : 'DEBIT'}
                            </Badge>
                          </div>
                          <div className="flex justify-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleCustomerExpansion(customer.customer_id)}
                              className="p-2"
                            >
                              {expandedCustomers.has(customer.customer_id) ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    {expandedCustomers.has(customer.customer_id) && (
                      <div className="border-t border-gray-200 p-4 bg-gray-50">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          <div>
                            <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                              <TrendingUp className="h-4 w-4 text-green-600" />
                              Credit Bills (Total: {customer.total_credit_fine.toFixed(4)}g, ₹{customer.total_credit_amount.toLocaleString()})
                            </h4>
                            <div className="space-y-2 max-h-40 overflow-y-auto">
                              {customerBills[customer.customer_id]?.filter(bill => bill.payment_type === 'credit').map((bill) => (
                                <div key={bill.id} className="p-2 bg-green-50 rounded border border-green-200">
                                  <div className="flex justify-between items-center">
                                    <div>
                                      <div className="font-medium text-sm">Bill #{bill.bill_number} - {bill.item}</div>
                                      <div className="text-xs text-gray-600">{format(new Date(bill.date), 'dd/MM/yyyy')}</div>
                                      <div className="text-xs text-gray-600">
                                        Weight: {bill.weight}g | Tunch: {bill.tunch}% | Wages: ₹{bill.wages}/g
                                      </div>
                                      {bill.silver_amount && (
                                        <div className="text-xs text-blue-600">Silver: ₹{bill.silver_amount.toLocaleString()}</div>
                                      )}
                                    </div>
                                    <div className="text-right">
                                      <div className="text-sm font-semibold text-green-700">{bill.total_fine.toFixed(4)}g</div>
                                      <div className="text-sm text-green-600">₹{bill.total_amount.toFixed(2)}</div>
                                      <div className="flex gap-1 mt-1">
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => handleBillDetails(bill.id)}
                                          className="text-xs px-2 py-1"
                                        >
                                          <Eye className="h-3 w-3" />
                                        </Button>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => handlePrintBill(bill)}
                                          className="text-xs px-2 py-1"
                                        >
                                          <Printer className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                          
                          <div>
                            <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                              <TrendingDown className="h-4 w-4 text-red-600" />
                              Debit Bills (Total: {customer.total_debit_fine.toFixed(4)}g, ₹{customer.total_debit_amount.toLocaleString()})
                            </h4>
                            <div className="space-y-2 max-h-40 overflow-y-auto">
                              {customerBills[customer.customer_id]?.filter(bill => bill.payment_type === 'debit').map((bill) => (
                                <div key={bill.id} className="p-2 bg-red-50 rounded border border-red-200">
                                  <div className="flex justify-between items-center">
                                    <div>
                                      <div className="font-medium text-sm">Bill #{bill.bill_number} - {bill.item}</div>
                                      <div className="text-xs text-gray-600">{format(new Date(bill.date), 'dd/MM/yyyy')}</div>
                                      <div className="text-xs text-gray-600">
                                        Weight: {bill.weight}g | Tunch: {bill.tunch}% | Wages: ₹{bill.wages}/g
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <div className="text-sm font-semibold text-red-700">{bill.total_fine.toFixed(4)}g</div>
                                      <div className="text-sm text-red-600">₹{bill.total_amount.toFixed(2)}</div>
                                      <div className="flex gap-1 mt-1">
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => handleBillDetails(bill.id)}
                                          className="text-xs px-2 py-1"
                                        >
                                          <Eye className="h-3 w-3" />
                                        </Button>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => handlePrintBill(bill)}
                                          className="text-xs px-2 py-1"
                                        >
                                          <Printer className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={showBillDialog} onOpenChange={setShowBillDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-gray-900 flex items-center justify-between">
              Bill Details - {selectedBill?.bill_number || 'N/A'}
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => selectedBill && handlePrintBill(selectedBill)}
                className="ml-4"
              >
                <Printer className="h-4 w-4 mr-1" />
                Print
              </Button>
            </DialogTitle>
          </DialogHeader>
          {selectedBill && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Bill Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Bill Number</label>
                      <p className="text-gray-900">{selectedBill.bill_number || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Customer Name</label>
                      <p className="text-gray-900 font-medium">{selectedBill.customer_name}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Item</label>
                      <p className="text-gray-900">{selectedBill.item}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Payment Type</label>
                      <div>
                        <Badge 
                          variant={selectedBill.payment_type === 'credit' ? 'default' : 'secondary'}
                          className={selectedBill.payment_type === 'credit' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}
                        >
                          {selectedBill.payment_type.toUpperCase()}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Weight & Quality Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Weight</label>
                      <p className="text-gray-900">{selectedBill.weight} gm</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Tunch</label>
                      <p className="text-gray-900">{selectedBill.tunch}%</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Wastage</label>
                      <p className="text-gray-900">{selectedBill.wastage}%</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Total Fine</label>
                      <p className="text-gray-900">{selectedBill.total_fine} gm</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Financial Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Wages (per gram)</label>
                      <p className="text-gray-900">₹{selectedBill.wages}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Total Wages</label>
                      <p className="text-gray-900">₹{((selectedBill.wages || 0) * (selectedBill.weight || 0)).toFixed(2)}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Total Amount</label>
                      <p className="text-2xl font-bold text-blue-600">₹{selectedBill.total_amount.toLocaleString()}</p>
                    </div>
                  </div>
                  {selectedBill.silver_amount && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">Silver Amount</label>
                      <p className="text-xl font-bold text-gray-600">₹{selectedBill.silver_amount.toLocaleString()}</p>
                    </div>
                  )}
                  <div>
                    <label className="text-sm font-medium text-gray-600">Date</label>
                    <p className="text-gray-900">{format(new Date(selectedBill.date), 'dd/MM/yyyy HH:mm')}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PendingListPage;

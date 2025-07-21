import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, Clock, Users, TrendingUp, TrendingDown, Download } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { customerAPI, settingsAPI } from "@/services/api";
import { format } from "date-fns";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import AppSidebar from "@/components/AppSidebar";
import { useSidebar } from "@/components/SidebarProvider";
import Navbar from "@/components/Navbar";

const PendingListPage = () => {
  const { isOpen } = useSidebar();
  const [expandedCustomers, setExpandedCustomers] = useState<Set<number>>(new Set());

  const { data: pendingCustomers = [], isLoading } = useQuery({
    queryKey: ['customers', 'pending'],
    queryFn: customerAPI.getPendingList,
  });

  const { data: firmSettings } = useQuery({
    queryKey: ['firmSettings'],
    queryFn: settingsAPI.getFirmSettings,
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
        billsData[customerId] = await customerAPI.getCustomerBills(customerId);
      }
      return billsData;
    },
    enabled: expandedCustomers.size > 0,
  });

  const groupBillsByItemType = (bills: any[]) => {
    const grouped: Record<string, any[]> = {};
    bills.forEach(bill => {
      const itemType = bill.item || 'Other';
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
    
    return {
      totalCreditFine,
      totalDebitFine,
      netFine,
      creditBills,
      debitBills
    };
  };

  const handleDownloadPDF = () => {
    const printContent = `
      <html>
        <head>
          <title>Pending List Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
            .logo { max-height: 60px; margin-bottom: 10px; }
            .customer-section { margin-bottom: 30px; border: 1px solid #ddd; padding: 15px; }
            .customer-header { background-color: #f5f5f5; padding: 10px; margin-bottom: 15px; font-weight: bold; }
            .item-type-header { background-color: #e8f4fd; padding: 8px; margin: 10px 0; font-weight: bold; }
            .item-totals { background-color: #f9f9f9; padding: 8px; margin-bottom: 10px; }
            .table { width: 100%; border-collapse: collapse; margin: 10px 0; }
            .table th, .table td { border: 1px solid #000; padding: 6px; text-align: left; font-size: 10px; }
            .table th { background-color: #f0f0f0; font-weight: bold; }
            .banking-info { margin: 20px 0; }
            @media print { body { margin: 0; } }
          </style>
        </head>
        <body>
          <div class="header">
            ${firmSettings?.logo_path ? `<img src="${firmSettings.logo_path}" alt="Logo" class="logo" style="display: block; margin: 0 auto;" />` : ''}
            <h1>${firmSettings?.firm_name || 'Metalic Jewelers'}</h1>
            <p>${firmSettings?.address || ''}</p>
            <p>GST No: ${firmSettings?.gst_number || ''}</p>
          </div>
          
          <div class="banking-info">
            <h3>Banking Details</h3>
            <p><strong>Account Number:</strong> ${firmSettings?.account_number || 'N/A'}</p>
            <p><strong>Account Holder:</strong> ${firmSettings?.account_holder_name || 'N/A'}</p>
            <p><strong>IFSC Code:</strong> ${firmSettings?.ifsc_code || 'N/A'}</p>
            <p><strong>Branch:</strong> ${firmSettings?.branch_address || 'N/A'}</p>
            <p><strong>City:</strong> ${firmSettings?.city || 'N/A'}</p>
          </div>

          <h2>Pending Customers List</h2>
          ${pendingCustomers.map((customer: any) => {
            const bills = customer.bills || [];
            const groupedBills = groupBillsByItemType(bills);
            
            let customerContent = `
              <div class="customer-section">
                <div class="customer-header">
                  ${customer.customer_name} | ${customer.customer_mobile} | ${customer.customer_address}
                </div>
            `;
            
            Object.entries(groupedBills).forEach(([itemType, itemBills]: [string, any[]]) => {
              const totals = calculateItemTypeTotals(itemBills);
              
              customerContent += `
                <div class="item-type-header">${itemType.toUpperCase()}</div>
                <div class="item-totals">
                  <strong>Credit:</strong> ${totals.totalCreditFine.toFixed(2)}g | 
                  <strong>Debit:</strong> ${totals.totalDebitFine.toFixed(2)}g | 
                  <strong>Net ${itemType}:</strong> ${totals.netFine.toFixed(2)}g ${totals.netFine >= 0 ? '(Credit)' : '(Debit)'}
                </div>
                <table class="table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Slip No.</th>
                      <th>Weight (g)</th>
                      <th>Fine (g)</th>
                      <th>Amount (₹)</th>
                      <th>Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${itemBills.map((bill: any) => `
                      <tr>
                        <td>${format(new Date(bill.date), 'dd/MM/yyyy')}</td>
                        <td>${bill.slip_no}</td>
                        <td>${bill.weight?.toFixed(2) || 'N/A'}</td>
                        <td>${bill.total_fine?.toFixed(2) || 'N/A'}${(bill.total_fine || 0) < 0 ? ' (Debit)' : ' (Credit)'}</td>
                        <td>₹${bill.total_amount?.toFixed(2) || '0.00'}${(bill.total_amount || 0) < 0 ? ' (Debit)' : ' (Credit)'}</td>
                        <td>${bill.payment_type?.toUpperCase() || 'N/A'}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              `;
            });
            
            customerContent += '</div>';
            return customerContent;
          }).join('')}
          
          <div style="margin-top: 30px; text-align: center;">
            <p><strong>Generated on:</strong> ${new Date().toLocaleDateString()}</p>
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
            <div className="text-gray-500">Loading pending customers...</div>
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
        <div className="h-screen overflow-hidden bg-gray-50 flex flex-col">
          <div className="bg-white border-b border-gray-200 p-4 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Pending List</h1>
                <p className="text-gray-600 text-sm">Customers with outstanding balances</p>
              </div>
              <div className="flex items-center gap-4">
                <Button onClick={handleDownloadPDF} className="flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  Download PDF
                </Button>
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
                {pendingCustomers.map((customer: any) => (
                  <Card key={customer.customer_id}>
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
                                <div className={`font-bold ${customer.remaining_fine >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {customer.remaining_fine.toFixed(2)}g
                                </div>
                                <div className="text-xs text-gray-500">Remaining Fine</div>
                              </div>
                              <div className="text-center">
                                <div className={`font-bold ${customer.remaining_amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  ₹{Math.abs(customer.remaining_amount).toLocaleString()}
                                </div>
                                <div className="text-xs text-gray-500">Remaining Amount</div>
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
                            {customerBills[customer.customer_id] && (
                              <>
                                {Object.entries(groupBillsByItemType(customerBills[customer.customer_id])).map(([itemType, itemBills]: [string, any[]]) => {
                                  const totals = calculateItemTypeTotals(itemBills);
                                  
                                  return (
                                    <div key={itemType} className="mb-6">
                                      <h4 className="font-semibold text-gray-800 mb-3 bg-blue-50 p-2 rounded">
                                        {itemType.toUpperCase()} - Net: {totals.netFine.toFixed(2)}g {totals.netFine >= 0 ? '(Credit)' : '(Debit)'}
                                      </h4>
                                      
                                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                        <div>
                                          <h5 className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                            <TrendingUp className="h-4 w-4 text-green-600" />
                                            Credit Bills ({totals.totalCreditFine.toFixed(2)}g)
                                          </h5>
                                          <div className="space-y-2 max-h-40 overflow-y-auto">
                                            {totals.creditBills.map((bill: any) => (
                                              <div key={bill.id} className="p-2 bg-green-50 rounded border border-green-200">
                                                <div className="flex justify-between items-center">
                                                  <div>
                                                    <div className="font-medium text-sm">Bill #{bill.slip_no}</div>
                                                    <div className="text-xs text-gray-600">{format(new Date(bill.date), 'dd/MM/yyyy')}</div>
                                                  </div>
                                                  <div className="text-right">
                                                    <div className="text-sm font-semibold text-green-700">{bill.total_fine.toFixed(2)}g</div>
                                                    <div className="text-sm text-green-600">₹{bill.total_amount.toFixed(2)}</div>
                                                  </div>
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        </div>

                                        <div>
                                          <h5 className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                            <TrendingDown className="h-4 w-4 text-red-600" />
                                            Debit Bills ({totals.totalDebitFine.toFixed(2)}g)
                                          </h5>
                                          <div className="space-y-2 max-h-40 overflow-y-auto">
                                            {totals.debitBills.map((bill: any) => (
                                              <div key={bill.id} className="p-2 bg-red-50 rounded border border-red-200">
                                                <div className="flex justify-between items-center">
                                                  <div>
                                                    <div className="font-medium text-sm">Bill #{bill.slip_no}</div>
                                                    <div className="text-xs text-gray-600">{format(new Date(bill.date), 'dd/MM/yyyy')}</div>
                                                  </div>
                                                  <div className="text-right">
                                                    <div className="text-sm font-semibold text-red-700">{bill.total_fine.toFixed(2)}g</div>
                                                    <div className="text-sm text-red-600">₹{bill.total_amount.toFixed(2)}</div>
                                                  </div>
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </>
                            )}
                          </div>
                        )}
                      </CollapsibleContent>
                    </Collapsible>
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

export default PendingListPage;
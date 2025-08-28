import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Clock, Download, TrendingUp, TrendingDown } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { customerAPI, settingsAPI } from "@/services/api";
import { format } from "date-fns";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import AppSidebar from "@/components/AppSidebar";
import { useSidebar } from "@/components/SidebarProvider";
import Navbar from "@/components/Navbar";
import { Input } from "@/components/ui/input";
import PDFPreviewModal from "@/components/PDFPreviewModal";

const PendingListPage = () => {
  const { isOpen } = useSidebar();
  const [expandedCustomers, setExpandedCustomers] = useState<Set<number>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [isPDFPreviewOpen, setIsPDFPreviewOpen] = useState(false);
  const [pdfContent, setPdfContent] = useState("");

  const { data: pendingCustomers = [], isLoading } = useQuery({
    queryKey: ["customers", "pending"],
    queryFn: customerAPI.getPendingList,
  });

  const { data: firmSettings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsAPI.getFirmSettings(),
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
    queryKey: ["customer-bills", Array.from(expandedCustomers)],
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
    bills.forEach((bill) => {
      const itemType = bill.item || "Other";
      if (!grouped[itemType]) {
        grouped[itemType] = [];
      }
      grouped[itemType].push(bill);
    });
    return grouped;
  };

  const calculateItemTypeTotals = (itemBills: any[]) => {
    const creditBills = itemBills.filter((bill) => bill.payment_type === "credit");
    const debitBills = itemBills.filter((bill) => bill.payment_type === "debit");

    const totalCreditFine = creditBills.reduce((sum, bill) => sum + bill.total_fine, 0);
    const totalDebitFine = debitBills.reduce((sum, bill) => sum + bill.total_fine, 0);

    const netFine = totalCreditFine - totalDebitFine;

    return {
      totalCreditFine,
      totalDebitFine,
      netFine,
      creditBills,
      debitBills,
    };
  };

  // ✅ Filtering + Alphabetical Sorting
  const filteredCustomers = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return pendingCustomers
      .filter(
        (customer: any) =>
          customer.customer_name.toLowerCase().includes(term) ||
          customer.customer_mobile.toLowerCase().includes(term) ||
          customer.customer_address.toLowerCase().includes(term)
      )
      .sort((a: any, b: any) => a.customer_name.localeCompare(b.customer_name, "en", { sensitivity: "base" }));
  }, [searchTerm, pendingCustomers]);

  const generatePDFContent = () => {
    return `
     <html>
        <head>
          <title>Pending List Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; font-size: 12px; }
            .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
            .firm-info { margin-bottom: 10px; }
            .table { width: 100%; border-collapse: collapse; margin: 10px 0; }
            .table th, .table td { border: 1px solid #000; padding: 6px; text-align: center; font-size: 10px; }
            .table th { background-color: #f0f0f0; font-weight: bold; }
            .customer-name { text-align: left !important; }
            .address { text-align: left !important; max-width: 120px; word-wrap: break-word; }
            @media print { body { margin: 0; } }
          </style>
        </head>
        <body>
          <div class="header">
             <div class="firm-info">
               <h1>${firmSettings?.firm_name }</h1>
               <p>${firmSettings?.address }</p>
                <p>Mobile: ${firmSettings?.mobile}</p>
                <p>GST: ${firmSettings?.gst_number } | Email: ${firmSettings?.email }</p>
                <p><strong>Bank Details:</strong> ${firmSettings?.account_holder_name } | A/c: ${firmSettings?.account_number } | IFSC: ${firmSettings?.ifsc_code }</p>
             </div>
           </div>

          <h2 style="text-align: center;">Pending Customers List</h2>
          
           <table class="table">
             <thead>
               <tr>
                 <th>Customer Name</th>
                 <th>Mobile Number</th>
                 <th>Address</th>
                 <th>Remaining Amount (₹)</th>
                 
                 ${Array.from(new Set(pendingCustomers.flatMap(c => Object.keys(c.stock_balances || {})))).map(stock => 
                   `<th>${stock} Balance (${(stock as string).substring(0, 2).toUpperCase()})</th>`
                 ).join('')}
               </tr>
             </thead>
            <tbody>
                ${pendingCustomers
          .slice() // avoid mutating original
          .sort((a, b) => a.customer_name.localeCompare(b.customer_name)) // ✅ alphabetical order
          .map((customer) => {
                const stockItems = Array.from(new Set(pendingCustomers.flatMap(c => Object.keys(c.stock_balances || {}))));
                return `
                  <tr>
                     <td class="customer-name">${customer.customer_name}</td>
                     <td>${customer.customer_mobile}</td>
                     <td class="address">${customer.customer_address}</td>
                     <td>₹${customer.remaining_amount.toFixed(2)}${customer.remaining_amount >= 0 ? "(Credit)" : "(Debit)"}</td>
                    
                      ${stockItems.map((stock: string) => 
                        `<td>${(customer.stock_balances?.[stock] || 0).toFixed(2)}g${(customer.stock_balances?.[stock] || 0) >= 0 ? "(Credit)" : "(Debit)"}<br><small style="color:#666;">${stock.substring(0, 2).toUpperCase()}</small></td>`
                      ).join('')}
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
          
          <div style="margin-top: 30px; text-align: center;">
            <p><strong>Generated on:</strong> ${new Date().toLocaleDateString()}</p>
          </div>
        </body>
      </html>
    `;
  };

  const handlePreviewPDF = () => {
    if (filteredCustomers.length === 0) {
      alert("No pending customers data to export");
      return;
    }
    const content = generatePDFContent();
    setPdfContent(content);
    setIsPDFPreviewOpen(true);
  };

  const handlePrintPDF = () => {
    if ((window as any).printingInProgress) {
      return;
    }
    
    (window as any).printingInProgress = true;
    const content = generatePDFContent();
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(content);
      printWindow.document.close();
      printWindow.onbeforeunload = () => {
        (window as any).printingInProgress = false;
      };
      
      // Auto-reset flag after timeout as backup
      setTimeout(() => {
        (window as any).printingInProgress = false;
      }, 5000);
    } else {
      (window as any).printingInProgress = false;
    }
  };

  const handleDownloadPDF = () => {
    handlePrintPDF();
    setIsPDFPreviewOpen(false);
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
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Pending List</h1>
                <p className="text-gray-600 text-sm">Customers with outstanding balances</p>
              </div>
              <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
                <Input
                  placeholder="Search by name, mobile, or address"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="md:w-64 w-full"
                />
                <Button onClick={handlePreviewPDF} className="flex items-center gap-2 whitespace-nowrap">
                  <Download className="h-4 w-4" />
                  Download PDF
                </Button>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">{filteredCustomers.length}</div>
                  <div className="text-sm text-gray-500">Pending Customers</div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {filteredCustomers.length === 0 ? (
              <div className="text-center py-12">
                <Clock className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No matching customers</h3>
                <p className="text-gray-500">Try adjusting your search keyword</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredCustomers.map((customer: any) => (
                  <Card key={customer.customer_id}>
                    <Collapsible>
                      <CollapsibleTrigger asChild>
                        <CardContent className="p-4 cursor-pointer hover:bg-gray-50">
                          <div className="flex items-center justify-between">
                            <div className="flex-1 grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                              {/* Customer Info */}
                              <div>
                                <div className="font-semibold text-gray-900">{customer.customer_name}</div>
                                <div className="text-sm text-gray-500">{customer.customer_mobile}</div>
                              </div>

                              {/* Address */}
                              <div className="text-sm text-gray-700 break-words">{customer.customer_address}</div>

                              {/* Remaining Amount */}
                              <div className="text-center">
                                <div
                                  className={`font-bold ${
                                    customer.remaining_amount >= 0 ? "text-green-600" : "text-red-600"
                                  }`}
                                >
                                  ₹{Math.abs(customer.remaining_amount).toLocaleString()}
                                </div>
                                <div className="text-xs text-gray-500">Remaining Amount</div>
                              </div>

                              {/* Stock Balances (fixed layout) */}
                              <div className="flex flex-wrap gap-4 justify-center">
                                {customer.stock_balances &&
                                  Object.entries(customer.stock_balances).map(([stock, balance]) => (
                                    <div key={stock} className="text-xs text-center min-w-[60px]">
                                      <div
                                        className={`font-bold ${
                                          (balance as number) >= 0 ? "text-green-600" : "text-red-600"
                                        }`}
                                      >
                                        {(balance as number).toFixed(2)}g
                                      </div>
                                      <div className="text-xs text-gray-400">
                                        {stock.substring(0, 2).toUpperCase()}
                                      </div>
                                    </div>
                                  ))}
                              </div>

                              {/* Expand/Collapse Button */}
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
                                {Object.entries(
                                  groupBillsByItemType(customerBills[customer.customer_id])
                                ).map(([itemType, itemBills]: [string, any[]]) => {
                                  const totals = calculateItemTypeTotals(itemBills);
                                  return (
                                    <div key={itemType} className="mb-6">
                                      <h4 className="font-semibold text-gray-800 mb-3 bg-blue-50 p-2 rounded">
                                        {itemType.toUpperCase()} - Net: {totals.netFine.toFixed(2)}g{" "}
                                        {totals.netFine >= 0 ? "(Credit)" : "(Debit)"}
                                      </h4>

                                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                        <div>
                                          <h5 className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                            <TrendingUp className="h-4 w-4 text-green-600" />
                                            Credit Bills ({totals.totalCreditFine.toFixed(2)}g)
                                          </h5>
                                          <div className="space-y-2 max-h-40 overflow-y-auto">
                                            {totals.creditBills.map((bill: any) => (
                                              <div
                                                key={bill.id}
                                                className="p-2 bg-green-50 rounded border border-green-200"
                                              >
                                                <div className="flex justify-between items-center">
                                                  <div>
                                                    <div className="font-medium text-sm">
                                                      Bill #{bill.slip_no}
                                                    </div>
                                                    <div className="text-xs text-gray-600">
                                                      {format(new Date(bill.date), "dd/MM/yyyy")}
                                                    </div>
                                                  </div>
                                                  <div className="text-right">
                                                    <div className="text-sm font-semibold text-green-700">
                                                      {bill.total_fine.toFixed(2)}g
                                                    </div>
                                                    <div className="text-sm text-green-600">
                                                      ₹{bill.total_amount.toFixed(2)}
                                                    </div>
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
                                              <div
                                                key={bill.id}
                                                className="p-2 bg-red-50 rounded border border-red-200"
                                              >
                                                <div className="flex justify-between items-center">
                                                  <div>
                                                    <div className="font-medium text-sm">
                                                      Bill #{bill.slip_no}
                                                    </div>
                                                    <div className="text-xs text-gray-600">
                                                      {format(new Date(bill.date), "dd/MM/yyyy")}
                                                    </div>
                                                  </div>
                                                  <div className="text-right">
                                                    <div className="text-sm font-semibold text-red-700">
                                                      {bill.total_fine.toFixed(2)}g
                                                    </div>
                                                    <div className="text-sm text-red-600">
                                                      ₹{bill.total_amount.toFixed(2)}
                                                    </div>
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

      <PDFPreviewModal
        isOpen={isPDFPreviewOpen}
        onOpenChange={setIsPDFPreviewOpen}
        title="Pending List Report"
        content={pdfContent}
        onDownload={handleDownloadPDF}
        onPrint={handlePrintPDF}
      />
    </>
  );
};

export default PendingListPage;

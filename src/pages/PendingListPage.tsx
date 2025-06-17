
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, Clock, Users, TrendingUp, TrendingDown } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { customerAPI } from "@/services/api";
import { format } from "date-fns";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const PendingListPage = () => {
  const [expandedCustomers, setExpandedCustomers] = useState<Set<number>>(new Set());

  const { data: pendingCustomers = [], isLoading } = useQuery({
    queryKey: ['customers', 'pending'],
    queryFn: customerAPI.getPendingList,
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
                          <div className="text-center">
                            <Badge
                              variant={customer.remaining_amount >= 0 ? 'default' : 'destructive'}
                              className={customer.remaining_amount >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}
                            >
                              {customer.remaining_amount >= 0 ? 'CREDIT' : 'DEBIT'}
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
                              Credit Bills (Total: {customer.total_credit_fine.toFixed(2)}g, ₹{customer.total_credit_amount.toLocaleString()})
                            </h4>
                            <div className="space-y-2 max-h-40 overflow-y-auto">
                              {customerBills[customer.customer_id]?.filter((bill: any) => bill.payment_type === 'credit').map((bill: any) => (
                                <div key={bill.id} className="p-2 bg-green-50 rounded border border-green-200">
                                  <div className="flex justify-between items-center">
                                    <div>
                                      <div className="font-medium text-sm">Bill #{bill.bill_number} - {bill.item_name}</div>
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
                            <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                              <TrendingDown className="h-4 w-4 text-red-600" />
                              Debit Bills (Total: {customer.total_debit_fine.toFixed(4)}g, ₹{customer.total_debit_amount.toLocaleString()})
                            </h4>
                            <div className="space-y-2 max-h-40 overflow-y-auto">
                              {customerBills[customer.customer_id]?.filter((bill: any) => bill.payment_type === 'debit').map((bill: any) => (
                                <div key={bill.id} className="p-2 bg-red-50 rounded border border-red-200">
                                  <div className="flex justify-between items-center">
                                    <div>
                                      <div className="font-medium text-sm">Bill #{bill.bill_number} - {bill.item_name}</div>
                                      <div className="text-xs text-gray-600">{format(new Date(bill.date), 'dd/MM/yyyy')}</div>
                                    </div>
                                    <div className="text-right">
                                      <div className="text-sm font-semibold text-red-700">{bill.total_fine.toFixed(4)}g</div>
                                      <div className="text-sm text-red-600">₹{bill.total_amount.toFixed(2)}</div>
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
    </div>
  );
};

export default PendingListPage;

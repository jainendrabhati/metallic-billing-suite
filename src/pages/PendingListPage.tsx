
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Search, Users, Scale, TrendingUp, ChevronDown, ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { customerAPI } from "@/services/api";

const PendingListPage = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedCustomer, setExpandedCustomer] = useState<number | null>(null);

  const { data: pendingCustomers = [], isLoading } = useQuery({
    queryKey: ['pendingCustomers'],
    queryFn: customerAPI.getPendingList,
  });

  const { data: customerBills } = useQuery({
    queryKey: ['customerBills', expandedCustomer],
    queryFn: () => expandedCustomer ? customerAPI.getCustomerBills(expandedCustomer) : Promise.resolve([]),
    enabled: !!expandedCustomer,
  });

  const filteredPendingCustomers = pendingCustomers.filter(customer =>
    customer.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.customer_mobile.includes(searchTerm)
  );

  const totalPendingFine = pendingCustomers.reduce((sum, customer) => sum + customer.pending_fine, 0);
  const totalPendingAmount = pendingCustomers.reduce((sum, customer) => sum + customer.pending_amount, 0);

  const toggleExpanded = (customerId: number) => {
    setExpandedCustomer(expandedCustomer === customerId ? null : customerId);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-500">Loading pending list...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Pending List</h1>
          <p className="text-gray-600">Track outstanding customer balances and fine weights</p>
        </div>
        <div className="relative w-80">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by customer name or mobile..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredPendingCustomers.length}</div>
            <p className="text-xs text-muted-foreground">
              Customers with pending balances
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pending Fine</CardTitle>
            <Scale className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPendingFine.toFixed(4)}g</div>
            <p className="text-xs text-muted-foreground">
              Total fine weight pending
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pending Amount</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{totalPendingAmount.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Total amount pending
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Pending List Table */}
      <Card>
        <CardHeader>
          <CardTitle>Customer Pending List</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredPendingCustomers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No pending customers found</h3>
              <p className="text-gray-500">All customers have cleared their balances</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead></TableHead>
                    <TableHead>Customer Name</TableHead>
                    <TableHead>Mobile</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Pending Fine (g)</TableHead>
                    <TableHead>Pending Amount</TableHead>
                    <TableHead>Credit Fine (g)</TableHead>
                    <TableHead>Credit Amount</TableHead>
                    <TableHead>Debit Fine (g)</TableHead>
                    <TableHead>Debit Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPendingCustomers.map((customer) => (
                    <Collapsible
                      key={customer.customer_id}
                      open={expandedCustomer === customer.customer_id}
                      onOpenChange={() => toggleExpanded(customer.customer_id)}
                    >
                      <CollapsibleTrigger asChild>
                        <TableRow className="cursor-pointer hover:bg-gray-50">
                          <TableCell>
                            {expandedCustomer === customer.customer_id ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </TableCell>
                          <TableCell className="font-medium">{customer.customer_name}</TableCell>
                          <TableCell>{customer.customer_mobile}</TableCell>
                          <TableCell className="max-w-xs truncate">{customer.customer_address}</TableCell>
                          <TableCell className={customer.pending_fine > 0 ? "text-red-600 font-semibold" : customer.pending_fine < 0 ? "text-green-600 font-semibold" : ""}>
                            {customer.pending_fine.toFixed(4)}
                          </TableCell>
                          <TableCell className={customer.pending_amount > 0 ? "text-red-600 font-semibold" : customer.pending_amount < 0 ? "text-green-600 font-semibold" : ""}>
                            ₹{customer.pending_amount.toFixed(2)}
                          </TableCell>
                          <TableCell>{customer.total_credit_fine.toFixed(4)}</TableCell>
                          <TableCell>₹{customer.total_credit_amount.toFixed(2)}</TableCell>
                          <TableCell>{customer.total_debit_fine.toFixed(4)}</TableCell>
                          <TableCell>₹{customer.total_debit_amount.toFixed(2)}</TableCell>
                        </TableRow>
                      </CollapsibleTrigger>
                      <CollapsibleContent asChild>
                        <TableRow>
                          <TableCell colSpan={10} className="p-0">
                            <div className="p-4 bg-gray-50 border-t">
                              <h4 className="font-semibold mb-3">Customer Bills</h4>
                              {customerBills && customerBills.length > 0 ? (
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Bill Number</TableHead>
                                      <TableHead>Item Name</TableHead>
                                      <TableHead>Weight</TableHead>
                                      <TableHead>Tunch</TableHead>
                                      <TableHead>Wastage</TableHead>
                                      <TableHead>Wages</TableHead>
                                      <TableHead>Total Fine</TableHead>
                                      <TableHead>Total Amount</TableHead>
                                      <TableHead>Type</TableHead>
                                      <TableHead>Date</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {customerBills.map((bill) => (
                                      <TableRow key={bill.id}>
                                        <TableCell>{bill.bill_number}</TableCell>
                                        <TableCell>{bill.item_name}</TableCell>
                                        <TableCell>{bill.weight}g</TableCell>
                                        <TableCell>{bill.tunch}%</TableCell>
                                        <TableCell>{bill.wastage}%</TableCell>
                                        <TableCell>₹{bill.wages}</TableCell>
                                        <TableCell>{bill.total_fine.toFixed(4)}g</TableCell>
                                        <TableCell>₹{bill.total_amount.toFixed(2)}</TableCell>
                                        <TableCell>
                                          <Badge variant={bill.payment_type === 'credit' ? 'default' : 'secondary'}>
                                            {bill.payment_type}
                                          </Badge>
                                        </TableCell>
                                        <TableCell>{bill.date}</TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              ) : (
                                <p className="text-gray-500">No bills found for this customer</p>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      </CollapsibleContent>
                    </Collapsible>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PendingListPage;

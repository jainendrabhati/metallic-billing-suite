
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Search, UserPlus, Phone, MapPin, Users, Eye, FileText } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { customerAPI, billAPI } from "@/services/api";
import { format } from "date-fns";

const CustomersPage = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  
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

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.mobile.includes(searchTerm)
  );

  const getCustomerBills = (customerId: number) => {
    return bills.filter(bill => bill.customer_id === customerId);
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
    <div className="h-screen overflow-hidden bg-gray-50 flex flex-col">
      <div className="bg-white border-b border-gray-200 p-4 flex-shrink-0">
        <div className="flex items-center justify-between">
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
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {filteredCustomers.length === 0 ? (
          <div className="text-center py-12">
            <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No customers found</h3>
            <p className="text-gray-500">Get started by adding your first customer</p>
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
                        <div className="font-semibold text-gray-900">{customer.total_bills}</div>
                        <div className="text-sm text-gray-500">Bills</div>
                      </div>
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
                                      <p className="text-2xl font-bold text-blue-600">{selectedCustomer.total_bills}</p>
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
                                    Recent Bills
                                  </CardTitle>
                                </CardHeader>
                                <CardContent>
                                  <div className="overflow-x-auto">
                                    <Table>
                                      <TableHeader>
                                        <TableRow>
                                          <TableHead>Bill #</TableHead>
                                          <TableHead>Item Name</TableHead>
                                          <TableHead>Weight (g)</TableHead>
                                          <TableHead>Tunch (%)</TableHead>
                                          <TableHead>Wastage (%)</TableHead>
                                          <TableHead>Wages</TableHead>
                                          <TableHead>Total Fine (g)</TableHead>
                                          <TableHead>Total Amount</TableHead>
                                          <TableHead>Date</TableHead>
                                          <TableHead>Type</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {getCustomerBills(selectedCustomer.id).slice(0, 10).map((bill) => (
                                          <TableRow key={bill.id}>
                                            <TableCell className="font-medium">{bill.bill_number}</TableCell>
                                            <TableCell>{bill.item_name || bill.item}</TableCell>
                                            <TableCell>{bill.weight.toFixed(4)}</TableCell>
                                            <TableCell>{bill.tunch.toFixed(2)}</TableCell>
                                            <TableCell>{bill.wastage.toFixed(2)}</TableCell>
                                            <TableCell>₹{bill.wages.toFixed(2)}</TableCell>
                                            <TableCell>{(bill.weight * ((bill.tunch - bill.wastage) / 100)).toFixed(4)}</TableCell>
                                            <TableCell className="font-semibold text-green-600">₹{bill.total_amount.toFixed(2)}</TableCell>
                                            <TableCell>{format(new Date(bill.date), 'dd/MM/yyyy')}</TableCell>
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
  );
};

export default CustomersPage;

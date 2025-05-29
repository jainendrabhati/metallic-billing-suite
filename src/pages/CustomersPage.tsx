
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
    <div className="space-y-6 bg-gray-50 min-h-screen p-6">
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b bg-gradient-to-r from-blue-600 to-blue-700">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">Customer Management</h1>
              <p className="text-blue-100 mt-1">Comprehensive customer database and relationship management</p>
            </div>
            <Button className="flex items-center gap-2 bg-white text-blue-600 hover:bg-blue-50 font-semibold">
              <UserPlus className="h-4 w-4" />
              Add New Customer
            </Button>
          </div>
        </div>

        <div className="p-6">
          <Card className="border-0 shadow-sm mb-6">
            <CardHeader className="bg-gray-50 border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl font-semibold text-gray-800">Customer Directory</CardTitle>
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
            </CardHeader>
            <CardContent className="p-0">
              {filteredCustomers.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No customers found</h3>
                  <p className="text-gray-500">Get started by adding your first customer</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="font-semibold text-gray-700">Customer ID</TableHead>
                        <TableHead className="font-semibold text-gray-700">Name</TableHead>
                        <TableHead className="font-semibold text-gray-700">Mobile</TableHead>
                        <TableHead className="font-semibold text-gray-700">Address</TableHead>
                        <TableHead className="font-semibold text-gray-700">Status</TableHead>
                        <TableHead className="font-semibold text-gray-700">Total Bills</TableHead>
                        <TableHead className="font-semibold text-gray-700">Total Amount</TableHead>
                        <TableHead className="font-semibold text-gray-700">Last Updated</TableHead>
                        <TableHead className="font-semibold text-gray-700">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCustomers.map((customer) => (
                        <TableRow key={customer.id} className="hover:bg-gray-50 border-b border-gray-100">
                          <TableCell className="font-medium text-gray-900">CUST-{customer.id.toString().padStart(4, '0')}</TableCell>
                          <TableCell>
                            <div className="font-semibold text-gray-900">{customer.name}</div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4 text-blue-600" />
                              <span className="text-gray-700">{customer.mobile}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-start gap-2 max-w-xs">
                              <MapPin className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                              <span className="text-gray-700 line-clamp-2">{customer.address}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={customer.status === 'active' ? 'default' : 'secondary'}
                              className={customer.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}
                            >
                              {customer.status.toUpperCase()}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-semibold text-gray-900">{customer.total_bills}</TableCell>
                          <TableCell className="font-bold text-blue-600">₹{customer.total_amount.toLocaleString()}</TableCell>
                          <TableCell className="text-gray-700">{format(new Date(customer.updated_at), 'dd/MM/yyyy')}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
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
                                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
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
                                            <div>
                                              <label className="text-sm font-medium text-gray-600">Status</label>
                                              <div>
                                                <Badge 
                                                  variant={selectedCustomer.status === 'active' ? 'default' : 'secondary'}
                                                  className={selectedCustomer.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}
                                                >
                                                  {selectedCustomer.status.toUpperCase()}
                                                </Badge>
                                              </div>
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
                                              <label className="text-sm font-medium text-gray-600">Total Amount</label>
                                              <p className="text-2xl font-bold text-green-600">₹{selectedCustomer.total_amount.toLocaleString()}</p>
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
                                          <div className="space-y-3">
                                            {getCustomerBills(selectedCustomer.id).slice(0, 5).map((bill) => (
                                              <div key={bill.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                                <div>
                                                  <div className="font-medium">Bill #{bill.id}</div>
                                                  <div className="text-sm text-gray-600">{bill.item}</div>
                                                  <div className="text-xs text-gray-500">{format(new Date(bill.date), 'dd/MM/yyyy')}</div>
                                                </div>
                                                <div className="text-right">
                                                  <div className="font-semibold text-green-600">₹{bill.total_amount.toFixed(2)}</div>
                                                  <Badge 
                                                    variant={bill.payment_type === 'credit' ? 'default' : 'secondary'}
                                                    className={`text-xs ${bill.payment_type === 'credit' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
                                                  >
                                                    {bill.payment_type.toUpperCase()}
                                                  </Badge>
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        </CardContent>
                                      </Card>
                                    </div>
                                  )}
                                </DialogContent>
                              </Dialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CustomersPage;

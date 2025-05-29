
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, UserPlus, Phone, MapPin, Users } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { customerAPI } from "@/services/api";
import { format } from "date-fns";

const CustomersPage = () => {
  const [searchTerm, setSearchTerm] = useState("");
  
  const { data: customers = [], isLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: customerAPI.getAll,
  });

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.mobile.includes(searchTerm)
  );

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
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Customer Management</h1>
            <p className="text-gray-600 mt-1">Manage your customer database and relationships</p>
          </div>
          <Button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700">
            <UserPlus className="h-4 w-4" />
            Add New Customer
          </Button>
        </div>

        <Card className="border-0 shadow-sm">
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
          <CardContent className="p-6">
            {filteredCustomers.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No customers found</h3>
                <p className="text-gray-500">Get started by adding your first customer</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCustomers.map((customer) => (
                  <Card key={customer.id} className="hover:shadow-lg transition-all duration-200 border border-gray-200">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="font-bold text-lg text-gray-900">{customer.name}</h3>
                          <Badge 
                            variant={customer.status === 'active' ? 'default' : 'secondary'}
                            className={customer.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}
                          >
                            {customer.status.toUpperCase()}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="space-y-3 text-sm">
                        <div className="flex items-center gap-3">
                          <Phone className="h-4 w-4 text-blue-600" />
                          <span className="text-gray-700">{customer.mobile}</span>
                        </div>
                        <div className="flex items-start gap-3">
                          <MapPin className="h-4 w-4 text-blue-600 mt-0.5" />
                          <span className="text-gray-700 line-clamp-2">{customer.address}</span>
                        </div>
                      </div>
                      
                      <div className="mt-6 pt-4 border-t border-gray-100 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600 font-medium">Total Bills:</span>
                          <span className="font-bold text-gray-900">{customer.total_bills}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600 font-medium">Total Amount:</span>
                          <span className="font-bold text-blue-600">₹{customer.total_amount.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600 font-medium">Last Updated:</span>
                          <span className="font-medium text-gray-700">{format(new Date(customer.updated_at), 'dd/MM/yyyy')}</span>
                        </div>
                      </div>
                      
                      <div className="mt-6 flex gap-2">
                        <Button variant="outline" size="sm" className="flex-1 border-gray-300 hover:bg-gray-50">
                          View Profile
                        </Button>
                        <Button size="sm" className="flex-1 bg-blue-600 hover:bg-blue-700">
                          Create Bill
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CustomersPage;

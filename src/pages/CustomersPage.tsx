
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, UserPlus, Phone, MapPin } from "lucide-react";

const CustomersPage = () => {
  const [searchTerm, setSearchTerm] = useState("");
  
  const customers = [
    {
      id: 1,
      name: "John Doe",
      mobile: "9876543210",
      address: "123 Main Street, Mumbai",
      totalBills: 25,
      totalAmount: 145000,
      status: "active",
      lastTransaction: "2024-01-15"
    },
    {
      id: 2,
      name: "Jane Smith",
      mobile: "9876543211",
      address: "456 Oak Avenue, Delhi",
      totalBills: 18,
      totalAmount: 89000,
      status: "active",
      lastTransaction: "2024-01-14"
    },
    {
      id: 3,
      name: "Bob Johnson",
      mobile: "9876543212",
      address: "789 Pine Road, Bangalore",
      totalBills: 32,
      totalAmount: 210000,
      status: "inactive",
      lastTransaction: "2024-01-10"
    },
  ];

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.mobile.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Customers</h1>
        <Button className="flex items-center gap-2">
          <UserPlus className="h-4 w-4" />
          Add Customer
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Customer Directory</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search customers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCustomers.map((customer) => (
              <Card key={customer.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-lg">{customer.name}</h3>
                      <Badge 
                        variant={customer.status === 'active' ? 'default' : 'secondary'}
                        className="mt-1"
                      >
                        {customer.status}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      <span>{customer.mobile}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 mt-0.5" />
                      <span className="line-clamp-2">{customer.address}</span>
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Total Bills:</span>
                      <span className="font-medium">{customer.totalBills}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Total Amount:</span>
                      <span className="font-medium">₹{customer.totalAmount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Last Transaction:</span>
                      <span className="font-medium">{customer.lastTransaction}</span>
                    </div>
                  </div>
                  
                  <div className="mt-4 flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1">
                      View Details
                    </Button>
                    <Button size="sm" className="flex-1">
                      Create Bill
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CustomersPage;

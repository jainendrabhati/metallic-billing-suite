
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const BillingPage = () => {
  const [formData, setFormData] = useState({
    customerName: "",
    mobile: "",
    address: "",
    item: "",
    weight: "",
    tunch: "",
    wages: "",
    wastage: "",
    date: new Date(),
    transactionType: "credit",
    paymentStatus: "paid",
    partialAmount: "",
    description: "",
    gstNumber: "",
    totalFine: 0,
    totalAmount: 0,
  });

  const [customers] = useState([
    { name: "John Doe", mobile: "9876543210", address: "123 Main St" },
    { name: "Jane Smith", mobile: "9876543211", address: "456 Oak Ave" },
    { name: "Bob Johnson", mobile: "9876543212", address: "789 Pine Rd" },
  ]);

  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  useEffect(() => {
    const weight = parseFloat(formData.weight) || 0;
    const tunch = parseFloat(formData.tunch) || 0;
    const wastage = parseFloat(formData.wastage) || 0;
    const wages = parseFloat(formData.wages) || 0;

    const totalFine = weight * ((tunch - wastage) / 100);
    const totalAmount = weight * (wages / 1000);

    setFormData(prev => ({
      ...prev,
      totalFine: totalFine,
      totalAmount: totalAmount,
    }));
  }, [formData.weight, formData.tunch, formData.wastage, formData.wages]);

  const handleCustomerNameChange = (value: string) => {
    setFormData(prev => ({ ...prev, customerName: value }));
    
    if (value.length > 0) {
      const filtered = customers.filter(customer =>
        customer.name.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredCustomers(filtered);
      setShowCustomerDropdown(filtered.length > 0);
    } else {
      setShowCustomerDropdown(false);
    }
  };

  const selectCustomer = (customer: any) => {
    setFormData(prev => ({
      ...prev,
      customerName: customer.name,
      mobile: customer.mobile,
      address: customer.address,
    }));
    setShowCustomerDropdown(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Bill Data:", formData);
    // Handle bill creation logic here
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Create New Bill</h1>
        <Button>Save as Draft</Button>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Customer Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Label htmlFor="customerName">Customer Name</Label>
                <Input
                  id="customerName"
                  value={formData.customerName}
                  onChange={(e) => handleCustomerNameChange(e.target.value)}
                  placeholder="Enter customer name"
                  className="mt-1"
                />
                {showCustomerDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                    {filteredCustomers.map((customer, index) => (
                      <div
                        key={index}
                        className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                        onClick={() => selectCustomer(customer)}
                      >
                        <div className="font-medium">{customer.name}</div>
                        <div className="text-sm text-gray-500">{customer.mobile}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="mobile">Mobile Number</Label>
                  <Input
                    id="mobile"
                    value={formData.mobile}
                    onChange={(e) => setFormData(prev => ({ ...prev, mobile: e.target.value }))}
                    placeholder="Enter mobile number"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="gstNumber">GST Number</Label>
                  <Input
                    id="gstNumber"
                    value={formData.gstNumber}
                    onChange={(e) => setFormData(prev => ({ ...prev, gstNumber: e.target.value }))}
                    placeholder="Enter GST number"
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Enter customer address"
                  className="mt-1"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Item Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="item">Item</Label>
                  <Input
                    id="item"
                    value={formData.item}
                    onChange={(e) => setFormData(prev => ({ ...prev, item: e.target.value }))}
                    placeholder="Enter item name"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="weight">Weight (grams)</Label>
                  <Input
                    id="weight"
                    type="number"
                    value={formData.weight}
                    onChange={(e) => setFormData(prev => ({ ...prev, weight: e.target.value }))}
                    placeholder="Enter weight"
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="tunch">Tunch (%)</Label>
                  <Input
                    id="tunch"
                    type="number"
                    value={formData.tunch}
                    onChange={(e) => setFormData(prev => ({ ...prev, tunch: e.target.value }))}
                    placeholder="Enter tunch"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="wages">Wages (per gram)</Label>
                  <Input
                    id="wages"
                    type="number"
                    value={formData.wages}
                    onChange={(e) => setFormData(prev => ({ ...prev, wages: e.target.value }))}
                    placeholder="Enter wages"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="wastage">Wastage (%)</Label>
                  <Input
                    id="wastage"
                    type="number"
                    value={formData.wastage}
                    onChange={(e) => setFormData(prev => ({ ...prev, wastage: e.target.value }))}
                    placeholder="Enter wastage"
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="date">Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal mt-1",
                        !formData.date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.date ? format(formData.date, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.date}
                      onSelect={(date) => date && setFormData(prev => ({ ...prev, date }))}
                      disabled={(date) => date > new Date()}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Transaction Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Transaction Type</Label>
                <Select value={formData.transactionType} onValueChange={(value) => setFormData(prev => ({ ...prev, transactionType: value }))}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="credit">Credit</SelectItem>
                    <SelectItem value="debit">Debit</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Payment Status</Label>
                <RadioGroup 
                  value={formData.paymentStatus} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, paymentStatus: value }))}
                  className="mt-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="paid" id="paid" />
                    <Label htmlFor="paid">Paid</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="unpaid" id="unpaid" />
                    <Label htmlFor="unpaid">Unpaid</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="partial" id="partial" />
                    <Label htmlFor="partial">Partial</Label>
                  </div>
                </RadioGroup>
              </div>

              {formData.paymentStatus === "partial" && (
                <div>
                  <Label htmlFor="partialAmount">Partial Amount</Label>
                  <Input
                    id="partialAmount"
                    type="number"
                    value={formData.partialAmount}
                    onChange={(e) => setFormData(prev => ({ ...prev, partialAmount: e.target.value }))}
                    placeholder="Enter partial amount"
                    className="mt-1"
                  />
                </div>
              )}

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Enter description"
                  className="mt-1"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Calculation Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-gray-600">Total Fine:</span>
                <span className="font-semibold">₹{formData.totalFine.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-gray-600">Total Amount:</span>
                <span className="font-semibold">₹{formData.totalAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center py-2 text-lg font-bold">
                <span>Grand Total:</span>
                <span>₹{(formData.totalFine + formData.totalAmount).toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>

          <Button type="submit" className="w-full">
            Generate Bill
          </Button>
        </div>
      </form>
    </div>
  );
};

export default BillingPage;

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Plus, FileText } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customerAPI, billAPI, Customer, Bill } from "@/services/api";

const BillingPage = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Form state
  const [customerName, setCustomerName] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [mobile, setMobile] = useState("");
  const [address, setAddress] = useState("");
  const [item, setItem] = useState("");
  const [weight, setWeight] = useState("");
  const [tunch, setTunch] = useState("");
  const [wages, setWages] = useState("");
  const [wastage, setWastage] = useState("");
  const [rupees, setRupees] = useState("");
  const [slipNo, setSlipNo] = useState("");
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [paymentType, setPaymentType] = useState<"credit" | "debit">("credit");
  const [description, setDescription] = useState("");
  const [gstNumber, setGstNumber] = useState("");
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);

  // Calculated values
  const totalFine = weight && tunch && wastage ? 
    parseFloat(weight) * ((parseFloat(tunch) - parseFloat(wastage)) / 100) : 0;
  const totalAmount = (weight && wages ? parseFloat(weight) * (parseFloat(wages) / 1000) : 0) + 
                     (rupees ? parseFloat(rupees) : 0);

  // Queries
  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: customerAPI.getAll,
  });

  const { data: bills = [] } = useQuery({
    queryKey: ['bills'],
    queryFn: billAPI.getAll,
  });

  // Search customers
  const { data: searchResults = [] } = useQuery({
    queryKey: ['customers', 'search', customerName],
    queryFn: () => customerAPI.search(customerName),
    enabled: customerName.length > 0,
  });

  // Mutations
  const createCustomerMutation = useMutation({
    mutationFn: customerAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });

  const createBillMutation = useMutation({
    mutationFn: billAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast({
        title: "Success",
        description: "Bill created successfully!",
      });
      resetForm();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create bill. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Handle customer selection
  const handleCustomerSelect = (customer: Customer) => {
    setSelectedCustomer(customer);
    setCustomerName(customer.name);
    setMobile(customer.mobile);
    setAddress(customer.address);
    setShowCustomerSuggestions(false);
  };

  // Handle customer name change
  const handleCustomerNameChange = (value: string) => {
    setCustomerName(value);
    setShowCustomerSuggestions(value.length > 0);
    
    // Clear selected customer if name doesn't match
    if (selectedCustomer && selectedCustomer.name !== value) {
      setSelectedCustomer(null);
      setMobile("");
      setAddress("");
    }
  };

  // Reset form
  const resetForm = () => {
    setCustomerName("");
    setSelectedCustomer(null);
    setMobile("");
    setAddress("");
    setItem("");
    setWeight("");
    setTunch("");
    setWages("");
    setWastage("");
    setRupees("");
    setSlipNo("");
    setDate(new Date());
    setPaymentType("credit");
    setDescription("");
    setGstNumber("");
    setShowCustomerSuggestions(false);
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!customerName || !mobile || !address || !item || !weight || !tunch || !wages || !wastage || !date) {
      toast({
        title: "Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    let customerId = selectedCustomer?.id;

    // Create customer if not exists
    if (!selectedCustomer) {
      try {
        const newCustomer = await createCustomerMutation.mutateAsync({
          name: customerName,
          mobile,
          address,
        });
        customerId = newCustomer.id;
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to create customer.",
          variant: "destructive",
        });
        return;
      }
    }

    // Create bill
    if (customerId) {
      createBillMutation.mutate({
        customer_id: customerId,
        item,
        weight: parseFloat(weight),
        tunch: parseFloat(tunch),
        wages: parseFloat(wages),
        wastage: parseFloat(wastage),
        rupees: parseFloat(rupees || "0"),
        payment_type: paymentType,
        slip_no: slipNo,
        description,
        gst_number: gstNumber,
        date: format(date, "yyyy-MM-dd"),
      });
    }
  };

  return (
    <div className="space-y-6 bg-gray-50 min-h-screen p-6">
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Professional Billing Suite</h1>
            <p className="text-gray-600 mt-1">Create and manage billing transactions efficiently</p>
          </div>
          <Button onClick={resetForm} variant="outline" className="flex items-center gap-2 border-gray-300">
            <Plus className="h-4 w-4" />
            Reset Form
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Billing Form */}
          <div className="lg:col-span-2">
            <Card className="shadow-lg border-0">
              <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                <CardTitle className="text-xl">Create New Bill</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Customer Information */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Customer Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="relative">
                        <Label htmlFor="customerName">Customer Name *</Label>
                        <Input
                          id="customerName"
                          value={customerName}
                          onChange={(e) => handleCustomerNameChange(e.target.value)}
                          placeholder="Enter customer name"
                          autoComplete="off"
                          className="border-gray-300 focus:border-blue-500"
                        />
                        {showCustomerSuggestions && searchResults.length > 0 && (
                          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
                            {searchResults.map((customer) => (
                              <div
                                key={customer.id}
                                className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                                onClick={() => handleCustomerSelect(customer)}
                              >
                                <div className="font-medium">{customer.name}</div>
                                <div className="text-sm text-gray-500">{customer.mobile}</div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div>
                        <Label htmlFor="mobile">Mobile *</Label>
                        <Input
                          id="mobile"
                          value={mobile}
                          onChange={(e) => setMobile(e.target.value)}
                          placeholder="Enter mobile number"
                          className="border-gray-300 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <Label htmlFor="address">Address *</Label>
                        <Input
                          id="address"
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          placeholder="Enter address"
                          className="border-gray-300 focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Bill Details */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Bill Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="item">Item *</Label>
                        <Input
                          id="item"
                          value={item}
                          onChange={(e) => setItem(e.target.value)}
                          placeholder="Enter item name"
                          className="border-gray-300 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <Label htmlFor="slipNo">Slip Number</Label>
                        <Input
                          id="slipNo"
                          value={slipNo}
                          onChange={(e) => setSlipNo(e.target.value)}
                          placeholder="Enter slip number"
                          className="border-gray-300 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <Label htmlFor="date">Date *</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal border-gray-300",
                                !date && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {date ? format(date, "PPP") : <span>Pick a date</span>}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={date}
                              onSelect={setDate}
                              disabled={(date) => date > new Date()}
                              initialFocus
                              className="p-3 pointer-events-auto"
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                  </div>

                  {/* Weight and Calculations */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Measurements & Calculations</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="weight">Weight (grams) *</Label>
                        <Input
                          id="weight"
                          type="number"
                          step="0.01"
                          value={weight}
                          onChange={(e) => setWeight(e.target.value)}
                          placeholder="0.00"
                          className="border-gray-300 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <Label htmlFor="tunch">Tunch *</Label>
                        <Input
                          id="tunch"
                          type="number"
                          step="0.01"
                          value={tunch}
                          onChange={(e) => setTunch(e.target.value)}
                          placeholder="0.00"
                          className="border-gray-300 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <Label htmlFor="wages">Wages *</Label>
                        <Input
                          id="wages"
                          type="number"
                          step="0.01"
                          value={wages}
                          onChange={(e) => setWages(e.target.value)}
                          placeholder="0.00"
                          className="border-gray-300 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <Label htmlFor="wastage">Wastage *</Label>
                        <Input
                          id="wastage"
                          type="number"
                          step="0.01"
                          value={wastage}
                          onChange={(e) => setWastage(e.target.value)}
                          placeholder="0.00"
                          className="border-gray-300 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <Label htmlFor="rupees">Rupees Amount</Label>
                        <Input
                          id="rupees"
                          type="number"
                          step="0.01"
                          value={rupees}
                          onChange={(e) => setRupees(e.target.value)}
                          placeholder="0.00"
                          className="border-gray-300 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <Label>Payment Type *</Label>
                        <Select value={paymentType} onValueChange={(value: "credit" | "debit") => setPaymentType(value)}>
                          <SelectTrigger className="border-gray-300">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="credit">Credit</SelectItem>
                            <SelectItem value="debit">Debit</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* Calculated Results */}
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <h3 className="text-lg font-semibold text-blue-800 mb-4">Calculated Results</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>Total Fine (grams)</Label>
                        <Input
                          value={totalFine.toFixed(4)}
                          readOnly
                          className="bg-white font-semibold text-blue-600"
                        />
                      </div>
                      <div>
                        <Label>Total Amount</Label>
                        <Input
                          value={`₹${totalAmount.toFixed(2)}`}
                          readOnly
                          className="bg-white font-bold text-green-600 text-lg"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Additional Information */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Additional Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                          id="description"
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          placeholder="Enter description"
                          rows={3}
                          className="border-gray-300 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <Label htmlFor="gstNumber">GST Number</Label>
                        <Input
                          id="gstNumber"
                          value={gstNumber}
                          onChange={(e) => setGstNumber(e.target.value)}
                          placeholder="Enter GST number"
                          className="border-gray-300 focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 text-lg" 
                    disabled={createBillMutation.isPending}
                  >
                    {createBillMutation.isPending ? "Creating Bill..." : "Create Professional Bill"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Recent Bills */}
          <div>
            <Card className="shadow-lg border-0">
              <CardHeader className="bg-gradient-to-r from-green-600 to-green-700 text-white">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <FileText className="h-5 w-5" />
                  Recent Bills
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-3">
                  {bills.slice(0, 5).map((bill) => (
                    <div key={bill.id} className="p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-bold text-gray-900">Bill #{bill.id}</div>
                          <div className="text-sm text-gray-600 font-medium">{bill.customer_name}</div>
                          <div className="text-sm text-gray-500">{bill.item}</div>
                          {bill.slip_no && <div className="text-xs text-blue-600">Slip: {bill.slip_no}</div>}
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-green-600 text-lg">₹{bill.total_amount.toFixed(2)}</div>
                          <div className="text-xs text-gray-500">{format(new Date(bill.date), 'dd/MM/yyyy')}</div>
                          <div className="text-xs">
                            <Badge variant={bill.payment_type === 'credit' ? 'default' : 'secondary'} 
                                   className={bill.payment_type === 'credit' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                              {bill.payment_type.toUpperCase()}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BillingPage;

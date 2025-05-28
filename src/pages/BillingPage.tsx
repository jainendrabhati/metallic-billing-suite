
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [paymentType, setPaymentType] = useState<"credit" | "debit">("credit");
  const [paymentStatus, setPaymentStatus] = useState<"paid" | "unpaid" | "partial">("paid");
  const [partialAmount, setPartialAmount] = useState("");
  const [description, setDescription] = useState("");
  const [gstNumber, setGstNumber] = useState("");
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);

  // Calculated values
  const totalFine = weight && tunch && wastage ? 
    parseFloat(weight) * ((parseFloat(tunch) - parseFloat(wastage)) / 100) : 0;
  const totalAmount = weight && wages ? 
    parseFloat(weight) * (parseFloat(wages) / 1000) : 0;

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
    setDate(new Date());
    setPaymentType("credit");
    setPaymentStatus("paid");
    setPartialAmount("");
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
        payment_type: paymentType,
        payment_status: paymentStatus,
        partial_amount: paymentStatus === "partial" ? parseFloat(partialAmount) : 0,
        description,
        gst_number: gstNumber,
        date: format(date, "yyyy-MM-dd"),
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Billing</h1>
        <Button onClick={resetForm} variant="outline" className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          New Bill
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Billing Form */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Create New Bill</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Customer Information */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="relative">
                    <Label htmlFor="customerName">Customer Name *</Label>
                    <Input
                      id="customerName"
                      value={customerName}
                      onChange={(e) => handleCustomerNameChange(e.target.value)}
                      placeholder="Enter customer name"
                      autoComplete="off"
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
                    />
                  </div>
                  <div>
                    <Label htmlFor="address">Address *</Label>
                    <Input
                      id="address"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Enter address"
                    />
                  </div>
                </div>

                {/* Item Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="item">Item *</Label>
                    <Input
                      id="item"
                      value={item}
                      onChange={(e) => setItem(e.target.value)}
                      placeholder="Enter item name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="date">Date *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
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

                {/* Weight and Calculations */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <Label htmlFor="weight">Weight (grams) *</Label>
                    <Input
                      id="weight"
                      type="number"
                      step="0.01"
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                      placeholder="0.00"
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
                    />
                  </div>
                </div>

                {/* Calculated Results */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Total Fine</Label>
                    <Input
                      value={totalFine.toFixed(4)}
                      readOnly
                      className="bg-gray-50 font-semibold"
                    />
                  </div>
                  <div>
                    <Label>Total Amount</Label>
                    <Input
                      value={`₹${totalAmount.toFixed(2)}`}
                      readOnly
                      className="bg-gray-50 font-semibold text-green-600"
                    />
                  </div>
                </div>

                {/* Payment Information */}
                <div className="space-y-4">
                  <div>
                    <Label>Payment Type *</Label>
                    <Select value={paymentType} onValueChange={(value: "credit" | "debit") => setPaymentType(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="credit">Credit</SelectItem>
                        <SelectItem value="debit">Debit</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Payment Status *</Label>
                    <RadioGroup
                      value={paymentStatus}
                      onValueChange={(value: "paid" | "unpaid" | "partial") => setPaymentStatus(value)}
                      className="flex flex-row gap-6"
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

                  {paymentStatus === "partial" && (
                    <div>
                      <Label htmlFor="partialAmount">Partial Amount *</Label>
                      <Input
                        id="partialAmount"
                        type="number"
                        step="0.01"
                        value={partialAmount}
                        onChange={(e) => setPartialAmount(e.target.value)}
                        placeholder="Enter partial amount"
                      />
                    </div>
                  )}
                </div>

                {/* Additional Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Enter description"
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label htmlFor="gstNumber">GST Number</Label>
                    <Input
                      id="gstNumber"
                      value={gstNumber}
                      onChange={(e) => setGstNumber(e.target.value)}
                      placeholder="Enter GST number"
                    />
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={createBillMutation.isPending}
                >
                  {createBillMutation.isPending ? "Creating Bill..." : "Create Bill"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Recent Bills */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Recent Bills
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {bills.slice(0, 5).map((bill) => (
                  <div key={bill.id} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium">Bill #{bill.id}</div>
                        <div className="text-sm text-gray-600">{bill.customer_name}</div>
                        <div className="text-sm text-gray-500">{bill.item}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-green-600">₹{bill.total_amount.toFixed(2)}</div>
                        <div className="text-xs text-gray-500">{format(new Date(bill.date), 'dd/MM/yyyy')}</div>
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
  );
};

export default BillingPage;

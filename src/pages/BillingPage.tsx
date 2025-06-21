import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CalendarIcon, Plus, FileText, Printer } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customerAPI, billAPI, stockItemAPI, settingsAPI, Customer, Bill } from "@/services/api";
import BillPrint from "@/components/BillPrint";

const BillingPage = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Form state
  const [customerName, setCustomerName] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [mobile, setMobile] = useState("");
  const [address, setAddress] = useState("");
  const [itemName, setItemName] = useState("");
  const [item, setItem] = useState("");
  const [weight, setWeight] = useState("0");
  const [tunch, setTunch] = useState("0");
  const [wages, setWages] = useState("0");
  const [wastage, setWastage] = useState("0");
  const [silverAmount, setSilverAmount] = useState("0");
  const [slipNo, setSlipNo] = useState("");
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [paymentType, setPaymentType] = useState<"credit" | "debit">("credit");
  const [description, setDescription] = useState("");
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [selectedBillForPrint, setSelectedBillForPrint] = useState<Bill | null>(null);
  

  // Calculated values
  const totalFine = weight && tunch && wastage ? 
    parseFloat(weight) * ((parseFloat(tunch) + parseFloat(wastage)) / 100) : 0;
  const totalAmount = (weight && wages ? parseFloat(weight) * (parseFloat(wages) / 1000) : 0) + 
                     (paymentType === 'credit' && silverAmount ? parseFloat(silverAmount) : 0);

  // Queries
  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: customerAPI.getAll,
  });

  const { data: bills = [] } = useQuery({
    queryKey: ['bills'],
    queryFn: billAPI.getAll,
  });

  const { data: stockItems = [] } = useQuery({
    queryKey: ['stockItems'],
    queryFn: stockItemAPI.getAll,
  });

  const { data: firmSettings } = useQuery({
    queryKey: ['firmSettings'],
    queryFn: settingsAPI.getFirmSettings,
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
    onSuccess: (newBill) => {
      queryClient.invalidateQueries({ queryKey: ['bills'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['stockItems'] });
      toast({
        title: "Success",
        description: "Bill created successfully!",
      });
      setSelectedBillForPrint(newBill);
      setShowPrintDialog(true);
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
    setItemName("");
    setItem("");
    setWeight("");
    setTunch("");
    setWages("");
    setWastage("");
    setSilverAmount("");
    setSlipNo("");
    setDate(new Date());
    setPaymentType("credit");
    setDescription("");
    setShowCustomerSuggestions(false);
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!customerName || !mobile || !address || !itemName || !item || !weight || !tunch || !wages || !wastage || !date) {
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
        item_name: itemName,
        item,
        weight: parseFloat(weight),
        tunch: parseFloat(tunch || "0"),
        wages: parseFloat(wages || "0"),
        wastage: parseFloat(wastage || "0"),
        silver_amount: parseFloat(silverAmount || "0"),
        payment_type: paymentType,
        slip_no: slipNo,
        description,
        date: format(date, "yyyy-MM-dd"),
      });
    }
  };

  return (
    <div className="h-screen overflow-hidden bg-gray-50 flex flex-col">
      <div className="bg-white border-b border-gray-200 p-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Professional Billing Suite</h1>
            <p className="text-gray-600 text-sm">Create and manage billing transactions efficiently</p>
          </div>
          <Button onClick={resetForm} variant="outline" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Reset Form
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <div className="h-full grid grid-cols-1 lg:grid-cols-3 gap-4 p-4">
          {/* Billing Form */}
          <div className="lg:col-span-2 h-full overflow-y-auto">
            <Card className="h-full flex flex-col shadow-lg border-0">
              <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white flex-shrink-0">
                <CardTitle className="text-lg">Create New Bill</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto p-4">
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Customer Information */}
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <h3 className="text-base font-semibold text-gray-800 mb-3">Customer Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="relative">
                        <Label htmlFor="customerName" className="text-sm">Customer Name *</Label>
                        <Input
                          id="customerName"
                          value={customerName}
                          onChange={(e) => handleCustomerNameChange(e.target.value)}
                          placeholder="Enter customer name"
                          autoComplete="off"
                          className="border-gray-300 focus:border-blue-500 text-sm"
                        />
                        {showCustomerSuggestions && searchResults.length > 0 && (
                          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-40 overflow-auto">
                            {searchResults.map((customer) => (
                              <div
                                key={customer.id}
                                className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                                onClick={() => handleCustomerSelect(customer)}
                              >
                                <div className="font-medium text-sm">{customer.name}</div>
                                <div className="text-xs text-gray-500">{customer.mobile}</div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div>
                        <Label htmlFor="mobile" className="text-sm">Mobile *</Label>
                        <Input
                          id="mobile"
                          value={mobile}
                          onChange={(e) => setMobile(e.target.value)}
                          placeholder="Enter mobile number"
                          className="border-gray-300 focus:border-blue-500 text-sm"
                        />
                      </div>
                      <div>
                        <Label htmlFor="address" className="text-sm">Address *</Label>
                        <Input
                          id="address"
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          placeholder="Enter address"
                          className="border-gray-300 focus:border-blue-500 text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Bill Details */}
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <h3 className="text-base font-semibold text-gray-800 mb-3">Bill Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <Label htmlFor="itemName" className="text-sm">Item Name *</Label>
                        <Input
                          id="itemName"
                          value={itemName}
                          onChange={(e) => setItemName(e.target.value)}
                          placeholder="Enter item name"
                          className="border-gray-300 focus:border-blue-500 text-sm"
                        />
                      </div>
                      <div>
                        <Label htmlFor="item" className="text-sm">Item Type *</Label>
                        <Select value={item} onValueChange={setItem}>
                          <SelectTrigger className="border-gray-300 text-sm">
                            <SelectValue placeholder="Select item type" />
                          </SelectTrigger>
                          <SelectContent>
                            {stockItems.map((stockItem) => (
                              <SelectItem key={stockItem.id} value={stockItem.item_name}>
                                {stockItem.item_name} ({stockItem.current_weight.toFixed(4)}g)
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="slipNo" className="text-sm">Slip Number</Label>
                        <Input
                          id="slipNo"
                          value={slipNo}
                          onChange={(e) => setSlipNo(e.target.value)}
                          placeholder="Enter slip number"
                          className="border-gray-300 focus:border-blue-500 text-sm"
                        />
                      </div>
                      <div>
                        <Label htmlFor="date" className="text-sm">Date *</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal border-gray-300 text-sm",
                                !date && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-3 w-3" />
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
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                  </div>

                  {/* Weight and Calculations */}
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <h3 className="text-base font-semibold text-gray-800 mb-3">Measurements & Calculations</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      <div>
                        <Label htmlFor="weight" className="text-sm">Weight (grams) *</Label>
                        <Input
                          id="weight"
                          type="number"
                          step="0.01"
                          defaultValue={0}
                          value={weight}
                          onChange={(e) => setWeight(e.target.value)}
                          placeholder="0.00"
                          className="border-gray-300 focus:border-blue-500 text-sm"
                        />
                      </div>
                      <div>
                        <Label htmlFor="tunch" className="text-sm">Tunch *</Label>
                        <Input
                          id="tunch"
                          type="number"
                          
                          step="0.01"
                          value={tunch}
                          onChange={(e) => setTunch(e.target.value)}
                          placeholder="0.00"
                          className="border-gray-300 focus:border-blue-500 text-sm"
                        />
                      </div>
                      <div>
                        <Label htmlFor="wastage" className="text-sm">Wastage *</Label>
                        <Input
                          id="wastage"
                          type="number"
                          defaultValue={0}
                          value={wastage}
                          onChange={(e) => setWastage(e.target.value)}
                          placeholder="0.00"
                          className="border-gray-300 focus:border-blue-500 text-sm"
                        />
                      </div>
                      {paymentType === 'debit' && (
                      <div>
                        <Label htmlFor="wages" className="text-sm">Wages *</Label>
                        <Input
                          id="wages"
                          type="number"
                          
                          value={wages}
                          onChange={(e) => setWages(e.target.value)}
                          placeholder="0.00"
                          className="border-gray-300 focus:border-blue-500 text-sm"
                        />
                      </div>
                      )}
                      
                      {paymentType === 'credit' && (
                        <div>
                          <Label htmlFor="silverAmount" className="text-sm">Amount</Label>
                          <Input
                            id="silverAmount"
                            type="number"
                            
                            value={silverAmount}
                            onChange={(e) => setSilverAmount(e.target.value)}
                            placeholder="0.00"
                            className="border-gray-300 focus:border-blue-500 text-sm"
                          />
                        </div>
                      )}
                      <div>
                        <Label className="text-sm">Payment Type *</Label>
                        <Select value={paymentType} onValueChange={(value: "credit" | "debit") => setPaymentType(value)}>
                          <SelectTrigger className="border-gray-300 text-sm">
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
                  <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                    <h3 className="text-base font-semibold text-blue-800 mb-3">Calculated Results</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <Label className="text-sm">Total Fine (grams)</Label>
                        <Input
                          value={totalFine.toFixed(2)}
                          readOnly
                          className="bg-white font-semibold text-blue-600 text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-sm">Total Amount</Label>
                        <Input
                          value={`₹${totalAmount.toFixed(2)}`}
                          readOnly
                          className="bg-white font-bold text-green-600 text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Additional Information */}
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <h3 className="text-base font-semibold text-gray-800 mb-3">Additional Information</h3>
                    <div>
                      <Label htmlFor="description" className="text-sm">Description</Label>
                      <Textarea
                        id="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Enter description"
                        rows={2}
                        className="border-gray-300 focus:border-blue-500 text-sm"
                      />
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2" 
                    disabled={createBillMutation.isPending}
                  >
                    {createBillMutation.isPending ? "Creating Bill..." : "Create Professional Bill"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Recent Bills */}
          <div className="h-full overflow-y-auto">
            <Card className="h-full flex flex-col shadow-lg border-0">
              <CardHeader className="bg-gradient-to-r from-green-600 to-green-700 text-white flex-shrink-0">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FileText className="h-4 w-4" />
                  Recent Bills
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto p-3">
                <div className="space-y-2 m-5">
                  {bills.slice(0, 10).map((bill) => (
                    <div key={bill.id} className="p-3 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border border-gray-200 hover:shadow-sm transition-shadow">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-bold text-gray-900 text-sm">{bill.bill_number}</div>
                          <div className="text-xs text-gray-600 font-medium">{bill.customer_name}</div>
                          <div className="text-xs text-gray-500">{bill.item}</div>
                          {bill.slip_no && <div className="text-xs text-blue-600">Slip: {bill.slip_no}</div>}
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-green-600 text-sm">₹{bill.total_amount.toFixed(2)}</div>
                          <div className="text-xs text-gray-500">{format(new Date(bill.date), 'dd/MM/yyyy')}</div>
                          <div className="text-xs flex gap-1">
                            <Badge variant={bill.payment_type === 'credit' ? 'default' : 'secondary'} 
                                   className={`text-xs ${bill.payment_type === 'credit' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                              {bill.payment_type.toUpperCase()}
                            </Badge>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedBillForPrint(bill);
                                setShowPrintDialog(true);
                              }}
                              className="h-6 w-6 p-0"
                            >
                              <Printer className="h-3 w-3" />
                            </Button>
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

      {/* Print Dialog */}
      <Dialog open={showPrintDialog} onOpenChange={setShowPrintDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Print Bill</DialogTitle>
          </DialogHeader>
          {selectedBillForPrint && firmSettings && (
            <BillPrint bill={selectedBillForPrint} firmSettings={firmSettings} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BillingPage;

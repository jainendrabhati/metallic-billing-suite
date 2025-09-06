import { useState, useEffect, useCallback } from "react";
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
import CustomerSearch from "@/components/CustomerSearch";
import AppSidebar from "@/components/AppSidebar";
import Navbar from "@/components/Navbar";
import { useSidebar } from "@/components/SidebarProvider";

const BillingPage = () => {
  const { isOpen } = useSidebar();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Key for forcing component re-renders
  const [formKey, setFormKey] = useState(0);
  
  // Form state with proper initial values
  const [formData, setFormData] = useState({
    customerName: "",
    mobile: "",
    address: "",
    itemName: "",
    item: "",
    weight: "0",
    tunch: "0",
    wages: "0",
    wastage: "0",
    silverAmount: "0",
    slipNo: "",
    description: ""
  });
  
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [returnProduct, setReturnProduct] = useState(false);
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [paymentType, setPaymentType] = useState<"credit" | "debit">("credit");
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [selectedBillForPrint, setSelectedBillForPrint] = useState<Bill | null>(null);

  // Enhanced stable event handlers using useCallback
  const handleInputChange = useCallback((field: string, value: string) => {
    console.log(`Input change: ${field} = ${value}`);
    setFormData(prev => {
      const newData = {
        ...prev,
        [field]: value
      };
      console.log('New form data:', newData);
      return newData;
    });
  }, []);

  // Force input refresh function
  const forceInputRefresh = useCallback(() => {
    console.log('=== FORCING INPUT REFRESH ===');
    
    // Method 1: Force re-render with key change
    setFormKey(prev => prev + 1);
    
    // Method 2: Manually refresh all form inputs
    setTimeout(() => {
      const formElement = document.querySelector('form');
      if (formElement) {
        const inputs = formElement.querySelectorAll('input, textarea, select');
        inputs.forEach((input, index) => {
          const htmlInput = input as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
          console.log(`Refreshing input ${index}:`, htmlInput.name || htmlInput.id);
          
          // Remove and re-add to DOM to force refresh
          const parent = htmlInput.parentNode;
          const nextSibling = htmlInput.nextSibling;
          if (parent) {
            parent.removeChild(htmlInput);
            if (nextSibling) {
              parent.insertBefore(htmlInput, nextSibling);
            } else {
              parent.appendChild(htmlInput);
            }
          }
        });
      }
    }, 50);
    
    // Method 3: Reset focus
    setTimeout(() => {
      document.body.focus();
      const firstInput = document.querySelector('input') as HTMLInputElement;
      if (firstInput) {
        firstInput.focus();
        firstInput.blur();
      }
    }, 100);
    
    console.log('=== INPUT REFRESH COMPLETE ===');
  }, []);

  // Calculated values
  const rawTotalFine = formData.weight && formData.tunch && formData.wastage ? 
    parseFloat(formData.weight) * ((parseFloat(formData.tunch) + parseFloat(formData.wastage)) / 100) : 0;
  
  // Apply rounding logic
  const totalFine = (() => {
    if (rawTotalFine === 0) return 0;
    return rawTotalFine;
    // const integerPart = Math.floor(rawTotalFine);

    // const decimalPart = rawTotalFine - integerPart;
    // return rawTotalFine;
    // if (paymentType === 'debit') {
    //   // For debit: if > 0.50, round up, otherwise round down
    //   return decimalPart > 0.50 ? integerPart + 1 : integerPart;
    // } else {
    //   // For credit: if > 0.70, round up, otherwise round down
    //   return decimalPart > 0.70 ? integerPart + 1 : integerPart;
    // }
  })();

  const totalAmount = (() => {
    let amount = 0;
    if (paymentType === 'debit') {
      amount = (formData.weight && formData.wages ? parseFloat(formData.weight) * (parseFloat(formData.wages) / 1000) : 0) + 
               (formData.silverAmount ? parseFloat(formData.silverAmount) : 0);
    } else {
      amount = (formData.silverAmount ? parseFloat(formData.silverAmount) : 0);
    }
    return amount;
  })();

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
    queryKey: ['customers', 'search', formData.customerName],
    queryFn: () => customerAPI.search(formData.customerName),
    enabled: formData.customerName.length > 0,
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
  const handleCustomerSelect = useCallback((customer: Customer) => {
    setSelectedCustomer(customer);
    setFormData(prev => ({
      ...prev,
      customerName: customer.name,
      mobile: customer.mobile,
      address: customer.address
    }));
    setShowCustomerSuggestions(false);
  }, []);

  // Handle customer name change
  const handleCustomerNameChange = useCallback((value: string) => {
    handleInputChange('customerName', value);
    
    // Clear selected customer if name doesn't match
    if (selectedCustomer && selectedCustomer.name !== value) {
      setSelectedCustomer(null);
      setFormData(prev => ({
        ...prev,
        mobile: "",
        address: ""
      }));
    }
  }, [selectedCustomer, handleInputChange]);

  // Enhanced reset form with multiple refresh strategies
  const resetForm = useCallback(() => {
    console.log('=== FORM RESET START ===');
    
    // Strategy 1: Reset all form data
    setFormData({
      customerName: "",
      mobile: "",
      address: "",
      itemName: "",
      item: "",
      weight: "0",
      tunch: "0",
      wages: "0",
      wastage: "0",
      silverAmount: "0",
      slipNo: "",
      description: ""
    });
    
    // Strategy 2: Reset other state
    setSelectedCustomer(null);
    setReturnProduct(false);
    setDate(new Date());
    setPaymentType("credit");
    setShowCustomerSuggestions(false);
    
    // Strategy 3: Force component re-render
    setFormKey(prev => prev + 1);
    
    // Strategy 4: Clear focus and force input refresh
    setTimeout(() => {
      const activeElement = document.activeElement as HTMLElement;
      if (activeElement && typeof activeElement.blur === 'function') {
        activeElement.blur();
      }
      
      // Force refresh all inputs
      forceInputRefresh();
    }, 0);
    
    console.log('=== FORM RESET END ===');
  }, [forceInputRefresh]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.customerName || !formData.mobile || !formData.address || !formData.itemName || !formData.item || !formData.weight || !formData.tunch || !formData.wastage || !date) {
      toast({
        title: "Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    // Single API call to create bill (will handle customer creation internally)
    createBillMutation.mutate({
      customer_id: selectedCustomer?.id,
      customer_name: formData.customerName,
      customer_mobile: formData.mobile,
      customer_address: formData.address,
      item_name: formData.itemName,
      item: formData.item,
      weight: parseFloat(formData.weight),
      tunch: parseFloat(formData.tunch || "0"),
      wages: parseFloat(formData.wages || "0"),
      wastage: parseFloat(formData.wastage || "0"),
      silver_amount: parseFloat(formData.silverAmount || "0"),
      payment_type: paymentType,
      slip_no: formData.slipNo,
      description: formData.description,
      date: format(date, "yyyy-MM-dd"),
      return_product: returnProduct,
    });
  };

  // Debug logging for input states
  useEffect(() => {
    console.log('Form data updated:', formData);
  }, [formData]);

  // Force refresh inputs when bills data changes (after delete operations)
  useEffect(() => {
    console.log('Bills data changed, forcing input refresh');
    
    // Force all inputs to refresh
    setTimeout(() => {
      const inputs = document.querySelectorAll('input, textarea, select');
      inputs.forEach((input) => {
        const htmlInput = input as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
        if (htmlInput) {
          // Force re-focus and blur to refresh input state
          const currentValue = htmlInput.value;
          htmlInput.blur();
          htmlInput.focus();
          htmlInput.blur();
          
          // For React controlled inputs, trigger change event
          const event = new Event('change', { bubbles: true });
          htmlInput.dispatchEvent(event);
        }
      });
    }, 100);
    
    // Increment form key to force re-render
    setFormKey(prev => prev + 1);
  }, [bills.length]); // Trigger when bills array length changes (indicating delete/add)

  // Additional effect to handle any data mutations
  useEffect(() => {
    // Listen for any query invalidations that might indicate data changes
    const handleDataChange = () => {
      console.log('Data change detected, refreshing form');
      setFormKey(prev => prev + 1);
    };

    // Force refresh after a short delay when component mounts or data changes
    const timer = setTimeout(handleDataChange, 50);
    return () => clearTimeout(timer);
  }, [customers.length, stockItems.length]); // Trigger on any data changes

  return (
    <>
      <AppSidebar />
      <div className={`transition-all duration-300 ${isOpen ? "ml-64" : "ml-16"}`}>
        <Navbar />
        <div className="h-screen overflow-hidden bg-gray-50 flex flex-col" key={formKey}>
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
                    <form onSubmit={handleSubmit} className="space-y-4" key={`form-${formKey}`}>
                      {/* Customer Information */}
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <h3 className="text-base font-semibold text-gray-800 mb-3">Customer Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div>
                            <Label htmlFor="customerName" className="text-sm">Customer Name *</Label>
                            <CustomerSearch
                              key={`customer-search-${formKey}`}
                              value={formData.customerName}
                              onValueChange={handleCustomerNameChange}
                              onCustomerSelect={handleCustomerSelect}
                              onMobileChange={(value) => handleInputChange('mobile', value)}
                              onAddressChange={(value) => handleInputChange('address', value)}
                              placeholder="Enter customer name"
                              className="border-gray-300 focus:border-blue-500 text-sm"
                            />
                          </div>
                          <div>
                            <Label htmlFor="mobile" className="text-sm">Mobile *</Label>
                            <Input
                              key={`mobile-${formKey}`}
                              id="mobile"
                              value={formData.mobile}
                              onChange={(e) => handleInputChange('mobile', e.target.value)}
                              placeholder="Enter mobile number"
                              className="border-gray-300 focus:border-blue-500 text-sm"
                            />
                          </div>
                          <div>
                            <Label htmlFor="address" className="text-sm">Address *</Label>
                            <Input
                              key={`address-${formKey}`}
                              id="address"
                              value={formData.address}
                              onChange={(e) => handleInputChange('address', e.target.value)}
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
                              key={`itemName-${formKey}`}
                              id="itemName"
                              value={formData.itemName}
                              onChange={(e) => handleInputChange('itemName', e.target.value)}
                              placeholder="Enter item name"
                              className="border-gray-300 focus:border-blue-500 text-sm"
                            />
                          </div>
                          <div>
                            <Label htmlFor="item" className="text-sm">Item Type *</Label>
                            <Select 
                              key={`item-select-${formKey}`}
                              value={formData.item} 
                              onValueChange={(value) => handleInputChange('item', value)}
                            >
                              <SelectTrigger className="border-gray-300 text-sm">
                                <SelectValue placeholder="Select item type" />
                              </SelectTrigger>
                              <SelectContent>
                                {stockItems.map((stockItem) => (
                                  <SelectItem key={stockItem.id} value={stockItem.item_name}>
                                    {stockItem.item_name} ({stockItem.current_weight.toFixed(2)}g)
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="slipNo" className="text-sm">Slip Number</Label>
                            <Input
                              key={`slipNo-${formKey}`}
                              id="slipNo"
                              value={formData.slipNo}
                              onChange={(e) => handleInputChange('slipNo', e.target.value)}
                              placeholder="Enter slip number"
                              className="border-gray-300 focus:border-blue-500 text-sm"
                            />
                          </div>
                          <div>
                            <Label htmlFor="date" className="text-sm">Date *</Label>
                            <Popover key={`date-popover-${formKey}`}>
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
                            <Label htmlFor="billType" className="text-sm">Bill Type</Label>
                            <Select 
                              key={`payment-type-${formKey}`}
                              value={paymentType} 
                              onValueChange={(value: "credit" | "debit") => setPaymentType(value)}
                            >
                              <SelectTrigger className="border-gray-300 text-sm">
                                <SelectValue placeholder="Select bill type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="credit">Credit</SelectItem>
                                <SelectItem value="debit">Debit</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label htmlFor="weight" className="text-sm">Weight (grams) *</Label>
                            <Input
                              key={`weight-${formKey}`}
                              id="weight"
                              type="number"
                              step="0.01"
                              value={formData.weight}
                              onChange={(e) => handleInputChange('weight', e.target.value)}
                              placeholder="0.00"
                              className="border-gray-300 focus:border-blue-500 text-sm"
                            />
                          </div>
                          <div>
                            <Label htmlFor="tunch" className="text-sm">Tunch *</Label>
                            <Input
                              key={`tunch-${formKey}`}
                              id="tunch"
                              type="number"
                              step="0.01"
                              value={formData.tunch}
                              onChange={(e) => handleInputChange('tunch', e.target.value)}
                              placeholder="0.00"
                              className="border-gray-300 focus:border-blue-500 text-sm"
                            />
                          </div>
                          <div>
                            <Label htmlFor="wastage" className="text-sm">Wastage *</Label>
                            <Input
                              key={`wastage-${formKey}`}
                              id="wastage"
                              type="number"
                              value={formData.wastage}
                              onChange={(e) => handleInputChange('wastage', e.target.value)}
                              placeholder="0.00"
                              className="border-gray-300 focus:border-blue-500 text-sm"
                            />
                          </div>
                          {paymentType === 'debit' && (
                            <>
                              <div>
                                <Label htmlFor="wages" className="text-sm">Wages(Per KG)</Label>
                                <Input
                                  key={`wages-${formKey}`}
                                  id="wages"
                                  type="number"
                                  value={formData.wages}
                                  onChange={(e) => handleInputChange('wages', e.target.value)}
                                  placeholder="0.00"
                                  className="border-gray-300 focus:border-blue-500 text-sm"
                                />
                              </div>
                            </>
                          )}
                          <div>
                            <Label htmlFor="silverAmount" className="text-sm">Amount</Label>
                            <Input
                              key={`silverAmount-${formKey}`}
                              id="silverAmount"
                              type="number"
                              value={formData.silverAmount}
                              onChange={(e) => handleInputChange('silverAmount', e.target.value)}
                              placeholder="0.00"
                              className="border-gray-300 focus:border-blue-500 text-sm"
                            />
                          </div>
                          {paymentType === 'credit' && (
                            <div className="flex items-end mt-4">
                              <Button
                                key={`return-button-${formKey}`}
                                type="button"
                                variant={returnProduct ? "default" : "outline"}
                                onClick={() => setReturnProduct(!returnProduct)}
                                className={`text-xs px-3 py-2 ${returnProduct ? "bg-yellow-100 text-yellow-800" : ""}`}
                              >
                                {returnProduct ? "Return Enabled" : "Mark as Return"}
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Calculated Results */}
                      <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                        <h3 className="text-base font-semibold text-blue-800 mb-3">Calculated Results</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <Label className="text-sm">Total Fine (grams)</Label>
                            <Input
                              key={`total-fine-${formKey}`}
                              value={totalFine.toFixed(2)}
                              readOnly
                              className="bg-white font-semibold text-blue-600 text-sm"
                            />
                          </div>
                          <div>
                            <Label className="text-sm">Total Amount</Label>
                            <Input
                              key={`total-amount-${formKey}`}
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
                            key={`description-${formKey}`}
                            id="description"
                            value={formData.description}
                            onChange={(e) => handleInputChange('description', e.target.value)}
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
                              <div className="text-xs text-gray-600 font-medium">{bill.customer_name}</div>
                              <div className="text-xs text-gray-500">{bill.item}</div>
                              {bill.slip_no && <div className="text-xs text-blue-600">Slip: {bill.slip_no}</div>}
                              <div className="text-xs text-gray-500">{format(new Date(bill.date), 'dd/MM/yyyy')}</div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-green-600 text-sm">₹{bill.total_amount.toFixed(2)}</div>
                              <div className="font-bold text-green-600 text-sm">{bill.total_fine.toFixed(2)}g</div>
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
              {selectedBillForPrint && firmSettings && (
                <BillPrint bill={selectedBillForPrint} firmSettings={firmSettings} />
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </>
  );
};

export default BillingPage;
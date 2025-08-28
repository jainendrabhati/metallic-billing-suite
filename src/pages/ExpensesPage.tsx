import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Calendar as CalendarIcon, CreditCard, Edit, TrendingUp, MinusCircle, Scale,TrendingDown, IndianRupee } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { expenseAPI, Expense } from "@/services/api";
import AppSidebar from "@/components/AppSidebar";
import { useSidebar } from "@/components/SidebarProvider";
import Navbar from "@/components/Navbar";

const ExpensesPage = () => {
  const { isOpen } = useSidebar();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Form state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState<"paid" | "pending">("pending");
  const [date, setDate] = useState<Date | undefined>(new Date());
  
  // Date filter state
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // Fetch expenses with date filter applied on backend
  const { data: expensesResponse } = useQuery({
    queryKey: ['expenses', fromDate, toDate],
    queryFn: () => {
      const params = new URLSearchParams();
      if (fromDate) params.append('from_date', fromDate);
      if (toDate) params.append('to_date', toDate);
      return fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'}/expenses?${params.toString()}`)
        .then(res => res.json());
    },
  });

  // Mutations
  const createExpenseMutation = useMutation({
    mutationFn: expenseAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      toast({
        title: "Success",
        description: "Expense created successfully!",
      });
      resetForm();
      setIsDialogOpen(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create expense.",
        variant: "destructive",
      });
    },
  });

  const updateExpenseMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Expense> }) => 
      expenseAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      toast({
        title: "Success",
        description: "Expense updated successfully!",
      });
      resetForm();
      setIsDialogOpen(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update expense.",
        variant: "destructive",
      });
    },
  });

  // Reset form
  const resetForm = () => {
    setDescription("");
    setAmount("");
    setCategory("");
    setStatus("pending" as "paid" | "pending");
    setDate(new Date());
    setEditingExpense(null);
  };

  // Handle edit
  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setDescription(expense.description);
    setAmount(expense.amount.toString());
    setCategory(expense.category);
    setStatus(expense.status as "paid" | "pending");
    setDate(new Date(expense.date));
    setIsDialogOpen(true);
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!description || !amount  || !date) {
      toast({
        title: "Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    const expenseData = {
      description,
      amount: parseFloat(amount),
      category,
      status,
      date: format(date, "yyyy-MM-dd"),
    };

    if (editingExpense) {
      updateExpenseMutation.mutate({
        id: editingExpense.id,
        data: expenseData,
      });
    } else {
      createExpenseMutation.mutate(expenseData);
    }
  };

  // Extract data from response
  const expenses = expensesResponse?.expenses || [];
  const dashboardData = expensesResponse?.dashboard || {};

  return (
    <>
      <AppSidebar />
      <div className={`transition-all duration-300 ${isOpen ? "ml-64" : "ml-16"}`}>
        <Navbar />
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-slate-900">Expense Management & Analytics</h1>
                <p className="text-slate-600 mt-1">Track expenses and financial overview</p>
              </div>
              <div className="flex gap-3">
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700" onClick={resetForm}>
                      <Plus className="h-4 w-4" />
                      Add Expense
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-white">
                    <DialogHeader>
                      <DialogTitle className="text-slate-900">
                        {editingExpense ? "Edit Expense" : "Add New Expense"}
                      </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div>
                        <Label htmlFor="description" className="text-slate-700">Description *</Label>
                        <Textarea
                          id="description"
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          placeholder="Enter expense description"
                          rows={3}
                          className="border-slate-300"
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="amount" className="text-slate-700">Amount *</Label>
                          <Input
                            id="amount"
                            type="number"
                            step="0.01"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="0.00"
                            className="border-slate-300"
                          />
                        </div>
                        
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="status" className="text-slate-700">Status *</Label>
                          <Select value={status} onValueChange={(value: "paid" | "pending") => setStatus(value)}>
                            <SelectTrigger className="border-slate-300">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="paid">Paid</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-slate-700">Date *</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full justify-start text-left font-normal border-slate-300",
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

                      <Button 
                        type="submit" 
                        className="w-full bg-blue-600 hover:bg-blue-700"
                        disabled={createExpenseMutation.isPending || updateExpenseMutation.isPending}
                      >
                        {createExpenseMutation.isPending || updateExpenseMutation.isPending 
                          ? "Saving..." 
                          : editingExpense ? "Update Expense" : "Add Expense"
                        }
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {/* Date Filter Section */}
            <Card className="border-0 shadow-lg bg-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5" />
                  Date Filter
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="fromDate">From Date</Label>
                    <Input
                      type="date"
                      id="fromDate"
                      value={fromDate}
                      onChange={(e) => setFromDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="toDate">To Date</Label>
                    <Input
                      type="date"
                      id="toDate"
                      value={toDate}
                      onChange={(e) => setToDate(e.target.value)}
                    />
                  </div>
                  <div className="flex items-end">
                    <Button 
                      onClick={() => { setFromDate(""); setToDate(""); }} 
                      variant="outline" 
                      className="w-full"
                    >
                      Clear Filter
                    </Button>
                  </div>
                </div>
                {(fromDate || toDate) && (
                  <div className="mt-2 text-sm text-blue-600">
                    Active filter: {fromDate ? format(new Date(fromDate), 'dd/MM/yyyy') : 'All'} to {toDate ? format(new Date(toDate), 'dd/MM/yyyy') : 'All'}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Enhanced Dashboard Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="border-0 shadow-lg bg-gradient-to-r from-red-500 to-red-600 text-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-red-100">Total Expenses</p>
                      <p className="text-2xl font-bold">₹{dashboardData?.total_expenses?.toLocaleString() || 0}</p>
                    </div>
                    <CreditCard className="h-8 w-8 text-red-200" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-100">Total Bill Amount (Debit)</p>
                      <p className="text-2xl font-bold">₹{dashboardData?.total_bill_amount?.toLocaleString() || 0}</p>
                    </div>
                    <TrendingDown className="h-8 w-8 text-blue-200" />
                    
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg bg-gradient-to-r from-green-500 to-green-600 text-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-100">Total Revenue (Credit)</p>
                      <p className="text-2xl font-bold">₹{dashboardData?.total_revenue?.toLocaleString() || 0}</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-green-200" />
                  </div>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-lg bg-gradient-to-r from-yellow-500 to-yellow-600 text-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-yellow-100">Total Balance</p>
                      <p className="text-2xl font-bold"> ₹{dashboardData?.balance_sheet?.rupee_balance?.toLocaleString() || 0}</p>
                    </div>
                    <IndianRupee className="h-8 w-8 text-yellow-200" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Balance Sheet */}
            <Card className="border-0 shadow-lg bg-white">
              <CardHeader className="bg-gradient-to-r from-slate-600 to-slate-700 text-white rounded-t-lg">
                <CardTitle className="text-xl">Balance Sheet</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {/* Net Fine for each stock item */}
                  {dashboardData?.net_fine_by_item && Object.entries(dashboardData.net_fine_by_item).map(([itemName, netFine]) => (
                    <div
                        key={itemName}
                        className=" p-6 rounded-lg border border-blue-200"
                      >
                        <h3 className="text-lg font-semibold text-blue-800 mb-2">{itemName}</h3>
                        <p className="text-2xl font-bold text-blue-600">
                          {Number(netFine).toFixed(2)} grams
                        </p>

                        {/* Bottom section with Credit & Debit */}
                        <div className="flex justify-between mt-2">
                          <div className="flex-1 mr-2 bg-green-50 border border-green-200 rounded-lg p-2 text-center">
                            <h4 className="text-xs font-medium text-green-700">Credit</h4>
                            <p className="text-md font-semibold text-green-700">
                              {Number(dashboardData?.credit_fine_by_item?.[itemName] || 0).toFixed(2)} g
                            </p>
                          </div>
                          <div className="flex-1 ml-2 bg-red-50 border border-red-200 rounded-lg p-2 text-center">
                            <h4 className="text-xs font-medium text-red-700">Debit</h4>
                            <p className="text-md font-semibold text-red-700">
                              {Number(dashboardData?.debit_fine_by_item?.[itemName] || 0).toFixed(2)} g
                            </p>
                          </div>
                        </div>
                      </div>
                  ))}
                  
                 
                </div>
              </CardContent>
            </Card>

            {/* Recent Expenses */}
             <Card className="border-0 bg-card" style={{ boxShadow: "var(--shadow-card)" }}>
              <CardHeader className="bg-secondary border-b border-border rounded-t-lg">
                <CardTitle className="text-lg font-semibold text-foreground">Recent Expenses Log</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                       <tr className="border-b border-border bg-secondary">
                        <th className="text-left py-3 px-4 font-semibold text-foreground">Description</th>
                        <th className="text-left py-3 px-4 font-semibold text-foreground">Amount</th>
                        <th className="text-left py-3 px-4 font-semibold text-foreground">Date</th>
                        
                        <th className="text-left py-3 px-4 font-semibold text-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expenses.map((expense: Expense) => (
                        <tr key={expense.id} className="border-b border-slate-200 hover:bg-slate-50">
                          <td className="py-3 px-4 text-sm text-slate-900">{expense.description}</td>
                          <td className="py-3 px-4 font-semibold text-slate-900">₹{expense.amount.toLocaleString()}</td>
                         
                          <td className="py-3 px-4 text-sm text-slate-700">{format(new Date(expense.date), 'dd/MM/yyyy')}</td>
                          
                          <td className="py-3 px-4">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleEdit(expense)}
                              className="flex items-center gap-1 border-slate-300"
                            >
                              <Edit className="h-3 w-3" />
                              Edit
                            </Button>
                          </td>
                        </tr>
                      ))}
                      {expenses.length === 0 && (
                        <tr>
                          <td colSpan={6} className="text-center py-8 text-slate-500">
                            No expenses found. Add your first expense to get started.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
};

export default ExpensesPage;

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
import { Plus, Calendar as CalendarIcon, CreditCard, Edit, TrendingUp, DollarSign, Scale } from "lucide-react";
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

  // Fetch expenses and dashboard data
  const { data: expenses = [] } = useQuery({
    queryKey: ['expenses'],
    queryFn: expenseAPI.getAll,
  });

  const { data: dashboardData } = useQuery({
    queryKey: ['expenses', 'dashboard'],
    queryFn: expenseAPI.getDashboard,
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
    
    if (!description || !amount || !category || !date) {
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
                    <div>
                      <Label htmlFor="category" className="text-slate-700">Category *</Label>
                      <Select value={category} onValueChange={setCategory}>
                        <SelectTrigger className="border-slate-300">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Fixed">Fixed</SelectItem>
                          <SelectItem value="Variable">Variable</SelectItem>
                          <SelectItem value="Capital">Capital</SelectItem>
                          <SelectItem value="Operational">Operational</SelectItem>
                          <SelectItem value="Employee Salary">Employee Salary</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
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

          <Card className="border-0 shadow-lg bg-gradient-to-r from-green-500 to-green-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100">Net Fine Balance</p>
                  <p className="text-2xl font-bold">{dashboardData?.net_fine?.toFixed(2) || 0}g</p>
                  <p className="text-xs text-green-200">Credit Fine - Debit Weight×Tunch</p>
                </div>
                <Scale className="h-8 w-8 text-green-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100">Total Bill Amount</p>
                  <p className="text-2xl font-bold">₹{dashboardData?.total_bill_amount?.toLocaleString() || 0}</p>
                </div>
                <DollarSign className="h-8 w-8 text-blue-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-r from-purple-500 to-purple-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100">Total Revenue</p>
                  <p className="text-2xl font-bold">₹{dashboardData?.total_silver_amount?.toLocaleString() || 0}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-purple-200" />
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gradient-to-r from-green-50 to-green-100 p-6 rounded-lg border border-green-200">
                <h3 className="text-lg font-semibold text-green-800 mb-2">Silver Balance</h3>
                <p className="text-3xl font-bold text-green-600">
                  {dashboardData?.balance_sheet?.silver_balance?.toFixed(2) || '0.0000'} grams
                </p>
                <p className="text-sm text-green-700 mt-2">Net silver in stock</p>
              </div>
              
              <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-6 rounded-lg border border-blue-200">
                <h3 className="text-lg font-semibold text-blue-800 mb-2">Rupee Balance</h3>
                <p className="text-3xl font-bold text-blue-600">
                  ₹{dashboardData?.balance_sheet?.rupee_balance?.toLocaleString() || 0}
                </p>
                <p className="text-sm text-blue-700 mt-2">Revenue - Expenses</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Expenses */}
        <Card className="border-0 shadow-lg bg-white">
          <CardHeader className="bg-slate-50 border-b border-slate-200 rounded-t-lg">
            <CardTitle className="text-lg font-semibold text-slate-800">Recent Expenses Log</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Description</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Amount</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Category</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Date</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Status</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((expense) => (
                    <tr key={expense.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-4 font-medium text-slate-900">{expense.description}</td>
                      <td className="py-3 px-4 font-semibold text-slate-900">₹{expense.amount.toLocaleString()}</td>
                      <td className="py-3 px-4 text-slate-700">{expense.category}</td>
                      <td className="py-3 px-4 text-slate-700">{format(new Date(expense.date), 'dd/MM/yyyy')}</td>
                      <td className="py-3 px-4">
                        <Badge 
                          variant={expense.status === 'paid' ? 'default' : 'secondary'}
                          className={expense.status === 'paid' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-orange-100 text-orange-800'
                          }
                        >
                          {expense.status}
                        </Badge>
                      </td>
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

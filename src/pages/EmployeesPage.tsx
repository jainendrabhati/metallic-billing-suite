import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { employeeAPI, employeePaymentAPI, Employee, EmployeePayment } from "@/services/api";
import { Plus, UserPlus, CalendarIcon, FileText, Wallet } from "lucide-react";
import StockManagement from "@/components/StockManagement";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const EmployeesPage = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [employeeName, setEmployeeName] = useState("");
  const [employeePosition, setEmployeePosition] = useState("");
  const [monthlySalary, setMonthlySalary] = useState("");
  const [presentDays, setPresentDays] = useState("");
  const [totalDays, setTotalDays] = useState("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState<Date | undefined>(new Date());
  const [paymentDescription, setPaymentDescription] = useState("");

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: employeeAPI.getAll,
  });

  const { data: employeePayments = [] } = useQuery({
    queryKey: ['employeePayments', selectedEmployeeId],
    queryFn: () => selectedEmployeeId ? employeePaymentAPI.getByEmployeeId(selectedEmployeeId) : [],
    enabled: !!selectedEmployeeId,
  });

  const createEmployeeMutation = useMutation({
    mutationFn: employeeAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast({
        title: "Success",
        description: "Employee created successfully!",
      });
      resetForm();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create employee. Please try again.",
        variant: "destructive",
      });
    },
  });

  const createEmployeePaymentMutation = useMutation({
    mutationFn: employeePaymentAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employeePayments', selectedEmployeeId] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast({
        title: "Success",
        description: "Payment recorded successfully!",
      });
      resetPaymentForm();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to record payment. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeName || !employeePosition || !monthlySalary || !presentDays || !totalDays) {
      toast({
        title: "Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    createEmployeeMutation.mutate({
      name: employeeName,
      position: employeePosition,
      monthly_salary: parseFloat(monthlySalary),
      present_days: parseInt(presentDays),
      total_days: parseInt(totalDays),
    });
  };

  const handleCreatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentAmount || !paymentDate || !selectedEmployeeId) {
      toast({
        title: "Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    createEmployeePaymentMutation.mutate({
      employee_id: selectedEmployeeId,
      amount: parseFloat(paymentAmount),
      payment_date: format(paymentDate, "yyyy-MM-dd"),
      description: paymentDescription,
    });
  };

  const resetForm = () => {
    setIsDialogOpen(false);
    setEmployeeName("");
    setEmployeePosition("");
    setMonthlySalary("");
    setPresentDays("");
    setTotalDays("");
  };

  const resetPaymentForm = () => {
    setPaymentAmount("");
    setPaymentDate(new Date());
    setPaymentDescription("");
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-500">Loading employees...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 bg-gray-50 min-h-screen p-6">
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b bg-gradient-to-r from-purple-600 to-purple-700">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">Employee & Stock Management</h1>
              <p className="text-purple-100 mt-1">Comprehensive employee payroll and inventory management</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <Tabs defaultValue="employees" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="employees">Employee Management</TabsTrigger>
              <TabsTrigger value="stock">Stock Management</TabsTrigger>
            </TabsList>
            
            <TabsContent value="employees" className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Employee Management</h2>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold">
                      <UserPlus className="h-4 w-4" />
                      Add New Employee
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Create New Employee</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCreateEmployee} className="space-y-4">
                      <div>
                        <Label htmlFor="employeeName">Employee Name</Label>
                        <Input
                          id="employeeName"
                          value={employeeName}
                          onChange={(e) => setEmployeeName(e.target.value)}
                          placeholder="Enter employee name"
                        />
                      </div>
                      <div>
                        <Label htmlFor="employeePosition">Position</Label>
                        <Input
                          id="employeePosition"
                          value={employeePosition}
                          onChange={(e) => setEmployeePosition(e.target.value)}
                          placeholder="Enter position"
                        />
                      </div>
                      <div>
                        <Label htmlFor="monthlySalary">Monthly Salary</Label>
                        <Input
                          id="monthlySalary"
                          type="number"
                          step="0.01"
                          value={monthlySalary}
                          onChange={(e) => setMonthlySalary(e.target.value)}
                          placeholder="Enter monthly salary"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="presentDays">Present Days</Label>
                          <Input
                            id="presentDays"
                            type="number"
                            value={presentDays}
                            onChange={(e) => setPresentDays(e.target.value)}
                            placeholder="Enter present days"
                          />
                        </div>
                        <div>
                          <Label htmlFor="totalDays">Total Days</Label>
                          <Input
                            id="totalDays"
                            type="number"
                            value={totalDays}
                            onChange={(e) => setTotalDays(e.target.value)}
                            placeholder="Enter total days"
                          />
                        </div>
                      </div>
                      <Button type="submit" className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold">
                        {createEmployeeMutation.isPending ? "Creating..." : "Create Employee"}
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>

              <Card className="border-0 shadow-sm">
                <CardHeader className="bg-gray-50 border-b">
                  <CardTitle className="text-lg font-semibold text-gray-800">Employee List</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50">
                          <TableHead className="font-semibold text-gray-700">Employee ID</TableHead>
                          <TableHead className="font-semibold text-gray-700">Name</TableHead>
                          <TableHead className="font-semibold text-gray-700">Position</TableHead>
                          <TableHead className="font-semibold text-gray-700">Salary</TableHead>
                          <TableHead className="font-semibold text-gray-700">Present Days</TableHead>
                          <TableHead className="font-semibold text-gray-700">Total Days</TableHead>
                          <TableHead className="font-semibold text-gray-700">Calculated Salary</TableHead>
                          <TableHead className="font-semibold text-gray-700">Paid Amount</TableHead>
                          <TableHead className="font-semibold text-gray-700">Remaining Amount</TableHead>
                          <TableHead className="font-semibold text-gray-700">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {employees.map((employee) => (
                          <TableRow key={employee.id} className="hover:bg-gray-50 border-b border-gray-100">
                            <TableCell className="font-medium text-gray-900">EMP-{employee.id.toString().padStart(4, '0')}</TableCell>
                            <TableCell className="text-gray-700">{employee.name}</TableCell>
                            <TableCell className="text-gray-700">{employee.position}</TableCell>
                            <TableCell className="text-gray-700">₹{employee.monthly_salary.toLocaleString()}</TableCell>
                            <TableCell className="text-gray-700">{employee.present_days}</TableCell>
                            <TableCell className="text-gray-700">{employee.total_days}</TableCell>
                            <TableCell className="font-semibold text-blue-600">₹{employee.calculated_salary.toLocaleString()}</TableCell>
                            <TableCell className="text-green-600">₹{employee.paid_amount.toLocaleString()}</TableCell>
                            <TableCell className="font-bold text-red-600">₹{employee.remaining_amount.toLocaleString()}</TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="border-gray-300 hover:bg-gray-50"
                                      onClick={() => setSelectedEmployeeId(employee.id)}
                                    >
                                      View Payments
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="max-w-2xl">
                                    <DialogHeader>
                                      <DialogTitle className="text-2xl font-bold text-gray-900">
                                        Payment History - {employee.name}
                                      </DialogTitle>
                                    </DialogHeader>
                                    <form onSubmit={handleCreatePayment} className="space-y-4">
                                      <div>
                                        <Label htmlFor="paymentAmount">Payment Amount</Label>
                                        <Input
                                          id="paymentAmount"
                                          type="number"
                                          step="0.01"
                                          value={paymentAmount}
                                          onChange={(e) => setPaymentAmount(e.target.value)}
                                          placeholder="Enter payment amount"
                                        />
                                      </div>
                                      <div>
                                        <Label htmlFor="paymentDate">Payment Date</Label>
                                        <Popover>
                                          <PopoverTrigger asChild>
                                            <Button
                                              variant="outline"
                                              className={cn(
                                                "w-full justify-start text-left font-normal",
                                                !paymentDate && "text-muted-foreground"
                                              )}
                                            >
                                              <CalendarIcon className="mr-2 h-4 w-4" />
                                              {paymentDate ? format(paymentDate, "PPP") : <span>Pick a date</span>}
                                            </Button>
                                          </PopoverTrigger>
                                          <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar
                                              mode="single"
                                              selected={paymentDate}
                                              onSelect={setPaymentDate}
                                              disabled={(date) => date > new Date()}
                                              initialFocus
                                              className="p-3 pointer-events-auto"
                                            />
                                          </PopoverContent>
                                        </Popover>
                                      </div>
                                      <div>
                                        <Label htmlFor="paymentDescription">Description</Label>
                                        <Input
                                          id="paymentDescription"
                                          value={paymentDescription}
                                          onChange={(e) => setPaymentDescription(e.target.value)}
                                          placeholder="Enter description"
                                        />
                                      </div>
                                      <Button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold">
                                        Record Payment
                                      </Button>
                                    </form>

                                    <Card className="mt-6">
                                      <CardHeader>
                                        <CardTitle>Payment History</CardTitle>
                                      </CardHeader>
                                      <CardContent className="p-0">
                                        <Table>
                                          <TableHeader>
                                            <TableRow>
                                              <TableHead>Date</TableHead>
                                              <TableHead>Amount</TableHead>
                                              <TableHead>Description</TableHead>
                                            </TableRow>
                                          </TableHeader>
                                          <TableBody>
                                            {employeePayments.map((payment) => (
                                              <TableRow key={payment.id}>
                                                <TableCell>{format(new Date(payment.payment_date), "dd/MM/yyyy")}</TableCell>
                                                <TableCell>₹{payment.amount.toLocaleString()}</TableCell>
                                                <TableCell>{payment.description}</TableCell>
                                              </TableRow>
                                            ))}
                                          </TableBody>
                                        </Table>
                                      </CardContent>
                                    </Card>
                                  </DialogContent>
                                </Dialog>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="stock" className="space-y-6">
              <StockManagement />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default EmployeesPage;

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Users, Plus, DollarSign, Calendar, TrendingUp } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { employeeAPI, employeePaymentAPI } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const EmployeesPage = () => {
  const [name, setName] = useState("");
  const [position, setPosition] = useState("");
  const [monthlySalary, setMonthlySalary] = useState("");
  const [presentDays, setPresentDays] = useState("");
  const [totalDays, setTotalDays] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDescription, setPaymentDescription] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: employeeAPI.getAll,
  });

  const { data: employeePayments = [] } = useQuery({
    queryKey: ['employeePayments', selectedEmployee?.id],
    queryFn: () => employeePaymentAPI.getByEmployeeId(selectedEmployee?.id),
    enabled: !!selectedEmployee,
  });

  const createEmployeeMutation = useMutation({
    mutationFn: employeeAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast({
        title: "Success",
        description: "Employee added successfully!",
      });
      resetForm();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add employee. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateEmployeeMutation = useMutation({
    mutationFn: (data: { id: number; employee: Partial<any> }) => employeeAPI.update(data.id, data.employee),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast({
        title: "Success",
        description: "Employee updated successfully!",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update employee. Please try again.",
        variant: "destructive",
      });
    },
  });

  const createEmployeePaymentMutation = useMutation({
    mutationFn: employeePaymentAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employeePayments', selectedEmployee?.id] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast({
        title: "Success",
        description: "Payment added successfully!",
      });
      setPaymentAmount("");
      setPaymentDescription("");
      setShowPaymentDialog(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add payment. Please try again.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setName("");
    setPosition("");
    setMonthlySalary("");
    setPresentDays("");
    setTotalDays("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !position || !monthlySalary || !presentDays || !totalDays) {
      toast({
        title: "Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    createEmployeeMutation.mutate({
      name,
      position,
      monthly_salary: parseFloat(monthlySalary),
      present_days: parseInt(presentDays),
      total_days: parseInt(totalDays),
      paid_amount: 0, // Initialize with 0
    });
  };

  const handlePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentAmount) {
      toast({
        title: "Error",
        description: "Please enter a valid amount.",
        variant: "destructive",
      });
      return;
    }

    createEmployeePaymentMutation.mutate({
      employee_id: selectedEmployee.id,
      amount: parseFloat(paymentAmount),
      payment_date: format(new Date(), 'yyyy-MM-dd'),
      description: paymentDescription,
    });

    updateEmployeeMutation.mutate({
      id: selectedEmployee.id,
      employee: {
        paid_amount: selectedEmployee.paid_amount + parseFloat(paymentAmount),
      },
    });
  };

  return (
    <div className="space-y-6 bg-gray-50 min-h-screen p-6">
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Employee Management</h1>
            <p className="text-gray-600 mt-1">Manage employee details and track payments</p>
          </div>
        </div>

        <Card className="shadow-lg border-0">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Users className="h-5 w-5" />
              Add New Employee
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter employee name"
                    className="border-gray-300 focus:border-blue-500"
                  />
                </div>
                <div>
                  <Label htmlFor="position">Position</Label>
                  <Input
                    id="position"
                    type="text"
                    value={position}
                    onChange={(e) => setPosition(e.target.value)}
                    placeholder="Enter employee position"
                    className="border-gray-300 focus:border-blue-500"
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
                    className="border-gray-300 focus:border-blue-500"
                  />
                </div>
                <div>
                  <Label htmlFor="presentDays">Present Days</Label>
                  <Input
                    id="presentDays"
                    type="number"
                    value={presentDays}
                    onChange={(e) => setPresentDays(e.target.value)}
                    placeholder="Enter present days"
                    className="border-gray-300 focus:border-blue-500"
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
                    className="border-gray-300 focus:border-blue-500"
                  />
                </div>
              </div>
              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700"
                disabled={createEmployeeMutation.isPending}
              >
                <Plus className="h-4 w-4 mr-2" />
                {createEmployeeMutation.isPending ? "Adding..." : "Add Employee"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-0">
          <CardHeader className="bg-gray-50 border-b">
            <CardTitle className="text-lg font-semibold text-gray-800">Employee List</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="font-semibold text-gray-700">Name</TableHead>
                    <TableHead className="font-semibold text-gray-700">Position</TableHead>
                    <TableHead className="font-semibold text-gray-700">Salary</TableHead>
                    <TableHead className="font-semibold text-gray-700">Present Days</TableHead>
                    <TableHead className="font-semibold text-gray-700">Total Days</TableHead>
                    <TableHead className="font-semibold text-gray-700">Calculated Salary</TableHead>
                    <TableHead className="font-semibold text-gray-700">Paid</TableHead>
                    <TableHead className="font-semibold text-gray-700">Remaining</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map((employee) => (
                    <TableRow key={employee.id} className="hover:bg-gray-50 border-b border-gray-100">
                      <TableCell className="text-gray-700">{employee.name}</TableCell>
                      <TableCell className="text-gray-700">{employee.position}</TableCell>
                      <TableCell className="text-gray-700">{employee.monthly_salary}</TableCell>
                      <TableCell className="text-gray-700">{employee.present_days}</TableCell>
                      <TableCell className="text-gray-700">{employee.total_days}</TableCell>
                      <TableCell className="text-gray-700">{employee.calculated_salary}</TableCell>
                      <TableCell className="text-gray-700">{employee.paid_amount}</TableCell>
                      <TableCell className="text-gray-700">{employee.remaining_amount}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={() => {
                          setSelectedEmployee(employee);
                          setShowPaymentDialog(true);
                        }}>
                          Pay
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {employees.length === 0 && (
                <div className="text-center py-12">
                  <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No employees found</h3>
                  <p className="text-gray-500">New employees will appear here</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add Payment for {selectedEmployee?.name}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="paymentAmount" className="text-right">
                Amount
              </Label>
              <Input
                type="number"
                id="paymentAmount"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="paymentDescription" className="text-right">
                Description
              </Label>
              <Textarea
                id="paymentDescription"
                value={paymentDescription}
                onChange={(e) => setPaymentDescription(e.target.value)}
                className="col-span-3"
              />
            </div>
          </div>
          <form onSubmit={handlePayment}>
            <Button type="submit">
              Add Payment
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EmployeesPage;

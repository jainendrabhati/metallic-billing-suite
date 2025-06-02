import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Users, Plus, Search, History } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { employeeAPI, employeePaymentAPI } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const EmployeesPage = () => {
  const [selectedEmployeeName, setSelectedEmployeeName] = useState("");
  const [newEmployeeName, setNewEmployeeName] = useState("");
  const [position, setPosition] = useState("");
  const [monthlySalary, setMonthlySalary] = useState("");
  const [presentDays, setPresentDays] = useState("");
  const [totalDays, setTotalDays] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDescription, setPaymentDescription] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showPaymentHistory, setShowPaymentHistory] = useState(false);
  const [nameFilter, setNameFilter] = useState("");
  const [positionFilter, setPositionFilter] = useState("all");

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

  const filteredEmployees = employees.filter(employee => 
    employee.name.toLowerCase().includes(nameFilter.toLowerCase()) &&
    (positionFilter === "all" || employee.position.toLowerCase().includes(positionFilter.toLowerCase()))
  );

  const uniqueEmployeeNames = [...new Set(employees.map(emp => emp.name))];
  const uniquePositions = [...new Set(employees.map(emp => emp.position))];

  const existingEmployeeNames = employees.map(emp => emp.name);

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
    setSelectedEmployeeName("");
    setNewEmployeeName("");
    setPosition("");
    setMonthlySalary("");
    setPresentDays("");
    setTotalDays("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const employeeName = selectedEmployeeName === "new" ? newEmployeeName : selectedEmployeeName;
    
    if (!employeeName || !position || !monthlySalary || !presentDays || !totalDays) {
      toast({
        title: "Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    if (selectedEmployeeName === "new" && uniqueEmployeeNames.includes(newEmployeeName)) {
      toast({
        title: "Error",
        description: "Employee with this name already exists.",
        variant: "destructive",
      });
      return;
    }

    if (selectedEmployeeName !== "new" && selectedEmployeeName !== "") {
      const existingEmployee = employees.find(emp => emp.name === selectedEmployeeName);
      if (existingEmployee) {
        updateEmployeeMutation.mutate({
          id: existingEmployee.id,
          employee: {
            position,
            monthly_salary: parseFloat(monthlySalary),
            present_days: parseInt(presentDays),
            total_days: parseInt(totalDays),
          }
        });
        return;
      }
    }

    createEmployeeMutation.mutate({
      name: employeeName,
      position,
      monthly_salary: parseFloat(monthlySalary),
      present_days: parseInt(presentDays),
      total_days: parseInt(totalDays),
      paid_amount: 0,
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

  const handleEmployeeNameChange = (value: string) => {
    setSelectedEmployeeName(value);
    
    if (value !== "new" && value !== "") {
      const employee = employees.find(emp => emp.name === value);
      if (employee) {
        setPosition(employee.position);
        setMonthlySalary(employee.monthly_salary.toString());
        setPresentDays(employee.present_days.toString());
        setTotalDays(employee.total_days.toString());
      }
    } else {
      setPosition("");
      setMonthlySalary("");
      setPresentDays("");
      setTotalDays("");
    }
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
              Add/Update Employee
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="employeeName">Employee Name</Label>
                  <Select value={selectedEmployeeName} onValueChange={handleEmployeeNameChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select existing or add new" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">Add New Employee</SelectItem>
                      {uniqueEmployeeNames.map((name) => (
                        <SelectItem key={name} value={name}>{name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {selectedEmployeeName === "new" && (
                  <div>
                    <Label htmlFor="newEmployeeName">New Employee Name</Label>
                    <Input
                      id="newEmployeeName"
                      type="text"
                      value={newEmployeeName}
                      onChange={(e) => setNewEmployeeName(e.target.value)}
                      placeholder="Enter new employee name"
                      className="border-gray-300 focus:border-blue-500"
                    />
                  </div>
                )}

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
                disabled={createEmployeeMutation.isPending || updateEmployeeMutation.isPending}
              >
                <Plus className="h-4 w-4 mr-2" />
                {selectedEmployeeName !== "new" && selectedEmployeeName !== "" ? "Update Employee" : "Add Employee"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-0">
          <CardHeader className="bg-gray-50 border-b">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold text-gray-800">Employee List</CardTitle>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Search className="h-4 w-4 text-gray-500" />
                  <Input
                    placeholder="Filter by name..."
                    value={nameFilter}
                    onChange={(e) => setNameFilter(e.target.value)}
                    className="w-48"
                  />
                </div>
                <Select value={positionFilter} onValueChange={setPositionFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by position" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Positions</SelectItem>
                    {uniquePositions.map((position) => (
                      <SelectItem key={position} value={position}>{position}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
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
                    <TableHead className="w-[150px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployees.map((employee) => (
                    <TableRow key={employee.id} className="hover:bg-gray-50 border-b border-gray-100">
                      <TableCell className="text-gray-700">{employee.name}</TableCell>
                      <TableCell className="text-gray-700">{employee.position}</TableCell>
                      <TableCell className="text-gray-700">₹{employee.monthly_salary}</TableCell>
                      <TableCell className="text-gray-700">{employee.present_days}</TableCell>
                      <TableCell className="text-gray-700">{employee.total_days}</TableCell>
                      <TableCell className="text-gray-700">₹{employee.calculated_salary}</TableCell>
                      <TableCell className="text-gray-700">₹{employee.paid_amount}</TableCell>
                      <TableCell className="text-gray-700">
                        <Badge variant={employee.remaining_amount > 0 ? "destructive" : "default"}>
                          ₹{employee.remaining_amount}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => {
                            setSelectedEmployee(employee);
                            setShowPaymentDialog(true);
                          }}>
                            Pay
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => {
                            setSelectedEmployee(employee);
                            setShowPaymentHistory(true);
                          }}>
                            <History className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {filteredEmployees.length === 0 && (
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
            <Button type="submit" disabled={createEmployeePaymentMutation.isPending}>
              {createEmployeePaymentMutation.isPending ? "Adding..." : "Add Payment"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showPaymentHistory} onOpenChange={setShowPaymentHistory}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Payment History for {selectedEmployee?.name}</DialogTitle>
          </DialogHeader>
          <div className="max-h-96 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Amount</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employeePayments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>₹{payment.amount}</TableCell>
                    <TableCell>{format(new Date(payment.payment_date), 'dd/MM/yyyy')}</TableCell>
                    <TableCell>{payment.description}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {employeePayments.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No payment history found
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EmployeesPage;

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
import { Users, Plus, Search, History, DollarSign } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { employeeAPI, employeePaymentAPI, employeeSalaryAPI, Employee, EmployeePayment, EmployeeSalary } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import AppSidebar from "@/components/AppSidebar";
import { useSidebar } from "@/components/SidebarProvider";
import Navbar from "@/components/Navbar";


const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const EmployeesPage = () => {
  const [employeeName, setEmployeeName] = useState("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [position, setPosition] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [monthlySalary, setMonthlySalary] = useState("");
  const [presentDays, setPresentDays] = useState("");
  const [totalDays, setTotalDays] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDescription, setPaymentDescription] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showPaymentHistory, setShowPaymentHistory] = useState(false);
  const [showSalaryHistory, setShowSalaryHistory] = useState(false);
  const [nameFilter, setNameFilter] = useState("");
  const [positionFilter, setPositionFilter] = useState("all");
  const [isNewEmployee, setIsNewEmployee] = useState(true);

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isOpen } = useSidebar();

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: employeeAPI.getAll,
  });

  const { data: employeeSalaries = [] } = useQuery({
    queryKey: ['employeeSalaries'],
    queryFn: employeeSalaryAPI.getAll,
  });

  const { data: employeePayments = [] } = useQuery({
    queryKey: ['employeePayments', selectedEmployee?.id],
    queryFn: () => employeePaymentAPI.getByEmployeeId(selectedEmployee?.id || 0),
    enabled: !!selectedEmployee,
  });

  const { data: selectedEmployeeSalaries = [] } = useQuery({
    queryKey: ['employeeSalaries', selectedEmployee?.id],
    queryFn: () => employeeSalaryAPI.getByEmployeeId(selectedEmployee?.id || 0),
    enabled: !!selectedEmployee,
  });

  const filteredEmployees = (employees as Employee[]).filter((employee: Employee) => 
    employee.name.toLowerCase().includes(nameFilter.toLowerCase()) &&
    (positionFilter === "all" || employee.position.toLowerCase().includes(positionFilter.toLowerCase()))
  );

  const uniquePositions = [...new Set((employees as Employee[]).map((emp: Employee) => emp.position))];

  const createEmployeeMutation = useMutation({
    mutationFn: employeeAPI.create,
    onSuccess: (newEmployee) => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast({
        title: "Success",
        description: "Employee added successfully!",
      });
      
      // Now create the salary record for the new employee
      if (selectedMonth && monthlySalary && presentDays && totalDays) {
        createEmployeeSalaryMutation.mutate({
          employee_id: newEmployee.id,
          month: selectedMonth,
          year: parseInt(selectedYear),
          monthly_salary: parseFloat(monthlySalary),
          present_days: parseInt(presentDays),
          total_days: parseInt(totalDays),
        });
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add employee. Please try again.",
        variant: "destructive",
      });
    },
  });

  const createEmployeeSalaryMutation = useMutation({
    mutationFn: employeeSalaryAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['employeeSalaries'] });
      toast({
        title: "Success",
        description: "Employee salary added successfully!",
      });
      resetForm();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add employee salary. Please try again.",
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
    setEmployeeName("");
    setSelectedEmployeeId("");
    setPosition("");
    setSelectedMonth("");
    setSelectedYear(new Date().getFullYear().toString());
    setMonthlySalary("");
    setPresentDays("");
    setTotalDays("");
    setIsNewEmployee(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedMonth || !monthlySalary || !presentDays || !totalDays) {
      toast({
        title: "Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    if (isNewEmployee) {
      if (!employeeName || !position) {
        toast({
          title: "Error",
          description: "Please enter employee name and position.",
          variant: "destructive",
        });
        return;
      }

      // Check if employee already exists
      const existingEmployee = (employees as Employee[]).find((emp: Employee) => 
        emp.name.toLowerCase() === employeeName.toLowerCase()
      );
      
      if (existingEmployee) {
        toast({
          title: "Error",
          description: "Employee with this name already exists.",
          variant: "destructive",
        });
        return;
      }
      
      
      // Create new employee
      createEmployeeMutation.mutate({
        name: employeeName,
        position: position,
        monthly_salary: monthlySalary,
        present_days: presentDays,
        total_days: presentDays,
        paid_amount: 0,
      });
    } else {
      if (!selectedEmployeeId) {
        toast({
          title: "Error",
          description: "Please select an employee.",
          variant: "destructive",
        });
        return;
      }

      // Add salary for existing employee
      createEmployeeSalaryMutation.mutate({
        employee_id: parseInt(selectedEmployeeId),
        month: selectedMonth,
        year: parseInt(selectedYear),
        monthly_salary: parseFloat(monthlySalary),
        present_days: parseInt(presentDays),
        total_days: parseInt(totalDays),
      });
    }
  };

  const handlePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentAmount || !selectedEmployee) {
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
  };

  const handleEmployeeSelection = (value: string) => {
    setSelectedEmployeeId(value);
    
    if (value) {
      const employee = (employees as Employee[]).find((emp: Employee) => emp.id.toString() === value);
      if (employee) {
        setPosition(employee.position);
      }
    } else {
      setPosition("");
    }
  };

  return (
     <>
    <AppSidebar />
          <div className={`transition-all duration-300 ${isOpen ? "ml-64" : "ml-16"}`}>
            <Navbar />
    <div className="space-y-6 bg-gray-50 min-h-screen p-6">
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Employee Management</h1>
            <p className="text-gray-600 mt-1">Manage employee details and track monthly salaries</p>
          </div>
        </div>

        <Card className="shadow-lg border-0">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Users className="h-5 w-5" />
              Add Employee Salary
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-3">
                  <div className="flex gap-4 mb-4">
                    <Button
                      type="button"
                      variant={isNewEmployee ? "default" : "outline"}
                      onClick={() => {
                        setIsNewEmployee(true);
                        setSelectedEmployeeId("");
                        setEmployeeName("");
                        setPosition("");
                      }}
                    >
                      New Employee
                    </Button>
                    <Button
                      type="button"
                      variant={!isNewEmployee ? "default" : "outline"}
                      onClick={() => {
                        setIsNewEmployee(false);
                        setEmployeeName("");
                      }}
                    >
                      Existing Employee
                    </Button>
                  </div>
                </div>

                {isNewEmployee ? (
                  <>
                    <div>
                      <Label htmlFor="employeeName">Employee Name</Label>
                      <Input
                        id="employeeName"
                        type="text"
                        value={employeeName}
                        onChange={(e) => setEmployeeName(e.target.value)}
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
                  </>
                ) : (
                  <>
                    <div>
                      <Label htmlFor="existingEmployee">Select Employee</Label>
                      <Select value={selectedEmployeeId} onValueChange={handleEmployeeSelection}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select an employee" />
                        </SelectTrigger>
                        <SelectContent>
                          {(employees as Employee[]).map((employee: Employee) => (
                            <SelectItem key={employee.id} value={employee.id.toString()}>
                              {employee.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="position">Position</Label>
                      <Input
                        id="position"
                        type="text"
                        value={position}
                        readOnly
                        placeholder="Position will be filled automatically"
                        className="border-gray-300 bg-gray-50"
                      />
                    </div>
                  </>
                )}

                <div>
                  <Label htmlFor="month">Month</Label>
                  <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select month" />
                    </SelectTrigger>
                    <SelectContent>
                      {MONTHS.map((month) => (
                        <SelectItem key={month} value={month}>{month}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="year">Year</Label>
                  <Input
                    id="year"
                    type="number"
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    placeholder="Enter year"
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
                disabled={createEmployeeMutation.isPending || createEmployeeSalaryMutation.isPending}
              >
                <Plus className="h-4 w-4 mr-2" />
                {isNewEmployee ? "Add New Employee & Salary" : "Add Employee Salary"}
              </Button>
            </form>
          </CardContent>
        </Card>

        
        <Card className="shadow-lg border-0">
          <CardHeader className="bg-gray-50 border-b">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold text-gray-800">Employee Summary</CardTitle>
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
                    <TableHead className="font-semibold text-gray-700">Total Calculated</TableHead>
                    <TableHead className="font-semibold text-gray-700">Total Paid</TableHead>
                    <TableHead className="font-semibold text-gray-700">Remaining</TableHead>
                    <TableHead className="w-[200px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployees.map((employee: Employee) => (
                    <TableRow key={employee.id} className="hover:bg-gray-50 border-b border-gray-100">
                      <TableCell className="text-gray-700">{employee.name}</TableCell>
                      <TableCell className="text-gray-700">{employee.position}</TableCell>
                      <TableCell className="text-gray-700">₹{employee.total_calculated_salary || 0}</TableCell>
                      <TableCell className="text-gray-700">₹{employee.total_paid_amount || 0}</TableCell>
                      <TableCell className="text-gray-700">
                        <Badge variant={(employee.remaining_amount || 0) > 0 ? "destructive" : "default"}>
                          ₹{employee.remaining_amount || 0}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => {
                            setSelectedEmployee(employee);
                            setShowPaymentDialog(true);
                          }}>
                            <DollarSign className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => {
                            setSelectedEmployee(employee);
                            setShowPaymentHistory(true);
                          }}>
                            <History className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => {
                            setSelectedEmployee(employee);
                            setShowSalaryHistory(true);
                          }}>
                            <Users className="h-4 w-4" />
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
                {(employeePayments as EmployeePayment[]).map((payment: EmployeePayment) => (
                  <TableRow key={payment.id}>
                    <TableCell>₹{payment.amount}</TableCell>
                    <TableCell>{format(new Date(payment.payment_date), 'dd/MM/yyyy')}</TableCell>
                    <TableCell>{payment.description}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {(employeePayments as EmployeePayment[]).length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No payment history found
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showSalaryHistory} onOpenChange={setShowSalaryHistory}>
        <DialogContent className="sm:max-w-[800px]">
          <DialogHeader>
            <DialogTitle>Salary History for {selectedEmployee?.name}</DialogTitle>
          </DialogHeader>
          <div className="max-h-96 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead>Year</TableHead>
                  <TableHead>Monthly Salary</TableHead>
                  <TableHead>Present Days</TableHead>
                  <TableHead>Total Days</TableHead>
                  <TableHead>Calculated Salary</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(selectedEmployeeSalaries as EmployeeSalary[]).map((salary: EmployeeSalary) => (
                  <TableRow key={salary.id}>
                    <TableCell>{salary.month}</TableCell>
                    <TableCell>{salary.year}</TableCell>
                    <TableCell>₹{salary.monthly_salary}</TableCell>
                    <TableCell>{salary.present_days}</TableCell>
                    <TableCell>{salary.total_days}</TableCell>
                    <TableCell>₹{salary.calculated_salary}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {(selectedEmployeeSalaries as EmployeeSalary[]).length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No salary history found
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
          </div>
     </>
  );
};

export default EmployeesPage;

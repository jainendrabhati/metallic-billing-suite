
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { UserPlus, Calculator, DollarSign, Clock, Users } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { employeeAPI, employeePaymentAPI, expenseAPI } from "@/services/api";
import { format } from "date-fns";

const EmployeesPage = () => {
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDescription, setPaymentDescription] = useState("");
  const [newEmployee, setNewEmployee] = useState({
    name: "",
    position: "",
    monthly_salary: "",
    present_days: "",
    total_days: "",
    paid_amount: "0"
  });
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);

  const queryClient = useQueryClient();

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: employeeAPI.getAll,
  });

  const { data: payments = [] } = useQuery({
    queryKey: ['employee-payments', selectedEmployee?.id],
    queryFn: () => selectedEmployee ? employeePaymentAPI.getByEmployeeId(selectedEmployee.id) : Promise.resolve([]),
    enabled: !!selectedEmployee,
  });

  const createEmployeeMutation = useMutation({
    mutationFn: employeeAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setShowAddDialog(false);
      setNewEmployee({
        name: "", position: "", monthly_salary: "", present_days: "", total_days: "", paid_amount: "0"
      });
    },
  });

  const createPaymentMutation = useMutation({
    mutationFn: async (paymentData: any) => {
      // Create employee payment
      const payment = await employeePaymentAPI.create(paymentData);
      
      // Also create expense entry
      await expenseAPI.create({
        description: `Salary payment for ${selectedEmployee.name} - ${paymentDescription}`,
        amount: parseFloat(paymentAmount),
        category: "Employee Salary",
        status: "paid",
        date: format(new Date(), 'yyyy-MM-dd'),
      });
      
      return payment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-payments'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      setShowPaymentDialog(false);
      setPaymentAmount("");
      setPaymentDescription("");
    },
  });

  const updateEmployeeMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => employeeAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });

  const handleCreateEmployee = () => {
    const monthlyPay = parseFloat(newEmployee.monthly_salary);
    const presentDays = parseInt(newEmployee.present_days);
    const totalDays = parseInt(newEmployee.total_days);
    const paidAmount = parseFloat(newEmployee.paid_amount);
    
    const calculatedSalary = (monthlyPay * presentDays) / totalDays;
    
    createEmployeeMutation.mutate({
      name: newEmployee.name,
      position: newEmployee.position,
      monthly_salary: monthlyPay,
      present_days: presentDays,
      total_days: totalDays,
      paid_amount: paidAmount,
    });
  };

  const handlePayment = () => {
    if (!selectedEmployee || !paymentAmount) return;
    
    createPaymentMutation.mutate({
      employee_id: selectedEmployee.id,
      amount: parseFloat(paymentAmount),
      payment_date: format(new Date(), 'yyyy-MM-dd'),
      description: paymentDescription || "Salary payment",
    });
  };

  const calculateSalary = (monthlySalary: number, presentDays: number, totalDays: number) => {
    return (monthlySalary * presentDays) / totalDays;
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
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Employee Management</h1>
            <p className="text-gray-600 mt-1">Manage employee salaries and attendance records</p>
          </div>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700">
                <UserPlus className="h-4 w-4" />
                Add Employee
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] bg-white">
              <DialogHeader>
                <DialogTitle className="text-xl font-semibold text-gray-900">Add New Employee</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right font-medium">Name</Label>
                  <Input
                    id="name"
                    value={newEmployee.name}
                    onChange={(e) => setNewEmployee({...newEmployee, name: e.target.value})}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="position" className="text-right font-medium">Position</Label>
                  <Input
                    id="position"
                    value={newEmployee.position}
                    onChange={(e) => setNewEmployee({...newEmployee, position: e.target.value})}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="salary" className="text-right font-medium">Monthly Salary</Label>
                  <Input
                    id="salary"
                    type="number"
                    value={newEmployee.monthly_salary}
                    onChange={(e) => setNewEmployee({...newEmployee, monthly_salary: e.target.value})}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="totalDays" className="text-right font-medium">Total Days</Label>
                  <Input
                    id="totalDays"
                    type="number"
                    value={newEmployee.total_days}
                    onChange={(e) => setNewEmployee({...newEmployee, total_days: e.target.value})}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="presentDays" className="text-right font-medium">Present Days</Label>
                  <Input
                    id="presentDays"
                    type="number"
                    value={newEmployee.present_days}
                    onChange={(e) => setNewEmployee({...newEmployee, present_days: e.target.value})}
                    className="col-span-3"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
                <Button onClick={handleCreateEmployee} className="bg-blue-600 hover:bg-blue-700">
                  Add Employee
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card className="border border-blue-200 bg-blue-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Users className="h-8 w-8 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-blue-600">Total Employees</p>
                  <p className="text-2xl font-bold text-blue-900">{employees.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border border-green-200 bg-green-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <DollarSign className="h-8 w-8 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-green-600">Total Salary Budget</p>
                  <p className="text-2xl font-bold text-green-900">
                    ₹{employees.reduce((sum, emp) => sum + emp.monthly_salary, 0).toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border border-purple-200 bg-purple-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Calculator className="h-8 w-8 text-purple-600" />
                <div>
                  <p className="text-sm font-medium text-purple-600">Total Calculated Pay</p>
                  <p className="text-2xl font-bold text-purple-900">
                    ₹{employees.reduce((sum, emp) => sum + calculateSalary(emp.monthly_salary, emp.present_days, emp.total_days), 0).toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border border-orange-200 bg-orange-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Clock className="h-8 w-8 text-orange-600" />
                <div>
                  <p className="text-sm font-medium text-orange-600">Total Outstanding</p>
                  <p className="text-2xl font-bold text-orange-900">
                    ₹{employees.reduce((sum, emp) => sum + (calculateSalary(emp.monthly_salary, emp.present_days, emp.total_days) - emp.paid_amount), 0).toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-0 shadow-sm">
          <CardHeader className="bg-gray-50 border-b">
            <CardTitle className="text-lg font-semibold text-gray-800">Employee Records</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="font-semibold text-gray-700">Employee</TableHead>
                    <TableHead className="font-semibold text-gray-700">Position</TableHead>
                    <TableHead className="font-semibold text-gray-700">Monthly Salary</TableHead>
                    <TableHead className="font-semibold text-gray-700">Attendance</TableHead>
                    <TableHead className="font-semibold text-gray-700">Calculated Salary</TableHead>
                    <TableHead className="font-semibold text-gray-700">Paid Amount</TableHead>
                    <TableHead className="font-semibold text-gray-700">Remaining</TableHead>
                    <TableHead className="font-semibold text-gray-700">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map((employee) => {
                    const calculatedSalary = calculateSalary(employee.monthly_salary, employee.present_days, employee.total_days);
                    const remaining = calculatedSalary - employee.paid_amount;
                    
                    return (
                      <TableRow key={employee.id} className="hover:bg-gray-50 border-b border-gray-100">
                        <TableCell>
                          <div>
                            <p className="font-medium text-gray-900">{employee.name}</p>
                            <p className="text-sm text-gray-500">ID: EMP-{employee.id.toString().padStart(3, '0')}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-gray-700">{employee.position}</TableCell>
                        <TableCell className="font-medium text-gray-900">₹{employee.monthly_salary.toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                            {employee.present_days}/{employee.total_days} days
                          </Badge>
                        </TableCell>
                        <TableCell className="font-bold text-green-600">₹{calculatedSalary.toFixed(2)}</TableCell>
                        <TableCell className="font-medium text-gray-900">₹{employee.paid_amount.toLocaleString()}</TableCell>
                        <TableCell>
                          <span className={`font-bold ${remaining > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            ₹{Math.abs(remaining).toFixed(2)}
                            {remaining > 0 && <span className="text-xs ml-1">(Due)</span>}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedEmployee(employee);
                                setShowPaymentDialog(true);
                              }}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              Pay Salary
                            </Button>
                            <Button variant="outline" size="sm" className="border-gray-300">
                              View Details
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              {employees.length === 0 && (
                <div className="text-center py-12">
                  <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No employees found</h3>
                  <p className="text-gray-500">Get started by adding your first employee</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
          <DialogContent className="sm:max-w-[425px] bg-white">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold text-gray-900">
                Make Payment - {selectedEmployee?.name}
              </DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-600">Calculated Salary:</span>
                    <p className="font-semibold text-gray-900">
                      ₹{selectedEmployee ? calculateSalary(selectedEmployee.monthly_salary, selectedEmployee.present_days, selectedEmployee.total_days).toFixed(2) : 0}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-600">Already Paid:</span>
                    <p className="font-semibold text-gray-900">₹{selectedEmployee?.paid_amount || 0}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-600">Remaining:</span>
                    <p className="font-semibold text-red-600">
                      ₹{selectedEmployee ? (calculateSalary(selectedEmployee.monthly_salary, selectedEmployee.present_days, selectedEmployee.total_days) - selectedEmployee.paid_amount).toFixed(2) : 0}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="amount" className="text-right font-medium">Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="col-span-3"
                  placeholder="Enter payment amount"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="description" className="text-right font-medium">Description</Label>
                <Input
                  id="description"
                  value={paymentDescription}
                  onChange={(e) => setPaymentDescription(e.target.value)}
                  className="col-span-3"
                  placeholder="Payment description (optional)"
                />
              </div>

              {payments.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-medium text-gray-900 mb-2">Recent Payments</h4>
                  <div className="max-h-32 overflow-y-auto space-y-2">
                    {payments.slice(0, 3).map((payment) => (
                      <div key={payment.id} className="flex justify-between text-sm p-2 bg-gray-50 rounded">
                        <span>₹{payment.amount}</span>
                        <span className="text-gray-600">{format(new Date(payment.payment_date), 'dd/MM/yyyy')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>Cancel</Button>
              <Button onClick={handlePayment} className="bg-green-600 hover:bg-green-700">
                Process Payment
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default EmployeesPage;

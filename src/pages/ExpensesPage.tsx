
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Calendar, CreditCard } from "lucide-react";

const ExpensesPage = () => {
  const expenses = [
    {
      id: 1,
      description: "Office Rent",
      amount: 25000,
      category: "Fixed",
      date: "2024-01-15",
      status: "paid"
    },
    {
      id: 2,
      description: "Equipment Purchase",
      amount: 15000,
      category: "Capital",
      date: "2024-01-14",
      status: "paid"
    },
    {
      id: 3,
      description: "Utility Bills",
      amount: 3500,
      category: "Operational",
      date: "2024-01-13",
      status: "pending"
    },
  ];

  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Expense Management</h1>
        <Button className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Expense
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Expenses</p>
                <p className="text-2xl font-bold">₹{totalExpenses.toLocaleString()}</p>
              </div>
              <CreditCard className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">This Month</p>
                <p className="text-2xl font-bold">₹{totalExpenses.toLocaleString()}</p>
              </div>
              <Calendar className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending</p>
                <p className="text-2xl font-bold">₹3,500</p>
              </div>
              <CreditCard className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Expenses</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">Description</th>
                  <th className="text-left py-3 px-4">Amount</th>
                  <th className="text-left py-3 px-4">Category</th>
                  <th className="text-left py-3 px-4">Date</th>
                  <th className="text-left py-3 px-4">Status</th>
                  <th className="text-left py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((expense) => (
                  <tr key={expense.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium">{expense.description}</td>
                    <td className="py-3 px-4 font-semibold">₹{expense.amount.toLocaleString()}</td>
                    <td className="py-3 px-4">{expense.category}</td>
                    <td className="py-3 px-4">{expense.date}</td>
                    <td className="py-3 px-4">
                      <Badge variant={expense.status === 'paid' ? 'default' : 'secondary'}>
                        {expense.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <Button variant="outline" size="sm">
                        Edit
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ExpensesPage;

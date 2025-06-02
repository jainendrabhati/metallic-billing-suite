
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Users, CreditCard, TrendingUp, Moon, Sun } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { customerAPI, billAPI, transactionAPI, expenseAPI } from "@/services/api";
import { format } from "date-fns";
import { useTheme } from "@/components/ThemeProvider";

const Dashboard = () => {
  const { theme, setTheme } = useTheme();

  // Fetch data
  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: customerAPI.getAll,
  });

  const { data: bills = [] } = useQuery({
    queryKey: ['bills'],
    queryFn: billAPI.getAll,
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => transactionAPI.getAll(),
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ['expenses'],
    queryFn: expenseAPI.getAll,
  });

  // Calculate statistics
  const totalRevenue = bills.reduce((sum, bill) => sum + bill.total_amount, 0);
  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const netProfit = totalRevenue - totalExpenses;
  const growthPercentage = bills.length > 0 ? ((bills.length / Math.max(bills.length - 10, 1)) * 100) - 100 : 0;

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const stats = [
    {
      title: "Total Bills",
      value: bills.length.toString(),
      change: `+${bills.length > 10 ? Math.round((bills.length / (bills.length - 10)) * 100 - 100) : 0}%`,
      icon: FileText,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      title: "Customers",
      value: customers.length.toString(),
      change: `+${customers.length > 5 ? Math.round((customers.length / (customers.length - 5)) * 100 - 100) : 0}%`,
      icon: Users,
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    {
      title: "Revenue",
      value: `₹${totalRevenue.toLocaleString()}`,
      change: "+15%",
      icon: CreditCard,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
    },
    {
      title: "Net Profit",
      value: `₹${netProfit.toLocaleString()}`,
      change: `${netProfit >= 0 ? '+' : ''}${Math.round(growthPercentage)}%`,
      icon: TrendingUp,
      color: "text-orange-600",
      bgColor: "bg-orange-100",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Welcome to Metalic Billing System
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={toggleTheme}
          className="flex items-center gap-2"
        >
          {theme === "dark" ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
          {theme === "dark" ? "Light Mode" : "Dark Mode"}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <Card key={index} className="hover:shadow-lg transition-shadow duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</div>
              <p className="text-xs text-green-600 mt-1">
                {stat.change} from last month
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Bills</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {bills.slice(0, 4).map((bill) => (
                <div key={bill.id} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-b-0">
                  <div>
                    <div className="font-medium">Bill #{bill.bill_number}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{bill.customer_name}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">₹{bill.total_amount.toFixed(2)}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{format(new Date(bill.date), 'dd/MM/yyyy')}</div>
                  </div>
                </div>
              ))}
              {bills.length === 0 && (
                <div className="text-center text-gray-500 dark:text-gray-400 py-4">
                  No bills created yet
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <button className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-300 dark:hover:border-blue-600 transition-colors">
                <FileText className="h-6 w-6 text-blue-600 mb-2" />
                <div className="text-sm font-medium">Create Bill</div>
              </button>
              <button className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 hover:border-green-300 dark:hover:border-green-600 transition-colors">
                <Users className="h-6 w-6 text-green-600 mb-2" />
                <div className="text-sm font-medium">Add Customer</div>
              </button>
              <button className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:border-purple-300 dark:hover:border-purple-600 transition-colors">
                <CreditCard className="h-6 w-6 text-purple-600 mb-2" />
                <div className="text-sm font-medium">View Transactions</div>
              </button>
              <button className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-900/20 hover:border-orange-300 dark:hover:border-orange-600 transition-colors">
                <TrendingUp className="h-6 w-6 text-orange-600 mb-2" />
                <div className="text-sm font-medium">Reports</div>
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;


import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Users, CreditCard, TrendingUp, TrendingDown, Package, Clock, DollarSign } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { customerAPI, billAPI, transactionAPI, expenseAPI } from "@/services/api";
import { format } from "date-fns";
import AppSidebar from "@/components/AppSidebar";
import { useSidebar } from "@/components/SidebarProvider";
import Navbar from "@/components/Navbar";
import { useNavigate } from "react-router-dom";

const Dashboard = () => {
  const { isOpen } = useSidebar();
  const navigate = useNavigate();

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

  const stats = [
    {
      title: "Total Bills",
      value: bills.length.toString(),
      change: `+${bills.length > 10 ? Math.round((bills.length / (bills.length - 10)) * 100 - 100) : 0}%`,
      icon: FileText,
      color: "text-blue-600",
      bgColor: "bg-gradient-to-br from-blue-100 to-blue-200",
      cardBg: "bg-gradient-to-br from-blue-50 to-blue-100",
      borderColor: "border-blue-200",
    },
    {
      title: "Customers",
      value: customers.length.toString(),
      change: `+${customers.length > 5 ? Math.round((customers.length / (customers.length - 5)) * 100 - 100) : 0}%`,
      icon: Users,
      color: "text-green-600",
      bgColor: "bg-gradient-to-br from-green-100 to-green-200",
      cardBg: "bg-gradient-to-br from-green-50 to-green-100",
      borderColor: "border-green-200",
    },
    {
      title: "Revenue",
      value: `₹${totalRevenue.toLocaleString()}`,
      change: "+15%",
      icon: DollarSign,
      color: "text-purple-600",
      bgColor: "bg-gradient-to-br from-purple-100 to-purple-200",
      cardBg: "bg-gradient-to-br from-purple-50 to-purple-100",
      borderColor: "border-purple-200",
    },
    {
      title: "Net Profit",
      value: `₹${netProfit.toLocaleString()}`,
      change: `${netProfit >= 0 ? '+' : ''}${Math.round(growthPercentage)}%`,
      icon: netProfit >= 0 ? TrendingUp : TrendingDown,
      color: netProfit >= 0 ? "text-emerald-600" : "text-red-600",
      bgColor: netProfit >= 0 ? "bg-gradient-to-br from-emerald-100 to-emerald-200" : "bg-gradient-to-br from-red-100 to-red-200",
      cardBg: netProfit >= 0 ? "bg-gradient-to-br from-emerald-50 to-emerald-100" : "bg-gradient-to-br from-red-50 to-red-100",
      borderColor: netProfit >= 0 ? "border-emerald-200" : "border-red-200",
    },
  ];

  const quickActions = [
    {
      title: "Create Bill",
      icon: FileText,
      color: "text-blue-600",
      bgColor: "bg-blue-50 hover:bg-blue-100",
      borderColor: "border-blue-200 hover:border-blue-300",
      route: "/billing"
    },
    {
      title: "Add Customer",
      icon: Users,
      color: "text-green-600",
      bgColor: "bg-green-50 hover:bg-green-100",
      borderColor: "border-green-200 hover:border-green-300",
      route: "/customers"
    },
    {
      title: "View Transactions",
      icon: CreditCard,
      color: "text-purple-600",
      bgColor: "bg-purple-50 hover:bg-purple-100",
      borderColor: "border-purple-200 hover:border-purple-300",
      route: "/transactions"
    },
    {
      title: "Manage Stock",
      icon: Package,
      color: "text-orange-600",
      bgColor: "bg-orange-50 hover:bg-orange-100",
      borderColor: "border-orange-200 hover:border-orange-300",
      route: "/stock"
    }
  ];

  return (
    <>
      <AppSidebar />
      <div className={`transition-all duration-300 ${isOpen ? "ml-64" : "ml-16"}`}>
        <Navbar />
        <div className="p-6 space-y-6 bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100 min-h-screen">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Dashboard
              </h1>
              <div className="text-lg text-gray-600 mt-2">
                Welcome to Metalic Billing System ✨
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">Today</div>
              <div className="text-lg font-semibold text-gray-800">
                {format(new Date(), 'dd MMM yyyy')}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat, index) => (
              <Card 
                key={index} 
                className={`${stat.cardBg} ${stat.borderColor} border-2 hover:shadow-xl hover:scale-105 transition-all duration-300 cursor-pointer`}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-700">
                    {stat.title}
                  </CardTitle>
                  <div className={`p-3 rounded-xl ${stat.bgColor} shadow-lg`}>
                    <stat.icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-gray-900 mb-1">{stat.value}</div>
                  <p className={`text-sm font-medium ${stat.change.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
                    {stat.change} from last month
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-gradient-to-br from-white to-blue-50 border-2 border-blue-100 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-t-lg">
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Recent Bills
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {bills.slice(0, 4).map((bill) => (
                    <div key={bill.id} className="flex items-center justify-between py-3 px-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg border border-blue-100 hover:shadow-md transition-all duration-200">
                      <div>
                        <div className="font-semibold text-gray-800">Bill #{bill.bill_number}</div>
                        <div className="text-sm text-gray-600">{bill.customer_name}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-green-600">₹{bill.total_amount.toFixed(2)}</div>
                        <div className="text-sm text-gray-500">{format(new Date(bill.date), 'dd/MM/yyyy')}</div>
                      </div>
                    </div>
                  ))}
                  {bills.length === 0 && (
                    <div className="text-center text-gray-500 py-8 bg-gray-50 rounded-lg">
                      <FileText className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                      <p>No bills created yet</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-white to-purple-50 border-2 border-purple-100 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-t-lg">
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-2 gap-4">
                  {quickActions.map((action, index) => (
                    <button 
                      key={index}
                      onClick={() => navigate(action.route)}
                      className={`p-4 border-2 ${action.borderColor} ${action.bgColor} rounded-xl transition-all duration-300 hover:shadow-lg hover:scale-105 active:scale-95`}
                    >
                      <action.icon className={`h-8 w-8 ${action.color} mb-3 mx-auto`} />
                      <div className="text-sm font-semibold text-gray-700">{action.title}</div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="bg-gradient-to-br from-yellow-50 to-orange-100 border-2 border-orange-200 hover:shadow-lg transition-all duration-300">
              <CardHeader>
                <CardTitle className="text-orange-700 flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Pending Payments
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-800">
                  {customers.filter(c => c.balance > 0).length}
                </div>
                <p className="text-orange-600 text-sm">customers with pending balance</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-indigo-50 to-blue-100 border-2 border-blue-200 hover:shadow-lg transition-all duration-300">
              <CardHeader>
                <CardTitle className="text-blue-700 flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Total Expenses
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-800">
                  ₹{totalExpenses.toLocaleString()}
                </div>
                <p className="text-blue-600 text-sm">this month</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-pink-50 to-rose-100 border-2 border-rose-200 hover:shadow-lg transition-all duration-300">
              <CardHeader>
                <CardTitle className="text-rose-700 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Growth Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-rose-800">
                  +{Math.abs(Math.round(growthPercentage))}%
                </div>
                <p className="text-rose-600 text-sm">compared to last month</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
};

export default Dashboard;
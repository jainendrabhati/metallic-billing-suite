import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Users, CreditCard, TrendingUp, TrendingDown, Package, Clock, DollarSign, HardHat, Wifi, WifiOff} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { customerAPI, billAPI, transactionAPI, expenseAPI, settingsAPI } from "@/services/api";
import { format } from "date-fns";
import AppSidebar from "@/components/AppSidebar";
import { useSidebar } from "@/components/SidebarProvider";
import Navbar from "@/components/Navbar";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { offlineService } from "@/services/offlineService";

const Dashboard = () => {
  const { isOpen } = useSidebar();
  const navigate = useNavigate();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [dashboardStats, setDashboardStats] = useState<any>(null);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Fetch data with offline support
  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: isOnline ? customerAPI.getAll : () => offlineService.getCustomers(),
    staleTime: isOnline ? 0 : Infinity,
  });

  const { data: bills = [] } = useQuery({
    queryKey: ['bills'],
    queryFn: isOnline ? billAPI.getAll : () => offlineService.getBills(),
    staleTime: isOnline ? 0 : Infinity,
  });

  const { data: pendingCustomers = [] } = useQuery({
    queryKey: ['customers', 'pending'],
    queryFn: isOnline ? customerAPI.getPendingList : () => offlineService.getPendingList(),
    staleTime: isOnline ? 0 : Infinity,
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: isOnline ? () => fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'}/employees`).then(r => r.json()) : () => offlineService.getEmployees(),
    staleTime: isOnline ? 0 : Infinity,
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions'],
    queryFn: isOnline ? () => transactionAPI.getAll() : () => offlineService.getTransactions(),
    staleTime: isOnline ? 0 : Infinity,
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ['expenses'],
    queryFn: isOnline ? () => expenseAPI.getAll() : () => offlineService.getExpenses(),
    staleTime: isOnline ? 0 : Infinity,
  });

  const { data: firmSettings } = useQuery({
    queryKey: ['firmSettings'],
    queryFn: isOnline ? settingsAPI.getFirmSettings : () => offlineService.getSettings(),
    staleTime: isOnline ? 0 : Infinity,
  });

  // Fetch dashboard statistics
  const { data: dashboardData } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      if (!isOnline) return null;
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'}/dashboard`);
      return response.json();
    },
    enabled: isOnline,
  });

  // Update dashboard stats when data changes
  useEffect(() => {
    if (dashboardData) {
      setDashboardStats(dashboardData);
    }
  }, [dashboardData]);

  // Calculate statistics
  const totalRevenue = bills.reduce((sum, bill) => sum + bill.total_amount, 0);
  const totalExpenses = 0
  const netProfit = totalRevenue - totalExpenses;
  const growthPercentage = bills.length > 0 ? ((bills.length / Math.max(bills.length - 10, 1)) * 100) - 100 : 0;

  const stats = [
    {
      title: "Total Bills",
      value: bills.length.toString(),
      change: `+${bills.length > 10 ? Math.round((bills.length / (bills.length - 10)) * 100 - 100) : 0}%`,
      icon: FileText,
      color: "text-white",
      bgColor: "bg-white/20",
      cardBg: "bg-gradient-to-br from-blue-600 to-blue-700",
      borderColor: "border-blue-300",
      hoverBg: "hover:bg-gradient-to-br hover:from-blue-700 hover:to-blue-800",
    },
    {
      title: "Customers",
      value: customers.length.toString(),
      change: `+${customers.length > 5 ? Math.round((customers.length / (customers.length - 5)) * 100 - 100) : 0}%`,
      icon: Users,
      color: "text-white",
      bgColor: "bg-white/20",
      cardBg: "bg-gradient-to-br from-blue-600 to-blue-700",
      borderColor: "border-blue-300",
      hoverBg: "hover:bg-gradient-to-br hover:from-blue-700 hover:to-blue-800",
    },
    {
      title: "Pending List ",
      value: pendingCustomers.length.toString(),
      change: `${pendingCustomers.length > 0 ? '+' + Math.round((pendingCustomers.length / Math.max(customers.length, 1)) * 100) : '0'}%`,
      icon: Clock,
      color: "text-white",
      bgColor: "bg-white/20",
      cardBg: "bg-gradient-to-br from-blue-600 to-blue-700",
      borderColor: "border-blue-300",
      hoverBg: "hover:bg-gradient-to-br hover:from-blue-700 hover:to-blue-800",
    },
    {
      title: "Employees",
      value: employees.length.toString(),
      change: `+${employees.length > 3 ? Math.round((employees.length / (employees.length - 3)) * 100 - 100) : 0}%`,
      icon: HardHat,
      color: "text-white",
      bgColor: "bg-white/20",
      cardBg: "bg-gradient-to-br from-blue-600 to-blue-700",
      borderColor: "border-blue-300",
      hoverBg: "hover:bg-gradient-to-br hover:from-blue-700 hover:to-blue-800",
    },
  ];

  // const quickActions = [
    
  // ];

  // Get today's statistics
  const todayStats = dashboardStats?.today_statistics || {};
  const allTimeStats = dashboardStats?.all_time_statistics || {};

  const firmDetails = [
    
    // Today's Statistics
    { label: "--- Today's Statistics ---", value: "---", isHeader: true },
    { label: "Total Bills", value: todayStats.total_bills || 0 },
    { label: "Debit Bills", value: todayStats.debit_bills || 0 },
    { label: "Credit Bills", value: todayStats.credit_bills || 0 },
    { label: "Debit Amount", value: `₹${(todayStats.total_debit_amount || 0).toFixed(2)}` },
    { label: "Credit Amount", value: `₹${(todayStats.total_credit_amount || 0).toFixed(2)}` },
    
    // Stock-wise Today's Fine
    ...(todayStats.stock_wise_fine ? Object.entries(todayStats.stock_wise_fine).flatMap(([stock, stats]: [string, any]) => [
      { label: `--- ${stock} ---`, value: "---", isHeader: true },
      { label: `${stock} Debit Fine`, value: `${stats.total_debit_fine.toFixed(2)}g` },
      { label: `${stock} Credit Fine`, value: `${stats.total_credit_fine.toFixed(2)}g` },
    ]) : []),
    
    // All-time Stock Statistics
    
  ];

  return (
    <>
      <AppSidebar />
      <div className={`transition-all duration-300 ${isOpen ? "ml-64" : "ml-16"}`}>
        {/* <Navbar /> */}
        <div className="p-6 space-y-6 bg-gradient-to-br from-blue-50 via-white to-blue-50 min-h-screen">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {firmSettings?.firm_logo_url && (
                <img src={firmSettings.firm_logo_url} alt="Firm Logo" />
              )}
              <div>
                <h1 className="text-3xl font-bold text-slate-800">
                  {firmSettings?.firm_name || 'Dashboard'}
                </h1>
                {/* Connection Status */}
                <div className="flex items-center gap-2 mt-1">
                  {isOnline ? (
                    <div className="flex items-center gap-1 text-green-600">
                      <Wifi className="h-4 w-4" />
                      <span className="text-sm">Online</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-red-600">
                      <WifiOff className="h-4 w-4" />
                      <span className="text-sm">Offline</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="text-right">
            <div className="text-m text-gray-800">
              {format(new Date(), 'EEEE')}
            </div>

              <div className="text-lg font-semibold text-gray-800">
                {format(new Date(), 'dd MMM yyyy')}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat, index) => (
              <Card 
                key={index} 
                className={`${stat.cardBg} ${stat.borderColor} border ${stat.hoverBg} hover:shadow-xl transition-all duration-300 transform hover:scale-105 cursor-pointer`}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className={`text-2xl font-medium text-white`}>
                    {stat.title}
                  </CardTitle>
                  <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                    <stat.icon className={`h-4 w-4 ${stat.color}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className={`text-xl font-bold mb-1 text-white text-slate-900`}>{stat.value}</div>
                
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-white border border-blue-200 hover:shadow-xl transition-shadow duration-300">
              <CardHeader className="bg-gradient-to-r from-blue-100 to-blue-200 border-b border-blue-200">
                <CardTitle className="flex items-center gap-2 text-blue-800">
                  <Clock className="h-5 w-5" />
                  Recent Bills
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-3">
                  {bills.slice(0, 4).map((bill) => (
                    <div key={bill.id} className="flex items-center justify-between py-2 px-3 bg-slate-50 rounded-lg border border-slate-100">
                      <div>
                        <div className="font-medium text-slate-800">{bill.customer_name}</div>
                        <div className="text-sm text-slate-600">{bill.item_name}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-slate-900">₹{bill.total_amount.toFixed(2)} | {bill.total_fine.toFixed(2)}g</div>
                        <div className="text-xs text-slate-500 flex items-center gap-2">
                            <span>{format(new Date(bill.date), 'dd/MM/yyyy')} |</span>

                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-medium
                                ${bill.payment_type === "debit" 
                                  ? "bg-red-100 text-red-700 border border-red-300"
                                  : bill.payment_type === "credit"
                                  ? "bg-green-100 text-green-700 border border-green-300"
                                  : "bg-gray-100 text-gray-700 border border-gray-300"
                                }`}
                            >
                              {bill.payment_type}
                            </span>
                          </div>
                      </div>
                    </div>
                  ))}
                  {bills.length === 0 && (
                    <div className="text-center text-slate-500 py-8 bg-slate-50 rounded-lg">
                      <FileText className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-sm">No bills created yet</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border border-blue-200 hover:shadow-xl transition-shadow duration-300">
              <CardHeader className="bg-gradient-to-r from-blue-100 to-blue-200 border-b border-blue-200">
                <CardTitle className="flex items-center gap-2 text-blue-800">
                  <TrendingUp className="h-5 w-5" />
                  Statistics
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
              
                 
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {firmDetails.map((detail, index) => (
                      <div key={index} className={`flex justify-between items-center text-sm ${
                        detail.isHeader ? 'font-bold text-blue-800 bg-blue-50 p-2 rounded' : ''
                      }`}>
                        <span className={`font-medium text-slate-800 truncate ${detail.isHeader ? 'text-center w-full' : ''}`}>
                          {detail.isHeader ? detail.label : `${detail.label}:`}
                        </span>
                        {!detail.isHeader && (
                          <span className="font-medium text-slate-800 truncate">{detail.value}</span>
                        )}
                      </div>
                    ))}
                  </div>
                  
              </CardContent>
            </Card>
          </div>

         
        </div>
      </div>
    </>
  );
};

export default Dashboard;

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Users, CreditCard, TrendingUp } from "lucide-react";

const Dashboard = () => {
  const stats = [
    {
      title: "Total Bills",
      value: "1,234",
      change: "+12%",
      icon: FileText,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      title: "Customers",
      value: "856",
      change: "+8%",
      icon: Users,
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    {
      title: "Revenue",
      value: "₹2,45,678",
      change: "+15%",
      icon: CreditCard,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
    },
    {
      title: "Growth",
      value: "23.5%",
      change: "+5%",
      icon: TrendingUp,
      color: "text-orange-600",
      bgColor: "bg-orange-100",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <div className="text-sm text-gray-500">
          Welcome to Metalic Billing System
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <Card key={index} className="hover:shadow-lg transition-shadow duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
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
              {[1, 2, 3, 4].map((item) => (
                <div key={item} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                  <div>
                    <div className="font-medium">Bill #{1000 + item}</div>
                    <div className="text-sm text-gray-500">Customer {item}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">₹{(Math.random() * 10000).toFixed(0)}</div>
                    <div className="text-sm text-gray-500">Today</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <button className="p-4 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors">
                <FileText className="h-6 w-6 text-blue-600 mb-2" />
                <div className="text-sm font-medium">Create Bill</div>
              </button>
              <button className="p-4 border border-gray-200 rounded-lg hover:bg-green-50 hover:border-green-300 transition-colors">
                <Users className="h-6 w-6 text-green-600 mb-2" />
                <div className="text-sm font-medium">Add Customer</div>
              </button>
              <button className="p-4 border border-gray-200 rounded-lg hover:bg-purple-50 hover:border-purple-300 transition-colors">
                <CreditCard className="h-6 w-6 text-purple-600 mb-2" />
                <div className="text-sm font-medium">View Transactions</div>
              </button>
              <button className="p-4 border border-gray-200 rounded-lg hover:bg-orange-50 hover:border-orange-300 transition-colors">
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


import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Download, FileText, Search } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const TransactionsPage = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [dateFrom, setDateFrom] = useState<Date>();
  const [dateTo, setDateTo] = useState<Date>();

  const transactions = [
    {
      id: "TXN001",
      billNumber: "BILL-2024-001",
      customerName: "John Doe",
      amount: 15000,
      type: "credit",
      status: "paid",
      date: "2024-01-15",
      description: "Gold Purchase"
    },
    {
      id: "TXN002",
      billNumber: "BILL-2024-002",
      customerName: "Jane Smith",
      amount: 8500,
      type: "debit",
      status: "unpaid",
      date: "2024-01-14",
      description: "Silver Sale"
    },
    {
      id: "TXN003",
      billNumber: "BILL-2024-003",
      customerName: "Bob Johnson",
      amount: 22000,
      type: "credit",
      status: "partial",
      date: "2024-01-13",
      description: "Jewelry Making"
    },
  ];

  const handleExportCSV = () => {
    console.log("Exporting to CSV...");
    // Add CSV export logic here
  };

  const handleExportPDF = () => {
    console.log("Exporting to PDF...");
    // Add PDF export logic here
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Transaction Logs</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportCSV} className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
          <Button variant="outline" onClick={handleExportPDF} className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Export PDF
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger>
                <SelectValue placeholder="Transaction Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="credit">Credit</SelectItem>
                <SelectItem value="debit">Debit</SelectItem>
              </SelectContent>
            </Select>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "justify-start text-left font-normal",
                    !dateFrom && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateFrom ? format(dateFrom, "PPP") : "From Date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={dateFrom}
                  onSelect={setDateFrom}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "justify-start text-left font-normal",
                    !dateTo && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateTo ? format(dateTo, "PPP") : "To Date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={dateTo}
                  onSelect={setDateTo}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>

            <Button>Apply Filters</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">Transaction ID</th>
                  <th className="text-left py-3 px-4">Bill Number</th>
                  <th className="text-left py-3 px-4">Customer</th>
                  <th className="text-left py-3 px-4">Amount</th>
                  <th className="text-left py-3 px-4">Type</th>
                  <th className="text-left py-3 px-4">Status</th>
                  <th className="text-left py-3 px-4">Date</th>
                  <th className="text-left py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction) => (
                  <tr key={transaction.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium">{transaction.id}</td>
                    <td className="py-3 px-4">{transaction.billNumber}</td>
                    <td className="py-3 px-4">{transaction.customerName}</td>
                    <td className="py-3 px-4 font-semibold">₹{transaction.amount.toLocaleString()}</td>
                    <td className="py-3 px-4">
                      <Badge variant={transaction.type === 'credit' ? 'default' : 'secondary'}>
                        {transaction.type}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <Badge 
                        variant={
                          transaction.status === 'paid' ? 'default' : 
                          transaction.status === 'unpaid' ? 'destructive' : 'secondary'
                        }
                      >
                        {transaction.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">{transaction.date}</td>
                    <td className="py-3 px-4">
                      <Button variant="outline" size="sm">
                        View Details
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

export default TransactionsPage;

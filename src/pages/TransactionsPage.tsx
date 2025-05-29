
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CalendarIcon, Download, FileText, Search } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { transactionAPI } from "@/services/api";

const TransactionsPage = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [dateFrom, setDateFrom] = useState<Date>();
  const [dateTo, setDateTo] = useState<Date>();

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['transactions', searchTerm, filterType, dateFrom, dateTo],
    queryFn: () => transactionAPI.getAll({
      start_date: dateFrom ? format(dateFrom, 'yyyy-MM-dd') : undefined,
      end_date: dateTo ? format(dateTo, 'yyyy-MM-dd') : undefined,
      customer_name: searchTerm || undefined,
    }),
  });

  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = transaction.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         transaction.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === "all" || transaction.transaction_type === filterType;
    return matchesSearch && matchesType;
  });

  const handleExportCSV = async () => {
    try {
      await transactionAPI.exportCSV({
        start_date: dateFrom ? format(dateFrom, 'yyyy-MM-dd') : undefined,
        end_date: dateTo ? format(dateTo, 'yyyy-MM-dd') : undefined,
        customer_name: searchTerm || undefined,
      });
    } catch (error) {
      console.error('Error exporting CSV:', error);
    }
  };

  const handleExportPDF = async () => {
    try {
      await transactionAPI.exportPDF({
        start_date: dateFrom ? format(dateFrom, 'yyyy-MM-dd') : undefined,
        end_date: dateTo ? format(dateTo, 'yyyy-MM-dd') : undefined,
        customer_name: searchTerm || undefined,
      });
    } catch (error) {
      console.error('Error exporting PDF:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-500">Loading transactions...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 bg-gray-50 min-h-screen p-6">
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Transaction Management</h1>
            <p className="text-gray-600 mt-1">Monitor and analyze all financial transactions</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleExportCSV} className="flex items-center gap-2 border-gray-300">
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
            <Button variant="outline" onClick={handleExportPDF} className="flex items-center gap-2 border-gray-300">
              <FileText className="h-4 w-4" />
              Export PDF
            </Button>
          </div>
        </div>

        <Card className="border-0 shadow-sm mb-6">
          <CardHeader className="bg-gray-50 border-b">
            <CardTitle className="text-lg font-semibold text-gray-800">Advanced Filters</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by customer or description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-white border-gray-300 focus:border-blue-500"
                />
              </div>

              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="bg-white border-gray-300">
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
                      "justify-start text-left font-normal bg-white border-gray-300",
                      !dateFrom && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateFrom ? format(dateFrom, "PPP") : "From Date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-white">
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
                      "justify-start text-left font-normal bg-white border-gray-300",
                      !dateTo && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateTo ? format(dateTo, "PPP") : "To Date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-white">
                  <Calendar
                    mode="single"
                    selected={dateTo}
                    onSelect={setDateTo}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>

              <Button className="bg-blue-600 hover:bg-blue-700">Apply Filters</Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="bg-gray-50 border-b">
            <CardTitle className="text-lg font-semibold text-gray-800">Transaction History</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="font-semibold text-gray-700">Transaction ID</TableHead>
                    <TableHead className="font-semibold text-gray-700">Bill Number</TableHead>
                    <TableHead className="font-semibold text-gray-700">Customer</TableHead>
                    <TableHead className="font-semibold text-gray-700">Amount</TableHead>
                    <TableHead className="font-semibold text-gray-700">Type</TableHead>
                    <TableHead className="font-semibold text-gray-700">Status</TableHead>
                    <TableHead className="font-semibold text-gray-700">Date</TableHead>
                    <TableHead className="font-semibold text-gray-700">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.map((transaction) => (
                    <TableRow key={transaction.id} className="hover:bg-gray-50 border-b border-gray-100">
                      <TableCell className="font-medium text-gray-900">TXN-{transaction.id.toString().padStart(4, '0')}</TableCell>
                      <TableCell className="text-gray-700">{transaction.bill_number || 'N/A'}</TableCell>
                      <TableCell className="text-gray-700">{transaction.customer_name}</TableCell>
                      <TableCell className="font-bold text-blue-600">₹{transaction.amount.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant={transaction.transaction_type === 'credit' ? 'default' : 'secondary'} 
                               className={transaction.transaction_type === 'credit' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                          {transaction.transaction_type.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={
                            transaction.status === 'paid' ? 'default' : 
                            transaction.status === 'unpaid' ? 'destructive' : 'secondary'
                          }
                          className={
                            transaction.status === 'paid' ? 'bg-green-100 text-green-800' :
                            transaction.status === 'unpaid' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                          }
                        >
                          {transaction.status.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-gray-700">{format(new Date(transaction.created_at), 'dd/MM/yyyy')}</TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm" className="border-gray-300 hover:bg-gray-50">
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {filteredTransactions.length === 0 && (
                <div className="text-center py-12">
                  <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No transactions found</h3>
                  <p className="text-gray-500">Try adjusting your search criteria</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TransactionsPage;

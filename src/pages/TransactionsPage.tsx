
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CalendarIcon, Download, FileText, Search, Eye, Printer } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { transactionAPI } from "@/services/api";

const TransactionsPage = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [dateFrom, setDateFrom] = useState<Date>();
  const [dateTo, setDateTo] = useState<Date>();
  const [selectedTransactionId, setSelectedTransactionId] = useState<number | null>(null);

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['transactions', searchTerm, filterType, dateFrom, dateTo],
    queryFn: () => transactionAPI.getAll({
      start_date: dateFrom ? format(dateFrom, 'yyyy-MM-dd') : undefined,
      end_date: dateTo ? format(dateTo, 'yyyy-MM-dd') : undefined,
      customer_name: searchTerm || undefined,
    }),
  });

  const { data: selectedTransaction } = useQuery({
    queryKey: ['transaction', selectedTransactionId],
    queryFn: () => selectedTransactionId ? transactionAPI.getById(selectedTransactionId) : null,
    enabled: !!selectedTransactionId,
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

  const handlePrintTransaction = (transaction: any) => {
    const printContent = `
      <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
        <h2 style="text-align: center; margin-bottom: 30px;">Transaction Details</h2>
        <div style="border: 1px solid #ccc; padding: 20px; border-radius: 8px;">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
            <div>
              <strong>Bill Number:</strong> ${transaction.bill_number || 'N/A'}<br>
              <strong>Customer:</strong> ${transaction.customer_name}<br>
              <strong>Type:</strong> ${transaction.transaction_type.toUpperCase()}<br>
              <strong>Amount:</strong> ₹${transaction.amount.toLocaleString()}
            </div>
            <div>
              <strong>Weight:</strong> ${transaction.weight || 'N/A'} gm<br>
              <strong>Tunch:</strong> ${transaction.tunch || 'N/A'}%<br>
              <strong>Wages:</strong> ₹${transaction.wages || 'N/A'}<br>
              <strong>Wastage:</strong> ${transaction.wastage || 'N/A'}%
            </div>
          </div>
          ${transaction.silver_amount ? `<div><strong>Silver Amount:</strong> ₹${transaction.silver_amount.toLocaleString()}</div>` : ''}
          <div style="margin-top: 20px;">
            <strong>Description:</strong> ${transaction.description}
          </div>
          <div style="margin-top: 20px; text-align: right;">
            <strong>Date:</strong> ${format(new Date(transaction.created_at), 'dd/MM/yyyy HH:mm')}
          </div>
        </div>
      </div>
    `;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
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
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b bg-gradient-to-r from-green-600 to-green-700">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">Transaction Management</h1>
              <p className="text-green-100 mt-1">Monitor and analyze all financial transactions</p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={handleExportCSV} className="flex items-center gap-2 bg-white text-green-600 hover:bg-green-50 border-white">
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
              <Button variant="outline" onClick={handleExportPDF} className="flex items-center gap-2 bg-white text-green-600 hover:bg-green-50 border-white">
                <FileText className="h-4 w-4" />
                Export PDF
              </Button>
            </div>
          </div>
        </div>

        <div className="p-6">
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
                      <TableHead className="font-semibold text-gray-700">Bill Number</TableHead>
                      <TableHead className="font-semibold text-gray-700">Customer</TableHead>
                      <TableHead className="font-semibold text-gray-700">Amount</TableHead>
                      <TableHead className="font-semibold text-gray-700">Type</TableHead>
                      <TableHead className="font-semibold text-gray-700">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransactions.map((transaction) => (
                      <TableRow key={transaction.id} className="hover:bg-gray-50 border-b border-gray-100">
                        <TableCell className="text-gray-700">{transaction.bill_number || 'N/A'}</TableCell>
                        <TableCell className="text-gray-700 font-medium">{transaction.customer_name}</TableCell>
                        <TableCell className="font-bold text-blue-600">₹{transaction.amount.toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge variant={transaction.transaction_type === 'credit' ? 'default' : 'secondary'} 
                                 className={transaction.transaction_type === 'credit' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                            {transaction.transaction_type.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="border-gray-300 hover:bg-gray-50"
                                  onClick={() => setSelectedTransactionId(transaction.id)}
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  View
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl">
                                <DialogHeader>
                                  <DialogTitle className="text-2xl font-bold text-gray-900 flex items-center justify-between">
                                    Transaction Details - {transaction.bill_number || 'N/A'}
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      onClick={() => handlePrintTransaction(transaction)}
                                      className="ml-4"
                                    >
                                      <Printer className="h-4 w-4 mr-1" />
                                      Print
                                    </Button>
                                  </DialogTitle>
                                </DialogHeader>
                                {selectedTransaction && (
                                  <div className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                      <Card>
                                        <CardHeader>
                                          <CardTitle className="text-lg">Transaction Information</CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-3">
                                          <div>
                                            <label className="text-sm font-medium text-gray-600">Bill Number</label>
                                            <p className="text-gray-900">{selectedTransaction.bill_number || 'N/A'}</p>
                                          </div>
                                          <div>
                                            <label className="text-sm font-medium text-gray-600">Customer Name</label>
                                            <p className="text-gray-900 font-medium">{selectedTransaction.customer_name}</p>
                                          </div>
                                          <div>
                                            <label className="text-sm font-medium text-gray-600">Transaction Type</label>
                                            <div>
                                              <Badge 
                                                variant={selectedTransaction.transaction_type === 'credit' ? 'default' : 'secondary'}
                                                className={selectedTransaction.transaction_type === 'credit' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}
                                              >
                                                {selectedTransaction.transaction_type.toUpperCase()}
                                              </Badge>
                                            </div>
                                          </div>
                                        </CardContent>
                                      </Card>
                                      
                                      <Card>
                                        <CardHeader>
                                          <CardTitle className="text-lg">Financial Details</CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-3">
                                          <div>
                                            <label className="text-sm font-medium text-gray-600">Amount</label>
                                            <p className="text-2xl font-bold text-blue-600">₹{selectedTransaction.amount.toLocaleString()}</p>
                                          </div>
                                          {selectedTransaction.weight && (
                                            <div>
                                              <label className="text-sm font-medium text-gray-600">Weight</label>
                                              <p className="text-gray-900">{selectedTransaction.weight} gm</p>
                                            </div>
                                          )}
                                          {selectedTransaction.tunch && (
                                            <div>
                                              <label className="text-sm font-medium text-gray-600">Tunch</label>
                                              <p className="text-gray-900">{selectedTransaction.tunch}%</p>
                                            </div>
                                          )}
                                          {selectedTransaction.wages && (
                                            <div>
                                              <label className="text-sm font-medium text-gray-600">Wages</label>
                                              <p className="text-gray-900">₹{selectedTransaction.wages}</p>
                                            </div>
                                          )}
                                          {selectedTransaction.wastage && (
                                            <div>
                                              <label className="text-sm font-medium text-gray-600">Wastage</label>
                                              <p className="text-gray-900">{selectedTransaction.wastage}%</p>
                                            </div>
                                          )}
                                          {selectedTransaction.silver_amount && (
                                            <div>
                                              <label className="text-sm font-medium text-gray-600">Silver Amount</label>
                                              <p className="text-gray-900">₹{selectedTransaction.silver_amount.toLocaleString()}</p>
                                            </div>
                                          )}
                                        </CardContent>
                                      </Card>
                                    </div>
                                    
                                    {selectedTransaction.description && (
                                      <Card>
                                        <CardHeader>
                                          <CardTitle className="text-lg">Description</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                          <p className="text-gray-900">{selectedTransaction.description}</p>
                                        </CardContent>
                                      </Card>
                                    )}
                                  </div>
                                )}
                              </DialogContent>
                            </Dialog>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handlePrintTransaction(transaction)}
                              className="border-gray-300 hover:bg-gray-50"
                            >
                              <Printer className="h-4 w-4" />
                            </Button>
                          </div>
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
    </div>
  );
};

export default TransactionsPage;

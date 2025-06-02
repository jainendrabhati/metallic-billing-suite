
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar, Download, FileText, Eye, Printer } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { transactionAPI } from "@/services/api";
import { format } from "date-fns";

const TransactionsPage = () => {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);

  const { data: transactions = [], refetch } = useQuery({
    queryKey: ['transactions', startDate, endDate, customerName],
    queryFn: () => transactionAPI.getAll({ start_date: startDate, end_date: endDate, customer_name: customerName }),
  });

  const handleFilter = () => {
    refetch();
  };

  const handleClearFilters = () => {
    setStartDate("");
    setEndDate("");
    setCustomerName("");
    refetch();
  };

  const handleExportCSV = async () => {
    try {
      const result = await transactionAPI.exportCSV({ start_date: startDate, end_date: endDate, customer_name: customerName });
      console.log("CSV export:", result);
    } catch (error) {
      console.error("Failed to export CSV:", error);
    }
  };

  const handleExportPDF = async () => {
    try {
      const result = await transactionAPI.exportPDF({ start_date: startDate, end_date: endDate, customer_name: customerName });
      console.log("PDF export:", result);
    } catch (error) {
      console.error("Failed to export PDF:", error);
    }
  };

  const handleViewDetails = (transaction: any) => {
    setSelectedTransaction(transaction);
    setShowDetailsDialog(true);
  };

  const handlePrintTransaction = (transaction: any) => {
    const printContent = `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>Transaction Details</h2>
        <p><strong>Bill Number:</strong> ${transaction.bill_number || 'N/A'}</p>
        <p><strong>Customer:</strong> ${transaction.customer_name}</p>
        <p><strong>Amount:</strong> ₹${transaction.amount}</p>
        <p><strong>Type:</strong> ${transaction.transaction_type}</p>
        <p><strong>Description:</strong> ${transaction.description}</p>
        ${transaction.weight ? `<p><strong>Weight:</strong> ${transaction.weight} grams</p>` : ''}
        ${transaction.tunch ? `<p><strong>Tunch:</strong> ${transaction.tunch}%</p>` : ''}
        ${transaction.wages ? `<p><strong>Wages:</strong> ₹${transaction.wages}</p>` : ''}
        ${transaction.wastage ? `<p><strong>Wastage:</strong> ${transaction.wastage}%</p>` : ''}
        ${transaction.total_wages ? `<p><strong>Total Wages:</strong> ₹${transaction.total_wages}</p>` : ''}
        ${transaction.silver_amount ? `<p><strong>Silver Amount:</strong> ₹${transaction.silver_amount}</p>` : ''}
        ${transaction.item ? `<p><strong>Item:</strong> ${transaction.item}</p>` : ''}
      </div>
    `;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Transactions</h1>
        <div className="flex gap-2">
          <Button onClick={handleExportCSV} variant="outline" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
          <Button onClick={handleExportPDF} variant="outline" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Export PDF
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Filter Transactions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                type="date"
                id="startDate"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="endDate">End Date</Label>
              <Input
                type="date"
                id="endDate"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="customerName">Customer Name</Label>
              <Input
                type="text"
                id="customerName"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Enter customer name"
              />
            </div>
            <div className="flex items-end gap-2">
              <Button onClick={handleFilter} className="flex-1">
                Filter
              </Button>
              <Button onClick={handleClearFilters} variant="outline" className="flex-1">
                Clear
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bill Number</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Total Fine</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell>{transaction.bill_number || 'N/A'}</TableCell>
                    <TableCell>{transaction.customer_name}</TableCell>
                    <TableCell>₹{transaction.amount.toFixed(2)}</TableCell>
                    <TableCell>
                      {transaction.weight && transaction.tunch && transaction.wastage 
                        ? `${(transaction.weight * ((transaction.tunch - transaction.wastage) / 100)).toFixed(2)}g`
                        : 'N/A'
                      }
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded text-xs ${
                        transaction.transaction_type === 'credit' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      }`}>
                        {transaction.transaction_type}
                      </span>
                    </TableCell>
                    <TableCell>{transaction.description}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleViewDetails(transaction)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handlePrintTransaction(transaction)}
                        >
                          <Printer className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {transactions.length === 0 && (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                No transactions found
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Transaction Details</DialogTitle>
          </DialogHeader>
          {selectedTransaction && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-medium">Bill Number:</label>
                  <p>{selectedTransaction.bill_number || 'N/A'}</p>
                </div>
                <div>
                  <label className="font-medium">Customer:</label>
                  <p>{selectedTransaction.customer_name}</p>
                </div>
                <div>
                  <label className="font-medium">Amount:</label>
                  <p>₹{selectedTransaction.amount}</p>
                </div>
                <div>
                  <label className="font-medium">Type:</label>
                  <p>{selectedTransaction.transaction_type}</p>
                </div>
                {selectedTransaction.weight && (
                  <div>
                    <label className="font-medium">Weight:</label>
                    <p>{selectedTransaction.weight} grams</p>
                  </div>
                )}
                {selectedTransaction.tunch && (
                  <div>
                    <label className="font-medium">Tunch:</label>
                    <p>{selectedTransaction.tunch}%</p>
                  </div>
                )}
                {selectedTransaction.wages && (
                  <div>
                    <label className="font-medium">Wages:</label>
                    <p>₹{selectedTransaction.wages}</p>
                  </div>
                )}
                {selectedTransaction.wastage && (
                  <div>
                    <label className="font-medium">Wastage:</label>
                    <p>{selectedTransaction.wastage}%</p>
                  </div>
                )}
                {selectedTransaction.total_wages && (
                  <div>
                    <label className="font-medium">Total Wages:</label>
                    <p>₹{selectedTransaction.total_wages}</p>
                  </div>
                )}
                {selectedTransaction.silver_amount && (
                  <div>
                    <label className="font-medium">Silver Amount:</label>
                    <p>₹{selectedTransaction.silver_amount}</p>
                  </div>
                )}
                {selectedTransaction.item && (
                  <div>
                    <label className="font-medium">Item:</label>
                    <p>{selectedTransaction.item}</p>
                  </div>
                )}
                <div className="col-span-2">
                  <label className="font-medium">Description:</label>
                  <p>{selectedTransaction.description}</p>
                </div>
              </div>
              <Button 
                onClick={() => handlePrintTransaction(selectedTransaction)}
                className="w-full"
              >
                <Printer className="h-4 w-4 mr-2" />
                Print Transaction
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TransactionsPage;

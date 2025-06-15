import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar, Download, FileText, Eye, Printer, Edit, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { transactionAPI, billAPI } from "@/services/api";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

const TransactionsPage = () => {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editTransaction, setEditTransaction] = useState<any>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: transactions = [], refetch, isError, error } = useQuery({
    queryKey: ['transactions', startDate, endDate, customerName],
    queryFn: () => {
      // If any filters are set, call getFiltered
      if (startDate || endDate || customerName) {
        return transactionAPI.getFiltered({ start_date: startDate, end_date: endDate, customer_name: customerName });
      } else {
        return transactionAPI.getAll();
      }
    },
  });

  // Optional: Show errors for debugging
  if (isError) {
    console.error("Transaction query error:", error);
  }

  const updateTransactionMutation = useMutation({
    mutationFn: (data: { id: number; updates: any }) => {
      // If updating bill fields, update the bill instead
      if (data.updates.weight || data.updates.tunch || data.updates.wastage || data.updates.wages || data.updates.silver_amount || data.updates.payment_type || data.updates.item || data.updates.item_name) {
        // Calculate new totals
        const weight = data.updates.weight || editTransaction.weight;
        const tunch = data.updates.tunch || editTransaction.tunch;
        const wastage = data.updates.wastage || editTransaction.wastage;
        const wages = data.updates.wages || editTransaction.wages;
        const silverAmount = data.updates.silver_amount || editTransaction.silver_amount;
        const paymentType = data.updates.payment_type || editTransaction.payment_type;
        
        const totalFine = weight * ((tunch - wastage) / 100);
        const totalAmount = (weight * (wages / 1000)) + (paymentType === 'credit' ? silverAmount : 0);
        
        const billUpdates = {
          ...data.updates,
          total_fine: totalFine,
          total_amount: totalAmount,
        };
        
        return billAPI.update(editTransaction.bill_id, billUpdates);
      } else {
        return transactionAPI.update(data.id, data.updates);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast({
        title: "Success",
        description: "Transaction updated successfully!",
      });
      setShowEditDialog(false);
      setEditTransaction(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update transaction.",
        variant: "destructive",
      });
    },
  });

  const deleteTransactionMutation = useMutation({
    mutationFn: (data: { transactionId: number; billId?: number }) => {
      if (data.billId) {
        return billAPI.delete(data.billId);
      } else {
        return transactionAPI.delete(data.transactionId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast({
        title: "Success",
        description: "Transaction deleted successfully!",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete transaction.",
        variant: "destructive",
      });
    },
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
      await transactionAPI.exportCSV({ start_date: startDate, end_date: endDate, customer_name: customerName });
      toast({
        title: "Success",
        description: "Transactions data is being downloaded.",
      });
    } catch (error) {
      console.error("Failed to export CSV:", error);
      toast({
        title: "Error",
        description: "Failed to export transactions to CSV.",
        variant: "destructive",
      });
    }
  };

  const handleExportPDF = async () => {
    try {
      await transactionAPI.exportPDF({ start_date: startDate, end_date: endDate, customer_name: customerName });
      toast({
        title: "Success",
        description: "Transactions PDF is being generated for download.",
      });
    } catch (error) {
      console.error("Failed to export PDF:", error);
      toast({
        title: "Error",
        description: "Failed to export transactions to PDF.",
        variant: "destructive",
      });
    }
  };

  const handleViewDetails = (transaction: any) => {
    setSelectedTransaction(transaction);
    setShowDetailsDialog(true);
  };

  const handleEditTransaction = (transaction: any) => {
    setEditTransaction({
      id: transaction.id,
      bill_id: transaction.bill_id,
      amount: transaction.amount,
      transaction_type: transaction.transaction_type,
      description: transaction.description,
      weight: transaction.weight || 0,
      tunch: transaction.tunch || 0,
      wastage: transaction.wastage || 0,
      wages: transaction.wages || 0,
      silver_amount: transaction.silver_amount || 0,
      payment_type: transaction.transaction_type,
      item: transaction.item || '',
      item_name: transaction.item_name || '',
    });
    setShowEditDialog(true);
  };

  const handleDeleteTransaction = (transaction: any) => {
    if (confirm("Are you sure you want to delete this transaction? This action cannot be undone.")) {
      deleteTransactionMutation.mutate({
        transactionId: transaction.id,
        billId: transaction.bill_id
      });
    }
  };

  const handleUpdateTransaction = () => {
    if (editTransaction) {
      const updates: any = {};
      
      // Include all editable fields
      if (editTransaction.weight) updates.weight = parseFloat(editTransaction.weight);
      if (editTransaction.tunch) updates.tunch = parseFloat(editTransaction.tunch);
      if (editTransaction.wastage) updates.wastage = parseFloat(editTransaction.wastage);
      if (editTransaction.wages) updates.wages = parseFloat(editTransaction.wages);
      if (editTransaction.silver_amount) updates.silver_amount = parseFloat(editTransaction.silver_amount);
      if (editTransaction.payment_type) updates.payment_type = editTransaction.payment_type;
      if (editTransaction.item) updates.item = editTransaction.item;
      if (editTransaction.item_name) updates.item_name = editTransaction.item_name;
      if (editTransaction.description) updates.description = editTransaction.description;
      
      updateTransactionMutation.mutate({
        id: editTransaction.id,
        updates
      });
    }
  };

  const calculateTotals = () => {
    if (!editTransaction) return { totalFine: 0, totalAmount: 0 };
    
    const weight = parseFloat(editTransaction.weight) || 0;
    const tunch = parseFloat(editTransaction.tunch) || 0;
    const wastage = parseFloat(editTransaction.wastage) || 0;
    const wages = parseFloat(editTransaction.wages) || 0;
    const silverAmount = parseFloat(editTransaction.silver_amount) || 0;
    
    const totalFine = weight * ((tunch - wastage) / 100);
    const totalAmount = (weight * (wages / 1000)) + (editTransaction.payment_type === 'credit' ? silverAmount : 0);
    
    return { totalFine, totalAmount };
  };

  const { totalFine, totalAmount } = calculateTotals();

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
        ${transaction.item_name ? `<p><strong>Item Name:</strong> ${transaction.item_name}</p>` : ''}
        ${transaction.item ? `<p><strong>Item Type:</strong> ${transaction.item}</p>` : ''}
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
                          onClick={() => handleEditTransaction(transaction)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleDeleteTransaction(transaction)}
                        >
                          <Trash2 className="h-4 w-4" />
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

      {/* Edit Transaction Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Transaction</DialogTitle>
          </DialogHeader>
          {editTransaction && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="editItemName">Item Name</Label>
                  <Input
                    id="editItemName"
                    value={editTransaction.item_name}
                    onChange={(e) => setEditTransaction({...editTransaction, item_name: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="editItem">Item Type</Label>
                  <Input
                    id="editItem"
                    value={editTransaction.item}
                    onChange={(e) => setEditTransaction({...editTransaction, item: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="editWeight">Weight (grams)</Label>
                  <Input
                    id="editWeight"
                    type="number"
                    step="0.001"
                    value={editTransaction.weight}
                    onChange={(e) => setEditTransaction({...editTransaction, weight: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="editTunch">Tunch (%)</Label>
                  <Input
                    id="editTunch"
                    type="number"
                    step="0.01"
                    value={editTransaction.tunch}
                    onChange={(e) => setEditTransaction({...editTransaction, tunch: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="editWastage">Wastage (%)</Label>
                  <Input
                    id="editWastage"
                    type="number"
                    step="0.01"
                    value={editTransaction.wastage}
                    onChange={(e) => setEditTransaction({...editTransaction, wastage: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="editWages">Wages (per 1000)</Label>
                  <Input
                    id="editWages"
                    type="number"
                    step="0.01"
                    value={editTransaction.wages}
                    onChange={(e) => setEditTransaction({...editTransaction, wages: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="editSilverAmount">Silver Amount</Label>
                  <Input
                    id="editSilverAmount"
                    type="number"
                    step="0.01"
                    value={editTransaction.silver_amount}
                    onChange={(e) => setEditTransaction({...editTransaction, silver_amount: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="editType">Bill Type</Label>
                  <Select 
                    value={editTransaction.payment_type} 
                    onValueChange={(value) => setEditTransaction({...editTransaction, payment_type: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="credit">Credit</SelectItem>
                      <SelectItem value="debit">Debit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-md">
                <div>
                  <Label>Calculated Total Fine</Label>
                  <div className="text-lg font-semibold">{totalFine.toFixed(4)}g</div>
                </div>
                <div>
                  <Label>Calculated Total Amount</Label>
                  <div className="text-lg font-semibold">₹{totalAmount.toFixed(2)}</div>
                </div>
              </div>
              
              <div>
                <Label htmlFor="editDescription">Description</Label>
                <Textarea
                  id="editDescription"
                  value={editTransaction.description}
                  onChange={(e) => setEditTransaction({...editTransaction, description: e.target.value})}
                  rows={3}
                />
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={handleUpdateTransaction}
                  disabled={updateTransactionMutation.isPending}
                  className="flex-1"
                >
                  {updateTransactionMutation.isPending ? "Updating..." : "Update Transaction"}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setShowEditDialog(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* View Details Dialog */}
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


import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Package, Plus, TrendingUp, TrendingDown, Edit, Moon, Sun } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { stockAPI } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { useTheme } from "next-themes";

const StockPage = () => {
  const [addAmount, setAddAmount] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [description, setDescription] = useState("");
  const [transactionType, setTransactionType] = useState<"add" | "deduct">("add");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { theme, setTheme } = useTheme();

  const { data: currentStock } = useQuery({
    queryKey: ['stock', 'current'],
    queryFn: stockAPI.getCurrent,
  });

  const { data: stockHistory = [] } = useQuery({
    queryKey: ['stock', 'history'],
    queryFn: stockAPI.getHistory,
  });

  const addStockMutation = useMutation({
    mutationFn: ({ amount, type, desc }: { amount: number; type: "add" | "deduct"; desc: string }) => 
      stockAPI.addTransaction(amount, type, desc),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock'] });
      toast({
        title: "Success",
        description: "Stock transaction completed successfully!",
      });
      setAddAmount("");
      setDescription("");
      setIsAddDialogOpen(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to process stock transaction. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateStockMutation = useMutation({
    mutationFn: ({ amount, type, desc }: { amount: number; type: "add" | "deduct"; desc: string }) => 
      stockAPI.updateStock(amount, type, desc),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock'] });
      toast({
        title: "Success",
        description: "Stock updated successfully!",
      });
      setEditAmount("");
      setIsEditDialogOpen(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update stock. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleAddStock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addAmount || parseFloat(addAmount) <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid amount.",
        variant: "destructive",
      });
      return;
    }
    addStockMutation.mutate({
      amount: parseFloat(addAmount),
      type: transactionType,
      desc: description || `Stock ${transactionType} - Manual entry`
    });
  };

  const handleUpdateStock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editAmount || parseFloat(editAmount) <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid amount.",
        variant: "destructive",
      });
      return;
    }
    updateStockMutation.mutate({
      amount: parseFloat(editAmount),
      type: "add",
      desc: `Stock adjustment - ${description || "Manual adjustment"}`
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Stock Management</h1>
            <p className="text-slate-600 dark:text-slate-300 mt-1">Manage your inventory and track stock movements</p>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="border-slate-300 dark:border-slate-600"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </div>

        {/* Stock Overview */}
        <Card className="border-0 shadow-lg bg-white dark:bg-slate-800">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-lg">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Package className="h-6 w-6" />
              Current Stock Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-6 rounded-lg border border-green-200 dark:border-green-800">
                <h3 className="text-lg font-semibold text-green-800 dark:text-green-300 mb-2">Total Stock</h3>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                  {currentStock?.current_stock?.toFixed(4) || '0.0000'} grams
                </p>
              </div>
              
              <div className="flex gap-3">
                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Transaction
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-white dark:bg-slate-800">
                    <DialogHeader>
                      <DialogTitle className="text-slate-900 dark:text-white">Add Stock Transaction</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleAddStock} className="space-y-4">
                      <div>
                        <Label htmlFor="transactionType" className="text-slate-700 dark:text-slate-300">Transaction Type</Label>
                        <Select value={transactionType} onValueChange={(value: "add" | "deduct") => setTransactionType(value)}>
                          <SelectTrigger className="border-slate-300 dark:border-slate-600">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="add">Add Stock</SelectItem>
                            <SelectItem value="deduct">Deduct Stock</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="addAmount" className="text-slate-700 dark:text-slate-300">Amount (grams)</Label>
                        <Input
                          id="addAmount"
                          type="number"
                          step="0.0001"
                          value={addAmount}
                          onChange={(e) => setAddAmount(e.target.value)}
                          placeholder="Enter amount"
                          className="border-slate-300 dark:border-slate-600"
                        />
                      </div>
                      <div>
                        <Label htmlFor="description" className="text-slate-700 dark:text-slate-300">Description</Label>
                        <Textarea
                          id="description"
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          placeholder="Enter description (optional)"
                          className="border-slate-300 dark:border-slate-600"
                        />
                      </div>
                      <Button 
                        type="submit" 
                        className="w-full bg-blue-600 hover:bg-blue-700"
                        disabled={addStockMutation.isPending}
                      >
                        {addStockMutation.isPending ? "Processing..." : "Add Transaction"}
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>

                <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="border-slate-300 dark:border-slate-600">
                      <Edit className="h-4 w-4 mr-2" />
                      Adjust Stock
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-white dark:bg-slate-800">
                    <DialogHeader>
                      <DialogTitle className="text-slate-900 dark:text-white">Adjust Current Stock</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleUpdateStock} className="space-y-4">
                      <div>
                        <Label htmlFor="editAmount" className="text-slate-700 dark:text-slate-300">New Stock Amount (grams)</Label>
                        <Input
                          id="editAmount"
                          type="number"
                          step="0.0001"
                          value={editAmount}
                          onChange={(e) => setEditAmount(e.target.value)}
                          placeholder="Enter new stock amount"
                          className="border-slate-300 dark:border-slate-600"
                        />
                      </div>
                      <div>
                        <Label htmlFor="editDescription" className="text-slate-700 dark:text-slate-300">Reason for Adjustment</Label>
                        <Textarea
                          id="editDescription"
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          placeholder="Enter reason for stock adjustment"
                          className="border-slate-300 dark:border-slate-600"
                        />
                      </div>
                      <Button 
                        type="submit" 
                        className="w-full bg-green-600 hover:bg-green-700"
                        disabled={updateStockMutation.isPending}
                      >
                        {updateStockMutation.isPending ? "Updating..." : "Update Stock"}
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stock History */}
        <Card className="border-0 shadow-lg bg-white dark:bg-slate-800">
          <CardHeader className="bg-slate-50 dark:bg-slate-700 border-b border-slate-200 dark:border-slate-600 rounded-t-lg">
            <CardTitle className="text-lg font-semibold text-slate-800 dark:text-slate-200">Transaction History</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 dark:bg-slate-700">
                    <TableHead className="font-semibold text-slate-700 dark:text-slate-300">Date & Time</TableHead>
                    <TableHead className="font-semibold text-slate-700 dark:text-slate-300">Type</TableHead>
                    <TableHead className="font-semibold text-slate-700 dark:text-slate-300">Amount (grams)</TableHead>
                    <TableHead className="font-semibold text-slate-700 dark:text-slate-300">Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stockHistory.map((stock) => (
                    <TableRow 
                      key={stock.id} 
                      className="hover:bg-slate-50 dark:hover:bg-slate-700 border-b border-slate-100 dark:border-slate-600"
                    >
                      <TableCell className="text-slate-700 dark:text-slate-300">
                        {format(new Date(stock.created_at), 'dd/MM/yyyy HH:mm')}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={stock.transaction_type === 'add' ? 'default' : 'secondary'}
                          className={`flex items-center gap-1 w-fit ${
                            stock.transaction_type === 'add' 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
                              : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                          }`}
                        >
                          {stock.transaction_type === 'add' ? (
                            <TrendingUp className="h-3 w-3" />
                          ) : (
                            <TrendingDown className="h-3 w-3" />
                          )}
                          {stock.transaction_type.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium text-slate-900 dark:text-slate-100">
                        {stock.amount.toFixed(4)}
                      </TableCell>
                      <TableCell className="text-slate-700 dark:text-slate-300">{stock.description}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {stockHistory.length === 0 && (
                <div className="text-center py-12">
                  <Package className="h-16 w-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">No transactions found</h3>
                  <p className="text-slate-500 dark:text-slate-400">Stock transactions will appear here</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StockPage;

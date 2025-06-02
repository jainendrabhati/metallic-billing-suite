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
import { Package, Plus, TrendingUp, TrendingDown, Edit, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { stockAPI, stockItemAPI } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const StockPage = () => {
  const [itemName, setItemName] = useState("");
  const [currentWeight, setCurrentWeight] = useState("");
  const [description, setDescription] = useState("");
  const [transactionAmount, setTransactionAmount] = useState("");
  const [transactionType, setTransactionType] = useState<"add" | "deduct">("add");
  const [selectedItem, setSelectedItem] = useState("");
  const [transactionDescription, setTransactionDescription] = useState("");
  const [editingItem, setEditingItem] = useState<any>(null);
  
  const [isAddItemDialogOpen, setIsAddItemDialogOpen] = useState(false);
  const [isTransactionDialogOpen, setIsTransactionDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: stockItems = [] } = useQuery({
    queryKey: ['stock-items'],
    queryFn: stockItemAPI.getAll,
  });

  const { data: currentStock } = useQuery({
    queryKey: ['stock', 'current'],
    queryFn: stockAPI.getCurrent,
  });

  const { data: stockHistory = [] } = useQuery({
    queryKey: ['stock', 'history'],
    queryFn: stockAPI.getHistory,
  });

  const createItemMutation = useMutation({
    mutationFn: stockItemAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-items'] });
      toast({
        title: "Success",
        description: "Stock item created successfully!",
      });
      resetItemForm();
      setIsAddItemDialogOpen(false);
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => stockItemAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-items'] });
      toast({
        title: "Success",
        description: "Stock item updated successfully!",
      });
      resetItemForm();
      setIsEditDialogOpen(false);
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: stockItemAPI.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-items'] });
      toast({
        title: "Success",
        description: "Stock item deleted successfully!",
      });
    },
  });

  const addTransactionMutation = useMutation({
    mutationFn: ({ amount, type, item_name, desc }: { amount: number; type: "add" | "deduct"; item_name: string; desc: string }) => 
      stockAPI.addTransaction(amount, type, item_name, desc),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock'] });
      queryClient.invalidateQueries({ queryKey: ['stock-items'] });
      toast({
        title: "Success",
        description: "Stock transaction completed successfully!",
      });
      resetTransactionForm();
      setIsTransactionDialogOpen(false);
    },
  });

  const resetItemForm = () => {
    setItemName("");
    setCurrentWeight("");
    setDescription("");
    setEditingItem(null);
  };

  const resetTransactionForm = () => {
    setTransactionAmount("");
    setSelectedItem("");
    setTransactionDescription("");
  };

  const handleCreateItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName || !currentWeight) {
      toast({
        title: "Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }
    createItemMutation.mutate({
      item_name: itemName,
      current_weight: parseFloat(currentWeight),
      description,
    });
  };

  const handleUpdateItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !itemName || !currentWeight) {
      toast({
        title: "Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }
    updateItemMutation.mutate({
      id: editingItem.id,
      data: {
        item_name: itemName,
        current_weight: parseFloat(currentWeight),
        description,
      },
    });
  };

  const handleEditItem = (item: any) => {
    setEditingItem(item);
    setItemName(item.item_name);
    setCurrentWeight(item.current_weight.toString());
    setDescription(item.description);
    setIsEditDialogOpen(true);
  };

  const handleTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!transactionAmount || !selectedItem) {
      toast({
        title: "Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }
    addTransactionMutation.mutate({
      amount: parseFloat(transactionAmount),
      type: transactionType,
      item_name: selectedItem,
      desc: transactionDescription || `Manual ${transactionType} for ${selectedItem}`,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Stock Management System</h1>
            <p className="text-slate-600 mt-1">Manage inventory items and track stock movements</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Dialog open={isAddItemDialogOpen} onOpenChange={setIsAddItemDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                <Plus className="h-4 w-4 mr-2" />
                Add New Item
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-white">
              <DialogHeader>
                <DialogTitle className="text-slate-900">Add New Stock Item</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateItem} className="space-y-4">
                <div>
                  <Label htmlFor="itemName" className="text-slate-700">Item Name *</Label>
                  <Input
                    id="itemName"
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                    placeholder="Enter item name"
                    className="border-slate-300"
                  />
                </div>
                <div>
                  <Label htmlFor="currentWeight" className="text-slate-700">Initial Weight (grams) *</Label>
                  <Input
                    id="currentWeight"
                    type="number"
                    step="0.0001"
                    value={currentWeight}
                    onChange={(e) => setCurrentWeight(e.target.value)}
                    placeholder="Enter initial weight"
                    className="border-slate-300"
                  />
                </div>
                <div>
                  <Label htmlFor="description" className="text-slate-700">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Enter description (optional)"
                    className="border-slate-300"
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  disabled={createItemMutation.isPending}
                >
                  {createItemMutation.isPending ? "Creating..." : "Create Item"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={isTransactionDialogOpen} onOpenChange={setIsTransactionDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-slate-300">
                <TrendingUp className="h-4 w-4 mr-2" />
                Add Transaction
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-white">
              <DialogHeader>
                <DialogTitle className="text-slate-900">Stock Transaction</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleTransaction} className="space-y-4">
                <div>
                  <Label htmlFor="selectedItem" className="text-slate-700">Select Item *</Label>
                  <Select value={selectedItem} onValueChange={setSelectedItem}>
                    <SelectTrigger className="border-slate-300">
                      <SelectValue placeholder="Select an item" />
                    </SelectTrigger>
                    <SelectContent>
                      {stockItems.map((item) => (
                        <SelectItem key={item.id} value={item.item_name}>
                          {item.item_name} ({item.current_weight.toFixed(4)}g)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="transactionType" className="text-slate-700">Transaction Type</Label>
                  <Select value={transactionType} onValueChange={(value: "add" | "deduct") => setTransactionType(value)}>
                    <SelectTrigger className="border-slate-300">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="add">Add Stock</SelectItem>
                      <SelectItem value="deduct">Deduct Stock</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="transactionAmount" className="text-slate-700">Amount (grams) *</Label>
                  <Input
                    id="transactionAmount"
                    type="number"
                    step="0.0001"
                    value={transactionAmount}
                    onChange={(e) => setTransactionAmount(e.target.value)}
                    placeholder="Enter amount"
                    className="border-slate-300"
                  />
                </div>
                <div>
                  <Label htmlFor="transactionDescription" className="text-slate-700">Description</Label>
                  <Textarea
                    id="transactionDescription"
                    value={transactionDescription}
                    onChange={(e) => setTransactionDescription(e.target.value)}
                    placeholder="Enter description (optional)"
                    className="border-slate-300"
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full bg-green-600 hover:bg-green-700"
                  disabled={addTransactionMutation.isPending}
                >
                  {addTransactionMutation.isPending ? "Processing..." : "Add Transaction"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stock Items Table */}
        <Card className="border-0 shadow-lg bg-white">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-lg">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Package className="h-6 w-6" />
              Stock Items Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="font-semibold text-slate-700">Item Name</TableHead>
                    <TableHead className="font-semibold text-slate-700">Current Weight (grams)</TableHead>
                    <TableHead className="font-semibold text-slate-700">Description</TableHead>
                    <TableHead className="font-semibold text-slate-700">Last Updated</TableHead>
                    <TableHead className="font-semibold text-slate-700">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stockItems.map((item) => (
                    <TableRow 
                      key={item.id} 
                      className="hover:bg-slate-50 border-b border-slate-100"
                    >
                      <TableCell className="font-medium text-slate-900">{item.item_name}</TableCell>
                      <TableCell className="text-slate-700">{item.current_weight.toFixed(4)}</TableCell>
                      <TableCell className="text-slate-700">{item.description}</TableCell>
                      <TableCell className="text-slate-700">
                        {format(new Date(item.updated_at), 'dd/MM/yyyy HH:mm')}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditItem(item)}
                            className="border-slate-300"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteItemMutation.mutate(item.id)}
                            className="border-red-300 text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {stockItems.length === 0 && (
                <div className="text-center py-12">
                  <Package className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-slate-900 mb-2">No stock items found</h3>
                  <p className="text-slate-500">Add your first stock item to get started</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="bg-white">
            <DialogHeader>
              <DialogTitle className="text-slate-900">Edit Stock Item</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUpdateItem} className="space-y-4">
              <div>
                <Label htmlFor="editItemName" className="text-slate-700">Item Name *</Label>
                <Input
                  id="editItemName"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  placeholder="Enter item name"
                  className="border-slate-300"
                />
              </div>
              <div>
                <Label htmlFor="editCurrentWeight" className="text-slate-700">Current Weight (grams) *</Label>
                <Input
                  id="editCurrentWeight"
                  type="number"
                  step="0.0001"
                  value={currentWeight}
                  onChange={(e) => setCurrentWeight(e.target.value)}
                  placeholder="Enter current weight"
                  className="border-slate-300"
                />
              </div>
              <div>
                <Label htmlFor="editDescription" className="text-slate-700">Description</Label>
                <Textarea
                  id="editDescription"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter description (optional)"
                  className="border-slate-300"
                />
              </div>
              <Button 
                type="submit" 
                className="w-full bg-blue-600 hover:bg-blue-700"
                disabled={updateItemMutation.isPending}
              >
                {updateItemMutation.isPending ? "Updating..." : "Update Item"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Transaction History */}
        <Card className="border-0 shadow-lg bg-white">
          <CardHeader className="bg-slate-50 border-b border-slate-200 rounded-t-lg">
            <CardTitle className="text-lg font-semibold text-slate-800">Transaction History</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="font-semibold text-slate-700">Date & Time</TableHead>
                    <TableHead className="font-semibold text-slate-700">Item</TableHead>
                    <TableHead className="font-semibold text-slate-700">Type</TableHead>
                    <TableHead className="font-semibold text-slate-700">Amount (grams)</TableHead>
                    <TableHead className="font-semibold text-slate-700">Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stockHistory.map((stock) => (
                    <TableRow 
                      key={stock.id} 
                      className="hover:bg-slate-50 border-b border-slate-100"
                    >
                      <TableCell className="text-slate-700">
                        {format(new Date(stock.created_at), 'dd/MM/yyyy HH:mm')}
                      </TableCell>
                      <TableCell className="font-medium text-slate-900">
                        {stock.item_name}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={stock.transaction_type === 'add' ? 'default' : 'secondary'}
                          className={`flex items-center gap-1 w-fit ${
                            stock.transaction_type === 'add' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
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
                      <TableCell className="font-medium text-slate-900">
                        {stock.amount.toFixed(4)}
                      </TableCell>
                      <TableCell className="text-slate-700">{stock.description}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {stockHistory.length === 0 && (
                <div className="text-center py-12">
                  <Package className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-slate-900 mb-2">No transactions found</h3>
                  <p className="text-slate-500">Stock transactions will appear here</p>
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

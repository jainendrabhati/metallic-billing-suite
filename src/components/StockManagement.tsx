
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Package, Plus, TrendingUp, TrendingDown } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { stockAPI } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const StockManagement = () => {
  const [addAmount, setAddAmount] = useState("");
  const [description, setDescription] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: currentStock } = useQuery({
    queryKey: ['stock', 'current'],
    queryFn: stockAPI.getCurrent,
  });

  const { data: stockHistory = [] } = useQuery({
    queryKey: ['stock', 'history'],
    queryFn: stockAPI.getHistory,
  });

  const addStockMutation = useMutation({
    mutationFn: ({ amount, desc }: { amount: number; desc: string }) => 
      stockAPI.addTransaction(amount, 'add', 'General Stock', desc),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock'] });
      toast({
        title: "Success",
        description: "Stock added successfully!",
      });
      setAddAmount("");
      setDescription("");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add stock. Please try again.",
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
      desc: description || "Manual stock addition" 
    });
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-lg border-0">
        <CardHeader className="bg-gradient-to-r from-purple-600 to-purple-700 text-white">
          <CardTitle className="flex items-center gap-2 text-xl">
            <Package className="h-5 w-5" />
            Stock Management
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-6 rounded-lg border border-blue-200">
              <h3 className="text-lg font-semibold text-blue-800 mb-2">Current Stock</h3>
              <p className="text-3xl font-bold text-blue-600">
                {currentStock?.current_stock?.toFixed(4) || '0.0000'} grams
              </p>
            </div>
            
            <form onSubmit={handleAddStock} className="space-y-4">
              <div>
                <Label htmlFor="addAmount">Add Stock (grams)</Label>
                <Input
                  id="addAmount"
                  type="number"
                  step="0.0001"
                  value={addAmount}
                  onChange={(e) => setAddAmount(e.target.value)}
                  placeholder="Enter amount to add"
                  className="border-gray-300 focus:border-blue-500"
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter description (optional)"
                  className="border-gray-300 focus:border-blue-500"
                />
              </div>
              <Button 
                type="submit" 
                className="w-full bg-purple-600 hover:bg-purple-700"
                disabled={addStockMutation.isPending}
              >
                <Plus className="h-4 w-4 mr-2" />
                {addStockMutation.isPending ? "Adding..." : "Add Stock"}
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-lg border-0">
        <CardHeader className="bg-gray-50 border-b">
          <CardTitle className="text-lg font-semibold text-gray-800">Stock Transaction History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="font-semibold text-gray-700">Date</TableHead>
                  <TableHead className="font-semibold text-gray-700">Type</TableHead>
                  <TableHead className="font-semibold text-gray-700">Amount (grams)</TableHead>
                  <TableHead className="font-semibold text-gray-700">Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stockHistory.map((stock) => (
                  <TableRow key={stock.id} className="hover:bg-gray-50 border-b border-gray-100">
                    <TableCell className="text-gray-700">
                      {format(new Date(stock.created_at), 'dd/MM/yyyy HH:mm')}
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
                    <TableCell className="font-medium text-gray-900">
                      {stock.amount.toFixed(4)}
                    </TableCell>
                    <TableCell className="text-gray-700">{stock.description}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {stockHistory.length === 0 && (
              <div className="text-center py-12">
                <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No stock transactions found</h3>
                <p className="text-gray-500">Stock transactions will appear here</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StockManagement;

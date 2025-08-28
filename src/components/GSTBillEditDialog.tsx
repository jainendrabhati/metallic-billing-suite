import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Minus, Save } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { gstBillAPI, GSTBill, GSTBillItem } from "@/services/gstBillAPI";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";

interface GSTBillEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bill: GSTBill | null;
}

const GSTBillEditDialog = ({ open, onOpenChange, bill }: GSTBillEditDialogProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState<Partial<GSTBill>>({
    bill_number: "",
    date: "",
    time: "",
    place: "",
    customer_name: "",
    customer_address: "",
    customer_gstin: "",
    items: [],
    total_amount_before_tax: 0,
    cgst_percentage: 9,
    sgst_percentage: 9,
    igst_percentage: 0,
    cgst_amount: 0,
    sgst_amount: 0,
    igst_amount: 0,
    grand_total: 0,
    amount_in_words: "",
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<GSTBill> }) => 
      gstBillAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gst-bills'] });
      toast({
        title: "Success",
        description: "GST bill updated successfully!",
      });
      onOpenChange(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update GST bill.",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (bill && open) {
      setFormData(bill);
    }
  }, [bill, open]);

  const addItem = () => {
    const newItem: GSTBillItem = {
      description: "",
      hsn: "",
      weight: 0,
      rate: 0,
      amount: 0,
    };
    setFormData(prev => ({
      ...prev,
      items: [...(prev.items || []), newItem]
    }));
  };

  const removeItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      items: (prev.items || []).filter((_, i) => i !== index)
    }));
    setTimeout(() => calculateTotals(), 0);
  };

  const updateItem = (index: number, field: keyof GSTBillItem, value: any) => {
    const updatedItems = [...(formData.items || [])];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    
    if (field === 'weight' || field === 'rate') {
      updatedItems[index].amount = updatedItems[index].weight * updatedItems[index].rate/1000;
    }
    
    setFormData(prev => ({ ...prev, items: updatedItems }));
    setTimeout(() => calculateTotals(), 0);
  };

  const calculateTotals = () => {
    const totalAmountBeforeTax = (formData.items || []).reduce((sum, item) => sum + item.amount, 0);
    
    const cgstAmount = (totalAmountBeforeTax * (formData.cgst_percentage || 0)) / 100;
    const sgstAmount = (totalAmountBeforeTax * (formData.sgst_percentage || 0)) / 100;
    const igstAmount = (totalAmountBeforeTax * (formData.igst_percentage || 0)) / 100;
    
    const grandTotal = totalAmountBeforeTax + cgstAmount + sgstAmount + igstAmount;
    
    setFormData(prev => ({
      ...prev,
      total_amount_before_tax: totalAmountBeforeTax,
      cgst_amount: cgstAmount,
      sgst_amount: sgstAmount,
      igst_amount: igstAmount,
      grand_total: grandTotal,
    }));
  };

  useEffect(() => {
    calculateTotals();
  }, [formData.items, formData.cgst_percentage, formData.sgst_percentage, formData.igst_percentage]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bill?.id) return;

    const billData = {
      ...formData,
      items: formData.items || [],
    };

    updateMutation.mutate({ id: bill.id, data: billData });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Edit GST Bill #{bill?.bill_number}</DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="max-h-[80vh] pr-4">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Bill Information */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="bill_number">Bill Number</Label>
                <Input
                  id="bill_number"
                  value={formData.bill_number}
                  onChange={(e) => setFormData(prev => ({ ...prev, bill_number: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="time">Time</Label>
                <Input
                  id="time"
                  type="time"
                  value={formData.time}
                  onChange={(e) => setFormData(prev => ({ ...prev, time: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="place">Place</Label>
                <Input
                  id="place"
                  value={formData.place}
                  onChange={(e) => setFormData(prev => ({ ...prev, place: e.target.value }))}
                  required
                />
              </div>
            </div>

            {/* Customer Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Customer Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="customer_name">Customer Name</Label>
                <Input
                  id="customer_name"
                  value={formData.customer_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, customer_name: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="customer_gstin">Customer GSTIN</Label>
                <Input
                  id="customer_gstin"
                  value={formData.customer_gstin}
                  onChange={(e) => setFormData(prev => ({ ...prev, customer_gstin: e.target.value }))}
                />
              </div>
              </div>
              <div>
                <Label htmlFor="customer_address">Customer Address</Label>
                <Textarea
                  id="customer_address"
                  value={formData.customer_address}
                  onChange={(e) => setFormData(prev => ({ ...prev, customer_address: e.target.value }))}
                  required
                />
              </div>
              
            </div>

            {/* Items */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Items</h3>
                <Button type="button" onClick={addItem} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              </div>
              
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead>HSN</TableHead>
                      <TableHead>Weight</TableHead>
                      <TableHead>Rate</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(formData.items || []).map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Input
                            value={item.description}
                            onChange={(e) => updateItem(index, 'description', e.target.value)}
                            placeholder="Item description"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={item.hsn}
                            onChange={(e) => updateItem(index, 'hsn', e.target.value)}
                            placeholder="HSN code"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            value={item.weight}
                            onChange={(e) => updateItem(index, 'weight', parseFloat(e.target.value) || 0)}
                            placeholder="0.00"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            value={item.rate}
                            onChange={(e) => updateItem(index, 'rate', parseFloat(e.target.value) || 0)}
                            placeholder="0.00"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            value={item.amount}
                            readOnly
                            className="bg-gray-100"
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeItem(index)}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Tax Calculation */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Tax Calculation</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="cgst_percentage">CGST %</Label>
                  <Input
                    id="cgst_percentage"
                    type="number"
                    step="0.01"
                    value={formData.cgst_percentage}
                    onChange={(e) => setFormData(prev => ({ ...prev, cgst_percentage: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
                <div>
                  <Label htmlFor="sgst_percentage">SGST %</Label>
                  <Input
                    id="sgst_percentage"
                    type="number"
                    step="0.01"
                    value={formData.sgst_percentage}
                    onChange={(e) => setFormData(prev => ({ ...prev, sgst_percentage: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
                <div>
                  <Label htmlFor="igst_percentage">IGST %</Label>
                  <Input
                    id="igst_percentage"
                    type="number"
                    step="0.01"
                    value={formData.igst_percentage}
                    onChange={(e) => setFormData(prev => ({ ...prev, igst_percentage: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
              </div>
              
              <div className="border-t pt-4">
                <div className="text-center text-sm">
                  <div className="flex justify-between">
                    <span>Total Amount (Before Tax):</span>
                    <span>₹{formData.total_amount_before_tax?.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>CGST Amount:</span>
                    <span>₹{formData.cgst_amount?.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>SGST Amount:</span>
                    <span>₹{formData.sgst_amount?.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>IGST Amount:</span>
                    <span>₹{formData.igst_amount?.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg col-span-2 border-t pt-2">
                    <span>Grand Total:</span>
                    <span>₹{formData.grand_total?.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-4 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                <Save className="h-4 w-4 mr-2" />
                {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default GSTBillEditDialog;
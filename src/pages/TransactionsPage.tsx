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
import { billAPI, customerAPI } from "@/services/api";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import AppSidebar from "@/components/AppSidebar";
import { useSidebar } from "@/components/SidebarProvider";
import Navbar from "@/components/Navbar";
import PDFPreviewModal from "@/components/PDFPreviewModal";
import { generatePDFHeader, generateBankDetailsSection } from "@/components/PDFTemplateHeader";
import { settingsAPI } from "@/services/api";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";


interface Bill {
  id: number;
  bill_number: string;
  customer_id: number;
  customer_name: string;
  item_name: string;
  item: string;
  weight: number;
  tunch: number;
  wages: number;
  wastage: number;
  silver_amount: number;
  additional_amount: number;
  total_fine: number;
  total_amount: number;
  payment_type: string;
  slip_no: string;
  description: string;
  date: string;
  created_at: string;
  updated_at: string;
}

const TransactionsPage = () => {
  const { isOpen } = useSidebar();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editBill, setEditBill] = useState<any>(null);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewContent, setPreviewContent] = useState("");
  const [previewTitle, setPreviewTitle] = useState("");

  const { toast } = useToast();
  const queryClient = useQueryClient();

  
  const { data: firmSettings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsAPI.getFirmSettings(),
  });


  const { data: bills = [], refetch, isError, error } = useQuery({
    queryKey: ['bills'],
    queryFn: () => billAPI.getAll(),
  });

  // Filter bills based on date and customer name
  const filteredBills = bills.filter((bill: Bill) => {
    let matches = true;
    
    if (startDate && bill.date < startDate) matches = false;
    if (endDate && bill.date > endDate) matches = false;
    if (customerName && !bill.customer_name.toLowerCase().includes(customerName.toLowerCase())) matches = false;
    
    return matches;
  });

  const updateBillMutation = useMutation({
    mutationFn: (data: { id: number; updates: any }) => {
      return billAPI.update(data.id, data.updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills'] });
      toast({
        title: "Success",
        description: "Bill updated successfully!",
      });
      setShowEditDialog(false);
      setEditBill(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update bill.",
        variant: "destructive",
      });
    },
  });

  const deleteBillMutation = useMutation({
    mutationFn: (billId: number) => billAPI.delete(billId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills'] });
      toast({
        title: "Success",
        description: "Bill deleted successfully!",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete bill.",
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
  };

  const handleViewDetails = (bill: Bill) => {
    setSelectedBill(bill);
    setShowDetailsDialog(true);
  };

  const handleEditBill = (bill: Bill) => {
    setEditBill({
      id: bill.id,
      bill_number: bill.bill_number,
      customer_id: bill.customer_id,
      item_name: bill.item_name,
      item: bill.item,
      weight: bill.weight,
      tunch: bill.tunch,
      wages: bill.wages,
      wastage: bill.wastage,
      silver_amount: bill.silver_amount,
      additional_amount: bill.additional_amount,
      payment_type: bill.payment_type,
      slip_no: bill.slip_no,
      description: bill.description,
      date: bill.date,
    });
    setShowEditDialog(true);
  };

  // const handleDeleteBill = (bill: Bill) => {
  //   if (confirm("Are you sure you want to delete this bill? This action cannot be undone.")) {
  //     deleteBillMutation.mutate(bill.id);
  //   }
  // };

  const handleUpdateBill = () => {
    if (editBill) {
      const updates: any = {
        item_name: editBill.item_name,
        item: editBill.item,
        weight: parseFloat(editBill.weight),
        tunch: parseFloat(editBill.tunch),
        wages: parseFloat(editBill.wages),
        wastage: parseFloat(editBill.wastage),
        silver_amount: parseFloat(editBill.silver_amount),
        additional_amount: parseFloat(editBill.additional_amount),
        payment_type: editBill.payment_type,
        slip_no: editBill.slip_no,
        description: editBill.description,
        date: editBill.date,
      };
      
      updateBillMutation.mutate({
        id: editBill.id,
        updates
      });
    }
  };

  const calculateTotals = () => {
    if (!editBill) return { totalFine: 0, totalAmount: 0 };
    
    const weight = parseFloat(editBill.weight) || 0;
    const tunch = parseFloat(editBill.tunch) || 0;
    const wastage = parseFloat(editBill.wastage) || 0;
    const wages = parseFloat(editBill.wages) || 0;
    const silverAmount = parseFloat(editBill.silver_amount) || 0;
    const additionalAmount = parseFloat(editBill.additional_amount) || 0;
    
    const rawTotalFine = weight * ((tunch + wastage) / 100);
    
    // Apply rounding logic
    let totalFine;
    if (rawTotalFine === 0) {
      totalFine = 0;
    } else {
      const integerPart = Math.floor(rawTotalFine);
      const decimalPart = rawTotalFine - integerPart;
      
      if (editBill.payment_type === 'debit') {
        // For debit: if > 0.50, round up, otherwise round down
        totalFine = decimalPart > 0.50 ? integerPart + 1 : integerPart;
      } else {
        // For credit: if > 0.70, round up, otherwise round down
        totalFine = decimalPart > 0.70 ? integerPart + 1 : integerPart;
      }
    }
    
    let totalAmount = (weight * (wages / 1000)) + additionalAmount;
      totalAmount += silverAmount;
    
    
    return { totalFine, totalAmount };
  };

  const { totalFine, totalAmount } = calculateTotals();

  const handlePrintBill = (bill: Bill) => {
    if ((window as any).printingInProgress) {
      return;
    }
    
    (window as any).printingInProgress = true;
    const printContent = `
      <html>
  <head>
    <style>
      body { font-family: Arial, sans-serif; margin: 20px; font-size: 14px; }
      .header { text-align: center; border: 2px solid #000; padding: 15px; margin-bottom: 20px; }
      .bill-details { margin: 20px 0; }
      .item-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
      .item-table th, .item-table td { border: 1px solid #000; padding: 8px; text-align: left; }
      .item-table th { background-color: #f0f0f0; font-weight: bold; text-align: center; }
      .footer { margin-top: 10px; } /* reduced from 30px */
      .signature { display: flex; justify-content: space-between; margin-top: 20px; } /* reduced from 50px */
      @media print { body { margin: 0; } }
    </style>
  </head>
  <body>
    ${generatePDFHeader({ firmSettings, title: "BILL RECEIPT" })}
    <div class="bill-details">
      <p><strong>Date:</strong> ${format(new Date(bill.date), 'dd/MM/yyyy')}</p>
      <p><strong>Customer:</strong> ${bill.customer_name}</p>
      <p><strong>Payment Type:</strong> ${bill.payment_type.toUpperCase()}</p>
    </div>

    <div class="item-details">
      <table class="item-table">
        <thead>
          <tr>
          <th>Item </th>
            <th>Item Type</th>
            <th>Weight</th>
            <th>Tunch</th>
            <th>Wastage</th>
            <th>Wages</th>
            <th>Fine</th>
            <th>External Amount</th>
            <th>Total Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>${bill.item_name}</td>
            <td>${bill.item}</td>
            <td>${bill.weight?.toFixed(2)}</td>
            <td>${bill.tunch?.toFixed(2)}</td>
            <td>${bill.wastage?.toFixed(2)}</td>
            <td>${bill.wages?.toFixed(2)}</td>
            <td>${bill.total_fine?.toFixed(2)}g</td>
            <td>${bill.silver_amount?.toFixed(2)}</td>
            <td>₹${bill.total_amount?.toFixed(2)}</td>
          </tr>
        </tbody>
      </table>
      ${bill.description ? `<div><p><strong>Description:</strong> ${bill.description}</p></div>` : ''}
    </div>

    <div class="footer">
      <div class="signature" style="margin-top: 20px; width: 100%;">
        <div style="text-align: left;">
          <p>_________________</p>
          <p>Customer Signature</p>
        </div>
        <div style="text-align: right;">
          <p>_________________</p>
          <p>Authorized Signature</p>
        </div>
      </div>
    </div>
 <div style="margin-top: 20px; text-align: center;">
      <button onclick="window.print(); setTimeout(() => { window.printingInProgress = false; window.close(); }, 1000);" style="padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer;">Print</button>
    </div>
  </body>
</html>
    `;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      
      // Reset flag when window closes
      printWindow.onbeforeunload = () => {
        (window as any).printingInProgress = false;
      };
      
      // Auto-reset flag after timeout as backup
      setTimeout(() => {
        (window as any).printingInProgress = false;
      }, 5000);
    } else {
      (window as any).printingInProgress = false;
    }
  };

  const handlePrint = () => {
    // The PDFPreviewModal handles printing
  };

  const handleDownload = () => {
    // The PDFPreviewModal handles download
  };

  return (
     <>
    <AppSidebar />
          <div className={`transition-all duration-300 ${isOpen ? "ml-64" : "ml-16"}`}>
            <Navbar />
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-black "> Transactions</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Filter Bills
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
          <CardTitle>Bills History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Slip Number</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Weight</TableHead>
                  <TableHead>Total Fine</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Type</TableHead>
                  
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
               <TableBody>
                    {[...filteredBills]
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      
                      .map((bill: Bill) => (
                        <TableRow key={bill.id}>
                          <TableCell>{new Date(bill.date).toLocaleDateString('en-GB')}</TableCell>
                          <TableCell>{bill.slip_no}</TableCell>
                          <TableCell>{bill.customer_name}</TableCell>
                          <TableCell>{bill.item_name}</TableCell>
                          <TableCell>{bill.weight.toFixed(2)}g</TableCell>
                          <TableCell>{bill.total_fine.toFixed(2)}g</TableCell>
                          <TableCell>₹{bill.total_amount.toFixed(2)}</TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded text-xs ${
                              bill.payment_type === 'credit'
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                            }`}>
                              {bill.payment_type}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                             
                              <Button size="sm" onClick={() => handleEditBill(bill)}><Edit className="w-4 h-4" /></Button>
                              <Button size="sm" onClick={() => handlePrintBill(bill)}><Printer className="w-4 h-4" /></Button>
                              <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => setSelectedBill(bill)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </AlertDialogTrigger>

                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Bill</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete{" "}
                                    <span className="font-semibold">
                                      Bill #{selectedBill?.bill_number}
                                    </span>
                                    ? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => {
                                      if (selectedBill) {
                                        deleteBillMutation.mutate(selectedBill.id);
                                      }
                                    }}
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* PDF Preview Modal */}
      <PDFPreviewModal
        isOpen={previewModalOpen}
        onOpenChange={setPreviewModalOpen}
        title={previewTitle}
        content={previewContent}
        onDownload={handleDownload}
        onPrint={handlePrint}
      />

     
      {/* Edit Bill Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Bill</DialogTitle>
          </DialogHeader>
          {editBill && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="editDate">Date</Label>
                  <Input
                    id="editDate"
                    type="date"
                    value={editBill.date}
                    onChange={(e) => setEditBill({...editBill, date: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="editPaymentType">Payment Type</Label>
                  <Select 
                    value={editBill.payment_type} 
                    onValueChange={(value) => setEditBill({...editBill, payment_type: value})}
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
                <div>
                  <Label htmlFor="editItemName">Item Name</Label>
                  <Input
                    id="editItemName"
                    value={editBill.item_name}
                    onChange={(e) => setEditBill({...editBill, item_name: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="editItem">Item Type</Label>
                  <Input
                    id="editItem"
                    value={editBill.item}
                    onChange={(e) => setEditBill({...editBill, item: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="editWeight">Weight (g)</Label>
                  <Input
                    id="editWeight"
                    type="number"
                    step="0.01"
                    value={editBill.weight}
                    onChange={(e) => setEditBill({...editBill, weight: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="editTunch">Tunch (%)</Label>
                  <Input
                    id="editTunch"
                    type="number"
                    step="0.01"
                    value={editBill.tunch}
                    onChange={(e) => setEditBill({...editBill, tunch: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="editWastage">Wastage (%)</Label>
                  <Input
                    id="editWastage"
                    type="number"
                    step="0.01"
                    value={editBill.wastage}
                    onChange={(e) => setEditBill({...editBill, wastage: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="editWages">Wages (per 1000g)</Label>
                  <Input
                    id="editWages"
                    type="number"
                    step="0.01"
                    value={editBill.wages}
                    onChange={(e) => setEditBill({...editBill, wages: e.target.value})}
                  />
                </div>
               
                  <div>
                    <Label htmlFor="editSilverAmount">External Amount</Label>
                    <Input
                      id="editSilverAmount"
                      type="number"
                      step="0.01"
                      value={editBill.silver_amount}
                      onChange={(e) => setEditBill({...editBill, silver_amount: e.target.value})}
                    />
                  </div>
                
                
                <div>
                  <Label htmlFor="editSlipNo">Slip No.</Label>
                  <Input
                    id="editSlipNo"
                    value={editBill.slip_no}
                    onChange={(e) => setEditBill({...editBill, slip_no: e.target.value})}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="editDescription">Description</Label>
                <Textarea
                  id="editDescription"
                  value={editBill.description}
                  onChange={(e) => setEditBill({...editBill, description: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded">
                <div>
                  <strong>Calculated Total Fine:</strong> {totalFine.toFixed(2)}g
                </div>
                <div>
                  <strong>Calculated Total Amount:</strong> ₹{totalAmount.toFixed(2)}
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleUpdateBill} className="flex-1">
                  Update Bill
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
    </div>
    </div>

    <PDFPreviewModal
      isOpen={previewModalOpen}
      onOpenChange={setPreviewModalOpen}
      title={previewTitle}
      content={previewContent}
      onDownload={handleDownload}
      onPrint={handlePrint}
    />
    </>
  );
};

export default TransactionsPage;
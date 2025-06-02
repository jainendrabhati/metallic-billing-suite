
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Eye, FileText, Printer } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { customerAPI, billAPI } from "@/services/api";
import { format } from "date-fns";

const PendingListPage = () => {
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [selectedBill, setSelectedBill] = useState<any>(null);
  const [showBillDialog, setShowBillDialog] = useState(false);

  const { data: pendingCustomers = [] } = useQuery({
    queryKey: ['pendingCustomers'],
    queryFn: customerAPI.getPending,
  });

  const { data: customerBills = [] } = useQuery({
    queryKey: ['customerBills', selectedCustomer?.id],
    queryFn: () => customerAPI.getBills(selectedCustomer?.id),
    enabled: !!selectedCustomer,
  });

  const handleViewBills = (customer: any) => {
    setSelectedCustomer(customer);
  };

  const handleViewBillDetails = (bill: any) => {
    setSelectedBill(bill);
    setShowBillDialog(true);
  };

  const handlePrintBill = (bill: any) => {
    const printContent = `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>Bill Details</h2>
        <p><strong>Bill Number:</strong> ${bill.bill_number}</p>
        <p><strong>Customer:</strong> ${bill.customer_name}</p>
        <p><strong>Item:</strong> ${bill.item}</p>
        <p><strong>Weight:</strong> ${bill.weight} grams</p>
        <p><strong>Tunch:</strong> ${bill.tunch}%</p>
        <p><strong>Wages:</strong> ₹${bill.wages}</p>
        <p><strong>Wastage:</strong> ${bill.wastage}%</p>
        <p><strong>Total Fine:</strong> ${bill.total_fine} grams</p>
        <p><strong>Total Wages:</strong> ₹${(bill.wages * bill.weight).toFixed(2)}</p>
        ${bill.payment_type === 'credit' ? `<p><strong>Silver Amount:</strong> ₹${bill.silver_amount}</p>` : ''}
        <p><strong>Total Amount:</strong> ₹${bill.total_amount}</p>
        <p><strong>Date:</strong> ${format(new Date(bill.date), 'dd/MM/yyyy')}</p>
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
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Pending List</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Customers with Pending Amounts</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer Name</TableHead>
                <TableHead>Mobile</TableHead>
                <TableHead>Total Bills</TableHead>
                <TableHead>Pending Amount</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingCustomers.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell className="font-medium">{customer.name}</TableCell>
                  <TableCell>{customer.mobile}</TableCell>
                  <TableCell>{customer.total_bills}</TableCell>
                  <TableCell>
                    <Badge variant="destructive">₹{customer.pending_amount?.toFixed(2) || '0.00'}</Badge>
                  </TableCell>
                  <TableCell>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleViewBills(customer)}
                      className="flex items-center gap-2"
                    >
                      <Eye className="h-4 w-4" />
                      View Bills
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {selectedCustomer && (
        <Card>
          <CardHeader>
            <CardTitle>Bills for {selectedCustomer.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bill Number</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Weight</TableHead>
                  <TableHead>Tunch</TableHead>
                  <TableHead>Wages</TableHead>
                  <TableHead>Wastage</TableHead>
                  <TableHead>Total Fine</TableHead>
                  <TableHead>Total Wages</TableHead>
                  {customerBills.some(bill => bill.payment_type === 'credit') && (
                    <TableHead>Silver Amount</TableHead>
                  )}
                  <TableHead>Amount</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customerBills.map((bill) => (
                  <TableRow key={bill.id}>
                    <TableCell>{bill.bill_number}</TableCell>
                    <TableCell>{bill.item}</TableCell>
                    <TableCell>{bill.weight}g</TableCell>
                    <TableCell>{bill.tunch}%</TableCell>
                    <TableCell>₹{bill.wages}</TableCell>
                    <TableCell>{bill.wastage}%</TableCell>
                    <TableCell>{bill.total_fine}g</TableCell>
                    <TableCell>₹{(bill.wages * bill.weight).toFixed(2)}</TableCell>
                    {bill.payment_type === 'credit' && (
                      <TableCell>₹{bill.silver_amount}</TableCell>
                    )}
                    <TableCell>₹{bill.total_amount}</TableCell>
                    <TableCell>{format(new Date(bill.date), 'dd/MM/yyyy')}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleViewBillDetails(bill)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handlePrintBill(bill)}
                        >
                          <Printer className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={showBillDialog} onOpenChange={setShowBillDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Bill Details</DialogTitle>
          </DialogHeader>
          {selectedBill && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-medium">Bill Number:</label>
                  <p>{selectedBill.bill_number}</p>
                </div>
                <div>
                  <label className="font-medium">Customer:</label>
                  <p>{selectedBill.customer_name}</p>
                </div>
                <div>
                  <label className="font-medium">Item:</label>
                  <p>{selectedBill.item}</p>
                </div>
                <div>
                  <label className="font-medium">Weight:</label>
                  <p>{selectedBill.weight} grams</p>
                </div>
                <div>
                  <label className="font-medium">Tunch:</label>
                  <p>{selectedBill.tunch}%</p>
                </div>
                <div>
                  <label className="font-medium">Wages:</label>
                  <p>₹{selectedBill.wages}</p>
                </div>
                <div>
                  <label className="font-medium">Wastage:</label>
                  <p>{selectedBill.wastage}%</p>
                </div>
                <div>
                  <label className="font-medium">Total Fine:</label>
                  <p>{selectedBill.total_fine} grams</p>
                </div>
                <div>
                  <label className="font-medium">Total Wages:</label>
                  <p>₹{(selectedBill.wages * selectedBill.weight).toFixed(2)}</p>
                </div>
                {selectedBill.payment_type === 'credit' && (
                  <div>
                    <label className="font-medium">Silver Amount:</label>
                    <p>₹{selectedBill.silver_amount}</p>
                  </div>
                )}
                <div>
                  <label className="font-medium">Total Amount:</label>
                  <p>₹{selectedBill.total_amount}</p>
                </div>
                <div>
                  <label className="font-medium">Date:</label>
                  <p>{format(new Date(selectedBill.date), 'dd/MM/yyyy')}</p>
                </div>
              </div>
              <Button 
                onClick={() => handlePrintBill(selectedBill)}
                className="w-full"
              >
                <Printer className="h-4 w-4 mr-2" />
                Print Bill
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PendingListPage;

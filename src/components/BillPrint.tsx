
import React from 'react';
import { Bill } from '@/services/api';

interface BillPrintProps {
  bill: Bill;
  firmSettings: any;
}

const BillPrint: React.FC<BillPrintProps> = ({ bill, firmSettings }) => {
  const handlePrint = () => {
    const printContent = document.getElementById('bill-print-content');
    const printWindow = window.open('', '_blank');
    
    if (printWindow && printContent) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Bill ${bill.bill_number}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
              .logo { max-height: 60px; margin-bottom: 10px; }
              .bill-details { margin: 20px 0; }
              .table { width: 100%; border-collapse: collapse; margin: 20px 0; }
              .table th, .table td { border: 1px solid #000; padding: 8px; text-align: left; }
              .table th { background-color: #f0f0f0; }
              .footer { margin-top: 30px; text-align: center; }
              .signature { margin-top: 50px; }
              @media print { 
                body { margin: 0; } 
                .no-print { display: none; }
              }
            </style>
          </head>
          <body>
            ${printContent.innerHTML}
          </body>
        </html>
      `);
      
      printWindow.document.close();
      printWindow.print();
      printWindow.close();
    }
  };

  return (
    <div>
      <button 
        onClick={handlePrint}
        className="mb-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 no-print"
      >
        Print Bill
      </button>
      
      <div id="bill-print-content" className="max-w-4xl mx-auto bg-white p-8">
        <div className="header">
          {firmSettings?.logo_path && (
            <img src={firmSettings.logo_path} alt="Logo" className="logo mx-auto" />
          )}
          <h1 className="text-2xl font-bold">{firmSettings?.firm_name || 'Metalic Jewelers'}</h1>
          <p>{firmSettings?.address}</p>
          <p>GST No: {firmSettings?.gst_number}</p>
        </div>

        <div className="bill-details">
          <div className="flex justify-between mb-4">
            <div>
              <p><strong>Bill No:</strong> {bill.bill_number}</p>
              <p><strong>Date:</strong> {new Date(bill.date).toLocaleDateString()}</p>
            </div>
            <div>
              <p><strong>Customer:</strong> {bill.customer_name}</p>
              <p><strong>Type:</strong> {bill.payment_type.toUpperCase()}</p>
            </div>
          </div>

          <table className="table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Weight (g)</th>
                <th>Tunch</th>
                <th>Wastage</th>
                <th>Wages</th>
                <th>Total Fine (g)</th>
                {bill.payment_type === 'credit' && <th>Silver Amount</th>}
                <th>Total Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{bill.item}</td>
                <td>{bill.weight.toFixed(4)}</td>
                <td>{bill.tunch.toFixed(2)}</td>
                <td>{bill.wastage.toFixed(2)}</td>
                <td>{bill.wages.toFixed(2)}</td>
                <td>{bill.total_fine.toFixed(4)}</td>
                {bill.payment_type === 'credit' && <td>₹{bill.silver_amount.toFixed(2)}</td>}
                <td>₹{bill.total_amount.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>

          {bill.description && (
            <div className="mt-4">
              <p><strong>Description:</strong> {bill.description}</p>
            </div>
          )}
        </div>

        <div className="footer">
          <div className="signature">
            <div className="flex justify-between mt-16">
              <div>
                <p>_________________</p>
                <p>Customer Signature</p>
              </div>
              <div>
                <p>_________________</p>
                <p>Authorized Signature</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BillPrint;

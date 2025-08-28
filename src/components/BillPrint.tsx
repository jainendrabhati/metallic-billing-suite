import React from "react";
import { Bill } from "@/services/api";

interface BillPrintProps {
  bill: Bill;
  firmSettings: any;
}

const BillPrint: React.FC<BillPrintProps> = ({ bill, firmSettings }) => {
  const handlePrint = () => {
    if (window.printWindowOpen) {
      return;
    }
    
    const printContent = document.getElementById("bill-print-content");
    window.printWindowOpen = true;
    const printWindow = window.open("", "_blank");

    if (printWindow && printContent) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Bill</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; font-size: 14px; }
              .header { text-align: center; border: 2px solid #000; padding: 15px; margin-bottom: 20px; }
              .logo { max-height: 60px; margin-bottom: 10px; }
              .bill-details { margin: 20px 0; }
              .item-table { 
                width: 100%; 
                border-collapse: collapse; /* no spacing between rows/columns */
                margin: 20px 0; 
              }
              .item-table th, .item-table td { border: 1px solid #000; padding: 8px; text-align: center; }
              .item-table th { background-color: #f0f0f0; font-weight: bold; }
              .footer { margin-top: 10px; }
              .signature { display: flex; justify-content: space-between; margin-top: 20px; }
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
      printWindow.onafterprint = () => {
        window.printWindowOpen = false;
      };
      printWindow.onbeforeunload = () => {
        window.printWindowOpen = false;
      };
      printWindow.print();
      printWindow.close();
      } else {
      window.printWindowOpen = false;
    }
  };

  return (
    <div>
      {/* Print Button (hidden in print) */}
      <button
        onClick={handlePrint}
        className="mb-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 no-print"
      >
        Print Bill
      </button>

      {/* Bill Content */}
      <div
        id="bill-print-content"
        className="max-w-4xl mx-auto bg-white p-8 text-sm"
      >
        {/* HEADER */}
        <div className="header">
          {firmSettings?.logo_path && (
            <img
              src={firmSettings.logo_path}
              alt="Logo"
              className="logo mx-auto"
            />
          )}
          <h1 className="text-2xl font-bold">
            {firmSettings?.firm_name || "Metalic Jewelers"}
          </h1>

          {/* Address in ONE line */}
          {(firmSettings?.address || firmSettings?.city) && (
            <p>
              {firmSettings?.address}
              {firmSettings?.city ? `, ${firmSettings.city}` : ""}
              {firmSettings?.state ? `, ${firmSettings.state}` : ""}
            </p>
          )}

          {firmSettings?.gst_number && <p>GST No: {firmSettings.gst_number}</p>}
          {firmSettings?.mobile && <p>Mobile: {firmSettings.mobile}</p>}
        </div>

        {/* BILL DETAILS */}
        <div className="bill-details">
          <p>
            <strong>Date:</strong>{" "}
            {new Date(bill.date).toLocaleDateString("en-GB")}
          </p>
          <p>
            <strong>Customer:</strong> {bill.customer_name}
          </p>
          <p>
            <strong>Payment Type:</strong> {bill.payment_type.toUpperCase()}
          </p>
        </div>

        {/* ITEM TABLE */}
        <div className="item-details">
          <table
  className="item-table"
  style={{
    width: "100%",
    borderCollapse: "separate",
    borderSpacing: "3px 0", // 3px horizontal gap, no vertical gap
    margin: "20px 0",
  }}
>
  <thead>
    <tr>
      <th className="text-center">Item Name</th>
      <th className="text-center">Item Type</th>
      <th className="text-center">Weight</th>
      <th className="text-center">Tunch</th>
      <th className="text-center">Wastage</th>
      <th className="text-center">Wages</th>
      <th className="text-center">Fine</th>
      <th className="text-center">External Amount</th>
      <th className="text-center">Total Amount</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td className="text-center">{bill.item_name}</td>
      <td className="text-center">{bill.item}</td>
      <td className="text-center">{bill.weight?.toFixed(2)}</td>
      <td className="text-center">{bill.tunch?.toFixed(2)}</td>
      <td className="text-center">{bill.wastage?.toFixed(2)}</td>
      <td className="text-center">{bill.wages?.toFixed(2)}</td>
      <td className="text-center">{bill.total_fine?.toFixed(2)}g</td>
      <td className="text-center">{bill.silver_amount?.toFixed(2)}</td>
      <td className="text-center">₹{bill.total_amount?.toFixed(2)}</td>
    </tr>
  </tbody>
</table>


          {/* DESCRIPTION */}
          {bill.description && (
            <div className="mt-2">
              <p>
                <strong>Description:</strong> {bill.description}
              </p>
            </div>
          )}
        </div>

        {/* SIGNATURES */}
        <div className="footer">
          <div className="signature">
            <div className="text-left">
              <p>_________________</p>
              <p>Customer Signature</p>
            </div>
            <div className="text-right">
              <p>_________________</p>
              <p>Authorized Signature</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BillPrint;

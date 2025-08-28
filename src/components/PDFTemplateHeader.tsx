interface PDFTemplateHeaderProps {
  firmSettings?: any;
  title?: string;
}

export const generatePDFHeader = ({ firmSettings, title = "Document" }: PDFTemplateHeaderProps) => {
  console.log("Generating PDF Header with firmSettings:", firmSettings);
  return `
    <div class="header" style="text-align: center; border: 2px solid #000; padding: 10px; margin-bottom: 20px; line-height: 1.3;">
      <h2 style="margin: 0;">${firmSettings?.firm_name}</h2>
      <p style="margin: 2px 0;">${firmSettings?.address}</p>
      <p style="margin: 2px 0;">Email: ${firmSettings?.email || 'XXXXXXXXX@gmail.com'}</p>
      <p style="margin: 2px 0;"><strong>GSTIN:</strong> ${firmSettings?.gst_number || 'XXXXXXXXXXXXXXX'}</p>
      <p style="margin: 2px 0;">Mob.: ${firmSettings?.mobile || 'XXXXXXXXXX'}</p>
    </div>
  `;
};

export const generateBankDetailsSection = (firmSettings?: any) => {
  return `
    <strong>Bank Name:</strong> ${firmSettings?.bank_name || 'STATE BANK OF INDIA'}<br>
    <strong>Branch:</strong> ${firmSettings?.branch_address || 'Benad Road, Jaipur'}<br>
    <strong>A/c No.:</strong> ${firmSettings?.account_number || '61338285502'}<br>
    <strong>IFSC Code:</strong> ${firmSettings?.ifsc_code || 'SBIN0032380'}<br>
  `;
};

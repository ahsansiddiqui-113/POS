/**
 * Invoice generation utilities for PDF and HTML formatting
 */

export interface InvoiceData {
  id: number;
  date: string;
  customerName?: string;
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    discount?: number;
    total: number;
  }>;
  subtotal: number;
  tax?: number;
  total: number;
  paymentMethod?: string;
}

export interface CompanySettings {
  companyName: string;
  logo?: string;
  address?: string;
  phone?: string;
  email?: string;
  bankName?: string;
  bankAccount?: string;
  paymentTerms?: string;
  termsConditions?: string;
  footerText?: string;
}

export const generateInvoiceHTML = (invoice: InvoiceData, company: CompanySettings): string => {
  const itemsHTML = invoice.items
    .map(
      item => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #ddd;">${item.name}</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">${item.quantity}</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">Rs. ${item.unitPrice.toFixed(2)}</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">${item.discount || 0}%</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">Rs. ${item.total.toFixed(2)}</td>
    </tr>
  `
    )
    .join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Invoice #${invoice.id}</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .invoice { max-width: 800px; margin: 20px auto; padding: 20px; }
        .header { display: flex; justify-content: space-between; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
        .company-info { flex: 1; }
        .invoice-title { flex: 1; text-align: right; }
        .invoice-number { font-size: 20px; font-weight: bold; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        th { background: #f5f5f5; padding: 10px; text-align: left; border-bottom: 2px solid #333; }
        .totals { text-align: right; padding: 20px; border-top: 2px solid #333; }
        .total-row { font-size: 18px; font-weight: bold; color: #0066cc; }
        .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="invoice">
        <div class="header">
          <div class="company-info">
            ${company.logo ? `<img src="${company.logo}" alt="Logo" style="max-height: 50px; margin-bottom: 10px;">` : ''}
            <div style="font-size: 18px; font-weight: bold; margin-bottom: 5px;">${company.companyName}</div>
            ${company.address ? `<div style="font-size: 12px; color: #666;">${company.address}</div>` : ''}
            ${company.phone ? `<div style="font-size: 12px; color: #666;">Phone: ${company.phone}</div>` : ''}
            ${company.email ? `<div style="font-size: 12px; color: #666;">Email: ${company.email}</div>` : ''}
          </div>
          <div class="invoice-title">
            <div style="font-size: 24px; font-weight: bold;">INVOICE</div>
            <div style="font-size: 16px; color: #666;">Invoice #${invoice.id}</div>
            <div style="font-size: 14px; margin-top: 10px;">Date: ${new Date(invoice.date).toLocaleDateString()}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th style="text-align: right;">Qty</th>
              <th style="text-align: right;">Unit Price</th>
              <th style="text-align: right;">Discount</th>
              <th style="text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHTML}
          </tbody>
        </table>

        <div class="totals">
          <div style="margin-bottom: 10px;">Subtotal: Rs. ${invoice.subtotal.toFixed(2)}</div>
          ${invoice.tax ? `<div style="margin-bottom: 10px;">Tax: Rs. ${invoice.tax.toFixed(2)}</div>` : ''}
          <div class="total-row">Total: Rs. ${invoice.total.toFixed(2)}</div>
          ${invoice.paymentMethod ? `<div style="margin-top: 10px; font-size: 12px;">Payment Method: ${invoice.paymentMethod}</div>` : ''}
        </div>

        ${
          company.bankName
            ? `
        <div style="margin: 20px 0; padding: 15px; background: #f9f9f9; border-radius: 4px; font-size: 12px;">
          <strong>Bank Details:</strong><br>
          Bank: ${company.bankName}<br>
          ${company.bankAccount ? `Account: ${company.bankAccount}<br>` : ''}
        </div>
        `
            : ''
        }

        ${
          company.paymentTerms
            ? `<div style="margin: 20px 0; font-size: 12px;"><strong>Payment Terms:</strong> ${company.paymentTerms}</div>`
            : ''
        }

        <div class="footer">
          ${company.footerText ? `<div style="margin-bottom: 10px;">${company.footerText}</div>` : ''}
          <div>Generated on ${new Date().toLocaleString()}</div>
        </div>
      </div>
    </body>
    </html>
  `;
};

export const downloadInvoicePDF = async (html: string, fileName: string = 'invoice.pdf') => {
  // This would typically use a library like pdfkit or html2pdf
  // For now, we'll just create a simple implementation
  const blob = new Blob([html], { type: 'text/html' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

export const printInvoice = (html: string) => {
  const printWindow = window.open('', '', 'width=800,height=600');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
  }
};

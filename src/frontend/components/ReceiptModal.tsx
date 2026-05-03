import React, { useState, useEffect } from 'react';
import { FaTimes, FaPrint, FaDownload } from 'react-icons/fa';

interface ReceiptItem {
  id: number;
  product_name: string;
  quantity: number;
  unit_price: number;
  discounted_price?: number;
  discount_percentage?: number;
}

interface ReceiptData {
  id: number;
  created_at: string;
  total_amount: number;
  items: ReceiptItem[];
  payment_method: string;
}

interface InvoiceSettings {
  company_name: string;
  address: string;
  phone: string;
  email: string;
  bank_account: string;
  bank_name: string;
  bank_code: string;
  payment_terms: string;
  footer_text: string;
  terms_conditions: string;
}

interface ReceiptModalProps {
  isOpen: boolean;
  sale: ReceiptData | null;
  onClose: () => void;
}

export default function ReceiptModal({ isOpen, sale, onClose }: ReceiptModalProps) {
  const [settings, setSettings] = useState<InvoiceSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const backendUrl = window.electron?.getBackendUrl?.() || 'http://localhost:3001';

  useEffect(() => {
    if (isOpen && sale) {
      fetchSettings();
    }
  }, [isOpen, sale]);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${backendUrl}/api/invoice-settings`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` },
      });
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '', 'width=600,height=800');
    if (printWindow) {
      printWindow.document.write(getReceiptHTML());
      printWindow.document.close();
      printWindow.print();
    }
  };

  const handleDownload = () => {
    const element = document.createElement('a');
    const file = new Blob([getReceiptHTML()], { type: 'text/html' });
    element.href = URL.createObjectURL(file);
    element.download = `receipt-${sale?.id}.html`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const getReceiptHTML = () => {
    if (!sale || !settings) return '';

    const date = new Date(sale.created_at);
    const formattedDate = date.toLocaleDateString();
    const formattedTime = date.toLocaleTimeString();

    let itemsHTML = sale.items
      .map(
        (item) => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.product_name}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">Rs. ${item.unit_price.toFixed(2)}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">Rs. ${((item.discounted_price || item.unit_price) * item.quantity).toFixed(2)}</td>
      </tr>
    `
      )
      .join('');

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Receipt - ${sale.id}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      max-width: 600px;
      margin: 0;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .receipt {
      background-color: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      border-bottom: 2px solid #333;
      padding-bottom: 15px;
      margin-bottom: 15px;
    }
    .store-name {
      font-size: 24px;
      font-weight: bold;
      color: #333;
      margin-bottom: 5px;
    }
    .store-info {
      font-size: 12px;
      color: #666;
      line-height: 1.6;
    }
    .receipt-number {
      text-align: center;
      font-size: 12px;
      color: #999;
      margin: 10px 0;
    }
    .items-table {
      width: 100%;
      margin: 20px 0;
      border-collapse: collapse;
    }
    .items-table th {
      text-align: left;
      padding: 10px 8px;
      border-bottom: 2px solid #333;
      font-weight: bold;
      font-size: 12px;
    }
    .items-table td {
      padding: 8px;
      border-bottom: 1px solid #eee;
      font-size: 12px;
    }
    .summary {
      margin: 20px 0;
      padding: 10px 0;
      border-top: 2px solid #333;
      border-bottom: 2px solid #333;
    }
    .summary-row {
      display: flex;
      justify-content: space-between;
      padding: 5px 0;
      font-size: 12px;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      font-size: 14px;
      font-weight: bold;
    }
    .footer {
      text-align: center;
      margin-top: 15px;
      padding-top: 15px;
      border-top: 1px solid #eee;
      font-size: 11px;
      color: #666;
      line-height: 1.6;
    }
    .payment-method {
      text-align: center;
      font-size: 12px;
      margin: 10px 0;
      padding: 10px;
      background-color: #f0f0f0;
      border-radius: 4px;
    }
    @media print {
      body {
        background-color: white;
        padding: 0;
      }
      .receipt {
        box-shadow: none;
        border-radius: 0;
        padding: 0;
      }
    }
  </style>
</head>
<body>
  <div class="receipt">
    <div class="header">
      <div class="store-name">${settings.company_name}</div>
      <div class="store-info">
        <div>${settings.address}</div>
        <div>📞 ${settings.phone}</div>
        ${settings.email ? `<div>📧 ${settings.email}</div>` : ''}
      </div>
    </div>

    <div class="receipt-number">
      Receipt #${sale.id} | ${formattedDate} ${formattedTime}
    </div>

    <table class="items-table">
      <thead>
        <tr>
          <th>Item</th>
          <th style="text-align: center;">Qty</th>
          <th style="text-align: right;">Price</th>
          <th style="text-align: right;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHTML}
      </tbody>
    </table>

    <div class="summary">
      <div class="summary-row">
        <span>Subtotal:</span>
        <span>Rs. ${sale.items.reduce((sum, item) => sum + ((item.discounted_price || item.unit_price) * item.quantity), 0).toFixed(2)}</span>
      </div>
      <div class="total-row">
        <span>TOTAL:</span>
        <span>Rs. ${sale.total_amount.toFixed(2)}</span>
      </div>
    </div>

    <div class="payment-method">
      <strong>Payment Method:</strong> ${sale.payment_method}
    </div>

    ${settings.payment_terms ? `
      <div style="text-align: center; font-size: 11px; padding: 10px 0;">
        <strong>Terms:</strong> ${settings.payment_terms}
      </div>
    ` : ''}

    <div class="footer">
      ${settings.footer_text ? `<div>${settings.footer_text}</div>` : ''}
      <div style="margin-top: 10px;">Thank you for your purchase!</div>
      ${settings.terms_conditions ? `<div style="margin-top: 10px; font-size: 10px;">${settings.terms_conditions}</div>` : ''}
    </div>
  </div>
</body>
</html>
    `;
  };

  if (!isOpen || !sale) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-96 overflow-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white p-4 flex justify-between items-center sticky top-0">
          <h2 className="text-2xl font-bold">Receipt</h2>
          <button
            onClick={onClose}
            className="hover:bg-blue-700 p-2 rounded transition"
          >
            <FaTimes size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="text-center py-8">Loading receipt...</div>
          ) : settings && sale ? (
            <div className="bg-white border rounded-lg p-6 text-sm">
              {/* Store Header */}
              <div className="text-center border-b-2 pb-4 mb-4">
                <div className="text-2xl font-bold text-gray-800">
                  {settings.company_name}
                </div>
                <div className="text-gray-600 mt-2">
                  <p>{settings.address}</p>
                  <p>📞 {settings.phone}</p>
                  {settings.email && <p>📧 {settings.email}</p>}
                </div>
              </div>

              {/* Receipt Number & Date */}
              <div className="text-center text-gray-500 text-xs mb-4">
                Receipt #{sale.id} | {new Date(sale.created_at).toLocaleDateString()}{' '}
                {new Date(sale.created_at).toLocaleTimeString()}
              </div>

              {/* Items */}
              <table className="w-full mb-4 border-collapse">
                <thead>
                  <tr className="border-b-2">
                    <th className="text-left py-2">Item</th>
                    <th className="text-center py-2">Qty</th>
                    <th className="text-right py-2">Price</th>
                    <th className="text-right py-2">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {sale.items.map((item) => (
                    <tr key={item.id} className="border-b">
                      <td className="py-2">{item.product_name}</td>
                      <td className="text-center">{item.quantity}</td>
                      <td className="text-right">
                        Rs. {item.unit_price.toFixed(2)}
                      </td>
                      <td className="text-right">
                        Rs.{' '}
                        {(
                          (item.discounted_price || item.unit_price) *
                          item.quantity
                        ).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals */}
              <div className="border-t-2 border-b-2 py-3 mb-4 space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>
                    Rs.{' '}
                    {sale.items
                      .reduce(
                        (sum, item) =>
                          sum + (item.discounted_price || item.unit_price) * item.quantity,
                        0
                      )
                      .toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-lg font-bold">
                  <span>TOTAL:</span>
                  <span>Rs. {sale.total_amount.toFixed(2)}</span>
                </div>
              </div>

              {/* Payment Method */}
              <div className="bg-gray-100 p-3 rounded text-center mb-4">
                <strong>Payment Method:</strong> {sale.payment_method}
              </div>

              {/* Footer */}
              <div className="text-center text-xs text-gray-600 space-y-1">
                {settings.payment_terms && <p>{settings.payment_terms}</p>}
                <p>Thank you for your purchase!</p>
                {settings.footer_text && (
                  <p className="text-gray-500">{settings.footer_text}</p>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center text-red-600">Failed to load receipt</div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="bg-gray-100 p-4 flex gap-3 sticky bottom-0">
          <button
            onClick={handlePrint}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition flex items-center justify-center gap-2"
          >
            <FaPrint size={16} />
            Print Receipt
          </button>
          <button
            onClick={handleDownload}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition flex items-center justify-center gap-2"
          >
            <FaDownload size={16} />
            Download
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-gray-400 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

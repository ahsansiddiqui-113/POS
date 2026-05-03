import { getDatabase } from '../database/db';
import { AppError } from '../middleware/errorHandler';
import * as fs from 'fs';
import * as path from 'path';

export interface InvoiceSettings {
  id: number;
  company_name?: string;
  logo_path?: string;
  address?: string;
  phone?: string;
  email?: string;
  bank_account?: string;
  bank_name?: string;
  bank_code?: string;
  terms_conditions?: string;
  payment_terms?: string;
  footer_text?: string;
  updated_at: string;
}

export class InvoiceSettingsService {
  private db = getDatabase();
  private logoDir = path.join(process.cwd(), 'public', 'logos');

  constructor() {
    if (!fs.existsSync(this.logoDir)) {
      fs.mkdirSync(this.logoDir, { recursive: true });
    }
  }

  // ============ SETTINGS CRUD ============

  getInvoiceSettings(): InvoiceSettings {
    const settings = this.db
      .prepare('SELECT * FROM invoice_settings LIMIT 1')
      .get() as InvoiceSettings | undefined;

    if (!settings) {
      throw new AppError(500, 'Invoice settings not initialized');
    }

    return settings;
  }

  updateInvoiceSettings(data: {
    companyName?: string;
    address?: string;
    phone?: string;
    email?: string;
    bankAccount?: string;
    bankName?: string;
    bankCode?: string;
    termsConditions?: string;
    paymentTerms?: string;
    footerText?: string;
  }): InvoiceSettings {
    const updates: string[] = [];
    const values: any[] = [];

    if (data.companyName !== undefined) {
      updates.push('company_name = ?');
      values.push(data.companyName || null);
    }

    if (data.address !== undefined) {
      updates.push('address = ?');
      values.push(data.address || null);
    }

    if (data.phone !== undefined) {
      updates.push('phone = ?');
      values.push(data.phone || null);
    }

    if (data.email !== undefined) {
      updates.push('email = ?');
      values.push(data.email || null);
    }

    if (data.bankAccount !== undefined) {
      updates.push('bank_account = ?');
      values.push(data.bankAccount || null);
    }

    if (data.bankName !== undefined) {
      updates.push('bank_name = ?');
      values.push(data.bankName || null);
    }

    if (data.bankCode !== undefined) {
      updates.push('bank_code = ?');
      values.push(data.bankCode || null);
    }

    if (data.termsConditions !== undefined) {
      updates.push('terms_conditions = ?');
      values.push(data.termsConditions || null);
    }

    if (data.paymentTerms !== undefined) {
      updates.push('payment_terms = ?');
      values.push(data.paymentTerms || null);
    }

    if (data.footerText !== undefined) {
      updates.push('footer_text = ?');
      values.push(data.footerText || null);
    }

    if (updates.length === 0) {
      return this.getInvoiceSettings();
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');

    const query = `UPDATE invoice_settings SET ${updates.join(', ')} LIMIT 1`;
    this.db.prepare(query).run(...values);

    return this.getInvoiceSettings();
  }

  // ============ LOGO MANAGEMENT ============

  uploadLogo(fileBuffer: Buffer, fileName: string): string {
    const allowedExtensions = ['png', 'jpg', 'jpeg', 'gif'];
    const ext = fileName.split('.').pop()?.toLowerCase();

    if (!ext || !allowedExtensions.includes(ext)) {
      throw new AppError(400, 'Invalid file type. Allowed: png, jpg, jpeg, gif');
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (fileBuffer.length > maxSize) {
      throw new AppError(400, 'File too large. Maximum size: 5MB');
    }

    const timestamp = Date.now();
    const safeFileName = `logo_${timestamp}.${ext}`;
    const filePath = path.join(this.logoDir, safeFileName);
    const relativeUrl = `/logos/${safeFileName}`;

    fs.writeFileSync(filePath, fileBuffer);

    // Update settings with new logo path
    this.db
      .prepare('UPDATE invoice_settings SET logo_path = ?, updated_at = CURRENT_TIMESTAMP')
      .run(relativeUrl);

    return relativeUrl;
  }

  removeLogo(): InvoiceSettings {
    const settings = this.getInvoiceSettings();

    if (settings.logo_path) {
      const filePath = path.join(process.cwd(), 'public', settings.logo_path);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    this.db
      .prepare('UPDATE invoice_settings SET logo_path = NULL, updated_at = CURRENT_TIMESTAMP')
      .run();

    return this.getInvoiceSettings();
  }

  // ============ INVOICE TEMPLATE GENERATION ============

  generateInvoiceTemplate(saleId: number): string {
    const sale = this.db
      .prepare(`
        SELECT
          s.id,
          s.sale_date,
          s.total_amount,
          u.username as user_name,
          COALESCE(e.hire_date, '') as employee_info
        FROM sales s
        JOIN users u ON s.user_id = u.id
        LEFT JOIN employees e ON s.employee_id = e.id
        WHERE s.id = ?
      `)
      .get(saleId) as any;

    if (!sale) {
      throw new AppError(404, 'Sale not found');
    }

    const items = this.db
      .prepare(`
        SELECT
          p.name,
          p.sku,
          si.quantity,
          si.unit_price,
          si.discount_percentage,
          si.discounted_price,
          si.subtotal
        FROM sale_items si
        JOIN products p ON si.product_id = p.id
        WHERE si.sale_id = ?
      `)
      .all(saleId) as any[];

    const settings = this.getInvoiceSettings();

    const formattedDate = new Date(sale.sale_date).toLocaleDateString('en-PK', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    let html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Invoice #${sale.id}</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .invoice-container { max-width: 800px; margin: 0 auto; padding: 20px; }
    .invoice-header { display: flex; justify-content: space-between; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
    .company-info { flex: 1; }
    .company-logo { width: 100px; height: 100px; object-fit: contain; }
    .company-name { font-size: 24px; font-weight: bold; margin-top: 10px; }
    .invoice-title { flex: 1; text-align: right; }
    .invoice-number { font-size: 20px; font-weight: bold; }
    .invoice-details { display: grid; grid-template-columns: 1fr 1fr; margin-bottom: 30px; gap: 20px; }
    .details-box { padding: 15px; background: #f9f9f9; border-radius: 4px; }
    .details-box label { font-weight: bold; display: block; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    th { background: #333; color: white; padding: 10px; text-align: left; }
    td { padding: 10px; border-bottom: 1px solid #ddd; }
    .totals { text-align: right; padding: 20px; border-top: 2px solid #333; }
    .total-row { font-size: 18px; font-weight: bold; }
    .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; }
  </style>
</head>
<body>
  <div class="invoice-container">
    <div class="invoice-header">
      <div class="company-info">
        ${settings.logo_path ? `<img src="${settings.logo_path}" alt="Logo" class="company-logo">` : ''}
        <div class="company-name">${settings.company_name || 'Company Name'}</div>
        <div>${settings.address || ''}</div>
        <div>${settings.phone || ''}</div>
        <div>${settings.email || ''}</div>
      </div>
      <div class="invoice-title">
        <div class="invoice-number">INVOICE</div>
        <div style="font-size: 16px; color: #666;">Invoice #${sale.id}</div>
      </div>
    </div>

    <div class="invoice-details">
      <div class="details-box">
        <label>Invoice Date</label>
        <div>${formattedDate}</div>
      </div>
      <div class="details-box">
        <label>Cashier</label>
        <div>${sale.user_name}</div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Item</th>
          <th>SKU</th>
          <th>Qty</th>
          <th>Unit Price</th>
          <th>Discount</th>
          <th style="text-align: right;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${items.map(item => `
        <tr>
          <td>${item.name}</td>
          <td>${item.sku}</td>
          <td style="text-align: center;">${item.quantity}</td>
          <td style="text-align: right;">Rs. ${item.unit_price.toFixed(2)}</td>
          <td style="text-align: center;">${item.discount_percentage || 0}%</td>
          <td style="text-align: right;">Rs. ${(item.discounted_price || item.subtotal).toFixed(2)}</td>
        </tr>
        `).join('')}
      </tbody>
    </table>

    <div class="totals">
      <div class="total-row">Total: Rs. ${sale.total_amount.toFixed(2)}</div>
    </div>

    ${settings.terms_conditions ? `
    <div style="margin-top: 30px; padding: 15px; background: #f9f9f9; border-radius: 4px; font-size: 12px;">
      <strong>Terms & Conditions:</strong><br>
      ${settings.terms_conditions}
    </div>
    ` : ''}

    ${settings.payment_terms ? `
    <div style="margin-top: 20px; font-size: 12px;">
      <strong>Payment Terms:</strong> ${settings.payment_terms}
    </div>
    ` : ''}

    <div class="footer">
      ${settings.bank_name ? `<div>Bank: ${settings.bank_name} - Account: ${settings.bank_account}${settings.bank_code ? ` - Code: ${settings.bank_code}` : ''}</div>` : ''}
      ${settings.footer_text ? `<div style="margin-top: 10px;">${settings.footer_text}</div>` : ''}
      <div style="margin-top: 10px;">Thank you for your business!</div>
    </div>
  </div>
</body>
</html>
    `;

    return html;
  }

  // ============ VALIDATION ============

  validateSettings(): any {
    const settings = this.getInvoiceSettings();
    const errors: string[] = [];

    if (!settings.company_name) errors.push('Company name is required');
    if (!settings.address) errors.push('Address is required');
    if (!settings.phone) errors.push('Phone is required');
    if (!settings.email) errors.push('Email is required');
    if (!settings.payment_terms) errors.push('Payment terms are required');

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

export const invoiceSettingsService = new InvoiceSettingsService();

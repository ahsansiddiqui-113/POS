import { salesService } from './salesService';
import { productService } from './productService';

export interface PrinterConfig {
  paperWidth: number; // in characters (default 40 or 58)
  useThermalPrinter: boolean;
  printerName: string;
  includeBarcode: boolean;
  includeLogo: boolean;
}

export interface ReceiptData {
  saleId: number;
  saleDate: string;
  userId: number;
  totalAmount: number;
  paymentMethod: string;
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }>;
}

export class ReceiptPrinterService {
  private config: PrinterConfig = {
    paperWidth: 40, // Standard receipt paper width (40 or 58 chars)
    useThermalPrinter: true,
    printerName: '', // Will be filled by system
    includeBarcode: false,
    includeLogo: true,
  };

  getConfig(): PrinterConfig {
    return { ...this.config };
  }

  updateConfig(config: Partial<PrinterConfig>): void {
    this.config = { ...this.config, ...config };
  }

  // Generate receipt text (for printing or saving)
  generateReceiptText(saleData: ReceiptData): string {
    const width = this.config.paperWidth;
    let receipt = '';

    // Header
    receipt += this.center('POS SYSTEM', width) + '\n';
    receipt += this.center('═'.repeat(width - 2), width) + '\n';
    receipt += this.center('Receipt', width) + '\n';
    receipt += this.divider(width) + '\n';

    // Sale info
    receipt += this.leftRight('Date:', this.formatDate(saleData.saleDate), width) + '\n';
    receipt += this.leftRight('Receipt #:', saleData.saleId.toString(), width) + '\n';
    receipt += this.leftRight('Payment:', saleData.paymentMethod.toUpperCase(), width) + '\n';
    receipt += this.divider(width) + '\n';

    // Items header
    receipt += this.leftRight('Item', 'Amount', width - 2) + '\n';
    receipt += this.divider(width) + '\n';

    // Items
    let subtotal = 0;

    for (const item of saleData.items) {
      // Product name (may wrap)
      const wrappedName = this.wrapText(item.name, width - 12);
      receipt += wrappedName[0].padEnd(width - 12);
      receipt += this.rightAlign(
        `₱${item.subtotal.toFixed(2)}`,
        12
      ) + '\n';

      if (wrappedName.length > 1) {
        for (let i = 1; i < wrappedName.length; i++) {
          receipt += '  ' + wrappedName[i] + '\n';
        }
      }

      // Quantity and unit price
      receipt +=
        `  Qty: ${item.quantity} @ ₱${item.unitPrice.toFixed(2)}\n`;

      subtotal += item.subtotal;
    }

    receipt += this.divider(width) + '\n';

    // Totals
    const tax = subtotal * 0.1; // 10% tax
    const total = subtotal + tax;

    receipt += this.leftRight('Subtotal:', `₱${subtotal.toFixed(2)}`, width) + '\n';
    receipt += this.leftRight('Tax (10%):', `₱${tax.toFixed(2)}`, width) + '\n';
    receipt += this.divider(width) + '\n';
    receipt += this.leftRight(
      'TOTAL:',
      `₱${total.toFixed(2)}`,
      width,
      true
    ) + '\n';
    receipt += this.divider(width) + '\n';

    // Footer message
    receipt += this.center('Thank you for your purchase!', width) + '\n';
    receipt += this.center('Please come again.', width) + '\n';
    receipt += '\n';
    receipt += this.center(`Printed: ${new Date().toLocaleString()}`, width) + '\n';
    receipt += this.center('═'.repeat(width - 2), width) + '\n';

    return receipt;
  }

  // Generate ESC/POS commands for thermal printer
  generateESCPOS(saleData: ReceiptData): Buffer {
    const commands: number[] = [];

    // Initialize printer
    commands.push(...this.ESC('M')); // Reset to default mode

    // Set font size to normal
    commands.push(...this.ESC('!', 0x00));

    // Center alignment
    commands.push(...this.ESC('a', 1));

    // Large font for title
    commands.push(...this.ESC('!', 0x30));
    this.addText(commands, 'POS SYSTEM');
    commands.push(10, 10);

    // Normal font
    commands.push(...this.ESC('!', 0x00));
    this.addText(commands, 'Receipt');
    commands.push(10);

    // Left alignment
    commands.push(...this.ESC('a', 0));

    // Sale info
    commands.push(10);
    this.addText(
      commands,
      `Date: ${this.formatDate(saleData.saleDate)}`
    );
    commands.push(10);
    this.addText(commands, `Receipt #: ${saleData.saleId}`);
    commands.push(10);
    this.addText(commands, `Payment: ${saleData.paymentMethod.toUpperCase()}`);
    commands.push(10, 10);

    // Items
    let subtotal = 0;

    for (const item of saleData.items) {
      const line = `${item.name.substring(0, 20).padEnd(20)}₱${item.subtotal.toFixed(2)}`;
      this.addText(commands, line);
      commands.push(10);

      const qtyLine = `  Qty: ${item.quantity} @ ₱${item.unitPrice.toFixed(2)}`;
      this.addText(commands, qtyLine);
      commands.push(10);

      subtotal += item.subtotal;
    }

    // Separator line
    commands.push(10);
    this.addText(
      commands,
      '════════════════════════════'
    );
    commands.push(10);

    // Totals
    const tax = subtotal * 0.1;
    const total = subtotal + tax;

    this.addText(commands, `Subtotal: ₱${subtotal.toFixed(2)}`);
    commands.push(10);
    this.addText(commands, `Tax (10%): ₱${tax.toFixed(2)}`);
    commands.push(10);

    // Large font for total
    commands.push(...this.ESC('!', 0x30));
    this.addText(commands, `TOTAL: ₱${total.toFixed(2)}`);
    commands.push(...this.ESC('!', 0x00));
    commands.push(10, 10);

    // Footer
    commands.push(...this.ESC('a', 1)); // Center
    this.addText(commands, 'Thank you!');
    commands.push(10);
    this.addText(commands, 'Please come again.');
    commands.push(10, 10);

    // Timestamp
    commands.push(...this.ESC('a', 1));
    this.addText(commands, new Date().toLocaleString());
    commands.push(10, 10);

    // Cut paper
    commands.push(...this.ESC('m'));

    return Buffer.from(commands);
  }

  // Helper functions
  private center(text: string, width: number): string {
    const padding = Math.max(0, Math.floor((width - text.length) / 2));
    return ' '.repeat(padding) + text;
  }

  private leftRight(left: string, right: string, width: number, bold = false): string {
    const space = Math.max(1, width - left.length - right.length);
    const line = left + ' '.repeat(space) + right;
    return bold ? '* ' + line.substring(2) : line;
  }

  private rightAlign(text: string, width: number): string {
    return text.padStart(width);
  }

  private divider(width: number): string {
    return '─'.repeat(width);
  }

  private formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  }

  private wrapText(text: string, maxWidth: number): string[] {
    if (text.length <= maxWidth) {
      return [text];
    }

    const lines: string[] = [];
    let currentLine = '';

    for (const char of text) {
      if (currentLine.length >= maxWidth) {
        lines.push(currentLine);
        currentLine = '';
      }
      currentLine += char;
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines;
  }

  // ESC/POS command helpers
  private ESC(...args: any[]): number[] {
    return [27, ...args]; // ESC = ASCII 27
  }

  private addText(commands: number[], text: string): void {
    for (const char of text) {
      commands.push(char.charCodeAt(0));
    }
  }

  // Print receipt (would integrate with actual printer)
  async printReceipt(saleData: ReceiptData): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      // In production, this would send to actual printer
      // For now, just generate and return

      if (this.config.useThermalPrinter) {
        const esposData = this.generateESCPOS(saleData);
        // TODO: Send esposData to thermal printer via USB/Serial
        return {
          success: true,
          message: 'Receipt sent to thermal printer',
        };
      } else {
        const receiptText = this.generateReceiptText(saleData);
        // TODO: Send receiptText to system printer
        return {
          success: true,
          message: 'Receipt sent to default printer',
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `Print failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  // Save receipt as text file
  async saveReceiptAsFile(
    saleData: ReceiptData,
    filePath: string
  ): Promise<boolean> {
    try {
      const fs = require('fs').promises;
      const receiptText = this.generateReceiptText(saleData);
      await fs.writeFile(filePath, receiptText, 'utf8');
      return true;
    } catch (error) {
      console.error('Failed to save receipt:', error);
      return false;
    }
  }

  // Get receipt preview (HTML format)
  generateHTMLReceipt(saleData: ReceiptData): string {
    let subtotal = 0;
    for (const item of saleData.items) {
      subtotal += item.subtotal;
    }

    const tax = subtotal * 0.1;
    const total = subtotal + tax;

    let itemsHTML = '';
    for (const item of saleData.items) {
      itemsHTML += `
        <tr>
          <td>${item.name}</td>
          <td class="text-right">${item.quantity}</td>
          <td class="text-right">₱${item.unitPrice.toFixed(2)}</td>
          <td class="text-right">₱${item.subtotal.toFixed(2)}</td>
        </tr>
      `;
    }

    return `
      <div style="font-family: monospace; max-width: 400px; margin: 20px auto; padding: 20px; border: 1px solid #ccc;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2>POS SYSTEM</h2>
          <p>Receipt</p>
        </div>

        <table style="width: 100%; margin-bottom: 20px;">
          <tr>
            <td>Date: ${this.formatDate(saleData.saleDate)}</td>
          </tr>
          <tr>
            <td>Receipt #: ${saleData.saleId}</td>
          </tr>
          <tr>
            <td>Payment: ${saleData.paymentMethod.toUpperCase()}</td>
          </tr>
        </table>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <thead>
            <tr style="border-bottom: 1px solid #000;">
              <th style="text-align: left;">Item</th>
              <th style="text-align: right; width: 50px;">Qty</th>
              <th style="text-align: right; width: 80px;">Price</th>
              <th style="text-align: right; width: 80px;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHTML}
          </tbody>
        </table>

        <table style="width: 100%; text-align: right;">
          <tr>
            <td style="text-align: left;">Subtotal:</td>
            <td>₱${subtotal.toFixed(2)}</td>
          </tr>
          <tr>
            <td style="text-align: left;">Tax (10%):</td>
            <td>₱${tax.toFixed(2)}</td>
          </tr>
          <tr style="font-weight: bold; font-size: 18px; border-top: 1px solid #000; border-bottom: 1px solid #000;">
            <td style="text-align: left;">TOTAL:</td>
            <td>₱${total.toFixed(2)}</td>
          </tr>
        </table>

        <div style="text-align: center; margin-top: 20px;">
          <p>Thank you for your purchase!</p>
          <p style="font-size: 12px; color: #666;">Printed: ${new Date().toLocaleString()}</p>
        </div>
      </div>
    `;
  }
}

export const receiptPrinterService = new ReceiptPrinterService();

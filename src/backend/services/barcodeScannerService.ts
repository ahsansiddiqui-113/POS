import { getDatabase } from '../database/db';
import { productService } from './productService';
import { AppError } from '../middleware/errorHandler';

export interface ScannerConfig {
  enableKeyboardInput: boolean;
  enableUSBInput: boolean;
  scanTimeout: number; // milliseconds
  minimumBarcodeLength: number;
  maximumBarcodeLength: number;
}

export interface ScanResult {
  success: boolean;
  barcode: string;
  product?: any;
  error?: string;
  timestamp: string;
}

export class BarcodeScannerService {
  private db = getDatabase();
  private scannerConfig: ScannerConfig = {
    enableKeyboardInput: true,
    enableUSBInput: true,
    scanTimeout: 500, // 500ms timeout between scans
    minimumBarcodeLength: 3,
    maximumBarcodeLength: 128,
  };

  private lastScanTime: number = 0;
  private currentBuffer: string = '';

  getConfig(): ScannerConfig {
    return { ...this.scannerConfig };
  }

  updateConfig(config: Partial<ScannerConfig>): void {
    this.scannerConfig = { ...this.scannerConfig, ...config };
  }

  // Handle keyboard input barcode scan
  processScan(barcode: string): ScanResult {
    const now = Date.now();

    // Check timeout
    if (now - this.lastScanTime > this.scannerConfig.scanTimeout) {
      this.currentBuffer = '';
    }

    this.currentBuffer += barcode;
    this.lastScanTime = now;

    // Validate barcode format
    if (!this.validateBarcodeFormat(this.currentBuffer)) {
      return {
        success: false,
        barcode: this.currentBuffer,
        error: 'Invalid barcode format',
        timestamp: new Date().toISOString(),
      };
    }

    // Look up product
    const product = productService.getProductByBarcode(this.currentBuffer);

    if (!product) {
      return {
        success: false,
        barcode: this.currentBuffer,
        error: 'Product not found',
        timestamp: new Date().toISOString(),
      };
    }

    // Log scan
    this.logScan(this.currentBuffer, true, product.id);

    const result: ScanResult = {
      success: true,
      barcode: this.currentBuffer,
      product: {
        id: product.id,
        name: product.name,
        sku: product.sku,
        barcode: product.barcode,
        price: product.sale_price_per_unit,
        quantity: product.quantity_available,
      },
      timestamp: new Date().toISOString(),
    };

    // Reset buffer after successful scan
    this.currentBuffer = '';

    return result;
  }

  // Validate barcode format
  validateBarcodeFormat(barcode: string): boolean {
    // Check length
    if (
      barcode.length < this.scannerConfig.minimumBarcodeLength ||
      barcode.length > this.scannerConfig.maximumBarcodeLength
    ) {
      return false;
    }

    // Allow alphanumeric and common special characters
    const barcodeRegex = /^[a-zA-Z0-9\-_\.\s]+$/;
    return barcodeRegex.test(barcode);
  }

  // Quick lookup by barcode
  quickLookup(barcode: string): any {
    const product = productService.getProductByBarcode(barcode);

    if (!product) {
      throw new AppError(404, 'Product not found');
    }

    return {
      id: product.id,
      name: product.name,
      sku: product.sku,
      category: product.category,
      brand: product.brand,
      purchasePrice: product.purchase_price_per_unit,
      salePrice: product.sale_price_per_unit,
      quantity: product.quantity_available,
      lowStockThreshold: product.low_stock_threshold,
      expiryDate: product.expiry_date,
    };
  }

  // Validate stock availability
  validateStock(barcode: string, quantity: number): { available: boolean; reason?: string } {
    const product = productService.getProductByBarcode(barcode);

    if (!product) {
      return { available: false, reason: 'Product not found' };
    }

    if (product.quantity_available === 0) {
      return { available: false, reason: 'Out of stock' };
    }

    if (product.quantity_available < quantity) {
      return {
        available: false,
        reason: `Only ${product.quantity_available} available`,
      };
    }

    // Check if expiry date is past
    if (product.expiry_date) {
      const expiryDate = new Date(product.expiry_date);
      const today = new Date();
      if (expiryDate < today) {
        return { available: false, reason: 'Product has expired' };
      }
    }

    return { available: true };
  }

  // Log barcode scan for audit trail
  private logScan(barcode: string, success: boolean, productId?: number): void {
    try {
      this.db
        .prepare(
          `INSERT INTO audit_logs (action, entity_type, entity_id, new_value, timestamp)
          VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`
        )
        .run(
          'BARCODE_SCAN',
          'product',
          productId || 0,
          JSON.stringify({ barcode, success })
        );
    } catch (error) {
      console.error('Failed to log barcode scan:', error);
    }
  }

  // Get scan history
  getScanHistory(limit: number = 100): any[] {
    return this.db
      .prepare(
        `SELECT * FROM audit_logs
        WHERE action = 'BARCODE_SCAN'
        ORDER BY timestamp DESC
        LIMIT ?`
      )
      .all(limit) as any[];
  }

  // Test scanner connection (for USB scanners)
  testScannerConnection(): { connected: boolean; message: string } {
    // This is a placeholder - actual implementation would depend on
    // the specific USB scanner device being used
    return {
      connected: true,
      message: 'Scanner ready (keyboard input mode)',
    };
  }

  // Get scanner status
  getScannerStatus(): {
    status: 'ready' | 'scanning' | 'error';
    mode: 'keyboard' | 'usb' | 'hybrid';
    lastScan: string | null;
    totalScans: number;
  } {
    const totalScans = (
      this.db
        .prepare('SELECT COUNT(*) as count FROM audit_logs WHERE action = ? LIMIT 1')
        .get('BARCODE_SCAN') as { count: number }
    ).count;

    const lastScan = this.db
      .prepare(
        'SELECT timestamp FROM audit_logs WHERE action = ? ORDER BY timestamp DESC LIMIT 1'
      )
      .get('BARCODE_SCAN') as { timestamp: string } | undefined;

    return {
      status: 'ready',
      mode: 'keyboard',
      lastScan: lastScan?.timestamp || null,
      totalScans,
    };
  }

  // Batch validation for multiple barcodes
  validateMultiple(barcodes: string[]): Array<{
    barcode: string;
    valid: boolean;
    product?: any;
    error?: string;
  }> {
    return barcodes.map((barcode) => {
      const product = productService.getProductByBarcode(barcode);

      if (!product) {
        return {
          barcode,
          valid: false,
          error: 'Product not found',
        };
      }

      return {
        barcode,
        valid: true,
        product: {
          id: product.id,
          name: product.name,
          sku: product.sku,
        },
      };
    });
  }

  // Detect barcode format (UPC, EAN, Code128, etc.)
  detectBarcodeFormat(barcode: string): string {
    const length = barcode.length;

    if (length === 12 && /^\d+$/.test(barcode)) {
      return 'UPC-A';
    }

    if (length === 13 && /^\d+$/.test(barcode)) {
      return 'EAN-13';
    }

    if (length === 8 && /^\d+$/.test(barcode)) {
      return 'EAN-8';
    }

    if (/^[A-Z0-9\-]{10,}$/.test(barcode)) {
      return 'Code128';
    }

    if (/^[0-9\-]+$/.test(barcode)) {
      return 'Code39';
    }

    return 'Unknown';
  }
}

export const barcodeScannerService = new BarcodeScannerService();

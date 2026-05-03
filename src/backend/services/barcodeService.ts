import { getDatabase } from '../database/db';
import { AppError } from '../middleware/errorHandler';
import bwipjs from 'bwip-js';
import Jimp from 'jimp';

export class BarcodeService {
  private db = getDatabase();

  // Map user-friendly format names to bwipjs format codes
  private mapFormat(format: string): string {
    const formatMap: { [key: string]: string } = {
      'code128': 'code128',
      'c128': 'code128',
      'qr': 'qrcode',
      'qrcode': 'qrcode',
      'qr code': 'qrcode',
      'ean13': 'ean13',
      'ean': 'ean13',
    };

    const normalized = format.toLowerCase().trim();
    return formatMap[normalized] || 'code128'; // Default to code128
  }

  async generateBarcode(
    barcodeValue: string,
    format: string = 'code128'
  ): Promise<Buffer> {
    try {
      // Validate barcode value
      if (!barcodeValue || barcodeValue.trim().length === 0) {
        throw new AppError(400, 'Barcode value cannot be empty');
      }

      const bcidFormat = this.mapFormat(format);

      const png = await bwipjs.toBuffer({
        bcid: bcidFormat,
        text: barcodeValue,
        scale: 3,
        height: 10,
        includetext: true,
        textxalign: 'center',
      });

      return png;
    } catch (error) {
      const errorMsg = (error as Error).message;
      // Don't wrap AppError again
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(400, 'Failed to generate barcode: ' + errorMsg);
    }
  }

  async generateProductBarcode(productId: number): Promise<Buffer> {
    const product = this.db
      .prepare('SELECT barcode FROM products WHERE id = ?')
      .get(productId) as { barcode: string } | undefined;

    if (!product) {
      throw new AppError(404, 'Product not found');
    }

    return this.generateBarcode(product.barcode);
  }

  async generateBarcodeWithPrice(
    barcodeValue: string,
    price: number,
    format: string = 'code128'
  ): Promise<Buffer> {
    try {
      // For now, just return the barcode without price text
      // The price is shown separately in the frontend
      return await this.generateBarcode(barcodeValue, format);
    } catch (error) {
      // Fallback to barcode without price if text addition fails
      console.warn('Failed to generate barcode with price:', error);
      return await this.generateBarcode(barcodeValue, format);
    }
  }

  validateBarcodeFormat(barcode: string): boolean {
    // Allow any non-empty string as barcode
    return barcode && barcode.length > 0 && barcode.length <= 128;
  }

  isBarcodeUnique(barcode: string, excludeProductId?: number): boolean {
    let query = 'SELECT COUNT(*) as count FROM products WHERE barcode = ?';
    const params: any[] = [barcode];

    if (excludeProductId) {
      query += ' AND id != ?';
      params.push(excludeProductId);
    }

    const result = this.db.prepare(query).get(...params) as { count: number };
    return result.count === 0;
  }

  generateUniqueBarcode(prefix: string = 'POS'): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    return `${prefix}${timestamp}${random}`;
  }
}

export const barcodeService = new BarcodeService();

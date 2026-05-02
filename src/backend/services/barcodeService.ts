import { getDatabase } from '../database/db';
import { AppError } from '../middleware/errorHandler';
import bwipjs from 'bwip-js';

export class BarcodeService {
  private db = getDatabase();

  async generateBarcode(
    barcodeValue: string,
    format: string = 'code128'
  ): Promise<Buffer> {
    try {
      const png = await bwipjs.toBuffer({
        bcid: format,
        text: barcodeValue,
        scale: 3,
        height: 10,
        includetext: true,
        textxalign: 'center',
      });

      return png;
    } catch (error) {
      throw new AppError(400, 'Failed to generate barcode: ' + (error as Error).message);
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

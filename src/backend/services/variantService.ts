import { getDatabase } from '../database/db';
import { AppError } from '../middleware/errorHandler';

export interface ProductVariant {
  id: number;
  product_id: number;
  size?: string;
  color?: string;
  variant_sku: string;
  quantity_available: number;
  low_stock_threshold: number;
}

export class VariantService {
  private db = getDatabase();

  createVariant(data: {
    product_id: number;
    size?: string;
    color?: string;
    variant_sku: string;
    quantity_available: number;
    low_stock_threshold?: number;
  }): ProductVariant {
    // Check for duplicate SKU
    const existing = this.db
      .prepare('SELECT id FROM product_variants WHERE variant_sku = ?')
      .get(data.variant_sku);

    if (existing) {
      throw new AppError(409, 'Variant SKU already exists');
    }

    const stmt = this.db.prepare(`
      INSERT INTO product_variants (
        product_id, size, color, variant_sku, quantity_available, low_stock_threshold
      )
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      data.product_id,
      data.size || null,
      data.color || null,
      data.variant_sku,
      data.quantity_available,
      data.low_stock_threshold || 5
    );

    return this.getVariant(
      this.db.prepare('SELECT last_insert_rowid() as id').get() as any
    ) as ProductVariant;
  }

  getVariant(id: number): ProductVariant | null {
    return this.db
      .prepare('SELECT * FROM product_variants WHERE id = ?')
      .get(id) as ProductVariant | null;
  }

  getVariantBySku(sku: string): ProductVariant | null {
    return this.db
      .prepare('SELECT * FROM product_variants WHERE variant_sku = ?')
      .get(sku) as ProductVariant | null;
  }

  getProductVariants(productId: number): ProductVariant[] {
    return this.db
      .prepare('SELECT * FROM product_variants WHERE product_id = ? ORDER BY size, color')
      .all(productId) as ProductVariant[];
  }

  updateVariantStock(id: number, quantityChange: number): void {
    const variant = this.getVariant(id);
    if (!variant) {
      throw new AppError(404, 'Variant not found');
    }

    const newQuantity = variant.quantity_available + quantityChange;
    if (newQuantity < 0) {
      throw new AppError(400, 'Insufficient stock for this variant');
    }

    this.db
      .prepare(
        'UPDATE product_variants SET quantity_available = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
      )
      .run(newQuantity, id);
  }

  updateVariant(id: number, data: Partial<ProductVariant>): void {
    const updates: string[] = [];
    const values: any[] = [];

    if (data.quantity_available !== undefined) {
      updates.push('quantity_available = ?');
      values.push(data.quantity_available);
    }

    if (data.low_stock_threshold !== undefined) {
      updates.push('low_stock_threshold = ?');
      values.push(data.low_stock_threshold);
    }

    if (data.size !== undefined) {
      updates.push('size = ?');
      values.push(data.size);
    }

    if (data.color !== undefined) {
      updates.push('color = ?');
      values.push(data.color);
    }

    if (updates.length === 0) return;

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    const query = `UPDATE product_variants SET ${updates.join(', ')} WHERE id = ?`;
    this.db.prepare(query).run(...values);
  }

  deleteVariant(id: number): void {
    this.db.prepare('DELETE FROM product_variants WHERE id = ?').run(id);
  }

  getLowStockVariants(threshold?: number): ProductVariant[] {
    const query = threshold
      ? 'SELECT * FROM product_variants WHERE quantity_available <= ? ORDER BY quantity_available ASC'
      : 'SELECT * FROM product_variants WHERE quantity_available <= low_stock_threshold ORDER BY quantity_available ASC';

    return this.db
      .prepare(query)
      .all(threshold) as ProductVariant[];
  }

  getTotalVariantStock(productId: number): number {
    const result = this.db
      .prepare('SELECT COALESCE(SUM(quantity_available), 0) as total FROM product_variants WHERE product_id = ?')
      .get(productId) as any;

    return result.total;
  }

  // Get all sizes available for a product
  getAvailableSizes(productId: number): string[] {
    const results = this.db
      .prepare(
        'SELECT DISTINCT size FROM product_variants WHERE product_id = ? AND size IS NOT NULL ORDER BY size'
      )
      .all(productId) as Array<{ size: string }>;

    return results.map((r) => r.size);
  }

  // Get all colors available for a product
  getAvailableColors(productId: number): string[] {
    const results = this.db
      .prepare(
        'SELECT DISTINCT color FROM product_variants WHERE product_id = ? AND color IS NOT NULL ORDER BY color'
      )
      .all(productId) as Array<{ color: string }>;

    return results.map((r) => r.color);
  }

  // Get variant by size and color
  getVariantBySizeColor(
    productId: number,
    size?: string,
    color?: string
  ): ProductVariant | null {
    return this.db
      .prepare(
        'SELECT * FROM product_variants WHERE product_id = ? AND size = ? AND color = ?'
      )
      .get(productId, size || null, color || null) as ProductVariant | null;
  }
}

export const variantService = new VariantService();

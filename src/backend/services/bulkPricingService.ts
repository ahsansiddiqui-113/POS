import { getDatabase } from '../database/db';
import { AppError } from '../middleware/errorHandler';

export interface BulkPrice {
  id: number;
  product_id: number;
  min_quantity: number;
  max_quantity?: number;
  bulk_price: number;
  discount_percentage?: number;
  active: number;
}

export class BulkPricingService {
  private db = getDatabase();

  createBulkPrice(data: {
    product_id: number;
    min_quantity: number;
    max_quantity?: number;
    bulk_price: number;
    discount_percentage?: number;
  }): BulkPrice {
    if (data.bulk_price <= 0) {
      throw new AppError(400, 'Bulk price must be greater than 0');
    }

    if (data.max_quantity && data.max_quantity < data.min_quantity) {
      throw new AppError(400, 'Max quantity must be greater than or equal to min quantity');
    }

    const stmt = this.db.prepare(`
      INSERT INTO bulk_pricing (
        product_id, min_quantity, max_quantity, bulk_price, discount_percentage, active
      )
      VALUES (?, ?, ?, ?, ?, 1)
    `);

    stmt.run(
      data.product_id,
      data.min_quantity,
      data.max_quantity || null,
      data.bulk_price,
      data.discount_percentage || null
    );

    return this.getBulkPrice(
      this.db.prepare('SELECT last_insert_rowid() as id').get() as any
    ) as BulkPrice;
  }

  getBulkPrice(id: number): BulkPrice | null {
    return this.db
      .prepare('SELECT * FROM bulk_pricing WHERE id = ?')
      .get(id) as BulkPrice | null;
  }

  getProductBulkPrices(productId: number): BulkPrice[] {
    return this.db
      .prepare(
        'SELECT * FROM bulk_pricing WHERE product_id = ? AND active = 1 ORDER BY min_quantity ASC'
      )
      .all(productId) as BulkPrice[];
  }

  // Get applicable bulk price for a specific quantity
  getApplicableBulkPrice(productId: number, quantity: number): BulkPrice | null {
    const prices = this.getProductBulkPrices(productId);

    for (const price of prices) {
      if (quantity >= price.min_quantity) {
        if (!price.max_quantity || quantity <= price.max_quantity) {
          return price;
        }
      }
    }

    return null;
  }

  calculateBulkPrice(
    productId: number,
    quantity: number,
    regularPrice: number
  ): { price: number; discount: number; isBulk: boolean } {
    const bulkPrice = this.getApplicableBulkPrice(productId, quantity);

    if (!bulkPrice) {
      return {
        price: regularPrice,
        discount: 0,
        isBulk: false,
      };
    }

    const discount = regularPrice - bulkPrice.bulk_price;
    return {
      price: bulkPrice.bulk_price,
      discount,
      isBulk: true,
    };
  }

  updateBulkPrice(id: number, data: Partial<BulkPrice>): void {
    const updates: string[] = [];
    const values: any[] = [];

    if (data.min_quantity !== undefined) {
      updates.push('min_quantity = ?');
      values.push(data.min_quantity);
    }

    if (data.max_quantity !== undefined) {
      updates.push('max_quantity = ?');
      values.push(data.max_quantity);
    }

    if (data.bulk_price !== undefined) {
      if (data.bulk_price <= 0) {
        throw new AppError(400, 'Bulk price must be greater than 0');
      }
      updates.push('bulk_price = ?');
      values.push(data.bulk_price);
    }

    if (data.discount_percentage !== undefined) {
      updates.push('discount_percentage = ?');
      values.push(data.discount_percentage);
    }

    if (updates.length === 0) return;

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    const query = `UPDATE bulk_pricing SET ${updates.join(', ')} WHERE id = ?`;
    this.db.prepare(query).run(...values);
  }

  toggleBulkPrice(id: number, active: boolean): void {
    this.db
      .prepare('UPDATE bulk_pricing SET active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(active ? 1 : 0, id);
  }

  deleteBulkPrice(id: number): void {
    this.db.prepare('DELETE FROM bulk_pricing WHERE id = ?').run(id);
  }

  // Get wholesale customers (those who have made bulk purchases)
  getWholesaleCustomerStats(): any[] {
    return this.db
      .prepare(`
        SELECT
          'Wholesale' as customer_type,
          COUNT(DISTINCT si.sale_id) as order_count,
          SUM(si.quantity) as total_quantity,
          SUM(si.subtotal) as total_spent
        FROM sale_items si
        WHERE si.quantity >= 10
      `)
      .all() as any[];
  }

  // Generate bulk pricing report
  getBulkPricingReport(): any[] {
    return this.db
      .prepare(`
        SELECT
          p.id,
          p.sku,
          p.name,
          p.sale_price_per_unit as regular_price,
          COUNT(bp.id) as bulk_price_tiers,
          MIN(bp.bulk_price) as lowest_bulk_price,
          MAX(bp.min_quantity) as highest_min_quantity
        FROM products p
        LEFT JOIN bulk_pricing bp ON p.id = bp.product_id AND bp.active = 1
        WHERE p.active = 1
        GROUP BY p.id
        ORDER BY p.name
      `)
      .all() as any[];
  }
}

export const bulkPricingService = new BulkPricingService();

import { getDatabase, withTransaction } from '../database/db';
import { AppError } from '../middleware/errorHandler';
import { salesService } from './salesService';
import { productService } from './productService';

export interface CreateReturnRequest {
  sale_id: number;
  product_id: number;
  quantity: number;
  reason: string;
  userId: number;
}

export interface Return {
  id: number;
  return_date: string;
  user_id: number;
  sale_id: number;
  product_id: number;
  quantity: number;
  reason: string | null;
  refund_amount: number;
  created_at: string;
}

export class ReturnsService {
  private db = getDatabase();

  createReturn(request: CreateReturnRequest): Return {
    // Validate sale exists
    const sale = salesService.getSaleWithItems(request.sale_id);
    if (!sale) {
      throw new AppError(404, 'Sale not found');
    }

    // Validate product exists
    const product = productService.getProduct(request.product_id);
    if (!product) {
      throw new AppError(404, 'Product not found');
    }

    // Validate item was in the sale
    const saleItem = sale.items.find((item) => item.productId === request.product_id);
    if (!saleItem) {
      throw new AppError(400, 'Product was not in this sale');
    }

    // Validate return quantity
    if (request.quantity > saleItem.quantity) {
      throw new AppError(400, 'Cannot return more than was purchased');
    }

    if (request.quantity <= 0) {
      throw new AppError(400, 'Return quantity must be greater than 0');
    }

    // Calculate refund amount
    const refundAmount = saleItem.unitPrice * request.quantity;

    // Use transaction for atomicity
    return withTransaction(() => {
      // Create return record
      const stmt = this.db.prepare(`
        INSERT INTO returns (user_id, sale_id, product_id, quantity, reason, refund_amount, return_date)
        VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `);

      stmt.run(
        request.userId,
        request.sale_id,
        request.product_id,
        request.quantity,
        request.reason || null,
        refundAmount
      );

      const returnId = (
        this.db.prepare('SELECT last_insert_rowid() as id').get() as any
      ).id;

      // Restore product quantity
      productService.updateStock(request.product_id, request.quantity);

      // Log to audit trail
      this.db
        .prepare(
          `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_value, timestamp)
          VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`
        )
        .run(
          request.userId,
          'RETURN',
          'sale',
          request.sale_id,
          JSON.stringify({
            product_id: request.product_id,
            quantity: request.quantity,
            refund: refundAmount,
          })
        );

      return this.getReturn(returnId) as Return;
    });
  }

  getReturn(id: number): Return | null {
    return this.db
      .prepare('SELECT * FROM returns WHERE id = ?')
      .get(id) as Return | null;
  }

  getReturnsBySale(saleId: number): Return[] {
    return this.db
      .prepare('SELECT * FROM returns WHERE sale_id = ? ORDER BY return_date DESC')
      .all(saleId) as Return[];
  }

  getReturnsByDateRange(startDate: string, endDate: string): Return[] {
    return this.db
      .prepare(
        `SELECT * FROM returns
        WHERE DATE(return_date) BETWEEN ? AND ?
        ORDER BY return_date DESC`
      )
      .all(startDate, endDate) as Return[];
  }

  getTotalRefunds(startDate?: string, endDate?: string): number {
    let query = 'SELECT COALESCE(SUM(refund_amount), 0) as total FROM returns';
    const params: any[] = [];

    if (startDate && endDate) {
      query += ' WHERE DATE(return_date) BETWEEN ? AND ?';
      params.push(startDate, endDate);
    }

    const result = this.db.prepare(query).get(...params) as { total: number };
    return result.total;
  }

  getReturnRate(): number {
    const totalSales = this.db
      .prepare('SELECT COALESCE(SUM(items_count), 0) as count FROM sales')
      .get() as { count: number };

    const totalReturns = this.db
      .prepare('SELECT COALESCE(SUM(quantity), 0) as count FROM returns')
      .get() as { count: number };

    if (totalSales.count === 0) return 0;
    return (totalReturns.count / totalSales.count) * 100;
  }
}

export const returnsService = new ReturnsService();

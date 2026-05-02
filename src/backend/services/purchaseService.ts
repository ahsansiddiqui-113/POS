import { getDatabase, withTransaction } from '../database/db';
import { AppError } from '../middleware/errorHandler';
import { productService } from './productService';

export interface CreatePurchaseRequest {
  product_id: number;
  quantity: number;
  total_bulk_price: number;
  supplier_id: number;
  expiry_date?: string;
  userId: number;
}

export interface Purchase {
  id: number;
  purchase_date: string;
  user_id: number;
  supplier_id: number;
  product_id: number;
  quantity: number;
  total_bulk_price: number;
  unit_price: number;
  expiry_date: string | null;
  created_at: string;
}

export class PurchaseService {
  private db = getDatabase();

  createPurchase(request: CreatePurchaseRequest): Purchase {
    // Validate product exists
    const product = productService.getProduct(request.product_id);
    if (!product) {
      throw new AppError(404, 'Product not found');
    }

    if (request.quantity <= 0) {
      throw new AppError(400, 'Quantity must be greater than 0');
    }

    if (request.total_bulk_price <= 0) {
      throw new AppError(400, 'Total bulk price must be greater than 0');
    }

    const unitPrice = request.total_bulk_price / request.quantity;

    // Use transaction for atomicity
    return withTransaction(() => {
      // Create purchase record
      const stmt = this.db.prepare(`
        INSERT INTO purchases (
          user_id, supplier_id, product_id, quantity, total_bulk_price, unit_price, expiry_date, purchase_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `);

      stmt.run(
        request.userId,
        request.supplier_id,
        request.product_id,
        request.quantity,
        request.total_bulk_price,
        unitPrice,
        request.expiry_date || null
      );

      const purchaseId = (
        this.db.prepare('SELECT last_insert_rowid() as id').get() as any
      ).id;

      // Update product inventory
      productService.updateStock(request.product_id, request.quantity);

      // Update product's purchase price if this is cheaper
      if (unitPrice < product.purchase_price_per_unit) {
        this.db
          .prepare(
            'UPDATE products SET purchase_price_per_unit = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
          )
          .run(unitPrice, request.product_id);
      }

      // Update product's expiry date if provided
      if (request.expiry_date) {
        this.db
          .prepare(
            'UPDATE products SET expiry_date = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
          )
          .run(request.expiry_date, request.product_id);
      }

      // Log to audit trail
      this.db
        .prepare(
          `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_value, timestamp)
          VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`
        )
        .run(
          request.userId,
          'PURCHASE',
          'product',
          request.product_id,
          JSON.stringify({
            quantity: request.quantity,
            unit_price: unitPrice,
            supplier_id: request.supplier_id,
          })
        );

      return this.getPurchase(purchaseId) as Purchase;
    });
  }

  getPurchase(id: number): Purchase | null {
    return this.db
      .prepare('SELECT * FROM purchases WHERE id = ?')
      .get(id) as Purchase | null;
  }

  getPurchasesByProduct(productId: number): Purchase[] {
    return this.db
      .prepare('SELECT * FROM purchases WHERE product_id = ? ORDER BY purchase_date DESC')
      .all(productId) as Purchase[];
  }

  getPurchasesBySupplier(supplierId: number): Purchase[] {
    return this.db
      .prepare('SELECT * FROM purchases WHERE supplier_id = ? ORDER BY purchase_date DESC')
      .all(supplierId) as Purchase[];
  }

  getPurchasesByDateRange(startDate: string, endDate: string): Purchase[] {
    return this.db
      .prepare(
        `SELECT * FROM purchases
        WHERE DATE(purchase_date) BETWEEN ? AND ?
        ORDER BY purchase_date DESC`
      )
      .all(startDate, endDate) as Purchase[];
  }

  getTotalPurchases(startDate?: string, endDate?: string): number {
    let query = 'SELECT COALESCE(SUM(total_bulk_price), 0) as total FROM purchases';
    const params: any[] = [];

    if (startDate && endDate) {
      query += ' WHERE DATE(purchase_date) BETWEEN ? AND ?';
      params.push(startDate, endDate);
    }

    const result = this.db.prepare(query).get(...params) as { total: number };
    return result.total;
  }

  getPurchaseCount(startDate?: string, endDate?: string): number {
    let query = 'SELECT COUNT(*) as count FROM purchases';
    const params: any[] = [];

    if (startDate && endDate) {
      query += ' WHERE DATE(purchase_date) BETWEEN ? AND ?';
      params.push(startDate, endDate);
    }

    const result = this.db.prepare(query).get(...params) as { count: number };
    return result.count;
  }

  calculateAverageUnitPrice(productId: number): number {
    const result = this.db
      .prepare(
        'SELECT COALESCE(AVG(unit_price), 0) as avg_price FROM purchases WHERE product_id = ?'
      )
      .get(productId) as { avg_price: number };

    return result.avg_price;
  }

  getAllPurchases(page: number = 1, pageSize: number = 20): any {
    const offset = (page - 1) * pageSize;

    const countResult = this.db
      .prepare('SELECT COUNT(*) as total FROM purchases')
      .get() as { total: number };
    const total = countResult.total;

    const purchases = this.db
      .prepare(`
        SELECT
          p.id,
          p.product_id,
          p.supplier_id,
          p.quantity,
          p.unit_price,
          p.total_bulk_price,
          p.purchase_date,
          p.expiry_date,
          p.user_id,
          prod.name as product_name,
          prod.sku,
          sup.name as supplier_name,
          sup.contact as supplier_contact
        FROM purchases p
        LEFT JOIN products prod ON p.product_id = prod.id
        LEFT JOIN suppliers sup ON p.supplier_id = sup.id
        ORDER BY p.purchase_date DESC
        LIMIT ? OFFSET ?
      `)
      .all(pageSize, offset) as any[];

    return {
      data: purchases,
      total,
      page,
      pageSize,
      pages: Math.ceil(total / pageSize),
    };
  }

  getPurchasesFiltered(
    page: number = 1,
    pageSize: number = 20,
    filters?: {
      startDate?: string;
      endDate?: string;
      search?: string;
      productId?: number;
      supplierId?: number;
    }
  ): any {
    const offset = (page - 1) * pageSize;
    const params: any[] = [];
    let whereClause = 'WHERE 1=1';

    if (filters?.startDate) {
      whereClause += ' AND DATE(p.purchase_date) >= ?';
      params.push(filters.startDate);
    }

    if (filters?.endDate) {
      whereClause += ' AND DATE(p.purchase_date) <= ?';
      params.push(filters.endDate);
    }

    if (filters?.search) {
      const searchTerm = `%${filters.search}%`;
      whereClause += ' AND (prod.name LIKE ? OR sup.name LIKE ?)';
      params.push(searchTerm, searchTerm);
    }

    if (filters?.productId) {
      whereClause += ' AND p.product_id = ?';
      params.push(filters.productId);
    }

    if (filters?.supplierId) {
      whereClause += ' AND p.supplier_id = ?';
      params.push(filters.supplierId);
    }

    const countQuery = `
      SELECT COUNT(*) as total FROM purchases p
      LEFT JOIN products prod ON p.product_id = prod.id
      LEFT JOIN suppliers sup ON p.supplier_id = sup.id
      ${whereClause}
    `;
    const countResult = this.db.prepare(countQuery).get(...params) as { total: number };
    const total = countResult.total;

    const dataQuery = `
      SELECT
        p.id,
        p.product_id,
        p.supplier_id,
        p.quantity,
        p.unit_price,
        p.total_bulk_price,
        p.purchase_date,
        p.expiry_date,
        p.user_id,
        prod.name as product_name,
        prod.sku,
        sup.name as supplier_name,
        sup.contact as supplier_contact
      FROM purchases p
      LEFT JOIN products prod ON p.product_id = prod.id
      LEFT JOIN suppliers sup ON p.supplier_id = sup.id
      ${whereClause}
      ORDER BY p.purchase_date DESC
      LIMIT ? OFFSET ?
    `;
    params.push(pageSize, offset);

    const purchases = this.db.prepare(dataQuery).all(...params) as any[];

    return {
      data: purchases,
      total,
      page,
      pageSize,
      pages: Math.ceil(total / pageSize),
    };
  }
}

export const purchaseService = new PurchaseService();

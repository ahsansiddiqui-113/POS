import { getDatabase } from '../database/db';
import { AppError } from '../middleware/errorHandler';
import {
  validateProductInput,
  ValidationException,
} from '../utils/validators';

export interface Product {
  id: number;
  sku: string;
  barcode: string;
  name: string;
  category: string;
  sub_category: string | null;
  brand: string | null;
  description: string | null;
  purchase_price_per_unit: number;
  sale_price_per_unit: number;
  quantity_available: number;
  low_stock_threshold: number;
  expiry_date: string | null;
  batch_number: string | null;
  supplier_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  pages: number;
}

export class ProductService {
  private db = getDatabase();

  private logAudit(
    userId: number,
    action: string,
    entityId: number,
    oldValue: any = null,
    newValue: any = null
  ): void {
    try {
      this.db
        .prepare(`
          INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_value, new_value)
          VALUES (?, ?, ?, ?, ?, ?)
        `)
        .run(
          userId,
          action,
          'product',
          entityId,
          oldValue ? JSON.stringify(oldValue) : null,
          newValue ? JSON.stringify(newValue) : null
        );
    } catch (error) {
      // Log audit failure but don't break the operation
      console.error('Failed to log audit trail:', error);
    }
  }

  getProduct(id: number): Product | null {
    return this.db
      .prepare('SELECT * FROM products WHERE id = ?')
      .get(id) as Product | null;
  }

  getProductByBarcode(barcode: string): Product | null {
    return this.db
      .prepare('SELECT * FROM products WHERE barcode = ?')
      .get(barcode) as Product | null;
  }

  getProductBySku(sku: string): Product | null {
    return this.db
      .prepare('SELECT * FROM products WHERE sku = ?')
      .get(sku) as Product | null;
  }

  searchProducts(
    query: string,
    page: number = 1,
    pageSize: number = 20,
    filters?: {
      category?: string;
      supplier_id?: number;
    }
  ): PaginatedResponse<Product> {
    const offset = (page - 1) * pageSize;
    const searchTerm = `%${query}%`;

    let countQuery = 'SELECT COUNT(*) as total FROM products WHERE ';
    let dataQuery = 'SELECT * FROM products WHERE ';
    const whereConditions = [
      '(barcode LIKE ? OR sku LIKE ? OR name LIKE ? OR description LIKE ?)',
    ];
    const params: any[] = [searchTerm, searchTerm, searchTerm, searchTerm];

    if (filters?.category) {
      whereConditions.push('category = ?');
      params.push(filters.category);
    }

    if (filters?.supplier_id) {
      whereConditions.push('supplier_id = ?');
      params.push(filters.supplier_id);
    }

    const whereClause = whereConditions.join(' AND ');

    const total = this.db
      .prepare(countQuery + whereClause)
      .get(...params) as { total: number };

    const data = this.db
      .prepare(
        dataQuery +
          whereClause +
          ' ORDER BY updated_at DESC LIMIT ? OFFSET ?'
      )
      .all(...params, pageSize, offset) as Product[];

    return {
      data,
      total: total.total,
      page,
      pageSize,
      pages: Math.ceil(total.total / pageSize),
    };
  }

  getAllProducts(
    page: number = 1,
    pageSize: number = 20,
    category?: string
  ): PaginatedResponse<Product> {
    const offset = (page - 1) * pageSize;

    let countQuery = 'SELECT COUNT(*) as total FROM products';
    let dataQuery = 'SELECT * FROM products';
    const params: any[] = [];

    if (category) {
      countQuery += ' WHERE category = ?';
      dataQuery += ' WHERE category = ?';
      params.push(category);
    }

    const total = this.db.prepare(countQuery).get(...params) as { total: number };

    const data = this.db
      .prepare(
        dataQuery +
          ' ORDER BY updated_at DESC LIMIT ? OFFSET ?'
      )
      .all(...params, pageSize, offset) as Product[];

    return {
      data,
      total: total.total,
      page,
      pageSize,
      pages: Math.ceil(total.total / pageSize),
    };
  }

  createProduct(data: any, userId: number = 0): Product {
    const errors = validateProductInput(data);
    if (errors.length > 0) {
      throw new ValidationException(errors);
    }

    try {
      const stmt = this.db.prepare(`
        INSERT INTO products (
          sku, barcode, name, category, sub_category, brand, description,
          purchase_price_per_unit, sale_price_per_unit, quantity_available,
          low_stock_threshold, expiry_date, batch_number, supplier_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        data.sku,
        data.barcode,
        data.name,
        data.category,
        data.sub_category || null,
        data.brand || null,
        data.description || null,
        data.purchase_price_per_unit,
        data.sale_price_per_unit,
        data.quantity_available || 0,
        data.low_stock_threshold || 10,
        data.expiry_date || null,
        data.batch_number || null,
        data.supplier_id || null
      );

      const id = (
        this.db.prepare('SELECT last_insert_rowid() as id').get() as any
      ).id;

      const product = this.getProduct(id) as Product;

      // Log the creation
      if (userId > 0) {
        this.logAudit(userId, 'CREATE', id, null, {
          sku: product.sku,
          barcode: product.barcode,
          name: product.name,
          category: product.category,
          purchase_price_per_unit: product.purchase_price_per_unit,
          sale_price_per_unit: product.sale_price_per_unit,
          quantity_available: product.quantity_available,
          low_stock_threshold: product.low_stock_threshold,
        });
      }

      return product;
    } catch (error) {
      if ((error as any).message.includes('UNIQUE constraint')) {
        const field = (error as any).message.includes('barcode')
          ? 'barcode'
          : 'sku';
        throw new AppError(409, `Product with this ${field} already exists`);
      }
      throw error;
    }
  }

  updateProduct(id: number, data: any, userId: number = 0): Product {
    const product = this.getProduct(id);
    if (!product) {
      throw new AppError(404, 'Product not found');
    }

    const updates: string[] = ['updated_at = CURRENT_TIMESTAMP'];
    const values: any[] = [];
    const oldValues: any = {};
    const newValues: any = {};

    // Only allow specific fields to be updated
    const allowedFields = [
      'name',
      'description',
      'sale_price_per_unit',
      'low_stock_threshold',
      'brand',
      'sub_category',
    ];

    for (const field of allowedFields) {
      if (data[field] !== undefined && data[field] !== product[field as keyof Product]) {
        updates.push(`${field} = ?`);
        values.push(data[field]);
        oldValues[field] = product[field as keyof Product];
        newValues[field] = data[field];
      }
    }

    if (updates.length === 1) {
      return product;
    }

    values.push(id);

    const query = `UPDATE products SET ${updates.join(', ')} WHERE id = ?`;
    this.db.prepare(query).run(...values);

    const updatedProduct = this.getProduct(id) as Product;

    // Log the update
    if (userId > 0 && Object.keys(newValues).length > 0) {
      this.logAudit(userId, 'UPDATE', id, oldValues, newValues);
    }

    return updatedProduct;
  }

  updateStock(id: number, quantityChange: number, reason: string = ''): Product {
    const product = this.getProduct(id);
    if (!product) {
      throw new AppError(404, 'Product not found');
    }

    const newQuantity = product.quantity_available + quantityChange;

    if (newQuantity < 0) {
      throw new AppError(
        400,
        'Insufficient stock. Cannot complete operation.'
      );
    }

    this.db
      .prepare(
        'UPDATE products SET quantity_available = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
      )
      .run(newQuantity, id);

    return this.getProduct(id) as Product;
  }

  bulkImportProducts(products: any[]): { created: number; failed: number } {
    const transaction = this.db.transaction(() => {
      let created = 0;
      let failed = 0;

      for (const product of products) {
        try {
          this.createProduct(product);
          created++;
        } catch (error) {
          failed++;
          console.error(`Failed to import product ${product.sku}:`, error);
        }
      }

      return { created, failed };
    });

    return transaction();
  }

  deleteProduct(id: number, userId: number = 0): void {
    const product = this.getProduct(id);
    if (!product) {
      throw new AppError(404, 'Product not found');
    }

    // Check if product has any sales
    const salesCount = this.db
      .prepare('SELECT COUNT(*) as count FROM sale_items WHERE product_id = ?')
      .get(id) as { count: number };

    if (salesCount.count > 0) {
      throw new AppError(
        400,
        'Cannot delete product with existing sales records'
      );
    }

    this.db.prepare('DELETE FROM products WHERE id = ?').run(id);

    // Log the deletion
    if (userId > 0) {
      this.logAudit(userId, 'DELETE', id, {
        sku: product.sku,
        barcode: product.barcode,
        name: product.name,
        category: product.category,
        purchase_price_per_unit: product.purchase_price_per_unit,
        sale_price_per_unit: product.sale_price_per_unit,
        quantity_available: product.quantity_available,
      }, null);
    }
  }

  getCategories(): string[] {
    const result = this.db
      .prepare(
        'SELECT DISTINCT category FROM products WHERE category IS NOT NULL ORDER BY category'
      )
      .all() as { category: string }[];

    return result.map((r) => r.category);
  }

  getProductsLowOnStock(threshold?: number): Product[] {
    const query = threshold
      ? 'SELECT * FROM products WHERE quantity_available <= ? ORDER BY quantity_available ASC'
      : 'SELECT * FROM products WHERE quantity_available <= low_stock_threshold ORDER BY quantity_available ASC';

    const params = threshold ? [threshold] : [];
    return this.db.prepare(query).all(...params) as Product[];
  }

  getProductsExpiringWithin(days: number): Product[] {
    return this.db
      .prepare(
        `SELECT * FROM products
        WHERE expiry_date IS NOT NULL
        AND date(expiry_date) <= date('now', '+' || ? || ' days')
        AND date(expiry_date) > date('now')
        ORDER BY expiry_date ASC`
      )
      .all(days) as Product[];
  }
}

export const productService = new ProductService();

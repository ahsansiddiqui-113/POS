import { getDatabase } from '../database/db';
import { AppError } from '../middleware/errorHandler';

export interface Supplier {
  id: number;
  name: string;
  contact: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  created_at: string;
  updated_at: string;
}

export class SupplierService {
  private db = getDatabase();

  getSupplier(id: number): Supplier | null {
    return this.db
      .prepare('SELECT * FROM suppliers WHERE id = ?')
      .get(id) as Supplier | null;
  }

  getAllSuppliers(): Supplier[] {
    return this.db
      .prepare('SELECT * FROM suppliers ORDER BY name ASC')
      .all() as Supplier[];
  }

  createSupplier(data: any): Supplier {
    if (!data.name || data.name.trim().length === 0) {
      throw new AppError(400, 'Supplier name is required');
    }

    const stmt = this.db.prepare(`
      INSERT INTO suppliers (name, contact, email, phone, address, city, state, postal_code)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      data.name,
      data.contact || null,
      data.email || null,
      data.phone || null,
      data.address || null,
      data.city || null,
      data.state || null,
      data.postal_code || null
    );

    const id = (
      this.db.prepare('SELECT last_insert_rowid() as id').get() as any
    ).id;

    return this.getSupplier(id) as Supplier;
  }

  updateSupplier(id: number, data: any): Supplier {
    const supplier = this.getSupplier(id);
    if (!supplier) {
      throw new AppError(404, 'Supplier not found');
    }

    const updates: string[] = ['updated_at = CURRENT_TIMESTAMP'];
    const values: any[] = [];

    if (data.name !== undefined) {
      if (!data.name || data.name.trim().length === 0) {
        throw new AppError(400, 'Supplier name is required');
      }
      updates.push('name = ?');
      values.push(data.name);
    }

    if (data.contact !== undefined) {
      updates.push('contact = ?');
      values.push(data.contact || null);
    }

    if (data.email !== undefined) {
      updates.push('email = ?');
      values.push(data.email || null);
    }

    if (data.phone !== undefined) {
      updates.push('phone = ?');
      values.push(data.phone || null);
    }

    if (data.address !== undefined) {
      updates.push('address = ?');
      values.push(data.address || null);
    }

    if (data.city !== undefined) {
      updates.push('city = ?');
      values.push(data.city || null);
    }

    if (data.state !== undefined) {
      updates.push('state = ?');
      values.push(data.state || null);
    }

    if (data.postal_code !== undefined) {
      updates.push('postal_code = ?');
      values.push(data.postal_code || null);
    }

    if (updates.length === 1) {
      return supplier;
    }

    values.push(id);

    const query = `UPDATE suppliers SET ${updates.join(', ')} WHERE id = ?`;
    this.db.prepare(query).run(...values);

    return this.getSupplier(id) as Supplier;
  }

  deleteSupplier(id: number): void {
    const supplier = this.getSupplier(id);
    if (!supplier) {
      throw new AppError(404, 'Supplier not found');
    }

    // Check if supplier has any products
    const productCount = this.db
      .prepare('SELECT COUNT(*) as count FROM products WHERE supplier_id = ?')
      .get(id) as { count: number };

    if (productCount.count > 0) {
      throw new AppError(
        400,
        'Cannot delete supplier with associated products'
      );
    }

    this.db.prepare('DELETE FROM suppliers WHERE id = ?').run(id);
  }

  getSupplierPurchaseHistory(supplierId: number): any[] {
    return this.db
      .prepare(
        `SELECT
          p.purchase_date, p.product_id, p.quantity, p.total_bulk_price, p.unit_price,
          pr.name as product_name, pr.sku, pr.category
        FROM purchases p
        JOIN products pr ON p.product_id = pr.id
        WHERE p.supplier_id = ?
        ORDER BY p.purchase_date DESC`
      )
      .all(supplierId) as any[];
  }

  getSupplierTotalSpent(supplierId: number): number {
    const result = this.db
      .prepare(
        'SELECT COALESCE(SUM(total_bulk_price), 0) as total FROM purchases WHERE supplier_id = ?'
      )
      .get(supplierId) as { total: number };

    return result.total;
  }
}

export const supplierService = new SupplierService();

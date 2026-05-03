import { getDatabase } from '../database/db';
import { AppError } from '../middleware/errorHandler';

export interface RentalCustomer {
  id: number;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  total_rentals: number;
  total_spent: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export class CustomerService {
  private db = getDatabase();

  createCustomer(data: {
    name: string;
    phone?: string;
    email?: string;
    address?: string;
    notes?: string;
  }): RentalCustomer {
    const stmt = this.db.prepare(`
      INSERT INTO rental_customers (name, phone, email, address, notes)
      VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run(
      data.name,
      data.phone || null,
      data.email || null,
      data.address || null,
      data.notes || null
    );

    return this.getCustomer(
      (this.db.prepare('SELECT last_insert_rowid() as id').get() as any).id
    ) as RentalCustomer;
  }

  getCustomer(id: number): RentalCustomer | null {
    return this.db
      .prepare('SELECT * FROM rental_customers WHERE id = ?')
      .get(id) as RentalCustomer | null;
  }

  getCustomerByEmail(email: string): RentalCustomer | null {
    return this.db
      .prepare('SELECT * FROM rental_customers WHERE email = ?')
      .get(email) as RentalCustomer | null;
  }

  getAllCustomers(): RentalCustomer[] {
    return this.db
      .prepare('SELECT * FROM rental_customers ORDER BY name ASC')
      .all() as RentalCustomer[];
  }

  updateCustomer(
    id: number,
    data: {
      name?: string;
      phone?: string;
      email?: string;
      address?: string;
      notes?: string;
    }
  ): void {
    const fields: string[] = [];
    const values: any[] = [];

    if (data.name) {
      fields.push('name = ?');
      values.push(data.name);
    }
    if (data.phone !== undefined) {
      fields.push('phone = ?');
      values.push(data.phone);
    }
    if (data.email !== undefined) {
      fields.push('email = ?');
      values.push(data.email);
    }
    if (data.address !== undefined) {
      fields.push('address = ?');
      values.push(data.address);
    }
    if (data.notes !== undefined) {
      fields.push('notes = ?');
      values.push(data.notes);
    }

    if (fields.length === 0) return;

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    const query = `UPDATE rental_customers SET ${fields.join(', ')} WHERE id = ?`;
    this.db.prepare(query).run(...values);
  }

  getRentalHistory(customerId: number): any[] {
    return this.db
      .prepare(`
        SELECT rt.*, ri.rental_unit_number, p.name as product_name
        FROM rental_transactions rt
        LEFT JOIN rental_items ri ON rt.rental_item_id = ri.id
        LEFT JOIN products p ON ri.product_id = p.id
        WHERE rt.customer_id = ?
        ORDER BY rt.rental_start_date DESC
      `)
      .all(customerId) as any[];
  }

  getCustomerStats(customerId: number): any {
    return this.db
      .prepare(`
        SELECT
          COUNT(*) as total_rentals,
          SUM(rt.total_amount) as total_spent,
          SUM(rt.late_fees) as total_late_fees,
          SUM(rt.damage_charges) as total_damage_charges,
          MAX(rt.rental_start_date) as last_rental_date
        FROM rental_transactions rt
        WHERE rt.customer_id = ?
      `)
      .get(customerId);
  }

  updateCustomerStats(customerId: number): void {
    const stats = this.getCustomerStats(customerId);
    this.db
      .prepare(`
        UPDATE rental_customers
        SET total_rentals = ?, total_spent = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `)
      .run(stats.total_rentals || 0, stats.total_spent || 0, customerId);
  }

  deleteCustomer(id: number): void {
    // Check if customer has any rentals
    const rentalCount = (
      this.db
        .prepare('SELECT COUNT(*) as count FROM rental_transactions WHERE customer_id = ?')
        .get(id) as any
    ).count;

    if (rentalCount > 0) {
      throw new AppError(
        400,
        'Cannot delete customer with rental history. Archive instead.'
      );
    }

    this.db.prepare('DELETE FROM rental_customers WHERE id = ?').run(id);
  }
}

export const customerService = new CustomerService();

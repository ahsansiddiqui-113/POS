"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.customerService = exports.CustomerService = void 0;
const db_1 = require("../database/db");
const errorHandler_1 = require("../middleware/errorHandler");
class CustomerService {
    constructor() {
        this.db = (0, db_1.getDatabase)();
    }
    createCustomer(data) {
        const stmt = this.db.prepare(`
      INSERT INTO rental_customers (name, phone, email, address, notes)
      VALUES (?, ?, ?, ?, ?)
    `);
        stmt.run(data.name, data.phone || null, data.email || null, data.address || null, data.notes || null);
        return this.getCustomer(this.db.prepare('SELECT last_insert_rowid() as id').get().id);
    }
    getCustomer(id) {
        return this.db
            .prepare('SELECT * FROM rental_customers WHERE id = ?')
            .get(id);
    }
    getCustomerByEmail(email) {
        return this.db
            .prepare('SELECT * FROM rental_customers WHERE email = ?')
            .get(email);
    }
    getAllCustomers() {
        return this.db
            .prepare('SELECT * FROM rental_customers ORDER BY name ASC')
            .all();
    }
    updateCustomer(id, data) {
        const fields = [];
        const values = [];
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
        if (fields.length === 0)
            return;
        fields.push('updated_at = CURRENT_TIMESTAMP');
        values.push(id);
        const query = `UPDATE rental_customers SET ${fields.join(', ')} WHERE id = ?`;
        this.db.prepare(query).run(...values);
    }
    getRentalHistory(customerId) {
        return this.db
            .prepare(`
        SELECT rt.*, ri.rental_unit_number, p.name as product_name
        FROM rental_transactions rt
        LEFT JOIN rental_items ri ON rt.rental_item_id = ri.id
        LEFT JOIN products p ON ri.product_id = p.id
        WHERE rt.customer_id = ?
        ORDER BY rt.rental_start_date DESC
      `)
            .all(customerId);
    }
    getCustomerStats(customerId) {
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
    updateCustomerStats(customerId) {
        const stats = this.getCustomerStats(customerId);
        this.db
            .prepare(`
        UPDATE rental_customers
        SET total_rentals = ?, total_spent = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `)
            .run(stats.total_rentals || 0, stats.total_spent || 0, customerId);
    }
    deleteCustomer(id) {
        // Check if customer has any rentals
        const rentalCount = this.db
            .prepare('SELECT COUNT(*) as count FROM rental_transactions WHERE customer_id = ?')
            .get(id).count;
        if (rentalCount > 0) {
            throw new errorHandler_1.AppError(400, 'Cannot delete customer with rental history. Archive instead.');
        }
        this.db.prepare('DELETE FROM rental_customers WHERE id = ?').run(id);
    }
}
exports.CustomerService = CustomerService;
exports.customerService = new CustomerService();
//# sourceMappingURL=customerService.js.map
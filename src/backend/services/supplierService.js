"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.supplierService = exports.SupplierService = void 0;
const db_1 = require("../database/db");
const errorHandler_1 = require("../middleware/errorHandler");
class SupplierService {
    constructor() {
        this.db = (0, db_1.getDatabase)();
    }
    getSupplier(id) {
        return this.db
            .prepare('SELECT * FROM suppliers WHERE id = ?')
            .get(id);
    }
    getAllSuppliers() {
        return this.db
            .prepare('SELECT * FROM suppliers ORDER BY name ASC')
            .all();
    }
    createSupplier(data) {
        if (!data.name || data.name.trim().length === 0) {
            throw new errorHandler_1.AppError(400, 'Supplier name is required');
        }
        const stmt = this.db.prepare(`
      INSERT INTO suppliers (name, contact, email, phone, address, city, state, postal_code)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
        stmt.run(data.name, data.contact || null, data.email || null, data.phone || null, data.address || null, data.city || null, data.state || null, data.postal_code || null);
        const id = this.db.prepare('SELECT last_insert_rowid() as id').get().id;
        return this.getSupplier(id);
    }
    updateSupplier(id, data) {
        const supplier = this.getSupplier(id);
        if (!supplier) {
            throw new errorHandler_1.AppError(404, 'Supplier not found');
        }
        const updates = ['updated_at = CURRENT_TIMESTAMP'];
        const values = [];
        if (data.name !== undefined) {
            if (!data.name || data.name.trim().length === 0) {
                throw new errorHandler_1.AppError(400, 'Supplier name is required');
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
        return this.getSupplier(id);
    }
    deleteSupplier(id) {
        const supplier = this.getSupplier(id);
        if (!supplier) {
            throw new errorHandler_1.AppError(404, 'Supplier not found');
        }
        // Check if supplier has any products
        const productCount = this.db
            .prepare('SELECT COUNT(*) as count FROM products WHERE supplier_id = ?')
            .get(id);
        if (productCount.count > 0) {
            throw new errorHandler_1.AppError(400, 'Cannot delete supplier with associated products');
        }
        this.db.prepare('DELETE FROM suppliers WHERE id = ?').run(id);
    }
    getSupplierPurchaseHistory(supplierId) {
        return this.db
            .prepare(`SELECT
          p.purchase_date, p.product_id, p.quantity, p.total_bulk_price, p.unit_price,
          pr.name as product_name, pr.sku, pr.category
        FROM purchases p
        JOIN products pr ON p.product_id = pr.id
        WHERE p.supplier_id = ?
        ORDER BY p.purchase_date DESC`)
            .all(supplierId);
    }
    getSupplierTotalSpent(supplierId) {
        const result = this.db
            .prepare('SELECT COALESCE(SUM(total_bulk_price), 0) as total FROM purchases WHERE supplier_id = ?')
            .get(supplierId);
        return result.total;
    }
}
exports.SupplierService = SupplierService;
exports.supplierService = new SupplierService();
//# sourceMappingURL=supplierService.js.map
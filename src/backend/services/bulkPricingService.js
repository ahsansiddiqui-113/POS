"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bulkPricingService = exports.BulkPricingService = void 0;
const db_1 = require("../database/db");
const errorHandler_1 = require("../middleware/errorHandler");
class BulkPricingService {
    constructor() {
        this.db = (0, db_1.getDatabase)();
    }
    createBulkPrice(data) {
        if (data.bulk_price <= 0) {
            throw new errorHandler_1.AppError(400, 'Bulk price must be greater than 0');
        }
        if (data.max_quantity && data.max_quantity < data.min_quantity) {
            throw new errorHandler_1.AppError(400, 'Max quantity must be greater than or equal to min quantity');
        }
        const stmt = this.db.prepare(`
      INSERT INTO bulk_pricing (
        product_id, min_quantity, max_quantity, bulk_price, discount_percentage, active
      )
      VALUES (?, ?, ?, ?, ?, 1)
    `);
        stmt.run(data.product_id, data.min_quantity, data.max_quantity || null, data.bulk_price, data.discount_percentage || null);
        return this.getBulkPrice(this.db.prepare('SELECT last_insert_rowid() as id').get());
    }
    getBulkPrice(id) {
        return this.db
            .prepare('SELECT * FROM bulk_pricing WHERE id = ?')
            .get(id);
    }
    getProductBulkPrices(productId) {
        return this.db
            .prepare('SELECT * FROM bulk_pricing WHERE product_id = ? AND active = 1 ORDER BY min_quantity ASC')
            .all(productId);
    }
    // Get applicable bulk price for a specific quantity
    getApplicableBulkPrice(productId, quantity) {
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
    calculateBulkPrice(productId, quantity, regularPrice) {
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
    updateBulkPrice(id, data) {
        const updates = [];
        const values = [];
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
                throw new errorHandler_1.AppError(400, 'Bulk price must be greater than 0');
            }
            updates.push('bulk_price = ?');
            values.push(data.bulk_price);
        }
        if (data.discount_percentage !== undefined) {
            updates.push('discount_percentage = ?');
            values.push(data.discount_percentage);
        }
        if (updates.length === 0)
            return;
        updates.push('updated_at = CURRENT_TIMESTAMP');
        values.push(id);
        const query = `UPDATE bulk_pricing SET ${updates.join(', ')} WHERE id = ?`;
        this.db.prepare(query).run(...values);
    }
    toggleBulkPrice(id, active) {
        this.db
            .prepare('UPDATE bulk_pricing SET active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
            .run(active ? 1 : 0, id);
    }
    deleteBulkPrice(id) {
        this.db.prepare('DELETE FROM bulk_pricing WHERE id = ?').run(id);
    }
    // Get wholesale customers (those who have made bulk purchases)
    getWholesaleCustomerStats() {
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
            .all();
    }
    // Generate bulk pricing report
    getBulkPricingReport() {
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
            .all();
    }
}
exports.BulkPricingService = BulkPricingService;
exports.bulkPricingService = new BulkPricingService();
//# sourceMappingURL=bulkPricingService.js.map
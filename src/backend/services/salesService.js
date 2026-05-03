"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.salesService = exports.SalesService = void 0;
const db_1 = require("../database/db");
const errorHandler_1 = require("../middleware/errorHandler");
const pricingService_1 = require("./pricingService");
const productService_1 = require("./productService");
class SalesService {
    constructor() {
        this.db = (0, db_1.getDatabase)();
    }
    createSale(request) {
        // Validate pricing first
        const pricingValidation = pricingService_1.pricingService.validateSaleItems(request.items);
        if (!pricingValidation.valid) {
            throw new errorHandler_1.AppError(400, 'Pricing validation failed', {
                errors: pricingValidation.errors,
            });
        }
        // Use transaction for atomicity
        return (0, db_1.withTransaction)(() => {
            // Verify all products exist and have sufficient stock
            for (const item of request.items) {
                const product = productService_1.productService.getProduct(item.productId);
                if (!product) {
                    throw new errorHandler_1.AppError(404, `Product ${item.productId} not found`);
                }
                if (product.quantity_available < item.quantity) {
                    throw new errorHandler_1.AppError(400, `Insufficient stock for ${product.name}. Available: ${product.quantity_available}`);
                }
            }
            // Create sale record
            const saleStmt = this.db.prepare(`
        INSERT INTO sales (user_id, total_amount, payment_method, items_count, sale_date)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      `);
            saleStmt.run(request.userId, request.total_amount, request.payment_method, request.items.length);
            const saleId = this.db.prepare('SELECT last_insert_rowid() as id').get().id;
            // Create sale items and update stock
            const itemStmt = this.db.prepare(`
        INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, subtotal, discount_percentage, discounted_price)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
            for (const item of request.items) {
                const discountPercentage = item.discountPercentage || 0;
                const discountedPrice = item.discountedPrice || item.unitPrice;
                const subtotal = discountedPrice * item.quantity;
                itemStmt.run(saleId, item.productId, item.quantity, item.unitPrice, subtotal, discountPercentage, discountedPrice);
                // Update product quantity
                productService_1.productService.updateStock(item.productId, -item.quantity);
                // Log to audit trail
                this.db
                    .prepare(`INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_value, timestamp)
            VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`)
                    .run(request.userId, 'SALE', 'product', item.productId, JSON.stringify({ quantity: item.quantity, price: item.unitPrice }));
            }
            return this.getSale(saleId);
        });
    }
    getSale(id) {
        return this.db
            .prepare('SELECT * FROM sales WHERE id = ?')
            .get(id);
    }
    getSaleWithItems(id) {
        const sale = this.getSale(id);
        if (!sale)
            return null;
        const items = this.db
            .prepare('SELECT product_id, quantity, unit_price FROM sale_items WHERE sale_id = ?')
            .all(id);
        return {
            ...sale,
            items,
        };
    }
    getSalesByDateRange(startDate, endDate, userId) {
        let query = `
      SELECT * FROM sales
      WHERE DATE(sale_date) BETWEEN ? AND ?
    `;
        const params = [startDate, endDate];
        if (userId) {
            query += ' AND user_id = ?';
            params.push(userId);
        }
        query += ' ORDER BY sale_date DESC';
        return this.db.prepare(query).all(...params);
    }
    getDailySalesTotal(date) {
        const result = this.db
            .prepare(`SELECT COALESCE(SUM(total_amount), 0) as total
        FROM sales WHERE DATE(sale_date) = ?`)
            .get(date);
        return result.total;
    }
    getMonthlySalesTotal(month) {
        // month format: YYYY-MM
        const result = this.db
            .prepare(`SELECT COALESCE(SUM(total_amount), 0) as total
        FROM sales WHERE strftime('%Y-%m', sale_date) = ?`)
            .get(month);
        return result.total;
    }
    getSalesCount(startDate, endDate) {
        let query = 'SELECT COUNT(*) as count FROM sales';
        const params = [];
        if (startDate && endDate) {
            query += ' WHERE DATE(sale_date) BETWEEN ? AND ?';
            params.push(startDate, endDate);
        }
        const result = this.db.prepare(query).get(...params);
        return result.count;
    }
    getBestSellingProducts(limit = 10) {
        return this.db
            .prepare(`SELECT
          p.id, p.name, p.sku, p.category,
          SUM(si.quantity) as total_quantity,
          SUM(si.subtotal) as total_revenue
        FROM sale_items si
        JOIN products p ON si.product_id = p.id
        GROUP BY p.id
        ORDER BY total_quantity DESC
        LIMIT ?`)
            .all(limit);
    }
    getCategoryPerformance() {
        return this.db
            .prepare(`SELECT
          p.category,
          COUNT(DISTINCT si.sale_id) as sales_count,
          SUM(si.quantity) as total_items,
          SUM(si.subtotal) as total_revenue,
          ROUND(AVG(si.subtotal), 2) as avg_sale
        FROM sale_items si
        JOIN products p ON si.product_id = p.id
        GROUP BY p.category
        ORDER BY total_revenue DESC`)
            .all();
    }
}
exports.SalesService = SalesService;
exports.salesService = new SalesService();
//# sourceMappingURL=salesService.js.map
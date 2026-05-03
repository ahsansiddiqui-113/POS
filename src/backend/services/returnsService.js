"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.returnsService = exports.ReturnsService = void 0;
const db_1 = require("../database/db");
const errorHandler_1 = require("../middleware/errorHandler");
const salesService_1 = require("./salesService");
const productService_1 = require("./productService");
class ReturnsService {
    constructor() {
        this.db = (0, db_1.getDatabase)();
    }
    createReturn(request) {
        // Validate sale exists
        const sale = salesService_1.salesService.getSaleWithItems(request.sale_id);
        if (!sale) {
            throw new errorHandler_1.AppError(404, 'Sale not found');
        }
        // Validate product exists
        const product = productService_1.productService.getProduct(request.product_id);
        if (!product) {
            throw new errorHandler_1.AppError(404, 'Product not found');
        }
        // Validate item was in the sale
        const saleItem = sale.items.find((item) => item.productId === request.product_id);
        if (!saleItem) {
            throw new errorHandler_1.AppError(400, 'Product was not in this sale');
        }
        // Validate return quantity
        if (request.quantity > saleItem.quantity) {
            throw new errorHandler_1.AppError(400, 'Cannot return more than was purchased');
        }
        if (request.quantity <= 0) {
            throw new errorHandler_1.AppError(400, 'Return quantity must be greater than 0');
        }
        // Calculate refund amount
        const refundAmount = saleItem.unitPrice * request.quantity;
        // Use transaction for atomicity
        return (0, db_1.withTransaction)(() => {
            // Create return record
            const stmt = this.db.prepare(`
        INSERT INTO returns (user_id, sale_id, product_id, quantity, reason, refund_amount, return_date)
        VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `);
            stmt.run(request.userId, request.sale_id, request.product_id, request.quantity, request.reason || null, refundAmount);
            const returnId = this.db.prepare('SELECT last_insert_rowid() as id').get().id;
            // Restore product quantity
            productService_1.productService.updateStock(request.product_id, request.quantity);
            // Log to audit trail
            this.db
                .prepare(`INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_value, timestamp)
          VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`)
                .run(request.userId, 'RETURN', 'sale', request.sale_id, JSON.stringify({
                product_id: request.product_id,
                quantity: request.quantity,
                refund: refundAmount,
            }));
            return this.getReturn(returnId);
        });
    }
    getReturn(id) {
        return this.db
            .prepare('SELECT * FROM returns WHERE id = ?')
            .get(id);
    }
    getReturnsBySale(saleId) {
        return this.db
            .prepare('SELECT * FROM returns WHERE sale_id = ? ORDER BY return_date DESC')
            .all(saleId);
    }
    getReturnsByDateRange(startDate, endDate) {
        return this.db
            .prepare(`SELECT * FROM returns
        WHERE DATE(return_date) BETWEEN ? AND ?
        ORDER BY return_date DESC`)
            .all(startDate, endDate);
    }
    getTotalRefunds(startDate, endDate) {
        let query = 'SELECT COALESCE(SUM(refund_amount), 0) as total FROM returns';
        const params = [];
        if (startDate && endDate) {
            query += ' WHERE DATE(return_date) BETWEEN ? AND ?';
            params.push(startDate, endDate);
        }
        const result = this.db.prepare(query).get(...params);
        return result.total;
    }
    getReturnRate() {
        const totalSales = this.db
            .prepare('SELECT COALESCE(SUM(items_count), 0) as count FROM sales')
            .get();
        const totalReturns = this.db
            .prepare('SELECT COALESCE(SUM(quantity), 0) as count FROM returns')
            .get();
        if (totalSales.count === 0)
            return 0;
        return (totalReturns.count / totalSales.count) * 100;
    }
}
exports.ReturnsService = ReturnsService;
exports.returnsService = new ReturnsService();
//# sourceMappingURL=returnsService.js.map
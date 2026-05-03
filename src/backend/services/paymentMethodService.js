"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.paymentMethodService = exports.PaymentMethodService = void 0;
const db_1 = require("../database/db");
const errorHandler_1 = require("../middleware/errorHandler");
class PaymentMethodService {
    constructor() {
        this.db = (0, db_1.getDatabase)();
    }
    // ============ PAYMENT METHOD CRUD ============
    createPaymentMethod(name) {
        const existing = this.db
            .prepare('SELECT id FROM payment_methods WHERE name = ?')
            .get(name);
        if (existing) {
            throw new errorHandler_1.AppError(409, 'Payment method already exists');
        }
        const stmt = this.db.prepare(`
      INSERT INTO payment_methods (name, active, created_at, updated_at)
      VALUES (?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `);
        stmt.run(name);
        const methodId = this.db.prepare('SELECT last_insert_rowid() as id').get().id;
        return this.getPaymentMethod(methodId);
    }
    getPaymentMethod(id) {
        return this.db
            .prepare('SELECT * FROM payment_methods WHERE id = ?')
            .get(id);
    }
    getAllPaymentMethods(activeOnly = true) {
        if (activeOnly) {
            return this.db
                .prepare('SELECT * FROM payment_methods WHERE active = 1 ORDER BY name ASC')
                .all();
        }
        return this.db
            .prepare('SELECT * FROM payment_methods ORDER BY name ASC')
            .all();
    }
    updatePaymentMethod(id, data) {
        const method = this.getPaymentMethod(id);
        if (!method) {
            throw new errorHandler_1.AppError(404, 'Payment method not found');
        }
        const updates = [];
        const values = [];
        if (data.name !== undefined) {
            updates.push('name = ?');
            values.push(data.name);
        }
        if (data.active !== undefined) {
            updates.push('active = ?');
            values.push(data.active ? 1 : 0);
        }
        if (updates.length === 0) {
            return method;
        }
        updates.push('updated_at = CURRENT_TIMESTAMP');
        values.push(id);
        const query = `UPDATE payment_methods SET ${updates.join(', ')} WHERE id = ?`;
        this.db.prepare(query).run(...values);
        return this.getPaymentMethod(id);
    }
    // ============ SPLIT PAYMENTS ============
    processSplitPayment(saleId, payments) {
        const sale = this.db
            .prepare('SELECT total_amount FROM sales WHERE id = ?')
            .get(saleId);
        if (!sale) {
            throw new errorHandler_1.AppError(404, 'Sale not found');
        }
        const totalPayment = payments.reduce((sum, p) => sum + p.amount, 0);
        if (Math.abs(totalPayment - sale.total_amount) > 0.01) {
            throw new errorHandler_1.AppError(400, 'Payment amounts do not match sale total');
        }
        const salePayments = [];
        const stmt = this.db.prepare(`
      INSERT INTO sale_payments (sale_id, payment_method_id, amount, created_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    `);
        for (const payment of payments) {
            const method = this.getPaymentMethod(payment.methodId);
            if (!method) {
                throw new errorHandler_1.AppError(404, `Payment method ${payment.methodId} not found`);
            }
            stmt.run(saleId, payment.methodId, payment.amount);
            const paymentId = this.db.prepare('SELECT last_insert_rowid() as id').get().id;
            salePayments.push(this.getSalePayment(paymentId));
        }
        // Update sales table
        this.db
            .prepare(`
        UPDATE sales
        SET payment_method_count = ?, has_split_payment = ?
        WHERE id = ?
      `)
            .run(payments.length, payments.length > 1 ? 1 : 0, saleId);
        return salePayments;
    }
    getSalePayment(id) {
        return this.db
            .prepare('SELECT * FROM sale_payments WHERE id = ?')
            .get(id);
    }
    getSalePayments(saleId) {
        return this.db
            .prepare(`
        SELECT
          sp.id,
          sp.sale_id,
          sp.payment_method_id,
          sp.amount,
          pm.name as payment_method_name,
          sp.created_at
        FROM sale_payments sp
        JOIN payment_methods pm ON sp.payment_method_id = pm.id
        WHERE sp.sale_id = ?
        ORDER BY sp.created_at ASC
      `)
            .all(saleId);
    }
    // ============ STATISTICS ============
    getPaymentMethodStats(startDate, endDate) {
        return this.db
            .prepare(`
        SELECT
          pm.id,
          pm.name,
          COUNT(sp.id) as transaction_count,
          SUM(sp.amount) as total_amount,
          AVG(sp.amount) as average_amount,
          MIN(sp.amount) as min_amount,
          MAX(sp.amount) as max_amount
        FROM payment_methods pm
        LEFT JOIN sale_payments sp ON pm.id = sp.payment_method_id
        LEFT JOIN sales s ON sp.sale_id = s.id
        WHERE sp.id IS NULL OR s.sale_date BETWEEN ? AND ?
        GROUP BY pm.id, pm.name
        ORDER BY total_amount DESC NULLS LAST
      `)
            .all(startDate, endDate);
    }
    getPaymentMethodUsage(startDate, endDate) {
        const stats = this.getPaymentMethodStats(startDate, endDate);
        const totalAmount = stats.reduce((sum, s) => sum + (s.total_amount || 0), 0);
        return {
            period: { startDate, endDate },
            paymentMethods: stats.map((stat) => ({
                ...stat,
                percentOfTotal: totalAmount > 0 ? ((stat.total_amount || 0) / totalAmount * 100).toFixed(2) : 0,
            })),
            totalTransactions: stats.reduce((sum, s) => sum + (s.transaction_count || 0), 0),
            totalAmount: totalAmount.toFixed(2),
        };
    }
    getDailyPaymentBreakdown(startDate, endDate) {
        return this.db
            .prepare(`
        SELECT
          DATE(s.sale_date) as sale_date,
          pm.name as payment_method,
          COUNT(sp.id) as count,
          SUM(sp.amount) as total
        FROM sales s
        LEFT JOIN sale_payments sp ON s.id = sp.sale_id
        LEFT JOIN payment_methods pm ON sp.payment_method_id = pm.id
        WHERE s.sale_date BETWEEN ? AND ?
        GROUP BY DATE(s.sale_date), pm.name
        ORDER BY s.sale_date DESC, pm.name ASC
      `)
            .all(startDate, endDate);
    }
    getPaymentMethodTrends(monthsBack = 12) {
        const today = new Date();
        const startDate = new Date(today.getFullYear(), today.getMonth() - monthsBack, 1)
            .toISOString().split('T')[0];
        return this.db
            .prepare(`
        SELECT
          strftime('%Y-%m', s.sale_date) as month,
          pm.name as payment_method,
          COUNT(sp.id) as count,
          SUM(sp.amount) as total
        FROM sales s
        LEFT JOIN sale_payments sp ON s.id = sp.sale_id
        LEFT JOIN payment_methods pm ON sp.payment_method_id = pm.id
        WHERE s.sale_date >= ?
        GROUP BY month, payment_method
        ORDER BY month DESC, total DESC
      `)
            .all(startDate);
    }
}
exports.PaymentMethodService = PaymentMethodService;
exports.paymentMethodService = new PaymentMethodService();
//# sourceMappingURL=paymentMethodService.js.map
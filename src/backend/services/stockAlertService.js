"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stockAlertService = exports.StockAlertService = void 0;
const db_1 = require("../database/db");
const errorHandler_1 = require("../middleware/errorHandler");
class StockAlertService {
    constructor() {
        this.db = (0, db_1.getDatabase)();
    }
    // ============ STOCK ALERT SETTINGS ============
    getAlertSettings(productId) {
        return this.db
            .prepare('SELECT * FROM stock_alert_settings WHERE product_id = ?')
            .get(productId);
    }
    createAlertSetting(data) {
        const product = this.db
            .prepare('SELECT id FROM products WHERE id = ?')
            .get(data.productId);
        if (!product) {
            throw new errorHandler_1.AppError(404, 'Product not found');
        }
        const existing = this.getAlertSettings(data.productId);
        if (existing) {
            throw new errorHandler_1.AppError(409, 'Alert settings already exist for this product');
        }
        const stmt = this.db.prepare(`
      INSERT INTO stock_alert_settings (product_id, low_stock_threshold, reorder_quantity, reorder_supplier_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `);
        stmt.run(data.productId, data.lowStockThreshold || null, data.reorderQuantity || null, data.reorderSupplierId || null);
        return this.getAlertSettings(data.productId);
    }
    updateAlertSetting(productId, data) {
        const setting = this.getAlertSettings(productId);
        if (!setting) {
            throw new errorHandler_1.AppError(404, 'Alert settings not found');
        }
        const updates = [];
        const values = [];
        if (data.lowStockThreshold !== undefined) {
            updates.push('low_stock_threshold = ?');
            values.push(data.lowStockThreshold || null);
        }
        if (data.reorderQuantity !== undefined) {
            updates.push('reorder_quantity = ?');
            values.push(data.reorderQuantity || null);
        }
        if (data.reorderSupplierId !== undefined) {
            updates.push('reorder_supplier_id = ?');
            values.push(data.reorderSupplierId || null);
        }
        if (updates.length === 0) {
            return setting;
        }
        updates.push('updated_at = CURRENT_TIMESTAMP');
        values.push(productId);
        const query = `UPDATE stock_alert_settings SET ${updates.join(', ')} WHERE product_id = ?`;
        this.db.prepare(query).run(...values);
        return this.getAlertSettings(productId);
    }
    // ============ STOCK ALERT LOGGING ============
    createStockAlert(productId, alertType, notes) {
        const product = this.db
            .prepare('SELECT id FROM products WHERE id = ?')
            .get(productId);
        if (!product) {
            throw new errorHandler_1.AppError(404, 'Product not found');
        }
        if (!['low_stock', 'expiry_warning'].includes(alertType)) {
            throw new errorHandler_1.AppError(400, 'Invalid alert type');
        }
        const stmt = this.db.prepare(`
      INSERT INTO stock_alerts (product_id, alert_type, triggered_date, notes)
      VALUES (?, ?, CURRENT_TIMESTAMP, ?)
    `);
        stmt.run(productId, alertType, notes || null);
        const alertId = this.db.prepare('SELECT last_insert_rowid() as id').get().id;
        return this.getAlert(alertId);
    }
    getAlert(id) {
        return this.db
            .prepare('SELECT * FROM stock_alerts WHERE id = ?')
            .get(id);
    }
    getAllAlerts(resolved) {
        if (resolved !== undefined) {
            return this.db
                .prepare('SELECT * FROM stock_alerts WHERE resolved = ? ORDER BY triggered_date DESC')
                .all(resolved);
        }
        return this.db
            .prepare('SELECT * FROM stock_alerts ORDER BY triggered_date DESC')
            .all();
    }
    resolveStockAlert(alertId, resolvedByUserId, notes) {
        const alert = this.getAlert(alertId);
        if (!alert) {
            throw new errorHandler_1.AppError(404, 'Alert not found');
        }
        const user = this.db.prepare('SELECT id FROM users WHERE id = ?').get(resolvedByUserId);
        if (!user) {
            throw new errorHandler_1.AppError(404, 'User not found');
        }
        this.db
            .prepare('UPDATE stock_alerts SET resolved = 1, resolved_date = CURRENT_TIMESTAMP, resolved_by_user_id = ?, notes = ? WHERE id = ?')
            .run(resolvedByUserId, notes || null, alertId);
        return this.getAlert(alertId);
    }
    // ============ LOW STOCK DETECTION ============
    checkLowStockProducts() {
        return this.db
            .prepare(`
        SELECT
          p.id,
          p.sku,
          p.name,
          p.quantity_available,
          p.low_stock_threshold,
          COALESCE(sas.low_stock_threshold, p.low_stock_threshold) as effective_threshold,
          COALESCE(sas.reorder_quantity, 0) as reorder_quantity,
          s.name as supplier_name,
          s.contact as supplier_contact
        FROM products p
        LEFT JOIN stock_alert_settings sas ON p.id = sas.product_id
        LEFT JOIN suppliers s ON COALESCE(sas.reorder_supplier_id, p.supplier_id) = s.id
        WHERE p.quantity_available < COALESCE(sas.low_stock_threshold, p.low_stock_threshold)
        ORDER BY p.quantity_available ASC
      `)
            .all();
    }
    // ============ EXPIRY TRACKING ============
    getExpiringProducts(daysUntilExpiry = 30) {
        const today = new Date().toISOString().split('T')[0];
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + daysUntilExpiry);
        const expiryDateStr = expiryDate.toISOString().split('T')[0];
        return this.db
            .prepare(`
        SELECT
          p.id,
          p.sku,
          p.name,
          p.quantity_available,
          p.expiry_date,
          CAST((julianday(p.expiry_date) - julianday(?)) AS INTEGER) as days_until_expiry
        FROM products p
        WHERE p.expiry_date IS NOT NULL
          AND p.expiry_date > ?
          AND p.expiry_date <= ?
        ORDER BY p.expiry_date ASC
      `)
            .all(today, today, expiryDateStr);
    }
    getExpiredProducts() {
        const today = new Date().toISOString().split('T')[0];
        return this.db
            .prepare(`
        SELECT
          p.id,
          p.sku,
          p.name,
          p.quantity_available,
          p.expiry_date
        FROM products p
        WHERE p.expiry_date IS NOT NULL
          AND p.expiry_date < ?
        ORDER BY p.expiry_date ASC
      `)
            .all(today);
    }
    // ============ REORDER SUGGESTIONS ============
    getReorderSuggestions() {
        const lowStockProducts = this.checkLowStockProducts();
        return lowStockProducts.map((product) => ({
            ...product,
            suggested_order_quantity: product.reorder_quantity || (product.effective_threshold * 2),
            action: 'Reorder required',
        }));
    }
    generateReorderList(categoryFilter) {
        let query = `
      SELECT
        p.id,
        p.sku,
        p.name,
        p.quantity_available,
        p.low_stock_threshold,
        COALESCE(sas.reorder_quantity, p.low_stock_threshold * 2) as suggested_quantity,
        s.name as supplier_name,
        s.email as supplier_email,
        s.phone as supplier_phone
      FROM products p
      LEFT JOIN stock_alert_settings sas ON p.id = sas.product_id
      LEFT JOIN suppliers s ON COALESCE(sas.reorder_supplier_id, p.supplier_id) = s.id
      WHERE p.quantity_available < COALESCE(sas.low_stock_threshold, p.low_stock_threshold)
    `;
        if (categoryFilter) {
            query += ` AND p.category = ?`;
            return this.db.prepare(query).all(categoryFilter);
        }
        return this.db.prepare(query).all();
    }
    // ============ ALERT SUMMARY ============
    getAlertSummary() {
        const lowStockCount = this.checkLowStockProducts().length;
        const expiringCount = this.getExpiringProducts(30).length;
        const expiredCount = this.getExpiredProducts().length;
        const activeAlerts = this.getAllAlerts(0).length;
        const resolvedAlerts = this.getAllAlerts(1).length;
        return {
            low_stock_count: lowStockCount,
            expiring_count: expiringCount,
            expired_count: expiredCount,
            active_alerts: activeAlerts,
            resolved_alerts: resolvedAlerts,
            total_alerts: activeAlerts + resolvedAlerts,
        };
    }
    // ============ ALERT AUTOMATION ============
    checkAndCreateAlerts() {
        let createdCount = 0;
        let skippedCount = 0;
        // Check low stock
        const lowStockProducts = this.checkLowStockProducts();
        for (const product of lowStockProducts) {
            const existingAlert = this.db
                .prepare('SELECT id FROM stock_alerts WHERE product_id = ? AND alert_type = ? AND resolved = 0')
                .get(product.id, 'low_stock');
            if (!existingAlert) {
                this.createStockAlert(product.id, 'low_stock');
                createdCount++;
            }
            else {
                skippedCount++;
            }
        }
        // Check expiring products
        const expiringProducts = this.getExpiringProducts(30);
        for (const product of expiringProducts) {
            const existingAlert = this.db
                .prepare('SELECT id FROM stock_alerts WHERE product_id = ? AND alert_type = ? AND resolved = 0')
                .get(product.id, 'expiry_warning');
            if (!existingAlert) {
                this.createStockAlert(product.id, 'expiry_warning', `Expires on ${product.expiry_date}`);
                createdCount++;
            }
            else {
                skippedCount++;
            }
        }
        return { created: createdCount, skipped: skippedCount };
    }
}
exports.StockAlertService = StockAlertService;
exports.stockAlertService = new StockAlertService();
//# sourceMappingURL=stockAlertService.js.map
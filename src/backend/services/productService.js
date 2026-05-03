"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.productService = exports.ProductService = void 0;
const db_1 = require("../database/db");
const errorHandler_1 = require("../middleware/errorHandler");
const validators_1 = require("../utils/validators");
class ProductService {
    constructor() {
        this.db = (0, db_1.getDatabase)();
    }
    logAudit(userId, action, entityId, oldValue = null, newValue = null) {
        try {
            this.db
                .prepare(`
          INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_value, new_value)
          VALUES (?, ?, ?, ?, ?, ?)
        `)
                .run(userId, action, 'product', entityId, oldValue ? JSON.stringify(oldValue) : null, newValue ? JSON.stringify(newValue) : null);
        }
        catch (error) {
            // Log audit failure but don't break the operation
            console.error('Failed to log audit trail:', error);
        }
    }
    getProduct(id) {
        return this.db
            .prepare('SELECT * FROM products WHERE id = ?')
            .get(id);
    }
    getProductByBarcode(barcode) {
        return this.db
            .prepare('SELECT * FROM products WHERE barcode = ?')
            .get(barcode);
    }
    getProductBySku(sku) {
        return this.db
            .prepare('SELECT * FROM products WHERE sku = ?')
            .get(sku);
    }
    searchProducts(query, page = 1, pageSize = 20, filters) {
        const offset = (page - 1) * pageSize;
        const searchTerm = `%${query}%`;
        let countQuery = 'SELECT COUNT(*) as total FROM products WHERE ';
        let dataQuery = 'SELECT * FROM products WHERE ';
        const whereConditions = [
            '(barcode LIKE ? OR sku LIKE ? OR name LIKE ? OR description LIKE ?)',
        ];
        const params = [searchTerm, searchTerm, searchTerm, searchTerm];
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
            .get(...params);
        const data = this.db
            .prepare(dataQuery +
            whereClause +
            ' ORDER BY updated_at DESC LIMIT ? OFFSET ?')
            .all(...params, pageSize, offset);
        return {
            data,
            total: total.total,
            page,
            pageSize,
            pages: Math.ceil(total.total / pageSize),
        };
    }
    getAllProducts(page = 1, pageSize = 20, category) {
        const offset = (page - 1) * pageSize;
        let countQuery = 'SELECT COUNT(*) as total FROM products';
        let dataQuery = 'SELECT * FROM products';
        const params = [];
        if (category) {
            countQuery += ' WHERE category = ?';
            dataQuery += ' WHERE category = ?';
            params.push(category);
        }
        console.log('[ProductService] getAllProducts - countQuery:', countQuery, 'params:', params);
        const total = this.db.prepare(countQuery).get(...params);
        console.log('[ProductService] Total products in DB:', total.total);
        console.log('[ProductService] dataQuery:', dataQuery, 'offset:', offset, 'pageSize:', pageSize);
        const data = this.db
            .prepare(dataQuery +
            ' ORDER BY updated_at DESC LIMIT ? OFFSET ?')
            .all(...params, pageSize, offset);
        console.log('[ProductService] Data returned:', data.length, 'products');
        if (data.length > 0) {
            console.log('[ProductService] First product:', data[0]);
        }
        return {
            data,
            total: total.total,
            page,
            pageSize,
            pages: Math.ceil(total.total / pageSize),
        };
    }
    createProduct(data, userId = 0) {
        const errors = (0, validators_1.validateProductInput)(data);
        if (errors.length > 0) {
            throw new validators_1.ValidationException(errors);
        }
        try {
            const stmt = this.db.prepare(`
        INSERT INTO products (
          sku, barcode, name, category, sub_category, brand, description,
          purchase_price_per_unit, sale_price_per_unit, quantity_available,
          low_stock_threshold, expiry_date, batch_number, supplier_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
            stmt.run(data.sku, data.barcode, data.name, data.category, data.sub_category || null, data.brand || null, data.description || null, data.purchase_price_per_unit, data.sale_price_per_unit, data.quantity_available || 0, data.low_stock_threshold || 10, data.expiry_date || null, data.batch_number || null, data.supplier_id || null);
            const id = this.db.prepare('SELECT last_insert_rowid() as id').get().id;
            const product = this.getProduct(id);
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
        }
        catch (error) {
            if (error.message.includes('UNIQUE constraint')) {
                const field = error.message.includes('barcode')
                    ? 'barcode'
                    : 'sku';
                throw new errorHandler_1.AppError(409, `Product with this ${field} already exists`);
            }
            throw error;
        }
    }
    updateProduct(id, data, userId = 0) {
        const product = this.getProduct(id);
        if (!product) {
            throw new errorHandler_1.AppError(404, 'Product not found');
        }
        const updates = ['updated_at = CURRENT_TIMESTAMP'];
        const values = [];
        const oldValues = {};
        const newValues = {};
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
            if (data[field] !== undefined && data[field] !== product[field]) {
                updates.push(`${field} = ?`);
                values.push(data[field]);
                oldValues[field] = product[field];
                newValues[field] = data[field];
            }
        }
        if (updates.length === 1) {
            return product;
        }
        values.push(id);
        const query = `UPDATE products SET ${updates.join(', ')} WHERE id = ?`;
        this.db.prepare(query).run(...values);
        const updatedProduct = this.getProduct(id);
        // Log the update
        if (userId > 0 && Object.keys(newValues).length > 0) {
            this.logAudit(userId, 'UPDATE', id, oldValues, newValues);
        }
        return updatedProduct;
    }
    updateStock(id, quantityChange, reason = '') {
        const product = this.getProduct(id);
        if (!product) {
            throw new errorHandler_1.AppError(404, 'Product not found');
        }
        const newQuantity = product.quantity_available + quantityChange;
        if (newQuantity < 0) {
            throw new errorHandler_1.AppError(400, 'Insufficient stock. Cannot complete operation.');
        }
        this.db
            .prepare('UPDATE products SET quantity_available = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
            .run(newQuantity, id);
        return this.getProduct(id);
    }
    bulkImportProducts(products) {
        const transaction = this.db.transaction(() => {
            let created = 0;
            let failed = 0;
            for (const product of products) {
                try {
                    this.createProduct(product);
                    created++;
                }
                catch (error) {
                    failed++;
                    console.error(`Failed to import product ${product.sku}:`, error);
                }
            }
            return { created, failed };
        });
        return transaction();
    }
    deleteProduct(id, userId = 0) {
        const product = this.getProduct(id);
        if (!product) {
            throw new errorHandler_1.AppError(404, 'Product not found');
        }
        // Check if product has any sales
        const salesCount = this.db
            .prepare('SELECT COUNT(*) as count FROM sale_items WHERE product_id = ?')
            .get(id);
        if (salesCount.count > 0) {
            throw new errorHandler_1.AppError(400, 'Cannot delete product with existing sales records');
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
    getCategories() {
        const result = this.db
            .prepare('SELECT DISTINCT category FROM products WHERE category IS NOT NULL ORDER BY category')
            .all();
        return result.map((r) => r.category);
    }
    getProductsLowOnStock(threshold) {
        const query = threshold
            ? 'SELECT * FROM products WHERE quantity_available <= ? ORDER BY quantity_available ASC'
            : 'SELECT * FROM products WHERE quantity_available <= low_stock_threshold ORDER BY quantity_available ASC';
        const params = threshold ? [threshold] : [];
        return this.db.prepare(query).all(...params);
    }
    getProductsExpiringWithin(days) {
        return this.db
            .prepare(`SELECT * FROM products
        WHERE expiry_date IS NOT NULL
        AND date(expiry_date) <= date('now', '+' || ? || ' days')
        AND date(expiry_date) > date('now')
        ORDER BY expiry_date ASC`)
            .all(days);
    }
}
exports.ProductService = ProductService;
exports.productService = new ProductService();
//# sourceMappingURL=productService.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.categoryService = exports.CategoryService = void 0;
const db_1 = require("../database/db");
const errorHandler_1 = require("../middleware/errorHandler");
class CategoryService {
    constructor() {
        this.db = (0, db_1.getDatabase)();
    }
    logAudit(userId, action, oldValue = null, newValue = null) {
        try {
            this.db
                .prepare(`
          INSERT INTO audit_logs (user_id, action, entity_type, old_value, new_value)
          VALUES (?, ?, ?, ?, ?)
        `)
                .run(userId, action, 'category', oldValue ? JSON.stringify(oldValue) : null, newValue ? JSON.stringify(newValue) : null);
        }
        catch (error) {
            console.error('Failed to log audit trail:', error);
        }
    }
    getCategories() {
        const result = this.db
            .prepare('SELECT name FROM categories ORDER BY name')
            .all();
        return result.map((r) => r.name);
    }
    getCategoryWithCount() {
        const result = this.db
            .prepare(`SELECT
          c.name,
          COUNT(p.id) as productCount
        FROM categories c
        LEFT JOIN products p ON c.name = p.category
        GROUP BY c.name
        ORDER BY c.name`)
            .all();
        return result;
    }
    createCategory(name, userId = 0) {
        if (!name || !name.trim()) {
            throw new errorHandler_1.AppError(400, 'Category name is required');
        }
        const trimmedName = name.trim();
        // Check if category already exists in categories table
        const existing = this.db
            .prepare('SELECT name FROM categories WHERE name = ?')
            .get(trimmedName);
        if (existing) {
            throw new errorHandler_1.AppError(409, 'Category already exists');
        }
        // Insert the category into the categories table
        this.db
            .prepare('INSERT INTO categories (name) VALUES (?)')
            .run(trimmedName);
        // Log the creation
        if (userId > 0) {
            this.logAudit(userId, 'CREATE', null, { name: trimmedName });
        }
        return trimmedName;
    }
    renameCategory(oldName, newName, userId = 0) {
        if (!oldName || !newName) {
            throw new errorHandler_1.AppError(400, 'Both old and new names are required');
        }
        const newNameTrimmed = newName.trim();
        // Check if new category already exists in categories table
        const existing = this.db
            .prepare('SELECT name FROM categories WHERE name = ?')
            .get(newNameTrimmed);
        if (existing && existing.name !== oldName) {
            throw new errorHandler_1.AppError(409, 'New category name already exists');
        }
        // Update the category name in categories table
        this.db
            .prepare('UPDATE categories SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE name = ?')
            .run(newNameTrimmed, oldName);
        // Update products with old category
        const count = this.db
            .prepare('SELECT COUNT(*) as count FROM products WHERE category = ?')
            .get(oldName).count;
        if (count > 0) {
            this.db
                .prepare('UPDATE products SET category = ? WHERE category = ?')
                .run(newNameTrimmed, oldName);
        }
        // Log the update
        if (userId > 0) {
            this.logAudit(userId, 'UPDATE', { name: oldName }, { name: newNameTrimmed });
        }
    }
    deleteCategory(name, userId = 0) {
        if (!name) {
            throw new errorHandler_1.AppError(400, 'Category name is required');
        }
        // Check if any products use this category
        const count = this.db
            .prepare('SELECT COUNT(*) as count FROM products WHERE category = ?')
            .get(name).count;
        if (count > 0) {
            throw new errorHandler_1.AppError(400, `Cannot delete category. ${count} product(s) are using this category.`);
        }
        // Delete the category from categories table
        this.db
            .prepare('DELETE FROM categories WHERE name = ?')
            .run(name);
        // Log the deletion
        if (userId > 0) {
            this.logAudit(userId, 'DELETE', { name }, null);
        }
    }
}
exports.CategoryService = CategoryService;
exports.categoryService = new CategoryService();
//# sourceMappingURL=categoryService.js.map
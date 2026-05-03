"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.expenseService = exports.ExpenseService = void 0;
const db_1 = require("../database/db");
const errorHandler_1 = require("../middleware/errorHandler");
class ExpenseService {
    constructor() {
        this.db = (0, db_1.getDatabase)();
    }
    // ============ EXPENSE CRUD ============
    createExpense(data) {
        if (data.amount <= 0) {
            throw new errorHandler_1.AppError(400, 'Expense amount must be greater than 0');
        }
        const stmt = this.db.prepare(`
      INSERT INTO expenses (date, category_id, amount, description, user_id, receipt_image_path, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `);
        stmt.run(data.date, data.categoryId, data.amount, data.description || null, data.userId, data.receiptImagePath || null);
        const expenseId = this.db.prepare('SELECT last_insert_rowid() as id').get().id;
        return this.getExpense(expenseId);
    }
    getExpense(id) {
        return this.db
            .prepare('SELECT * FROM expenses WHERE id = ?')
            .get(id);
    }
    getExpenses(limit = 100, offset = 0) {
        return this.db
            .prepare('SELECT * FROM expenses ORDER BY date DESC LIMIT ? OFFSET ?')
            .all(limit, offset);
    }
    getExpensesByDateRange(startDate, endDate) {
        return this.db
            .prepare('SELECT * FROM expenses WHERE date BETWEEN ? AND ? ORDER BY date DESC')
            .all(startDate, endDate);
    }
    getExpensesByCategory(categoryId, startDate, endDate) {
        if (startDate && endDate) {
            return this.db
                .prepare('SELECT * FROM expenses WHERE category_id = ? AND date BETWEEN ? AND ? ORDER BY date DESC')
                .all(categoryId, startDate, endDate);
        }
        return this.db
            .prepare('SELECT * FROM expenses WHERE category_id = ? ORDER BY date DESC')
            .all(categoryId);
    }
    updateExpense(id, data) {
        const expense = this.getExpense(id);
        if (!expense) {
            throw new errorHandler_1.AppError(404, 'Expense not found');
        }
        const updates = [];
        const values = [];
        if (data.date !== undefined) {
            updates.push('date = ?');
            values.push(data.date);
        }
        if (data.categoryId !== undefined) {
            updates.push('category_id = ?');
            values.push(data.categoryId);
        }
        if (data.amount !== undefined) {
            if (data.amount <= 0) {
                throw new errorHandler_1.AppError(400, 'Expense amount must be greater than 0');
            }
            updates.push('amount = ?');
            values.push(data.amount);
        }
        if (data.description !== undefined) {
            updates.push('description = ?');
            values.push(data.description || null);
        }
        if (data.receiptImagePath !== undefined) {
            updates.push('receipt_image_path = ?');
            values.push(data.receiptImagePath || null);
        }
        if (updates.length === 0) {
            return expense;
        }
        updates.push('updated_at = CURRENT_TIMESTAMP');
        values.push(id);
        const query = `UPDATE expenses SET ${updates.join(', ')} WHERE id = ?`;
        this.db.prepare(query).run(...values);
        return this.getExpense(id);
    }
    deleteExpense(id) {
        const expense = this.getExpense(id);
        if (!expense) {
            throw new errorHandler_1.AppError(404, 'Expense not found');
        }
        this.db.prepare('DELETE FROM expenses WHERE id = ?').run(id);
    }
    // ============ EXPENSE REPORTING ============
    getMonthlyExpenseBreakdown(year, month) {
        const monthKey = `${year}-${month}`;
        const result = this.db
            .prepare(`
        SELECT
          ec.id,
          ec.name as category_name,
          COUNT(*) as count,
          SUM(e.amount) as total,
          AVG(e.amount) as average
        FROM expenses e
        JOIN expense_categories ec ON e.category_id = ec.id
        WHERE strftime('%Y-%m', e.date) = ?
        GROUP BY ec.id, ec.name
        ORDER BY total DESC
      `)
            .all(monthKey);
        const totalExpenses = result.reduce((sum, row) => sum + (row.total || 0), 0);
        return {
            month: monthKey,
            byCategory: result.map((row) => ({
                ...row,
                percentOfTotal: totalExpenses > 0 ? ((row.total / totalExpenses) * 100).toFixed(2) : 0,
            })),
            totalExpenses: totalExpenses.toFixed(2),
        };
    }
    getTotalExpensesByCategory(categoryId, startDate, endDate) {
        const result = this.db
            .prepare('SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE category_id = ? AND date BETWEEN ? AND ?')
            .get(categoryId, startDate, endDate);
        return result.total;
    }
    getTotalExpenses(startDate, endDate) {
        const result = this.db
            .prepare('SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE date BETWEEN ? AND ?')
            .get(startDate, endDate);
        return result.total;
    }
    getExpenseReport(startDate, endDate) {
        const expenses = this.getExpensesByDateRange(startDate, endDate);
        const totalExpenses = this.getTotalExpenses(startDate, endDate);
        const byCategory = this.db
            .prepare(`
        SELECT
          ec.id,
          ec.name,
          COUNT(*) as count,
          SUM(e.amount) as total
        FROM expenses e
        JOIN expense_categories ec ON e.category_id = ec.id
        WHERE e.date BETWEEN ? AND ?
        GROUP BY ec.id, ec.name
        ORDER BY total DESC
      `)
            .all(startDate, endDate);
        const dailyTotal = this.db
            .prepare(`
        SELECT
          DATE(date) as day,
          COUNT(*) as count,
          SUM(amount) as total
        FROM expenses
        WHERE date BETWEEN ? AND ?
        GROUP BY DATE(date)
        ORDER BY day DESC
      `)
            .all(startDate, endDate);
        return {
            period: { startDate, endDate },
            totalExpenses: totalExpenses.toFixed(2),
            expenseCount: expenses.length,
            averageExpense: expenses.length > 0 ? (totalExpenses / expenses.length).toFixed(2) : 0,
            byCategory,
            dailyTotal,
            transactions: expenses,
        };
    }
    // ============ CATEGORY MANAGEMENT ============
    createCategory(name, description) {
        const existing = this.db
            .prepare('SELECT id FROM expense_categories WHERE name = ?')
            .get(name);
        if (existing) {
            throw new errorHandler_1.AppError(409, 'Category already exists');
        }
        const stmt = this.db.prepare(`
      INSERT INTO expense_categories (name, description, created_at, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `);
        stmt.run(name, description || null);
        const categoryId = this.db.prepare('SELECT last_insert_rowid() as id').get().id;
        return this.getCategory(categoryId);
    }
    getCategory(id) {
        return this.db
            .prepare('SELECT * FROM expense_categories WHERE id = ?')
            .get(id);
    }
    getAllCategories() {
        return this.db
            .prepare('SELECT * FROM expense_categories ORDER BY name ASC')
            .all();
    }
    updateCategory(id, name, description) {
        const category = this.getCategory(id);
        if (!category) {
            throw new errorHandler_1.AppError(404, 'Category not found');
        }
        const updates = [];
        const values = [];
        if (name !== undefined && name !== category.name) {
            updates.push('name = ?');
            values.push(name);
        }
        if (description !== undefined) {
            updates.push('description = ?');
            values.push(description || null);
        }
        if (updates.length === 0) {
            return category;
        }
        updates.push('updated_at = CURRENT_TIMESTAMP');
        values.push(id);
        const query = `UPDATE expense_categories SET ${updates.join(', ')} WHERE id = ?`;
        this.db.prepare(query).run(...values);
        return this.getCategory(id);
    }
    deleteCategory(id) {
        const category = this.getCategory(id);
        if (!category) {
            throw new errorHandler_1.AppError(404, 'Category not found');
        }
        const expenseCount = this.db.prepare('SELECT COUNT(*) as count FROM expenses WHERE category_id = ?').get(id).count;
        if (expenseCount > 0) {
            throw new errorHandler_1.AppError(400, 'Cannot delete category with existing expenses');
        }
        this.db.prepare('DELETE FROM expense_categories WHERE id = ?').run(id);
    }
}
exports.ExpenseService = ExpenseService;
exports.expenseService = new ExpenseService();
//# sourceMappingURL=expenseService.js.map
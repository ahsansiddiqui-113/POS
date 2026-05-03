import { getDatabase } from '../database/db';
import { AppError } from '../middleware/errorHandler';

export interface ExpenseCategory {
  id: number;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface Expense {
  id: number;
  date: string;
  category_id: number;
  amount: number;
  description?: string;
  user_id: number;
  receipt_image_path?: string;
  created_at: string;
  updated_at: string;
}

export class ExpenseService {
  private db = getDatabase();

  // ============ EXPENSE CRUD ============

  createExpense(data: {
    date: string;
    categoryId: number;
    amount: number;
    description?: string;
    userId: number;
    receiptImagePath?: string;
  }): Expense {
    if (data.amount <= 0) {
      throw new AppError(400, 'Expense amount must be greater than 0');
    }

    const stmt = this.db.prepare(`
      INSERT INTO expenses (date, category_id, amount, description, user_id, receipt_image_path, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `);

    stmt.run(
      data.date,
      data.categoryId,
      data.amount,
      data.description || null,
      data.userId,
      data.receiptImagePath || null
    );

    const expenseId = (this.db.prepare('SELECT last_insert_rowid() as id').get() as any).id;
    return this.getExpense(expenseId) as Expense;
  }

  getExpense(id: number): Expense | null {
    return this.db
      .prepare('SELECT * FROM expenses WHERE id = ?')
      .get(id) as Expense | null;
  }

  getExpenses(limit: number = 100, offset: number = 0): Expense[] {
    return this.db
      .prepare('SELECT * FROM expenses ORDER BY date DESC LIMIT ? OFFSET ?')
      .all(limit, offset) as Expense[];
  }

  getExpensesByDateRange(startDate: string, endDate: string): Expense[] {
    return this.db
      .prepare('SELECT * FROM expenses WHERE date BETWEEN ? AND ? ORDER BY date DESC')
      .all(startDate, endDate) as Expense[];
  }

  getExpensesByCategory(categoryId: number, startDate?: string, endDate?: string): Expense[] {
    if (startDate && endDate) {
      return this.db
        .prepare('SELECT * FROM expenses WHERE category_id = ? AND date BETWEEN ? AND ? ORDER BY date DESC')
        .all(categoryId, startDate, endDate) as Expense[];
    }

    return this.db
      .prepare('SELECT * FROM expenses WHERE category_id = ? ORDER BY date DESC')
      .all(categoryId) as Expense[];
  }

  updateExpense(
    id: number,
    data: {
      date?: string;
      categoryId?: number;
      amount?: number;
      description?: string;
      receiptImagePath?: string;
    }
  ): Expense {
    const expense = this.getExpense(id);
    if (!expense) {
      throw new AppError(404, 'Expense not found');
    }

    const updates: string[] = [];
    const values: any[] = [];

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
        throw new AppError(400, 'Expense amount must be greater than 0');
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

    return this.getExpense(id) as Expense;
  }

  deleteExpense(id: number): void {
    const expense = this.getExpense(id);
    if (!expense) {
      throw new AppError(404, 'Expense not found');
    }

    this.db.prepare('DELETE FROM expenses WHERE id = ?').run(id);
  }

  // ============ EXPENSE REPORTING ============

  getMonthlyExpenseBreakdown(year: string, month: string): any {
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
      .all(monthKey) as any[];

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

  getTotalExpensesByCategory(categoryId: number, startDate: string, endDate: string): number {
    const result = this.db
      .prepare('SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE category_id = ? AND date BETWEEN ? AND ?')
      .get(categoryId, startDate, endDate) as { total: number };

    return result.total;
  }

  getTotalExpenses(startDate: string, endDate: string): number {
    const result = this.db
      .prepare('SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE date BETWEEN ? AND ?')
      .get(startDate, endDate) as { total: number };

    return result.total;
  }

  getExpenseReport(startDate: string, endDate: string): any {
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
      .all(startDate, endDate) as any[];

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
      .all(startDate, endDate) as any[];

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

  createCategory(name: string, description?: string): ExpenseCategory {
    const existing = this.db
      .prepare('SELECT id FROM expense_categories WHERE name = ?')
      .get(name);

    if (existing) {
      throw new AppError(409, 'Category already exists');
    }

    const stmt = this.db.prepare(`
      INSERT INTO expense_categories (name, description, created_at, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `);

    stmt.run(name, description || null);

    const categoryId = (this.db.prepare('SELECT last_insert_rowid() as id').get() as any).id;
    return this.getCategory(categoryId) as ExpenseCategory;
  }

  getCategory(id: number): ExpenseCategory | null {
    return this.db
      .prepare('SELECT * FROM expense_categories WHERE id = ?')
      .get(id) as ExpenseCategory | null;
  }

  getAllCategories(): ExpenseCategory[] {
    return this.db
      .prepare('SELECT * FROM expense_categories ORDER BY name ASC')
      .all() as ExpenseCategory[];
  }

  updateCategory(id: number, name?: string, description?: string): ExpenseCategory {
    const category = this.getCategory(id);
    if (!category) {
      throw new AppError(404, 'Category not found');
    }

    const updates: string[] = [];
    const values: any[] = [];

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

    return this.getCategory(id) as ExpenseCategory;
  }

  deleteCategory(id: number): void {
    const category = this.getCategory(id);
    if (!category) {
      throw new AppError(404, 'Category not found');
    }

    const expenseCount = (
      this.db.prepare('SELECT COUNT(*) as count FROM expenses WHERE category_id = ?').get(id) as any
    ).count;

    if (expenseCount > 0) {
      throw new AppError(400, 'Cannot delete category with existing expenses');
    }

    this.db.prepare('DELETE FROM expense_categories WHERE id = ?').run(id);
  }
}

export const expenseService = new ExpenseService();

import { getDatabase } from '../database/db';
import { AppError } from '../middleware/errorHandler';

export interface Category {
  name: string;
  description?: string;
}

export class CategoryService {
  private db = getDatabase();

  private logAudit(
    userId: number,
    action: string,
    oldValue: any = null,
    newValue: any = null
  ): void {
    try {
      this.db
        .prepare(`
          INSERT INTO audit_logs (user_id, action, entity_type, old_value, new_value)
          VALUES (?, ?, ?, ?, ?)
        `)
        .run(
          userId,
          action,
          'category',
          oldValue ? JSON.stringify(oldValue) : null,
          newValue ? JSON.stringify(newValue) : null
        );
    } catch (error) {
      console.error('Failed to log audit trail:', error);
    }
  }

  getCategories(): string[] {
    const result = this.db
      .prepare('SELECT name FROM categories ORDER BY name')
      .all() as { name: string }[];

    return result.map((r) => r.name);
  }

  getCategoryWithCount(): Array<{ name: string; productCount: number }> {
    const result = this.db
      .prepare(
        `SELECT
          c.name,
          COUNT(p.id) as productCount
        FROM categories c
        LEFT JOIN products p ON c.name = p.category
        GROUP BY c.name
        ORDER BY c.name`
      )
      .all() as Array<{ name: string; productCount: number }>;

    return result;
  }

  createCategory(name: string, userId: number = 0): string {
    if (!name || !name.trim()) {
      throw new AppError(400, 'Category name is required');
    }

    const trimmedName = name.trim();

    // Check if category already exists in categories table
    const existing = this.db
      .prepare('SELECT name FROM categories WHERE name = ?')
      .get(trimmedName) as { name: string } | undefined;

    if (existing) {
      throw new AppError(409, 'Category already exists');
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

  renameCategory(oldName: string, newName: string, userId: number = 0): void {
    if (!oldName || !newName) {
      throw new AppError(400, 'Both old and new names are required');
    }

    const newNameTrimmed = newName.trim();

    // Check if new category already exists in categories table
    const existing = this.db
      .prepare('SELECT name FROM categories WHERE name = ?')
      .get(newNameTrimmed) as { name: string } | undefined;

    if (existing && existing.name !== oldName) {
      throw new AppError(409, 'New category name already exists');
    }

    // Update the category name in categories table
    this.db
      .prepare('UPDATE categories SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE name = ?')
      .run(newNameTrimmed, oldName);

    // Update products with old category
    const count = (
      this.db
        .prepare('SELECT COUNT(*) as count FROM products WHERE category = ?')
        .get(oldName) as { count: number }
    ).count;

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

  deleteCategory(name: string, userId: number = 0): void {
    if (!name) {
      throw new AppError(400, 'Category name is required');
    }

    // Check if any products use this category
    const count = (
      this.db
        .prepare('SELECT COUNT(*) as count FROM products WHERE category = ?')
        .get(name) as { count: number }
    ).count;

    if (count > 0) {
      throw new AppError(
        400,
        `Cannot delete category. ${count} product(s) are using this category.`
      );
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

export const categoryService = new CategoryService();

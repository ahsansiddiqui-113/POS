import { getDatabase } from '../database/db';
import bcrypt from 'bcryptjs';
import { AppError } from '../middleware/errorHandler';
import { validateUsername, validatePassword } from '../utils/validators';

export interface User {
  id: number;
  username: string;
  email: string | null;
  role: string;
  active: number;
  created_at: string;
  updated_at: string;
}

export interface UserAuditLog {
  id: number;
  user_id: number;
  action: string;
  entity_type: string;
  entity_id: number;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
  admin_id: number | null;
}

export class UserService {
  private db = getDatabase();

  getAllUsers(): User[] {
    return this.db
      .prepare('SELECT id, username, email, role, active, created_at, updated_at FROM users ORDER BY created_at DESC')
      .all() as User[];
  }

  getUser(userId: number): User | null {
    return this.db
      .prepare('SELECT id, username, email, role, active, created_at, updated_at FROM users WHERE id = ?')
      .get(userId) as User | null;
  }

  updateUser(
    userId: number,
    data: {
      username?: string;
      email?: string;
      role?: string;
      active?: number;
    },
    adminId: number
  ): User {
    const user = this.getUser(userId);
    if (!user) {
      throw new AppError(404, 'User not found');
    }

    const updates: string[] = [];
    const values: any[] = [];

    // Track what changed for audit logging
    const changes: { field: string; oldValue: any; newValue: any }[] = [];

    if (data.username !== undefined && data.username !== user.username) {
      if (!validateUsername(data.username)) {
        throw new AppError(400, 'Invalid username');
      }
      // Check if username already exists
      const existing = this.db
        .prepare('SELECT id FROM users WHERE username = ? AND id != ?')
        .get(data.username);
      if (existing) {
        throw new AppError(409, 'Username already exists');
      }
      updates.push('username = ?');
      values.push(data.username);
      changes.push({ field: 'username', oldValue: user.username, newValue: data.username });
    }

    if (data.email !== undefined && data.email !== user.email) {
      updates.push('email = ?');
      values.push(data.email);
      changes.push({ field: 'email', oldValue: user.email, newValue: data.email });
    }

    if (data.role !== undefined && data.role !== user.role) {
      const validRoles = [
        'Admin',
        'Jewellery',
        'Cosmetics',
        'Purse&Bags',
        'Clothes',
      ];
      if (!validRoles.includes(data.role)) {
        throw new AppError(400, 'Invalid role');
      }
      updates.push('role = ?');
      values.push(data.role);
      changes.push({ field: 'role', oldValue: user.role, newValue: data.role });
    }

    if (data.active !== undefined && data.active !== user.active) {
      updates.push('active = ?');
      values.push(data.active);
      changes.push({ field: 'active', oldValue: user.active, newValue: data.active });
    }

    if (updates.length === 0) {
      return user;
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(userId);

    const query = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;
    this.db.prepare(query).run(...values);

    // Log all changes to audit trail
    for (const change of changes) {
      this.db
        .prepare(`
          INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_value, new_value, admin_id, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
        `)
        .run(
          userId,
          'UPDATE_USER',
          'user',
          userId,
          JSON.stringify({ field: change.field, value: change.oldValue }),
          JSON.stringify({ field: change.field, value: change.newValue }),
          adminId
        );
    }

    return this.getUser(userId) as User;
  }

  changePasswordAsAdmin(
    userId: number,
    newPassword: string,
    adminId: number
  ): User {
    const user = this.getUser(userId);
    if (!user) {
      throw new AppError(404, 'User not found');
    }

    if (!validatePassword(newPassword)) {
      throw new AppError(400, 'Password too short (minimum 6 characters)');
    }

    const newHash = bcrypt.hashSync(newPassword, 10);
    this.db
      .prepare(
        'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
      )
      .run(newHash, userId);

    // Log password change to audit trail
    this.db
      .prepare(`
        INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_value, admin_id, created_at)
        VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
      `)
      .run(
        userId,
        'CHANGE_PASSWORD',
        'user',
        userId,
        JSON.stringify({ username: user.username, changedAt: new Date().toISOString() }),
        adminId
      );

    return this.getUser(userId) as User;
  }

  getUserAuditLogs(userId: number, limit: number = 50): UserAuditLog[] {
    return this.db
      .prepare(`
        SELECT * FROM audit_logs
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT ?
      `)
      .all(userId, limit) as UserAuditLog[];
  }

  getAllAuditLogs(limit: number = 100): UserAuditLog[] {
    return this.db
      .prepare(`
        SELECT * FROM audit_logs
        WHERE entity_type = 'user'
        ORDER BY created_at DESC
        LIMIT ?
      `)
      .all(limit) as UserAuditLog[];
  }
}

export const userService = new UserService();

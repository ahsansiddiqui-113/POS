import { getDatabase } from '../database/db';
import bcrypt from 'bcryptjs';
import { generateToken } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { validateUsername, validatePassword } from '../utils/validators';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: {
    id: number;
    username: string;
    role: string;
  };
}

export interface User {
  id: number;
  username: string;
  email: string | null;
  role: string;
  active: number;
  created_at: string;
  updated_at: string;
}

export class AuthService {
  private db = getDatabase();

  login(request: LoginRequest): LoginResponse {
    if (!validateUsername(request.username)) {
      throw new AppError(400, 'Invalid username');
    }

    if (!validatePassword(request.password)) {
      throw new AppError(400, 'Invalid password');
    }

    const user = this.db
      .prepare(
        'SELECT id, username, password_hash, role, active FROM users WHERE username = ? AND active = 1'
      )
      .get(request.username) as any;

    if (!user) {
      throw new AppError(401, 'Invalid credentials');
    }

    const passwordMatch = bcrypt.compareSync(
      request.password,
      user.password_hash
    );

    if (!passwordMatch) {
      throw new AppError(401, 'Invalid credentials');
    }

    const token = generateToken({
      id: user.id,
      username: user.username,
      role: user.role,
    });

    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
    };
  }

  getUser(userId: number): User | null {
    return this.db
      .prepare('SELECT * FROM users WHERE id = ?')
      .get(userId) as User | null;
  }

  getAllUsers(): User[] {
    return this.db.prepare('SELECT * FROM users ORDER BY created_at DESC').all() as User[];
  }

  createUser(data: {
    username: string;
    email?: string;
    password: string;
    role: string;
  }): User {
    if (!validateUsername(data.username)) {
      throw new AppError(400, 'Invalid username');
    }

    if (!validatePassword(data.password)) {
      throw new AppError(400, 'Password too short (minimum 6 characters)');
    }

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

    const passwordHash = bcrypt.hashSync(data.password, 10);

    try {
      const stmt = this.db.prepare(`
        INSERT INTO users (username, password_hash, email, role, active)
        VALUES (?, ?, ?, ?, 1)
      `);

      stmt.run(data.username, passwordHash, data.email || null, data.role);

      return this.getUser(
        this.db.prepare('SELECT last_insert_rowid() as id').get() as any
      ) as User;
    } catch (error) {
      if ((error as any).message.includes('UNIQUE constraint')) {
        throw new AppError(409, 'Username already exists');
      }
      throw error;
    }
  }

  updateUser(
    userId: number,
    data: {
      email?: string;
      role?: string;
      active?: number;
    }
  ): User {
    const user = this.getUser(userId);
    if (!user) {
      throw new AppError(404, 'User not found');
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (data.email !== undefined) {
      updates.push('email = ?');
      values.push(data.email);
    }

    if (data.role !== undefined) {
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
    }

    if (data.active !== undefined) {
      updates.push('active = ?');
      values.push(data.active);
    }

    if (updates.length === 0) {
      return user;
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(userId);

    const query = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;
    this.db.prepare(query).run(...values);

    return this.getUser(userId) as User;
  }

  changePassword(
    userId: number,
    oldPassword: string,
    newPassword: string
  ): void {
    const user = this.getUser(userId);
    if (!user) {
      throw new AppError(404, 'User not found');
    }

    const userWithHash = this.db
      .prepare('SELECT password_hash FROM users WHERE id = ?')
      .get(userId) as any;

    if (!bcrypt.compareSync(oldPassword, userWithHash.password_hash)) {
      throw new AppError(401, 'Current password is incorrect');
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
    try {
      this.db
        .prepare(`
          INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_value)
          VALUES (?, ?, ?, ?, ?)
        `)
        .run(userId, 'CHANGE_PASSWORD', 'user', userId, JSON.stringify({ username: user.username }));
    } catch (error) {
      console.error('Failed to log password change:', error);
    }
  }
}

export const authService = new AuthService();

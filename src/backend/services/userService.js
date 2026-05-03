"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.userService = exports.UserService = void 0;
const db_1 = require("../database/db");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const errorHandler_1 = require("../middleware/errorHandler");
const validators_1 = require("../utils/validators");
class UserService {
    constructor() {
        this.db = (0, db_1.getDatabase)();
    }
    getAllUsers() {
        return this.db
            .prepare('SELECT id, username, email, role, active, created_at, updated_at FROM users ORDER BY created_at DESC')
            .all();
    }
    getUser(userId) {
        return this.db
            .prepare('SELECT id, username, email, role, active, created_at, updated_at FROM users WHERE id = ?')
            .get(userId);
    }
    updateUser(userId, data, adminId) {
        const user = this.getUser(userId);
        if (!user) {
            throw new errorHandler_1.AppError(404, 'User not found');
        }
        const updates = [];
        const values = [];
        // Track what changed for audit logging
        const changes = [];
        if (data.username !== undefined && data.username !== user.username) {
            if (!(0, validators_1.validateUsername)(data.username)) {
                throw new errorHandler_1.AppError(400, 'Invalid username');
            }
            // Check if username already exists
            const existing = this.db
                .prepare('SELECT id FROM users WHERE username = ? AND id != ?')
                .get(data.username);
            if (existing) {
                throw new errorHandler_1.AppError(409, 'Username already exists');
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
                throw new errorHandler_1.AppError(400, 'Invalid role');
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
                .run(userId, 'UPDATE_USER', 'user', userId, JSON.stringify({ field: change.field, value: change.oldValue }), JSON.stringify({ field: change.field, value: change.newValue }), adminId);
        }
        return this.getUser(userId);
    }
    changePasswordAsAdmin(userId, newPassword, adminId) {
        const user = this.getUser(userId);
        if (!user) {
            throw new errorHandler_1.AppError(404, 'User not found');
        }
        if (!(0, validators_1.validatePassword)(newPassword)) {
            throw new errorHandler_1.AppError(400, 'Password too short (minimum 6 characters)');
        }
        const newHash = bcryptjs_1.default.hashSync(newPassword, 10);
        this.db
            .prepare('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
            .run(newHash, userId);
        // Log password change to audit trail
        this.db
            .prepare(`
        INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_value, admin_id, created_at)
        VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
      `)
            .run(userId, 'CHANGE_PASSWORD', 'user', userId, JSON.stringify({ username: user.username, changedAt: new Date().toISOString() }), adminId);
        return this.getUser(userId);
    }
    getUserAuditLogs(userId, limit = 50) {
        return this.db
            .prepare(`
        SELECT * FROM audit_logs
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT ?
      `)
            .all(userId, limit);
    }
    getAllAuditLogs(limit = 100) {
        return this.db
            .prepare(`
        SELECT * FROM audit_logs
        WHERE entity_type = 'user'
        ORDER BY created_at DESC
        LIMIT ?
      `)
            .all(limit);
    }
}
exports.UserService = UserService;
exports.userService = new UserService();
//# sourceMappingURL=userService.js.map
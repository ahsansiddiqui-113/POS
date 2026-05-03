"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authService = exports.AuthService = void 0;
const db_1 = require("../database/db");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const auth_1 = require("../middleware/auth");
const errorHandler_1 = require("../middleware/errorHandler");
const validators_1 = require("../utils/validators");
class AuthService {
    constructor() {
        this.db = (0, db_1.getDatabase)();
    }
    login(request) {
        if (!(0, validators_1.validateUsername)(request.username)) {
            throw new errorHandler_1.AppError(400, 'Invalid username');
        }
        if (!(0, validators_1.validatePassword)(request.password)) {
            throw new errorHandler_1.AppError(400, 'Invalid password');
        }
        const user = this.db
            .prepare('SELECT id, username, password_hash, role, active FROM users WHERE username = ? AND active = 1')
            .get(request.username);
        if (!user) {
            throw new errorHandler_1.AppError(401, 'Invalid credentials');
        }
        const passwordMatch = bcryptjs_1.default.compareSync(request.password, user.password_hash);
        if (!passwordMatch) {
            throw new errorHandler_1.AppError(401, 'Invalid credentials');
        }
        const token = (0, auth_1.generateToken)({
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
    getUser(userId) {
        return this.db
            .prepare('SELECT * FROM users WHERE id = ?')
            .get(userId);
    }
    getAllUsers() {
        return this.db.prepare('SELECT * FROM users ORDER BY created_at DESC').all();
    }
    createUser(data) {
        if (!(0, validators_1.validateUsername)(data.username)) {
            throw new errorHandler_1.AppError(400, 'Invalid username');
        }
        if (!(0, validators_1.validatePassword)(data.password)) {
            throw new errorHandler_1.AppError(400, 'Password too short (minimum 6 characters)');
        }
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
        const passwordHash = bcryptjs_1.default.hashSync(data.password, 10);
        try {
            const stmt = this.db.prepare(`
        INSERT INTO users (username, password_hash, email, role, active)
        VALUES (?, ?, ?, ?, 1)
      `);
            stmt.run(data.username, passwordHash, data.email || null, data.role);
            return this.getUser(this.db.prepare('SELECT last_insert_rowid() as id').get());
        }
        catch (error) {
            if (error.message.includes('UNIQUE constraint')) {
                throw new errorHandler_1.AppError(409, 'Username already exists');
            }
            throw error;
        }
    }
    updateUser(userId, data) {
        const user = this.getUser(userId);
        if (!user) {
            throw new errorHandler_1.AppError(404, 'User not found');
        }
        const updates = [];
        const values = [];
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
                throw new errorHandler_1.AppError(400, 'Invalid role');
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
        return this.getUser(userId);
    }
    changePassword(userId, oldPassword, newPassword) {
        const user = this.getUser(userId);
        if (!user) {
            throw new errorHandler_1.AppError(404, 'User not found');
        }
        const userWithHash = this.db
            .prepare('SELECT password_hash FROM users WHERE id = ?')
            .get(userId);
        if (!bcryptjs_1.default.compareSync(oldPassword, userWithHash.password_hash)) {
            throw new errorHandler_1.AppError(401, 'Current password is incorrect');
        }
        if (!(0, validators_1.validatePassword)(newPassword)) {
            throw new errorHandler_1.AppError(400, 'Password too short (minimum 6 characters)');
        }
        const newHash = bcryptjs_1.default.hashSync(newPassword, 10);
        this.db
            .prepare('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
            .run(newHash, userId);
        // Log password change to audit trail
        try {
            this.db
                .prepare(`
          INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_value)
          VALUES (?, ?, ?, ?, ?)
        `)
                .run(userId, 'CHANGE_PASSWORD', 'user', userId, JSON.stringify({ username: user.username }));
        }
        catch (error) {
            console.error('Failed to log password change:', error);
        }
    }
}
exports.AuthService = AuthService;
exports.authService = new AuthService();
//# sourceMappingURL=authService.js.map
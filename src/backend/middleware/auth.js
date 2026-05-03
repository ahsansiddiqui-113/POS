"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAdmin = exports.requireRole = exports.authMiddleware = exports.verifyToken = exports.generateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const logger_1 = require("../utils/logger");
// JWT_SECRET MUST be set in environment variables
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    throw new Error('FATAL ERROR: JWT_SECRET environment variable is not set!\n' +
        'Please set JWT_SECRET in your .env file before starting the application.\n' +
        'Example: JWT_SECRET=your-super-secret-key-here-change-in-production');
}
const JWT_EXPIRY = '24h';
function generateToken(user) {
    return jsonwebtoken_1.default.sign(user, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}
exports.generateToken = generateToken;
function verifyToken(token) {
    try {
        return jsonwebtoken_1.default.verify(token, JWT_SECRET);
    }
    catch (error) {
        throw new Error('Invalid or expired token');
    }
}
exports.verifyToken = verifyToken;
function authMiddleware(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({ error: 'Missing or invalid authorization header' });
            return;
        }
        const token = authHeader.substring(7);
        const payload = verifyToken(token);
        req.user = {
            id: payload.id,
            username: payload.username,
            role: payload.role,
        };
        next();
    }
    catch (error) {
        logger_1.logger.error('Auth middleware error:', error);
        res.status(401).json({ error: 'Unauthorized' });
    }
}
exports.authMiddleware = authMiddleware;
function requireRole(...allowedRoles) {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({ error: 'User not authenticated' });
            return;
        }
        if (!allowedRoles.includes(req.user.role)) {
            // Silent permission denial - user gets 403 response without cluttering logs
            res.status(403).json({ error: 'Insufficient permissions' });
            return;
        }
        next();
    };
}
exports.requireRole = requireRole;
function requireAdmin(req, res, next) {
    requireRole('Admin')(req, res, next);
}
exports.requireAdmin = requireAdmin;
//# sourceMappingURL=auth.js.map
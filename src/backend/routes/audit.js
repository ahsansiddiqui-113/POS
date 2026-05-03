"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../database/db");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const db = (0, db_1.getDatabase)();
// Get audit logs (Admin only)
router.get('/logs', auth_1.authMiddleware, (0, auth_1.requireRole)('Admin'), (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const pageSize = parseInt(req.query.pageSize) || 20;
        const action = req.query.action;
        const entityType = req.query.entity_type;
        const userId = req.query.user_id;
        const dateFrom = req.query.date_from;
        const dateTo = req.query.date_to;
        const offset = (page - 1) * pageSize;
        // Build WHERE clause
        const conditions = [];
        const params = [];
        if (action) {
            conditions.push('a.action = ?');
            params.push(action);
        }
        if (entityType) {
            conditions.push('a.entity_type = ?');
            params.push(entityType);
        }
        if (userId) {
            conditions.push('a.user_id = ?');
            params.push(parseInt(userId));
        }
        if (dateFrom) {
            conditions.push('date(a.timestamp) >= date(?)');
            params.push(dateFrom);
        }
        if (dateTo) {
            conditions.push('date(a.timestamp) <= date(?)');
            params.push(dateTo);
        }
        const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
        // Count total records
        const countQuery = `
        SELECT COUNT(*) as total FROM audit_logs a
        ${whereClause}
      `;
        const countResult = db.prepare(countQuery).get(...params);
        const total = countResult.total;
        // Get paginated results with user info
        const dataQuery = `
        SELECT
          a.id,
          a.timestamp,
          a.action,
          a.entity_type,
          a.entity_id,
          a.old_value,
          a.new_value,
          u.id as user_id,
          u.username,
          u.email
        FROM audit_logs a
        LEFT JOIN users u ON a.user_id = u.id
        ${whereClause}
        ORDER BY a.timestamp DESC
        LIMIT ? OFFSET ?
      `;
        const data = db.prepare(dataQuery).all(...params, pageSize, offset);
        // Format response
        const formattedData = data.map((row) => ({
            id: row.id,
            timestamp: row.timestamp,
            action: row.action,
            entity_type: row.entity_type,
            entity_id: row.entity_id,
            old_value: row.old_value ? JSON.parse(row.old_value) : null,
            new_value: row.new_value ? JSON.parse(row.new_value) : null,
            user: {
                id: row.user_id,
                username: row.username,
                email: row.email,
            },
        }));
        res.json({
            data: formattedData,
            total,
            page,
            pageSize,
            pages: Math.ceil(total / pageSize),
        });
    }
    catch (error) {
        console.error('Error fetching audit logs:', error);
        res.status(500).json({ error: 'Failed to fetch audit logs' });
    }
});
exports.default = router;
//# sourceMappingURL=audit.js.map
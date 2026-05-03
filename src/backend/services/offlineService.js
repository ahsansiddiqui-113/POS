"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.offlineService = exports.OfflineService = void 0;
const db_1 = require("../database/db");
const errorHandler_1 = require("../middleware/errorHandler");
class OfflineService {
    constructor() {
        this.db = (0, db_1.getDatabase)();
        this.offlineMode = false;
    }
    // ============ OFFLINE MODE MANAGEMENT ============
    isOfflineMode() {
        return this.offlineMode;
    }
    setOfflineMode(offline) {
        this.offlineMode = offline;
    }
    toggleOfflineMode() {
        this.offlineMode = !this.offlineMode;
        return this.offlineMode;
    }
    // ============ SYNC QUEUE OPERATIONS ============
    enqueueOperation(data) {
        const stmt = this.db.prepare(`
      INSERT INTO sync_queue (operation, entity_type, entity_id, payload, created_at, synced)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, 0)
    `);
        stmt.run(data.operation, data.entityType, data.entityId || null, JSON.stringify(data.payload));
        const queueId = this.db.prepare('SELECT last_insert_rowid() as id').get().id;
        return this.getQueueItem(queueId);
    }
    getQueueItem(id) {
        const item = this.db
            .prepare('SELECT * FROM sync_queue WHERE id = ?')
            .get(id);
        if (!item)
            return null;
        return {
            ...item,
            payload: typeof item.payload === 'string' ? JSON.parse(item.payload) : item.payload,
        };
    }
    getPendingOperations(limit = 1000) {
        const items = this.db
            .prepare('SELECT * FROM sync_queue WHERE synced = 0 ORDER BY created_at ASC LIMIT ?')
            .all(limit);
        return items.map((item) => ({
            ...item,
            payload: typeof item.payload === 'string' ? JSON.parse(item.payload) : item.payload,
        }));
    }
    getSyncHistory(limit = 100, offset = 0) {
        const items = this.db
            .prepare('SELECT * FROM sync_queue WHERE synced = 1 ORDER BY synced_at DESC LIMIT ? OFFSET ?')
            .all(limit, offset);
        return items.map((item) => ({
            ...item,
            payload: typeof item.payload === 'string' ? JSON.parse(item.payload) : item.payload,
        }));
    }
    markAsSynced(queueId) {
        this.db
            .prepare('UPDATE sync_queue SET synced = 1, synced_at = CURRENT_TIMESTAMP WHERE id = ?')
            .run(queueId);
        return this.getQueueItem(queueId);
    }
    markMultipleAsSynced(queueIds) {
        if (queueIds.length === 0)
            return 0;
        const placeholders = queueIds.map(() => '?').join(',');
        const stmt = this.db.prepare(`UPDATE sync_queue SET synced = 1, synced_at = CURRENT_TIMESTAMP WHERE id IN (${placeholders})`);
        const result = stmt.run(...queueIds);
        return result.changes;
    }
    retryFailedOperations() {
        const stmt = this.db.prepare(`
      UPDATE sync_queue SET synced = 0 WHERE synced = 0 AND created_at > datetime('now', '-24 hours')
    `);
        const result = stmt.run();
        return result.changes;
    }
    clearOldSyncHistory(daysOld = 30) {
        const stmt = this.db.prepare(`
      DELETE FROM sync_queue WHERE synced = 1 AND synced_at < datetime('now', '-' || ? || ' days')
    `);
        const result = stmt.run(daysOld);
        return result.changes;
    }
    // ============ QUEUE STATISTICS ============
    getSyncQueueStats() {
        const pending = this.db.prepare('SELECT COUNT(*) as count FROM sync_queue WHERE synced = 0').get().count;
        const synced = this.db.prepare('SELECT COUNT(*) as count FROM sync_queue WHERE synced = 1').get().count;
        const oldestPending = this.db
            .prepare('SELECT created_at FROM sync_queue WHERE synced = 0 ORDER BY created_at ASC LIMIT 1')
            .get();
        const byEntityType = this.db
            .prepare(`
        SELECT entity_type, COUNT(*) as count, SUM(CASE WHEN synced = 0 THEN 1 ELSE 0 END) as pending
        FROM sync_queue
        GROUP BY entity_type
        ORDER BY count DESC
      `)
            .all();
        return {
            total: pending + synced,
            pending,
            synced,
            oldest_pending_at: oldestPending?.created_at || null,
            by_entity_type: byEntityType,
        };
    }
    getQueueSize() {
        return this.db.prepare('SELECT COUNT(*) as count FROM sync_queue WHERE synced = 0').get().count;
    }
    estimateSyncTime() {
        const pending = this.getPendingOperations();
        const avgTimePerOperation = 100; // milliseconds
        return pending.length * avgTimePerOperation;
    }
    // ============ OFFLINE CACHE ============
    cacheProductList() {
        const products = this.db
            .prepare('SELECT id, sku, name, sale_price_per_unit, quantity_available FROM products ORDER BY name ASC')
            .all();
        const cachePayload = {
            type: 'product_list',
            data: products,
            cached_at: new Date().toISOString(),
        };
        this.enqueueOperation({
            operation: 'create',
            entityType: '_cache',
            payload: cachePayload,
        });
    }
    cacheAppSettings() {
        const settings = this.db
            .prepare('SELECT * FROM app_settings')
            .all();
        const paymentMethods = this.db
            .prepare('SELECT id, name FROM payment_methods WHERE active = 1')
            .all();
        const invoiceSettings = this.db
            .prepare('SELECT * FROM invoice_settings LIMIT 1')
            .get();
        const cachePayload = {
            type: 'app_settings',
            settings,
            payment_methods: paymentMethods,
            invoice_settings: invoiceSettings,
            cached_at: new Date().toISOString(),
        };
        this.enqueueOperation({
            operation: 'create',
            entityType: '_cache',
            payload: cachePayload,
        });
    }
    // ============ SALES OFFLINE QUEUEING ============
    queueOfflineSale(saleData) {
        return this.enqueueOperation({
            operation: 'create',
            entityType: 'sale',
            payload: {
                ...saleData,
                offline_mode: true,
                queued_at: new Date().toISOString(),
            },
        });
    }
    getQueuedSales() {
        const items = this.getPendingOperations();
        return items
            .filter((item) => item.entity_type === 'sale')
            .map((item) => ({
            queue_id: item.id,
            ...item.payload,
        }));
    }
    // ============ CONFLICT RESOLUTION ============
    resolveSyncConflict(queueId, resolution) {
        const item = this.getQueueItem(queueId);
        if (!item) {
            throw new errorHandler_1.AppError(404, 'Queue item not found');
        }
        const updatedPayload = {
            ...item.payload,
            conflict_resolution: resolution,
            resolved_at: new Date().toISOString(),
        };
        this.db
            .prepare('UPDATE sync_queue SET payload = ? WHERE id = ?')
            .run(JSON.stringify(updatedPayload), queueId);
        return this.getQueueItem(queueId);
    }
    // ============ SYNC VALIDATION ============
    validateSyncPayload(payload) {
        const errors = [];
        if (!payload.operation)
            errors.push('Operation is required');
        if (!payload.entityType)
            errors.push('Entity type is required');
        if (payload.operation === 'create' || payload.operation === 'update') {
            if (!payload.payload)
                errors.push('Payload is required');
        }
        return {
            valid: errors.length === 0,
            errors,
        };
    }
    // ============ OFFLINE DETECTION ============
    initializeOfflineMode() {
        const pending = this.getPendingOperations();
        if (pending.length > 0) {
            this.setOfflineMode(true);
        }
    }
    // ============ DEBUG & MONITORING ============
    getQueueDebugInfo() {
        const stats = this.getSyncQueueStats();
        const pending = this.getPendingOperations(5);
        const history = this.getSyncHistory(5);
        return {
            offline_mode: this.isOfflineMode(),
            stats,
            recent_pending: pending.map((item) => ({
                id: item.id,
                operation: item.operation,
                entity_type: item.entity_type,
                created_at: item.created_at,
            })),
            recent_synced: history.map((item) => ({
                id: item.id,
                operation: item.operation,
                entity_type: item.entity_type,
                synced_at: item.synced_at,
            })),
        };
    }
    logSyncOperation(status, details) {
        const timestamp = new Date().toISOString();
        console.log(`[SYNC ${status.toUpperCase()}] ${timestamp} - ${details}`);
    }
}
exports.OfflineService = OfflineService;
exports.offlineService = new OfflineService();
//# sourceMappingURL=offlineService.js.map
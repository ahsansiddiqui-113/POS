import { getDatabase } from '../database/db';
import { AppError } from '../middleware/errorHandler';

export interface SyncQueueItem {
  id: number;
  operation: string;
  entity_type: string;
  entity_id?: number;
  payload: any;
  created_at: string;
  synced: number;
  synced_at?: string;
}

export class OfflineService {
  private db = getDatabase();
  private offlineMode: boolean = false;

  // ============ OFFLINE MODE MANAGEMENT ============

  isOfflineMode(): boolean {
    return this.offlineMode;
  }

  setOfflineMode(offline: boolean): void {
    this.offlineMode = offline;
  }

  toggleOfflineMode(): boolean {
    this.offlineMode = !this.offlineMode;
    return this.offlineMode;
  }

  // ============ SYNC QUEUE OPERATIONS ============

  enqueueOperation(data: {
    operation: 'create' | 'update' | 'delete';
    entityType: string;
    entityId?: number;
    payload: any;
  }): SyncQueueItem {
    const stmt = this.db.prepare(`
      INSERT INTO sync_queue (operation, entity_type, entity_id, payload, created_at, synced)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, 0)
    `);

    stmt.run(
      data.operation,
      data.entityType,
      data.entityId || null,
      JSON.stringify(data.payload)
    );

    const queueId = (this.db.prepare('SELECT last_insert_rowid() as id').get() as any).id;
    return this.getQueueItem(queueId) as SyncQueueItem;
  }

  getQueueItem(id: number): SyncQueueItem | null {
    const item = this.db
      .prepare('SELECT * FROM sync_queue WHERE id = ?')
      .get(id) as any;

    if (!item) return null;

    return {
      ...item,
      payload: typeof item.payload === 'string' ? JSON.parse(item.payload) : item.payload,
    };
  }

  getPendingOperations(limit: number = 1000): SyncQueueItem[] {
    const items = this.db
      .prepare('SELECT * FROM sync_queue WHERE synced = 0 ORDER BY created_at ASC LIMIT ?')
      .all(limit) as any[];

    return items.map((item) => ({
      ...item,
      payload: typeof item.payload === 'string' ? JSON.parse(item.payload) : item.payload,
    }));
  }

  getSyncHistory(limit: number = 100, offset: number = 0): SyncQueueItem[] {
    const items = this.db
      .prepare('SELECT * FROM sync_queue WHERE synced = 1 ORDER BY synced_at DESC LIMIT ? OFFSET ?')
      .all(limit, offset) as any[];

    return items.map((item) => ({
      ...item,
      payload: typeof item.payload === 'string' ? JSON.parse(item.payload) : item.payload,
    }));
  }

  markAsSynced(queueId: number): SyncQueueItem {
    this.db
      .prepare('UPDATE sync_queue SET synced = 1, synced_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(queueId);

    return this.getQueueItem(queueId) as SyncQueueItem;
  }

  markMultipleAsSynced(queueIds: number[]): number {
    if (queueIds.length === 0) return 0;

    const placeholders = queueIds.map(() => '?').join(',');
    const stmt = this.db.prepare(
      `UPDATE sync_queue SET synced = 1, synced_at = CURRENT_TIMESTAMP WHERE id IN (${placeholders})`
    );

    const result = stmt.run(...queueIds);
    return result.changes;
  }

  retryFailedOperations(): number {
    const stmt = this.db.prepare(`
      UPDATE sync_queue SET synced = 0 WHERE synced = 0 AND created_at > datetime('now', '-24 hours')
    `);

    const result = stmt.run();
    return result.changes;
  }

  clearOldSyncHistory(daysOld: number = 30): number {
    const stmt = this.db.prepare(`
      DELETE FROM sync_queue WHERE synced = 1 AND synced_at < datetime('now', '-' || ? || ' days')
    `);

    const result = stmt.run(daysOld);
    return result.changes;
  }

  // ============ QUEUE STATISTICS ============

  getSyncQueueStats(): any {
    const pending = (this.db.prepare('SELECT COUNT(*) as count FROM sync_queue WHERE synced = 0').get() as any).count;
    const synced = (this.db.prepare('SELECT COUNT(*) as count FROM sync_queue WHERE synced = 1').get() as any).count;
    const oldestPending = (this.db
      .prepare('SELECT created_at FROM sync_queue WHERE synced = 0 ORDER BY created_at ASC LIMIT 1')
      .get() as any);

    const byEntityType = this.db
      .prepare(`
        SELECT entity_type, COUNT(*) as count, SUM(CASE WHEN synced = 0 THEN 1 ELSE 0 END) as pending
        FROM sync_queue
        GROUP BY entity_type
        ORDER BY count DESC
      `)
      .all() as any[];

    return {
      total: pending + synced,
      pending,
      synced,
      oldest_pending_at: oldestPending?.created_at || null,
      by_entity_type: byEntityType,
    };
  }

  getQueueSize(): number {
    return (this.db.prepare('SELECT COUNT(*) as count FROM sync_queue WHERE synced = 0').get() as any).count;
  }

  estimateSyncTime(): number {
    const pending = this.getPendingOperations();
    const avgTimePerOperation = 100; // milliseconds
    return pending.length * avgTimePerOperation;
  }

  // ============ OFFLINE CACHE ============

  cacheProductList(): void {
    const products = this.db
      .prepare('SELECT id, sku, name, sale_price_per_unit, quantity_available FROM products ORDER BY name ASC')
      .all() as any[];

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

  cacheAppSettings(): void {
    const settings = this.db
      .prepare('SELECT * FROM app_settings')
      .all() as any[];

    const paymentMethods = this.db
      .prepare('SELECT id, name FROM payment_methods WHERE active = 1')
      .all() as any[];

    const invoiceSettings = this.db
      .prepare('SELECT * FROM invoice_settings LIMIT 1')
      .get() as any;

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

  queueOfflineSale(saleData: any): SyncQueueItem {
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

  getQueuedSales(): any[] {
    const items = this.getPendingOperations();
    return items
      .filter((item) => item.entity_type === 'sale')
      .map((item) => ({
        queue_id: item.id,
        ...item.payload,
      }));
  }

  // ============ CONFLICT RESOLUTION ============

  resolveSyncConflict(queueId: number, resolution: 'keep_local' | 'keep_remote'): SyncQueueItem {
    const item = this.getQueueItem(queueId);
    if (!item) {
      throw new AppError(404, 'Queue item not found');
    }

    const updatedPayload = {
      ...item.payload,
      conflict_resolution: resolution,
      resolved_at: new Date().toISOString(),
    };

    this.db
      .prepare('UPDATE sync_queue SET payload = ? WHERE id = ?')
      .run(JSON.stringify(updatedPayload), queueId);

    return this.getQueueItem(queueId) as SyncQueueItem;
  }

  // ============ SYNC VALIDATION ============

  validateSyncPayload(payload: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!payload.operation) errors.push('Operation is required');
    if (!payload.entityType) errors.push('Entity type is required');

    if (payload.operation === 'create' || payload.operation === 'update') {
      if (!payload.payload) errors.push('Payload is required');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  // ============ OFFLINE DETECTION ============

  initializeOfflineMode(): void {
    const pending = this.getPendingOperations();
    if (pending.length > 0) {
      this.setOfflineMode(true);
    }
  }

  // ============ DEBUG & MONITORING ============

  getQueueDebugInfo(): any {
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

  logSyncOperation(status: 'started' | 'completed' | 'failed', details: string): void {
    const timestamp = new Date().toISOString();
    console.log(`[SYNC ${status.toUpperCase()}] ${timestamp} - ${details}`);
  }
}

export const offlineService = new OfflineService();

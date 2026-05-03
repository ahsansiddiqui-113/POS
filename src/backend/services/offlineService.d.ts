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
export declare class OfflineService {
    private db;
    private offlineMode;
    isOfflineMode(): boolean;
    setOfflineMode(offline: boolean): void;
    toggleOfflineMode(): boolean;
    enqueueOperation(data: {
        operation: 'create' | 'update' | 'delete';
        entityType: string;
        entityId?: number;
        payload: any;
    }): SyncQueueItem;
    getQueueItem(id: number): SyncQueueItem | null;
    getPendingOperations(limit?: number): SyncQueueItem[];
    getSyncHistory(limit?: number, offset?: number): SyncQueueItem[];
    markAsSynced(queueId: number): SyncQueueItem;
    markMultipleAsSynced(queueIds: number[]): number;
    retryFailedOperations(): number;
    clearOldSyncHistory(daysOld?: number): number;
    getSyncQueueStats(): any;
    getQueueSize(): number;
    estimateSyncTime(): number;
    cacheProductList(): void;
    cacheAppSettings(): void;
    queueOfflineSale(saleData: any): SyncQueueItem;
    getQueuedSales(): any[];
    resolveSyncConflict(queueId: number, resolution: 'keep_local' | 'keep_remote'): SyncQueueItem;
    validateSyncPayload(payload: any): {
        valid: boolean;
        errors: string[];
    };
    initializeOfflineMode(): void;
    getQueueDebugInfo(): any;
    logSyncOperation(status: 'started' | 'completed' | 'failed', details: string): void;
}
export declare const offlineService: OfflineService;
//# sourceMappingURL=offlineService.d.ts.map
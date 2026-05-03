export interface StockAlert {
    id: number;
    product_id: number;
    alert_type: 'low_stock' | 'expiry_warning';
    triggered_date: string;
    resolved: number;
    resolved_date?: string;
    resolved_by_user_id?: number;
    notes?: string;
}
export interface StockAlertSetting {
    id: number;
    product_id: number;
    low_stock_threshold?: number;
    reorder_quantity?: number;
    reorder_supplier_id?: number;
    created_at: string;
    updated_at: string;
}
export declare class StockAlertService {
    private db;
    getAlertSettings(productId: number): StockAlertSetting | null;
    createAlertSetting(data: {
        productId: number;
        lowStockThreshold?: number;
        reorderQuantity?: number;
        reorderSupplierId?: number;
    }): StockAlertSetting;
    updateAlertSetting(productId: number, data: {
        lowStockThreshold?: number;
        reorderQuantity?: number;
        reorderSupplierId?: number;
    }): StockAlertSetting;
    createStockAlert(productId: number, alertType: 'low_stock' | 'expiry_warning', notes?: string): StockAlert;
    getAlert(id: number): StockAlert | null;
    getAllAlerts(resolved?: number): StockAlert[];
    resolveStockAlert(alertId: number, resolvedByUserId: number, notes?: string): StockAlert;
    checkLowStockProducts(): any[];
    getExpiringProducts(daysUntilExpiry?: number): any[];
    getExpiredProducts(): any[];
    getReorderSuggestions(): any[];
    generateReorderList(categoryFilter?: string): any[];
    getAlertSummary(): any;
    checkAndCreateAlerts(): {
        created: number;
        skipped: number;
    };
}
export declare const stockAlertService: StockAlertService;
//# sourceMappingURL=stockAlertService.d.ts.map
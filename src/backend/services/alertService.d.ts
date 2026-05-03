export interface Alert {
    id: string;
    type: 'expiry' | 'low_stock' | 'out_of_stock' | 'pricing_violation';
    severity: 'high' | 'medium' | 'low';
    title: string;
    message: string;
    productId?: number;
    productName?: string;
    category?: string;
    timestamp: string;
}
export declare class AlertService {
    private db;
    generateAlerts(): Alert[];
    getAlertsByCategory(category: string): Alert[];
    getAlertsBySeverity(severity: 'high' | 'medium' | 'low'): Alert[];
    getHighPriorityAlerts(): Alert[];
    dismissAlert(alertId: string): void;
    private daysUntilDate;
}
export declare const alertService: AlertService;
//# sourceMappingURL=alertService.d.ts.map
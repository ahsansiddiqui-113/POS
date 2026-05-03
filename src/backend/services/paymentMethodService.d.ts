export interface PaymentMethod {
    id: number;
    name: string;
    active: number;
    created_at: string;
    updated_at: string;
}
export interface SalePayment {
    id: number;
    sale_id: number;
    payment_method_id: number;
    amount: number;
    created_at: string;
}
export declare class PaymentMethodService {
    private db;
    createPaymentMethod(name: string): PaymentMethod;
    getPaymentMethod(id: number): PaymentMethod | null;
    getAllPaymentMethods(activeOnly?: boolean): PaymentMethod[];
    updatePaymentMethod(id: number, data: {
        name?: string;
        active?: number;
    }): PaymentMethod;
    processSplitPayment(saleId: number, payments: Array<{
        methodId: number;
        amount: number;
    }>): SalePayment[];
    getSalePayment(id: number): SalePayment | null;
    getSalePayments(saleId: number): any[];
    getPaymentMethodStats(startDate: string, endDate: string): any[];
    getPaymentMethodUsage(startDate: string, endDate: string): any;
    getDailyPaymentBreakdown(startDate: string, endDate: string): any[];
    getPaymentMethodTrends(monthsBack?: number): any[];
}
export declare const paymentMethodService: PaymentMethodService;
//# sourceMappingURL=paymentMethodService.d.ts.map
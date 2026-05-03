export interface SaleItem {
    productId: number;
    quantity: number;
    unitPrice: number;
    discountPercentage?: number;
    discountedPrice?: number;
}
export interface CreateSaleRequest {
    items: SaleItem[];
    payment_method: string;
    total_amount: number;
    userId: number;
}
export interface Sale {
    id: number;
    sale_date: string;
    user_id: number;
    total_amount: number;
    payment_method: string;
    items_count: number;
    created_at: string;
}
export interface SaleWithItems extends Sale {
    items: SaleItem[];
}
export declare class SalesService {
    private db;
    createSale(request: CreateSaleRequest): Sale;
    getSale(id: number): Sale | null;
    getSaleWithItems(id: number): SaleWithItems | null;
    getSalesByDateRange(startDate: string, endDate: string, userId?: number): Sale[];
    getDailySalesTotal(date: string): number;
    getMonthlySalesTotal(month: string): number;
    getSalesCount(startDate?: string, endDate?: string): number;
    getBestSellingProducts(limit?: number): any[];
    getCategoryPerformance(): any[];
}
export declare const salesService: SalesService;
//# sourceMappingURL=salesService.d.ts.map
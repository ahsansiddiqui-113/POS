export interface CreatePurchaseRequest {
    product_id: number;
    quantity: number;
    total_bulk_price: number;
    supplier_id: number;
    expiry_date?: string;
    userId: number;
}
export interface Purchase {
    id: number;
    purchase_date: string;
    user_id: number;
    supplier_id: number;
    product_id: number;
    quantity: number;
    total_bulk_price: number;
    unit_price: number;
    expiry_date: string | null;
    created_at: string;
}
export declare class PurchaseService {
    private db;
    createPurchase(request: CreatePurchaseRequest): Purchase;
    getPurchase(id: number): Purchase | null;
    getPurchasesByProduct(productId: number): Purchase[];
    getPurchasesBySupplier(supplierId: number): Purchase[];
    getPurchasesByDateRange(startDate: string, endDate: string): Purchase[];
    getTotalPurchases(startDate?: string, endDate?: string): number;
    getPurchaseCount(startDate?: string, endDate?: string): number;
    calculateAverageUnitPrice(productId: number): number;
    getAllPurchases(page?: number, pageSize?: number): any;
    getPurchasesFiltered(page?: number, pageSize?: number, filters?: {
        startDate?: string;
        endDate?: string;
        search?: string;
        productId?: number;
        supplierId?: number;
    }): any;
}
export declare const purchaseService: PurchaseService;
//# sourceMappingURL=purchaseService.d.ts.map
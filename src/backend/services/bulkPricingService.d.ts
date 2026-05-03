export interface BulkPrice {
    id: number;
    product_id: number;
    min_quantity: number;
    max_quantity?: number;
    bulk_price: number;
    discount_percentage?: number;
    active: number;
}
export declare class BulkPricingService {
    private db;
    createBulkPrice(data: {
        product_id: number;
        min_quantity: number;
        max_quantity?: number;
        bulk_price: number;
        discount_percentage?: number;
    }): BulkPrice;
    getBulkPrice(id: number): BulkPrice | null;
    getProductBulkPrices(productId: number): BulkPrice[];
    getApplicableBulkPrice(productId: number, quantity: number): BulkPrice | null;
    calculateBulkPrice(productId: number, quantity: number, regularPrice: number): {
        price: number;
        discount: number;
        isBulk: boolean;
    };
    updateBulkPrice(id: number, data: Partial<BulkPrice>): void;
    toggleBulkPrice(id: number, active: boolean): void;
    deleteBulkPrice(id: number): void;
    getWholesaleCustomerStats(): any[];
    getBulkPricingReport(): any[];
}
export declare const bulkPricingService: BulkPricingService;
//# sourceMappingURL=bulkPricingService.d.ts.map
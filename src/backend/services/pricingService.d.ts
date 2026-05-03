export interface PricingValidation {
    isValid: boolean;
    minimumPrice: number;
    error?: string;
}
export interface PricingData {
    productId: number;
    proposedPrice: number;
    quantity: number;
}
export declare class PricingService {
    private db;
    calculateMinimumPrice(purchasePrice: number): number;
    validatePrice(purchasePrice: number, salePrice: number): PricingValidation;
    validateSaleItems(items: Array<{
        productId: number;
        quantity: number;
        unitPrice: number;
        discountPercentage?: number;
        discountedPrice?: number;
    }>): {
        valid: boolean;
        errors: string[];
    };
    logPricingOverride(userId: number, productId: number, originalPrice: number, overridePrice: number, reason: string): void;
    getPriceHistory(productId: number): any[];
    calculateProfit(purchasePrice: number, salePrice: number, quantity: number): number;
    calculateProfitMargin(purchasePrice: number, salePrice: number): number;
}
export declare const pricingService: PricingService;
//# sourceMappingURL=pricingService.d.ts.map
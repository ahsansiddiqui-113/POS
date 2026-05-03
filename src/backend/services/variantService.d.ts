export interface ProductVariant {
    id: number;
    product_id: number;
    size?: string;
    color?: string;
    variant_sku: string;
    quantity_available: number;
    low_stock_threshold: number;
}
export declare class VariantService {
    private db;
    createVariant(data: {
        product_id: number;
        size?: string;
        color?: string;
        variant_sku: string;
        quantity_available: number;
        low_stock_threshold?: number;
    }): ProductVariant;
    getVariant(id: number): ProductVariant | null;
    getVariantBySku(sku: string): ProductVariant | null;
    getProductVariants(productId: number): ProductVariant[];
    updateVariantStock(id: number, quantityChange: number): void;
    updateVariant(id: number, data: Partial<ProductVariant>): void;
    deleteVariant(id: number): void;
    getLowStockVariants(threshold?: number): ProductVariant[];
    getTotalVariantStock(productId: number): number;
    getAvailableSizes(productId: number): string[];
    getAvailableColors(productId: number): string[];
    getVariantBySizeColor(productId: number, size?: string, color?: string): ProductVariant | null;
}
export declare const variantService: VariantService;
//# sourceMappingURL=variantService.d.ts.map
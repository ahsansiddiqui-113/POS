export interface Product {
    id: number;
    sku: string;
    barcode: string;
    name: string;
    category: string;
    sub_category: string | null;
    brand: string | null;
    description: string | null;
    purchase_price_per_unit: number;
    sale_price_per_unit: number;
    quantity_available: number;
    low_stock_threshold: number;
    expiry_date: string | null;
    batch_number: string | null;
    supplier_id: number | null;
    created_at: string;
    updated_at: string;
}
export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    pageSize: number;
    pages: number;
}
export declare class ProductService {
    private db;
    private logAudit;
    getProduct(id: number): Product | null;
    getProductByBarcode(barcode: string): Product | null;
    getProductBySku(sku: string): Product | null;
    searchProducts(query: string, page?: number, pageSize?: number, filters?: {
        category?: string;
        supplier_id?: number;
    }): PaginatedResponse<Product>;
    getAllProducts(page?: number, pageSize?: number, category?: string): PaginatedResponse<Product>;
    createProduct(data: any, userId?: number): Product;
    updateProduct(id: number, data: any, userId?: number): Product;
    updateStock(id: number, quantityChange: number, reason?: string): Product;
    bulkImportProducts(products: any[]): {
        created: number;
        failed: number;
    };
    deleteProduct(id: number, userId?: number): void;
    getCategories(): string[];
    getProductsLowOnStock(threshold?: number): Product[];
    getProductsExpiringWithin(days: number): Product[];
}
export declare const productService: ProductService;
//# sourceMappingURL=productService.d.ts.map
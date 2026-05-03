/// <reference types="node" />
/// <reference types="node" />
export declare class BarcodeService {
    private db;
    private mapFormat;
    generateBarcode(barcodeValue: string, format?: string): Promise<Buffer>;
    generateProductBarcode(productId: number): Promise<Buffer>;
    generateBarcodeWithPrice(barcodeValue: string, price: number, format?: string): Promise<Buffer>;
    validateBarcodeFormat(barcode: string): boolean;
    isBarcodeUnique(barcode: string, excludeProductId?: number): boolean;
    generateUniqueBarcode(prefix?: string): string;
}
export declare const barcodeService: BarcodeService;
//# sourceMappingURL=barcodeService.d.ts.map
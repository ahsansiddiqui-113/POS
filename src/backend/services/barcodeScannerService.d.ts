export interface ScannerConfig {
    enableKeyboardInput: boolean;
    enableUSBInput: boolean;
    scanTimeout: number;
    minimumBarcodeLength: number;
    maximumBarcodeLength: number;
}
export interface ScanResult {
    success: boolean;
    barcode: string;
    product?: any;
    error?: string;
    timestamp: string;
}
export declare class BarcodeScannerService {
    private db;
    private scannerConfig;
    private lastScanTime;
    private currentBuffer;
    getConfig(): ScannerConfig;
    updateConfig(config: Partial<ScannerConfig>): void;
    processScan(barcode: string): ScanResult;
    validateBarcodeFormat(barcode: string): boolean;
    quickLookup(barcode: string): any;
    validateStock(barcode: string, quantity: number): {
        available: boolean;
        reason?: string;
    };
    private logScan;
    getScanHistory(limit?: number): any[];
    testScannerConnection(): {
        connected: boolean;
        message: string;
    };
    getScannerStatus(): {
        status: 'ready' | 'scanning' | 'error';
        mode: 'keyboard' | 'usb' | 'hybrid';
        lastScan: string | null;
        totalScans: number;
    };
    validateMultiple(barcodes: string[]): Array<{
        barcode: string;
        valid: boolean;
        product?: any;
        error?: string;
    }>;
    detectBarcodeFormat(barcode: string): string;
}
export declare const barcodeScannerService: BarcodeScannerService;
//# sourceMappingURL=barcodeScannerService.d.ts.map
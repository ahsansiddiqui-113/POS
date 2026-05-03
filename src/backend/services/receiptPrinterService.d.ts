/// <reference types="node" />
/// <reference types="node" />
export interface PrinterConfig {
    paperWidth: number;
    useThermalPrinter: boolean;
    printerName: string;
    includeBarcode: boolean;
    includeLogo: boolean;
}
export interface ReceiptData {
    saleId: number;
    saleDate: string;
    userId: number;
    totalAmount: number;
    paymentMethod: string;
    items: Array<{
        name: string;
        quantity: number;
        unitPrice: number;
        subtotal: number;
    }>;
}
export declare class ReceiptPrinterService {
    private config;
    getConfig(): PrinterConfig;
    updateConfig(config: Partial<PrinterConfig>): void;
    generateReceiptText(saleData: ReceiptData): string;
    generateESCPOS(saleData: ReceiptData): Buffer;
    private center;
    private leftRight;
    private rightAlign;
    private divider;
    private formatDate;
    private wrapText;
    private ESC;
    private addText;
    printReceipt(saleData: ReceiptData): Promise<{
        success: boolean;
        message: string;
    }>;
    saveReceiptAsFile(saleData: ReceiptData, filePath: string): Promise<boolean>;
    generateHTMLReceipt(saleData: ReceiptData): string;
}
export declare const receiptPrinterService: ReceiptPrinterService;
//# sourceMappingURL=receiptPrinterService.d.ts.map
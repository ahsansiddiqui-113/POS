"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.barcodeScannerService = exports.BarcodeScannerService = void 0;
const db_1 = require("../database/db");
const productService_1 = require("./productService");
const errorHandler_1 = require("../middleware/errorHandler");
class BarcodeScannerService {
    constructor() {
        this.db = (0, db_1.getDatabase)();
        this.scannerConfig = {
            enableKeyboardInput: true,
            enableUSBInput: true,
            scanTimeout: 500,
            minimumBarcodeLength: 3,
            maximumBarcodeLength: 128,
        };
        this.lastScanTime = 0;
        this.currentBuffer = '';
    }
    getConfig() {
        return { ...this.scannerConfig };
    }
    updateConfig(config) {
        this.scannerConfig = { ...this.scannerConfig, ...config };
    }
    // Handle keyboard input barcode scan
    processScan(barcode) {
        const now = Date.now();
        // Check timeout
        if (now - this.lastScanTime > this.scannerConfig.scanTimeout) {
            this.currentBuffer = '';
        }
        this.currentBuffer += barcode;
        this.lastScanTime = now;
        // Validate barcode format
        if (!this.validateBarcodeFormat(this.currentBuffer)) {
            return {
                success: false,
                barcode: this.currentBuffer,
                error: 'Invalid barcode format',
                timestamp: new Date().toISOString(),
            };
        }
        // Look up product
        const product = productService_1.productService.getProductByBarcode(this.currentBuffer);
        if (!product) {
            return {
                success: false,
                barcode: this.currentBuffer,
                error: 'Product not found',
                timestamp: new Date().toISOString(),
            };
        }
        // Log scan
        this.logScan(this.currentBuffer, true, product.id);
        const result = {
            success: true,
            barcode: this.currentBuffer,
            product: {
                id: product.id,
                name: product.name,
                sku: product.sku,
                barcode: product.barcode,
                price: product.sale_price_per_unit,
                quantity: product.quantity_available,
            },
            timestamp: new Date().toISOString(),
        };
        // Reset buffer after successful scan
        this.currentBuffer = '';
        return result;
    }
    // Validate barcode format
    validateBarcodeFormat(barcode) {
        // Check length
        if (barcode.length < this.scannerConfig.minimumBarcodeLength ||
            barcode.length > this.scannerConfig.maximumBarcodeLength) {
            return false;
        }
        // Allow alphanumeric and common special characters
        const barcodeRegex = /^[a-zA-Z0-9\-_\.\s]+$/;
        return barcodeRegex.test(barcode);
    }
    // Quick lookup by barcode
    quickLookup(barcode) {
        const product = productService_1.productService.getProductByBarcode(barcode);
        if (!product) {
            throw new errorHandler_1.AppError(404, 'Product not found');
        }
        return {
            id: product.id,
            name: product.name,
            sku: product.sku,
            category: product.category,
            brand: product.brand,
            purchasePrice: product.purchase_price_per_unit,
            salePrice: product.sale_price_per_unit,
            quantity: product.quantity_available,
            lowStockThreshold: product.low_stock_threshold,
            expiryDate: product.expiry_date,
        };
    }
    // Validate stock availability
    validateStock(barcode, quantity) {
        const product = productService_1.productService.getProductByBarcode(barcode);
        if (!product) {
            return { available: false, reason: 'Product not found' };
        }
        if (product.quantity_available === 0) {
            return { available: false, reason: 'Out of stock' };
        }
        if (product.quantity_available < quantity) {
            return {
                available: false,
                reason: `Only ${product.quantity_available} available`,
            };
        }
        // Check if expiry date is past
        if (product.expiry_date) {
            const expiryDate = new Date(product.expiry_date);
            const today = new Date();
            if (expiryDate < today) {
                return { available: false, reason: 'Product has expired' };
            }
        }
        return { available: true };
    }
    // Log barcode scan for audit trail
    logScan(barcode, success, productId) {
        try {
            this.db
                .prepare(`INSERT INTO audit_logs (action, entity_type, entity_id, new_value, timestamp)
          VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`)
                .run('BARCODE_SCAN', 'product', productId || 0, JSON.stringify({ barcode, success }));
        }
        catch (error) {
            console.error('Failed to log barcode scan:', error);
        }
    }
    // Get scan history
    getScanHistory(limit = 100) {
        return this.db
            .prepare(`SELECT * FROM audit_logs
        WHERE action = 'BARCODE_SCAN'
        ORDER BY timestamp DESC
        LIMIT ?`)
            .all(limit);
    }
    // Test scanner connection (for USB scanners)
    testScannerConnection() {
        // This is a placeholder - actual implementation would depend on
        // the specific USB scanner device being used
        return {
            connected: true,
            message: 'Scanner ready (keyboard input mode)',
        };
    }
    // Get scanner status
    getScannerStatus() {
        const totalScans = this.db
            .prepare('SELECT COUNT(*) as count FROM audit_logs WHERE action = ? LIMIT 1')
            .get('BARCODE_SCAN').count;
        const lastScan = this.db
            .prepare('SELECT timestamp FROM audit_logs WHERE action = ? ORDER BY timestamp DESC LIMIT 1')
            .get('BARCODE_SCAN');
        return {
            status: 'ready',
            mode: 'keyboard',
            lastScan: lastScan?.timestamp || null,
            totalScans,
        };
    }
    // Batch validation for multiple barcodes
    validateMultiple(barcodes) {
        return barcodes.map((barcode) => {
            const product = productService_1.productService.getProductByBarcode(barcode);
            if (!product) {
                return {
                    barcode,
                    valid: false,
                    error: 'Product not found',
                };
            }
            return {
                barcode,
                valid: true,
                product: {
                    id: product.id,
                    name: product.name,
                    sku: product.sku,
                },
            };
        });
    }
    // Detect barcode format (UPC, EAN, Code128, etc.)
    detectBarcodeFormat(barcode) {
        const length = barcode.length;
        if (length === 12 && /^\d+$/.test(barcode)) {
            return 'UPC-A';
        }
        if (length === 13 && /^\d+$/.test(barcode)) {
            return 'EAN-13';
        }
        if (length === 8 && /^\d+$/.test(barcode)) {
            return 'EAN-8';
        }
        if (/^[A-Z0-9\-]{10,}$/.test(barcode)) {
            return 'Code128';
        }
        if (/^[0-9\-]+$/.test(barcode)) {
            return 'Code39';
        }
        return 'Unknown';
    }
}
exports.BarcodeScannerService = BarcodeScannerService;
exports.barcodeScannerService = new BarcodeScannerService();
//# sourceMappingURL=barcodeScannerService.js.map
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.barcodeService = exports.BarcodeService = void 0;
const db_1 = require("../database/db");
const errorHandler_1 = require("../middleware/errorHandler");
const bwip_js_1 = __importDefault(require("bwip-js"));
class BarcodeService {
    constructor() {
        this.db = (0, db_1.getDatabase)();
    }
    // Map user-friendly format names to bwipjs format codes
    mapFormat(format) {
        const formatMap = {
            'code128': 'code128',
            'c128': 'code128',
            'qr': 'qrcode',
            'qrcode': 'qrcode',
            'qr code': 'qrcode',
            'ean13': 'ean13',
            'ean': 'ean13',
        };
        const normalized = format.toLowerCase().trim();
        return formatMap[normalized] || 'code128'; // Default to code128
    }
    async generateBarcode(barcodeValue, format = 'code128') {
        try {
            // Validate barcode value
            if (!barcodeValue || barcodeValue.trim().length === 0) {
                throw new errorHandler_1.AppError(400, 'Barcode value cannot be empty');
            }
            const bcidFormat = this.mapFormat(format);
            const png = await bwip_js_1.default.toBuffer({
                bcid: bcidFormat,
                text: barcodeValue,
                scale: 3,
                height: 10,
                includetext: true,
                textxalign: 'center',
            });
            return png;
        }
        catch (error) {
            const errorMsg = error.message;
            // Don't wrap AppError again
            if (error instanceof errorHandler_1.AppError) {
                throw error;
            }
            throw new errorHandler_1.AppError(400, 'Failed to generate barcode: ' + errorMsg);
        }
    }
    async generateProductBarcode(productId) {
        const product = this.db
            .prepare('SELECT barcode FROM products WHERE id = ?')
            .get(productId);
        if (!product) {
            throw new errorHandler_1.AppError(404, 'Product not found');
        }
        return this.generateBarcode(product.barcode);
    }
    async generateBarcodeWithPrice(barcodeValue, price, format = 'code128') {
        try {
            // For now, just return the barcode without price text
            // The price is shown separately in the frontend
            return await this.generateBarcode(barcodeValue, format);
        }
        catch (error) {
            // Fallback to barcode without price if text addition fails
            console.warn('Failed to generate barcode with price:', error);
            return await this.generateBarcode(barcodeValue, format);
        }
    }
    validateBarcodeFormat(barcode) {
        // Allow any non-empty string as barcode
        return barcode && barcode.length > 0 && barcode.length <= 128;
    }
    isBarcodeUnique(barcode, excludeProductId) {
        let query = 'SELECT COUNT(*) as count FROM products WHERE barcode = ?';
        const params = [barcode];
        if (excludeProductId) {
            query += ' AND id != ?';
            params.push(excludeProductId);
        }
        const result = this.db.prepare(query).get(...params);
        return result.count === 0;
    }
    generateUniqueBarcode(prefix = 'POS') {
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 10000);
        return `${prefix}${timestamp}${random}`;
    }
}
exports.BarcodeService = BarcodeService;
exports.barcodeService = new BarcodeService();
//# sourceMappingURL=barcodeService.js.map
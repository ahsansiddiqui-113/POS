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
    async generateBarcode(barcodeValue, format = 'code128') {
        try {
            const png = await bwip_js_1.default.toBuffer({
                bcid: format,
                text: barcodeValue,
                scale: 3,
                height: 10,
                includetext: true,
                textxalign: 'center',
            });
            return png;
        }
        catch (error) {
            throw new errorHandler_1.AppError(400, 'Failed to generate barcode: ' + error.message);
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
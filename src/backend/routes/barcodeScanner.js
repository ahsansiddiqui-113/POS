"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const errorHandler_1 = require("../middleware/errorHandler");
const barcodeScannerService_1 = require("../services/barcodeScannerService");
const router = (0, express_1.Router)();
router.use(auth_1.authMiddleware);
// Process barcode scan
router.post('/scan', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { barcode } = req.body;
    if (!barcode) {
        res.status(400).json({ error: 'Barcode is required' });
        return;
    }
    const result = barcodeScannerService_1.barcodeScannerService.processScan(barcode);
    res.json(result);
}));
// Quick product lookup by barcode
router.get('/lookup/:barcode', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const product = barcodeScannerService_1.barcodeScannerService.quickLookup(req.params.barcode);
    res.json(product);
}));
// Validate stock availability
router.post('/validate-stock', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { barcode, quantity } = req.body;
    if (!barcode || !quantity) {
        res.status(400).json({ error: 'Barcode and quantity are required' });
        return;
    }
    const validation = barcodeScannerService_1.barcodeScannerService.validateStock(barcode, quantity);
    res.json(validation);
}));
// Get scanner configuration
router.get('/config', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const config = barcodeScannerService_1.barcodeScannerService.getConfig();
    res.json(config);
}));
// Update scanner configuration
router.put('/config', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    barcodeScannerService_1.barcodeScannerService.updateConfig(req.body);
    res.json({ message: 'Configuration updated' });
}));
// Get scanner status
router.get('/status', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const status = barcodeScannerService_1.barcodeScannerService.getScannerStatus();
    res.json(status);
}));
// Test scanner connection
router.post('/test', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const result = barcodeScannerService_1.barcodeScannerService.testScannerConnection();
    res.json(result);
}));
// Get scan history
router.get('/history', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const limit = parseInt(req.query.limit) || 100;
    const history = barcodeScannerService_1.barcodeScannerService.getScanHistory(limit);
    res.json(history);
}));
// Detect barcode format
router.post('/detect-format', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { barcode } = req.body;
    if (!barcode) {
        res.status(400).json({ error: 'Barcode is required' });
        return;
    }
    const format = barcodeScannerService_1.barcodeScannerService.detectBarcodeFormat(barcode);
    res.json({ barcode, format });
}));
// Batch validation
router.post('/validate-batch', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { barcodes } = req.body;
    if (!Array.isArray(barcodes)) {
        res.status(400).json({ error: 'Barcodes array is required' });
        return;
    }
    const results = barcodeScannerService_1.barcodeScannerService.validateMultiple(barcodes);
    res.json(results);
}));
exports.default = router;
//# sourceMappingURL=barcodeScanner.js.map
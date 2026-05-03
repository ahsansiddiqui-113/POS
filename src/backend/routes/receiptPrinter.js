"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const errorHandler_1 = require("../middleware/errorHandler");
const receiptPrinterService_1 = require("../services/receiptPrinterService");
const salesService_1 = require("../services/salesService");
const router = (0, express_1.Router)();
router.use(auth_1.authMiddleware);
// Generate receipt text preview
router.get('/preview/:saleId', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const saleId = parseInt(req.params.saleId);
    const sale = salesService_1.salesService.getSaleWithItems(saleId);
    if (!sale) {
        res.status(404).json({ error: 'Sale not found' });
        return;
    }
    const receiptText = receiptPrinterService_1.receiptPrinterService.generateReceiptText({
        saleId: sale.id,
        saleDate: sale.sale_date,
        userId: sale.user_id,
        totalAmount: sale.total_amount,
        paymentMethod: sale.payment_method,
        items: sale.items.map((item) => ({
            name: '',
            quantity: item.quantity,
            unitPrice: item.unit_price,
            subtotal: item.subtotal,
        })),
    });
    res.setHeader('Content-Type', 'text/plain');
    res.send(receiptText);
}));
// Generate HTML receipt preview
router.get('/html-preview/:saleId', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const saleId = parseInt(req.params.saleId);
    const sale = salesService_1.salesService.getSaleWithItems(saleId);
    if (!sale) {
        res.status(404).json({ error: 'Sale not found' });
        return;
    }
    const htmlReceipt = receiptPrinterService_1.receiptPrinterService.generateHTMLReceipt({
        saleId: sale.id,
        saleDate: sale.sale_date,
        userId: sale.user_id,
        totalAmount: sale.total_amount,
        paymentMethod: sale.payment_method,
        items: sale.items.map((item) => ({
            name: '',
            quantity: item.quantity,
            unitPrice: item.unit_price,
            subtotal: item.subtotal,
        })),
    });
    res.setHeader('Content-Type', 'text/html');
    res.send(htmlReceipt);
}));
// Generate ESC/POS commands for thermal printer
router.get('/escpos/:saleId', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const saleId = parseInt(req.params.saleId);
    const sale = salesService_1.salesService.getSaleWithItems(saleId);
    if (!sale) {
        res.status(404).json({ error: 'Sale not found' });
        return;
    }
    const esposBuffer = receiptPrinterService_1.receiptPrinterService.generateESCPOS({
        saleId: sale.id,
        saleDate: sale.sale_date,
        userId: sale.user_id,
        totalAmount: sale.total_amount,
        paymentMethod: sale.payment_method,
        items: sale.items.map((item) => ({
            name: '',
            quantity: item.quantity,
            unitPrice: item.unit_price,
            subtotal: item.subtotal,
        })),
    });
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="receipt-${saleId}.bin"`);
    res.send(esposBuffer);
}));
// Print receipt to printer
router.post('/print/:saleId', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const saleId = parseInt(req.params.saleId);
    const sale = salesService_1.salesService.getSaleWithItems(saleId);
    if (!sale) {
        res.status(404).json({ error: 'Sale not found' });
        return;
    }
    const result = await receiptPrinterService_1.receiptPrinterService.printReceipt({
        saleId: sale.id,
        saleDate: sale.sale_date,
        userId: sale.user_id,
        totalAmount: sale.total_amount,
        paymentMethod: sale.payment_method,
        items: sale.items.map((item) => ({
            name: '',
            quantity: item.quantity,
            unitPrice: item.unit_price,
            subtotal: item.subtotal,
        })),
    });
    res.json(result);
}));
// Get printer configuration
router.get('/config', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const config = receiptPrinterService_1.receiptPrinterService.getConfig();
    res.json(config);
}));
// Update printer configuration
router.put('/config', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    receiptPrinterService_1.receiptPrinterService.updateConfig(req.body);
    res.json({ message: 'Configuration updated' });
}));
exports.default = router;
//# sourceMappingURL=receiptPrinter.js.map
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startBackend = exports.createApp = exports.app = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const db_1 = require("./database/db");
const logger_1 = require("./utils/logger");
const errorHandler_1 = require("./middleware/errorHandler");
const auth_1 = require("./middleware/auth");
// Initialize database before importing services that depend on it
(0, db_1.initializeDatabase)();
// Now import services after database initialization
const authService_1 = require("./services/authService");
const userService_1 = require("./services/userService");
const productService_1 = require("./services/productService");
const salesService_1 = require("./services/salesService");
const alertService_1 = require("./services/alertService");
const returnsService_1 = require("./services/returnsService");
const purchaseService_1 = require("./services/purchaseService");
const supplierService_1 = require("./services/supplierService");
const barcodeService_1 = require("./services/barcodeService");
const variantService_1 = require("./services/variantService");
const bulkPricingService_1 = require("./services/bulkPricingService");
const expenseService_1 = require("./services/expenseService");
const employeeService_1 = require("./services/employeeService");
const stockAlertService_1 = require("./services/stockAlertService");
const paymentMethodService_1 = require("./services/paymentMethodService");
const invoiceSettingsService_1 = require("./services/invoiceSettingsService");
const offlineService_1 = require("./services/offlineService");
const audit_1 = __importDefault(require("./routes/audit"));
const categories_1 = __importDefault(require("./routes/categories"));
async function createApp() {
    const appInstance = (0, express_1.default)();
    // Middleware
    appInstance.use(express_1.default.json({ limit: '50mb' }));
    appInstance.use(express_1.default.urlencoded({ limit: '50mb', extended: true }));
    appInstance.use((0, cors_1.default)());
    // Health check
    appInstance.get('/health', (req, res) => {
        res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });
    // ======================
    // RATE LIMITING
    // ======================
    // NEW: Rate limiter for login endpoint (5 attempts per minute per IP)
    const loginLimiter = (0, express_rate_limit_1.default)({
        windowMs: 1 * 60 * 1000,
        max: 5,
        message: 'Too many login attempts. Please try again later.',
        standardHeaders: true,
        legacyHeaders: false,
        skip: (req) => {
            // Don't rate limit health check or other non-login requests
            return false;
        },
    });
    // ======================
    // AUTHENTICATION ROUTES
    // ======================
    appInstance.post('/api/auth/login', loginLimiter, // NEW: Apply rate limiter
    (0, errorHandler_1.asyncHandler)(async (req, res) => {
        const result = authService_1.authService.login(req.body);
        res.json(result);
    }));
    appInstance.get('/api/auth/me', auth_1.authMiddleware, (0, errorHandler_1.asyncHandler)(async (req, res) => {
        const user = authService_1.authService.getUser(req.user.id);
        if (user) {
            res.json(user);
        }
        else {
            res.status(404).json({ error: 'User not found' });
        }
    }));
    appInstance.post('/api/auth/change-password', auth_1.authMiddleware, (0, errorHandler_1.asyncHandler)(async (req, res) => {
        const { oldPassword, newPassword } = req.body;
        authService_1.authService.changePassword(req.user.id, oldPassword, newPassword);
        res.json({ message: 'Password changed successfully' });
    }));
    // ======================
    // USER MANAGEMENT ROUTES (Admin only)
    // ======================
    // Get all users
    appInstance.get('/api/users', auth_1.authMiddleware, (0, errorHandler_1.asyncHandler)(async (req, res) => {
        if (req.user.role !== 'Admin') {
            throw new Error('Unauthorized');
        }
        const users = userService_1.userService.getAllUsers();
        res.json(users);
    }));
    // Get single user
    appInstance.get('/api/users/:id', auth_1.authMiddleware, (0, errorHandler_1.asyncHandler)(async (req, res) => {
        if (req.user.role !== 'Admin') {
            throw new Error('Unauthorized');
        }
        const user = userService_1.userService.getUser(parseInt(req.params.id));
        if (user) {
            res.json(user);
        }
        else {
            res.status(404).json({ error: 'User not found' });
        }
    }));
    // Update user
    appInstance.put('/api/users/:id', auth_1.authMiddleware, (0, errorHandler_1.asyncHandler)(async (req, res) => {
        if (req.user.role !== 'Admin') {
            throw new Error('Unauthorized');
        }
        const user = userService_1.userService.updateUser(parseInt(req.params.id), req.body, req.user.id);
        res.json(user);
    }));
    // Change user password (admin changing another user's password)
    appInstance.post('/api/users/:id/change-password', auth_1.authMiddleware, (0, errorHandler_1.asyncHandler)(async (req, res) => {
        if (req.user.role !== 'Admin') {
            throw new Error('Unauthorized');
        }
        const { newPassword } = req.body;
        const user = userService_1.userService.changePasswordAsAdmin(parseInt(req.params.id), newPassword, req.user.id);
        res.json(user);
    }));
    // Get user audit logs
    appInstance.get('/api/users/:id/audit-logs', auth_1.authMiddleware, (0, errorHandler_1.asyncHandler)(async (req, res) => {
        if (req.user.role !== 'Admin') {
            throw new Error('Unauthorized');
        }
        const logs = userService_1.userService.getUserAuditLogs(parseInt(req.params.id));
        res.json(logs);
    }));
    // Get all audit logs
    appInstance.get('/api/audit-logs', auth_1.authMiddleware, (0, errorHandler_1.asyncHandler)(async (req, res) => {
        if (req.user.role !== 'Admin') {
            throw new Error('Unauthorized');
        }
        const logs = userService_1.userService.getAllAuditLogs();
        res.json(logs);
    }));
    // ======================
    // PRODUCTS ROUTES
    // ======================
    appInstance.get('/api/products', (0, errorHandler_1.asyncHandler)(async (req, res) => {
        const page = parseInt(req.query.page) || 1;
        const pageSize = parseInt(req.query.pageSize) || 20;
        const search = req.query.search;
        const category = req.query.category;
        console.log('[API] GET /api/products - page:', page, 'pageSize:', pageSize, 'search:', search, 'category:', category);
        const result = search
            ? productService_1.productService.searchProducts(search, page, pageSize, { category })
            : productService_1.productService.getAllProducts(page, pageSize, category);
        console.log('[API] Response:', { total: result.total, count: result.data?.length, pages: result.pages });
        res.json(result);
    }));
    appInstance.get('/api/products/:id', (0, errorHandler_1.asyncHandler)(async (req, res) => {
        const product = productService_1.productService.getProduct(parseInt(req.params.id));
        if (product) {
            res.json(product);
        }
        else {
            res.status(404).json({ error: 'Product not found' });
        }
    }));
    appInstance.get('/api/products/barcode/:barcode', (0, errorHandler_1.asyncHandler)(async (req, res) => {
        const product = productService_1.productService.getProductByBarcode(req.params.barcode);
        if (product) {
            res.json(product);
        }
        else {
            res.status(404).json({ error: 'Product not found' });
        }
    }));
    appInstance.post('/api/products', auth_1.authMiddleware, (0, errorHandler_1.asyncHandler)(async (req, res) => {
        const userId = req.user?.id || 0;
        const product = productService_1.productService.createProduct(req.body, userId);
        res.status(201).json(product);
    }));
    appInstance.put('/api/products/:id', auth_1.authMiddleware, (0, errorHandler_1.asyncHandler)(async (req, res) => {
        const userId = req.user?.id || 0;
        const product = productService_1.productService.updateProduct(parseInt(req.params.id), req.body, userId);
        res.json(product);
    }));
    appInstance.delete('/api/products/:id', auth_1.authMiddleware, (0, errorHandler_1.asyncHandler)(async (req, res) => {
        const userId = req.user?.id || 0;
        productService_1.productService.deleteProduct(parseInt(req.params.id), userId);
        res.json({ message: 'Product deleted' });
    }));
    appInstance.get('/api/products/categories', (0, errorHandler_1.asyncHandler)(async (req, res) => {
        const categories = productService_1.productService.getCategories();
        res.json(categories);
    }));
    // ======================
    // BARCODE ROUTES
    // ======================
    appInstance.get('/api/barcode/:productId', (0, errorHandler_1.asyncHandler)(async (req, res) => {
        const png = await barcodeService_1.barcodeService.generateProductBarcode(parseInt(req.params.productId));
        res.type('image/png').send(png);
    }));
    appInstance.post('/api/barcode/generate', (0, errorHandler_1.asyncHandler)(async (req, res) => {
        const { value, format } = req.body;
        const png = await barcodeService_1.barcodeService.generateBarcode(value, format);
        res.type('image/png').send(png);
    }));
    // Barcode endpoints (plural for frontend compatibility)
    appInstance.post('/api/barcodes/:productId/generate', (0, errorHandler_1.asyncHandler)(async (req, res) => {
        const productId = parseInt(req.params.productId);
        const { format, includePrice } = req.body;
        const product = productService_1.productService.getProduct(productId);
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }
        if (!product.barcode) {
            return res.status(400).json({ error: 'Product does not have a barcode value' });
        }
        // Convert format to lowercase for bwipjs compatibility
        const barcodeFormat = (format || 'code128').toLowerCase();
        // Generate barcode with or without price
        let png;
        if (includePrice !== false && product.sale_price_per_unit) {
            // Include price by default if available
            png = await barcodeService_1.barcodeService.generateBarcodeWithPrice(product.barcode, product.sale_price_per_unit, barcodeFormat);
        }
        else {
            png = await barcodeService_1.barcodeService.generateBarcode(product.barcode, barcodeFormat);
        }
        const base64 = png.toString('base64');
        const dataUrl = `data:image/png;base64,${base64}`;
        res.json({
            productId,
            productName: product.name,
            barcode: product.barcode,
            price: product.sale_price_per_unit,
            format: barcodeFormat,
            imageUrl: dataUrl,
            generated: true,
        });
    }));
    appInstance.post('/api/barcodes/bulk-generate', (0, errorHandler_1.asyncHandler)(async (req, res) => {
        const { productIds, format } = req.body;
        if (!Array.isArray(productIds) || productIds.length === 0) {
            return res.status(400).json({ error: 'productIds must be a non-empty array' });
        }
        // Convert format to lowercase for bwipjs compatibility
        const barcodeFormat = (format || 'code128').toLowerCase();
        const barcodes = [];
        for (const productId of productIds) {
            try {
                const product = productService_1.productService.getProduct(productId);
                if (product && product.barcode) {
                    const png = await barcodeService_1.barcodeService.generateBarcode(product.barcode, barcodeFormat);
                    const base64 = png.toString('base64');
                    const dataUrl = `data:image/png;base64,${base64}`;
                    barcodes.push({
                        productId,
                        productName: product.name,
                        barcode: product.barcode,
                        format: barcodeFormat,
                        imageUrl: dataUrl,
                        generated: true,
                    });
                }
                else {
                    barcodes.push({
                        productId,
                        generated: false,
                        error: product ? 'Product does not have a barcode value' : 'Product not found',
                    });
                }
            }
            catch (error) {
                barcodes.push({
                    productId,
                    generated: false,
                    error: error.message || 'Failed to generate barcode',
                });
            }
        }
        res.json(barcodes);
    }));
    // Barcode Lookup - scan a barcode to find the product
    appInstance.post('/api/barcodes/scan', auth_1.authMiddleware, (0, errorHandler_1.asyncHandler)(async (req, res) => {
        const { barcode } = req.body;
        if (!barcode || typeof barcode !== 'string') {
            return res.status(400).json({ error: 'Barcode value is required' });
        }
        const product = productService_1.productService.getProductByBarcode(barcode);
        if (!product) {
            return res.status(404).json({ error: 'Product not found for this barcode', barcode });
        }
        res.json({
            found: true,
            product: {
                id: product.id,
                name: product.name,
                sku: product.sku,
                barcode: product.barcode,
                sale_price_per_unit: product.sale_price_per_unit,
                quantity_available: product.quantity_available,
                category: product.category,
            },
        });
    }));
    // ======================
    // SALES ROUTES
    // ======================
    appInstance.post('/api/sales', auth_1.authMiddleware, (0, errorHandler_1.asyncHandler)(async (req, res) => {
        const sale = salesService_1.salesService.createSale({
            ...req.body,
            userId: req.user.id,
        });
        res.status(201).json(sale);
    }));
    appInstance.get('/api/sales/:id', (0, errorHandler_1.asyncHandler)(async (req, res) => {
        const sale = salesService_1.salesService.getSaleWithItems(parseInt(req.params.id));
        if (sale) {
            res.json(sale);
        }
        else {
            res.status(404).json({ error: 'Sale not found' });
        }
    }));
    appInstance.get('/api/sales', (0, errorHandler_1.asyncHandler)(async (req, res) => {
        const startDate = req.query.startDate;
        const endDate = req.query.endDate;
        const userId = req.query.userId
            ? parseInt(req.query.userId)
            : undefined;
        const sales = salesService_1.salesService.getSalesByDateRange(startDate, endDate, userId);
        res.json(sales);
    }));
    appInstance.get('/api/sales-report/daily/:date', (0, errorHandler_1.asyncHandler)(async (req, res) => {
        const total = salesService_1.salesService.getDailySalesTotal(req.params.date);
        res.json({ date: req.params.date, total });
    }));
    // ======================
    // ALERTS ROUTES
    // ======================
    appInstance.get('/api/alerts', (0, errorHandler_1.asyncHandler)(async (req, res) => {
        const alerts = alertService_1.alertService.generateAlerts();
        res.json(alerts);
    }));
    appInstance.get('/api/alerts/high-priority', (0, errorHandler_1.asyncHandler)(async (req, res) => {
        const alerts = alertService_1.alertService.getHighPriorityAlerts();
        res.json(alerts);
    }));
    // ======================
    // RETURNS ROUTES
    // ======================
    appInstance.post('/api/returns', auth_1.authMiddleware, (0, errorHandler_1.asyncHandler)(async (req, res) => {
        const returnRecord = returnsService_1.returnsService.createReturn({
            ...req.body,
            userId: req.user.id,
        });
        res.status(201).json(returnRecord);
    }));
    appInstance.get('/api/returns/:id', (0, errorHandler_1.asyncHandler)(async (req, res) => {
        const returnRecord = returnsService_1.returnsService.getReturn(parseInt(req.params.id));
        if (returnRecord) {
            res.json(returnRecord);
        }
        else {
            res.status(404).json({ error: 'Return not found' });
        }
    }));
    // ======================
    // PURCHASES ROUTES
    // ======================
    appInstance.post('/api/purchases', auth_1.authMiddleware, (0, errorHandler_1.asyncHandler)(async (req, res) => {
        const purchase = purchaseService_1.purchaseService.createPurchase({
            ...req.body,
            userId: req.user.id,
        });
        res.status(201).json(purchase);
    }));
    // NEW: Get all purchases with pagination and filters
    appInstance.get('/api/purchases', (0, errorHandler_1.asyncHandler)(async (req, res) => {
        const page = parseInt(req.query.page) || 1;
        const pageSize = parseInt(req.query.pageSize) || 20;
        const startDate = req.query.startDate;
        const endDate = req.query.endDate;
        const search = req.query.search;
        const productId = req.query.productId ? parseInt(req.query.productId) : undefined;
        const supplierId = req.query.supplierId ? parseInt(req.query.supplierId) : undefined;
        // Use filtered method if any filters are provided
        if (startDate || endDate || search || productId || supplierId) {
            const result = purchaseService_1.purchaseService.getPurchasesFiltered(page, pageSize, {
                startDate,
                endDate,
                search,
                productId,
                supplierId,
            });
            res.json(result);
        }
        else {
            // Get all purchases with pagination
            const result = purchaseService_1.purchaseService.getAllPurchases(page, pageSize);
            res.json(result);
        }
    }));
    appInstance.get('/api/purchases/:id', (0, errorHandler_1.asyncHandler)(async (req, res) => {
        const purchase = purchaseService_1.purchaseService.getPurchase(parseInt(req.params.id));
        if (purchase) {
            res.json(purchase);
        }
        else {
            res.status(404).json({ error: 'Purchase not found' });
        }
    }));
    appInstance.get('/api/purchases/product/:productId', (0, errorHandler_1.asyncHandler)(async (req, res) => {
        const purchases = purchaseService_1.purchaseService.getPurchasesByProduct(parseInt(req.params.productId));
        res.json(purchases);
    }));
    // ======================
    // SUPPLIERS ROUTES
    // ======================
    appInstance.get('/api/suppliers', (0, errorHandler_1.asyncHandler)(async (req, res) => {
        const suppliers = supplierService_1.supplierService.getAllSuppliers();
        res.json(suppliers);
    }));
    appInstance.get('/api/suppliers/:id', (0, errorHandler_1.asyncHandler)(async (req, res) => {
        const supplier = supplierService_1.supplierService.getSupplier(parseInt(req.params.id));
        if (supplier) {
            res.json(supplier);
        }
        else {
            res.status(404).json({ error: 'Supplier not found' });
        }
    }));
    appInstance.post('/api/suppliers', auth_1.authMiddleware, (0, errorHandler_1.asyncHandler)(async (req, res) => {
        const supplier = supplierService_1.supplierService.createSupplier(req.body);
        res.status(201).json(supplier);
    }));
    appInstance.put('/api/suppliers/:id', auth_1.authMiddleware, (0, errorHandler_1.asyncHandler)(async (req, res) => {
        const supplier = supplierService_1.supplierService.updateSupplier(parseInt(req.params.id), req.body);
        res.json(supplier);
    }));
    // ======================
    // REPORTS ROUTES
    // ======================
    // Import report routes
    const reportRoutes = await Promise.resolve().then(() => __importStar(require('./routes/reports'))).then(m => m.default);
    appInstance.use('/api/reports', reportRoutes);
    // ======================
    // BARCODE SCANNER ROUTES
    // ======================
    const barcodeScannerRoutes = await Promise.resolve().then(() => __importStar(require('./routes/barcodeScanner'))).then(m => m.default);
    appInstance.use('/api/barcode-scanner', barcodeScannerRoutes);
    // ======================
    // RECEIPT PRINTER ROUTES
    // ======================
    const receiptPrinterRoutes = await Promise.resolve().then(() => __importStar(require('./routes/receiptPrinter'))).then(m => m.default);
    appInstance.use('/api/receipt-printer', receiptPrinterRoutes);
    // ======================
    // AUDIT LOG ROUTES
    // ======================
    appInstance.use('/api/audit', audit_1.default);
    // ======================
    // CATEGORIES ROUTES
    // ======================
    appInstance.use('/api/categories', categories_1.default);
    // ======================
    // RENTAL ROUTES
    // ======================
    const rentalRoutes = await Promise.resolve().then(() => __importStar(require('./routes/rental'))).then(m => m.default);
    appInstance.use('/api/rental', rentalRoutes);
    const customerRoutes = await Promise.resolve().then(() => __importStar(require('./routes/customers'))).then(m => m.default);
    appInstance.use('/api/rental/customers', customerRoutes);
    // ======================
    // VARIANTS ROUTES
    // ======================
    appInstance.get('/api/products/:productId/variants', (0, errorHandler_1.asyncHandler)(async (req, res) => {
        const variants = variantService_1.variantService.getProductVariants(parseInt(req.params.productId));
        res.json(variants);
    }));
    appInstance.post('/api/variants', auth_1.authMiddleware, (0, errorHandler_1.asyncHandler)(async (req, res) => {
        const variant = variantService_1.variantService.createVariant(req.body);
        res.status(201).json(variant);
    }));
    appInstance.get('/api/variants/:id', (0, errorHandler_1.asyncHandler)(async (req, res) => {
        const variant = variantService_1.variantService.getVariant(parseInt(req.params.id));
        if (variant) {
            res.json(variant);
        }
        else {
            res.status(404).json({ error: 'Variant not found' });
        }
    }));
    appInstance.put('/api/variants/:id', auth_1.authMiddleware, (0, errorHandler_1.asyncHandler)(async (req, res) => {
        variantService_1.variantService.updateVariant(parseInt(req.params.id), req.body);
        res.json({ message: 'Variant updated' });
    }));
    appInstance.delete('/api/variants/:id', auth_1.authMiddleware, (0, errorHandler_1.asyncHandler)(async (req, res) => {
        variantService_1.variantService.deleteVariant(parseInt(req.params.id));
        res.json({ message: 'Variant deleted' });
    }));
    appInstance.get('/api/variants/sku/:sku', (0, errorHandler_1.asyncHandler)(async (req, res) => {
        const variant = variantService_1.variantService.getVariantBySku(req.params.sku);
        if (variant) {
            res.json(variant);
        }
        else {
            res.status(404).json({ error: 'Variant not found' });
        }
    }));
    // ======================
    // BULK PRICING ROUTES
    // ======================
    appInstance.get('/api/bulk-pricing/product/:productId', (0, errorHandler_1.asyncHandler)(async (req, res) => {
        const prices = bulkPricingService_1.bulkPricingService.getProductBulkPrices(parseInt(req.params.productId));
        res.json(prices);
    }));
    appInstance.post('/api/bulk-pricing', auth_1.authMiddleware, (0, errorHandler_1.asyncHandler)(async (req, res) => {
        const price = bulkPricingService_1.bulkPricingService.createBulkPrice(req.body);
        res.status(201).json(price);
    }));
    appInstance.get('/api/bulk-pricing/:id', (0, errorHandler_1.asyncHandler)(async (req, res) => {
        const price = bulkPricingService_1.bulkPricingService.getBulkPrice(parseInt(req.params.id));
        if (price) {
            res.json(price);
        }
        else {
            res.status(404).json({ error: 'Bulk price not found' });
        }
    }));
    appInstance.put('/api/bulk-pricing/:id', auth_1.authMiddleware, (0, errorHandler_1.asyncHandler)(async (req, res) => {
        bulkPricingService_1.bulkPricingService.updateBulkPrice(parseInt(req.params.id), req.body);
        res.json({ message: 'Bulk price updated' });
    }));
    appInstance.delete('/api/bulk-pricing/:id', auth_1.authMiddleware, (0, errorHandler_1.asyncHandler)(async (req, res) => {
        bulkPricingService_1.bulkPricingService.deleteBulkPrice(parseInt(req.params.id));
        res.json({ message: 'Bulk price deleted' });
    }));
    appInstance.get('/api/bulk-pricing/report/all', (0, errorHandler_1.asyncHandler)(async (req, res) => {
        const report = bulkPricingService_1.bulkPricingService.getBulkPricingReport();
        res.json(report);
    }));
    appInstance.get('/api/bulk-pricing/stats/wholesale', (0, errorHandler_1.asyncHandler)(async (req, res) => {
        const stats = bulkPricingService_1.bulkPricingService.getWholesaleCustomerStats();
        res.json(stats);
    }));
    // Legacy endpoints (for compatibility)
    appInstance.get('/api/reports/best-sellers', (0, errorHandler_1.asyncHandler)(async (req, res) => {
        const limit = parseInt(req.query.limit) || 10;
        const products = salesService_1.salesService.getBestSellingProducts(limit);
        res.json(products);
    }));
    appInstance.get('/api/reports/category-performance', (0, errorHandler_1.asyncHandler)(async (req, res) => {
        const categories = salesService_1.salesService.getCategoryPerformance();
        res.json(categories);
    }));
    // ======================
    // EXPENSE TRACKING ROUTES
    // ======================
    appInstance.post('/api/expenses', auth_1.authMiddleware, (0, errorHandler_1.asyncHandler)(async (req, res) => {
        const expense = expenseService_1.expenseService.createExpense({
            date: req.body.date,
            categoryId: req.body.category_id || req.body.categoryId,
            amount: req.body.amount,
            description: req.body.description,
            userId: req.user.id,
            receiptImagePath: req.body.receiptImagePath || req.body.receipt_image_path,
        });
        res.status(201).json(expense);
    }));
    appInstance.get('/api/expenses', auth_1.authMiddleware, (0, errorHandler_1.asyncHandler)(async (req, res) => {
        const limit = parseInt(req.query.limit) || 100;
        const offset = parseInt(req.query.offset) || 0;
        const expenses = expenseService_1.expenseService.getExpenses(limit, offset);
        res.json(expenses);
    }));
    appInstance.get('/api/expenses/:id', auth_1.authMiddleware, (0, errorHandler_1.asyncHandler)(async (req, res) => {
        const expense = expenseService_1.expenseService.getExpense(parseInt(req.params.id));
        if (expense) {
            res.json(expense);
        }
        else {
            res.status(404).json({ error: 'Expense not found' });
        }
    }));
    appInstance.put('/api/expenses/:id', auth_1.authMiddleware, (0, errorHandler_1.asyncHandler)(async (req, res) => {
        const updateData = {};
        if (req.body.date)
            updateData.date = req.body.date;
        if (req.body.category_id || req.body.categoryId)
            updateData.categoryId = req.body.category_id || req.body.categoryId;
        if (req.body.amount)
            updateData.amount = req.body.amount;
        if (req.body.description !== undefined)
            updateData.description = req.body.description;
        if (req.body.receiptImagePath || req.body.receipt_image_path)
            updateData.receiptImagePath = req.body.receiptImagePath || req.body.receipt_image_path;
        const expense = expenseService_1.expenseService.updateExpense(parseInt(req.params.id), updateData);
        res.json(expense);
    }));
    appInstance.delete('/api/expenses/:id', auth_1.authMiddleware, (0, errorHandler_1.asyncHandler)(async (req, res) => {
        if (req.user.role !== 'Admin') {
            throw new Error('Unauthorized');
        }
        expenseService_1.expenseService.deleteExpense(parseInt(req.params.id));
        res.json({ message: 'Expense deleted' });
    }));
    appInstance.get('/api/expenses/report/monthly/:year/:month', auth_1.authMiddleware, (0, errorHandler_1.asyncHandler)(async (req, res) => {
        const report = expenseService_1.expenseService.getMonthlyExpenseBreakdown(req.params.year, req.params.month);
        res.json(report);
    }));
    appInstance.get('/api/expenses/report/range', auth_1.authMiddleware, (0, errorHandler_1.asyncHandler)(async (req, res) => {
        const { startDate, endDate } = req.query;
        const report = expenseService_1.expenseService.getExpenseReport(startDate, endDate);
        res.json(report);
    }));
    // Expense Categories
    appInstance.post('/api/expense-categories', auth_1.authMiddleware, (0, errorHandler_1.asyncHandler)(async (req, res) => {
        const category = expenseService_1.expenseService.createCategory(req.body.name, req.body.description);
        res.status(201).json(category);
    }));
    appInstance.get('/api/expense-categories', (0, errorHandler_1.asyncHandler)(async (req, res) => {
        const categories = expenseService_1.expenseService.getAllCategories();
        res.json(categories);
    }));
    appInstance.put('/api/expense-categories/:id', auth_1.authMiddleware, (0, errorHandler_1.asyncHandler)(async (req, res) => {
        const category = expenseService_1.expenseService.updateCategory(parseInt(req.params.id), req.body.name, req.body.description);
        res.json(category);
    }));
    appInstance.delete('/api/expense-categories/:id', auth_1.authMiddleware, (0, errorHandler_1.asyncHandler)(async (req, res) => {
        if (req.user.role !== 'Admin') {
            throw new Error('Unauthorized');
        }
        expenseService_1.expenseService.deleteCategory(parseInt(req.params.id));
        res.json({ message: 'Category deleted' });
    }));
    // ======================
    // EMPLOYEE MANAGEMENT ROUTES
    // ======================
    appInstance.post('/api/employees', auth_1.authMiddleware, (0, errorHandler_1.asyncHandler)(async (req, res) => {
        if (req.user.role !== 'Admin') {
            throw new Error('Unauthorized');
        }
        const employee = employeeService_1.employeeService.createEmployee({
            userId: req.body.userId || req.body.user_id,
            name: req.body.name || req.body.employee_name,
            hireDate: req.body.hireDate || req.body.hire_date,
            baseSalary: req.body.baseSalary || req.body.base_salary,
            enableCommission: req.body.enableCommission || req.body.enable_commission,
            commissionPercentage: req.body.commissionPercentage || req.body.commission_percentage,
            phone: req.body.phone,
            address: req.body.address,
        });
        res.status(201).json(employee);
    }));
    appInstance.get('/api/employees', auth_1.authMiddleware, (0, errorHandler_1.asyncHandler)(async (req, res) => {
        const employees = employeeService_1.employeeService.getAllEmployees();
        res.json(employees);
    }));
    appInstance.get('/api/employees/:id', auth_1.authMiddleware, (0, errorHandler_1.asyncHandler)(async (req, res) => {
        const employee = employeeService_1.employeeService.getEmployee(parseInt(req.params.id));
        if (employee) {
            res.json(employee);
        }
        else {
            res.status(404).json({ error: 'Employee not found' });
        }
    }));
    appInstance.put('/api/employees/:id', auth_1.authMiddleware, (0, errorHandler_1.asyncHandler)(async (req, res) => {
        if (req.user.role !== 'Admin') {
            throw new Error('Unauthorized');
        }
        const updateData = { ...req.body };
        // Normalize field names
        if (req.body.name || req.body.employee_name)
            updateData.name = req.body.name || req.body.employee_name;
        if (req.body.baseSalary || req.body.base_salary)
            updateData.baseSalary = req.body.baseSalary || req.body.base_salary;
        if (req.body.enableCommission !== undefined || req.body.enable_commission !== undefined)
            updateData.enableCommission = req.body.enableCommission !== undefined ? req.body.enableCommission : req.body.enable_commission;
        if (req.body.commissionPercentage || req.body.commission_percentage)
            updateData.commissionPercentage = req.body.commissionPercentage || req.body.commission_percentage;
        const employee = employeeService_1.employeeService.updateEmployee(parseInt(req.params.id), updateData);
        res.json(employee);
    }));
    // Employee Shifts
    appInstance.post('/api/employees/:id/shifts', auth_1.authMiddleware, (0, errorHandler_1.asyncHandler)(async (req, res) => {
        const shift = employeeService_1.employeeService.recordShift({
            ...req.body,
            employeeId: parseInt(req.params.id),
        });
        res.status(201).json(shift);
    }));
    appInstance.get('/api/employees/:id/shifts', auth_1.authMiddleware, (0, errorHandler_1.asyncHandler)(async (req, res) => {
        const { startDate, endDate } = req.query;
        const shifts = employeeService_1.employeeService.getEmployeeShifts(parseInt(req.params.id), startDate, endDate);
        res.json(shifts);
    }));
    appInstance.put('/api/shifts/:shiftId/status', auth_1.authMiddleware, (0, errorHandler_1.asyncHandler)(async (req, res) => {
        const shift = employeeService_1.employeeService.updateShiftStatus(parseInt(req.params.shiftId), req.body.status);
        res.json(shift);
    }));
    // Employee Attendance
    appInstance.post('/api/employees/:id/attendance', auth_1.authMiddleware, (0, errorHandler_1.asyncHandler)(async (req, res) => {
        const attendance = employeeService_1.employeeService.recordAttendance({
            ...req.body,
            employeeId: parseInt(req.params.id),
            recordedBy: req.user.id,
        });
        res.status(201).json(attendance);
    }));
    appInstance.get('/api/employees/:id/attendance', auth_1.authMiddleware, (0, errorHandler_1.asyncHandler)(async (req, res) => {
        const { startDate, endDate } = req.query;
        const attendance = employeeService_1.employeeService.getEmployeeAttendance(parseInt(req.params.id), startDate, endDate);
        res.json(attendance);
    }));
    // Payroll
    appInstance.get('/api/employees/:id/payroll/:year/:month', auth_1.authMiddleware, (0, errorHandler_1.asyncHandler)(async (req, res) => {
        if (req.user.role !== 'Admin') {
            throw new Error('Unauthorized');
        }
        const payroll = employeeService_1.employeeService.calculatePayableAmount(parseInt(req.params.id), req.params.year, req.params.month);
        res.json(payroll);
    }));
    // Employee Sales Performance
    appInstance.get('/api/employees/:id/performance', auth_1.authMiddleware, (0, errorHandler_1.asyncHandler)(async (req, res) => {
        const { startDate, endDate } = req.query;
        const performance = employeeService_1.employeeService.getEmployeeSalesPerformance(parseInt(req.params.id), startDate, endDate);
        res.json(performance);
    }));
    // ======================
    // PAYMENT METHODS ROUTES
    // ======================
    appInstance.get('/api/payment-methods', (0, errorHandler_1.asyncHandler)(async (req, res) => {
        const methods = paymentMethodService_1.paymentMethodService.getAllPaymentMethods();
        res.json(methods);
    }));
    appInstance.post('/api/payment-methods', auth_1.authMiddleware, (0, errorHandler_1.asyncHandler)(async (req, res) => {
        if (req.user.role !== 'Admin') {
            throw new Error('Unauthorized');
        }
        const method = paymentMethodService_1.paymentMethodService.createPaymentMethod(req.body.name);
        res.status(201).json(method);
    }));
    appInstance.put('/api/payment-methods/:id', auth_1.authMiddleware, (0, errorHandler_1.asyncHandler)(async (req, res) => {
        if (req.user.role !== 'Admin') {
            throw new Error('Unauthorized');
        }
        const method = paymentMethodService_1.paymentMethodService.updatePaymentMethod(parseInt(req.params.id), req.body);
        res.json(method);
    }));
    appInstance.get('/api/payment-methods/stats/usage', auth_1.authMiddleware, (0, errorHandler_1.asyncHandler)(async (req, res) => {
        const { startDate, endDate } = req.query;
        const stats = paymentMethodService_1.paymentMethodService.getPaymentMethodUsage(startDate, endDate);
        res.json(stats);
    }));
    // ======================
    // INVOICE SETTINGS ROUTES
    // ======================
    appInstance.get('/api/invoice-settings', (0, errorHandler_1.asyncHandler)(async (req, res) => {
        const settings = invoiceSettingsService_1.invoiceSettingsService.getInvoiceSettings();
        res.json(settings);
    }));
    appInstance.put('/api/invoice-settings', auth_1.authMiddleware, (0, errorHandler_1.asyncHandler)(async (req, res) => {
        if (req.user.role !== 'Admin') {
            throw new Error('Unauthorized');
        }
        const settings = invoiceSettingsService_1.invoiceSettingsService.updateInvoiceSettings(req.body);
        res.json(settings);
    }));
    appInstance.post('/api/invoice-settings/logo', auth_1.authMiddleware, (0, errorHandler_1.asyncHandler)(async (req, res) => {
        if (req.user.role !== 'Admin') {
            throw new Error('Unauthorized');
        }
        if (!req.body.logoData) {
            throw new Error('Logo data required');
        }
        const logoPath = invoiceSettingsService_1.invoiceSettingsService.uploadLogo(Buffer.from(req.body.logoData, 'base64'), req.body.fileName || 'logo.png');
        res.json({ logoPath });
    }));
    appInstance.delete('/api/invoice-settings/logo', auth_1.authMiddleware, (0, errorHandler_1.asyncHandler)(async (req, res) => {
        if (req.user.role !== 'Admin') {
            throw new Error('Unauthorized');
        }
        const settings = invoiceSettingsService_1.invoiceSettingsService.removeLogo();
        res.json(settings);
    }));
    appInstance.get('/api/invoice/:saleId', auth_1.authMiddleware, (0, errorHandler_1.asyncHandler)(async (req, res) => {
        const html = invoiceSettingsService_1.invoiceSettingsService.generateInvoiceTemplate(parseInt(req.params.saleId));
        res.setHeader('Content-Type', 'text/html');
        res.send(html);
    }));
    // ======================
    // STOCK ALERTS ROUTES
    // ======================
    appInstance.get('/api/stock-alerts', auth_1.authMiddleware, (0, errorHandler_1.asyncHandler)(async (req, res) => {
        const resolved = req.query.resolved !== undefined ? parseInt(req.query.resolved) : undefined;
        const alerts = stockAlertService_1.stockAlertService.getAllAlerts(resolved);
        res.json(alerts);
    }));
    appInstance.get('/api/stock-alerts/low-stock', (0, errorHandler_1.asyncHandler)(async (req, res) => {
        const products = stockAlertService_1.stockAlertService.checkLowStockProducts();
        res.json(products);
    }));
    appInstance.get('/api/stock-alerts/expiring', (0, errorHandler_1.asyncHandler)(async (req, res) => {
        const days = parseInt(req.query.days) || 30;
        const products = stockAlertService_1.stockAlertService.getExpiringProducts(days);
        res.json(products);
    }));
    appInstance.get('/api/stock-alerts/reorder-suggestions', (0, errorHandler_1.asyncHandler)(async (req, res) => {
        const suggestions = stockAlertService_1.stockAlertService.getReorderSuggestions();
        res.json(suggestions);
    }));
    appInstance.get('/api/stock-alerts/summary', (0, errorHandler_1.asyncHandler)(async (req, res) => {
        const summary = stockAlertService_1.stockAlertService.getAlertSummary();
        res.json(summary);
    }));
    appInstance.put('/api/stock-alerts/:id/resolve', auth_1.authMiddleware, (0, errorHandler_1.asyncHandler)(async (req, res) => {
        const alert = stockAlertService_1.stockAlertService.resolveStockAlert(parseInt(req.params.id), req.user.id, req.body.notes);
        res.json(alert);
    }));
    appInstance.post('/api/stock-alert-settings/:productId', auth_1.authMiddleware, (0, errorHandler_1.asyncHandler)(async (req, res) => {
        if (req.user.role !== 'Admin') {
            throw new Error('Unauthorized');
        }
        const setting = stockAlertService_1.stockAlertService.createAlertSetting({
            ...req.body,
            productId: parseInt(req.params.productId),
        });
        res.status(201).json(setting);
    }));
    appInstance.put('/api/stock-alert-settings/:productId', auth_1.authMiddleware, (0, errorHandler_1.asyncHandler)(async (req, res) => {
        if (req.user.role !== 'Admin') {
            throw new Error('Unauthorized');
        }
        const setting = stockAlertService_1.stockAlertService.updateAlertSetting(parseInt(req.params.productId), req.body);
        res.json(setting);
    }));
    // ======================
    // OFFLINE MODE ROUTES
    // ======================
    appInstance.get('/api/offline/status', (0, errorHandler_1.asyncHandler)(async (req, res) => {
        res.json({
            offline_mode: offlineService_1.offlineService.isOfflineMode(),
            pending_operations: offlineService_1.offlineService.getQueueSize(),
            stats: offlineService_1.offlineService.getSyncQueueStats(),
        });
    }));
    appInstance.get('/api/offline/queue', auth_1.authMiddleware, (0, errorHandler_1.asyncHandler)(async (req, res) => {
        const pending = offlineService_1.offlineService.getPendingOperations();
        res.json(pending);
    }));
    appInstance.post('/api/offline/sync', auth_1.authMiddleware, (0, errorHandler_1.asyncHandler)(async (req, res) => {
        const { queueIds } = req.body;
        const count = offlineService_1.offlineService.markMultipleAsSynced(queueIds || []);
        res.json({
            synced: count,
            remaining: offlineService_1.offlineService.getQueueSize(),
        });
    }));
    appInstance.get('/api/offline/debug', auth_1.authMiddleware, (0, errorHandler_1.asyncHandler)(async (req, res) => {
        if (req.user.role !== 'Admin') {
            throw new Error('Unauthorized');
        }
        const debugInfo = offlineService_1.offlineService.getQueueDebugInfo();
        res.json(debugInfo);
    }));
    // ======================
    // DATABASE MANAGEMENT ROUTES (Admin only)
    // ======================
    const databaseRoutes = await Promise.resolve().then(() => __importStar(require('./routes/database'))).then(m => m.default);
    appInstance.use('/api/database', databaseRoutes);
    // ======================
    // ERROR HANDLING
    // ======================
    appInstance.use(errorHandler_1.errorHandler);
    return appInstance;
}
exports.createApp = createApp;
async function startBackend(port = 3000) {
    try {
        logger_1.logger.info('Database initialized');
        // Create and start Express app
        exports.app = await createApp();
        exports.app.listen(port, '0.0.0.0', () => {
            logger_1.logger.info(`Backend server running on http://0.0.0.0:${port} (accessible from any IP)`);
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to start backend:', error);
        throw error;
    }
}
exports.startBackend = startBackend;
exports.default = createApp;
// Start backend if run directly (not imported)
if (require.main === module) {
    const port = process.env.PORT ? parseInt(process.env.PORT) : 3001;
    startBackend(port).catch((error) => {
        logger_1.logger.error('Fatal error:', error);
        process.exit(1);
    });
}
//# sourceMappingURL=index.js.map
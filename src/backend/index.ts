import dotenv from 'dotenv';
dotenv.config();

import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { initializeDatabase } from './database/db';
import { logger } from './utils/logger';
import { errorHandler, asyncHandler } from './middleware/errorHandler';
import { authMiddleware } from './middleware/auth';

// Initialize database before importing services that depend on it
initializeDatabase();

// Now import services after database initialization
import { authService } from './services/authService';
import { userService } from './services/userService';
import { productService } from './services/productService';
import { salesService } from './services/salesService';
import { alertService } from './services/alertService';
import { returnsService } from './services/returnsService';
import { purchaseService } from './services/purchaseService';
import { supplierService } from './services/supplierService';
import { pricingService } from './services/pricingService';
import { barcodeService } from './services/barcodeService';
import { reportService } from './services/reportService';
import { barcodeScannerService } from './services/barcodeScannerService';
import { receiptPrinterService } from './services/receiptPrinterService';
import { rentalService } from './services/rentalService';
import { variantService } from './services/variantService';
import { bulkPricingService } from './services/bulkPricingService';
import { expenseService } from './services/expenseService';
import { employeeService } from './services/employeeService';
import { stockAlertService } from './services/stockAlertService';
import { paymentMethodService } from './services/paymentMethodService';
import { invoiceSettingsService } from './services/invoiceSettingsService';
import { offlineService } from './services/offlineService';
import auditRoutes from './routes/audit';
import categoriesRoutes from './routes/categories';

export let app: Express;

export async function createApp(): Promise<Express> {
  const appInstance = express();

  // Middleware
  appInstance.use(express.json({ limit: '50mb' }));
  appInstance.use(express.urlencoded({ limit: '50mb', extended: true }));
  appInstance.use(cors());

  // Health check
  appInstance.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // ======================
  // RATE LIMITING
  // ======================

  // NEW: Rate limiter for login endpoint (5 attempts per minute per IP)
  const loginLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute window
    max: 5, // Max 5 login attempts per window
    message: 'Too many login attempts. Please try again later.',
    standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    skip: (req: Request) => {
      // Don't rate limit health check or other non-login requests
      return false;
    },
  });

  // ======================
  // AUTHENTICATION ROUTES
  // ======================

  appInstance.post(
    '/api/auth/login',
    loginLimiter, // NEW: Apply rate limiter
    asyncHandler(async (req: Request, res: Response) => {
      const result = authService.login(req.body);
      res.json(result);
    })
  );

  appInstance.get(
    '/api/auth/me',
    authMiddleware,
    asyncHandler(async (req: Request, res: Response) => {
      const user = authService.getUser(req.user!.id);
      if (user) {
        res.json(user);
      } else {
        res.status(404).json({ error: 'User not found' });
      }
    })
  );

  appInstance.post(
    '/api/auth/change-password',
    authMiddleware,
    asyncHandler(async (req: Request, res: Response) => {
      const { oldPassword, newPassword } = req.body;
      authService.changePassword(req.user!.id, oldPassword, newPassword);
      res.json({ message: 'Password changed successfully' });
    })
  );

  // ======================
  // USER MANAGEMENT ROUTES (Admin only)
  // ======================

  // Get all users
  appInstance.get(
    '/api/users',
    authMiddleware,
    asyncHandler(async (req: Request, res: Response) => {
      if (req.user!.role !== 'Admin') {
        throw new Error('Unauthorized');
      }
      const users = userService.getAllUsers();
      res.json(users);
    })
  );

  // Get single user
  appInstance.get(
    '/api/users/:id',
    authMiddleware,
    asyncHandler(async (req: Request, res: Response) => {
      if (req.user!.role !== 'Admin') {
        throw new Error('Unauthorized');
      }
      const user = userService.getUser(parseInt(req.params.id));
      if (user) {
        res.json(user);
      } else {
        res.status(404).json({ error: 'User not found' });
      }
    })
  );

  // Update user
  appInstance.put(
    '/api/users/:id',
    authMiddleware,
    asyncHandler(async (req: Request, res: Response) => {
      if (req.user!.role !== 'Admin') {
        throw new Error('Unauthorized');
      }
      const user = userService.updateUser(
        parseInt(req.params.id),
        req.body,
        req.user!.id
      );
      res.json(user);
    })
  );

  // Change user password (admin changing another user's password)
  appInstance.post(
    '/api/users/:id/change-password',
    authMiddleware,
    asyncHandler(async (req: Request, res: Response) => {
      if (req.user!.role !== 'Admin') {
        throw new Error('Unauthorized');
      }
      const { newPassword } = req.body;
      const user = userService.changePasswordAsAdmin(
        parseInt(req.params.id),
        newPassword,
        req.user!.id
      );
      res.json(user);
    })
  );

  // Get user audit logs
  appInstance.get(
    '/api/users/:id/audit-logs',
    authMiddleware,
    asyncHandler(async (req: Request, res: Response) => {
      if (req.user!.role !== 'Admin') {
        throw new Error('Unauthorized');
      }
      const logs = userService.getUserAuditLogs(parseInt(req.params.id));
      res.json(logs);
    })
  );

  // Get all audit logs
  appInstance.get(
    '/api/audit-logs',
    authMiddleware,
    asyncHandler(async (req: Request, res: Response) => {
      if (req.user!.role !== 'Admin') {
        throw new Error('Unauthorized');
      }
      const logs = userService.getAllAuditLogs();
      res.json(logs);
    })
  );

  // ======================
  // PRODUCTS ROUTES
  // ======================

  appInstance.get(
    '/api/products',
    asyncHandler(async (req: Request, res: Response) => {
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 20;
      const search = req.query.search as string;
      const category = req.query.category as string;

      console.log('[API] GET /api/products - page:', page, 'pageSize:', pageSize, 'search:', search, 'category:', category);

      const result = search
        ? productService.searchProducts(search, page, pageSize, { category })
        : productService.getAllProducts(page, pageSize, category);

      console.log('[API] Response:', { total: result.total, count: result.data?.length, pages: result.pages });

      res.json(result);
    })
  );

  appInstance.get(
    '/api/products/:id',
    asyncHandler(async (req: Request, res: Response) => {
      const product = productService.getProduct(parseInt(req.params.id));
      if (product) {
        res.json(product);
      } else {
        res.status(404).json({ error: 'Product not found' });
      }
    })
  );

  appInstance.get(
    '/api/products/barcode/:barcode',
    asyncHandler(async (req: Request, res: Response) => {
      const product = productService.getProductByBarcode(req.params.barcode);
      if (product) {
        res.json(product);
      } else {
        res.status(404).json({ error: 'Product not found' });
      }
    })
  );

  appInstance.post(
    '/api/products',
    authMiddleware,
    asyncHandler(async (req: Request, res: Response) => {
      const userId = (req as any).user?.id || 0;
      const product = productService.createProduct(req.body, userId);
      res.status(201).json(product);
    })
  );

  appInstance.put(
    '/api/products/:id',
    authMiddleware,
    asyncHandler(async (req: Request, res: Response) => {
      const userId = (req as any).user?.id || 0;
      const product = productService.updateProduct(parseInt(req.params.id), req.body, userId);
      res.json(product);
    })
  );

  appInstance.delete(
    '/api/products/:id',
    authMiddleware,
    asyncHandler(async (req: Request, res: Response) => {
      const userId = (req as any).user?.id || 0;
      productService.deleteProduct(parseInt(req.params.id), userId);
      res.json({ message: 'Product deleted' });
    })
  );

  appInstance.get(
    '/api/products/categories',
    asyncHandler(async (req: Request, res: Response) => {
      const categories = productService.getCategories();
      res.json(categories);
    })
  );

  // ======================
  // BARCODE ROUTES
  // ======================

  appInstance.get(
    '/api/barcode/:productId',
    asyncHandler(async (req: Request, res: Response) => {
      const png = await barcodeService.generateProductBarcode(
        parseInt(req.params.productId)
      );
      res.type('image/png').send(png);
    })
  );

  appInstance.post(
    '/api/barcode/generate',
    asyncHandler(async (req: Request, res: Response) => {
      const { value, format } = req.body;
      const png = await barcodeService.generateBarcode(value, format);
      res.type('image/png').send(png);
    })
  );

  // Barcode endpoints (plural for frontend compatibility)
  appInstance.post(
    '/api/barcodes/:productId/generate',
    asyncHandler(async (req: Request, res: Response) => {
      const productId = parseInt(req.params.productId);
      const { format, includePrice } = req.body;
      const product = productService.getProduct(productId);

      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }

      if (!product.barcode) {
        return res.status(400).json({ error: 'Product does not have a barcode value' });
      }

      // Convert format to lowercase for bwipjs compatibility
      const barcodeFormat = (format || 'code128').toLowerCase();

      // Generate barcode with or without price
      let png: Buffer;
      if (includePrice !== false && product.sale_price_per_unit) {
        // Include price by default if available
        png = await barcodeService.generateBarcodeWithPrice(
          product.barcode,
          product.sale_price_per_unit,
          barcodeFormat
        );
      } else {
        png = await barcodeService.generateBarcode(product.barcode, barcodeFormat);
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
    })
  );

  appInstance.post(
    '/api/barcodes/bulk-generate',
    asyncHandler(async (req: Request, res: Response) => {
      const { productIds, format } = req.body;

      if (!Array.isArray(productIds) || productIds.length === 0) {
        return res.status(400).json({ error: 'productIds must be a non-empty array' });
      }

      // Convert format to lowercase for bwipjs compatibility
      const barcodeFormat = (format || 'code128').toLowerCase();

      const barcodes = [];
      for (const productId of productIds) {
        try {
          const product = productService.getProduct(productId);
          if (product && product.barcode) {
            const png = await barcodeService.generateBarcode(product.barcode, barcodeFormat);
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
          } else {
            barcodes.push({
              productId,
              generated: false,
              error: product ? 'Product does not have a barcode value' : 'Product not found',
            });
          }
        } catch (error) {
          barcodes.push({
            productId,
            generated: false,
            error: (error as Error).message || 'Failed to generate barcode',
          });
        }
      }

      res.json(barcodes);
    })
  );

  // Barcode Lookup - scan a barcode to find the product
  appInstance.post(
    '/api/barcodes/scan',
    authMiddleware,
    asyncHandler(async (req: Request, res: Response) => {
      const { barcode } = req.body;

      if (!barcode || typeof barcode !== 'string') {
        return res.status(400).json({ error: 'Barcode value is required' });
      }

      const product = productService.getProductByBarcode(barcode);

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
    })
  );

  // ======================
  // SALES ROUTES
  // ======================

  appInstance.post(
    '/api/sales',
    authMiddleware,
    asyncHandler(async (req: Request, res: Response) => {
      const sale = salesService.createSale({
        ...req.body,
        userId: req.user!.id,
      });
      res.status(201).json(sale);
    })
  );

  appInstance.get(
    '/api/sales/:id',
    asyncHandler(async (req: Request, res: Response) => {
      const sale = salesService.getSaleWithItems(parseInt(req.params.id));
      if (sale) {
        res.json(sale);
      } else {
        res.status(404).json({ error: 'Sale not found' });
      }
    })
  );

  appInstance.get(
    '/api/sales',
    asyncHandler(async (req: Request, res: Response) => {
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;
      const userId = req.query.userId
        ? parseInt(req.query.userId as string)
        : undefined;

      const sales = salesService.getSalesByDateRange(startDate, endDate, userId);
      res.json(sales);
    })
  );

  appInstance.get(
    '/api/sales-report/daily/:date',
    asyncHandler(async (req: Request, res: Response) => {
      const total = salesService.getDailySalesTotal(req.params.date);
      res.json({ date: req.params.date, total });
    })
  );

  // ======================
  // ALERTS ROUTES
  // ======================

  appInstance.get(
    '/api/alerts',
    asyncHandler(async (req: Request, res: Response) => {
      const alerts = alertService.generateAlerts();
      res.json(alerts);
    })
  );

  appInstance.get(
    '/api/alerts/high-priority',
    asyncHandler(async (req: Request, res: Response) => {
      const alerts = alertService.getHighPriorityAlerts();
      res.json(alerts);
    })
  );

  // ======================
  // RETURNS ROUTES
  // ======================

  appInstance.post(
    '/api/returns',
    authMiddleware,
    asyncHandler(async (req: Request, res: Response) => {
      const returnRecord = returnsService.createReturn({
        ...req.body,
        userId: req.user!.id,
      });
      res.status(201).json(returnRecord);
    })
  );

  appInstance.get(
    '/api/returns/:id',
    asyncHandler(async (req: Request, res: Response) => {
      const returnRecord = returnsService.getReturn(parseInt(req.params.id));
      if (returnRecord) {
        res.json(returnRecord);
      } else {
        res.status(404).json({ error: 'Return not found' });
      }
    })
  );

  // ======================
  // PURCHASES ROUTES
  // ======================

  appInstance.post(
    '/api/purchases',
    authMiddleware,
    asyncHandler(async (req: Request, res: Response) => {
      const purchase = purchaseService.createPurchase({
        ...req.body,
        userId: req.user!.id,
      });
      res.status(201).json(purchase);
    })
  );

  // NEW: Get all purchases with pagination and filters
  appInstance.get(
    '/api/purchases',
    asyncHandler(async (req: Request, res: Response) => {
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 20;
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;
      const search = req.query.search as string;
      const productId = req.query.productId ? parseInt(req.query.productId as string) : undefined;
      const supplierId = req.query.supplierId ? parseInt(req.query.supplierId as string) : undefined;

      // Use filtered method if any filters are provided
      if (startDate || endDate || search || productId || supplierId) {
        const result = purchaseService.getPurchasesFiltered(page, pageSize, {
          startDate,
          endDate,
          search,
          productId,
          supplierId,
        });
        res.json(result);
      } else {
        // Get all purchases with pagination
        const result = purchaseService.getAllPurchases(page, pageSize);
        res.json(result);
      }
    })
  );

  appInstance.get(
    '/api/purchases/:id',
    asyncHandler(async (req: Request, res: Response) => {
      const purchase = purchaseService.getPurchase(parseInt(req.params.id));
      if (purchase) {
        res.json(purchase);
      } else {
        res.status(404).json({ error: 'Purchase not found' });
      }
    })
  );

  appInstance.get(
    '/api/purchases/product/:productId',
    asyncHandler(async (req: Request, res: Response) => {
      const purchases = purchaseService.getPurchasesByProduct(
        parseInt(req.params.productId)
      );
      res.json(purchases);
    })
  );

  // ======================
  // SUPPLIERS ROUTES
  // ======================

  appInstance.get(
    '/api/suppliers',
    asyncHandler(async (req: Request, res: Response) => {
      const suppliers = supplierService.getAllSuppliers();
      res.json(suppliers);
    })
  );

  appInstance.get(
    '/api/suppliers/:id',
    asyncHandler(async (req: Request, res: Response) => {
      const supplier = supplierService.getSupplier(parseInt(req.params.id));
      if (supplier) {
        res.json(supplier);
      } else {
        res.status(404).json({ error: 'Supplier not found' });
      }
    })
  );

  appInstance.post(
    '/api/suppliers',
    authMiddleware,
    asyncHandler(async (req: Request, res: Response) => {
      const supplier = supplierService.createSupplier(req.body);
      res.status(201).json(supplier);
    })
  );

  appInstance.put(
    '/api/suppliers/:id',
    authMiddleware,
    asyncHandler(async (req: Request, res: Response) => {
      const supplier = supplierService.updateSupplier(parseInt(req.params.id), req.body);
      res.json(supplier);
    })
  );

  // ======================
  // REPORTS ROUTES
  // ======================

  // Import report routes
  const reportRoutes = await import('./routes/reports').then(m => m.default);
  appInstance.use('/api/reports', reportRoutes);

  // ======================
  // BARCODE SCANNER ROUTES
  // ======================

  const barcodeScannerRoutes = await import('./routes/barcodeScanner').then(m => m.default);
  appInstance.use('/api/barcode-scanner', barcodeScannerRoutes);

  // ======================
  // RECEIPT PRINTER ROUTES
  // ======================

  const receiptPrinterRoutes = await import('./routes/receiptPrinter').then(m => m.default);
  appInstance.use('/api/receipt-printer', receiptPrinterRoutes);

  // ======================
  // AUDIT LOG ROUTES
  // ======================

  appInstance.use('/api/audit', auditRoutes);

  // ======================
  // CATEGORIES ROUTES
  // ======================

  appInstance.use('/api/categories', categoriesRoutes);

  // ======================
  // RENTAL ROUTES
  // ======================

  const rentalRoutes = await import('./routes/rental').then(m => m.default);
  appInstance.use('/api/rental', rentalRoutes);

  const customerRoutes = await import('./routes/customers').then(m => m.default);
  appInstance.use('/api/rental/customers', customerRoutes);

  // ======================
  // VARIANTS ROUTES
  // ======================

  appInstance.get(
    '/api/products/:productId/variants',
    asyncHandler(async (req: Request, res: Response) => {
      const variants = variantService.getProductVariants(parseInt(req.params.productId));
      res.json(variants);
    })
  );

  appInstance.post(
    '/api/variants',
    authMiddleware,
    asyncHandler(async (req: Request, res: Response) => {
      const variant = variantService.createVariant(req.body);
      res.status(201).json(variant);
    })
  );

  appInstance.get(
    '/api/variants/:id',
    asyncHandler(async (req: Request, res: Response) => {
      const variant = variantService.getVariant(parseInt(req.params.id));
      if (variant) {
        res.json(variant);
      } else {
        res.status(404).json({ error: 'Variant not found' });
      }
    })
  );

  appInstance.put(
    '/api/variants/:id',
    authMiddleware,
    asyncHandler(async (req: Request, res: Response) => {
      variantService.updateVariant(parseInt(req.params.id), req.body);
      res.json({ message: 'Variant updated' });
    })
  );

  appInstance.delete(
    '/api/variants/:id',
    authMiddleware,
    asyncHandler(async (req: Request, res: Response) => {
      variantService.deleteVariant(parseInt(req.params.id));
      res.json({ message: 'Variant deleted' });
    })
  );

  appInstance.get(
    '/api/variants/sku/:sku',
    asyncHandler(async (req: Request, res: Response) => {
      const variant = variantService.getVariantBySku(req.params.sku);
      if (variant) {
        res.json(variant);
      } else {
        res.status(404).json({ error: 'Variant not found' });
      }
    })
  );

  // ======================
  // BULK PRICING ROUTES
  // ======================

  appInstance.get(
    '/api/bulk-pricing/product/:productId',
    asyncHandler(async (req: Request, res: Response) => {
      const prices = bulkPricingService.getProductBulkPrices(parseInt(req.params.productId));
      res.json(prices);
    })
  );

  appInstance.post(
    '/api/bulk-pricing',
    authMiddleware,
    asyncHandler(async (req: Request, res: Response) => {
      const price = bulkPricingService.createBulkPrice(req.body);
      res.status(201).json(price);
    })
  );

  appInstance.get(
    '/api/bulk-pricing/:id',
    asyncHandler(async (req: Request, res: Response) => {
      const price = bulkPricingService.getBulkPrice(parseInt(req.params.id));
      if (price) {
        res.json(price);
      } else {
        res.status(404).json({ error: 'Bulk price not found' });
      }
    })
  );

  appInstance.put(
    '/api/bulk-pricing/:id',
    authMiddleware,
    asyncHandler(async (req: Request, res: Response) => {
      bulkPricingService.updateBulkPrice(parseInt(req.params.id), req.body);
      res.json({ message: 'Bulk price updated' });
    })
  );

  appInstance.delete(
    '/api/bulk-pricing/:id',
    authMiddleware,
    asyncHandler(async (req: Request, res: Response) => {
      bulkPricingService.deleteBulkPrice(parseInt(req.params.id));
      res.json({ message: 'Bulk price deleted' });
    })
  );

  appInstance.get(
    '/api/bulk-pricing/report/all',
    asyncHandler(async (req: Request, res: Response) => {
      const report = bulkPricingService.getBulkPricingReport();
      res.json(report);
    })
  );

  appInstance.get(
    '/api/bulk-pricing/stats/wholesale',
    asyncHandler(async (req: Request, res: Response) => {
      const stats = bulkPricingService.getWholesaleCustomerStats();
      res.json(stats);
    })
  );

  // Legacy endpoints (for compatibility)
  appInstance.get(
    '/api/reports/best-sellers',
    asyncHandler(async (req: Request, res: Response) => {
      const limit = parseInt(req.query.limit as string) || 10;
      const products = salesService.getBestSellingProducts(limit);
      res.json(products);
    })
  );

  appInstance.get(
    '/api/reports/category-performance',
    asyncHandler(async (req: Request, res: Response) => {
      const categories = salesService.getCategoryPerformance();
      res.json(categories);
    })
  );

  // ======================
  // EXPENSE TRACKING ROUTES
  // ======================

  appInstance.post(
    '/api/expenses',
    authMiddleware,
    asyncHandler(async (req: Request, res: Response) => {
      const expense = expenseService.createExpense({
        date: req.body.date,
        categoryId: req.body.category_id || req.body.categoryId,
        amount: req.body.amount,
        description: req.body.description,
        userId: req.user!.id,
        receiptImagePath: req.body.receiptImagePath || req.body.receipt_image_path,
      });
      res.status(201).json(expense);
    })
  );

  appInstance.get(
    '/api/expenses',
    authMiddleware,
    asyncHandler(async (req: Request, res: Response) => {
      const limit = parseInt(req.query.limit as string) || 100;
      const offset = parseInt(req.query.offset as string) || 0;
      const expenses = expenseService.getExpenses(limit, offset);
      res.json(expenses);
    })
  );

  appInstance.get(
    '/api/expenses/:id',
    authMiddleware,
    asyncHandler(async (req: Request, res: Response) => {
      const expense = expenseService.getExpense(parseInt(req.params.id));
      if (expense) {
        res.json(expense);
      } else {
        res.status(404).json({ error: 'Expense not found' });
      }
    })
  );

  appInstance.put(
    '/api/expenses/:id',
    authMiddleware,
    asyncHandler(async (req: Request, res: Response) => {
      const updateData: any = {};
      if (req.body.date) updateData.date = req.body.date;
      if (req.body.category_id || req.body.categoryId) updateData.categoryId = req.body.category_id || req.body.categoryId;
      if (req.body.amount) updateData.amount = req.body.amount;
      if (req.body.description !== undefined) updateData.description = req.body.description;
      if (req.body.receiptImagePath || req.body.receipt_image_path) updateData.receiptImagePath = req.body.receiptImagePath || req.body.receipt_image_path;

      const expense = expenseService.updateExpense(parseInt(req.params.id), updateData);
      res.json(expense);
    })
  );

  appInstance.delete(
    '/api/expenses/:id',
    authMiddleware,
    asyncHandler(async (req: Request, res: Response) => {
      if (req.user!.role !== 'Admin') {
        throw new Error('Unauthorized');
      }
      expenseService.deleteExpense(parseInt(req.params.id));
      res.json({ message: 'Expense deleted' });
    })
  );

  appInstance.get(
    '/api/expenses/report/monthly/:year/:month',
    authMiddleware,
    asyncHandler(async (req: Request, res: Response) => {
      const report = expenseService.getMonthlyExpenseBreakdown(req.params.year, req.params.month);
      res.json(report);
    })
  );

  appInstance.get(
    '/api/expenses/report/range',
    authMiddleware,
    asyncHandler(async (req: Request, res: Response) => {
      const { startDate, endDate } = req.query;
      const report = expenseService.getExpenseReport(startDate as string, endDate as string);
      res.json(report);
    })
  );

  // Expense Categories
  appInstance.post(
    '/api/expense-categories',
    authMiddleware,
    asyncHandler(async (req: Request, res: Response) => {
      const category = expenseService.createCategory(req.body.name, req.body.description);
      res.status(201).json(category);
    })
  );

  appInstance.get(
    '/api/expense-categories',
    asyncHandler(async (req: Request, res: Response) => {
      const categories = expenseService.getAllCategories();
      res.json(categories);
    })
  );

  appInstance.put(
    '/api/expense-categories/:id',
    authMiddleware,
    asyncHandler(async (req: Request, res: Response) => {
      const category = expenseService.updateCategory(parseInt(req.params.id), req.body.name, req.body.description);
      res.json(category);
    })
  );

  appInstance.delete(
    '/api/expense-categories/:id',
    authMiddleware,
    asyncHandler(async (req: Request, res: Response) => {
      if (req.user!.role !== 'Admin') {
        throw new Error('Unauthorized');
      }
      expenseService.deleteCategory(parseInt(req.params.id));
      res.json({ message: 'Category deleted' });
    })
  );

  // ======================
  // EMPLOYEE MANAGEMENT ROUTES
  // ======================

  appInstance.post(
    '/api/employees',
    authMiddleware,
    asyncHandler(async (req: Request, res: Response) => {
      if (req.user!.role !== 'Admin') {
        throw new Error('Unauthorized');
      }
      const employee = employeeService.createEmployee({
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
    })
  );

  appInstance.get(
    '/api/employees',
    authMiddleware,
    asyncHandler(async (req: Request, res: Response) => {
      const employees = employeeService.getAllEmployees();
      res.json(employees);
    })
  );

  appInstance.get(
    '/api/employees/:id',
    authMiddleware,
    asyncHandler(async (req: Request, res: Response) => {
      const employee = employeeService.getEmployee(parseInt(req.params.id));
      if (employee) {
        res.json(employee);
      } else {
        res.status(404).json({ error: 'Employee not found' });
      }
    })
  );

  appInstance.put(
    '/api/employees/:id',
    authMiddleware,
    asyncHandler(async (req: Request, res: Response) => {
      if (req.user!.role !== 'Admin') {
        throw new Error('Unauthorized');
      }
      const updateData: any = { ...req.body };
      // Normalize field names
      if (req.body.name || req.body.employee_name) updateData.name = req.body.name || req.body.employee_name;
      if (req.body.baseSalary || req.body.base_salary) updateData.baseSalary = req.body.baseSalary || req.body.base_salary;
      if (req.body.enableCommission !== undefined || req.body.enable_commission !== undefined) updateData.enableCommission = req.body.enableCommission !== undefined ? req.body.enableCommission : req.body.enable_commission;
      if (req.body.commissionPercentage || req.body.commission_percentage) updateData.commissionPercentage = req.body.commissionPercentage || req.body.commission_percentage;

      const employee = employeeService.updateEmployee(parseInt(req.params.id), updateData);
      res.json(employee);
    })
  );

  // Employee Shifts
  appInstance.post(
    '/api/employees/:id/shifts',
    authMiddleware,
    asyncHandler(async (req: Request, res: Response) => {
      const shift = employeeService.recordShift({
        ...req.body,
        employeeId: parseInt(req.params.id),
      });
      res.status(201).json(shift);
    })
  );

  appInstance.get(
    '/api/employees/:id/shifts',
    authMiddleware,
    asyncHandler(async (req: Request, res: Response) => {
      const { startDate, endDate } = req.query;
      const shifts = employeeService.getEmployeeShifts(
        parseInt(req.params.id),
        startDate as string,
        endDate as string
      );
      res.json(shifts);
    })
  );

  appInstance.put(
    '/api/shifts/:shiftId/status',
    authMiddleware,
    asyncHandler(async (req: Request, res: Response) => {
      const shift = employeeService.updateShiftStatus(parseInt(req.params.shiftId), req.body.status);
      res.json(shift);
    })
  );

  // Employee Attendance
  appInstance.post(
    '/api/employees/:id/attendance',
    authMiddleware,
    asyncHandler(async (req: Request, res: Response) => {
      const attendance = employeeService.recordAttendance({
        ...req.body,
        employeeId: parseInt(req.params.id),
        recordedBy: req.user!.id,
      });
      res.status(201).json(attendance);
    })
  );

  appInstance.get(
    '/api/employees/:id/attendance',
    authMiddleware,
    asyncHandler(async (req: Request, res: Response) => {
      const { startDate, endDate } = req.query;
      const attendance = employeeService.getEmployeeAttendance(
        parseInt(req.params.id),
        startDate as string,
        endDate as string
      );
      res.json(attendance);
    })
  );

  // Payroll
  appInstance.get(
    '/api/employees/:id/payroll/:year/:month',
    authMiddleware,
    asyncHandler(async (req: Request, res: Response) => {
      if (req.user!.role !== 'Admin') {
        throw new Error('Unauthorized');
      }
      const payroll = employeeService.calculatePayableAmount(
        parseInt(req.params.id),
        req.params.year,
        req.params.month
      );
      res.json(payroll);
    })
  );

  // Employee Sales Performance
  appInstance.get(
    '/api/employees/:id/performance',
    authMiddleware,
    asyncHandler(async (req: Request, res: Response) => {
      const { startDate, endDate } = req.query;
      const performance = employeeService.getEmployeeSalesPerformance(
        parseInt(req.params.id),
        startDate as string,
        endDate as string
      );
      res.json(performance);
    })
  );

  // ======================
  // PAYMENT METHODS ROUTES
  // ======================

  appInstance.get(
    '/api/payment-methods',
    asyncHandler(async (req: Request, res: Response) => {
      const methods = paymentMethodService.getAllPaymentMethods();
      res.json(methods);
    })
  );

  appInstance.post(
    '/api/payment-methods',
    authMiddleware,
    asyncHandler(async (req: Request, res: Response) => {
      if (req.user!.role !== 'Admin') {
        throw new Error('Unauthorized');
      }
      const method = paymentMethodService.createPaymentMethod(req.body.name);
      res.status(201).json(method);
    })
  );

  appInstance.put(
    '/api/payment-methods/:id',
    authMiddleware,
    asyncHandler(async (req: Request, res: Response) => {
      if (req.user!.role !== 'Admin') {
        throw new Error('Unauthorized');
      }
      const method = paymentMethodService.updatePaymentMethod(parseInt(req.params.id), req.body);
      res.json(method);
    })
  );

  appInstance.get(
    '/api/payment-methods/stats/usage',
    authMiddleware,
    asyncHandler(async (req: Request, res: Response) => {
      const { startDate, endDate } = req.query;
      const stats = paymentMethodService.getPaymentMethodUsage(startDate as string, endDate as string);
      res.json(stats);
    })
  );

  // ======================
  // INVOICE SETTINGS ROUTES
  // ======================

  appInstance.get(
    '/api/invoice-settings',
    asyncHandler(async (req: Request, res: Response) => {
      const settings = invoiceSettingsService.getInvoiceSettings();
      res.json(settings);
    })
  );

  appInstance.put(
    '/api/invoice-settings',
    authMiddleware,
    asyncHandler(async (req: Request, res: Response) => {
      if (req.user!.role !== 'Admin') {
        throw new Error('Unauthorized');
      }
      const settings = invoiceSettingsService.updateInvoiceSettings(req.body);
      res.json(settings);
    })
  );

  appInstance.post(
    '/api/invoice-settings/logo',
    authMiddleware,
    asyncHandler(async (req: Request, res: Response) => {
      if (req.user!.role !== 'Admin') {
        throw new Error('Unauthorized');
      }
      if (!req.body.logoData) {
        throw new Error('Logo data required');
      }
      const logoPath = invoiceSettingsService.uploadLogo(
        Buffer.from(req.body.logoData, 'base64'),
        req.body.fileName || 'logo.png'
      );
      res.json({ logoPath });
    })
  );

  appInstance.delete(
    '/api/invoice-settings/logo',
    authMiddleware,
    asyncHandler(async (req: Request, res: Response) => {
      if (req.user!.role !== 'Admin') {
        throw new Error('Unauthorized');
      }
      const settings = invoiceSettingsService.removeLogo();
      res.json(settings);
    })
  );

  appInstance.get(
    '/api/invoice/:saleId',
    authMiddleware,
    asyncHandler(async (req: Request, res: Response) => {
      const html = invoiceSettingsService.generateInvoiceTemplate(parseInt(req.params.saleId));
      res.setHeader('Content-Type', 'text/html');
      res.send(html);
    })
  );

  // ======================
  // STOCK ALERTS ROUTES
  // ======================

  appInstance.get(
    '/api/stock-alerts',
    authMiddleware,
    asyncHandler(async (req: Request, res: Response) => {
      const resolved = req.query.resolved !== undefined ? parseInt(req.query.resolved as string) : undefined;
      const alerts = stockAlertService.getAllAlerts(resolved);
      res.json(alerts);
    })
  );

  appInstance.get(
    '/api/stock-alerts/low-stock',
    asyncHandler(async (req: Request, res: Response) => {
      const products = stockAlertService.checkLowStockProducts();
      res.json(products);
    })
  );

  appInstance.get(
    '/api/stock-alerts/expiring',
    asyncHandler(async (req: Request, res: Response) => {
      const days = parseInt(req.query.days as string) || 30;
      const products = stockAlertService.getExpiringProducts(days);
      res.json(products);
    })
  );

  appInstance.get(
    '/api/stock-alerts/reorder-suggestions',
    asyncHandler(async (req: Request, res: Response) => {
      const suggestions = stockAlertService.getReorderSuggestions();
      res.json(suggestions);
    })
  );

  appInstance.get(
    '/api/stock-alerts/summary',
    asyncHandler(async (req: Request, res: Response) => {
      const summary = stockAlertService.getAlertSummary();
      res.json(summary);
    })
  );

  appInstance.put(
    '/api/stock-alerts/:id/resolve',
    authMiddleware,
    asyncHandler(async (req: Request, res: Response) => {
      const alert = stockAlertService.resolveStockAlert(
        parseInt(req.params.id),
        req.user!.id,
        req.body.notes
      );
      res.json(alert);
    })
  );

  appInstance.post(
    '/api/stock-alert-settings/:productId',
    authMiddleware,
    asyncHandler(async (req: Request, res: Response) => {
      if (req.user!.role !== 'Admin') {
        throw new Error('Unauthorized');
      }
      const setting = stockAlertService.createAlertSetting({
        ...req.body,
        productId: parseInt(req.params.productId),
      });
      res.status(201).json(setting);
    })
  );

  appInstance.put(
    '/api/stock-alert-settings/:productId',
    authMiddleware,
    asyncHandler(async (req: Request, res: Response) => {
      if (req.user!.role !== 'Admin') {
        throw new Error('Unauthorized');
      }
      const setting = stockAlertService.updateAlertSetting(parseInt(req.params.productId), req.body);
      res.json(setting);
    })
  );

  // ======================
  // OFFLINE MODE ROUTES
  // ======================

  appInstance.get(
    '/api/offline/status',
    asyncHandler(async (req: Request, res: Response) => {
      res.json({
        offline_mode: offlineService.isOfflineMode(),
        pending_operations: offlineService.getQueueSize(),
        stats: offlineService.getSyncQueueStats(),
      });
    })
  );

  appInstance.get(
    '/api/offline/queue',
    authMiddleware,
    asyncHandler(async (req: Request, res: Response) => {
      const pending = offlineService.getPendingOperations();
      res.json(pending);
    })
  );

  appInstance.post(
    '/api/offline/sync',
    authMiddleware,
    asyncHandler(async (req: Request, res: Response) => {
      const { queueIds } = req.body;
      const count = offlineService.markMultipleAsSynced(queueIds || []);
      res.json({
        synced: count,
        remaining: offlineService.getQueueSize(),
      });
    })
  );

  appInstance.get(
    '/api/offline/debug',
    authMiddleware,
    asyncHandler(async (req: Request, res: Response) => {
      if (req.user!.role !== 'Admin') {
        throw new Error('Unauthorized');
      }
      const debugInfo = offlineService.getQueueDebugInfo();
      res.json(debugInfo);
    })
  );

  // ======================
  // DATABASE MANAGEMENT ROUTES (Admin only)
  // ======================

  const databaseRoutes = await import('./routes/database').then(m => m.default);
  appInstance.use('/api/database', databaseRoutes);

  // ======================
  // ERROR HANDLING
  // ======================

  appInstance.use(errorHandler);

  return appInstance;
}

export async function startBackend(port: number = 3000): Promise<void> {
  try {
    logger.info('Database initialized');

    // Create and start Express app
    app = await createApp();

    app.listen(port, '0.0.0.0', () => {
      logger.info(`Backend server running on http://0.0.0.0:${port} (accessible from any IP)`);
    });
  } catch (error) {
    logger.error('Failed to start backend:', error);
    throw error;
  }
}

export default createApp;

// Start backend if run directly (not imported)
if (require.main === module) {
  const port = process.env.PORT ? parseInt(process.env.PORT) : 3001;
  startBackend(port).catch((error) => {
    logger.error('Fatal error:', error);
    process.exit(1);
  });
}

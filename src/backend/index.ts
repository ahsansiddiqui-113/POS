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

    app.listen(port, () => {
      logger.info(`Backend server running on http://localhost:${port}`);
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

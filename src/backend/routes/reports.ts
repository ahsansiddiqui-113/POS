import { Router, Request, Response } from 'express';
import { authMiddleware, requireRole } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { reportService } from '../services/reportService';
import { salesService } from '../services/salesService';

const router = Router();

// All report endpoints require authentication and Admin role
router.use(authMiddleware);
router.use(requireRole('Admin'));

// Get report data (JSON)
router.get(
  '/data/:type',
  asyncHandler(async (req: Request, res: Response) => {
    const { type } = req.params;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      res.status(400).json({ error: 'startDate and endDate are required' });
      return;
    }

    let reportData;

    switch (type) {
      case 'daily_sales':
        reportData = reportService.getDailySalesReport(
          startDate as string,
          endDate as string
        );
        break;

      case 'monthly_sales':
        const year = (startDate as string).split('-')[0];
        reportData = reportService.getMonthlySalesReport(year);
        break;

      case 'profit':
        reportData = reportService.getProfitReport(
          startDate as string,
          endDate as string
        );
        break;

      case 'inventory':
        reportData = reportService.getInventoryValueReport();
        break;

      case 'category':
        reportData = reportService.getCategoryPerformanceReport();
        break;

      case 'best_sellers':
        const limit = parseInt(req.query.limit as string) || 10;
        reportData = reportService.getBestSellersReport(limit);
        break;

      default:
        res.status(400).json({ error: 'Invalid report type' });
        return;
    }

    res.json(reportData);
  })
);

// Generate PDF report
router.get(
  '/pdf/:type',
  asyncHandler(async (req: Request, res: Response) => {
    const { type } = req.params;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      res.status(400).json({ error: 'startDate and endDate are required' });
      return;
    }

    // Get report data
    let reportData;
    switch (type) {
      case 'daily_sales':
        reportData = reportService.getDailySalesReport(
          startDate as string,
          endDate as string
        );
        break;
      case 'monthly_sales':
        const year = (startDate as string).split('-')[0];
        reportData = reportService.getMonthlySalesReport(year);
        break;
      case 'profit':
        reportData = reportService.getProfitReport(
          startDate as string,
          endDate as string
        );
        break;
      case 'inventory':
        reportData = reportService.getInventoryValueReport();
        break;
      case 'category':
        reportData = reportService.getCategoryPerformanceReport();
        break;
      case 'best_sellers':
        const limit = parseInt(req.query.limit as string) || 10;
        reportData = reportService.getBestSellersReport(limit);
        break;
      default:
        res.status(400).json({ error: 'Invalid report type' });
        return;
    }

    // Generate PDF
    const pdfBuffer = await reportService.generatePdfReport(
      type,
      reportData,
      startDate as string,
      endDate as string
    );

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="report-${type}-${new Date().getTime()}.pdf"`
    );
    res.send(pdfBuffer);
  })
);

// Generate Excel report
router.get(
  '/excel/:type',
  asyncHandler(async (req: Request, res: Response) => {
    const { type } = req.params;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      res.status(400).json({ error: 'startDate and endDate are required' });
      return;
    }

    // Get report data
    let reportData;
    switch (type) {
      case 'daily_sales':
        reportData = reportService.getDailySalesReport(
          startDate as string,
          endDate as string
        );
        break;
      case 'monthly_sales':
        const year = (startDate as string).split('-')[0];
        reportData = reportService.getMonthlySalesReport(year);
        break;
      case 'profit':
        reportData = reportService.getProfitReport(
          startDate as string,
          endDate as string
        );
        break;
      case 'inventory':
        reportData = reportService.getInventoryValueReport();
        break;
      case 'category':
        reportData = reportService.getCategoryPerformanceReport();
        break;
      case 'best_sellers':
        const limit = parseInt(req.query.limit as string) || 10;
        reportData = reportService.getBestSellersReport(limit);
        break;
      default:
        res.status(400).json({ error: 'Invalid report type' });
        return;
    }

    // Generate Excel
    const excelBuffer = await reportService.generateExcelReport(
      type,
      reportData,
      startDate as string,
      endDate as string
    );

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="report-${type}-${new Date().getTime()}.xlsx"`
    );
    res.send(excelBuffer);
  })
);

// Best sellers endpoint (public for dashboard)
router.get(
  '/best-sellers',
  asyncHandler(async (req: Request, res: Response) => {
    const limit = parseInt(req.query.limit as string) || 10;
    const products = reportService.getBestSellersReport(limit);
    res.json(products);
  })
);

// Category performance endpoint (public)
router.get(
  '/category-performance',
  asyncHandler(async (req: Request, res: Response) => {
    const categories = reportService.getCategoryPerformanceReport();
    res.json(categories);
  })
);

// Sales Analytics endpoint
router.get(
  '/sales-analytics',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const analytics = reportService.getSalesAnalytics();
    res.json(analytics);
  })
);

export default router;

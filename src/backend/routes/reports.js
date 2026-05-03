"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const errorHandler_1 = require("../middleware/errorHandler");
const reportService_1 = require("../services/reportService");
const router = (0, express_1.Router)();
// All report endpoints require authentication and Admin role
router.use(auth_1.authMiddleware);
router.use((0, auth_1.requireRole)('Admin'));
// Get report data (JSON)
router.get('/data/:type', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { type } = req.params;
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
        res.status(400).json({ error: 'startDate and endDate are required' });
        return;
    }
    let reportData;
    switch (type) {
        case 'daily_sales':
            reportData = reportService_1.reportService.getDailySalesReport(startDate, endDate);
            break;
        case 'monthly_sales':
            const year = startDate.split('-')[0];
            reportData = reportService_1.reportService.getMonthlySalesReport(year);
            break;
        case 'profit':
            reportData = reportService_1.reportService.getProfitReport(startDate, endDate);
            break;
        case 'inventory':
            reportData = reportService_1.reportService.getInventoryValueReport();
            break;
        case 'category':
            reportData = reportService_1.reportService.getCategoryPerformanceReport();
            break;
        case 'best_sellers':
            const limit = parseInt(req.query.limit) || 10;
            reportData = reportService_1.reportService.getBestSellersReport(limit);
            break;
        default:
            res.status(400).json({ error: 'Invalid report type' });
            return;
    }
    res.json(reportData);
}));
// Generate PDF report
router.get('/pdf/:type', (0, errorHandler_1.asyncHandler)(async (req, res) => {
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
            reportData = reportService_1.reportService.getDailySalesReport(startDate, endDate);
            break;
        case 'monthly_sales':
            const year = startDate.split('-')[0];
            reportData = reportService_1.reportService.getMonthlySalesReport(year);
            break;
        case 'profit':
            reportData = reportService_1.reportService.getProfitReport(startDate, endDate);
            break;
        case 'inventory':
            reportData = reportService_1.reportService.getInventoryValueReport();
            break;
        case 'category':
            reportData = reportService_1.reportService.getCategoryPerformanceReport();
            break;
        case 'best_sellers':
            const limit = parseInt(req.query.limit) || 10;
            reportData = reportService_1.reportService.getBestSellersReport(limit);
            break;
        default:
            res.status(400).json({ error: 'Invalid report type' });
            return;
    }
    // Generate PDF
    const pdfBuffer = await reportService_1.reportService.generatePdfReport(type, reportData, startDate, endDate);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="report-${type}-${new Date().getTime()}.pdf"`);
    res.send(pdfBuffer);
}));
// Generate Excel report
router.get('/excel/:type', (0, errorHandler_1.asyncHandler)(async (req, res) => {
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
            reportData = reportService_1.reportService.getDailySalesReport(startDate, endDate);
            break;
        case 'monthly_sales':
            const year = startDate.split('-')[0];
            reportData = reportService_1.reportService.getMonthlySalesReport(year);
            break;
        case 'profit':
            reportData = reportService_1.reportService.getProfitReport(startDate, endDate);
            break;
        case 'inventory':
            reportData = reportService_1.reportService.getInventoryValueReport();
            break;
        case 'category':
            reportData = reportService_1.reportService.getCategoryPerformanceReport();
            break;
        case 'best_sellers':
            const limit = parseInt(req.query.limit) || 10;
            reportData = reportService_1.reportService.getBestSellersReport(limit);
            break;
        default:
            res.status(400).json({ error: 'Invalid report type' });
            return;
    }
    // Generate Excel
    const excelBuffer = await reportService_1.reportService.generateExcelReport(type, reportData, startDate, endDate);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="report-${type}-${new Date().getTime()}.xlsx"`);
    res.send(excelBuffer);
}));
// Best sellers endpoint (public for dashboard)
router.get('/best-sellers', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const limit = parseInt(req.query.limit) || 10;
    const products = reportService_1.reportService.getBestSellersReport(limit);
    res.json(products);
}));
// Category performance endpoint (public)
router.get('/category-performance', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const categories = reportService_1.reportService.getCategoryPerformanceReport();
    res.json(categories);
}));
// Sales Analytics endpoint
router.get('/sales-analytics', auth_1.authMiddleware, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const analytics = reportService_1.reportService.getSalesAnalytics();
    res.json(analytics);
}));
exports.default = router;
//# sourceMappingURL=reports.js.map
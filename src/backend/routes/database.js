"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const errorHandler_1 = require("../middleware/errorHandler");
const databaseService_1 = require("../services/databaseService");
const sample_data_1 = require("../database/sample-data");
const db_1 = require("../database/db");
const router = (0, express_1.Router)();
// All database endpoints require Admin role
router.use(auth_1.authMiddleware);
router.use((0, auth_1.requireRole)('Admin'));
// Get database statistics
router.get('/stats', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const stats = databaseService_1.databaseService.getStats();
    res.json(stats);
}));
// Get database info
router.get('/info', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const info = databaseService_1.databaseService.getInfo();
    res.json(info);
}));
// Check database integrity
router.post('/check-integrity', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const result = databaseService_1.databaseService.checkIntegrity();
    res.json(result);
}));
// Vacuum database (optimize)
router.post('/vacuum', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    try {
        databaseService_1.databaseService.vacuum();
        res.json({ message: 'Database vacuumed successfully' });
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
}));
// Analyze database
router.post('/analyze', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    try {
        databaseService_1.databaseService.analyze();
        res.json({ message: 'Database analysis complete' });
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
}));
// Create backup
router.post('/backup', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const result = databaseService_1.databaseService.createBackup();
    if (result.success) {
        res.json(result);
    }
    else {
        res.status(400).json(result);
    }
}));
// List backups
router.get('/backups', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const backups = databaseService_1.databaseService.listBackups();
    res.json(backups);
}));
// Restore from backup
router.post('/restore', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { backupPath } = req.body;
    if (!backupPath) {
        res.status(400).json({ error: 'backupPath is required' });
        return;
    }
    const result = databaseService_1.databaseService.restoreBackup(backupPath);
    if (result.success) {
        res.json(result);
    }
    else {
        res.status(400).json(result);
    }
}));
// Cleanup old backups
router.post('/cleanup-backups', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { keepCount } = req.body;
    const result = databaseService_1.databaseService.cleanupOldBackups(keepCount || 10);
    res.json(result);
}));
// Export data as JSON
router.post('/export', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const outputPath = `/tmp/pos-export-${Date.now()}.json`;
    const result = databaseService_1.databaseService.exportAsJSON(outputPath);
    res.json(result);
}));
// Get table info
router.get('/table/:name', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    try {
        const info = databaseService_1.databaseService.getTableInfo(req.params.name);
        res.json(info);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
}));
// Archive old sales
router.post('/archive-sales', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { daysOld } = req.body;
    const result = databaseService_1.databaseService.archiveOldSales(daysOld || 365);
    res.json(result);
}));
// Seed sample data (for testing and demonstration)
router.post('/seed-sample-data', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    try {
        const db = (0, db_1.getDatabase)();
        (0, sample_data_1.seedSampleData)(db);
        res.json({
            success: true,
            message: 'Sample data seeded successfully. Check console for details.'
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
}));
// Delete all sample data
router.post('/delete-sample-data', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    try {
        const db = (0, db_1.getDatabase)();
        (0, sample_data_1.deleteSampleData)(db);
        res.json({
            success: true,
            message: 'Sample data deleted successfully.'
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
}));
exports.default = router;
//# sourceMappingURL=database.js.map
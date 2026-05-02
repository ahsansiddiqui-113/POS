import { Router, Request, Response } from 'express';
import { authMiddleware, requireRole } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { databaseService } from '../services/databaseService';
import { seedSampleData, deleteSampleData } from '../database/sample-data';
import { getDatabase } from '../database/db';

const router = Router();

// All database endpoints require Admin role
router.use(authMiddleware);
router.use(requireRole('Admin'));

// Get database statistics
router.get(
  '/stats',
  asyncHandler(async (req: Request, res: Response) => {
    const stats = databaseService.getStats();
    res.json(stats);
  })
);

// Get database info
router.get(
  '/info',
  asyncHandler(async (req: Request, res: Response) => {
    const info = databaseService.getInfo();
    res.json(info);
  })
);

// Check database integrity
router.post(
  '/check-integrity',
  asyncHandler(async (req: Request, res: Response) => {
    const result = databaseService.checkIntegrity();
    res.json(result);
  })
);

// Vacuum database (optimize)
router.post(
  '/vacuum',
  asyncHandler(async (req: Request, res: Response) => {
    try {
      databaseService.vacuum();
      res.json({ message: 'Database vacuumed successfully' });
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  })
);

// Analyze database
router.post(
  '/analyze',
  asyncHandler(async (req: Request, res: Response) => {
    try {
      databaseService.analyze();
      res.json({ message: 'Database analysis complete' });
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  })
);

// Create backup
router.post(
  '/backup',
  asyncHandler(async (req: Request, res: Response) => {
    const result = databaseService.createBackup();
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  })
);

// List backups
router.get(
  '/backups',
  asyncHandler(async (req: Request, res: Response) => {
    const backups = databaseService.listBackups();
    res.json(backups);
  })
);

// Restore from backup
router.post(
  '/restore',
  asyncHandler(async (req: Request, res: Response) => {
    const { backupPath } = req.body;

    if (!backupPath) {
      res.status(400).json({ error: 'backupPath is required' });
      return;
    }

    const result = databaseService.restoreBackup(backupPath);
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  })
);

// Cleanup old backups
router.post(
  '/cleanup-backups',
  asyncHandler(async (req: Request, res: Response) => {
    const { keepCount } = req.body;
    const result = databaseService.cleanupOldBackups(keepCount || 10);
    res.json(result);
  })
);

// Export data as JSON
router.post(
  '/export',
  asyncHandler(async (req: Request, res: Response) => {
    const outputPath = `/tmp/pos-export-${Date.now()}.json`;
    const result = databaseService.exportAsJSON(outputPath);
    res.json(result);
  })
);

// Get table info
router.get(
  '/table/:name',
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const info = databaseService.getTableInfo(req.params.name);
      res.json(info);
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  })
);

// Archive old sales
router.post(
  '/archive-sales',
  asyncHandler(async (req: Request, res: Response) => {
    const { daysOld } = req.body;
    const result = databaseService.archiveOldSales(daysOld || 365);
    res.json(result);
  })
);

// Seed sample data (for testing and demonstration)
router.post(
  '/seed-sample-data',
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const db = getDatabase();
      seedSampleData(db);
      res.json({
        success: true,
        message: 'Sample data seeded successfully. Check console for details.'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: (error as Error).message
      });
    }
  })
);

// Delete all sample data
router.post(
  '/delete-sample-data',
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const db = getDatabase();
      deleteSampleData(db);
      res.json({
        success: true,
        message: 'Sample data deleted successfully.'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: (error as Error).message
      });
    }
  })
);

export default router;

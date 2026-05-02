import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { barcodeScannerService } from '../services/barcodeScannerService';

const router = Router();

router.use(authMiddleware);

// Process barcode scan
router.post(
  '/scan',
  asyncHandler(async (req: Request, res: Response) => {
    const { barcode } = req.body;

    if (!barcode) {
      res.status(400).json({ error: 'Barcode is required' });
      return;
    }

    const result = barcodeScannerService.processScan(barcode);
    res.json(result);
  })
);

// Quick product lookup by barcode
router.get(
  '/lookup/:barcode',
  asyncHandler(async (req: Request, res: Response) => {
    const product = barcodeScannerService.quickLookup(req.params.barcode);
    res.json(product);
  })
);

// Validate stock availability
router.post(
  '/validate-stock',
  asyncHandler(async (req: Request, res: Response) => {
    const { barcode, quantity } = req.body;

    if (!barcode || !quantity) {
      res.status(400).json({ error: 'Barcode and quantity are required' });
      return;
    }

    const validation = barcodeScannerService.validateStock(barcode, quantity);
    res.json(validation);
  })
);

// Get scanner configuration
router.get(
  '/config',
  asyncHandler(async (req: Request, res: Response) => {
    const config = barcodeScannerService.getConfig();
    res.json(config);
  })
);

// Update scanner configuration
router.put(
  '/config',
  asyncHandler(async (req: Request, res: Response) => {
    barcodeScannerService.updateConfig(req.body);
    res.json({ message: 'Configuration updated' });
  })
);

// Get scanner status
router.get(
  '/status',
  asyncHandler(async (req: Request, res: Response) => {
    const status = barcodeScannerService.getScannerStatus();
    res.json(status);
  })
);

// Test scanner connection
router.post(
  '/test',
  asyncHandler(async (req: Request, res: Response) => {
    const result = barcodeScannerService.testScannerConnection();
    res.json(result);
  })
);

// Get scan history
router.get(
  '/history',
  asyncHandler(async (req: Request, res: Response) => {
    const limit = parseInt(req.query.limit as string) || 100;
    const history = barcodeScannerService.getScanHistory(limit);
    res.json(history);
  })
);

// Detect barcode format
router.post(
  '/detect-format',
  asyncHandler(async (req: Request, res: Response) => {
    const { barcode } = req.body;

    if (!barcode) {
      res.status(400).json({ error: 'Barcode is required' });
      return;
    }

    const format = barcodeScannerService.detectBarcodeFormat(barcode);
    res.json({ barcode, format });
  })
);

// Batch validation
router.post(
  '/validate-batch',
  asyncHandler(async (req: Request, res: Response) => {
    const { barcodes } = req.body;

    if (!Array.isArray(barcodes)) {
      res.status(400).json({ error: 'Barcodes array is required' });
      return;
    }

    const results = barcodeScannerService.validateMultiple(barcodes);
    res.json(results);
  })
);

export default router;

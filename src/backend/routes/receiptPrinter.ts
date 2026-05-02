import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { receiptPrinterService } from '../services/receiptPrinterService';
import { salesService } from '../services/salesService';

const router = Router();

router.use(authMiddleware);

// Generate receipt text preview
router.get(
  '/preview/:saleId',
  asyncHandler(async (req: Request, res: Response) => {
    const saleId = parseInt(req.params.saleId);
    const sale = salesService.getSaleWithItems(saleId);

    if (!sale) {
      res.status(404).json({ error: 'Sale not found' });
      return;
    }

    const receiptText = receiptPrinterService.generateReceiptText({
      saleId: sale.id,
      saleDate: sale.sale_date,
      userId: sale.user_id,
      totalAmount: sale.total_amount,
      paymentMethod: sale.payment_method,
      items: sale.items.map((item: any) => ({
        name: '', // Product name would need to be fetched
        quantity: item.quantity,
        unitPrice: item.unit_price,
        subtotal: item.subtotal,
      })),
    });

    res.setHeader('Content-Type', 'text/plain');
    res.send(receiptText);
  })
);

// Generate HTML receipt preview
router.get(
  '/html-preview/:saleId',
  asyncHandler(async (req: Request, res: Response) => {
    const saleId = parseInt(req.params.saleId);
    const sale = salesService.getSaleWithItems(saleId);

    if (!sale) {
      res.status(404).json({ error: 'Sale not found' });
      return;
    }

    const htmlReceipt = receiptPrinterService.generateHTMLReceipt({
      saleId: sale.id,
      saleDate: sale.sale_date,
      userId: sale.user_id,
      totalAmount: sale.total_amount,
      paymentMethod: sale.payment_method,
      items: sale.items.map((item: any) => ({
        name: '', // Product name would need to be fetched
        quantity: item.quantity,
        unitPrice: item.unit_price,
        subtotal: item.subtotal,
      })),
    });

    res.setHeader('Content-Type', 'text/html');
    res.send(htmlReceipt);
  })
);

// Generate ESC/POS commands for thermal printer
router.get(
  '/escpos/:saleId',
  asyncHandler(async (req: Request, res: Response) => {
    const saleId = parseInt(req.params.saleId);
    const sale = salesService.getSaleWithItems(saleId);

    if (!sale) {
      res.status(404).json({ error: 'Sale not found' });
      return;
    }

    const esposBuffer = receiptPrinterService.generateESCPOS({
      saleId: sale.id,
      saleDate: sale.sale_date,
      userId: sale.user_id,
      totalAmount: sale.total_amount,
      paymentMethod: sale.payment_method,
      items: sale.items.map((item: any) => ({
        name: '', // Product name would need to be fetched
        quantity: item.quantity,
        unitPrice: item.unit_price,
        subtotal: item.subtotal,
      })),
    });

    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="receipt-${saleId}.bin"`
    );
    res.send(esposBuffer);
  })
);

// Print receipt to printer
router.post(
  '/print/:saleId',
  asyncHandler(async (req: Request, res: Response) => {
    const saleId = parseInt(req.params.saleId);
    const sale = salesService.getSaleWithItems(saleId);

    if (!sale) {
      res.status(404).json({ error: 'Sale not found' });
      return;
    }

    const result = await receiptPrinterService.printReceipt({
      saleId: sale.id,
      saleDate: sale.sale_date,
      userId: sale.user_id,
      totalAmount: sale.total_amount,
      paymentMethod: sale.payment_method,
      items: sale.items.map((item: any) => ({
        name: '', // Product name would need to be fetched
        quantity: item.quantity,
        unitPrice: item.unit_price,
        subtotal: item.subtotal,
      })),
    });

    res.json(result);
  })
);

// Get printer configuration
router.get(
  '/config',
  asyncHandler(async (req: Request, res: Response) => {
    const config = receiptPrinterService.getConfig();
    res.json(config);
  })
);

// Update printer configuration
router.put(
  '/config',
  asyncHandler(async (req: Request, res: Response) => {
    receiptPrinterService.updateConfig(req.body);
    res.json({ message: 'Configuration updated' });
  })
);

export default router;

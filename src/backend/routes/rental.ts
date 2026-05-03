import { Router, Request, Response } from 'express';
import { rentalService } from '../services/rentalService';
import { authMiddleware, requireRole } from '../middleware/auth';

const router = Router();

// ============ RENTAL ITEMS ============

// Get all rental items
router.get(
  '/items',
  authMiddleware,
  (req: Request, res: Response) => {
    try {
      const status = req.query.status as string;
      const items = status
        ? rentalService.getAllRentalItems(status)
        : rentalService.getAllRentalItems();
      res.json(items);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to fetch rental items' });
    }
  }
);

// Create rental item
router.post(
  '/items',
  authMiddleware,
  requireRole('Admin'),
  (req: Request, res: Response) => {
    try {
      const item = rentalService.createRentalItem(req.body);
      res.status(201).json(item);
    } catch (error: any) {
      res.status(error.statusCode || 500).json({ error: error.message || 'Failed to create rental item' });
    }
  }
);

// Update rental item details
router.put(
  '/items/:id',
  authMiddleware,
  requireRole('Admin'),
  (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const updates = {
        daily_rental_price: req.body.daily_rental_price,
        weekly_rental_price: req.body.weekly_rental_price,
        monthly_rental_price: req.body.monthly_rental_price,
        security_deposit: req.body.security_deposit,
        condition: req.body.condition,
      };
      rentalService.updateRentalItem(id, updates);
      const updated = rentalService.getRentalItem(id);
      res.json(updated);
    } catch (error: any) {
      res.status(error.statusCode || 500).json({ error: error.message });
    }
  }
);

// Update rental item status
router.patch(
  '/items/:id/status',
  authMiddleware,
  requireRole('Admin'),
  (req: Request, res: Response) => {
    try {
      const { status } = req.body;
      rentalService.updateRentalItemStatus(parseInt(req.params.id), status);
      res.json({ message: 'Rental item status updated' });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({ error: error.message });
    }
  }
);

// Delete rental item
router.delete(
  '/items/:id',
  authMiddleware,
  requireRole('Admin'),
  (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      rentalService.deleteRentalItem(id);
      res.json({ message: 'Rental item deleted successfully' });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({ error: error.message });
    }
  }
);

// ============ RENTAL TRANSACTIONS ============

// Create rental transaction
router.post(
  '/transactions',
  authMiddleware,
  (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id || 0;
      const transaction = rentalService.createRentalTransaction({
        ...req.body,
        user_id: userId,
      });
      res.status(201).json(transaction);
    } catch (error: any) {
      res.status(error.statusCode || 500).json({ error: error.message });
    }
  }
);

// Get active rentals
router.get(
  '/transactions/active',
  authMiddleware,
  (req: Request, res: Response) => {
    try {
      const rentals = rentalService.getActiveRentals();
      res.json(rentals);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Get overdue rentals
router.get(
  '/transactions/overdue',
  authMiddleware,
  requireRole('Admin'),
  (req: Request, res: Response) => {
    try {
      const overdue = rentalService.getOverdueRentals();
      res.json(overdue);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Return rental item
router.post(
  '/transactions/:id/return',
  authMiddleware,
  (req: Request, res: Response) => {
    try {
      const { itemCondition, damageCharges } = req.body;
      rentalService.returnRentalItem(
        parseInt(req.params.id),
        itemCondition || 'good',
        damageCharges || 0
      );
      res.json({ message: 'Rental item returned successfully' });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({ error: error.message });
    }
  }
);

// Get rental revenue summary
router.get(
  '/reports/revenue',
  authMiddleware,
  requireRole('Admin'),
  (req: Request, res: Response) => {
    try {
      const { startDate, endDate } = req.query;
      const summary = rentalService.getRentalRevenueSummary(
        startDate as string,
        endDate as string
      );
      res.json(summary);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

export default router;

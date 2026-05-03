import { Router, Request, Response } from 'express';
import { customerService } from '../services/customerService';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Get all customers
router.get(
  '/',
  authMiddleware,
  (req: Request, res: Response) => {
    try {
      const customers = customerService.getAllCustomers();
      res.json(customers);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to fetch customers' });
    }
  }
);

// Get customer details and history
router.get(
  '/:id',
  authMiddleware,
  (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const customer = customerService.getCustomer(id);
      if (!customer) {
        return res.status(404).json({ error: 'Customer not found' });
      }
      const history = customerService.getRentalHistory(id);
      const stats = customerService.getCustomerStats(id);
      res.json({ customer, history, stats });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Create customer
router.post(
  '/',
  authMiddleware,
  (req: Request, res: Response) => {
    try {
      const customer = customerService.createCustomer(req.body);
      res.status(201).json(customer);
    } catch (error: any) {
      res.status(error.statusCode || 500).json({ error: error.message });
    }
  }
);

// Update customer
router.put(
  '/:id',
  authMiddleware,
  (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      customerService.updateCustomer(id, req.body);
      const updated = customerService.getCustomer(id);
      res.json(updated);
    } catch (error: any) {
      res.status(error.statusCode || 500).json({ error: error.message });
    }
  }
);

// Get rental history for customer
router.get(
  '/:id/rentals',
  authMiddleware,
  (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const history = customerService.getRentalHistory(id);
      res.json(history);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Get customer statistics
router.get(
  '/:id/stats',
  authMiddleware,
  (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const stats = customerService.getCustomerStats(id);
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

export default router;

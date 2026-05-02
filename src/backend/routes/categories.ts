import { Router, Request, Response } from 'express';
import { categoryService } from '../services/categoryService';
import { authMiddleware, requireRole } from '../middleware/auth';

const router = Router();

// Get all categories with product counts
router.get('/', authMiddleware, (req: Request, res: Response) => {
  try {
    const categories = categoryService.getCategoryWithCount();
    res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Create new category (Admin only)
router.post(
  '/',
  authMiddleware,
  requireRole('Admin'),
  (req: Request, res: Response) => {
    try {
      const { name } = req.body;
      const userId = (req as any).user?.id || 0;

      categoryService.createCategory(name, userId);
      res.status(201).json({ message: 'Category created successfully', name });
    } catch (error: any) {
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({ error: error.message || 'Failed to create category' });
    }
  }
);

// Rename category (Admin only)
router.put(
  '/:oldName',
  authMiddleware,
  requireRole('Admin'),
  (req: Request, res: Response) => {
    try {
      const { oldName } = req.params;
      const { newName } = req.body;
      const userId = (req as any).user?.id || 0;

      categoryService.renameCategory(decodeURIComponent(oldName), newName, userId);
      res.json({ message: 'Category renamed successfully', oldName, newName });
    } catch (error: any) {
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({ error: error.message || 'Failed to rename category' });
    }
  }
);

// Delete category (Admin only)
router.delete(
  '/:name',
  authMiddleware,
  requireRole('Admin'),
  (req: Request, res: Response) => {
    try {
      const { name } = req.params;
      const userId = (req as any).user?.id || 0;

      categoryService.deleteCategory(decodeURIComponent(name), userId);
      res.json({ message: 'Category deleted successfully' });
    } catch (error: any) {
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({ error: error.message || 'Failed to delete category' });
    }
  }
);

export default router;

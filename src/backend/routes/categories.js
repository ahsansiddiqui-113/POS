"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const categoryService_1 = require("../services/categoryService");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Get all categories with product counts
router.get('/', auth_1.authMiddleware, (req, res) => {
    try {
        const categories = categoryService_1.categoryService.getCategoryWithCount();
        res.json(categories);
    }
    catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({ error: 'Failed to fetch categories' });
    }
});
// Create new category (Admin only)
router.post('/', auth_1.authMiddleware, (0, auth_1.requireRole)('Admin'), (req, res) => {
    try {
        const { name } = req.body;
        const userId = req.user?.id || 0;
        categoryService_1.categoryService.createCategory(name, userId);
        res.status(201).json({ message: 'Category created successfully', name });
    }
    catch (error) {
        const statusCode = error.statusCode || 500;
        res.status(statusCode).json({ error: error.message || 'Failed to create category' });
    }
});
// Rename category (Admin only)
router.put('/:oldName', auth_1.authMiddleware, (0, auth_1.requireRole)('Admin'), (req, res) => {
    try {
        const { oldName } = req.params;
        const { newName } = req.body;
        const userId = req.user?.id || 0;
        categoryService_1.categoryService.renameCategory(decodeURIComponent(oldName), newName, userId);
        res.json({ message: 'Category renamed successfully', oldName, newName });
    }
    catch (error) {
        const statusCode = error.statusCode || 500;
        res.status(statusCode).json({ error: error.message || 'Failed to rename category' });
    }
});
// Delete category (Admin only)
router.delete('/:name', auth_1.authMiddleware, (0, auth_1.requireRole)('Admin'), (req, res) => {
    try {
        const { name } = req.params;
        const userId = req.user?.id || 0;
        categoryService_1.categoryService.deleteCategory(decodeURIComponent(name), userId);
        res.json({ message: 'Category deleted successfully' });
    }
    catch (error) {
        const statusCode = error.statusCode || 500;
        res.status(statusCode).json({ error: error.message || 'Failed to delete category' });
    }
});
exports.default = router;
//# sourceMappingURL=categories.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const rentalService_1 = require("../services/rentalService");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// ============ RENTAL ITEMS ============
// Get all rental items
router.get('/items', auth_1.authMiddleware, (req, res) => {
    try {
        const status = req.query.status;
        const items = status
            ? rentalService_1.rentalService.getAllRentalItems(status)
            : rentalService_1.rentalService.getAllRentalItems();
        res.json(items);
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Failed to fetch rental items' });
    }
});
// Create rental item
router.post('/items', auth_1.authMiddleware, (0, auth_1.requireRole)('Admin'), (req, res) => {
    try {
        const item = rentalService_1.rentalService.createRentalItem(req.body);
        res.status(201).json(item);
    }
    catch (error) {
        res.status(error.statusCode || 500).json({ error: error.message || 'Failed to create rental item' });
    }
});
// Update rental item status
router.patch('/items/:id/status', auth_1.authMiddleware, (0, auth_1.requireRole)('Admin'), (req, res) => {
    try {
        const { status } = req.body;
        rentalService_1.rentalService.updateRentalItemStatus(parseInt(req.params.id), status);
        res.json({ message: 'Rental item status updated' });
    }
    catch (error) {
        res.status(error.statusCode || 500).json({ error: error.message });
    }
});
// ============ RENTAL TRANSACTIONS ============
// Create rental transaction
router.post('/transactions', auth_1.authMiddleware, (req, res) => {
    try {
        const userId = req.user?.id || 0;
        const transaction = rentalService_1.rentalService.createRentalTransaction({
            ...req.body,
            user_id: userId,
        });
        res.status(201).json(transaction);
    }
    catch (error) {
        res.status(error.statusCode || 500).json({ error: error.message });
    }
});
// Get active rentals
router.get('/transactions/active', auth_1.authMiddleware, (req, res) => {
    try {
        const rentals = rentalService_1.rentalService.getActiveRentals();
        res.json(rentals);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Get overdue rentals
router.get('/transactions/overdue', auth_1.authMiddleware, (0, auth_1.requireRole)('Admin'), (req, res) => {
    try {
        const overdue = rentalService_1.rentalService.getOverdueRentals();
        res.json(overdue);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Return rental item
router.post('/transactions/:id/return', auth_1.authMiddleware, (req, res) => {
    try {
        const { itemCondition, damageCharges } = req.body;
        rentalService_1.rentalService.returnRentalItem(parseInt(req.params.id), itemCondition || 'good', damageCharges || 0);
        res.json({ message: 'Rental item returned successfully' });
    }
    catch (error) {
        res.status(error.statusCode || 500).json({ error: error.message });
    }
});
// Get rental revenue summary
router.get('/reports/revenue', auth_1.authMiddleware, (0, auth_1.requireRole)('Admin'), (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const summary = rentalService_1.rentalService.getRentalRevenueSummary(startDate, endDate);
        res.json(summary);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.default = router;
//# sourceMappingURL=rental.js.map
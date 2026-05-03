"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const customerService_1 = require("../services/customerService");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Get all customers
router.get('/', auth_1.authMiddleware, (req, res) => {
    try {
        const customers = customerService_1.customerService.getAllCustomers();
        res.json(customers);
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Failed to fetch customers' });
    }
});
// Get customer details and history
router.get('/:id', auth_1.authMiddleware, (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const customer = customerService_1.customerService.getCustomer(id);
        if (!customer) {
            return res.status(404).json({ error: 'Customer not found' });
        }
        const history = customerService_1.customerService.getRentalHistory(id);
        const stats = customerService_1.customerService.getCustomerStats(id);
        res.json({ customer, history, stats });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Create customer
router.post('/', auth_1.authMiddleware, (req, res) => {
    try {
        const customer = customerService_1.customerService.createCustomer(req.body);
        res.status(201).json(customer);
    }
    catch (error) {
        res.status(error.statusCode || 500).json({ error: error.message });
    }
});
// Update customer
router.put('/:id', auth_1.authMiddleware, (req, res) => {
    try {
        const id = parseInt(req.params.id);
        customerService_1.customerService.updateCustomer(id, req.body);
        const updated = customerService_1.customerService.getCustomer(id);
        res.json(updated);
    }
    catch (error) {
        res.status(error.statusCode || 500).json({ error: error.message });
    }
});
// Get rental history for customer
router.get('/:id/rentals', auth_1.authMiddleware, (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const history = customerService_1.customerService.getRentalHistory(id);
        res.json(history);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Get customer statistics
router.get('/:id/stats', auth_1.authMiddleware, (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const stats = customerService_1.customerService.getCustomerStats(id);
        res.json(stats);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.default = router;
//# sourceMappingURL=customers.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateSaleInput = exports.validateLoginInput = exports.validateProductInput = exports.validateQuantity = exports.validatePrice = exports.validateBarcode = exports.validateSKU = exports.validatePassword = exports.validateUsername = exports.validateEmail = exports.ValidationException = void 0;
class ValidationException extends Error {
    constructor(errors) {
        super('Validation failed');
        this.errors = errors;
        this.name = 'ValidationException';
    }
}
exports.ValidationException = ValidationException;
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}
exports.validateEmail = validateEmail;
function validateUsername(username) {
    return username && username.length >= 3 && username.length <= 50;
}
exports.validateUsername = validateUsername;
function validatePassword(password) {
    return password && password.length >= 6;
}
exports.validatePassword = validatePassword;
function validateSKU(sku) {
    return sku && sku.length > 0 && sku.length <= 50;
}
exports.validateSKU = validateSKU;
function validateBarcode(barcode) {
    return barcode && barcode.length > 0;
}
exports.validateBarcode = validateBarcode;
function validatePrice(price) {
    return !isNaN(price) && price >= 0;
}
exports.validatePrice = validatePrice;
function validateQuantity(quantity) {
    return Number.isInteger(quantity) && quantity >= 0;
}
exports.validateQuantity = validateQuantity;
function validateProductInput(data) {
    const errors = [];
    if (!data.sku || !validateSKU(data.sku)) {
        errors.push({ field: 'sku', message: 'Invalid SKU' });
    }
    if (!data.barcode || !validateBarcode(data.barcode)) {
        errors.push({ field: 'barcode', message: 'Invalid barcode' });
    }
    if (!data.name || data.name.trim().length === 0) {
        errors.push({ field: 'name', message: 'Product name is required' });
    }
    if (!data.category || data.category.trim().length === 0) {
        errors.push({ field: 'category', message: 'Category is required' });
    }
    if (!validatePrice(data.purchase_price_per_unit)) {
        errors.push({
            field: 'purchase_price_per_unit',
            message: 'Invalid purchase price',
        });
    }
    if (!validatePrice(data.sale_price_per_unit)) {
        errors.push({
            field: 'sale_price_per_unit',
            message: 'Invalid sale price',
        });
    }
    if (!validateQuantity(data.quantity_available)) {
        errors.push({
            field: 'quantity_available',
            message: 'Invalid quantity',
        });
    }
    return errors;
}
exports.validateProductInput = validateProductInput;
function validateLoginInput(data) {
    const errors = [];
    if (!data.username || !validateUsername(data.username)) {
        errors.push({ field: 'username', message: 'Invalid username' });
    }
    if (!data.password || !validatePassword(data.password)) {
        errors.push({ field: 'password', message: 'Invalid password' });
    }
    return errors;
}
exports.validateLoginInput = validateLoginInput;
function validateSaleInput(data) {
    const errors = [];
    if (!Array.isArray(data.items) || data.items.length === 0) {
        errors.push({ field: 'items', message: 'At least one item required' });
    }
    for (const item of data.items || []) {
        if (!item.product_id || item.product_id <= 0) {
            errors.push({
                field: 'items',
                message: 'Invalid product in cart',
            });
        }
        if (!validateQuantity(item.quantity)) {
            errors.push({
                field: 'items',
                message: 'Invalid quantity in cart',
            });
        }
        if (!validatePrice(item.unit_price)) {
            errors.push({
                field: 'items',
                message: 'Invalid price in cart',
            });
        }
    }
    if (!validatePrice(data.total_amount) || data.total_amount < 0) {
        errors.push({
            field: 'total_amount',
            message: 'Invalid total amount',
        });
    }
    return errors;
}
exports.validateSaleInput = validateSaleInput;
//# sourceMappingURL=validators.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pricingService = exports.PricingService = void 0;
const db_1 = require("../database/db");
const MINIMUM_MARKUP_PERCENT = 0.2; // 20%
class PricingService {
    constructor() {
        this.db = (0, db_1.getDatabase)();
    }
    calculateMinimumPrice(purchasePrice) {
        return purchasePrice * (1 + MINIMUM_MARKUP_PERCENT);
    }
    validatePrice(purchasePrice, salePrice) {
        const minimumPrice = this.calculateMinimumPrice(purchasePrice);
        if (salePrice < minimumPrice) {
            return {
                isValid: false,
                minimumPrice: Math.round(minimumPrice * 100) / 100,
                error: `Sale price must be at least ${minimumPrice.toFixed(2)} (20% above purchase price)`,
            };
        }
        return {
            isValid: true,
            minimumPrice,
        };
    }
    validateSaleItems(items) {
        const errors = [];
        for (const item of items) {
            const product = this.db
                .prepare('SELECT purchase_price_per_unit, name FROM products WHERE id = ?')
                .get(item.productId);
            if (!product) {
                errors.push(`Product ${item.productId} not found`);
                continue;
            }
            // Check maximum discount (20%)
            const discountPercentage = item.discountPercentage || 0;
            if (discountPercentage > 20) {
                errors.push(`${product.name}: Discount ${discountPercentage}% exceeds maximum allowed 20%`);
                continue;
            }
            const validation = this.validatePrice(product.purchase_price_per_unit, item.unitPrice);
            if (!validation.isValid) {
                errors.push(`${product.name}: ${validation.error}`);
            }
        }
        return {
            valid: errors.length === 0,
            errors,
        };
    }
    logPricingOverride(userId, productId, originalPrice, overridePrice, reason) {
        this.db
            .prepare(`INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_value, new_value, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`)
            .run(userId, 'PRICING_OVERRIDE', 'product', productId, originalPrice.toString(), overridePrice.toString());
    }
    getPriceHistory(productId) {
        return this.db
            .prepare(`SELECT * FROM audit_logs
        WHERE entity_type = 'product' AND entity_id = ? AND action = 'PRICING_OVERRIDE'
        ORDER BY timestamp DESC LIMIT 10`)
            .all(productId);
    }
    calculateProfit(purchasePrice, salePrice, quantity) {
        return (salePrice - purchasePrice) * quantity;
    }
    calculateProfitMargin(purchasePrice, salePrice) {
        if (purchasePrice === 0)
            return 0;
        return ((salePrice - purchasePrice) / purchasePrice) * 100;
    }
}
exports.PricingService = PricingService;
exports.pricingService = new PricingService();
//# sourceMappingURL=pricingService.js.map
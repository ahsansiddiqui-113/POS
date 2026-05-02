import { getDatabase } from '../database/db';
import { AppError } from '../middleware/errorHandler';

const MINIMUM_MARKUP_PERCENT = 0.2; // 20%

export interface PricingValidation {
  isValid: boolean;
  minimumPrice: number;
  error?: string;
}

export interface PricingData {
  productId: number;
  proposedPrice: number;
  quantity: number;
}

export class PricingService {
  private db = getDatabase();

  calculateMinimumPrice(purchasePrice: number): number {
    return purchasePrice * (1 + MINIMUM_MARKUP_PERCENT);
  }

  validatePrice(
    purchasePrice: number,
    salePrice: number
  ): PricingValidation {
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

  validateSaleItems(
    items: Array<{
      productId: number;
      quantity: number;
      unitPrice: number;
      discountPercentage?: number;
      discountedPrice?: number;
    }>
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    for (const item of items) {
      const product = this.db
        .prepare('SELECT purchase_price_per_unit, name FROM products WHERE id = ?')
        .get(item.productId) as
        | { purchase_price_per_unit: number; name: string }
        | undefined;

      if (!product) {
        errors.push(`Product ${item.productId} not found`);
        continue;
      }

      // Check maximum discount (20%)
      const discountPercentage = item.discountPercentage || 0;
      if (discountPercentage > 20) {
        errors.push(
          `${product.name}: Discount ${discountPercentage}% exceeds maximum allowed 20%`
        );
        continue;
      }

      const validation = this.validatePrice(
        product.purchase_price_per_unit,
        item.unitPrice
      );

      if (!validation.isValid) {
        errors.push(
          `${product.name}: ${validation.error}`
        );
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  logPricingOverride(
    userId: number,
    productId: number,
    originalPrice: number,
    overridePrice: number,
    reason: string
  ): void {
    this.db
      .prepare(
        `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_value, new_value, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`
      )
      .run(
        userId,
        'PRICING_OVERRIDE',
        'product',
        productId,
        originalPrice.toString(),
        overridePrice.toString()
      );
  }

  getPriceHistory(productId: number): any[] {
    return this.db
      .prepare(
        `SELECT * FROM audit_logs
        WHERE entity_type = 'product' AND entity_id = ? AND action = 'PRICING_OVERRIDE'
        ORDER BY timestamp DESC LIMIT 10`
      )
      .all(productId) as any[];
  }

  calculateProfit(purchasePrice: number, salePrice: number, quantity: number): number {
    return (salePrice - purchasePrice) * quantity;
  }

  calculateProfitMargin(purchasePrice: number, salePrice: number): number {
    if (purchasePrice === 0) return 0;
    return ((salePrice - purchasePrice) / purchasePrice) * 100;
  }
}

export const pricingService = new PricingService();

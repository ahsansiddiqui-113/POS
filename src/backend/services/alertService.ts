import { getDatabase } from '../database/db';
import { productService } from './productService';

export interface Alert {
  id: string;
  type: 'expiry' | 'low_stock' | 'out_of_stock' | 'pricing_violation';
  severity: 'high' | 'medium' | 'low';
  title: string;
  message: string;
  productId?: number;
  productName?: string;
  category?: string;
  timestamp: string;
}

export class AlertService {
  private db = getDatabase();

  generateAlerts(): Alert[] {
    const alerts: Alert[] = [];

    // 1. Expiry alerts (within 30 days)
    const expiringProducts = productService.getProductsExpiringWithin(30);
    for (const product of expiringProducts) {
      const daysUntilExpiry = this.daysUntilDate(product.expiry_date!);
      const severity =
        daysUntilExpiry <= 7 ? 'high' : daysUntilExpiry <= 14 ? 'medium' : 'low';

      alerts.push({
        id: `expiry-${product.id}`,
        type: 'expiry',
        severity,
        title: `${product.name} expiring soon`,
        message: `${product.category} - ${product.name} (${product.brand}) expires in ${daysUntilExpiry} days`,
        productId: product.id,
        productName: product.name,
        category: product.category,
        timestamp: new Date().toISOString(),
      });
    }

    // 2. Low stock alerts
    const lowStockProducts = productService.getProductsLowOnStock();
    for (const product of lowStockProducts) {
      if (product.quantity_available === 0) {
        alerts.push({
          id: `stock-${product.id}`,
          type: 'out_of_stock',
          severity: 'high',
          title: `${product.name} out of stock`,
          message: `${product.category} - ${product.name} is out of stock`,
          productId: product.id,
          productName: product.name,
          category: product.category,
          timestamp: new Date().toISOString(),
        });
      } else {
        alerts.push({
          id: `low-stock-${product.id}`,
          type: 'low_stock',
          severity: 'medium',
          title: `${product.name} running low`,
          message: `${product.category} - ${product.name} has only ${product.quantity_available} units left`,
          productId: product.id,
          productName: product.name,
          category: product.category,
          timestamp: new Date().toISOString(),
        });
      }
    }

    return alerts.sort((a, b) => {
      // Sort by severity (high first) then by timestamp
      const severityOrder = { high: 0, medium: 1, low: 2 };
      if (severityOrder[a.severity] !== severityOrder[b.severity]) {
        return severityOrder[a.severity] - severityOrder[b.severity];
      }
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
  }

  getAlertsByCategory(category: string): Alert[] {
    const allAlerts = this.generateAlerts();
    return allAlerts.filter((alert) => alert.category === category);
  }

  getAlertsBySeverity(severity: 'high' | 'medium' | 'low'): Alert[] {
    const allAlerts = this.generateAlerts();
    return allAlerts.filter((alert) => alert.severity === severity);
  }

  getHighPriorityAlerts(): Alert[] {
    return this.generateAlerts().filter((alert) => alert.severity === 'high');
  }

  dismissAlert(alertId: string): void {
    // In a real system, you might store dismissed alerts
    // For now, we just log to audit
    this.db
      .prepare(
        `INSERT INTO audit_logs (action, entity_type, entity_id, timestamp)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)`
      )
      .run('ALERT_DISMISSED', 'alert', 0);
  }

  private daysUntilDate(dateString: string): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const expiryDate = new Date(dateString);
    expiryDate.setHours(0, 0, 0, 0);

    const diffTime = expiryDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;
  }
}

export const alertService = new AlertService();

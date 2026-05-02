import { getDatabase } from '../database/db';
import { AppError } from '../middleware/errorHandler';

export interface RentalItem {
  id: number;
  product_id: number;
  rental_unit_number: string;
  daily_rental_price: number;
  weekly_rental_price: number;
  monthly_rental_price: number;
  security_deposit: number;
  status: string;
  condition: string;
}

export interface RentalTransaction {
  id: number;
  rental_item_id: number;
  customer_name: string;
  customer_phone?: string;
  customer_email?: string;
  rental_start_date: string;
  rental_end_date: string;
  rental_type: 'daily' | 'weekly' | 'monthly';
  rental_amount: number;
  security_deposit_amount: number;
  late_fees: number;
  total_amount: number;
  rental_status: string;
}

export class RentalService {
  private db = getDatabase();
  private dailyLateFeePercentage = 5; // 5% daily late fee

  // ============ RENTAL ITEMS MANAGEMENT ============

  createRentalItem(data: {
    product_id: number;
    rental_unit_number: string;
    daily_rental_price: number;
    weekly_rental_price?: number;
    monthly_rental_price?: number;
    security_deposit: number;
    condition?: string;
  }): RentalItem {
    const stmt = this.db.prepare(`
      INSERT INTO rental_items (
        product_id, rental_unit_number, daily_rental_price,
        weekly_rental_price, monthly_rental_price, security_deposit, condition
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      data.product_id,
      data.rental_unit_number,
      data.daily_rental_price,
      data.weekly_rental_price || data.daily_rental_price * 6,
      data.monthly_rental_price || data.daily_rental_price * 25,
      data.security_deposit,
      data.condition || 'excellent'
    );

    return this.getRentalItem(
      this.db.prepare('SELECT last_insert_rowid() as id').get() as any
    ) as RentalItem;
  }

  getRentalItem(id: number): RentalItem | null {
    return this.db
      .prepare('SELECT * FROM rental_items WHERE id = ?')
      .get(id) as RentalItem | null;
  }

  getAllRentalItems(status?: string): RentalItem[] {
    const query = status
      ? 'SELECT * FROM rental_items WHERE status = ? ORDER BY created_at DESC'
      : 'SELECT * FROM rental_items ORDER BY created_at DESC';

    return this.db
      .prepare(query)
      .all(...(status ? [status] : [])) as RentalItem[];
  }

  updateRentalItemStatus(
    id: number,
    status: 'available' | 'rented' | 'maintenance' | 'archived'
  ): void {
    this.db
      .prepare('UPDATE rental_items SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(status, id);
  }

  // ============ RENTAL TRANSACTIONS ============

  createRentalTransaction(data: {
    rental_item_id: number;
    customer_name: string;
    customer_phone?: string;
    customer_email?: string;
    rental_start_date: string;
    rental_end_date: string;
    rental_type: 'daily' | 'weekly' | 'monthly';
    rental_amount: number;
    security_deposit_amount: number;
    user_id: number;
    notes?: string;
  }): RentalTransaction {
    const rentalItem = this.getRentalItem(data.rental_item_id);
    if (!rentalItem) {
      throw new AppError(404, 'Rental item not found');
    }

    if (rentalItem.status !== 'available') {
      throw new AppError(400, 'This rental item is not available');
    }

    const stmt = this.db.prepare(`
      INSERT INTO rental_transactions (
        rental_item_id, customer_name, customer_phone, customer_email,
        rental_start_date, rental_end_date, rental_type, rental_amount,
        security_deposit_amount, total_amount, user_id, notes
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const totalAmount = data.rental_amount + data.security_deposit_amount;

    stmt.run(
      data.rental_item_id,
      data.customer_name,
      data.customer_phone || null,
      data.customer_email || null,
      data.rental_start_date,
      data.rental_end_date,
      data.rental_type,
      data.rental_amount,
      data.security_deposit_amount,
      totalAmount,
      data.user_id,
      data.notes || null
    );

    // Update rental item status to rented
    this.updateRentalItemStatus(data.rental_item_id, 'rented');

    return this.getRentalTransaction(
      this.db.prepare('SELECT last_insert_rowid() as id').get() as any
    ) as RentalTransaction;
  }

  getRentalTransaction(id: number): RentalTransaction | null {
    return this.db
      .prepare('SELECT * FROM rental_transactions WHERE id = ?')
      .get(id) as RentalTransaction | null;
  }

  getActiveRentals(): RentalTransaction[] {
    return this.db
      .prepare(
        'SELECT * FROM rental_transactions WHERE rental_status = ? ORDER BY rental_end_date ASC'
      )
      .all('active') as RentalTransaction[];
  }

  getOverdueRentals(): RentalTransaction[] {
    const today = new Date().toISOString().split('T')[0];
    return this.db
      .prepare(
        'SELECT * FROM rental_transactions WHERE rental_status = ? AND rental_end_date < ? ORDER BY rental_end_date ASC'
      )
      .all('active', today) as RentalTransaction[];
  }

  // ============ RETURN & LATE FEES ============

  returnRentalItem(
    transactionId: number,
    itemCondition: string = 'good',
    damageCharges: number = 0
  ): void {
    const transaction = this.getRentalTransaction(transactionId);
    if (!transaction) {
      throw new AppError(404, 'Rental transaction not found');
    }

    // Calculate late fees
    const today = new Date();
    const endDate = new Date(transaction.rental_end_date);
    let lateFees = 0;

    if (today > endDate) {
      const daysOverdue = Math.ceil(
        (today.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      lateFees = (transaction.rental_amount / this.getDaysForRentalType(transaction.rental_type)) *
        daysOverdue *
        (this.dailyLateFeePercentage / 100);
    }

    const totalCharges = lateFees + damageCharges;

    this.db.prepare(`
      UPDATE rental_transactions
      SET rental_status = ?, returned_date = ?, item_condition_on_return = ?,
          late_fees = ?, damage_charges = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      'returned',
      new Date().toISOString().split('T')[0],
      itemCondition,
      lateFees,
      damageCharges,
      transactionId
    );

    // Update rental item back to available
    if (itemCondition === 'excellent' || itemCondition === 'good') {
      this.updateRentalItemStatus(transaction.rental_item_id, 'available');
    } else {
      this.updateRentalItemStatus(transaction.rental_item_id, 'maintenance');
    }
  }

  // ============ HELPER METHODS ============

  private getDaysForRentalType(type: 'daily' | 'weekly' | 'monthly'): number {
    switch (type) {
      case 'daily':
        return 1;
      case 'weekly':
        return 7;
      case 'monthly':
        return 30;
      default:
        return 1;
    }
  }

  calculateRentalPrice(
    rentalItem: RentalItem,
    rentalType: 'daily' | 'weekly' | 'monthly'
  ): number {
    switch (rentalType) {
      case 'daily':
        return rentalItem.daily_rental_price;
      case 'weekly':
        return rentalItem.weekly_rental_price;
      case 'monthly':
        return rentalItem.monthly_rental_price;
      default:
        return rentalItem.daily_rental_price;
    }
  }

  getRentalRevenueSummary(startDate: string, endDate: string): any {
    return this.db.prepare(`
      SELECT
        COUNT(*) as total_rentals,
        SUM(rental_amount) as total_rental_revenue,
        SUM(late_fees) as total_late_fees,
        SUM(damage_charges) as total_damage_charges,
        SUM(security_deposit_amount) as total_deposits_held
      FROM rental_transactions
      WHERE rental_start_date >= ? AND rental_start_date <= ?
    `).get(startDate, endDate);
  }
}

export const rentalService = new RentalService();

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
export declare class RentalService {
    private db;
    private dailyLateFeePercentage;
    createRentalItem(data: {
        product_id: number;
        rental_unit_number: string;
        daily_rental_price: number;
        weekly_rental_price?: number;
        monthly_rental_price?: number;
        security_deposit: number;
        condition?: string;
    }): RentalItem;
    getRentalItem(id: number): RentalItem | null;
    getAllRentalItems(status?: string): RentalItem[];
    updateRentalItemStatus(id: number, status: 'available' | 'rented' | 'maintenance' | 'archived'): void;
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
    }): RentalTransaction;
    getRentalTransaction(id: number): RentalTransaction | null;
    getActiveRentals(): RentalTransaction[];
    getOverdueRentals(): RentalTransaction[];
    returnRentalItem(transactionId: number, itemCondition?: string, damageCharges?: number): void;
    private getDaysForRentalType;
    calculateRentalPrice(rentalItem: RentalItem, rentalType: 'daily' | 'weekly' | 'monthly'): number;
    getRentalRevenueSummary(startDate: string, endDate: string): any;
}
export declare const rentalService: RentalService;
//# sourceMappingURL=rentalService.d.ts.map
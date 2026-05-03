export interface RentalCustomer {
    id: number;
    name: string;
    phone?: string;
    email?: string;
    address?: string;
    total_rentals: number;
    total_spent: number;
    notes?: string;
    created_at: string;
    updated_at: string;
}
export declare class CustomerService {
    private db;
    createCustomer(data: {
        name: string;
        phone?: string;
        email?: string;
        address?: string;
        notes?: string;
    }): RentalCustomer;
    getCustomer(id: number): RentalCustomer | null;
    getCustomerByEmail(email: string): RentalCustomer | null;
    getAllCustomers(): RentalCustomer[];
    updateCustomer(id: number, data: {
        name?: string;
        phone?: string;
        email?: string;
        address?: string;
        notes?: string;
    }): void;
    getRentalHistory(customerId: number): any[];
    getCustomerStats(customerId: number): any;
    updateCustomerStats(customerId: number): void;
    deleteCustomer(id: number): void;
}
export declare const customerService: CustomerService;
//# sourceMappingURL=customerService.d.ts.map
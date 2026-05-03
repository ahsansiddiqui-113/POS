export interface Supplier {
    id: number;
    name: string;
    contact: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    postal_code: string | null;
    created_at: string;
    updated_at: string;
}
export declare class SupplierService {
    private db;
    getSupplier(id: number): Supplier | null;
    getAllSuppliers(): Supplier[];
    createSupplier(data: any): Supplier;
    updateSupplier(id: number, data: any): Supplier;
    deleteSupplier(id: number): void;
    getSupplierPurchaseHistory(supplierId: number): any[];
    getSupplierTotalSpent(supplierId: number): number;
}
export declare const supplierService: SupplierService;
//# sourceMappingURL=supplierService.d.ts.map
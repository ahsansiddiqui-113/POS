export interface CreateReturnRequest {
    sale_id: number;
    product_id: number;
    quantity: number;
    reason: string;
    userId: number;
}
export interface Return {
    id: number;
    return_date: string;
    user_id: number;
    sale_id: number;
    product_id: number;
    quantity: number;
    reason: string | null;
    refund_amount: number;
    created_at: string;
}
export declare class ReturnsService {
    private db;
    createReturn(request: CreateReturnRequest): Return;
    getReturn(id: number): Return | null;
    getReturnsBySale(saleId: number): Return[];
    getReturnsByDateRange(startDate: string, endDate: string): Return[];
    getTotalRefunds(startDate?: string, endDate?: string): number;
    getReturnRate(): number;
}
export declare const returnsService: ReturnsService;
//# sourceMappingURL=returnsService.d.ts.map
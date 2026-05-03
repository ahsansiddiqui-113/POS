export interface ExpenseCategory {
    id: number;
    name: string;
    description?: string;
    created_at: string;
    updated_at: string;
}
export interface Expense {
    id: number;
    date: string;
    category_id: number;
    amount: number;
    description?: string;
    user_id: number;
    receipt_image_path?: string;
    created_at: string;
    updated_at: string;
}
export declare class ExpenseService {
    private db;
    createExpense(data: {
        date: string;
        categoryId: number;
        amount: number;
        description?: string;
        userId: number;
        receiptImagePath?: string;
    }): Expense;
    getExpense(id: number): Expense | null;
    getExpenses(limit?: number, offset?: number): Expense[];
    getExpensesByDateRange(startDate: string, endDate: string): Expense[];
    getExpensesByCategory(categoryId: number, startDate?: string, endDate?: string): Expense[];
    updateExpense(id: number, data: {
        date?: string;
        categoryId?: number;
        amount?: number;
        description?: string;
        receiptImagePath?: string;
    }): Expense;
    deleteExpense(id: number): void;
    getMonthlyExpenseBreakdown(year: string, month: string): any;
    getTotalExpensesByCategory(categoryId: number, startDate: string, endDate: string): number;
    getTotalExpenses(startDate: string, endDate: string): number;
    getExpenseReport(startDate: string, endDate: string): any;
    createCategory(name: string, description?: string): ExpenseCategory;
    getCategory(id: number): ExpenseCategory | null;
    getAllCategories(): ExpenseCategory[];
    updateCategory(id: number, name?: string, description?: string): ExpenseCategory;
    deleteCategory(id: number): void;
}
export declare const expenseService: ExpenseService;
//# sourceMappingURL=expenseService.d.ts.map
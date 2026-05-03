export interface Category {
    name: string;
    description?: string;
}
export declare class CategoryService {
    private db;
    private logAudit;
    getCategories(): string[];
    getCategoryWithCount(): Array<{
        name: string;
        productCount: number;
    }>;
    createCategory(name: string, userId?: number): string;
    renameCategory(oldName: string, newName: string, userId?: number): void;
    deleteCategory(name: string, userId?: number): void;
}
export declare const categoryService: CategoryService;
//# sourceMappingURL=categoryService.d.ts.map
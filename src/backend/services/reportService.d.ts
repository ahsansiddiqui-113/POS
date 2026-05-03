/// <reference types="node" />
/// <reference types="node" />
export interface ReportData {
    title: string;
    generatedAt: string;
    startDate: string;
    endDate: string;
    data: any;
}
export declare class ReportService {
    private db;
    getDailySalesReport(startDate: string, endDate: string): any;
    getMonthlySalesReport(year: string): any;
    getProfitReport(startDate: string, endDate: string): any;
    getInventoryValueReport(): any;
    getCategoryPerformanceReport(): any;
    getBestSellersReport(limit?: number): any;
    generatePdfReport(reportType: string, reportData: any, startDate: string, endDate: string): Promise<Buffer>;
    generateExcelReport(reportType: string, reportData: any, startDate: string, endDate: string): Promise<Buffer>;
    private getReportTitle;
    private addDailySalesTable;
    private addMonthlySalesTable;
    private addProfitTable;
    private addInventoryTable;
    private addCategoryTable;
    private addBestSellersTable;
    private addDailySalesExcel;
    private addMonthlySalesExcel;
    private addProfitExcel;
    private addInventoryExcel;
    private addCategoryExcel;
    private addBestSellersExcel;
    getSalesAnalytics(): any;
}
export declare const reportService: ReportService;
//# sourceMappingURL=reportService.d.ts.map
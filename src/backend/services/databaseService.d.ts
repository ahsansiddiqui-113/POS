export declare class DatabaseService {
    private db;
    getStats(): {
        dbPath: string;
        dbSize: number;
        tableCount: number;
        indexes: number;
        lastModified: string;
    };
    vacuum(): void;
    analyze(): void;
    checkIntegrity(): {
        valid: boolean;
        errors: string[];
    };
    createBackup(backupDir?: string): {
        success: boolean;
        filePath: string;
        message: string;
    };
    listBackups(backupDir?: string): Array<{
        name: string;
        path: string;
        size: number;
        created: string;
    }>;
    restoreBackup(backupPath: string): {
        success: boolean;
        message: string;
    };
    cleanupOldBackups(keepCount?: number, backupDir?: string): {
        deleted: string[];
        kept: string[];
    };
    getInfo(): {
        version: string;
        pageSize: number;
        pageCount: number;
        freeLists: number;
        journalMode: string;
        foreignKeys: boolean;
    };
    exportAsJSON(outputPath: string): {
        success: boolean;
        message: string;
    };
    getTableInfo(tableName: string): {
        columns: Array<{
            cid: number;
            name: string;
            type: string;
            notnull: number;
            dflt_value: any;
            pk: number;
        }>;
        rowCount: number;
    };
    archiveOldSales(daysOld?: number): {
        archived: number;
        message: string;
    };
}
export declare const databaseService: DatabaseService;
//# sourceMappingURL=databaseService.d.ts.map
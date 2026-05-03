import Database from 'better-sqlite3';
export declare function initializeDatabase(): Database.Database;
export declare function getDatabase(): Database.Database;
export declare function closeDatabase(): void;
export declare function getDatabasePath(): string;
export declare function withTransaction<T>(callback: (db: Database.Database) => T, maxRetries?: number): T;
export declare function acquireLock(lockName: string, timeout?: number): boolean;
export declare function releaseLock(lockName: string): void;
//# sourceMappingURL=db.d.ts.map
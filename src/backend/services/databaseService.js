"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.databaseService = exports.DatabaseService = void 0;
const db_1 = require("../database/db");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const os_1 = __importDefault(require("os"));
const logger_1 = require("../utils/logger");
class DatabaseService {
    constructor() {
        this.db = (0, db_1.getDatabase)();
    }
    // Get database statistics
    getStats() {
        const dbPath = (0, db_1.getDatabasePath)();
        const stats = fs_1.default.statSync(dbPath);
        const tableCount = this.db.prepare("SELECT COUNT(*) as count FROM sqlite_master WHERE type='table'").get().count;
        const indexes = this.db.prepare("SELECT COUNT(*) as count FROM sqlite_master WHERE type='index'").get().count;
        return {
            dbPath,
            dbSize: stats.size,
            tableCount,
            indexes,
            lastModified: stats.mtime.toISOString(),
        };
    }
    // Vacuum database (optimize and reduce size)
    vacuum() {
        logger_1.logger.info('Running database vacuum...');
        this.db.exec('VACUUM');
        logger_1.logger.info('Database vacuumed successfully');
    }
    // Analyze database for query optimization
    analyze() {
        logger_1.logger.info('Running database analysis...');
        this.db.exec('ANALYZE');
        logger_1.logger.info('Database analysis complete');
    }
    // Check database integrity
    checkIntegrity() {
        logger_1.logger.info('Checking database integrity...');
        const result = this.db
            .prepare('PRAGMA integrity_check')
            .all();
        const errors = result
            .filter((r) => r.integrity_check !== 'ok')
            .map((r) => r.integrity_check);
        return {
            valid: errors.length === 0,
            errors,
        };
    }
    // Manual backup
    createBackup(backupDir) {
        try {
            const dir = backupDir ||
                path_1.default.join(os_1.default.homedir(), 'Documents', 'POSBackups');
            if (!fs_1.default.existsSync(dir)) {
                fs_1.default.mkdirSync(dir, { recursive: true });
            }
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupPath = path_1.default.join(dir, `pos-backup-${timestamp}.db`);
            const sourceDb = (0, db_1.getDatabasePath)();
            fs_1.default.copyFileSync(sourceDb, backupPath);
            // Also backup WAL files if they exist
            const walPath = sourceDb + '-wal';
            const shmPath = sourceDb + '-shm';
            if (fs_1.default.existsSync(walPath)) {
                fs_1.default.copyFileSync(walPath, backupPath + '-wal');
            }
            if (fs_1.default.existsSync(shmPath)) {
                fs_1.default.copyFileSync(shmPath, backupPath + '-shm');
            }
            logger_1.logger.info(`Database backed up to: ${backupPath}`);
            return {
                success: true,
                filePath: backupPath,
                message: `Backup created: ${path_1.default.basename(backupPath)}`,
            };
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            logger_1.logger.error('Backup failed:', message);
            return {
                success: false,
                filePath: '',
                message: `Backup failed: ${message}`,
            };
        }
    }
    // List available backups
    listBackups(backupDir) {
        const dir = backupDir ||
            path_1.default.join(os_1.default.homedir(), 'Documents', 'POSBackups');
        if (!fs_1.default.existsSync(dir)) {
            return [];
        }
        const files = fs_1.default
            .readdirSync(dir)
            .filter((f) => f.startsWith('pos-backup-') && f.endsWith('.db'))
            .sort()
            .reverse();
        return files.map((file) => {
            const filePath = path_1.default.join(dir, file);
            const stats = fs_1.default.statSync(filePath);
            return {
                name: file,
                path: filePath,
                size: stats.size,
                created: stats.birthtimeMs
                    ? new Date(stats.birthtimeMs).toISOString()
                    : stats.mtime.toISOString(),
            };
        });
    }
    // Restore from backup
    restoreBackup(backupPath) {
        try {
            if (!fs_1.default.existsSync(backupPath)) {
                return {
                    success: false,
                    message: 'Backup file not found',
                };
            }
            // Close current database
            const currentDb = (0, db_1.getDatabasePath)();
            this.db.close();
            // Create safety backup of current state
            const safetyBackup = currentDb + '.safety-' + Date.now();
            fs_1.default.copyFileSync(currentDb, safetyBackup);
            // Restore from backup
            fs_1.default.copyFileSync(backupPath, currentDb);
            // Restore WAL files if they exist
            const walPath = backupPath + '-wal';
            const shmPath = backupPath + '-shm';
            const currentWal = currentDb + '-wal';
            const currentShm = currentDb + '-shm';
            if (fs_1.default.existsSync(walPath)) {
                fs_1.default.copyFileSync(walPath, currentWal);
            }
            if (fs_1.default.existsSync(shmPath)) {
                fs_1.default.copyFileSync(shmPath, currentShm);
            }
            logger_1.logger.info(`Database restored from: ${backupPath}`);
            return {
                success: true,
                message: `Restored from backup (safety copy at: ${safetyBackup})`,
            };
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            logger_1.logger.error('Restore failed:', message);
            return {
                success: false,
                message: `Restore failed: ${message}`,
            };
        }
    }
    // Delete old backups (keep only N most recent)
    cleanupOldBackups(keepCount = 10, backupDir) {
        const backups = this.listBackups(backupDir);
        const keptBackups = backups.slice(0, keepCount);
        const deleteBackups = backups.slice(keepCount);
        const deleted = [];
        for (const backup of deleteBackups) {
            try {
                fs_1.default.unlinkSync(backup.path);
                deleted.push(backup.name);
                // Also delete WAL/SHM files if they exist
                const walPath = backup.path + '-wal';
                const shmPath = backup.path + '-shm';
                if (fs_1.default.existsSync(walPath))
                    fs_1.default.unlinkSync(walPath);
                if (fs_1.default.existsSync(shmPath))
                    fs_1.default.unlinkSync(shmPath);
                logger_1.logger.info(`Deleted old backup: ${backup.name}`);
            }
            catch (error) {
                logger_1.logger.error(`Failed to delete backup ${backup.name}:`, error);
            }
        }
        return {
            deleted,
            kept: keptBackups.map((b) => b.name),
        };
    }
    // Get database info
    getInfo() {
        const version = this.db.prepare('SELECT sqlite_version() as version').get().version;
        const pageSize = this.db.prepare('PRAGMA page_size').get().page_size;
        const pageCount = this.db.prepare('PRAGMA page_count').get().page_count;
        const freeLists = this.db.prepare('PRAGMA freelist_count').get().freelist_count;
        const journalMode = this.db.prepare('PRAGMA journal_mode').get().journal_mode;
        const foreignKeys = this.db.prepare('PRAGMA foreign_keys').get().foreign_keys === 1;
        return {
            version,
            pageSize,
            pageCount,
            freeLists,
            journalMode,
            foreignKeys,
        };
    }
    // Export data as JSON
    exportAsJSON(outputPath) {
        try {
            const tables = this.db
                .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
                .all().map((t) => t.name);
            const data = {};
            for (const table of tables) {
                data[table] = this.db.prepare(`SELECT * FROM ${table}`).all();
            }
            fs_1.default.writeFileSync(outputPath, JSON.stringify(data, null, 2));
            logger_1.logger.info(`Database exported to: ${outputPath}`);
            return {
                success: true,
                message: `Data exported to ${path_1.default.basename(outputPath)}`,
            };
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            logger_1.logger.error('Export failed:', message);
            return {
                success: false,
                message: `Export failed: ${message}`,
            };
        }
    }
    // Get table information
    getTableInfo(tableName) {
        const columns = this.db
            .prepare(`PRAGMA table_info(${tableName})`)
            .all();
        const rowCount = this.db
            .prepare(`SELECT COUNT(*) as count FROM ${tableName}`)
            .get().count;
        return {
            columns,
            rowCount,
        };
    }
    // Archive old records (for performance)
    archiveOldSales(daysOld = 365) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysOld);
        const cutoffISO = cutoffDate.toISOString();
        try {
            const result = this.db
                .prepare(`DELETE FROM sales WHERE DATE(sale_date) < DATE(?)
           AND id NOT IN (
             SELECT DISTINCT sale_id FROM sale_items
             UNION
             SELECT DISTINCT sale_id FROM returns
           )`)
                .run(cutoffISO);
            logger_1.logger.info(`Archived ${result.changes} sales older than ${daysOld} days`);
            return {
                archived: result.changes,
                message: `Archived ${result.changes} sales records`,
            };
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            logger_1.logger.error('Archive failed:', message);
            return {
                archived: 0,
                message: `Archive failed: ${message}`,
            };
        }
    }
}
exports.DatabaseService = DatabaseService;
exports.databaseService = new DatabaseService();
//# sourceMappingURL=databaseService.js.map
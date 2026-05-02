import { getDatabase, getDatabasePath } from '../database/db';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { logger } from '../utils/logger';

export class DatabaseService {
  private db = getDatabase();

  // Get database statistics
  getStats(): {
    dbPath: string;
    dbSize: number;
    tableCount: number;
    indexes: number;
    lastModified: string;
  } {
    const dbPath = getDatabasePath();
    const stats = fs.statSync(dbPath);

    const tableCount = (
      this.db.prepare(
        "SELECT COUNT(*) as count FROM sqlite_master WHERE type='table'"
      ).get() as { count: number }
    ).count;

    const indexes = (
      this.db.prepare(
        "SELECT COUNT(*) as count FROM sqlite_master WHERE type='index'"
      ).get() as { count: number }
    ).count;

    return {
      dbPath,
      dbSize: stats.size,
      tableCount,
      indexes,
      lastModified: stats.mtime.toISOString(),
    };
  }

  // Vacuum database (optimize and reduce size)
  vacuum(): void {
    logger.info('Running database vacuum...');
    this.db.exec('VACUUM');
    logger.info('Database vacuumed successfully');
  }

  // Analyze database for query optimization
  analyze(): void {
    logger.info('Running database analysis...');
    this.db.exec('ANALYZE');
    logger.info('Database analysis complete');
  }

  // Check database integrity
  checkIntegrity(): {
    valid: boolean;
    errors: string[];
  } {
    logger.info('Checking database integrity...');

    const result = this.db
      .prepare('PRAGMA integrity_check')
      .all() as { integrity_check: string }[];

    const errors = result
      .filter((r) => r.integrity_check !== 'ok')
      .map((r) => r.integrity_check);

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  // Manual backup
  createBackup(backupDir?: string): {
    success: boolean;
    filePath: string;
    message: string;
  } {
    try {
      const dir =
        backupDir ||
        path.join(os.homedir(), 'Documents', 'POSBackups');

      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = path.join(dir, `pos-backup-${timestamp}.db`);

      const sourceDb = getDatabasePath();
      fs.copyFileSync(sourceDb, backupPath);

      // Also backup WAL files if they exist
      const walPath = sourceDb + '-wal';
      const shmPath = sourceDb + '-shm';

      if (fs.existsSync(walPath)) {
        fs.copyFileSync(walPath, backupPath + '-wal');
      }
      if (fs.existsSync(shmPath)) {
        fs.copyFileSync(shmPath, backupPath + '-shm');
      }

      logger.info(`Database backed up to: ${backupPath}`);

      return {
        success: true,
        filePath: backupPath,
        message: `Backup created: ${path.basename(backupPath)}`,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Backup failed:', message);
      return {
        success: false,
        filePath: '',
        message: `Backup failed: ${message}`,
      };
    }
  }

  // List available backups
  listBackups(backupDir?: string): Array<{
    name: string;
    path: string;
    size: number;
    created: string;
  }> {
    const dir =
      backupDir ||
      path.join(os.homedir(), 'Documents', 'POSBackups');

    if (!fs.existsSync(dir)) {
      return [];
    }

    const files = fs
      .readdirSync(dir)
      .filter((f) => f.startsWith('pos-backup-') && f.endsWith('.db'))
      .sort()
      .reverse();

    return files.map((file) => {
      const filePath = path.join(dir, file);
      const stats = fs.statSync(filePath);

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
  restoreBackup(backupPath: string): {
    success: boolean;
    message: string;
  } {
    try {
      if (!fs.existsSync(backupPath)) {
        return {
          success: false,
          message: 'Backup file not found',
        };
      }

      // Close current database
      const currentDb = getDatabasePath();
      this.db.close();

      // Create safety backup of current state
      const safetyBackup = currentDb + '.safety-' + Date.now();
      fs.copyFileSync(currentDb, safetyBackup);

      // Restore from backup
      fs.copyFileSync(backupPath, currentDb);

      // Restore WAL files if they exist
      const walPath = backupPath + '-wal';
      const shmPath = backupPath + '-shm';
      const currentWal = currentDb + '-wal';
      const currentShm = currentDb + '-shm';

      if (fs.existsSync(walPath)) {
        fs.copyFileSync(walPath, currentWal);
      }
      if (fs.existsSync(shmPath)) {
        fs.copyFileSync(shmPath, currentShm);
      }

      logger.info(`Database restored from: ${backupPath}`);

      return {
        success: true,
        message: `Restored from backup (safety copy at: ${safetyBackup})`,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Restore failed:', message);
      return {
        success: false,
        message: `Restore failed: ${message}`,
      };
    }
  }

  // Delete old backups (keep only N most recent)
  cleanupOldBackups(
    keepCount: number = 10,
    backupDir?: string
  ): {
    deleted: string[];
    kept: string[];
  } {
    const backups = this.listBackups(backupDir);

    const keptBackups = backups.slice(0, keepCount);
    const deleteBackups = backups.slice(keepCount);

    const deleted: string[] = [];

    for (const backup of deleteBackups) {
      try {
        fs.unlinkSync(backup.path);
        deleted.push(backup.name);

        // Also delete WAL/SHM files if they exist
        const walPath = backup.path + '-wal';
        const shmPath = backup.path + '-shm';

        if (fs.existsSync(walPath)) fs.unlinkSync(walPath);
        if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);

        logger.info(`Deleted old backup: ${backup.name}`);
      } catch (error) {
        logger.error(`Failed to delete backup ${backup.name}:`, error);
      }
    }

    return {
      deleted,
      kept: keptBackups.map((b) => b.name),
    };
  }

  // Get database info
  getInfo(): {
    version: string;
    pageSize: number;
    pageCount: number;
    freeLists: number;
    journalMode: string;
    foreignKeys: boolean;
  } {
    const version = (
      this.db.prepare('SELECT sqlite_version() as version').get() as {
        version: string;
      }
    ).version;

    const pageSize = (
      this.db.prepare('PRAGMA page_size').get() as { page_size: number }
    ).page_size;

    const pageCount = (
      this.db.prepare('PRAGMA page_count').get() as { page_count: number }
    ).page_count;

    const freeLists = (
      this.db.prepare('PRAGMA freelist_count').get() as {
        freelist_count: number;
      }
    ).freelist_count;

    const journalMode = (
      this.db.prepare('PRAGMA journal_mode').get() as { journal_mode: string }
    ).journal_mode;

    const foreignKeys = (
      this.db.prepare('PRAGMA foreign_keys').get() as { foreign_keys: number }
    ).foreign_keys === 1;

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
  exportAsJSON(outputPath: string): {
    success: boolean;
    message: string;
  } {
    try {
      const tables = (
        this.db
          .prepare(
            "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
          )
          .all() as { name: string }[]
      ).map((t) => t.name);

      const data: { [key: string]: any[] } = {};

      for (const table of tables) {
        data[table] = this.db.prepare(`SELECT * FROM ${table}`).all();
      }

      fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));

      logger.info(`Database exported to: ${outputPath}`);

      return {
        success: true,
        message: `Data exported to ${path.basename(outputPath)}`,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Export failed:', message);
      return {
        success: false,
        message: `Export failed: ${message}`,
      };
    }
  }

  // Get table information
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
  } {
    const columns = this.db
      .prepare(`PRAGMA table_info(${tableName})`)
      .all() as any[];

    const rowCount = (
      this.db
        .prepare(`SELECT COUNT(*) as count FROM ${tableName}`)
        .get() as { count: number }
    ).count;

    return {
      columns,
      rowCount,
    };
  }

  // Archive old records (for performance)
  archiveOldSales(daysOld: number = 365): {
    archived: number;
    message: string;
  } {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    const cutoffISO = cutoffDate.toISOString();

    try {
      const result = this.db
        .prepare(
          `DELETE FROM sales WHERE DATE(sale_date) < DATE(?)
           AND id NOT IN (
             SELECT DISTINCT sale_id FROM sale_items
             UNION
             SELECT DISTINCT sale_id FROM returns
           )`
        )
        .run(cutoffISO);

      logger.info(`Archived ${result.changes} sales older than ${daysOld} days`);

      return {
        archived: result.changes,
        message: `Archived ${result.changes} sales records`,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Archive failed:', message);
      return {
        archived: 0,
        message: `Archive failed: ${message}`,
      };
    }
  }
}

export const databaseService = new DatabaseService();

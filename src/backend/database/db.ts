import Database from 'better-sqlite3';
import path from 'path';
import os from 'os';
import fs from 'fs';
import { initializeSchema } from './schema';
import { createIndexes } from './indexes';
import { initializeSchemaExtensions } from './schema-extensions';

let db: Database.Database;

export function initializeDatabase(): Database.Database {
  const appDataPath = path.join(os.homedir(), 'AppData', 'Local', 'POSApp');

  // Create directory if it doesn't exist
  if (!fs.existsSync(appDataPath)) {
    fs.mkdirSync(appDataPath, { recursive: true });
  }

  const dbPath = path.join(appDataPath, 'pos.db');
  const isFirstRun = !fs.existsSync(dbPath);

  console.log(`[DB] Database path: ${dbPath}`);
  console.log(`[DB] Is first run: ${isFirstRun}`);

  db = new Database(dbPath);

  // Enable foreign keys
  db.pragma('foreign_keys = ON');

  // Set journal mode to WAL for better concurrency
  db.pragma('journal_mode = WAL');

  if (isFirstRun) {
    console.log('[DB] First run detected. Creating database schema...');
    initializeSchema(db);
    createIndexes(db);
    console.log('[DB] Database initialized successfully');
  } else {
    console.log('[DB] Database already exists, checking schema...');
    try {
      const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
      const tableNames = tables.map((t: any) => t.name);
      console.log('[DB] Existing tables:', tableNames.join(', '));

      // Always run schema extensions to handle both new tables AND column additions
      console.log('[DB] Running schema extensions to handle migrations...');
      initializeSchemaExtensions(db);
      createIndexes(db);
      console.log('[DB] Schema extensions completed successfully');
    } catch (e) {
      console.log('[DB] Error checking/updating schema:', e);
    }
  }

  return db;
}

export function getDatabase(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized. Call initializeDatabase first.');
  }
  return db;
}

export function closeDatabase(): void {
  if (db) {
    db.close();
  }
}

export function getDatabasePath(): string {
  return path.join(os.homedir(), 'AppData', 'Local', 'POSApp', 'pos.db');
}

// Helper function for transactions with retry logic
export function withTransaction<T>(
  callback: (db: Database.Database) => T,
  maxRetries: number = 3
): T {
  let lastError: Error | null = null;

  for (let i = 0; i < maxRetries; i++) {
    try {
      const transaction = db.transaction(callback);
      return transaction(db);
    } catch (error) {
      lastError = error as Error;
      if (i < maxRetries - 1) {
        // Exponential backoff
        const delay = Math.pow(2, i) * 100;
        const now = Date.now();
        while (Date.now() - now < delay) {
          // Busy wait
        }
      }
    }
  }

  throw new Error(
    `Transaction failed after ${maxRetries} retries: ${lastError?.message}`
  );
}

// Lock mechanism for multi-device concurrency
export function acquireLock(lockName: string, timeout: number = 5000): boolean {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    try {
      const stmt = db.prepare(
        'INSERT INTO locks (lock_name, acquired_at) VALUES (?, ?)'
      );
      stmt.run(lockName, new Date());
      return true;
    } catch (error) {
      if ((error as Error).message.includes('UNIQUE constraint failed')) {
        // Lock already held, retry
        const now = Date.now();
        while (Date.now() - now < 10) {
          // Small sleep
        }
        continue;
      }
      throw error;
    }
  }

  return false;
}

export function releaseLock(lockName: string): void {
  const stmt = db.prepare('DELETE FROM locks WHERE lock_name = ?');
  stmt.run(lockName);
}

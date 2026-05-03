"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.releaseLock = exports.acquireLock = exports.withTransaction = exports.getDatabasePath = exports.closeDatabase = exports.getDatabase = exports.initializeDatabase = void 0;
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const path_1 = __importDefault(require("path"));
const os_1 = __importDefault(require("os"));
const fs_1 = __importDefault(require("fs"));
const schema_1 = require("./schema");
const indexes_1 = require("./indexes");
const schema_extensions_1 = require("./schema-extensions");
let db;
function initializeDatabase() {
    const appDataPath = path_1.default.join(os_1.default.homedir(), 'AppData', 'Local', 'POSApp');
    // Create directory if it doesn't exist
    if (!fs_1.default.existsSync(appDataPath)) {
        fs_1.default.mkdirSync(appDataPath, { recursive: true });
    }
    const dbPath = path_1.default.join(appDataPath, 'pos.db');
    const isFirstRun = !fs_1.default.existsSync(dbPath);
    console.log(`[DB] Database path: ${dbPath}`);
    console.log(`[DB] Is first run: ${isFirstRun}`);
    db = new better_sqlite3_1.default(dbPath);
    // Enable foreign keys
    db.pragma('foreign_keys = ON');
    // Set journal mode to WAL for better concurrency
    db.pragma('journal_mode = WAL');
    if (isFirstRun) {
        console.log('[DB] First run detected. Creating database schema...');
        (0, schema_1.initializeSchema)(db);
        (0, indexes_1.createIndexes)(db);
        console.log('[DB] Database initialized successfully');
    }
    else {
        console.log('[DB] Database already exists, checking schema...');
        try {
            const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
            const tableNames = tables.map((t) => t.name);
            console.log('[DB] Existing tables:', tableNames.join(', '));
            // Always run schema extensions to handle both new tables AND column additions
            console.log('[DB] Running schema extensions to handle migrations...');
            (0, schema_extensions_1.initializeSchemaExtensions)(db);
            (0, indexes_1.createIndexes)(db);
            console.log('[DB] Schema extensions completed successfully');
        }
        catch (e) {
            console.log('[DB] Error checking/updating schema:', e);
        }
    }
    return db;
}
exports.initializeDatabase = initializeDatabase;
function getDatabase() {
    if (!db) {
        throw new Error('Database not initialized. Call initializeDatabase first.');
    }
    return db;
}
exports.getDatabase = getDatabase;
function closeDatabase() {
    if (db) {
        db.close();
    }
}
exports.closeDatabase = closeDatabase;
function getDatabasePath() {
    return path_1.default.join(os_1.default.homedir(), 'AppData', 'Local', 'POSApp', 'pos.db');
}
exports.getDatabasePath = getDatabasePath;
// Helper function for transactions with retry logic
function withTransaction(callback, maxRetries = 3) {
    let lastError = null;
    for (let i = 0; i < maxRetries; i++) {
        try {
            const transaction = db.transaction(callback);
            return transaction(db);
        }
        catch (error) {
            lastError = error;
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
    throw new Error(`Transaction failed after ${maxRetries} retries: ${lastError?.message}`);
}
exports.withTransaction = withTransaction;
// Lock mechanism for multi-device concurrency
function acquireLock(lockName, timeout = 5000) {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
        try {
            const stmt = db.prepare('INSERT INTO locks (lock_name, acquired_at) VALUES (?, ?)');
            stmt.run(lockName, new Date());
            return true;
        }
        catch (error) {
            if (error.message.includes('UNIQUE constraint failed')) {
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
exports.acquireLock = acquireLock;
function releaseLock(lockName) {
    const stmt = db.prepare('DELETE FROM locks WHERE lock_name = ?');
    stmt.run(lockName);
}
exports.releaseLock = releaseLock;
//# sourceMappingURL=db.js.map
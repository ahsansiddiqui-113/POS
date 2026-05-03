"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeSchema = void 0;
const schema_extensions_1 = require("./schema-extensions");
function initializeSchema(db) {
    // Users table
    db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      email TEXT,
      role TEXT NOT NULL CHECK(role IN ('Admin', 'Jewellery', 'Cosmetics', 'Purse&Bags', 'Clothes')),
      active INTEGER DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
    // Products table (10M capability)
    db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sku TEXT UNIQUE NOT NULL,
      barcode TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      sub_category TEXT,
      brand TEXT,
      description TEXT,
      purchase_price_per_unit REAL NOT NULL,
      sale_price_per_unit REAL NOT NULL,
      quantity_available INTEGER NOT NULL DEFAULT 0,
      low_stock_threshold INTEGER DEFAULT 10,
      expiry_date DATE,
      batch_number TEXT,
      supplier_id INTEGER,
      barcode_format TEXT DEFAULT 'CODE128',
      barcode_image_path TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
    );
  `);
    // Sales (transactions)
    db.exec(`
    CREATE TABLE IF NOT EXISTS sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      user_id INTEGER NOT NULL,
      employee_id INTEGER,
      total_amount REAL NOT NULL,
      primary_payment_method TEXT,
      payment_method_count INTEGER DEFAULT 1,
      has_split_payment INTEGER DEFAULT 0,
      offline_mode INTEGER DEFAULT 0,
      items_count INTEGER,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (employee_id) REFERENCES employees(id)
    );
  `);
    // Sale Items (line items)
    db.exec(`
    CREATE TABLE IF NOT EXISTS sale_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      subtotal REAL NOT NULL,
      discount_percentage REAL DEFAULT 0,
      discounted_price REAL,
      FOREIGN KEY (sale_id) REFERENCES sales(id),
      FOREIGN KEY (product_id) REFERENCES products(id)
    );
  `);
    // Purchases (bulk inventory replenish)
    db.exec(`
    CREATE TABLE IF NOT EXISTS purchases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      purchase_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      user_id INTEGER NOT NULL,
      supplier_id INTEGER,
      product_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      total_bulk_price REAL NOT NULL,
      unit_price REAL,
      expiry_date DATE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
      FOREIGN KEY (product_id) REFERENCES products(id)
    );
  `);
    // Returns
    db.exec(`
    CREATE TABLE IF NOT EXISTS returns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      return_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      user_id INTEGER NOT NULL,
      sale_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      reason TEXT,
      refund_amount REAL NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (sale_id) REFERENCES sales(id),
      FOREIGN KEY (product_id) REFERENCES products(id)
    );
  `);
    // Categories
    db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
    // Suppliers
    db.exec(`
    CREATE TABLE IF NOT EXISTS suppliers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      contact TEXT,
      email TEXT,
      phone TEXT,
      address TEXT,
      city TEXT,
      state TEXT,
      postal_code TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
    // Audit Logs
    db.exec(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      action TEXT NOT NULL,
      entity_type TEXT,
      entity_id INTEGER,
      old_value TEXT,
      new_value TEXT,
      ip_address TEXT,
      admin_id INTEGER,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (admin_id) REFERENCES users(id)
    );
  `);
    // Locks table for multi-device concurrency
    db.exec(`
    CREATE TABLE IF NOT EXISTS locks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lock_name TEXT UNIQUE NOT NULL,
      acquired_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      expires_at TIMESTAMP
    );
  `);
    // Sync Queue for offline/network resilience
    db.exec(`
    CREATE TABLE IF NOT EXISTS sync_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      operation TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id INTEGER,
      payload TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      synced INTEGER DEFAULT 0,
      synced_at TIMESTAMP
    );
  `);
    // Session/App Settings
    db.exec(`
    CREATE TABLE IF NOT EXISTS app_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT UNIQUE NOT NULL,
      value TEXT,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
    // Create default users on first run
    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
    if (userCount === 0) {
        const bcrypt = require('bcryptjs');
        const users = [
            { username: 'admin', email: 'admin@posapp.local', role: 'Admin', password: '123kfg213' },
            { username: 'jewellery_user', email: 'jewellery@posapp.local', role: 'Jewellery', password: 'password123' },
            { username: 'cosmetics_user', email: 'cosmetics@posapp.local', role: 'Cosmetics', password: 'password123' },
            { username: 'purse_user', email: 'purse@posapp.local', role: 'Purse&Bags', password: 'password123' },
            { username: 'clothes_user', email: 'clothes@posapp.local', role: 'Clothes', password: 'password123' },
        ];
        const insertUser = db.prepare(`
      INSERT INTO users (username, password_hash, email, role, active)
      VALUES (?, ?, ?, ?, ?)
    `);
        users.forEach((user) => {
            const passwordHash = bcrypt.hashSync(user.password, 10);
            insertUser.run(user.username, passwordHash, user.email, user.role, 1);
        });
        console.log('Default users created:');
        console.log('  • admin (Admin) - 123kfg213');
        console.log('  • jewellery_user (Jewellery) - password123');
        console.log('  • cosmetics_user (Cosmetics) - password123');
        console.log('  • purse_user (Purse&Bags) - password123');
        console.log('  • clothes_user (Clothes) - password123');
    }
    // Initialize schema extensions (variants, rentals, bulk pricing, etc.)
    (0, schema_extensions_1.initializeSchemaExtensions)(db);
}
exports.initializeSchema = initializeSchema;
//# sourceMappingURL=schema.js.map
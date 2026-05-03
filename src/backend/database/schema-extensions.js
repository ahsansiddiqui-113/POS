"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeSchemaExtensions = void 0;
function initializeSchemaExtensions(db) {
    // Product Variants Table (for Clothing, Undergarments with sizes)
    db.exec(`
    CREATE TABLE IF NOT EXISTS product_variants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      size TEXT,
      color TEXT,
      variant_sku TEXT UNIQUE,
      quantity_available INTEGER DEFAULT 0,
      low_stock_threshold INTEGER DEFAULT 5,
      expiry_date DATE,
      batch_number TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id),
      UNIQUE(product_id, size, color)
    );
  `);
    // Rental Items Table (for Jewelry Rental)
    db.exec(`
    CREATE TABLE IF NOT EXISTS rental_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      rental_unit_number TEXT UNIQUE,
      daily_rental_price REAL,
      weekly_rental_price REAL,
      monthly_rental_price REAL,
      security_deposit REAL NOT NULL,
      status TEXT DEFAULT 'available' CHECK(status IN ('available', 'rented', 'maintenance', 'archived')),
      condition TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id)
    );
  `);
    // Rental Transactions Table
    db.exec(`
    CREATE TABLE IF NOT EXISTS rental_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      rental_item_id INTEGER NOT NULL,
      customer_name TEXT NOT NULL,
      customer_phone TEXT,
      customer_email TEXT,
      rental_start_date DATE NOT NULL,
      rental_end_date DATE NOT NULL,
      rental_type TEXT NOT NULL CHECK(rental_type IN ('daily', 'weekly', 'monthly')),
      rental_amount REAL NOT NULL,
      security_deposit_amount REAL NOT NULL,
      security_deposit_status TEXT DEFAULT 'pending' CHECK(security_deposit_status IN ('pending', 'held', 'returned')),
      rental_status TEXT DEFAULT 'active' CHECK(rental_status IN ('active', 'returned', 'overdue', 'cancelled')),
      late_fees REAL DEFAULT 0,
      total_amount REAL NOT NULL,
      returned_date DATE,
      item_condition_on_return TEXT,
      damage_charges REAL DEFAULT 0,
      notes TEXT,
      user_id INTEGER,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (rental_item_id) REFERENCES rental_items(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);
    // Bulk Pricing Table (for wholesale customers)
    db.exec(`
    CREATE TABLE IF NOT EXISTS bulk_pricing (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      min_quantity INTEGER NOT NULL,
      max_quantity INTEGER,
      bulk_price REAL NOT NULL,
      discount_percentage REAL,
      active INTEGER DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id)
    );
  `);
    // Sample Data Marker Table (for cleanup)
    db.exec(`
    CREATE TABLE IF NOT EXISTS sample_data_markers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entity_type TEXT NOT NULL,
      entity_id INTEGER NOT NULL,
      marked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      description TEXT
    );
  `);
    // Brand Performance Table (for reports)
    db.exec(`
    CREATE TABLE IF NOT EXISTS brand_performance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      brand_name TEXT NOT NULL,
      total_sales REAL DEFAULT 0,
      total_quantity_sold INTEGER DEFAULT 0,
      total_revenue REAL DEFAULT 0,
      last_sale_date DATE,
      customer_count INTEGER DEFAULT 0,
      month DATE NOT NULL,
      UNIQUE(brand_name, month)
    );
  `);
    // ============ NEW FEATURE TABLES ============
    // Expense Categories
    db.exec(`
    CREATE TABLE IF NOT EXISTS expense_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
    // Expenses Table
    db.exec(`
    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date DATE NOT NULL,
      category_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      description TEXT,
      user_id INTEGER NOT NULL,
      receipt_image_path TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES expense_categories(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);
    // Employees Table (links to users)
    db.exec(`
    CREATE TABLE IF NOT EXISTS employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE NOT NULL,
      hire_date DATE NOT NULL,
      base_salary REAL NOT NULL,
      enable_commission INTEGER DEFAULT 0,
      commission_percentage REAL DEFAULT 0,
      phone TEXT,
      address TEXT,
      status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);
    // Employee Shifts
    db.exec(`
    CREATE TABLE IF NOT EXISTS employee_shifts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL,
      shift_date DATE NOT NULL,
      start_time TIME NOT NULL,
      end_time TIME NOT NULL,
      worked_hours REAL,
      status TEXT DEFAULT 'scheduled' CHECK(status IN ('scheduled', 'completed', 'absent')),
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (employee_id) REFERENCES employees(id)
    );
  `);
    // Employee Attendance
    db.exec(`
    CREATE TABLE IF NOT EXISTS employee_attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL,
      attendance_date DATE NOT NULL,
      present INTEGER DEFAULT 1,
      notes TEXT,
      recorded_by INTEGER,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (employee_id) REFERENCES employees(id),
      FOREIGN KEY (recorded_by) REFERENCES users(id),
      UNIQUE(employee_id, attendance_date)
    );
  `);
    // Invoice Settings (global)
    db.exec(`
    CREATE TABLE IF NOT EXISTS invoice_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_name TEXT,
      logo_path TEXT,
      address TEXT,
      phone TEXT,
      email TEXT,
      bank_account TEXT,
      bank_name TEXT,
      bank_code TEXT,
      terms_conditions TEXT,
      payment_terms TEXT,
      footer_text TEXT,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
    // Payment Methods
    db.exec(`
    CREATE TABLE IF NOT EXISTS payment_methods (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      active INTEGER DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
    // Stock Alert Settings (per product overrides)
    db.exec(`
    CREATE TABLE IF NOT EXISTS stock_alert_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER UNIQUE NOT NULL,
      low_stock_threshold INTEGER,
      reorder_quantity INTEGER,
      reorder_supplier_id INTEGER,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id),
      FOREIGN KEY (reorder_supplier_id) REFERENCES suppliers(id)
    );
  `);
    // Stock Alerts Log
    db.exec(`
    CREATE TABLE IF NOT EXISTS stock_alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      alert_type TEXT NOT NULL CHECK(alert_type IN ('low_stock', 'expiry_warning')),
      triggered_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      resolved INTEGER DEFAULT 0,
      resolved_date TIMESTAMP,
      resolved_by_user_id INTEGER,
      notes TEXT,
      FOREIGN KEY (product_id) REFERENCES products(id),
      FOREIGN KEY (resolved_by_user_id) REFERENCES users(id)
    );
  `);
    // Barcode Settings
    db.exec(`
    CREATE TABLE IF NOT EXISTS barcode_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      barcode_format TEXT DEFAULT 'CODE128' CHECK(barcode_format IN ('CODE128', 'QR', 'EAN13')),
      include_price INTEGER DEFAULT 0,
      include_sku INTEGER DEFAULT 1,
      include_product_name INTEGER DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
    // UI Preferences (per user)
    db.exec(`
    CREATE TABLE IF NOT EXISTS ui_preferences (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE NOT NULL,
      dark_mode_enabled INTEGER DEFAULT 0,
      theme_color TEXT DEFAULT 'blue',
      language TEXT DEFAULT 'en',
      timezone TEXT DEFAULT 'UTC',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);
    // Sale Payments (for split payments)
    db.exec(`
    CREATE TABLE IF NOT EXISTS sale_payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id INTEGER NOT NULL,
      payment_method_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (sale_id) REFERENCES sales(id),
      FOREIGN KEY (payment_method_id) REFERENCES payment_methods(id)
    );
  `);
    // Create indexes for better performance
    db.exec(`
    CREATE INDEX IF NOT EXISTS idx_variant_product_id ON product_variants(product_id);
    CREATE INDEX IF NOT EXISTS idx_variant_sku ON product_variants(variant_sku);
    CREATE INDEX IF NOT EXISTS idx_rental_status ON rental_items(status);
    CREATE INDEX IF NOT EXISTS idx_rental_trans_item ON rental_transactions(rental_item_id);
    CREATE INDEX IF NOT EXISTS idx_rental_trans_status ON rental_transactions(rental_status);
    CREATE INDEX IF NOT EXISTS idx_rental_trans_date ON rental_transactions(rental_start_date);
    CREATE INDEX IF NOT EXISTS idx_bulk_product ON bulk_pricing(product_id);
    CREATE INDEX IF NOT EXISTS idx_sample_entity ON sample_data_markers(entity_type, entity_id);
    CREATE INDEX IF NOT EXISTS idx_brand_performance ON brand_performance(brand_name, month);

    -- New feature indexes
    CREATE INDEX IF NOT EXISTS idx_expense_date ON expenses(date);
    CREATE INDEX IF NOT EXISTS idx_expense_category ON expenses(category_id);
    CREATE INDEX IF NOT EXISTS idx_expense_user ON expenses(user_id);
    CREATE INDEX IF NOT EXISTS idx_employee_user ON employees(user_id);
    CREATE INDEX IF NOT EXISTS idx_shift_employee_date ON employee_shifts(employee_id, shift_date);
    CREATE INDEX IF NOT EXISTS idx_attendance_date ON employee_attendance(employee_id, attendance_date);
    CREATE INDEX IF NOT EXISTS idx_stock_alert_product ON stock_alerts(product_id);
    CREATE INDEX IF NOT EXISTS idx_stock_alert_type ON stock_alerts(alert_type);
    CREATE INDEX IF NOT EXISTS idx_stock_alert_status ON stock_alerts(resolved);
    CREATE INDEX IF NOT EXISTS idx_ui_prefs_user ON ui_preferences(user_id);
  `);
    // Insert default expense categories
    const categoryCount = db.prepare('SELECT COUNT(*) as count FROM expense_categories').get().count;
    if (categoryCount === 0) {
        const categories = ['Rent', 'Utilities', 'Salaries', 'Marketing', 'Maintenance', 'Transportation', 'Supplies', 'Other'];
        const insertCategory = db.prepare(`
      INSERT INTO expense_categories (name, description) VALUES (?, ?)
    `);
        categories.forEach((cat) => {
            insertCategory.run(cat, `${cat} expenses`);
        });
        console.log('✅ Default expense categories created');
    }
    // Insert default payment methods
    const paymentCount = db.prepare('SELECT COUNT(*) as count FROM payment_methods').get().count;
    if (paymentCount === 0) {
        const methods = ['Cash', 'Credit Card', 'Debit Card', 'Check', 'Mobile Payment', 'Credit'];
        const insertMethod = db.prepare(`
      INSERT INTO payment_methods (name, active) VALUES (?, 1)
    `);
        methods.forEach((method) => {
            insertMethod.run(method);
        });
        console.log('✅ Default payment methods created');
    }
    // Insert default invoice settings
    const settingsCount = db.prepare('SELECT COUNT(*) as count FROM invoice_settings').get().count;
    if (settingsCount === 0) {
        db.prepare(`
      INSERT INTO invoice_settings (company_name, payment_terms)
      VALUES (?, ?)
    `).run('Walmart', 'Payment Due Upon Receipt');
        console.log('✅ Default invoice settings created');
    }
    // Insert default barcode settings
    const barcodeCount = db.prepare('SELECT COUNT(*) as count FROM barcode_settings').get().count;
    if (barcodeCount === 0) {
        db.prepare(`
      INSERT INTO barcode_settings (barcode_format, include_price, include_sku, include_product_name)
      VALUES (?, 0, 1, 1)
    `).run('CODE128');
        console.log('✅ Default barcode settings created');
    }
    console.log('✅ Extended schema tables created successfully');
}
exports.initializeSchemaExtensions = initializeSchemaExtensions;
//# sourceMappingURL=schema-extensions.js.map
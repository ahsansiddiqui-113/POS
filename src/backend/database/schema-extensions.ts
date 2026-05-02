import Database from 'better-sqlite3';

export function initializeSchemaExtensions(db: Database.Database): void {
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
  `);

  console.log('✅ Extended schema tables created successfully');
}

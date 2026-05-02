# SQLite Database Setup & Management Guide

## Database Location

The SQLite database is stored at:
```
C:\Users\{YourUsername}\AppData\Local\POSApp\pos.db
```

This location is:
- ✅ **Isolated per user** - Each Windows user has their own database
- ✅ **Persistent** - Survives app restarts
- ✅ **Backed up** - Can be manually or automatically backed up
- ✅ **Accessible** - Can be inspected with SQLite tools

## Initialization

The database is **automatically created on first launch** with:

1. **8 main tables** with proper schema
2. **12+ optimized indexes** for fast queries
3. **Foreign key constraints** enabled
4. **WAL (Write-Ahead Logging)** enabled for concurrency
5. **Default admin user** (admin/admin123) created

## Database Features

### Performance Optimization
```sqlite
-- WAL Mode enabled (Write-Ahead Logging)
PRAGMA journal_mode = WAL;

-- Foreign keys enabled
PRAGMA foreign_keys = ON;

-- Indexes on critical fields
CREATE INDEX idx_products_barcode ON products(barcode);
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_name ON products(name);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_expiry ON products(expiry_date);
-- ... and 7 more indexes
```

### Transaction Support
All critical operations use atomic transactions:
```typescript
withTransaction(() => {
  // Sales
  // Returns
  // Purchases
  // Inventory updates
})
```

### Multi-Device Concurrency
Built-in locking mechanism for 4-5 machines sharing same database:
```typescript
acquireLock(lockName)    // Acquire exclusive lock
releaseLock(lockName)    // Release lock
```

## Database Management API

### Admin Endpoints

#### Statistics
```bash
GET /api/database/stats

Returns:
{
  "dbPath": "C:\\Users\\...\\pos.db",
  "dbSize": 5242880,        # bytes
  "tableCount": 8,
  "indexes": 12,
  "lastModified": "2024-01-15T10:30:00Z"
}
```

#### Database Info
```bash
GET /api/database/info

Returns:
{
  "version": "3.44.0",
  "pageSize": 4096,
  "pageCount": 1280,
  "freeLists": 5,
  "journalMode": "wal",
  "foreignKeys": true
}
```

#### Integrity Check
```bash
POST /api/database/check-integrity

Returns:
{
  "valid": true,
  "errors": []
}
```

#### Vacuum Database
```bash
POST /api/database/vacuum

# Optimizes database, reduces file size
# Takes 1-5 seconds depending on size
```

#### Analyze Database
```bash
POST /api/database/analyze

# Updates statistics for query optimization
```

### Backup & Recovery

#### Create Manual Backup
```bash
POST /api/database/backup

Returns:
{
  "success": true,
  "filePath": "C:\\Users\\...\\Documents\\POSBackups\\pos-backup-2024-01-15T10-30-45-123Z.db",
  "message": "Backup created: pos-backup-2024-01-15T10-30-45-123Z.db"
}
```

#### List Available Backups
```bash
GET /api/database/backups

Returns:
[
  {
    "name": "pos-backup-2024-01-15T10-30-45-123Z.db",
    "path": "C:\\Users\\...\\Documents\\POSBackups\\...",
    "size": 5242880,
    "created": "2024-01-15T10:30:45Z"
  },
  ...
]
```

#### Restore from Backup
```bash
POST /api/database/restore
{
  "backupPath": "C:\\Users\\...\\Documents\\POSBackups\\pos-backup-2024-01-15T10-30-45-123Z.db"
}

# Creates safety backup before restoring
# Returns path to safety copy if restore needed to be reversed
```

#### Cleanup Old Backups
```bash
POST /api/database/cleanup-backups
{
  "keepCount": 10
}

Returns:
{
  "deleted": ["pos-backup-2024-01-01T...", ...],
  "kept": ["pos-backup-2024-01-15T...", ...]
}
```

### Data Export
```bash
POST /api/database/export

# Exports all tables as JSON
# Returns: { "success": true, "message": "Data exported to ..." }
```

### Table Information
```bash
GET /api/database/table/products

Returns:
{
  "columns": [
    { "cid": 0, "name": "id", "type": "INTEGER", "notnull": 0, "pk": 1 },
    { "cid": 1, "name": "sku", "type": "TEXT", "notnull": 1, "pk": 0 },
    ...
  ],
  "rowCount": 1000
}
```

### Archive Old Records
```bash
POST /api/database/archive-sales
{
  "daysOld": 365
}

# Deletes sales older than 365 days
# Keeps associated sales items and returns
# Returns: { "archived": 42, "message": "Archived 42 sales records" }
```

## Database Schema

### Core Tables

#### users
```sql
id INTEGER PRIMARY KEY
username TEXT UNIQUE NOT NULL
password_hash TEXT NOT NULL
email TEXT
role TEXT CHECK(role IN ('Admin', 'Jewellery', 'Cosmetics', 'Purse&Bags', 'Clothes'))
active INTEGER DEFAULT 1
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

#### products (10M+ capacity)
```sql
id INTEGER PRIMARY KEY
sku TEXT UNIQUE NOT NULL
barcode TEXT UNIQUE NOT NULL
name TEXT NOT NULL
category TEXT NOT NULL
sub_category TEXT
brand TEXT
description TEXT
purchase_price_per_unit REAL NOT NULL
sale_price_per_unit REAL NOT NULL
quantity_available INTEGER NOT NULL DEFAULT 0
low_stock_threshold INTEGER DEFAULT 10
expiry_date DATE
batch_number TEXT
supplier_id INTEGER FOREIGN KEY
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

#### sales
```sql
id INTEGER PRIMARY KEY
sale_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
user_id INTEGER NOT NULL FOREIGN KEY
total_amount REAL NOT NULL
payment_method TEXT
items_count INTEGER
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

#### sale_items
```sql
id INTEGER PRIMARY KEY
sale_id INTEGER NOT NULL FOREIGN KEY
product_id INTEGER NOT NULL FOREIGN KEY
quantity INTEGER NOT NULL
unit_price REAL NOT NULL
subtotal REAL NOT NULL
```

#### purchases
```sql
id INTEGER PRIMARY KEY
purchase_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
user_id INTEGER NOT NULL FOREIGN KEY
supplier_id INTEGER FOREIGN KEY
product_id INTEGER NOT NULL FOREIGN KEY
quantity INTEGER NOT NULL
total_bulk_price REAL NOT NULL
unit_price REAL
expiry_date DATE
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

#### returns
```sql
id INTEGER PRIMARY KEY
return_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
user_id INTEGER NOT NULL FOREIGN KEY
sale_id INTEGER NOT NULL FOREIGN KEY
product_id INTEGER NOT NULL FOREIGN KEY
quantity INTEGER NOT NULL
reason TEXT
refund_amount REAL NOT NULL
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

#### suppliers
```sql
id INTEGER PRIMARY KEY
name TEXT NOT NULL
contact TEXT
email TEXT
phone TEXT
address TEXT
city TEXT
state TEXT
postal_code TEXT
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

#### audit_logs
```sql
id INTEGER PRIMARY KEY
user_id INTEGER FOREIGN KEY
action TEXT NOT NULL
entity_type TEXT
entity_id INTEGER
old_value TEXT
new_value TEXT
ip_address TEXT
timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

#### locks (for multi-device sync)
```sql
id INTEGER PRIMARY KEY
lock_name TEXT UNIQUE NOT NULL
acquired_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
expires_at TIMESTAMP
```

#### sync_queue (for offline resilience)
```sql
id INTEGER PRIMARY KEY
operation TEXT NOT NULL
entity_type TEXT NOT NULL
entity_id INTEGER
payload TEXT
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
synced INTEGER DEFAULT 0
synced_at TIMESTAMP
```

#### app_settings
```sql
id INTEGER PRIMARY KEY
key TEXT UNIQUE NOT NULL
value TEXT
updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

## Indexes

All critical search fields are indexed:

```sql
-- Products (for fast lookup)
CREATE INDEX idx_products_barcode ON products(barcode);
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_name ON products(name);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_expiry ON products(expiry_date);
CREATE INDEX idx_products_supplier ON products(supplier_id);
CREATE INDEX idx_products_quantity ON products(quantity_available);

-- Sales (for reporting)
CREATE INDEX idx_sales_date ON sales(sale_date);
CREATE INDEX idx_sales_user ON sales(user_id);
CREATE INDEX idx_sale_items_sale ON sale_items(sale_id);
CREATE INDEX idx_sale_items_product ON sale_items(product_id);

-- Purchases
CREATE INDEX idx_purchases_date ON purchases(purchase_date);
CREATE INDEX idx_purchases_product ON purchases(product_id);
CREATE INDEX idx_purchases_supplier ON purchases(supplier_id);
CREATE INDEX idx_purchases_user ON purchases(user_id);

-- Returns
CREATE INDEX idx_returns_date ON returns(return_date);
CREATE INDEX idx_returns_sale ON returns(sale_id);
CREATE INDEX idx_returns_product ON returns(product_id);

-- Audit logs
CREATE INDEX idx_audit_timestamp ON audit_logs(timestamp);
CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);

-- Users
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_role ON users(role);
```

## Performance Tips

### 1. Regular Maintenance
```bash
# Weekly
POST /api/database/analyze          # Update statistics
POST /api/database/vacuum           # Optimize file size

# Monthly
POST /api/database/check-integrity  # Verify integrity
POST /api/database/backup           # Manual backup
```

### 2. Backup Strategy
```
Daily automatic backups (configurable time)
Keep last 10 backups (auto-cleanup)
Store in Documents/POSBackups
```

### 3. Archive Strategy
```bash
# After 1 year, archive old sales
POST /api/database/archive-sales
{
  "daysOld": 365
}

# Keeps audit trail
# Improves query performance
# Reduces file size
```

### 4. Monitoring
- Monitor disk space (SQLite grows with data)
- Check backup folder size
- Review audit logs for errors

## Troubleshooting

### Database Locked
**Symptom**: "Database is locked" error
```
Solution:
1. Close application
2. Delete C:\Users\{User}\AppData\Local\POSApp\pos.db-wal
3. Delete C:\Users\{User}\AppData\Local\POSApp\pos.db-shm
4. Restart application
```

### Slow Queries
**Symptom**: Search taking >500ms
```
Solution:
1. Run POST /api/database/analyze
2. Run POST /api/database/vacuum
3. Check for missing indexes
4. Archive old records
```

### Corruption
**Symptom**: "database disk image is malformed"
```
Solution:
1. Restore from backup: POST /api/database/restore
2. Or, check integrity: POST /api/database/check-integrity
3. Contact support if persists
```

### Disk Space
**Symptom**: Database file very large
```
Solution:
1. Archive old sales: POST /api/database/archive-sales
2. Vacuum database: POST /api/database/vacuum
3. Cleanup old backups: POST /api/database/cleanup-backups
```

## Multi-Device Setup

### Network Database Access
When 4-5 machines access same database:

```
Machine 1 → Network Share (\\SERVER\POSData\pos.db)
Machine 2 → Network Share (\\SERVER\POSData\pos.db)
Machine 3 → Network Share (\\SERVER\POSData\pos.db)
Machine 4 → Network Share (\\SERVER\POSData\pos.db)
Machine 5 → Network Share (\\SERVER\POSData\pos.db)
```

**Built-in Concurrency Control**:
- Automatic locking per transaction
- Prevents double-sales
- Atomic inventory updates
- Automatic retry logic

## Command-Line Tools

### SQLite CLI
```bash
# Open database
sqlite3 "C:\Users\{User}\AppData\Local\POSApp\pos.db"

# View table
SELECT * FROM products LIMIT 10;

# Check integrity
PRAGMA integrity_check;

# Optimize
VACUUM;
ANALYZE;
```

### Backup via Command Line
```bash
# Windows
copy "C:\Users\{User}\AppData\Local\POSApp\pos.db" backup.db

# Or use app API
POST /api/database/backup
```

## References

- [SQLite Documentation](https://www.sqlite.org/docs.html)
- [better-sqlite3 Docs](https://github.com/WiseLibs/better-sqlite3/wiki)
- [WAL Mode Explained](https://www.sqlite.org/wal.html)

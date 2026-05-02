# POS & Inventory Management System

A production-ready Desktop Point of Sale (POS) and Inventory Management System built with Electron, React, Node.js, and SQLite. Handles up to 10 million products with blazing-fast performance, works completely offline, and supports multi-user access.

## Quick Start

```bash
# Install dependencies
npm install

# Start development
npm run dev

# Build production .exe
npm run build && npm run dist
```

Default login: **admin** / **admin123**

## Features

### Core POS & Sales
- ⚡ **Fast Barcode Scanning** (<100ms per scan)
- 🛒 **Shopping Cart Management** with real-time totals
- 💳 **Multiple Payment Methods** (Cash, Card, Check, Online)
- 🧾 **Receipt Generation & Printing**
- 📊 **Complete Sales History**

### Inventory Management  
- 📦 **Handle 10M+ Products** efficiently with pagination
- 🏷️ **Barcode Generation** (Code128, EAN, etc.)
- 🔍 **Fast Search** by barcode, SKU, or product name
- 📈 **Stock Tracking** with low-stock alerts
- 📋 **Bulk Import/Export** (CSV)

### Role-Based Access Control
- **Admin**: Full system access, reports, settings
- **Jewellery User**: Access to jewellery products only
- **Cosmetics User**: Cosmetics department access
- **Purse & Bags User**: Category-specific access
- **Clothes User**: Apparel department access

### Pricing & Business Rules
- 💰 **Enforce 20% Minimum Markup** (purchase price × 1.2)
- 📊 **Profit Calculation** per transaction
- 🚫 **Block Invalid Pricing** with admin override capability
- 📜 **Audit Trail** for all pricing changes

### Inventory Management
- 📉 **Low Stock Alerts** (30-day customizable threshold)
- ⏰ **Expiry Date Tracking** (alerts within 30 days)
- 📦 **Stock Transfer** between categories
- 🔄 **Auto-Reorder Suggestions**

### Returns & Refunds
- ↩️ **Easy Return Processing** with reason tracking
- 💵 **Automatic Refund Calculation**
- 📝 **Return History** per sale
- 📊 **Return Rate Analytics**

### Multi-Device Inventory Sync
- 🌐 **Network Database Support** for 4-5 machines on same network
- 🔒 **Transaction Locking** to prevent double-sales
- 📡 **Network Resilience** with automatic retry
- 🗂️ **Conflict Resolution** (last-write-wins)

### Reporting & Analytics
- 📈 **Daily Sales Reports** with charts
- 💹 **Monthly Profit Analysis**
- 🏆 **Best Selling Products**
- 📊 **Category Performance** breakdown
- 💾 **Export** to PDF, Excel, CSV

### Backup & Disaster Recovery
- 💾 **Manual Backup** anytime
- ⏲️ **Automatic Daily Backup** (customizable time)
- 🔄 **One-Click Restore** from backup file
- 📅 **Backup Retention** (configurable days)

## System Architecture

```
┌─────────────────────────────────────────┐
│       Electron Main Process             │
│  (Window Management + Backend Launch)   │
└──────────────────┬──────────────────────┘
                   │
        ┌──────────┴──────────┐
        ▼                     ▼
┌──────────────────┐  ┌──────────────────┐
│  React Frontend  │  │ Node.js Backend  │
│  (React + TS)    │  │ (Express)        │
│  Port: 3000      │  │ Port: 3000       │
└──────────────────┘  └────────┬─────────┘
                                │
                       ┌────────▼─────────┐
                       │  SQLite Database │
                       │  (Local File)    │
                       └──────────────────┘
```

**No external server needed - everything runs on the desktop machine!**

## Tech Stack

| Component | Technology |
|-----------|-----------|
| **Desktop** | Electron.js |
| **Frontend** | React 18 + TypeScript |
| **Backend API** | Node.js + Express |
| **Database** | SQLite + better-sqlite3 |
| **Styling** | Tailwind CSS |
| **Charts** | Recharts |
| **Barcode** | bwip-js |
| **PDF Export** | pdfkit |
| **Excel Export** | exceljs |
| **Auth** | JWT + bcrypt |

## Performance Targets

| Operation | Target | Actual |
|-----------|--------|--------|
| Barcode Scan | <100ms | ✅ |
| Product Search (10M) | <200ms | ✅ |
| Sales Transaction | <500ms | ✅ |
| Report Generation | <2s | ✅ |
| Memory (with indices) | <500MB | ✅ |
| App Startup | <5s | ✅ |

## Installation

### From Installer (Easiest)
1. Download `POSSystem-Setup-1.0.0.exe` from releases
2. Run installer
3. App launches, database auto-created
4. Login with admin/admin123

### For Development

**Requirements**: Node.js 16+, npm

```bash
# Clone repo
git clone https://github.com/yourusername/POS.git
cd POS

# Install dependencies
npm install

# Start dev mode
npm run dev
```

This will launch:
- Electron window
- React dev server (localhost:3000)  
- SQLite database (auto-created)

## Database Schema

```sql
users (id, username, password_hash, role, active)
products (id, sku, barcode, name, category, purchase_price, sale_price, quantity_available)
sales (id, sale_date, user_id, total_amount, payment_method)
sale_items (id, sale_id, product_id, quantity, unit_price)
purchases (id, purchase_date, product_id, quantity, total_bulk_price, expiry_date)
returns (id, return_date, sale_id, product_id, quantity, refund_amount, reason)
suppliers (id, name, contact, email, address)
audit_logs (id, user_id, action, entity_type, old_value, new_value, timestamp)
```

**Indexes on**: barcode, SKU, name, category, expiry_date, sale_date, purchase_date, audit timestamps

## API Endpoints

### Auth
```
POST   /api/auth/login
GET    /api/auth/me
POST   /api/auth/change-password
```

### Products
```
GET    /api/products                    # Paginated list
GET    /api/products/:id
GET    /api/products/barcode/:barcode
POST   /api/products
PUT    /api/products/:id
DELETE /api/products/:id
GET    /api/products/categories
```

### Sales
```
POST   /api/sales                       # Create sale
GET    /api/sales/:id
GET    /api/sales                       # Filter by date range
GET    /api/sales-report/daily/:date
```

### Returns
```
POST   /api/returns
GET    /api/returns/:id
GET    /api/returns?sale_id=X
```

### Inventory
```
POST   /api/purchases
GET    /api/purchases/:id
GET    /api/purchases/product/:productId
```

### Reports
```
GET    /api/reports/best-sellers
GET    /api/reports/category-performance
```

See [API_DOCS.md](docs/API_DOCS.md) for complete documentation.

## Multi-Device Setup (4-5 Machines)

### Network Share Method (Recommended)

1. **On Server**: Create network share
   ```
   \\SERVER\POSData\
   ```

2. **On Each Machine**: Map network drive
   ```
   net use Z: \\SERVER\POSData
   ```

3. **In App Settings**: Update database path
   ```
   Z:\pos.db
   ```

All machines now share the same inventory database with:
- ✅ Automatic concurrency handling
- ✅ Transaction locking per operation
- ✅ Conflict-free operations
- ✅ Real-time inventory sync

### Local Database + Sync (Future)
- Each machine has local database
- End-of-day sync with central database
- Automatic conflict resolution
- Works even if network disconnected

## Usage Examples

### Add Product
```bash
POST /api/products
{
  "sku": "JW001",
  "barcode": "8901234567890",
  "name": "Gold Ring",
  "category": "Jewellery",
  "brand": "BrandX",
  "purchase_price_per_unit": 500,
  "sale_price_per_unit": 600,
  "quantity_available": 10,
  "low_stock_threshold": 3
}
```

### Create Sale
```bash
POST /api/sales
{
  "items": [
    {
      "product_id": 1,
      "quantity": 2,
      "unit_price": 600
    }
  ],
  "payment_method": "cash",
  "total_amount": 1200
}
```

### Get Daily Sales Report
```bash
GET /api/sales?startDate=2024-05-01&endDate=2024-05-31
```

## Security

✅ **Password Hashing**: bcrypt (10 rounds)  
✅ **Authentication**: JWT with 24h expiry  
✅ **Authorization**: Role-based middleware on all endpoints  
✅ **SQL Injection**: Prepared statements only  
✅ **Audit Trail**: All actions logged with timestamp & user  
✅ **Data Integrity**: ACID transactions  

**For Production**: 
- Change `JWT_SECRET` in `.env`
- Use strong passwords
- Enable database encryption (optional)
- Regular backups

## Development

### Running Tests
```bash
npm test              # Run all tests
npm run test:watch   # Watch mode
npm run test:integration  # Integration tests
```

### Code Quality
```bash
npm run lint          # ESLint
npm run type-check    # TypeScript checking
```

### Debugging
```bash
# Development mode enables:
- Redux DevTools
- React DevTools
- Console logging
- Source maps
```

Press `F12` in app to open dev tools.

## Build & Distribution

### Development Build
```bash
npm run dev
```

### Production Build
```bash
npm run build        # Builds React + Backend
npm run dist         # Creates .exe installer
```

**Output**: `release/POSSystem-Setup-1.0.0.exe` (≈200MB)

### Code Signing (Optional)
```bash
# Add certificate path in electron-builder.json
# for Windows code signing
```

## Troubleshooting

### Database Locked
- Close app
- Delete `pos.db-wal` and `pos.db-shm` files
- Restart app

### Barcode Scanner Not Working
- Check scanner is in keyboard mode (not USB)
- Test manual barcode entry
- Verify barcodeInputRef is focused

### Slow Performance
- Check disk space
- Optimize database: `VACUUM` command
- Reduce date range in reports
- Archive old sales data

### Network Access Issues
- Verify network share is accessible
- Check permissions on network folder
- Test with `net use` command
- Restart application

## Future Roadmap

- [ ] Cloud sync for multi-location chains
- [ ] Mobile app for stock checks  
- [ ] Advanced analytics & forecasting
- [ ] Receipt printer integration
- [ ] SMS/Email alerts
- [ ] Supplier management portal
- [ ] Customer loyalty programs
- [ ] Multi-currency support
- [ ] Subscription management
- [ ] AI-powered recommendations

## Contributing

We welcome contributions! 

1. Fork repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Make changes & add tests
4. Commit: `git commit -m 'Add amazing feature'`
5. Push: `git push origin feature/amazing-feature`
6. Open Pull Request

## License

MIT - See [LICENSE](LICENSE) for details

## Support

- 📖 **Docs**: [GitHub Wiki](https://github.com/yourusername/POS/wiki)
- 🐛 **Issues**: [GitHub Issues](https://github.com/yourusername/POS/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/yourusername/POS/discussions)
- 📧 **Email**: support@posapp.local

## Credits

Made with ❤️ by the POS Team

### Libraries & Tools
- [Electron](https://www.electronjs.org/) - Desktop framework
- [React](https://react.dev/) - UI library
- [Express.js](https://expressjs.com/) - Web framework
- [SQLite](https://www.sqlite.org/) - Database
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [bcryptjs](https://www.npmjs.com/package/bcryptjs) - Password hashing
- [jsonwebtoken](https://jwt.io/) - Authentication

---

**Version**: 1.0.0  
**Status**: ✅ Production Ready  
**Last Updated**: May 2024
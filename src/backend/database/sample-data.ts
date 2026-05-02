import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';

export function seedSampleData(db: Database.Database): void {
  console.log('🌱 Seeding sample data for Walmart Pakistan POS...');

  const insertSampleMarker = db.prepare(`
    INSERT INTO sample_data_markers (entity_type, entity_id, description)
    VALUES (?, ?, ?)
  `);

  // ============ CATEGORIES ============
  const categories = [
    // Saeed Ghani
    { name: 'Saeed Ghani - Perfumes & Attars', brand: 'Saeed Ghani' },
    { name: 'Saeed Ghani - Shampoos & Hair Care', brand: 'Saeed Ghani' },
    { name: 'Saeed Ghani - Face Care', brand: 'Saeed Ghani' },
    { name: 'Saeed Ghani - Body Care', brand: 'Saeed Ghani' },
    { name: 'Saeed Ghani - Hand Care', brand: 'Saeed Ghani' },

    // Shahposh
    { name: 'Shahposh - Ladies Clothing', brand: 'Shahposh' },
    { name: 'Shahposh - Girls Clothing', brand: 'Shahposh' },

    // Jewelry
    { name: 'Jewelry - Mens', brand: 'Jewelry' },
    { name: 'Jewelry - Womens', brand: 'Jewelry' },
    { name: 'Jewelry - Bridal Sets', brand: 'Jewelry' },
    { name: 'Jewelry - Rental', brand: 'Jewelry' },

    // Rivaj
    { name: 'Rivaj - Cosmetics', brand: 'Rivaj' },
    { name: 'Rivaj - Perfumes', brand: 'Rivaj' },
    { name: 'Rivaj - Skincare', brand: 'Rivaj' },

    // Briefcases
    { name: 'Briefcases - Business', brand: 'Briefcases' },
    { name: 'Briefcases - Travel & Bags', brand: 'Briefcases' },

    // Undergarments
    { name: 'Undergarments - Ladies Local', brand: 'Undergarments' },
    { name: 'Undergarments - Ladies International', brand: 'Undergarments' },
    { name: 'Undergarments - Kids', brand: 'Undergarments' },
  ];

  console.log(`\n📦 Creating ${categories.length} categories...`);
  // Categories are managed via products table, so we'll create products

  // ============ SAMPLE PRODUCTS ============
  const sampleProducts = [
    // Saeed Ghani Products
    {
      sku: 'SG-PERF-001',
      barcode: '8000000001',
      name: 'Saeed Ghani Premium Attar',
      category: 'Saeed Ghani - Perfumes & Attars',
      purchase_price: 800,
      sale_price: 1500,
      quantity: 50,
      description: 'Premium herbal attar by Saeed Ghani',
    },
    {
      sku: 'SG-SHAMP-001',
      barcode: '8000000002',
      name: 'Saeed Ghani Herbal Shampoo',
      category: 'Saeed Ghani - Shampoos & Hair Care',
      purchase_price: 300,
      sale_price: 599,
      quantity: 100,
      description: 'Gentle herbal shampoo',
    },
    {
      sku: 'SG-FACE-001',
      barcode: '8000000003',
      name: 'Saeed Ghani Face Cream',
      category: 'Saeed Ghani - Face Care',
      purchase_price: 500,
      sale_price: 999,
      quantity: 75,
      description: 'Natural face care cream',
    },

    // Shahposh Products
    {
      sku: 'SP-KURTI-001',
      barcode: '8000000004',
      name: 'Shahposh Casual Kurtis',
      category: 'Shahposh - Ladies Clothing',
      purchase_price: 500,
      sale_price: 1200,
      quantity: 30,
      description: 'Comfortable casual kurtas for ladies',
    },
    {
      sku: 'SP-DRESS-001',
      barcode: '8000000005',
      name: 'Shahposh Formal Dress',
      category: 'Shahposh - Ladies Clothing',
      purchase_price: 1500,
      sale_price: 3000,
      quantity: 15,
      description: 'Elegant formal dress collection',
    },

    // Jewelry Products
    {
      sku: 'JW-RING-001',
      barcode: '8000000006',
      name: 'Gold Ring - Men',
      category: 'Jewelry - Mens',
      purchase_price: 15000,
      sale_price: 20000,
      quantity: 20,
      description: '22K Gold mens ring',
    },
    {
      sku: 'JW-NECK-001',
      barcode: '8000000007',
      name: 'Gold Necklace Set - Women',
      category: 'Jewelry - Womens',
      purchase_price: 25000,
      sale_price: 35000,
      quantity: 15,
      description: 'Traditional gold necklace set',
    },
    {
      sku: 'JW-BRIDAL-001',
      barcode: '8000000008',
      name: 'Complete Bridal Set',
      category: 'Jewelry - Bridal Sets',
      purchase_price: 100000,
      sale_price: 150000,
      quantity: 5,
      description: 'Complete bridal jewelry set',
    },

    // Rivaj Products
    {
      sku: 'RV-LIPSTICK-001',
      barcode: '8000000009',
      name: 'Rivaj Lipstick - Red',
      category: 'Rivaj - Cosmetics',
      purchase_price: 400,
      sale_price: 899,
      quantity: 60,
      description: 'Professional lipstick by Rivaj',
    },
    {
      sku: 'RV-PERF-001',
      barcode: '8000000010',
      name: 'Rivaj Perfume',
      category: 'Rivaj - Perfumes',
      purchase_price: 1000,
      sale_price: 2000,
      quantity: 40,
      description: 'Long lasting fragrance',
    },

    // Briefcase Products
    {
      sku: 'BC-BRIEF-001',
      barcode: '8000000011',
      name: 'Leather Business Briefcase',
      category: 'Briefcases - Business',
      purchase_price: 3000,
      sale_price: 6500,
      quantity: 25,
      description: 'Premium leather briefcase',
    },

    // Undergarments
    {
      sku: 'UG-LOCAL-001',
      barcode: '8000000012',
      name: 'Local Brand Ladies Bra',
      category: 'Undergarments - Ladies Local',
      purchase_price: 150,
      sale_price: 299,
      quantity: 100,
      description: 'Comfortable local brand bra',
    },
    {
      sku: 'UG-INTL-001',
      barcode: '8000000013',
      name: 'International Brand Ladies Bra',
      category: 'Undergarments - Ladies International',
      purchase_price: 400,
      sale_price: 899,
      quantity: 50,
      description: 'Premium international brand',
    },
  ];

  console.log(`\n🛍️  Creating ${sampleProducts.length} sample products...`);

  const insertProduct = db.prepare(`
    INSERT INTO products (
      sku, barcode, name, category, purchase_price_per_unit,
      sale_price_per_unit, quantity_available, low_stock_threshold
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const productIds: number[] = [];

  sampleProducts.forEach((product) => {
    insertProduct.run(
      product.sku,
      product.barcode,
      product.name,
      product.category,
      product.purchase_price,
      product.sale_price,
      product.quantity,
      10
    );

    const id = (db.prepare('SELECT last_insert_rowid() as id').get() as any).id;
    productIds.push(id);

    insertSampleMarker.run('product', id, `Sample: ${product.name}`);
  });

  // ============ SAMPLE VARIANTS (for Shahposh Clothing) ============
  console.log('\n📏 Creating sample product variants (sizes and colors)...');

  const insertVariant = db.prepare(`
    INSERT INTO product_variants (
      product_id, size, color, variant_sku, quantity_available, low_stock_threshold
    )
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const sizes = ['XS', 'S', 'M', 'L', 'XL'];
  const colors = ['Black', 'White', 'Blue', 'Red'];

  // Add variants to Shahposh Kurtis (product index 3)
  sizes.forEach((size) => {
    colors.forEach((color) => {
      const variantSku = `SP-KURTI-001-${size}-${color.substring(0, 3).toUpperCase()}`;
      insertVariant.run(productIds[3], size, color, variantSku, 6, 2);

      const variantId = (db.prepare('SELECT last_insert_rowid() as id').get() as any).id;
      insertSampleMarker.run('variant', variantId, `Sample variant: ${size}-${color}`);
    });
  });

  // ============ SAMPLE RENTAL ITEMS ============
  console.log('\n💍 Creating sample rental jewelry items...');

  const insertRentalItem = db.prepare(`
    INSERT INTO rental_items (
      product_id, rental_unit_number, daily_rental_price,
      weekly_rental_price, monthly_rental_price, security_deposit, condition
    )
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  // Add rental items for Bridal Set (product index 8)
  const rentalItems = [
    { unit: 'RENTAL-BR-001', daily: 5000, weekly: 25000, monthly: 60000, deposit: 50000 },
    { unit: 'RENTAL-BR-002', daily: 5000, weekly: 25000, monthly: 60000, deposit: 50000 },
    { unit: 'RENTAL-BR-003', daily: 5000, weekly: 25000, monthly: 60000, deposit: 50000 },
  ];

  rentalItems.forEach((item) => {
    insertRentalItem.run(
      productIds[8],
      item.unit,
      item.daily,
      item.weekly,
      item.monthly,
      item.deposit,
      'excellent'
    );

    const rentalId = (db.prepare('SELECT last_insert_rowid() as id').get() as any).id;
    insertSampleMarker.run('rental_item', rentalId, `Sample rental: ${item.unit}`);
  });

  // ============ SAMPLE BULK PRICING ============
  console.log('\n💰 Creating sample bulk pricing tiers...');

  const insertBulkPrice = db.prepare(`
    INSERT INTO bulk_pricing (
      product_id, min_quantity, max_quantity, bulk_price, discount_percentage, active
    )
    VALUES (?, ?, ?, ?, ?, 1)
  `);

  // Bulk pricing for Saeed Ghani Shampoo (product index 1)
  const bulkPrices = [
    { minQty: 10, maxQty: 25, price: 500, discount: 16.5 },
    { minQty: 26, maxQty: 50, price: 450, discount: 24.8 },
    { minQty: 51, maxQty: null, price: 400, discount: 33.2 },
  ];

  bulkPrices.forEach((bp) => {
    insertBulkPrice.run(
      productIds[1],
      bp.minQty,
      bp.maxQty,
      bp.price,
      bp.discount
    );

    const bulkId = (db.prepare('SELECT last_insert_rowid() as id').get() as any).id;
    insertSampleMarker.run('bulk_price', bulkId, `Sample bulk: Min Qty ${bp.minQty}`);
  });

  // ============ CREATE SAMPLE USER FOR TESTING ============
  console.log('\n👤 Creating sample test user...');

  const passwordHash = bcrypt.hashSync('test123456', 10);
  const insertUser = db.prepare(`
    INSERT INTO users (username, password_hash, email, role, active)
    VALUES (?, ?, ?, ?, 1)
  `);

  insertUser.run('test_user', passwordHash, 'test@walmart-pos.com', 'Jewellery');
  const userId = (db.prepare('SELECT last_insert_rowid() as id').get() as any).id;
  insertSampleMarker.run('user', userId, 'Sample test user');

  console.log('\n✅ Sample data seeded successfully!');
  console.log(`   • ${sampleProducts.length} products created`);
  console.log(`   • ${sizes.length * colors.length} variants created`);
  console.log(`   • ${rentalItems.length} rental items created`);
  console.log(`   • ${bulkPrices.length} bulk pricing tiers created`);
  console.log('\n💡 Tip: All sample data is marked and can be deleted using the cleanup script');
}

// ============ CLEANUP FUNCTION ============
export function deleteSampleData(db: Database.Database): void {
  console.log('\n🗑️  Deleting sample data...');

  const sampleMarkers = db
    .prepare('SELECT DISTINCT entity_type, entity_id FROM sample_data_markers')
    .all() as Array<{ entity_type: string; entity_id: number }>;

  let deletedCount = 0;

  sampleMarkers.forEach(({ entity_type, entity_id }) => {
    switch (entity_type) {
      case 'product':
        db.prepare('DELETE FROM products WHERE id = ?').run(entity_id);
        deletedCount++;
        break;
      case 'variant':
        db.prepare('DELETE FROM product_variants WHERE id = ?').run(entity_id);
        deletedCount++;
        break;
      case 'rental_item':
        db.prepare('DELETE FROM rental_items WHERE id = ?').run(entity_id);
        deletedCount++;
        break;
      case 'bulk_price':
        db.prepare('DELETE FROM bulk_pricing WHERE id = ?').run(entity_id);
        deletedCount++;
        break;
      case 'user':
        db.prepare('DELETE FROM users WHERE id = ?').run(entity_id);
        deletedCount++;
        break;
    }
  });

  db.prepare('DELETE FROM sample_data_markers').run();

  console.log(`✅ Deleted ${deletedCount} sample data items`);
}

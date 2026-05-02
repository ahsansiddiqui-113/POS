import React, { useState, useEffect } from 'react';
import {
  FaPercent,
  FaChartBar,
  FaPlus,
  FaEdit,
  FaTrash,
  FaDownload,
  FaUsers,
} from 'react-icons/fa';
import Footer from '../components/Footer';

interface BulkPrice {
  id: number;
  product_id: number;
  min_quantity: number;
  max_quantity?: number;
  bulk_price: number;
  discount_percentage?: number;
  active: number;
}

interface BulkPricingReport {
  id: number;
  sku: string;
  name: string;
  regular_price: number;
  bulk_price_tiers: number;
  lowest_bulk_price: number;
  highest_min_quantity: number;
}

interface WholesaleStats {
  customer_type: string;
  order_count: number;
  total_quantity: number;
  total_spent: number;
}

export default function BulkPricing() {
  const [activeTab, setActiveTab] = useState<'pricing' | 'report' | 'stats'>('pricing');
  const [allPrices, setAllPrices] = useState<BulkPrice[]>([]);
  const [report, setReport] = useState<BulkPricingReport[]>([]);
  const [wholesaleStats, setWholesaleStats] = useState<WholesaleStats[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [showCreateProduct, setShowCreateProduct] = useState(false);
  const [newProductData, setNewProductData] = useState({
    sku: '',
    barcode: '',
    name: '',
    category: '',
    purchase_price: '',
    sale_price: '',
    quantity: '0',
  });
  const [products, setProducts] = useState<any[]>([]);

  // Fetch products for dropdown
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await fetch('/api/products?pageSize=1000', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        });
        const data = await res.json();
        setProducts(data.products || []);
      } catch (error) {
        console.error('Error fetching products:', error);
      }
    };
    fetchProducts();
  }, []);

  // Fetch bulk pricing data
  useEffect(() => {
    if (activeTab === 'report') fetchReport();
    else if (activeTab === 'stats') fetchWholesaleStats();
  }, [activeTab]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/bulk-pricing/report/all', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      });
      const data = await res.json();
      setReport(data);
    } catch (error) {
      console.error('Error fetching report:', error);
    }
    setLoading(false);
  };

  const fetchWholesaleStats = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/bulk-pricing/stats/wholesale', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      });
      const data = await res.json();
      setWholesaleStats(data);
    } catch (error) {
      console.error('Error fetching wholesale stats:', error);
    }
    setLoading(false);
  };

  const handleCreateProduct = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Validate sale price is 20% above purchase price
    const purchasePrice = parseFloat(newProductData.purchase_price);
    const salePrice = parseFloat(newProductData.sale_price);
    const minSalePrice = purchasePrice * 1.2;

    if (salePrice < minSalePrice) {
      alert(`❌ Sale price must be at least Rs. ${minSalePrice.toFixed(2)} (20% above purchase price)`);
      return;
    }

    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sku: newProductData.sku,
          barcode: newProductData.barcode,
          name: newProductData.name,
          category: newProductData.category,
          purchase_price_per_unit: purchasePrice,
          sale_price_per_unit: salePrice,
          quantity_available: parseInt(newProductData.quantity),
        }),
      });

      if (res.ok) {
        const newProduct = await res.json();
        alert('✅ Product created successfully!');

        // Add product to list and select it
        setProducts([...products, newProduct]);
        setSelectedProduct(newProduct.id.toString());

        // Reset form and go back to bulk pricing
        setShowCreateProduct(false);
        setNewProductData({
          sku: '',
          barcode: '',
          name: '',
          category: '',
          purchase_price: '',
          sale_price: '',
          quantity: '0',
        });
      } else {
        alert('❌ Error creating product');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error creating product');
    }
  };

  const handleCreateTier = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    try {
      const res = await fetch('/api/bulk-pricing', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          product_id: parseInt(formData.get('product_id') as string),
          min_quantity: parseInt(formData.get('min_quantity') as string),
          max_quantity: formData.get('max_quantity')
            ? parseInt(formData.get('max_quantity') as string)
            : null,
          bulk_price: parseFloat(formData.get('bulk_price') as string),
          discount_percentage: formData.get('discount_percentage')
            ? parseFloat(formData.get('discount_percentage') as string)
            : null,
        }),
      });

      if (res.ok) {
        alert('✅ Bulk pricing tier created successfully');
        setShowCreateModal(false);
        setSelectedProduct('');
        fetchReport();
      } else {
        alert('❌ Error creating bulk pricing tier');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error creating tier');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="flex-grow">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-8 px-6">
          <div className="flex items-center gap-3 mb-2">
            {React.createElement(FaPercent as any, { size: 32 })}
            <h1 className="text-4xl font-bold">Bulk Pricing Management</h1>
          </div>
          <p className="text-blue-100">Manage wholesale pricing tiers and wholesale customer analytics</p>
        </div>

        {/* Tabs */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-6 flex gap-4">
            {[
              { id: 'pricing', label: 'Pricing Tiers', icon: FaChartBar },
              { id: 'report', label: 'Bulk Report', icon: FaDownload },
              { id: 'stats', label: 'Wholesale Stats', icon: FaUsers },
            ].map((tab) => {
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-4 px-6 flex items-center gap-2 border-b-2 transition ${
                    activeTab === tab.id
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-blue-600'
                  }`}
                >
                  {React.createElement(tab.icon as any, { size: 18 })}
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Pricing Tiers Tab */}
          {activeTab === 'pricing' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">All Bulk Pricing Tiers</h2>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg flex items-center gap-2 transition"
                >
                  {React.createElement(FaPlus as any, {})} Add Pricing Tier
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {/* Info Card */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-900">
                    💡 <strong>Tip:</strong> Bulk pricing is automatically applied at the POS when customers order quantities matching tier thresholds. No manual entry needed!
                  </p>
                </div>

                {/* Example Tier */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="font-bold text-lg mb-4">Example: Saeed Ghani Herbal Shampoo</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-100 border-b">
                        <tr>
                          <th className="px-4 py-2 text-left">Quantity Range</th>
                          <th className="px-4 py-2 text-left">Unit Price</th>
                          <th className="px-4 py-2 text-left">Discount %</th>
                          <th className="px-4 py-2 text-left">Total (10 units)</th>
                          <th className="px-4 py-2 text-left">Savings vs Regular</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b hover:bg-gray-50">
                          <td className="px-4 py-2">1-9</td>
                          <td className="px-4 py-2 font-semibold">Rs. 599</td>
                          <td className="px-4 py-2">—</td>
                          <td className="px-4 py-2">Rs. 5,990</td>
                          <td className="px-4 py-2">—</td>
                        </tr>
                        <tr className="border-b hover:bg-gray-50 bg-green-50">
                          <td className="px-4 py-2 font-semibold">10-25 ✓</td>
                          <td className="px-4 py-2 font-semibold text-green-700">Rs. 500</td>
                          <td className="px-4 py-2 text-green-700">16.5%</td>
                          <td className="px-4 py-2 font-semibold">Rs. 5,000</td>
                          <td className="px-4 py-2 text-green-700">Rs. 990</td>
                        </tr>
                        <tr className="border-b hover:bg-gray-50">
                          <td className="px-4 py-2">26-50</td>
                          <td className="px-4 py-2 font-semibold">Rs. 450</td>
                          <td className="px-4 py-2">24.8%</td>
                          <td className="px-4 py-2">Rs. 4,500</td>
                          <td className="px-4 py-2">Rs. 1,490</td>
                        </tr>
                        <tr className="hover:bg-gray-50">
                          <td className="px-4 py-2">51+</td>
                          <td className="px-4 py-2 font-semibold">Rs. 400</td>
                          <td className="px-4 py-2">33.2%</td>
                          <td className="px-4 py-2">Rs. 4,000</td>
                          <td className="px-4 py-2">Rs. 1,990</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Bulk Report Tab */}
          {activeTab === 'report' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Bulk Pricing Report</h2>

              {loading ? (
                <div className="text-center py-8">Loading report...</div>
              ) : report.length === 0 ? (
                <div className="bg-white p-8 rounded-lg text-center text-gray-500">
                  No products with bulk pricing configured yet.
                </div>
              ) : (
                <div className="overflow-x-auto bg-white rounded-lg shadow">
                  <table className="w-full">
                    <thead className="bg-gray-100 border-b">
                      <tr>
                        <th className="px-6 py-3 text-left font-semibold">SKU</th>
                        <th className="px-6 py-3 text-left font-semibold">Product Name</th>
                        <th className="px-6 py-3 text-left font-semibold">Regular Price</th>
                        <th className="px-6 py-3 text-left font-semibold">Bulk Tiers</th>
                        <th className="px-6 py-3 text-left font-semibold">Lowest Price</th>
                        <th className="px-6 py-3 text-left font-semibold">Highest Min Qty</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.map((item) => (
                        <tr key={item.id} className="border-b hover:bg-gray-50">
                          <td className="px-6 py-3 font-mono text-sm">{item.sku}</td>
                          <td className="px-6 py-3 font-semibold">{item.name}</td>
                          <td className="px-6 py-3">Rs. {item.regular_price.toLocaleString()}</td>
                          <td className="px-6 py-3">
                            <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-semibold">
                              {item.bulk_price_tiers} tier{item.bulk_price_tiers !== 1 ? 's' : ''}
                            </span>
                          </td>
                          <td className="px-6 py-3 font-semibold text-green-700">
                            Rs. {item.lowest_bulk_price.toLocaleString()}
                          </td>
                          <td className="px-6 py-3">{item.highest_min_quantity} units</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Wholesale Stats Tab */}
          {activeTab === 'stats' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Wholesale Customer Statistics</h2>

              {loading ? (
                <div className="text-center py-8">Loading statistics...</div>
              ) : wholesaleStats.length === 0 ? (
                <div className="bg-white p-8 rounded-lg text-center text-gray-500">
                  No wholesale customer data available yet.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {wholesaleStats.map((stat, idx) => (
                    <div
                      key={idx}
                      className="bg-white rounded-lg shadow hover:shadow-lg transition p-6"
                    >
                      <div className="text-sm text-gray-600 mb-2">Wholesale Customers</div>
                      <div className="space-y-3">
                        <div>
                          <div className="text-2xl font-bold text-blue-600">{stat.order_count}</div>
                          <div className="text-xs text-gray-500">Orders</div>
                        </div>
                        <div className="border-t pt-3">
                          <div className="text-xl font-bold text-green-600">{stat.total_quantity}</div>
                          <div className="text-xs text-gray-500">Units Sold</div>
                        </div>
                        <div className="border-t pt-3">
                          <div className="text-xl font-bold text-purple-600">
                            Rs. {stat.total_spent.toLocaleString()}
                          </div>
                          <div className="text-xs text-gray-500">Total Revenue</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Key Insights */}
              <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg p-6">
                  <h3 className="font-bold mb-2">💡 Wholesale Insights</h3>
                  <ul className="text-sm space-y-2">
                    <li>• Wholesale customers buy 10+ units per order</li>
                    <li>• They save significantly with bulk pricing tiers</li>
                    <li>• Higher order frequency = more revenue</li>
                    <li>• Consider exclusive wholesale programs</li>
                  </ul>
                </div>

                <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-lg p-6">
                  <h3 className="font-bold mb-2">📊 Revenue Opportunity</h3>
                  <ul className="text-sm space-y-2">
                    <li>• Identify top wholesale products</li>
                    <li>• Create targeted bulk promotions</li>
                    <li>• Build long-term wholesale partnerships</li>
                    <li>• Monitor bulk pricing effectiveness</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-2xl w-full mx-4 max-h-screen overflow-y-auto">
            {!showCreateProduct ? (
              <>
                <h2 className="text-2xl font-bold mb-6">Create Bulk Pricing Tier</h2>
                <form onSubmit={handleCreateTier} className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Product *</label>
                    <select
                      name="product_id"
                      value={selectedProduct}
                      onChange={(e) => setSelectedProduct(e.target.value)}
                      required
                      className="w-full border rounded px-3 py-2"
                    >
                      <option value="">Select a product...</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.sku})
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setShowCreateProduct(true)}
                      className="mt-2 w-full text-sm text-blue-600 hover:text-blue-700 font-semibold py-2 border border-blue-600 rounded hover:bg-blue-50 transition"
                    >
                      + Create New Product
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Min Qty *</label>
                      <input
                        type="number"
                        name="min_quantity"
                        required
                        min="1"
                        className="w-full border rounded px-3 py-2"
                        placeholder="10"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Max Qty</label>
                      <input
                        type="number"
                        name="max_quantity"
                        min="1"
                        className="w-full border rounded px-3 py-2"
                        placeholder="Leave blank for unlimited"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Bulk Price (Rs) *</label>
                      <input
                        type="number"
                        name="bulk_price"
                        required
                        step="0.01"
                        min="0"
                        className="w-full border rounded px-3 py-2"
                        placeholder="450"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Discount %</label>
                      <input
                        type="number"
                        name="discount_percentage"
                        step="0.1"
                        min="0"
                        max="100"
                        className="w-full border rounded px-3 py-2"
                        placeholder="25"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      type="submit"
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded font-semibold transition"
                    >
                      Create Tier
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCreateModal(false)}
                      className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 py-2 rounded font-semibold transition"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <>
                <h2 className="text-2xl font-bold mb-6">Create New Product</h2>
                <form onSubmit={handleCreateProduct} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">SKU *</label>
                      <input
                        type="text"
                        value={newProductData.sku}
                        onChange={(e) => setNewProductData({ ...newProductData, sku: e.target.value })}
                        required
                        className="w-full border rounded px-3 py-2"
                        placeholder="e.g., PROD-001"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Barcode *</label>
                      <input
                        type="text"
                        value={newProductData.barcode}
                        onChange={(e) => setNewProductData({ ...newProductData, barcode: e.target.value })}
                        required
                        className="w-full border rounded px-3 py-2"
                        placeholder="e.g., 1234567890123"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Product Name *</label>
                    <input
                      type="text"
                      value={newProductData.name}
                      onChange={(e) => setNewProductData({ ...newProductData, name: e.target.value })}
                      required
                      className="w-full border rounded px-3 py-2"
                      placeholder="e.g., Premium Shampoo"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Category *</label>
                    <input
                      type="text"
                      value={newProductData.category}
                      onChange={(e) => setNewProductData({ ...newProductData, category: e.target.value })}
                      required
                      className="w-full border rounded px-3 py-2"
                      placeholder="e.g., Saeed Ghani - Shampoos & Hair Care"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Purchase Price (Rs) *</label>
                      <input
                        type="number"
                        step="0.01"
                        value={newProductData.purchase_price}
                        onChange={(e) => setNewProductData({ ...newProductData, purchase_price: e.target.value })}
                        required
                        className="w-full border rounded px-3 py-2"
                        placeholder="300"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Sale Price (Rs) *</label>
                      <input
                        type="number"
                        step="0.01"
                        value={newProductData.sale_price}
                        onChange={(e) => setNewProductData({ ...newProductData, sale_price: e.target.value })}
                        required
                        className="w-full border rounded px-3 py-2"
                        placeholder="450 (20% above purchase)"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Initial Quantity</label>
                    <input
                      type="number"
                      value={newProductData.quantity}
                      onChange={(e) => setNewProductData({ ...newProductData, quantity: e.target.value })}
                      className="w-full border rounded px-3 py-2"
                      placeholder="0"
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      type="submit"
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded font-semibold transition"
                    >
                      Create Product
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCreateProduct(false)}
                      className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 py-2 rounded font-semibold transition"
                    >
                      Back
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}

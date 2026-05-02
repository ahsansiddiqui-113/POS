import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface Product {
  id: number;
  name: string;
  sku: string;
  quantity_available: number;
  purchase_price_per_unit: number;
  sale_price_per_unit: number;
}

interface Supplier {
  id: number;
  name: string;
  contact: string;
  phone: string;
}

const Purchase: React.FC = () => {
  const navigate = useNavigate();
  const { logout, token } = useAuth();
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [totalPrice, setTotalPrice] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [expiryDate, setExpiryDate] = useState('');

  // NEW: State for messages and loading
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // NEW: State for dropdown data
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const backendUrl = 'http://localhost:3001';

  // NEW: Fetch products and suppliers on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoadingData(true);

        // Fetch products
        const productsRes = await fetch(`${backendUrl}/api/products?pageSize=1000`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (productsRes.ok) {
          const productsData = await productsRes.json();
          setProducts(productsData.data || []);
        }

        // Fetch suppliers
        const suppliersRes = await fetch(`${backendUrl}/api/suppliers`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (suppliersRes.ok) {
          const suppliersData = await suppliersRes.json();
          setSuppliers(suppliersData);
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load products or suppliers');
      } finally {
        setLoadingData(false);
      }
    };

    if (token) {
      fetchData();
    }
  }, [token]);

  // NEW: Add validation function
  const validateForm = (): boolean => {
    setError(null);

    if (!productId) {
      setError('Please select a product');
      return false;
    }

    if (!quantity || parseInt(quantity) <= 0) {
      setError('Quantity must be greater than 0');
      return false;
    }

    if (!totalPrice || parseFloat(totalPrice) <= 0) {
      setError('Total price must be greater than 0');
      return false;
    }

    if (!supplierId) {
      setError('Please select a supplier');
      return false;
    }

    const selectedProduct = products.find(p => p.id === parseInt(productId));
    if (!selectedProduct) {
      setError('Selected product not found');
      return false;
    }

    // NOTE: Purchase is buying FROM suppliers, so no inventory check needed
    // This increases inventory, not decreases it
    // Only POS/Sales need inventory validation

    return true;
  };

  // NEW: Auto-calculate unit price when total price or quantity changes
  useEffect(() => {
    if (totalPrice && quantity && parseInt(quantity) > 0) {
      const unitPrice = parseFloat(totalPrice) / parseInt(quantity);
      console.log(`Unit Price: ${unitPrice.toFixed(2)}`);
    }
  }, [totalPrice, quantity]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const selectedProduct = products.find(p => p.id === parseInt(productId));
      const selectedSupplier = suppliers.find(s => s.id === parseInt(supplierId));

      // Call API to create purchase
      const response = await fetch(`${backendUrl}/api/purchases`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          product_id: parseInt(productId),
          quantity: parseInt(quantity),
          total_bulk_price: parseFloat(totalPrice),
          supplier_id: parseInt(supplierId),
          expiry_date: expiryDate || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to create purchase');
        setLoading(false);
        return;
      }

      const result = await response.json();

      // Show success message
      setSuccessMessage(
        `✅ SUCCESS!\n\n` +
        `Purchase #${result.id} created!\n\n` +
        `Product: ${selectedProduct?.name}\n` +
        `Quantity Added: ${quantity} units\n` +
        `Unit Price: Rs.${(parseFloat(totalPrice) / parseInt(quantity)).toFixed(2)}\n` +
        `Total Cost: Rs.${totalPrice}\n` +
        `Supplier: ${selectedSupplier?.name}`
      );

      // Clear form
      setProductId('');
      setQuantity('');
      setTotalPrice('');
      setSupplierId('');
      setExpiryDate('');

      // Auto clear success message after 5 seconds
      setTimeout(() => setSuccessMessage(null), 5000);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error creating purchase';
      setError(`❌ Error: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Purchase Management</h1>
          <button
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">New Purchase Order</h2>

          {/* NEW: Error Message */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-600 text-red-700 rounded">
              <p className="font-semibold">Error</p>
              <p className="text-sm mt-1">{error}</p>
            </div>
          )}

          {/* NEW: Success Message */}
          {success && (
            <div className="mb-4 p-4 bg-green-50 border-l-4 border-green-600 text-green-700 rounded whitespace-pre-wrap">
              <p className="font-semibold">{success}</p>
            </div>
          )}

          {/* NEW: Loading indicator */}
          {loadingData && (
            <div className="mb-4 p-4 bg-blue-50 border-l-4 border-blue-600 text-blue-700 rounded">
              <p>Loading products and suppliers...</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* NEW: Product Dropdown */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Product * (Select from list)
              </label>
              <select
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                disabled={loadingData}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
              >
                <option value="">-- Choose a Product --</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name} (Stock: {product.quantity_available}, SKU: {product.sku})
                  </option>
                ))}
              </select>
              {productId && (
                <p className="text-xs text-gray-500 mt-1">
                  Selected: {products.find(p => p.id === parseInt(productId))?.name}
                </p>
              )}
            </div>

            {/* NEW: Quantity with increment/decrement */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quantity * (units)
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const q = parseInt(quantity) || 0;
                    if (q > 0) setQuantity((q - 1).toString());
                  }}
                  className="px-3 py-2 bg-gray-200 hover:bg-gray-300 rounded"
                >
                  −
                </button>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  min="1"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
                  placeholder="Enter quantity"
                />
                <button
                  type="button"
                  onClick={() => {
                    const q = parseInt(quantity) || 0;
                    setQuantity((q + 1).toString());
                  }}
                  className="px-3 py-2 bg-gray-200 hover:bg-gray-300 rounded"
                >
                  +
                </button>
              </div>
            </div>

            {/* NEW: Total Bulk Price */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Total Bulk Price (Rs.) *
              </label>
              <input
                type="number"
                step="0.01"
                value={totalPrice}
                onChange={(e) => setTotalPrice(e.target.value)}
                min="0"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
                placeholder="Enter total price in rupees"
              />
              {quantity && totalPrice && parseInt(quantity) > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  Unit Price: Rs.{(parseFloat(totalPrice) / parseInt(quantity)).toFixed(2)}
                </p>
              )}
            </div>

            {/* NEW: Supplier Dropdown */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Supplier * (Select from list)
              </label>
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                disabled={loadingData}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
              >
                <option value="">-- Choose a Supplier --</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name} ({supplier.contact || supplier.phone || 'N/A'})
                  </option>
                ))}
              </select>
              {supplierId && (
                <p className="text-xs text-gray-500 mt-1">
                  Contact: {suppliers.find(s => s.id === parseInt(supplierId))?.contact}
                </p>
              )}
            </div>

            {/* Expiry Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Expiry Date (Optional)
              </label>
              <input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
              />
            </div>

            {/* NEW: Submit Button with Loading State */}
            <button
              type="submit"
              disabled={loading || loadingData}
              className={`w-full font-bold py-2 px-4 rounded-lg transition-colors ${
                loading || loadingData
                  ? 'bg-gray-400 cursor-not-allowed text-gray-600'
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              {loading ? '⏳ Creating Purchase...' : '✅ Create Purchase'}
            </button>
          </form>
        </div>

        <button
          onClick={() => navigate('/dashboard')}
          className="mt-6 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
        >
          Back to Dashboard
        </button>
      </main>
    </div>
  );
};

export default Purchase;

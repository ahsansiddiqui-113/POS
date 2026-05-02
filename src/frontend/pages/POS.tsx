import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import useApi from '../hooks/useApi';

interface CartItem {
  productId: number;
  barcode: string;
  name: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
}

const POS: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [lastScannedBarcode, setLastScannedBarcode] = useState('');
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedProductForQuantity, setSelectedProductForQuantity] = useState<any | null>(null);
  const [selectedQuantity, setSelectedQuantity] = useState(1);

  const { execute: searchProduct } = useApi('/api/products/barcode/:barcode');
  const { execute: createSale } = useApi('/api/sales', { method: 'POST' });

  // Focus on barcode input
  useEffect(() => {
    barcodeInputRef.current?.focus();
  }, []);

  // Search for products by name or SKU
  const handleSearchProducts = async (query: string) => {
    setSearchInput(query);

    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const backendUrl = (await window.electron?.getBackendUrl?.()) || 'http://localhost:3001';
      const response = await fetch(
        `${backendUrl}/api/products?search=${encodeURIComponent(query)}&pageSize=10`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.products || []);
      }
    } catch (err) {
      console.error('Search error:', err);
    }
  };

  // Add searched product to cart
  const handleAddSearchedProduct = () => {
    if (!selectedProductForQuantity || selectedQuantity <= 0) return;

    const product = selectedProductForQuantity;

    if (product.quantity_available <= 0) {
      setError(`${product.name} is out of stock`);
      return;
    }

    if (selectedQuantity > product.quantity_available) {
      setError(`Cannot add ${selectedQuantity}. Only ${product.quantity_available} available`);
      return;
    }

    const existingItem = cart.find((item) => item.productId === product.id);

    if (existingItem) {
      const newQuantity = existingItem.quantity + selectedQuantity;
      if (newQuantity > product.quantity_available) {
        setError(`Cannot add more. Only ${product.quantity_available} total available`);
        return;
      }
      updateQuantity(product.id, newQuantity);
    } else {
      const newItem: CartItem = {
        productId: product.id,
        barcode: product.barcode,
        name: product.name,
        unitPrice: product.sale_price_per_unit,
        quantity: selectedQuantity,
        subtotal: product.sale_price_per_unit * selectedQuantity,
      };
      setCart([...cart, newItem]);
    }

    setSuccess(`Added ${selectedQuantity}x ${product.name}`);
    setShowSearchModal(false);
    setSearchInput('');
    setSearchResults([]);
    setSelectedProductForQuantity(null);
    setSelectedQuantity(1);
    barcodeInputRef.current?.focus();

    setTimeout(() => setSuccess(null), 2000);
  };

  // Handle barcode scan
  const handleBarcodeInput = async (barcode: string) => {
    if (!barcode.trim()) return;

    setError(null);
    setLastScannedBarcode(barcode);

    try {
      // Fetch product by barcode
      const backendUrl = (await window.electron?.getBackendUrl?.()) || 'http://localhost:3001';
      const response = await fetch(
        `${backendUrl}/api/products/barcode/${barcode}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          },
        }
      );

      if (!response.ok) {
        setError(`Product not found: ${barcode}`);
        setBarcodeInput('');
        barcodeInputRef.current?.focus();
        return;
      }

      const product = await response.json();

      if (product.quantity_available <= 0) {
        setError(`${product.name} is out of stock`);
        setBarcodeInput('');
        barcodeInputRef.current?.focus();
        return;
      }

      // Check if product already in cart
      const existingItem = cart.find((item) => item.productId === product.id);

      if (existingItem) {
        // Increase quantity
        const newQuantity = existingItem.quantity + 1;
        if (newQuantity > product.quantity_available) {
          setError(`Cannot add more ${product.name}. Only ${product.quantity_available} available`);
          setBarcodeInput('');
          barcodeInputRef.current?.focus();
          return;
        }

        const newCart = cart.map((item) =>
          item.productId === product.id
            ? {
                ...item,
                quantity: newQuantity,
                subtotal: item.unitPrice * newQuantity,
              }
            : item
        );
        setCart(newCart);
      } else {
        // Add new item to cart
        const cartItem: CartItem = {
          productId: product.id,
          barcode: product.barcode,
          name: product.name,
          unitPrice: product.sale_price_per_unit,
          quantity: 1,
          subtotal: product.sale_price_per_unit,
        };
        setCart([...cart, cartItem]);
      }

      setSuccess(`Added ${product.name}`);
      setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching product');
    }

    setBarcodeInput('');
    barcodeInputRef.current?.focus();
  };

  // Handle key press in barcode input
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleBarcodeInput(barcodeInput);
    }
  };

  // Calculate totals
  const subtotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
  const tax = subtotal * 0.1; // 10% tax
  const total = subtotal + tax;

  // Handle checkout
  const handleCheckout = async () => {
    if (cart.length === 0) {
      setError('Cart is empty');
      return;
    }

    try {
      const saleData = {
        items: cart.map((item) => ({
          product_id: item.productId,
          quantity: item.quantity,
          unit_price: item.unitPrice,
        })),
        payment_method: paymentMethod,
        total_amount: total,
      };

      const response = await createSale({
        body: JSON.stringify(saleData),
      });

      if (response) {
        setSuccess(`Sale #${response.id} completed! Total: Rs.${total.toFixed(2)}`);
        setCart([]);
        setBarcodeInput('');
        barcodeInputRef.current?.focus();

        // Auto clear success message
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Checkout failed');
    }
  };

  // Remove item from cart
  const removeFromCart = (productId: number) => {
    setCart(cart.filter((item) => item.productId !== productId));
  };

  // Update quantity
  const updateQuantity = (productId: number, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }

    const newCart = cart.map((item) =>
      item.productId === productId
        ? {
            ...item,
            quantity,
            subtotal: item.unitPrice * quantity,
          }
        : item
    );
    setCart(newCart);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Point of Sale</h1>
            <p className="text-gray-600">{user?.username} - {user?.role}</p>
          </div>
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

      <div className="grid grid-cols-3 gap-4 p-4">
        {/* Barcode Scanner & Cart */}
        <div className="col-span-2">
          {/* Alerts */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4">
              ✓ {success}
            </div>
          )}

          {/* Barcode Input & Search */}
          <div className="bg-white rounded-lg shadow p-6 mb-4">
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Scan Barcode or Search Products:
            </label>
            <div className="flex gap-2">
              <input
                ref={barcodeInputRef}
                type="text"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                onKeyPress={handleKeyPress}
                className="flex-1 px-4 py-3 text-lg border-2 border-blue-600 rounded focus:outline-none"
                placeholder="Scan product barcode here..."
                autoFocus
              />
              <button
                onClick={() => setShowSearchModal(true)}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded font-semibold transition"
              >
                🔍 Search
              </button>
            </div>
          </div>

          {/* Cart Items */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-200">
                <tr>
                  <th className="px-4 py-2 text-left">Product</th>
                  <th className="px-4 py-2 text-center">Qty</th>
                  <th className="px-4 py-2 text-right">Price</th>
                  <th className="px-4 py-2 text-right">Subtotal</th>
                  <th className="px-4 py-2 text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {cart.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-600">
                      Cart is empty. Start scanning products.
                    </td>
                  </tr>
                ) : (
                  cart.map((item) => (
                    <tr key={item.productId} className="border-t">
                      <td className="px-4 py-3">{item.name}</td>
                      <td className="px-4 py-3 text-center">
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) =>
                            updateQuantity(item.productId, parseInt(e.target.value) || 0)
                          }
                          className="w-16 px-2 py-1 border rounded text-center"
                        />
                      </td>
                      <td className="px-4 py-3 text-right">
                        Rs.{item.unitPrice.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right font-bold">
                        Rs.{item.subtotal.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => removeFromCart(item.productId)}
                          className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Payment Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Payment</h2>

          {/* Totals */}
          <div className="space-y-3 mb-6">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal:</span>
              <span className="font-bold">Rs.{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Tax (10%):</span>
              <span className="font-bold">Rs.{tax.toFixed(2)}</span>
            </div>
            <div className="border-t-2 pt-3 flex justify-between text-2xl font-bold text-blue-600">
              <span>Total:</span>
              <span>Rs.{total.toFixed(2)}</span>
            </div>
          </div>

          {/* Payment Method */}
          <div className="mb-6">
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Payment Method:
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full px-4 py-2 border rounded"
            >
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="check">Check</option>
              <option value="online">Online</option>
            </select>
          </div>

          {/* Checkout Button */}
          <button
            onClick={handleCheckout}
            disabled={cart.length === 0}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-bold py-4 px-6 rounded-lg text-lg"
          >
            CHECKOUT (Rs.{total.toFixed(2)})
          </button>

          {/* Clear Cart Button */}
          <button
            onClick={() => {
              setCart([]);
              setError(null);
              barcodeInputRef.current?.focus();
            }}
            className="w-full mt-2 bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
          >
            Clear Cart
          </button>

          {/* Dashboard Button */}
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full mt-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Back to Dashboard
          </button>
        </div>
      </div>

      {/* Product Search Modal */}
      {showSearchModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-2xl w-full mx-4 max-h-screen overflow-y-auto">
            <h2 className="text-2xl font-bold mb-6">Search Products</h2>

            {/* Search Input */}
            <div className="mb-6">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => handleSearchProducts(e.target.value)}
                placeholder="Search by product name or SKU..."
                className="w-full px-4 py-3 border-2 border-blue-600 rounded focus:outline-none text-lg"
                autoFocus
              />
            </div>

            {/* Search Results */}
            {searchResults.length > 0 ? (
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Available Products ({searchResults.length})
                </label>
                <div className="space-y-2 max-h-64 overflow-y-auto border rounded-lg p-4">
                  {searchResults.map((product) => (
                    <div
                      key={product.id}
                      onClick={() => {
                        setSelectedProductForQuantity(product);
                        setSelectedQuantity(1);
                      }}
                      className={`p-4 rounded cursor-pointer transition ${
                        selectedProductForQuantity?.id === product.id
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 hover:bg-gray-200'
                      }`}
                    >
                      <div className="font-semibold">{product.name}</div>
                      <div className="text-sm">
                        SKU: {product.sku} | Barcode: {product.barcode}
                      </div>
                      <div className="text-sm">
                        Price: Rs. {product.sale_price_per_unit} | Stock: {product.quantity_available}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : searchInput ? (
              <div className="text-center py-8 text-gray-500">
                No products found. Try a different search.
              </div>
            ) : null}

            {/* Quantity Selection */}
            {selectedProductForQuantity && (
              <div className="mb-6 bg-blue-50 p-4 rounded-lg border-2 border-blue-600">
                <div className="mb-4">
                  <h3 className="font-semibold text-lg mb-2">
                    {selectedProductForQuantity.name}
                  </h3>
                  <p className="text-sm text-gray-600 mb-2">
                    Price: Rs. {selectedProductForQuantity.sale_price_per_unit} per unit
                  </p>
                  <p className="text-sm text-gray-600">
                    Available: {selectedProductForQuantity.quantity_available} units
                  </p>
                </div>

                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Quantity to Add:
                </label>
                <div className="flex gap-2 mb-4">
                  <button
                    onClick={() => setSelectedQuantity(Math.max(1, selectedQuantity - 1))}
                    className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded font-semibold"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    value={selectedQuantity}
                    onChange={(e) =>
                      setSelectedQuantity(Math.max(1, parseInt(e.target.value) || 1))
                    }
                    min="1"
                    max={selectedProductForQuantity.quantity_available}
                    className="flex-1 px-4 py-2 border-2 border-blue-600 rounded text-center text-lg font-semibold"
                  />
                  <button
                    onClick={() =>
                      setSelectedQuantity(
                        Math.min(
                          selectedQuantity + 1,
                          selectedProductForQuantity.quantity_available
                        )
                      )
                    }
                    className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded font-semibold"
                  >
                    +
                  </button>
                </div>

                <div className="bg-white p-3 rounded border mb-4">
                  <p className="text-lg font-semibold">
                    Total: Rs.{' '}
                    {(selectedProductForQuantity.sale_price_per_unit * selectedQuantity).toFixed(2)}
                  </p>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleAddSearchedProduct}
                disabled={!selectedProductForQuantity || selectedQuantity <= 0}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold py-3 rounded-lg transition"
              >
                Add to Cart
              </button>
              <button
                onClick={() => {
                  setShowSearchModal(false);
                  setSearchInput('');
                  setSearchResults([]);
                  setSelectedProductForQuantity(null);
                  setSelectedQuantity(1);
                  barcodeInputRef.current?.focus();
                }}
                className="flex-1 bg-gray-400 hover:bg-gray-500 text-white font-semibold py-3 rounded-lg transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default POS;

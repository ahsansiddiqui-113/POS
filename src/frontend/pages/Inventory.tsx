import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import useApi from '../hooks/useApi';
import Footer from '../components/Footer';
import {
  FaPlus,
  FaEdit,
  FaTrash,
  FaSignOutAlt,
  FaSearch,
  FaBox,
  FaDollarSign,
  FaWarehouse,
  FaBarcode,
} from 'react-icons/fa';

interface Product {
  id: number;
  sku: string;
  barcode: string;
  name: string;
  category: string;
  sub_category?: string;
  brand?: string;
  description?: string;
  purchase_price_per_unit: number;
  sale_price_per_unit: number;
  quantity_available: number;
  low_stock_threshold: number;
  expiry_date?: string;
  created_at: string;
  updated_at: string;
}

interface AuditLog {
  id: number;
  timestamp: string;
  user: { id: number; username: string };
  action: string;
  new_value?: any;
  old_value?: any;
}

const Inventory: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout, token } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [categories, setCategories] = useState<string[]>([]);

  // Modal states
  const [showForm, setShowForm] = useState(false);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [categoryFormError, setCategoryFormError] = useState('');

  // Form data
  const [formData, setFormData] = useState({
    sku: '',
    barcode: '',
    name: '',
    category: '',
    brand: '',
    description: '',
    purchase_price_per_unit: 0,
    sale_price_per_unit: 0,
    quantity_available: 0,
    low_stock_threshold: 10,
    expiry_date: '',
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const backendUrl = 'http://localhost:3001';
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const { data, loading, execute } = useApi<any>(`/api/products?page=${page}&pageSize=20&search=${search}&refresh=${refreshTrigger}`);

  // Fetch products on page/search/refresh change
  useEffect(() => {
    execute();
  }, [page, search, refreshTrigger, execute]);

  // Fetch categories
  const fetchCategories = async () => {
    try {
      const response = await fetch(`${backendUrl}/api/categories`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        // Extract category names from the response
        const categoryNames = data.map((cat: any) => cat.name);
        setCategories(categoryNames);
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  // Fetch categories on mount
  useEffect(() => {
    console.log('[Inventory] Component mounted, fetching categories');
    fetchCategories();
  }, [token]);

  // Update products when data changes
  useEffect(() => {
    console.log('[Inventory] Data changed:', data);
    if (data) {
      console.log('[Inventory] Products array:', data.data);
      console.log('[Inventory] Total pages:', data.pages);
      console.log('[Inventory] Setting products count:', (data.data || []).length);
      setProducts(data.data || []);
      setTotalPages(data.pages || 1);
    } else {
      console.log('[Inventory] Data is null/undefined');
    }
  }, [data]);

  // Clear messages after 5 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => setErrorMessage(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.sku.trim()) errors.sku = 'SKU is required';
    if (!formData.barcode.trim()) errors.barcode = 'Barcode is required';
    if (!formData.name.trim()) errors.name = 'Product name is required';
    if (!formData.category) errors.category = 'Category is required';
    if (formData.purchase_price_per_unit <= 0) errors.purchase_price_per_unit = 'Purchase price must be greater than 0';
    if (formData.sale_price_per_unit < formData.purchase_price_per_unit * 1.2) {
      errors.sale_price_per_unit = 'Sale price must be at least 20% above purchase price';
    }
    if (formData.quantity_available < 0) errors.quantity_available = 'Quantity cannot be negative';

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddClick = () => {
    setEditingId(null);
    setFormData({
      sku: '',
      barcode: '',
      name: '',
      category: '',
      brand: '',
      description: '',
      purchase_price_per_unit: 0,
      sale_price_per_unit: 0,
      quantity_available: 0,
      low_stock_threshold: 10,
      expiry_date: '',
    });
    setFormErrors({});
    setShowForm(true);
  };

  const handleCreateCategory = async () => {
    setCategoryFormError('');

    if (!newCategoryName.trim()) {
      setCategoryFormError('Category name is required');
      return;
    }

    try {
      const response = await fetch(`${backendUrl}/api/categories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: newCategoryName.trim() }),
      });

      if (!response.ok) {
        const error = await response.json();
        setCategoryFormError(error.error || 'Failed to create category');
        return;
      }

      // Success - refresh categories and select the new one
      setNewCategoryName('');
      setShowCategoryForm(false);
      await fetchCategories();

      // Set the newly created category as selected
      setFormData({ ...formData, category: newCategoryName.trim() });
      setSuccessMessage('Category created successfully!');
    } catch (error) {
      setCategoryFormError('Error creating category');
      console.error(error);
    }
  };

  const handleEdit = (product: Product) => {
    setEditingId(product.id);
    setFormData({
      sku: product.sku,
      barcode: product.barcode,
      name: product.name,
      category: product.category,
      brand: product.brand || '',
      description: product.description || '',
      purchase_price_per_unit: product.purchase_price_per_unit,
      sale_price_per_unit: product.sale_price_per_unit,
      quantity_available: product.quantity_available,
      low_stock_threshold: product.low_stock_threshold,
      expiry_date: product.expiry_date || '',
    });
    setFormErrors({});
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      const url = editingId ? `/api/products/${editingId}` : '/api/products';
      const method = editingId ? 'PUT' : 'POST';

      // For edit, only send updated fields (allow sale_price update)
      const payload = editingId
        ? {
            name: formData.name,
            description: formData.description,
            sale_price_per_unit: formData.sale_price_per_unit,
            low_stock_threshold: formData.low_stock_threshold,
            brand: formData.brand,
            category: formData.category,
          }
        : formData;

      const response = await fetch(`${backendUrl}${url}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        // If it's a 409 conflict (duplicate barcode/SKU), still refresh to show the existing product
        if (response.status === 409) {
          setSuccessMessage('Product already exists. Refreshing inventory...');
          setShowForm(false);
          setPage(1);
          setRefreshTrigger(prev => prev + 1);
          return;
        }
        setErrorMessage(error.error || 'Failed to save product');
        return;
      }

      setSuccessMessage(editingId ? 'Product updated successfully' : 'Product created successfully');
      setShowForm(false);
      // Reset form and refresh products
      setFormData({
        sku: '',
        barcode: '',
        name: '',
        category: '',
        brand: '',
        description: '',
        purchase_price_per_unit: 0,
        sale_price_per_unit: 0,
        quantity_available: 0,
        low_stock_threshold: 10,
        expiry_date: '',
      });
      setEditingId(null);
      setPage(1);
      // Trigger a refresh of the products list without reloading the page
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      setErrorMessage('Error saving product');
      console.error(error);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"?`)) return;

    try {
      const response = await fetch(`${backendUrl}/api/products/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        setErrorMessage(error.error || 'Failed to delete product');
        return;
      }

      setSuccessMessage('Product deleted successfully');
      // Refresh products
      window.location.reload();
    } catch (error) {
      setErrorMessage('Error deleting product');
      console.error(error);
    }
  };

  const getStockStatus = (product: Product) => {
    if (product.quantity_available === 0) return { text: 'OUT OF STOCK', color: 'bg-red-100 text-red-800' };
    if (product.quantity_available <= product.low_stock_threshold) return { text: 'LOW STOCK', color: 'bg-yellow-100 text-yellow-800' };
    return { text: 'IN STOCK', color: 'bg-green-100 text-green-800' };
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Inventory Management</h1>
            <p className="text-gray-600 mt-1">Manage products and inventory</p>
          </div>
          <button
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded flex items-center gap-2"
          >
            {React.createElement(FaSignOutAlt as any)} Logout
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 flex-grow w-full">
        {/* Messages */}
        {successMessage && (
          <div className="mb-4 p-4 bg-green-50 border-l-4 border-green-600 text-green-700 rounded">
            {successMessage}
          </div>
        )}
        {errorMessage && (
          <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-600 text-red-700 rounded">
            {errorMessage}
          </div>
        )}

        {/* Add Product Button */}
        <div className="mb-6 flex gap-4">
          <button
            onClick={handleAddClick}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 font-semibold transition-all hover:shadow-lg"
          >
            {React.createElement(FaPlus as any, { size: 18 })}
            Add New Product
          </button>
          <button
            onClick={() => navigate('/categories')}
            className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 font-semibold transition-all hover:shadow-lg"
          >
            {React.createElement(FaBox as any, { size: 18 })}
            Manage Categories
          </button>
        </div>

        {/* Product Form Modal */}
        {showForm && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-2xl font-bold mb-6">{editingId ? 'Edit Product' : 'Create New Product'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* SKU */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">SKU *</label>
                  <input
                    type="text"
                    disabled={!!editingId}
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 ${formErrors.sku ? 'border-red-500' : ''}`}
                    placeholder="e.g., GOLD-RING-001"
                  />
                  {formErrors.sku && <p className="text-red-600 text-sm mt-1">{formErrors.sku}</p>}
                </div>

                {/* Barcode */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Barcode *</label>
                  <input
                    type="text"
                    disabled={!!editingId}
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 ${formErrors.barcode ? 'border-red-500' : ''}`}
                    placeholder="e.g., 1234567890123"
                  />
                  {formErrors.barcode && <p className="text-red-600 text-sm mt-1">{formErrors.barcode}</p>}
                </div>

                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Product Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 ${formErrors.name ? 'border-red-500' : ''}`}
                    placeholder="Enter product name"
                  />
                  {formErrors.name && <p className="text-red-600 text-sm mt-1">{formErrors.name}</p>}
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category *</label>
                  <div className="flex gap-2">
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className={`flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 ${formErrors.category ? 'border-red-500' : ''}`}
                    >
                      <option value="">Select category</option>
                      {categories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setShowCategoryForm(true)}
                      className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg font-semibold whitespace-nowrap"
                    >
                      + New Category
                    </button>
                  </div>
                  {formErrors.category && <p className="text-red-600 text-sm mt-1">{formErrors.category}</p>}
                </div>

                {/* Brand */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Brand</label>
                  <input
                    type="text"
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                    placeholder="Optional"
                  />
                </div>

                {/* Purchase Price */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Purchase Price *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    disabled={!!editingId}
                    value={formData.purchase_price_per_unit || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormData({ ...formData, purchase_price_per_unit: val === '' ? 0 : parseFloat(val) || 0 });
                    }}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 ${formErrors.purchase_price_per_unit ? 'border-red-500' : ''}`}
                    placeholder="0.00"
                  />
                  {formErrors.purchase_price_per_unit && <p className="text-red-600 text-sm mt-1">{formErrors.purchase_price_per_unit}</p>}
                </div>

                {/* Sale Price */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Sale Price (Min 20% above purchase) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.sale_price_per_unit || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormData({ ...formData, sale_price_per_unit: val === '' ? 0 : parseFloat(val) || 0 });
                    }}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 ${formErrors.sale_price_per_unit ? 'border-red-500' : ''}`}
                    placeholder="0.00"
                  />
                  {formErrors.sale_price_per_unit && <p className="text-red-600 text-sm mt-1">{formErrors.sale_price_per_unit}</p>}
                </div>

                {/* Quantity */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{editingId ? 'Quantity Adjustment' : 'Initial Quantity'}</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.quantity_available || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormData({ ...formData, quantity_available: val === '' ? 0 : parseInt(val) || 0 });
                    }}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 ${formErrors.quantity_available ? 'border-red-500' : ''}`}
                    placeholder="0"
                  />
                  {formErrors.quantity_available && <p className="text-red-600 text-sm mt-1">{formErrors.quantity_available}</p>}
                </div>

                {/* Low Stock Threshold */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Low Stock Threshold</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.low_stock_threshold || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormData({ ...formData, low_stock_threshold: val === '' ? 0 : parseInt(val) || 0 });
                    }}
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                    placeholder="10"
                  />
                </div>

                {/* Description */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                    placeholder="Product description"
                    rows={3}
                  />
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-4 pt-4">
                <button
                  type="submit"
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-semibold"
                >
                  {editingId ? 'Update Product' : 'Create Product'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg font-semibold"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Add Category Modal */}
        {showCategoryForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-lg p-6 w-96">
              <h3 className="text-xl font-bold mb-4">Add New Category</h3>

              {categoryFormError && (
                <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-600 text-red-700 rounded">
                  {categoryFormError}
                </div>
              )}

              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Enter category name (e.g., Jewellery, Cosmetics)"
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 mb-4"
                autoFocus
              />

              <div className="flex gap-3">
                <button
                  onClick={handleCreateCategory}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold"
                >
                  Create Category
                </button>
                <button
                  onClick={() => {
                    setShowCategoryForm(false);
                    setNewCategoryName('');
                    setCategoryFormError('');
                  }}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-semibold"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="mb-6 relative">
          <span className="absolute left-3 top-3 text-gray-400">
            {React.createElement(FaSearch as any, { size: 18 })}
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by name, SKU, or barcode..."
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>

        {/* Products Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-gray-200 to-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold">
                    {React.createElement(FaBarcode as any, { size: 14, className: 'inline mr-2' })}
                    SKU
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">
                    {React.createElement(FaBox as any, { size: 14, className: 'inline mr-2' })}
                    Product Name
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Category</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold">Purchase Price (Rs.)</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold">Sale Price (Rs.)</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold">
                    {React.createElement(FaWarehouse as any, { size: 14, className: 'inline mr-2' })}
                    Stock
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-semibold">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-gray-600">
                      Loading...
                    </td>
                  </tr>
                ) : products.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-gray-600">
                      No products found
                    </td>
                  </tr>
                ) : (
                  products.map((product) => {
                    const status = getStockStatus(product);
                    return (
                      <tr key={product.id} className="border-t hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium">{product.sku}</td>
                        <td className="px-4 py-3 text-sm">{product.name}</td>
                        <td className="px-4 py-3 text-sm">{product.category}</td>
                        <td className="px-4 py-3 text-sm text-right">{product.purchase_price_per_unit.toFixed(2)}</td>
                        <td className="px-4 py-3 text-sm text-right font-semibold">{product.sale_price_per_unit.toFixed(2)}</td>
                        <td className="px-4 py-3 text-center text-sm font-semibold">{product.quantity_available}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${status.color}`}>
                            {status.text}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm flex gap-2">
                          <button
                            onClick={() => handleEdit(product)}
                            className="text-blue-600 hover:text-blue-800 font-semibold"
                          >
                            {React.createElement(FaEdit as any)}
                          </button>
                          <button
                            onClick={() => handleDelete(product.id, product.name)}
                            className="text-red-600 hover:text-red-800 font-semibold"
                          >
                            {React.createElement(FaTrash as any)}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        <div className="mt-6 flex justify-center items-center gap-4">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 disabled:opacity-50 rounded"
          >
            Previous
          </button>
          <span className="text-gray-700">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 disabled:opacity-50 rounded"
          >
            Next
          </button>
        </div>

        {/* Back Button */}
        <button
          onClick={() => navigate('/dashboard')}
          className="mt-6 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded flex items-center gap-2"
        >
          ← Back to Dashboard
        </button>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default Inventory;

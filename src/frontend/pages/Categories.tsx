import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Footer from '../components/Footer';
import { FaPlus, FaEdit, FaTrash, FaSignOutAlt, FaTag, FaArrowLeft } from 'react-icons/fa';

interface Category {
  name: string;
  productCount: number;
}

const Categories: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout, token } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Modal states
  const [showForm, setShowForm] = useState(false);
  const [editingName, setEditingName] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '' });

  const backendUrl = 'http://localhost:3001';

  // Redirect non-admins
  useEffect(() => {
    if (user?.role !== 'Admin') {
      navigate('/dashboard');
    }
  }, [user, navigate]);

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

  // Fetch categories
  const fetchCategories = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${backendUrl}/api/categories`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch categories');

      const data: Category[] = await response.json();
      setCategories(data);
    } catch (error) {
      console.error('Error fetching categories:', error);
      setErrorMessage('Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, [token]);

  const handleAddClick = () => {
    setEditingName(null);
    setFormData({ name: '' });
    setShowForm(true);
  };

  const handleEdit = (category: Category) => {
    setEditingName(category.name);
    setFormData({ name: category.name });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      setErrorMessage('Category name is required');
      return;
    }

    try {
      const url = editingName
        ? `/api/categories/${encodeURIComponent(editingName)}`
        : '/api/categories';
      const method = editingName ? 'PUT' : 'POST';
      const body = editingName
        ? { newName: formData.name }
        : { name: formData.name };

      const response = await fetch(`${backendUrl}${url}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.json();
        setErrorMessage(error.error || 'Failed to save category');
        return;
      }

      setSuccessMessage(
        editingName ? 'Category renamed successfully' : 'Category created successfully'
      );
      setShowForm(false);
      fetchCategories();
    } catch (error) {
      setErrorMessage('Error saving category');
      console.error(error);
    }
  };

  const handleDelete = async (name: string) => {
    if (!window.confirm(`Are you sure you want to delete category "${name}"?`)) return;

    try {
      const response = await fetch(`${backendUrl}/api/categories/${encodeURIComponent(name)}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        setErrorMessage(error.error || 'Failed to delete category');
        return;
      }

      setSuccessMessage('Category deleted successfully');
      fetchCategories();
    } catch (error) {
      setErrorMessage('Error deleting category');
      console.error(error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Categories Management</h1>
            <p className="text-gray-600 mt-1">Manage product categories</p>
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

        {/* Add Category Button */}
        <div className="mb-6">
          <button
            onClick={handleAddClick}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 font-semibold transition-all hover:shadow-lg"
          >
            {React.createElement(FaPlus as any, { size: 18 })}
            Add New Category
          </button>
        </div>

        {/* Category Form Modal */}
        {showForm && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-2xl font-bold mb-6">
              {editingName ? `Edit Category: ${editingName}` : 'Create New Category'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  placeholder="Enter category name"
                  autoFocus
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="submit"
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-semibold"
                >
                  {editingName ? 'Update Category' : 'Create Category'}
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

        {/* Categories Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-gray-200 to-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold flex items-center gap-2">
                    {React.createElement(FaTag as any, { size: 14 })}
                    Category Name
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-semibold">Products</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-gray-600">
                      Loading...
                    </td>
                  </tr>
                ) : categories.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-gray-600">
                      No categories found
                    </td>
                  </tr>
                ) : (
                  categories.map((category) => (
                    <tr key={category.name} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium">{category.name}</td>
                      <td className="px-4 py-3 text-center text-sm">
                        <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-semibold">
                          {category.productCount}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-sm flex gap-2 justify-center">
                        <button
                          onClick={() => handleEdit(category)}
                          className="text-blue-600 hover:text-blue-800 font-semibold"
                        >
                          {React.createElement(FaEdit as any)}
                        </button>
                        <button
                          onClick={() => handleDelete(category.name)}
                          disabled={category.productCount > 0}
                          className={`font-semibold ${
                            category.productCount > 0
                              ? 'text-gray-400 cursor-not-allowed'
                              : 'text-red-600 hover:text-red-800'
                          }`}
                          title={
                            category.productCount > 0
                              ? 'Cannot delete category with products'
                              : 'Delete category'
                          }
                        >
                          {React.createElement(FaTrash as any)}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Back Button */}
        <button
          onClick={() => navigate('/dashboard')}
          className="mt-6 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded flex items-center gap-2"
        >
          {React.createElement(FaArrowLeft as any, { size: 16 })}
          Back to Dashboard
        </button>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default Categories;

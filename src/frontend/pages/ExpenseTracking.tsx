import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Footer from '../components/Footer';
import { FaPlus, FaEdit, FaTrash, FaSignOutAlt, FaChartPie, FaArrowLeft, FaCalendar } from 'react-icons/fa';

interface Expense {
  id: number;
  date: string;
  category_id: number;
  amount: number;
  description?: string;
  user_id: number;
  receipt_image_path?: string;
  created_at: string;
}

interface ExpenseCategory {
  id: number;
  name: string;
  description?: string;
}

interface MonthlyBreakdown {
  month: string;
  byCategory: Array<{
    id: number;
    category_name: string;
    count: number;
    total: number;
    average: number;
    percentOfTotal: string;
  }>;
  totalExpenses: string;
}

const ExpenseTracking: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout, token } = useAuth();
  const [activeTab, setActiveTab] = useState<'expenses' | 'categories' | 'reports'>('expenses');

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Expense form states
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<number | null>(null);
  const [expenseFormData, setExpenseFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    category_id: '',
    amount: '',
    description: '',
  });

  // Category form states
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [categoryFormData, setCategoryFormData] = useState({ name: '', description: '' });

  // Report states
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState(String(new Date().getMonth() + 1).padStart(2, '0'));
  const [monthlyBreakdown, setMonthlyBreakdown] = useState<MonthlyBreakdown | null>(null);

  const backendUrl = window.electron?.getBackendUrl?.() || 'http://localhost:3001';

  // Redirect non-authenticated users
  useEffect(() => {
    if (!user) {
      navigate('/login');
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

  // Fetch data
  useEffect(() => {
    if (activeTab === 'expenses') {
      fetchExpenses();
      fetchCategories();
    } else if (activeTab === 'categories') {
      fetchCategories();
    } else if (activeTab === 'reports') {
      fetchMonthlyBreakdown();
    }
  }, [activeTab]);

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${backendUrl}/api/expenses`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch expenses');
      const data = await response.json();
      setExpenses(Array.isArray(data) ? data : []);
    } catch (error) {
      setErrorMessage('Failed to load expenses');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch(`${backendUrl}/api/expense-categories`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch categories');
      const data = await response.json();
      setCategories(Array.isArray(data) ? data : []);
      if (!expenseFormData.category_id && data.length > 0) {
        setExpenseFormData(prev => ({ ...prev, category_id: data[0].id }));
      }
    } catch (error) {
      setErrorMessage('Failed to load categories');
      console.error(error);
    }
  };

  const fetchMonthlyBreakdown = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${backendUrl}/api/expenses/report/monthly/${selectedYear}/${selectedMonth}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch report');
      const data = await response.json();
      setMonthlyBreakdown(data);
    } catch (error) {
      setErrorMessage('Failed to load report');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveExpense = async () => {
    if (!expenseFormData.category_id || !expenseFormData.amount || !expenseFormData.date) {
      setErrorMessage('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const url = editingExpenseId
        ? `${backendUrl}/api/expenses/${editingExpenseId}`
        : `${backendUrl}/api/expenses`;
      const method = editingExpenseId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...expenseFormData,
          category_id: parseInt(expenseFormData.category_id),
          amount: parseFloat(expenseFormData.amount),
        }),
      });

      if (!response.ok) throw new Error(editingExpenseId ? 'Failed to update expense' : 'Failed to create expense');

      setSuccessMessage(editingExpenseId ? 'Expense updated successfully' : 'Expense created successfully');
      setShowExpenseForm(false);
      setEditingExpenseId(null);
      setExpenseFormData({
        date: new Date().toISOString().split('T')[0],
        category_id: categories[0]?.id.toString() || '',
        amount: '',
        description: '',
      });
      fetchExpenses();
    } catch (error) {
      setErrorMessage('Failed to save expense');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteExpense = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this expense?')) return;

    setLoading(true);
    try {
      const response = await fetch(`${backendUrl}/api/expenses/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to delete expense');

      setSuccessMessage('Expense deleted successfully');
      fetchExpenses();
    } catch (error) {
      setErrorMessage('Failed to delete expense');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditExpense = (expense: Expense) => {
    setExpenseFormData({
      date: expense.date,
      category_id: expense.category_id.toString(),
      amount: expense.amount.toString(),
      description: expense.description || '',
    });
    setEditingExpenseId(expense.id);
    setShowExpenseForm(true);
  };

  const handleSaveCategory = async () => {
    if (!categoryFormData.name) {
      setErrorMessage('Category name is required');
      return;
    }

    setLoading(true);
    try {
      const url = editingCategoryId
        ? `${backendUrl}/api/expense-categories/${editingCategoryId}`
        : `${backendUrl}/api/expense-categories`;
      const method = editingCategoryId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(categoryFormData),
      });

      if (!response.ok) throw new Error('Failed to save category');

      setSuccessMessage(editingCategoryId ? 'Category updated' : 'Category created');
      setShowCategoryForm(false);
      setEditingCategoryId(null);
      setCategoryFormData({ name: '', description: '' });
      fetchCategories();
    } catch (error) {
      setErrorMessage('Failed to save category');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCategory = async (id: number) => {
    if (!window.confirm('Are you sure? This will delete the category and any associated expenses.')) return;

    setLoading(true);
    try {
      const response = await fetch(`${backendUrl}/api/expense-categories/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to delete category');

      setSuccessMessage('Category deleted');
      fetchCategories();
    } catch (error) {
      setErrorMessage('Failed to delete category');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryName = (categoryId: number) => {
    return categories.find(c => c.id === categoryId)?.name || 'Unknown';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 shadow-lg">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/dashboard')} className="hover:bg-blue-700 p-2 rounded">
              <FaArrowLeft size={20} />
            </button>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FaChartPie /> Expense Tracking
            </h1>
          </div>
          <button onClick={logout} className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded flex items-center gap-2">
            <FaSignOutAlt /> Logout
          </button>
        </div>
      </div>

      {/* Messages */}
      {successMessage && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
          {successMessage}
        </div>
      )}
      {errorMessage && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {errorMessage}
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto flex gap-4 px-4">
          {['expenses', 'categories', 'reports'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-4 py-3 font-medium border-b-2 ${
                activeTab === tab ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4">
        {activeTab === 'expenses' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Expenses</h2>
              <button
                onClick={() => {
                  setEditingExpenseId(null);
                  setExpenseFormData({
                    date: new Date().toISOString().split('T')[0],
                    category_id: categories[0]?.id.toString() || '',
                    amount: '',
                    description: '',
                  });
                  setShowExpenseForm(true);
                }}
                className="bg-blue-600 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-blue-700"
              >
                <FaPlus /> Add Expense
              </button>
            </div>

            {/* Expenses Table */}
            <div className="bg-white rounded-lg shadow overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100 border-b">
                  <tr>
                    <th className="px-4 py-2 text-left">Date</th>
                    <th className="px-4 py-2 text-left">Category</th>
                    <th className="px-4 py-2 text-left">Description</th>
                    <th className="px-4 py-2 text-right">Amount</th>
                    <th className="px-4 py-2 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map(expense => (
                    <tr key={expense.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-2">{new Date(expense.date).toLocaleDateString()}</td>
                      <td className="px-4 py-2">{getCategoryName(expense.category_id)}</td>
                      <td className="px-4 py-2">{expense.description || '-'}</td>
                      <td className="px-4 py-2 text-right font-semibold">Rs. {expense.amount.toFixed(2)}</td>
                      <td className="px-4 py-2 text-center">
                        <button
                          onClick={() => handleEditExpense(expense)}
                          className="text-blue-600 hover:text-blue-800 mr-2"
                        >
                          <FaEdit />
                        </button>
                        <button
                          onClick={() => handleDeleteExpense(expense.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <FaTrash />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {expenses.length === 0 && (
                <div className="text-center py-8 text-gray-500">No expenses found</div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'categories' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Categories</h2>
              <button
                onClick={() => {
                  setEditingCategoryId(null);
                  setCategoryFormData({ name: '', description: '' });
                  setShowCategoryForm(true);
                }}
                className="bg-blue-600 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-blue-700"
              >
                <FaPlus /> Add Category
              </button>
            </div>

            {/* Categories Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.map(category => (
                <div key={category.id} className="bg-white rounded-lg shadow p-4">
                  <h3 className="text-lg font-semibold mb-2">{category.name}</h3>
                  <p className="text-gray-600 text-sm mb-4">{category.description || 'No description'}</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setCategoryFormData({ name: category.name, description: category.description || '' });
                        setEditingCategoryId(category.id);
                        setShowCategoryForm(true);
                      }}
                      className="flex-1 bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700 flex items-center justify-center gap-2"
                    >
                      <FaEdit /> Edit
                    </button>
                    <button
                      onClick={() => handleDeleteCategory(category.id)}
                      className="flex-1 bg-red-600 text-white px-3 py-2 rounded text-sm hover:bg-red-700 flex items-center justify-center gap-2"
                    >
                      <FaTrash /> Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'reports' && (
          <div>
            <div className="mb-6">
              <div className="flex gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
                  <input
                    type="number"
                    value={selectedYear}
                    onChange={e => setSelectedYear(e.target.value)}
                    className="border rounded px-3 py-2"
                    min="2020"
                    max="2099"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Month</label>
                  <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="border rounded px-3 py-2">
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i} value={String(i + 1).padStart(2, '0')}>
                        {new Date(2000, i).toLocaleString('default', { month: 'long' })}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={fetchMonthlyBreakdown}
                  className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 h-10 mt-6 flex items-center gap-2"
                >
                  <FaCalendar /> Load Report
                </button>
              </div>
            </div>

            {monthlyBreakdown && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-xl font-semibold mb-4">
                  Monthly Report - {monthlyBreakdown.month}
                </h3>
                <div className="mb-6">
                  <div className="text-3xl font-bold text-blue-600">
                    Rs. {monthlyBreakdown.totalExpenses}
                  </div>
                  <p className="text-gray-600">Total Expenses</p>
                </div>

                <table className="w-full">
                  <thead className="bg-gray-100 border-b">
                    <tr>
                      <th className="px-4 py-2 text-left">Category</th>
                      <th className="px-4 py-2 text-center">Count</th>
                      <th className="px-4 py-2 text-right">Total</th>
                      <th className="px-4 py-2 text-right">Average</th>
                      <th className="px-4 py-2 text-right">% of Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlyBreakdown.byCategory.map(row => (
                      <tr key={row.id} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-2">{row.category_name}</td>
                        <td className="px-4 py-2 text-center">{row.count}</td>
                        <td className="px-4 py-2 text-right">Rs. {row.total.toFixed(2)}</td>
                        <td className="px-4 py-2 text-right">Rs. {row.average.toFixed(2)}</td>
                        <td className="px-4 py-2 text-right font-semibold">{row.percentOfTotal}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Expense Form Modal */}
      {showExpenseForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">
              {editingExpenseId ? 'Edit Expense' : 'Add Expense'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                <input
                  type="date"
                  value={expenseFormData.date}
                  onChange={e => setExpenseFormData({ ...expenseFormData, date: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                <select
                  value={expenseFormData.category_id}
                  onChange={e => setExpenseFormData({ ...expenseFormData, category_id: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="">Select a category</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount *</label>
                <input
                  type="number"
                  step="0.01"
                  value={expenseFormData.amount}
                  onChange={e => setExpenseFormData({ ...expenseFormData, amount: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={expenseFormData.description}
                  onChange={e => setExpenseFormData({ ...expenseFormData, description: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  rows={3}
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSaveExpense}
                  disabled={loading}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={() => setShowExpenseForm(false)}
                  className="flex-1 bg-gray-300 text-gray-800 px-4 py-2 rounded hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Category Form Modal */}
      {showCategoryForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">
              {editingCategoryId ? 'Edit Category' : 'Add Category'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category Name *</label>
                <input
                  type="text"
                  value={categoryFormData.name}
                  onChange={e => setCategoryFormData({ ...categoryFormData, name: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={categoryFormData.description}
                  onChange={e => setCategoryFormData({ ...categoryFormData, description: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  rows={3}
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSaveCategory}
                  disabled={loading}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={() => setShowCategoryForm(false)}
                  className="flex-1 bg-gray-300 text-gray-800 px-4 py-2 rounded hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default ExpenseTracking;

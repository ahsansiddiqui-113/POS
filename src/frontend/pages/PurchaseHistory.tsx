import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Footer from '../components/Footer';
import { FaArrowLeft, FaSignOutAlt, FaSearch, FaDownload } from 'react-icons/fa';

interface Purchase {
  id: number;
  product_id: number;
  supplier_id: number;
  quantity: number;
  unit_price: number;
  total_bulk_price: number;
  purchase_date: string;
  expiry_date?: string;
  user_id: number;
  product_name?: string;
  supplier_name?: string;
}

const PurchaseHistory: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout, token } = useAuth();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [backendUrl, setBackendUrl] = useState('http://localhost:3001');

  const pageSize = 20;

  // Check if user is admin
  useEffect(() => {
    if (user?.role !== 'Admin') {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  // Get dynamic backend URL
  useEffect(() => {
    const getBackendUrl = async () => {
      if (window.electron?.getBackendUrl) {
        const url = await window.electron.getBackendUrl();
        setBackendUrl(url || 'http://localhost:3001');
      }
    };
    getBackendUrl();
  }, []);

  // Fetch purchases
  useEffect(() => {
    const fetchPurchases = async () => {
      try {
        setLoading(true);
        setError(null);

        // Build query params
        const params = new URLSearchParams();
        params.append('page', page.toString());
        params.append('pageSize', pageSize.toString());

        if (search) {
          params.append('search', search);
        }

        if (filterStartDate) {
          params.append('startDate', filterStartDate);
        }

        if (filterEndDate) {
          params.append('endDate', filterEndDate);
        }

        // Note: This endpoint needs to be added to backend
        // For now, we'll fetch individual purchases and combine them
        const response = await fetch(
          `${backendUrl}/api/purchases?${params.toString()}`,
          {
            headers: { 'Authorization': `Bearer ${token}` },
          }
        );

        if (!response.ok) {
          // Fallback: Fetch from a basic endpoint if above fails
          const fallbackResponse = await fetch(
            `${backendUrl}/api/purchases/report?limit=1000`,
            {
              headers: { 'Authorization': `Bearer ${token}` },
            }
          );

          if (fallbackResponse.ok) {
            const data = await fallbackResponse.json();
            setPurchases(data || []);
            setTotalPages(1);
          } else {
            setError('Failed to load purchases');
          }
          return;
        }

        const data = await response.json();
        setPurchases(data.data || data || []);
        setTotalPages(Math.ceil((data.total || 0) / pageSize));
      } catch (err) {
        console.error('Error fetching purchases:', err);
        setError('Error loading purchase history');
      } finally {
        setLoading(false);
      }
    };

    if (token && backendUrl) {
      fetchPurchases();
    }
  }, [token, page, search, filterStartDate, filterEndDate, backendUrl]);

  // Format date
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-PK', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  // Calculate totals
  const totalQuantity = purchases.reduce((sum, p) => sum + p.quantity, 0);
  const totalCost = purchases.reduce((sum, p) => sum + p.total_bulk_price, 0);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Purchase History</h1>
            <p className="text-gray-600 mt-1">View all purchase orders</p>
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
        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-600 text-red-700 rounded">
            {error}
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">Filters</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search (Product/Supplier)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-3 text-gray-400">
                  {React.createElement(FaSearch as any, { size: 16 })}
                </span>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search..."
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>

            {/* Start Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                From Date
              </label>
              <input
                type="date"
                value={filterStartDate}
                onChange={(e) => {
                  setFilterStartDate(e.target.value);
                  setPage(1);
                }}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            {/* End Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                To Date
              </label>
              <input
                type="date"
                value={filterEndDate}
                onChange={(e) => {
                  setFilterEndDate(e.target.value);
                  setPage(1);
                }}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            {/* Clear Filters */}
            <div className="flex items-end">
              <button
                onClick={() => {
                  setSearch('');
                  setFilterStartDate('');
                  setFilterEndDate('');
                  setPage(1);
                }}
                className="w-full bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-gray-600 text-sm">Total Purchases</p>
            <p className="text-2xl font-bold text-blue-600">{purchases.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-gray-600 text-sm">Total Quantity</p>
            <p className="text-2xl font-bold text-green-600">{totalQuantity} units</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-gray-600 text-sm">Total Cost</p>
            <p className="text-2xl font-bold text-orange-600">Rs.{totalCost.toFixed(2)}</p>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="px-4 py-8 text-center text-gray-600">
              Loading purchase history...
            </div>
          ) : purchases.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-600">
              No purchases found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-gray-200 to-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold">ID</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Product</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold">Quantity</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold">Unit Price</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold">Total Cost</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Supplier</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Date</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Expiry</th>
                  </tr>
                </thead>
                <tbody>
                  {purchases.map((purchase) => (
                    <tr key={purchase.id} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium">#{purchase.id}</td>
                      <td className="px-4 py-3 text-sm">{purchase.product_name || `Product #${purchase.product_id}`}</td>
                      <td className="px-4 py-3 text-center text-sm font-semibold">{purchase.quantity}</td>
                      <td className="px-4 py-3 text-right text-sm">Rs.{purchase.unit_price?.toFixed(2) || '-'}</td>
                      <td className="px-4 py-3 text-right text-sm font-semibold">Rs.{purchase.total_bulk_price.toFixed(2)}</td>
                      <td className="px-4 py-3 text-sm">{purchase.supplier_name || `Supplier #${purchase.supplier_id}`}</td>
                      <td className="px-4 py-3 text-sm">{formatDate(purchase.purchase_date)}</td>
                      <td className="px-4 py-3 text-sm">
                        {purchase.expiry_date ? formatDate(purchase.expiry_date) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
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
        )}

        {/* Back Button */}
        <button
          onClick={() => navigate('/dashboard')}
          className="mt-6 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center gap-2"
        >
          {React.createElement(FaArrowLeft as any)} Back to Dashboard
        </button>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default PurchaseHistory;

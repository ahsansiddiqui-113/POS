import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Footer from '../components/Footer';
import { FaExclamationTriangle, FaSignOutAlt, FaArrowLeft, FaCheckCircle } from 'react-icons/fa';

interface StockAlert {
  id: number;
  product_id: number;
  alert_type: 'low_stock' | 'expiry_warning';
  triggered_date: string;
  resolved: number;
}

interface Product {
  id: number;
  sku: string;
  name: string;
  quantity_available: number;
  low_stock_threshold: number;
}

interface ExpiringProduct {
  id: number;
  sku: string;
  name: string;
  expiry_date: string;
  days_until_expiry: number;
}

const StockAlerts: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout, token } = useAuth();
  const [activeTab, setActiveTab] = useState<'active' | 'low-stock' | 'expiring'>('active');

  const [activeAlerts, setActiveAlerts] = useState<StockAlert[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);
  const [expiringProducts, setExpiringProducts] = useState<ExpiringProduct[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const backendUrl = window.electron?.getBackendUrl?.() || 'http://localhost:3001';

  useEffect(() => {
    if (!user) navigate('/login');
  }, [user, navigate]);

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

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'active') {
        await Promise.all([fetchActiveAlerts(), fetchSummary()]);
      } else if (activeTab === 'low-stock') {
        await fetchLowStockProducts();
      } else if (activeTab === 'expiring') {
        await fetchExpiringProducts();
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchActiveAlerts = async () => {
    try {
      const response = await fetch(`${backendUrl}/api/stock-alerts?resolved=0`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error();
      const data = await response.json();
      setActiveAlerts(Array.isArray(data) ? data : []);
    } catch (error) {
      setErrorMessage('Failed to load alerts');
    }
  };

  const fetchSummary = async () => {
    try {
      const response = await fetch(`${backendUrl}/api/stock-alerts/summary`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error();
      const data = await response.json();
      setSummary(data);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchLowStockProducts = async () => {
    try {
      const response = await fetch(`${backendUrl}/api/stock-alerts/low-stock`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error();
      const data = await response.json();
      setLowStockProducts(Array.isArray(data) ? data : []);
    } catch (error) {
      setErrorMessage('Failed to load low stock products');
    }
  };

  const fetchExpiringProducts = async () => {
    try {
      const response = await fetch(`${backendUrl}/api/stock-alerts/expiring?days=30`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error();
      const data = await response.json();
      setExpiringProducts(Array.isArray(data) ? data : []);
    } catch (error) {
      setErrorMessage('Failed to load expiring products');
    }
  };

  const handleResolveAlert = async (alertId: number) => {
    try {
      const response = await fetch(`${backendUrl}/api/stock-alerts/${alertId}/resolve`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ notes: 'Resolved by user' }),
      });
      if (!response.ok) throw new Error();
      setSuccessMessage('Alert resolved');
      fetchActiveAlerts();
    } catch (error) {
      setErrorMessage('Failed to resolve alert');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-100 flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-600 to-red-600 text-white p-4 shadow-lg">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/dashboard')} className="hover:bg-red-700 p-2 rounded">
              <FaArrowLeft size={20} />
            </button>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FaExclamationTriangle /> Stock Alerts
            </h1>
          </div>
          <button onClick={logout} className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded flex items-center gap-2">
            <FaSignOutAlt /> Logout
          </button>
        </div>
      </div>

      {/* Messages */}
      {successMessage && <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3">{successMessage}</div>}
      {errorMessage && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3">{errorMessage}</div>}

      {/* Summary Cards */}
      {summary && (
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4 p-4">
            <div className="bg-red-50 rounded p-4">
              <div className="text-2xl font-bold text-red-600">{summary.low_stock_count}</div>
              <div className="text-sm text-gray-600">Low Stock</div>
            </div>
            <div className="bg-yellow-50 rounded p-4">
              <div className="text-2xl font-bold text-yellow-600">{summary.expiring_count}</div>
              <div className="text-sm text-gray-600">Expiring Soon</div>
            </div>
            <div className="bg-orange-50 rounded p-4">
              <div className="text-2xl font-bold text-orange-600">{summary.expired_count}</div>
              <div className="text-sm text-gray-600">Expired</div>
            </div>
            <div className="bg-blue-50 rounded p-4">
              <div className="text-2xl font-bold text-blue-600">{summary.active_alerts}</div>
              <div className="text-sm text-gray-600">Active Alerts</div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto flex gap-4 px-4">
          {['active', 'low-stock', 'expiring'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-4 py-3 font-medium border-b-2 ${
                activeTab === tab ? 'border-orange-600 text-orange-600' : 'border-transparent text-gray-600'
              }`}
            >
              {tab === 'active' ? '🔔 Active' : tab === 'low-stock' ? '📦 Low Stock' : '⏰ Expiring'}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4">
        {activeTab === 'active' && (
          <div className="bg-white rounded-lg shadow overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100 border-b">
                <tr>
                  <th className="px-4 py-2 text-left">Product</th>
                  <th className="px-4 py-2 text-left">Alert Type</th>
                  <th className="px-4 py-2 text-left">Triggered</th>
                  <th className="px-4 py-2 text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {activeAlerts.map(alert => (
                  <tr key={alert.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-2 font-medium">Product #{alert.product_id}</td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-1 rounded text-sm ${
                        alert.alert_type === 'low_stock' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {alert.alert_type === 'low_stock' ? 'Low Stock' : 'Expiry Warning'}
                      </span>
                    </td>
                    <td className="px-4 py-2">{new Date(alert.triggered_date).toLocaleDateString()}</td>
                    <td className="px-4 py-2 text-center">
                      <button
                        onClick={() => handleResolveAlert(alert.id)}
                        className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 flex items-center justify-center gap-1 mx-auto"
                      >
                        <FaCheckCircle /> Resolve
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {activeAlerts.length === 0 && (
              <div className="text-center py-8 text-gray-500">No active alerts</div>
            )}
          </div>
        )}

        {activeTab === 'low-stock' && (
          <div className="bg-white rounded-lg shadow overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100 border-b">
                <tr>
                  <th className="px-4 py-2 text-left">Product</th>
                  <th className="px-4 py-2 text-left">SKU</th>
                  <th className="px-4 py-2 text-right">Available</th>
                  <th className="px-4 py-2 text-right">Threshold</th>
                  <th className="px-4 py-2 text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {lowStockProducts.map(product => (
                  <tr key={product.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-2 font-medium">{product.name}</td>
                    <td className="px-4 py-2 text-sm text-gray-600">{product.sku}</td>
                    <td className="px-4 py-2 text-right font-semibold">{product.quantity_available}</td>
                    <td className="px-4 py-2 text-right">{product.low_stock_threshold}</td>
                    <td className="px-4 py-2 text-center">
                      <span className="px-2 py-1 rounded text-sm bg-red-100 text-red-800">Critical</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {lowStockProducts.length === 0 && (
              <div className="text-center py-8 text-gray-500">All products have sufficient stock</div>
            )}
          </div>
        )}

        {activeTab === 'expiring' && (
          <div className="bg-white rounded-lg shadow overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100 border-b">
                <tr>
                  <th className="px-4 py-2 text-left">Product</th>
                  <th className="px-4 py-2 text-left">SKU</th>
                  <th className="px-4 py-2 text-left">Expiry Date</th>
                  <th className="px-4 py-2 text-right">Days Left</th>
                  <th className="px-4 py-2 text-center">Urgency</th>
                </tr>
              </thead>
              <tbody>
                {expiringProducts.map(product => (
                  <tr key={product.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-2 font-medium">{product.name}</td>
                    <td className="px-4 py-2 text-sm text-gray-600">{product.sku}</td>
                    <td className="px-4 py-2">{new Date(product.expiry_date).toLocaleDateString()}</td>
                    <td className="px-4 py-2 text-right font-semibold">{product.days_until_expiry}</td>
                    <td className="px-4 py-2 text-center">
                      <span className={`px-2 py-1 rounded text-sm ${
                        product.days_until_expiry <= 7 ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {product.days_until_expiry <= 7 ? 'Urgent' : 'Soon'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {expiringProducts.length === 0 && (
              <div className="text-center py-8 text-gray-500">No products expiring soon</div>
            )}
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default StockAlerts;

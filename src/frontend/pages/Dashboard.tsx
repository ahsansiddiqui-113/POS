import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import useApi from '../hooks/useApi';
import Footer from '../components/Footer';
import {
  FaShoppingCart,
  FaBox,
  FaChartBar,
  FaClipboardList,
  FaExchangeAlt,
  FaCogs,
  FaFileAlt,
  FaLock,
  FaHistory,
  FaTag,
  FaGift,
  FaPercent,
  FaTruck,
  FaUsers,
  FaChartPie,
  FaExclamationTriangle,
  FaBarcode,
  FaFileInvoice,
} from 'react-icons/fa';

interface Alert {
  id: string;
  type: string;
  severity: string;
  title: string;
  message: string;
  productId?: number;
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const { data, loading, execute } = useApi<Alert[]>('/api/alerts');

  useEffect(() => {
    execute();
  }, []);

  useEffect(() => {
    if (data) {
      setAlerts(data);
    }
  }, [data]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'bg-red-50 border-red-200';
      case 'medium':
        return 'bg-yellow-50 border-yellow-200';
      case 'low':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600 mt-1">
              Welcome, {user?.username} ({user?.role})
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Navigation - Menu Grid */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Menu</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {/* Core Operations */}
            <button
              onClick={() => navigate('/pos')}
              className="bg-green-600 hover:bg-green-700 text-white p-4 rounded-lg font-semibold flex flex-col items-center gap-2 transition-all hover:shadow-lg"
            >
              {React.createElement(FaShoppingCart as any, { size: 24 })}
              <span className="text-sm">POS</span>
            </button>

            <button
              onClick={() => navigate('/inventory')}
              className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-lg font-semibold flex flex-col items-center gap-2 transition-all hover:shadow-lg"
            >
              {React.createElement(FaBox as any, { size: 24 })}
              <span className="text-sm">Inventory</span>
            </button>

            <button
              onClick={() => navigate('/returns')}
              className="bg-orange-600 hover:bg-orange-700 text-white p-4 rounded-lg font-semibold flex flex-col items-center gap-2 transition-all hover:shadow-lg"
            >
              {React.createElement(FaExchangeAlt as any, { size: 24 })}
              <span className="text-sm">Returns</span>
            </button>

            <button
              onClick={() => navigate('/rental')}
              className="bg-pink-600 hover:bg-pink-700 text-white p-4 rounded-lg font-semibold flex flex-col items-center gap-2 transition-all hover:shadow-lg"
            >
              {React.createElement(FaGift as any, { size: 24 })}
              <span className="text-sm">Rental</span>
            </button>

            <button
              onClick={() => navigate('/settings')}
              className="bg-gray-600 hover:bg-gray-700 text-white p-4 rounded-lg font-semibold flex flex-col items-center gap-2 transition-all hover:shadow-lg"
            >
              {React.createElement(FaCogs as any, { size: 24 })}
              <span className="text-sm">Settings</span>
            </button>

            {/* New Features */}
            <button
              onClick={() => navigate('/expenses')}
              className="bg-blue-500 hover:bg-blue-600 text-white p-4 rounded-lg font-semibold flex flex-col items-center gap-2 transition-all hover:shadow-lg"
            >
              {React.createElement(FaChartPie as any, { size: 24 })}
              <span className="text-sm">Expenses</span>
            </button>

            <button
              onClick={() => navigate('/stock-alerts')}
              className="bg-red-500 hover:bg-red-600 text-white p-4 rounded-lg font-semibold flex flex-col items-center gap-2 transition-all hover:shadow-lg"
            >
              {React.createElement(FaExclamationTriangle as any, { size: 24 })}
              <span className="text-sm">Stock Alerts</span>
            </button>

            <button
              onClick={() => navigate('/barcodes')}
              className="bg-green-500 hover:bg-green-600 text-white p-4 rounded-lg font-semibold flex flex-col items-center gap-2 transition-all hover:shadow-lg"
            >
              {React.createElement(FaBarcode as any, { size: 24 })}
              <span className="text-sm">Barcodes</span>
            </button>

            <button
              onClick={() => navigate('/sales-analytics')}
              className="bg-blue-700 hover:bg-blue-800 text-white p-4 rounded-lg font-semibold flex flex-col items-center gap-2 transition-all hover:shadow-lg"
            >
              {React.createElement(FaChartBar as any, { size: 24 })}
              <span className="text-sm">Analytics</span>
            </button>

            {/* Admin Only Section */}
            {user?.role === 'Admin' && (
              <>
                <button
                  onClick={() => navigate('/purchase')}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white p-4 rounded-lg font-semibold flex flex-col items-center gap-2 transition-all hover:shadow-lg"
                >
                  {React.createElement(FaClipboardList as any, { size: 24 })}
                  <span className="text-sm">Purchase</span>
                </button>

                <button
                  onClick={() => navigate('/purchase-history')}
                  className="bg-cyan-600 hover:bg-cyan-700 text-white p-4 rounded-lg font-semibold flex flex-col items-center gap-2 transition-all hover:shadow-lg"
                >
                  {React.createElement(FaHistory as any, { size: 24 })}
                  <span className="text-sm">History</span>
                </button>

                <button
                  onClick={() => navigate('/suppliers')}
                  className="bg-amber-600 hover:bg-amber-700 text-white p-4 rounded-lg font-semibold flex flex-col items-center gap-2 transition-all hover:shadow-lg"
                >
                  {React.createElement(FaTruck as any, { size: 24 })}
                  <span className="text-sm">Suppliers</span>
                </button>

                <button
                  onClick={() => navigate('/reports')}
                  className="bg-purple-600 hover:bg-purple-700 text-white p-4 rounded-lg font-semibold flex flex-col items-center gap-2 transition-all hover:shadow-lg"
                >
                  {React.createElement(FaChartBar as any, { size: 24 })}
                  <span className="text-sm">Reports</span>
                </button>

                <button
                  onClick={() => navigate('/categories')}
                  className="bg-teal-600 hover:bg-teal-700 text-white p-4 rounded-lg font-semibold flex flex-col items-center gap-2 transition-all hover:shadow-lg"
                >
                  {React.createElement(FaTag as any, { size: 24 })}
                  <span className="text-sm">Categories</span>
                </button>

                <button
                  onClick={() => navigate('/audit-log')}
                  className="bg-red-600 hover:bg-red-700 text-white p-4 rounded-lg font-semibold flex flex-col items-center gap-2 transition-all hover:shadow-lg"
                >
                  {React.createElement(FaFileAlt as any, { size: 24 })}
                  <span className="text-sm">Audit Log</span>
                </button>

                <button
                  onClick={() => navigate('/users')}
                  className="bg-indigo-500 hover:bg-indigo-600 text-white p-4 rounded-lg font-semibold flex flex-col items-center gap-2 transition-all hover:shadow-lg"
                >
                  {React.createElement(FaUsers as any, { size: 24 })}
                  <span className="text-sm">Users</span>
                </button>

                <button
                  onClick={() => navigate('/bulk-pricing')}
                  className="bg-lime-600 hover:bg-lime-700 text-white p-4 rounded-lg font-semibold flex flex-col items-center gap-2 transition-all hover:shadow-lg"
                >
                  {React.createElement(FaPercent as any, { size: 24 })}
                  <span className="text-sm">Pricing</span>
                </button>

                {/* New Admin Features */}
                <button
                  onClick={() => navigate('/employees')}
                  className="bg-purple-500 hover:bg-purple-600 text-white p-4 rounded-lg font-semibold flex flex-col items-center gap-2 transition-all hover:shadow-lg"
                >
                  {React.createElement(FaUsers as any, { size: 24 })}
                  <span className="text-sm">Employees</span>
                </button>

                <button
                  onClick={() => navigate('/invoice-settings')}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white p-4 rounded-lg font-semibold flex flex-col items-center gap-2 transition-all hover:shadow-lg"
                >
                  {React.createElement(FaFileInvoice as any, { size: 24 })}
                  <span className="text-sm">Invoice Setup</span>
                </button>

                <button
                  onClick={() => navigate('/store-settings')}
                  className="bg-cyan-600 hover:bg-cyan-700 text-white p-4 rounded-lg font-semibold flex flex-col items-center gap-2 transition-all hover:shadow-lg"
                >
                  {React.createElement(FaCogs as any, { size: 24 })}
                  <span className="text-sm">Store Config</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8 flex-grow">
        {/* Alerts Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Active Alerts ({alerts.length})
          </h2>

          {loading && (
            <div className="text-center text-gray-600">Loading alerts...</div>
          )}

          {!loading && alerts.length === 0 && (
            <div className="text-center text-gray-600 py-8">
              No active alerts. Everything is running smoothly!
            </div>
          )}

          {!loading && alerts.length > 0 && (
            <div className="grid gap-4">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`border-l-4 p-4 rounded ${getSeverityColor(alert.severity)}`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-gray-900">{alert.title}</h3>
                      <p className="text-sm text-gray-600 mt-1">{alert.message}</p>
                    </div>
                    <span className="text-xs font-semibold px-2 py-1 bg-gray-200 rounded-full">
                      {alert.type}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
          <button
            onClick={() => navigate('/pos')}
            className="bg-green-600 hover:bg-green-700 text-white p-6 rounded-lg text-lg font-bold flex items-center justify-center gap-3 transition-all hover:shadow-lg hover:scale-105"
          >
            {React.createElement(FaShoppingCart as any, { size: 24 })}
            Start POS
          </button>
          <button
            onClick={() => navigate('/inventory')}
            className="bg-blue-600 hover:bg-blue-700 text-white p-6 rounded-lg text-lg font-bold flex items-center justify-center gap-3 transition-all hover:shadow-lg hover:scale-105"
          >
            {React.createElement(FaBox as any, { size: 24 })}
            View Inventory
          </button>
          {user?.role === 'Admin' && (
            <button
              onClick={() => navigate('/reports')}
              className="bg-purple-600 hover:bg-purple-700 text-white p-6 rounded-lg text-lg font-bold flex items-center justify-center gap-3 transition-all hover:shadow-lg hover:scale-105"
            >
              {React.createElement(FaChartBar as any, { size: 24 })}
              View Reports
            </button>
          )}
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default Dashboard;

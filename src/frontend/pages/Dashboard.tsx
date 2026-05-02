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

      {/* Navigation */}
      <nav className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 flex space-x-1 overflow-x-auto">
          <button
            onClick={() => navigate('/pos')}
            className="px-4 py-3 text-blue-600 border-b-2 border-blue-600 font-medium flex items-center gap-2 hover:bg-blue-50 whitespace-nowrap"
          >
            {React.createElement(FaShoppingCart as any, { size: 18 })}
            POS
          </button>
          <button
            onClick={() => navigate('/inventory')}
            className="px-4 py-3 text-gray-600 hover:text-blue-600 hover:bg-gray-50 flex items-center gap-2 whitespace-nowrap"
          >
            {React.createElement(FaBox as any, { size: 18 })}
            Inventory
          </button>
          <button
            onClick={() => navigate('/returns')}
            className="px-4 py-3 text-gray-600 hover:text-blue-600 hover:bg-gray-50 flex items-center gap-2 whitespace-nowrap"
          >
            {React.createElement(FaExchangeAlt as any, { size: 18 })}
            Returns
          </button>
          <button
            onClick={() => navigate('/rental')}
            className="px-4 py-3 text-gray-600 hover:text-blue-600 hover:bg-gray-50 flex items-center gap-2 whitespace-nowrap"
          >
            {React.createElement(FaGift as any, { size: 18 })}
            Rental
          </button>
          <button
            onClick={() => navigate('/settings')}
            className="px-4 py-3 text-gray-600 hover:text-blue-600 hover:bg-gray-50 flex items-center gap-2 whitespace-nowrap"
          >
            {React.createElement(FaCogs as any, { size: 18 })}
            Settings
          </button>
          {user?.role === 'Admin' && (
            <>
              <button
                onClick={() => navigate('/purchase')}
                className="px-4 py-3 text-gray-600 hover:text-blue-600 hover:bg-gray-50 flex items-center gap-2 whitespace-nowrap"
              >
                {React.createElement(FaClipboardList as any, { size: 18 })}
                Purchase
              </button>
              <button
                onClick={() => navigate('/reports')}
                className="px-4 py-3 text-gray-600 hover:text-blue-600 hover:bg-gray-50 flex items-center gap-2 whitespace-nowrap"
              >
                {React.createElement(FaChartBar as any, { size: 18 })}
                Reports
              </button>
              <button
                onClick={() => navigate('/audit-log')}
                className="px-4 py-3 text-gray-600 hover:text-blue-600 hover:bg-gray-50 flex items-center gap-2 whitespace-nowrap"
              >
                {React.createElement(FaHistory as any, { size: 18 })}
                Audit Log
              </button>
              <button
                onClick={() => navigate('/categories')}
                className="px-4 py-3 text-gray-600 hover:text-blue-600 hover:bg-gray-50 flex items-center gap-2 whitespace-nowrap"
              >
                {React.createElement(FaTag as any, { size: 18 })}
                Categories
              </button>
              <button
                onClick={() => navigate('/bulk-pricing')}
                className="px-4 py-3 text-gray-600 hover:text-blue-600 hover:bg-gray-50 flex items-center gap-2 whitespace-nowrap"
              >
                {React.createElement(FaPercent as any, { size: 18 })}
                Bulk Pricing
              </button>
            </>
          )}
        </div>
      </nav>

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

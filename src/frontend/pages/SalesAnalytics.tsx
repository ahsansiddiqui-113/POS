import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Footer from '../components/Footer';
import { FaChartBar, FaArrowLeft, FaChartLine, FaCalendar, FaGift, FaBullseye } from 'react-icons/fa';

interface SalesData {
  today: number;
  thisWeek: number;
  thisMonth: number;
  thisYear: number;
  allTime: number;
  dailyTotals: Array<{ date: string; total: number }>;
  weeklyTotals: Array<{ week: string; total: number }>;
  monthlyTotals: Array<{ month: string; total: number }>;
  yearlyTotals: Array<{ year: string; total: number }>;
}

export default function SalesAnalytics() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [salesData, setSalesData] = useState<SalesData | null>(null);
  const backendUrl = window.electron?.getBackendUrl?.() || 'http://localhost:3001';

  useEffect(() => {
    if (!user) navigate('/login');
  }, [user, navigate]);

  useEffect(() => {
    fetchSalesData();
  }, []);

  const fetchSalesData = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${backendUrl}/api/reports/sales-analytics`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch sales data');
      }

      const data = await response.json();
      setSalesData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch sales data');
      console.error('Error fetching sales data:', err);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({
    title,
    value,
    icon: Icon,
    color,
    period,
  }: {
    title: string;
    value: number;
    icon: any;
    color: string;
    period: string;
  }) => (
    <div className={`${color} rounded-2xl p-8 text-white shadow-lg hover:shadow-2xl transition-all hover:scale-105`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm opacity-90 font-medium">{title}</p>
          <p className="text-xs opacity-75">{period}</p>
        </div>
        <Icon size={32} className="opacity-80" />
      </div>
      <p className="text-4xl font-bold">Rs. {(value / 1000).toFixed(1)}K</p>
      <p className="text-xs opacity-80 mt-2">{value.toLocaleString('en-PK')} PKR</p>
    </div>
  );

  const ChartBar = ({
    label,
    value,
    maxValue,
    color,
  }: {
    label: string;
    value: number;
    maxValue: number;
    color: string;
  }) => {
    const percentage = (value / maxValue) * 100;
    return (
      <div className="mb-4">
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm font-medium text-gray-700">{label}</span>
          <span className="text-sm font-bold text-gray-900">
            Rs. {value.toLocaleString('en-PK', { maximumFractionDigits: 0 })}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div
            className={`h-full ${color} transition-all duration-500 ease-out`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col">
      <div className="flex-grow">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-cyan-600 text-white py-8 px-6 shadow-xl">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-4 mb-3">
              <button
                onClick={() => navigate('/dashboard')}
                className="hover:bg-blue-800 p-2 rounded-lg transition"
              >
                <FaArrowLeft size={20} />
              </button>
              <FaChartBar size={32} />
              <h1 className="text-4xl font-bold">Sales Analytics</h1>
            </div>
            <p className="text-blue-100 ml-14">Real-time insights into your business performance</p>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="max-w-7xl mx-auto px-6 mt-6">
            <div className="bg-red-50 border-l-4 border-red-600 p-4 rounded-lg">
              <p className="text-red-700 font-medium">⚠️ {error}</p>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="max-w-7xl mx-auto px-6 py-10 w-full">
          {loading ? (
            <div className="text-center py-20">
              <div className="inline-block">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
              </div>
              <p className="text-gray-600 mt-4">Loading analytics data...</p>
            </div>
          ) : salesData ? (
            <div className="space-y-10">
              {/* Primary KPI Cards */}
              <div>
                <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                  <FaChartLine className="text-blue-600" />
                  Key Performance Indicators
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                  <StatCard
                    title="Today's Sales"
                    value={salesData.today}
                    icon={FaCalendar}
                    color="bg-gradient-to-br from-blue-500 to-blue-600"
                    period="Current Day"
                  />
                  <StatCard
                    title="This Week"
                    value={salesData.thisWeek}
                    icon={FaChartLine}
                    color="bg-gradient-to-br from-green-500 to-green-600"
                    period="Last 7 Days"
                  />
                  <StatCard
                    title="This Month"
                    value={salesData.thisMonth}
                    icon={FaGift}
                    color="bg-gradient-to-br from-purple-500 to-purple-600"
                    period="Current Month"
                  />
                  <StatCard
                    title="This Year"
                    value={salesData.thisYear}
                    icon={FaBullseye}
                    color="bg-gradient-to-br from-orange-500 to-orange-600"
                    period="Current Year"
                  />
                  <StatCard
                    title="All Time"
                    value={salesData.allTime}
                    icon={FaChartBar}
                    color="bg-gradient-to-br from-pink-500 to-pink-600"
                    period="Total"
                  />
                </div>
              </div>

              {/* Daily Sales Chart */}
              <div className="bg-white rounded-2xl shadow-lg p-8">
                <h3 className="text-2xl font-bold text-gray-800 mb-2">📅 Daily Sales</h3>
                <p className="text-gray-600 mb-6">Last 30 days performance</p>
                <div className="space-y-2">
                  {salesData.dailyTotals.length > 0 ? (
                    salesData.dailyTotals.slice(-30).map((item, idx) => (
                      <ChartBar
                        key={idx}
                        label={item.date}
                        value={item.total}
                        maxValue={Math.max(...salesData.dailyTotals.map((d) => d.total), 1)}
                        color="bg-gradient-to-r from-blue-400 to-blue-600"
                      />
                    ))
                  ) : (
                    <p className="text-center text-gray-500 py-8">No daily sales data available</p>
                  )}
                </div>
              </div>

              {/* Weekly Sales Chart */}
              <div className="bg-white rounded-2xl shadow-lg p-8">
                <h3 className="text-2xl font-bold text-gray-800 mb-2">📊 Weekly Sales</h3>
                <p className="text-gray-600 mb-6">Last 12 weeks overview</p>
                <div className="space-y-2">
                  {salesData.weeklyTotals.length > 0 ? (
                    salesData.weeklyTotals.slice(-12).map((item, idx) => (
                      <ChartBar
                        key={idx}
                        label={`Week ${idx + 1}`}
                        value={item.total}
                        maxValue={Math.max(...salesData.weeklyTotals.map((w) => w.total), 1)}
                        color="bg-gradient-to-r from-green-400 to-green-600"
                      />
                    ))
                  ) : (
                    <p className="text-center text-gray-500 py-8">No weekly sales data available</p>
                  )}
                </div>
              </div>

              {/* Monthly Sales Chart */}
              <div className="bg-white rounded-2xl shadow-lg p-8">
                <h3 className="text-2xl font-bold text-gray-800 mb-2">📈 Monthly Sales</h3>
                <p className="text-gray-600 mb-6">Last 12 months trend</p>
                <div className="space-y-2">
                  {salesData.monthlyTotals.length > 0 ? (
                    salesData.monthlyTotals.slice(-12).map((item, idx) => (
                      <ChartBar
                        key={idx}
                        label={item.month}
                        value={item.total}
                        maxValue={Math.max(...salesData.monthlyTotals.map((m) => m.total), 1)}
                        color="bg-gradient-to-r from-purple-400 to-purple-600"
                      />
                    ))
                  ) : (
                    <p className="text-center text-gray-500 py-8">No monthly sales data available</p>
                  )}
                </div>
              </div>

              {/* Yearly Sales Chart */}
              <div className="bg-white rounded-2xl shadow-lg p-8">
                <h3 className="text-2xl font-bold text-gray-800 mb-2">🎯 Yearly Sales</h3>
                <p className="text-gray-600 mb-6">Annual performance summary</p>
                <div className="space-y-2">
                  {salesData.yearlyTotals.length > 0 ? (
                    salesData.yearlyTotals.map((item, idx) => (
                      <ChartBar
                        key={idx}
                        label={item.year}
                        value={item.total}
                        maxValue={Math.max(...salesData.yearlyTotals.map((y) => y.total), 1)}
                        color="bg-gradient-to-r from-orange-400 to-orange-600"
                      />
                    ))
                  ) : (
                    <p className="text-center text-gray-500 py-8">No yearly sales data available</p>
                  )}
                </div>
              </div>

              {/* Summary Stats */}
              <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-2xl shadow-lg p-8 border border-blue-100">
                <h3 className="text-2xl font-bold text-gray-800 mb-6">📊 Summary</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white p-6 rounded-xl shadow-sm">
                    <p className="text-gray-600 text-sm font-medium mb-2">Average Daily Sales</p>
                    <p className="text-3xl font-bold text-blue-600">
                      Rs. {(salesData.dailyTotals.length > 0
                        ? salesData.dailyTotals.reduce((a, b) => a + b.total, 0) / salesData.dailyTotals.length
                        : 0
                      ).toLocaleString('en-PK', { maximumFractionDigits: 0 })}
                    </p>
                  </div>
                  <div className="bg-white p-6 rounded-xl shadow-sm">
                    <p className="text-gray-600 text-sm font-medium mb-2">Best Day</p>
                    <p className="text-3xl font-bold text-green-600">
                      Rs. {(salesData.dailyTotals.length > 0
                        ? Math.max(...salesData.dailyTotals.map((d) => d.total))
                        : 0
                      ).toLocaleString('en-PK', { maximumFractionDigits: 0 })}
                    </p>
                  </div>
                  <div className="bg-white p-6 rounded-xl shadow-sm">
                    <p className="text-gray-600 text-sm font-medium mb-2">Growth Rate</p>
                    <p className="text-3xl font-bold text-purple-600">
                      {salesData.dailyTotals.length > 1
                        ? ((salesData.dailyTotals[salesData.dailyTotals.length - 1].total -
                            salesData.dailyTotals[0].total) /
                            salesData.dailyTotals[0].total *
                            100).toFixed(1)
                        : 0}
                      %
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-600 py-20">No sales data available</div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}

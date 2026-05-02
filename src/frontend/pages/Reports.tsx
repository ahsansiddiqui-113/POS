import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import useApi from '../hooks/useApi';

const Reports: React.FC = () => {
  const navigate = useNavigate();
  const { logout, token } = useAuth();
  const [reportType, setReportType] = useState('daily_sales');
  const [startDate, setStartDate] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const backendUrl = window.electron?.getBackendUrl?.() || 'http://localhost:3001';

  const handleGenerateReport = async () => {
    if (!startDate || !endDate) {
      setError('Please select both start and end dates');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${backendUrl}/api/reports/data/${reportType}?startDate=${startDate}&endDate=${endDate}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to generate report');
      }

      const data = await response.json();
      setReportData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error generating report');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format: 'pdf' | 'excel') => {
    if (!startDate || !endDate) {
      setError('Please select both start and end dates');
      return;
    }

    try {
      const ext = format === 'pdf' ? 'pdf' : 'excel';
      const response = await fetch(
        `${backendUrl}/api/reports/${ext}/${reportType}?startDate=${startDate}&endDate=${endDate}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to export as ${format}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `report-${reportType}-${Date.now()}.${format === 'pdf' ? 'pdf' : 'xlsx'}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    }
  };

  const renderReportData = () => {
    if (!reportData) return null;

    if (typeof reportData === 'object' && !Array.isArray(reportData)) {
      // Single object report (profit, inventory)
      return (
        <div className="space-y-4">
          {Object.entries(reportData).map(([key, value]) => (
            <div key={key} className="flex justify-between border-b pb-2">
              <span className="font-medium">{key.replace(/_/g, ' ')}:</span>
              <span className="font-bold">{String(value)}</span>
            </div>
          ))}
        </div>
      );
    }

    if (Array.isArray(reportData) && reportData.length > 0) {
      // Array of records
      const keys = Object.keys(reportData[0]);

      // Format column headers
      const formatHeader = (key: string) => {
        const headerMap: { [key: string]: string } = {
          'sale_id': 'Sale ID',
          'sale_date': 'Date & Time',
          'user_name': 'User',
          'product_name': 'Product',
          'quantity': 'Qty',
          'unit_price': 'Unit Price (Rs.)',
          'discount_percentage': 'Discount %',
          'discounted_price': 'Final Price (Rs.)',
          'payment_method': 'Payment Method',
          'total_amount': 'Total Amount (Rs.)',
        };
        return headerMap[key] || key.replace(/_/g, ' ');
      };

      const formatValue = (key: string, value: any) => {
        if (value === null || value === undefined) return '-';
        if (key.includes('price') || key.includes('amount') || key === 'total_amount') {
          return typeof value === 'number' ? value.toFixed(2) : value;
        }
        if (key === 'sale_date') {
          return new Date(value).toLocaleString();
        }
        return value;
      };

      return (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-blue-100 sticky top-0">
                {keys.map((key) => (
                  <th key={key} className="border px-3 py-2 text-left font-bold">
                    {formatHeader(key)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {reportData.map((row: any, idx: number) => (
                <tr key={idx} className="hover:bg-gray-50 border-b">
                  {keys.map((key) => (
                    <td
                      key={key}
                      className="border px-3 py-2"
                      style={{
                        textAlign: (key.includes('price') || key.includes('amount') || key.includes('quantity')) ? 'right' : 'left'
                      }}
                    >
                      {formatValue(key, row[key])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    return <p className="text-gray-600">No data available</p>;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Reports & Analytics</h1>
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

      <main className="max-w-7xl mx-auto px-4 py-8">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Report Selection */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Generate Report</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Report Type
                </label>
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg"
                >
                  <option value="daily_sales">Daily Sales</option>
                  <option value="monthly_sales">Monthly Sales</option>
                  <option value="profit">Profit Analysis</option>
                  <option value="inventory">Inventory Value</option>
                  <option value="category">Category Performance</option>
                  <option value="best_sellers">Best Sellers</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>

              <button
                onClick={handleGenerateReport}
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-2 px-4 rounded-lg"
              >
                {loading ? 'Generating...' : 'Generate Report'}
              </button>

              {reportData && (
                <div className="pt-4 border-t">
                  <h3 className="font-bold mb-3">Export Options</h3>
                  <div className="space-y-2">
                    <button
                      onClick={() => handleExport('pdf')}
                      className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg text-sm"
                    >
                      📄 Export as PDF
                    </button>
                    <button
                      onClick={() => handleExport('excel')}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg text-sm"
                    >
                      📊 Export as Excel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Report Preview */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Report Data</h2>
            {loading ? (
              <div className="text-center py-12 text-gray-600">
                Loading report...
              </div>
            ) : reportData ? (
              <div className="max-h-96 overflow-y-auto">
                {renderReportData()}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-600">
                Select report options and click "Generate Report" to view data
              </div>
            )}
          </div>
        </div>

        <button
          onClick={() => navigate('/dashboard')}
          className="mt-6 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded"
        >
          Back to Dashboard
        </button>
      </main>
    </div>
  );
};

export default Reports;

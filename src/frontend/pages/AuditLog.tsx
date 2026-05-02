import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Footer from '../components/Footer';
import {
  FaSignOutAlt,
  FaChevronDown,
  FaChevronUp,
  FaHistory,
  FaDownload,
  FaArrowLeft,
} from 'react-icons/fa';

interface AuditLog {
  id: number;
  timestamp: string;
  user: { id: number; username: string; email?: string };
  action: string;
  entity_type: string;
  entity_id: number;
  old_value?: any;
  new_value?: any;
}

interface AuditListResponse {
  data: AuditLog[];
  total: number;
  page: number;
  pageSize: number;
  pages: number;
}

const AuditLog: React.FC = () => {
  const navigate = useNavigate();
  const { logout, token } = useAuth();
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  // Filters
  const [filters, setFilters] = useState({
    action: '',
    user_id: '',
    date_from: '',
    date_to: '',
  });
  const [users, setUsers] = useState<Array<{ id: number; username: string }>>([]);

  const backendUrl = 'http://localhost:3001';

  // Fetch audit logs
  const fetchAuditLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: '20',
        ...(filters.action && { action: filters.action }),
        ...(filters.user_id && { user_id: filters.user_id }),
        ...(filters.date_from && { date_from: filters.date_from }),
        ...(filters.date_to && { date_to: filters.date_to }),
      });

      const response = await fetch(`${backendUrl}/api/audit/logs?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch audit logs');

      const data: AuditListResponse = await response.json();
      setAuditLogs(data.data);
      setTotalPages(data.pages);

      // Extract unique users
      const uniqueUsers = Array.from(
        new Map(
          data.data
            .filter((log) => log.user)
            .map((log) => [log.user.id, { id: log.user.id, username: log.user.username }])
        ).values()
      );
      setUsers(uniqueUsers);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch logs when filters or page changes
  useEffect(() => {
    fetchAuditLogs();
  }, [page, filters]);

  const handleFilterChange = (field: string, value: string) => {
    setFilters({ ...filters, [field]: value });
    setPage(1);
  };

  const toggleExpandRow = (id: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  const getActionBadgeColor = (action: string) => {
    switch (action) {
      case 'CREATE':
        return 'bg-green-100 text-green-800';
      case 'UPDATE':
        return 'bg-blue-100 text-blue-800';
      case 'DELETE':
        return 'bg-red-100 text-red-800';
      case 'STOCK_ADJUSTMENT':
        return 'bg-yellow-100 text-yellow-800';
      case 'CHANGE_PASSWORD':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatValue = (value: any) => {
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  };

  const renderChanges = (log: AuditLog) => {
    if (log.action === 'CREATE' && log.new_value) {
      return <span className="text-green-700">Created with {Object.keys(log.new_value).length} fields</span>;
    }

    if (log.action === 'DELETE' && log.old_value) {
      return <span className="text-red-700">Deleted {Object.keys(log.old_value).length} fields</span>;
    }

    if (log.action === 'CHANGE_PASSWORD' && log.new_value) {
      const username = log.new_value.username || 'Unknown';
      return <span className="text-purple-700">Password changed by user: <strong>{username}</strong></span>;
    }

    if (log.action === 'UPDATE' && log.old_value && log.new_value) {
      const changes = Object.keys(log.new_value).map((key) => (
        <div key={key} className="text-sm">
          <strong>{key}:</strong> {String(log.old_value[key] || 'N/A')} → {String(log.new_value[key])}
        </div>
      ));
      return <div className="space-y-1">{changes}</div>;
    }

    return <span className="text-gray-600">No details available</span>;
  };

  const handleExportCSV = () => {
    const headers = ['Timestamp', 'User', 'Action', 'Entity Type', 'Entity ID', 'Changes'];
    const csvContent = [
      headers.join(','),
      ...auditLogs.map((log) => {
        const changes =
          log.action === 'UPDATE' && log.old_value && log.new_value
            ? Object.keys(log.new_value)
                .map((key) => `${key}: ${log.old_value[key]} → ${log.new_value[key]}`)
                .join('; ')
            : JSON.stringify({ old: log.old_value, new: log.new_value }).substring(0, 50);

        return [
          log.timestamp,
          log.user?.username || 'System',
          log.action,
          log.entity_type,
          log.entity_id,
          `"${changes}"`,
        ].join(',');
      }),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `audit-logs-${new Date().toISOString()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Audit Log</h1>
            <p className="text-gray-600 mt-1">View all inventory changes and system activities</p>
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
        {/* Filters Section */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Filters</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Action Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Action</label>
              <select
                value={filters.action}
                onChange={(e) => handleFilterChange('action', e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="">All Actions</option>
                <option value="CREATE">Create</option>
                <option value="UPDATE">Update</option>
                <option value="DELETE">Delete</option>
              </select>
            </div>

            {/* User Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">User</label>
              <select
                value={filters.user_id}
                onChange={(e) => handleFilterChange('user_id', e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="">All Users</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.username}
                  </option>
                ))}
              </select>
            </div>

            {/* Date From */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">From Date</label>
              <input
                type="date"
                value={filters.date_from}
                onChange={(e) => handleFilterChange('date_from', e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            {/* Date To */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">To Date</label>
              <input
                type="date"
                value={filters.date_to}
                onChange={(e) => handleFilterChange('date_to', e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>

          {/* Export Button */}
          <div className="mt-4 flex gap-2">
            <button
              onClick={handleExportCSV}
              disabled={auditLogs.length === 0}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg font-semibold"
            >
              Export to CSV
            </button>
            <button
              onClick={() => setFilters({ action: '', user_id: '', date_from: '', date_to: '' })}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-semibold"
            >
              Clear Filters
            </button>
          </div>
        </div>

        {/* Audit Logs Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Timestamp</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">User</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Action</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Entity Type</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Changes</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold">Details</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-600">
                      Loading...
                    </td>
                  </tr>
                ) : auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-600">
                      No audit logs found
                    </td>
                  </tr>
                ) : (
                  auditLogs.map((log) => (
                    <React.Fragment key={log.id}>
                      <tr className="border-t hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium">
                          {log.user?.username || 'System'}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getActionBadgeColor(log.action)}`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">{log.entity_type}</td>
                        <td className="px-4 py-3 text-sm">
                          <div className="max-h-20 overflow-hidden overflow-y-auto">
                            {renderChanges(log)}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => toggleExpandRow(log.id)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            {expandedRows.has(log.id) ? (
                              React.createElement(FaChevronUp as any)
                            ) : (
                              React.createElement(FaChevronDown as any)
                            )}
                          </button>
                        </td>
                      </tr>

                      {/* Expanded Details Row */}
                      {expandedRows.has(log.id) && (
                        <tr className="border-t bg-gray-50">
                          <td colSpan={6} className="px-4 py-4">
                            <div className="bg-white p-4 rounded border border-gray-200">
                              <h4 className="font-bold mb-2">Full Details</h4>

                              {log.old_value && (
                                <div className="mb-4">
                                  <h5 className="font-semibold text-gray-700 mb-2">Old Value:</h5>
                                  <pre className="bg-gray-100 p-2 rounded text-xs overflow-x-auto">
                                    {formatValue(log.old_value)}
                                  </pre>
                                </div>
                              )}

                              {log.new_value && (
                                <div className="mb-4">
                                  <h5 className="font-semibold text-gray-700 mb-2">New Value:</h5>
                                  <pre className="bg-gray-100 p-2 rounded text-xs overflow-x-auto">
                                    {formatValue(log.new_value)}
                                  </pre>
                                </div>
                              )}

                              <div className="text-xs text-gray-600">
                                <p>
                                  <strong>User Email:</strong> {log.user?.email || 'N/A'}
                                </p>
                                <p>
                                  <strong>Entity ID:</strong> {log.entity_id}
                                </p>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))
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
          {React.createElement(FaArrowLeft as any, { size: 16 })}
          Back to Dashboard
        </button>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default AuditLog;

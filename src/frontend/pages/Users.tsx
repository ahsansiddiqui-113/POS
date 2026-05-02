import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FaEdit, FaLock, FaSignOutAlt, FaArrowLeft } from 'react-icons/fa';

interface User {
  id: number;
  username: string;
  email: string | null;
  role: string;
  active: number;
  created_at: string;
  updated_at: string;
}

interface AuditLog {
  id: number;
  user_id: number;
  action: string;
  entity_type: string;
  entity_id: number;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
  admin_id: number | null;
}

const Users: React.FC = () => {
  const navigate = useNavigate();
  const { user: authUser, logout, token } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [backendUrl, setBackendUrl] = useState('http://localhost:3001');

  // Modal states
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);

  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // Edit form state
  const [editForm, setEditForm] = useState({
    username: '',
    email: '',
    role: '',
  });

  // Password change state
  const [passwordForm, setPasswordForm] = useState({
    newPassword: '',
    confirmPassword: '',
  });

  const roles = ['Admin', 'Jewellery', 'Cosmetics', 'Purse&Bags', 'Clothes'];

  // Get backend URL
  useEffect(() => {
    const getBackendUrl = async () => {
      if (window.electron?.getBackendUrl) {
        const url = await window.electron.getBackendUrl();
        setBackendUrl(url || 'http://localhost:3001');
      }
    };
    getBackendUrl();
  }, []);

  // Check if user is admin
  useEffect(() => {
    if (authUser?.role !== 'Admin') {
      navigate('/dashboard');
    }
  }, [authUser, navigate]);

  // Fetch users on mount
  useEffect(() => {
    fetchUsers();
  }, [backendUrl, token]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${backendUrl}/api/users`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const data = await response.json();
      setUsers(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch users';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (user: User) => {
    setSelectedUser(user);
    setEditForm({
      username: user.username,
      email: user.email || '',
      role: user.role,
    });
    setShowEditModal(true);
  };

  const openPasswordModal = (user: User) => {
    setSelectedUser(user);
    setPasswordForm({
      newPassword: '',
      confirmPassword: '',
    });
    setShowPasswordModal(true);
  };

  const openAuditModal = async (user: User) => {
    setSelectedUser(user);
    try {
      setLoading(true);
      const response = await fetch(`${backendUrl}/api/users/${user.id}/audit-logs`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch audit logs');
      }

      const data = await response.json();
      setAuditLogs(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch audit logs');
    } finally {
      setLoading(false);
      setShowAuditModal(true);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    try {
      setError(null);
      const response = await fetch(`${backendUrl}/api/users/${selectedUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          username: editForm.username,
          email: editForm.email,
          role: editForm.role,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update user');
      }

      const updatedUser = await response.json();
      setUsers(users.map((u) => (u.id === updatedUser.id ? updatedUser : u)));
      setSuccess(`User ${editForm.username} updated successfully`);
      setShowEditModal(false);

      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user');
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    try {
      setError(null);
      const response = await fetch(
        `${backendUrl}/api/users/${selectedUser.id}/change-password`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            newPassword: passwordForm.newPassword,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to change password');
      }

      setSuccess(
        `Password for ${selectedUser.username} changed successfully. User can now login with the new password.`
      );
      setShowPasswordModal(false);

      setTimeout(() => setSuccess(null), 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change password');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
            <p className="text-gray-600 mt-1">Manage system users and roles</p>
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

      {/* Messages */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 py-4 mt-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="max-w-7xl mx-auto px-4 py-4 mt-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
          {success}
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {loading && !showAuditModal ? (
          <div className="text-center py-12">
            <div className="inline-block">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
              <p className="text-gray-600">Loading users...</p>
            </div>
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg">
            <p className="text-gray-500 text-lg">No users found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {users.map((user) => (
              <div
                key={user.id}
                className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6"
              >
                <div className="mb-4">
                  <h3 className="text-xl font-bold text-gray-900">{user.username}</h3>
                  <p className="text-sm text-gray-600">{user.email}</p>
                </div>

                <div className="space-y-2 mb-6 text-sm">
                  <div>
                    <span className="text-gray-600">Role:</span>{' '}
                    <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full font-semibold">
                      {user.role}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Status:</span>{' '}
                    <span
                      className={`inline-block px-3 py-1 rounded-full font-semibold ${
                        user.active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {user.active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    Created: {new Date(user.created_at).toLocaleDateString()}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => openEditModal(user)}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors"
                  >
                    {React.createElement(FaEdit as any, { size: 16 })}
                    Edit
                  </button>
                  <button
                    onClick={() => openPasswordModal(user)}
                    className="flex-1 bg-orange-600 hover:bg-orange-700 text-white px-3 py-2 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors"
                  >
                    {React.createElement(FaLock as any, { size: 16 })}
                    Password
                  </button>
                  <button
                    onClick={() => openAuditModal(user)}
                    className="flex-1 bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-lg font-semibold transition-colors"
                  >
                    Audit
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Back Button */}
        <button
          onClick={() => navigate('/dashboard')}
          className="mt-8 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded flex items-center gap-2"
        >
          {React.createElement(FaArrowLeft as any)}
          Back to Dashboard
        </button>
      </main>

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Edit User: {selectedUser.username}
            </h2>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Username
                </label>
                <input
                  type="text"
                  value={editForm.username}
                  onChange={(e) =>
                    setEditForm({ ...editForm, username: e.target.value })
                  }
                  required
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) =>
                    setEditForm({ ...editForm, email: e.target.value })
                  }
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Role
                </label>
                <select
                  value={editForm.role}
                  onChange={(e) =>
                    setEditForm({ ...editForm, role: e.target.value })
                  }
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  {roles.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold"
                >
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-semibold"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showPasswordModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Change Password: {selectedUser.username}
            </h2>

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Password
                </label>
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) =>
                    setPasswordForm({
                      ...passwordForm,
                      newPassword: e.target.value,
                    })
                  }
                  required
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-600"
                  placeholder="Enter new password"
                  minLength={6}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Minimum 6 characters
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) =>
                    setPasswordForm({
                      ...passwordForm,
                      confirmPassword: e.target.value,
                    })
                  }
                  required
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-600"
                  placeholder="Confirm new password"
                  minLength={6}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg font-semibold"
                >
                  Change Password
                </button>
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-semibold"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Audit Log Modal */}
      {showAuditModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 p-6 max-h-[80vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Audit Log: {selectedUser.username}
            </h2>

            {auditLogs.length === 0 ? (
              <p className="text-gray-600 text-center py-8">
                No audit logs found for this user
              </p>
            ) : (
              <div className="space-y-4">
                {auditLogs.map((log) => {
                  let oldValue: any = null;
                  let newValue: any = null;

                  try {
                    if (log.old_value) oldValue = JSON.parse(log.old_value);
                    if (log.new_value) newValue = JSON.parse(log.new_value);
                  } catch {
                    oldValue = log.old_value;
                    newValue = log.new_value;
                  }

                  return (
                    <div
                      key={log.id}
                      className="border border-gray-200 rounded-lg p-4 bg-gray-50"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-semibold text-gray-900">
                            {log.action}
                          </h4>
                          <p className="text-xs text-gray-500">
                            {new Date(log.created_at).toLocaleString()}
                          </p>
                        </div>
                        <span className="text-xs px-2 py-1 bg-gray-200 rounded">
                          {log.action === 'CHANGE_PASSWORD'
                            ? 'Password Changed'
                            : 'User Updated'}
                        </span>
                      </div>

                      {log.action === 'UPDATE_USER' && (
                        <div className="text-sm space-y-1">
                          {oldValue && newValue && (
                            <>
                              <p className="text-gray-600">
                                <span className="font-semibold">Field:</span>{' '}
                                {oldValue.field || newValue.field}
                              </p>
                              <p className="text-gray-600">
                                <span className="font-semibold">Old Value:</span>{' '}
                                {oldValue.value || '—'}
                              </p>
                              <p className="text-gray-600">
                                <span className="font-semibold">New Value:</span>{' '}
                                {newValue.value || '—'}
                              </p>
                            </>
                          )}
                        </div>
                      )}

                      {log.action === 'CHANGE_PASSWORD' && (
                        <p className="text-sm text-gray-600">
                          Password was changed by admin
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <button
              onClick={() => setShowAuditModal(false)}
              className="mt-6 w-full bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-semibold"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;

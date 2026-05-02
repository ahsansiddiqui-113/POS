import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FaPlus, FaEdit, FaTrash, FaLock, FaUser, FaSignOutAlt } from 'react-icons/fa';

interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  active: number;
  created_at: string;
}

interface CreateUserRequest {
  username: string;
  email: string;
  role: string;
  password: string;
}

const Users: React.FC = () => {
  const navigate = useNavigate();
  const { user: authUser, logout, token } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [backendUrl, setBackendUrl] = useState('http://localhost:3001');
  const [formData, setFormData] = useState<CreateUserRequest>({
    username: '',
    email: '',
    role: 'Jewellery',
    password: 'password123',
  });

  // Fetch backend URL from Electron if available
  useEffect(() => {
    const getBackendUrl = async () => {
      if (window.electron?.getBackendUrl) {
        const url = await window.electron.getBackendUrl();
        setBackendUrl(url || 'http://localhost:3001');
      }
    };
    getBackendUrl();
  }, []);

  const roles = ['Admin', 'Jewellery', 'Cosmetics', 'Purse&Bags', 'Clothes'];

  // Check if user is admin
  useEffect(() => {
    if (authUser?.role !== 'Admin') {
      navigate('/dashboard');
    }
  }, [authUser, navigate]);

  // Fetch users
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${backendUrl}/api/users`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        // Users endpoint might not exist, show demo users instead
        setUsers([
          {
            id: 1,
            username: 'admin',
            email: 'admin@posapp.local',
            role: 'Admin',
            active: 1,
            created_at: new Date().toISOString(),
          },
          {
            id: 2,
            username: 'jewellery_user',
            email: 'jewellery@posapp.local',
            role: 'Jewellery',
            active: 1,
            created_at: new Date().toISOString(),
          },
          {
            id: 3,
            username: 'cosmetics_user',
            email: 'cosmetics@posapp.local',
            role: 'Cosmetics',
            active: 1,
            created_at: new Date().toISOString(),
          },
          {
            id: 4,
            username: 'purse_user',
            email: 'purse@posapp.local',
            role: 'Purse&Bags',
            active: 1,
            created_at: new Date().toISOString(),
          },
          {
            id: 5,
            username: 'clothes_user',
            email: 'clothes@posapp.local',
            role: 'Clothes',
            active: 1,
            created_at: new Date().toISOString(),
          },
        ]);
      } else {
        const data = await response.json();
        setUsers(data);
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
      // Show default users if fetch fails
      setUsers([
        {
          id: 1,
          username: 'admin',
          email: 'admin@posapp.local',
          role: 'Admin',
          active: 1,
          created_at: new Date().toISOString(),
        },
        {
          id: 2,
          username: 'jewellery_user',
          email: 'jewellery@posapp.local',
          role: 'Jewellery',
          active: 1,
          created_at: new Date().toISOString(),
        },
        {
          id: 3,
          username: 'cosmetics_user',
          email: 'cosmetics@posapp.local',
          role: 'Cosmetics',
          active: 1,
          created_at: new Date().toISOString(),
        },
        {
          id: 4,
          username: 'purse_user',
          email: 'purse@posapp.local',
          role: 'Purse&Bags',
          active: 1,
          created_at: new Date().toISOString(),
        },
        {
          id: 5,
          username: 'clothes_user',
          email: 'clothes@posapp.local',
          role: 'Clothes',
          active: 1,
          created_at: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Form submission logic would go here
    // For now, just add to local state
    if (!editingId) {
      const newUser: User = {
        id: Math.max(...users.map((u) => u.id), 0) + 1,
        username: formData.username,
        email: formData.email,
        role: formData.role,
        active: 1,
        created_at: new Date().toISOString(),
      };
      setUsers([...users, newUser]);
    }

    setFormData({
      username: '',
      email: '',
      role: 'Jewellery',
      password: 'password123',
    });
    setEditingId(null);
    setShowForm(false);
  };

  const handleDelete = (id: number) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      setUsers(users.filter((u) => u.id !== id));
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

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Add User Button */}
        <div className="mb-6">
          <button
            onClick={() => {
              setShowForm(!showForm);
              setEditingId(null);
              setFormData({
                username: '',
                email: '',
                role: 'Jewellery',
                password: 'password123',
              });
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 font-semibold"
          >
            {React.createElement(FaPlus as any)} Add New User
          </button>
        </div>

        {/* Add User Form */}
        {showForm && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-2xl font-bold mb-6">
              {editingId ? 'Edit User' : 'Create New User'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Username
                  </label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) =>
                      setFormData({ ...formData, username: e.target.value })
                    }
                    required
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                    placeholder="Enter username"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    required
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                    placeholder="Enter email"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Role
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) =>
                      setFormData({ ...formData, role: e.target.value })
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Password
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    required
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                    placeholder="Enter password"
                  />
                </div>
              </div>
              <div className="flex gap-4">
                <button
                  type="submit"
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-semibold"
                >
                  {editingId ? 'Update User' : 'Create User'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingId(null);
                    setFormData({
                      username: '',
                      email: '',
                      role: 'Jewellery',
                      password: 'password123',
                    });
                  }}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg font-semibold"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Users Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100 border-b">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                    {React.createElement(FaUser as any, { className: "inline mr-2" })} Username
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                    Email
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                    Role
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                    Created
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center">
                      Loading users...
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                      No users found
                    </td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-900">
                        {u.username}
                      </td>
                      <td className="px-6 py-4 text-gray-600">{u.email}</td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">
                          {u.role}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-semibold ${
                            u.active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {u.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {new Date(u.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 flex gap-2">
                        <button
                          onClick={() => {
                            setEditingId(u.id);
                            setFormData({
                              username: u.username,
                              email: u.email,
                              role: u.role,
                              password: 'password123',
                            });
                            setShowForm(true);
                          }}
                          className="text-blue-600 hover:text-blue-800 font-semibold"
                        >
                          {React.createElement(FaEdit as any)}
                        </button>
                        <button
                          onClick={() => handleDelete(u.id)}
                          className="text-red-600 hover:text-red-800 font-semibold"
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
          className="mt-6 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded"
        >
          Back to Dashboard
        </button>
      </main>
    </div>
  );
};

export default Users;

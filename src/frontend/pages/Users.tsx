import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Footer from '../components/Footer';
import { FaEdit, FaTrash, FaSignOutAlt, FaArrowLeft, FaSave, FaTimes } from 'react-icons/fa';

interface User {
  id: number;
  username: string;
  email: string | null;
  role: string;
  active: number;
}

const Users: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout, token } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState<{ username: string; email: string; role: string }>({ username: '', email: '', role: '' });

  const backendUrl = window.electron?.getBackendUrl?.() || 'http://localhost:3001';

  useEffect(() => {
    if (!user || user.role !== 'Admin') navigate('/dashboard');
    else fetchUsers();
  }, [user, navigate]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${backendUrl}/api/users`, { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) throw new Error('Failed to fetch users');
      setUsers(await response.json());
    } catch {
      setErrorMessage('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!editData.username.trim()) { setErrorMessage('Username required'); return; }
    setLoading(true);
    try {
      const response = await fetch(`${backendUrl}/api/users/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(editData),
      });
      if (!response.ok) throw new Error('Failed to update user');
      setSuccessMessage('User updated');
      setEditingId(null);
      fetchUsers();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Update failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/dashboard')} className="hover:bg-gray-200 p-2 rounded"><FaArrowLeft /></button>
            <h1 className="text-3xl font-bold">Users</h1>
          </div>
          <button onClick={logout} className="bg-red-600 text-white px-4 py-2 rounded flex items-center gap-2"><FaSignOutAlt /> Logout</button>
        </div>
      </div>

      {successMessage && <div className="bg-green-100 text-green-700 px-4 py-3">{successMessage}</div>}
      {errorMessage && <div className="bg-red-100 text-red-700 px-4 py-3">{errorMessage}</div>}

      <div className="flex-1 max-w-7xl w-full mx-auto p-4">
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2 text-left">Username</th>
                <th className="px-4 py-2 text-left">Email</th>
                <th className="px-4 py-2 text-left">Role</th>
                <th className="px-4 py-2 text-center">Status</th>
                <th className="px-4 py-2 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-b hover:bg-gray-50">
                  {editingId === u.id ? (
                    <>
                      <td className="px-4 py-2"><input type="text" value={editData.username} onChange={e => setEditData({...editData, username: e.target.value})} className="border rounded px-2 py-1 w-full" /></td>
                      <td className="px-4 py-2"><input type="email" value={editData.email} onChange={e => setEditData({...editData, email: e.target.value})} className="border rounded px-2 py-1 w-full" /></td>
                      <td className="px-4 py-2"><select value={editData.role} onChange={e => setEditData({...editData, role: e.target.value})} className="border rounded px-2 py-1 w-full"><option>Admin</option><option>Jewellery</option><option>Cosmetics</option><option>Clothes</option></select></td>
                      <td></td>
                      <td className="px-4 py-2 flex gap-2 justify-center"><button onClick={handleSave} className="text-green-600"><FaSave /></button><button onClick={() => setEditingId(null)} className="text-gray-600"><FaTimes /></button></td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-2 font-medium">{u.username}</td>
                      <td className="px-4 py-2">{u.email || '-'}</td>
                      <td className="px-4 py-2"><span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">{u.role}</span></td>
                      <td className="px-4 py-2 text-center"><span className={u.active ? 'text-green-600 font-bold' : 'text-red-600'}>{u.active ? 'Active' : 'Inactive'}</span></td>
                      <td className="px-4 py-2 flex gap-2 justify-center"><button onClick={() => { setEditingId(u.id); setEditData({username: u.username, email: u.email || '', role: u.role}); }} className="text-blue-600"><FaEdit /></button></td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Users;

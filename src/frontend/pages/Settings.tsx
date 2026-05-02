import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Footer from '../components/Footer';
import { FaLock, FaUser, FaShieldAlt, FaArrowLeft } from 'react-icons/fa';

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const { logout, user, token } = useAuth();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const backendUrl = 'http://localhost:3001';

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    // Validation
    if (!oldPassword.trim()) {
      setErrorMessage('Please enter your current password');
      return;
    }

    if (!newPassword.trim()) {
      setErrorMessage('Please enter a new password');
      return;
    }

    if (newPassword.length < 6) {
      setErrorMessage('New password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('New passwords do not match');
      return;
    }

    if (newPassword === oldPassword) {
      setErrorMessage('New password must be different from current password');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${backendUrl}/api/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          oldPassword,
          newPassword,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        setErrorMessage(error.error || 'Failed to change password');
        return;
      }

      // Success - show message and logout after a delay
      setSuccessMessage('Password changed successfully! You will be logged out in 2 seconds...');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');

      // Wait 2 seconds then logout
      setTimeout(() => {
        logout();
        navigate('/login');
      }, 2000);
    } catch (error) {
      setErrorMessage('Error changing password. Please try again.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <button
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded flex items-center gap-2"
          >
            {React.createElement(FaLock as any)} Logout
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 flex-grow w-full">
        {/* User Profile */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            {React.createElement(FaUser as any, { size: 20 })}
            User Profile
          </h2>
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
              <p className="text-gray-900 font-bold text-lg">{user?.username}</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <p className="text-gray-900 font-bold text-lg">{user?.role}</p>
            </div>
          </div>
        </div>

        {/* Change Password */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            {React.createElement(FaShieldAlt as any, { size: 20 })}
            Change Password
          </h2>

          {successMessage && (
            <div className="bg-green-50 border-l-4 border-green-600 text-green-700 px-4 py-3 rounded mb-4">
              <p className="font-semibold">Success!</p>
              <p className="text-sm mt-1">{successMessage}</p>
            </div>
          )}

          {errorMessage && (
            <div className="bg-red-50 border-l-4 border-red-600 text-red-700 px-4 py-3 rounded mb-4">
              <p className="font-semibold">Error</p>
              <p className="text-sm mt-1">{errorMessage}</p>
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Current Password
              </label>
              <input
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                disabled={loading}
                required
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                placeholder="Enter your current password"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={loading}
                required
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                placeholder="Enter new password (minimum 6 characters)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirm New Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
                required
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                placeholder="Confirm your new password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold py-2 px-4 rounded-lg transition-colors"
            >
              {loading ? 'Changing Password...' : 'Change Password'}
            </button>
          </form>

          <div className="mt-4 p-4 bg-blue-50 border-l-4 border-blue-600 rounded">
            <p className="text-sm text-blue-700">
              <strong>Note:</strong> After changing your password, you will be logged out automatically and will need to log in again with your new password.
            </p>
          </div>
        </div>

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

export default Settings;

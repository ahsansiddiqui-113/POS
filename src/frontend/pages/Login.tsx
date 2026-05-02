import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FaUser, FaLock, FaSpinner } from 'react-icons/fa';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username.trim() || !password.trim()) {
      setError('Please enter both username and password');
      return;
    }

    setLoading(true);

    try {
      await login(username, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed. Please check your credentials.');
      setPassword('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-500 to-purple-600 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-block bg-white rounded-full p-6 mb-6 shadow-2xl transform hover:scale-110 transition-all">
            {React.createElement(FaUser as any, { className: 'text-blue-600 text-5xl' })}
          </div>
          <h1 className="text-5xl font-bold text-white mb-2 tracking-wider">WALMART</h1>
          <p className="text-blue-100 text-lg">Point of Sale & Inventory Management System</p>
        </div>

        {/* Login Form Card */}
        <div className="bg-white rounded-lg shadow-2xl p-8">
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border-l-4 border-red-600 text-red-700 p-4 mb-6 rounded">
              <p className="font-semibold">Login Error</p>
              <p className="text-sm mt-1">{error}</p>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                {React.createElement(FaUser as any, { size: 16 })}
                Username
              </label>
              <div className="relative">
                <span className="absolute left-3 top-3.5 text-gray-400">
                  {React.createElement(FaUser as any, { size: 18 })}
                </span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                  disabled={loading}
                  autoComplete="username"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                {React.createElement(FaLock as any, { size: 16 })}
                Password
              </label>
              <div className="relative">
                <span className="absolute left-3 top-3.5 text-gray-400">
                  {React.createElement(FaLock as any, { size: 18 })}
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                  disabled={loading}
                  autoComplete="current-password"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !loading) {
                      handleSubmit(e as any);
                    }
                  }}
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  {React.createElement(FaSpinner as any, { className: 'animate-spin' })}
                  Logging in...
                </>
              ) : (
                'Login'
              )}
            </button>
          </form>

          {/* Info Section */}
          <div className="mt-6 pt-6 border-t border-gray-200 text-center text-xs text-gray-600 space-y-2">
            <p className="font-semibold text-gray-700 mb-3">📍 Pakistan Enterprise POS System</p>
            <p className="text-gray-600">
              Please contact your administrator for login credentials
            </p>
            <p className="text-blue-600 font-semibold mt-4">💰 All prices in PKR (Pakistani Rupees)</p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-blue-100 text-sm">
          <p>POS System v1.0 - All rights reserved</p>
        </div>
      </div>
    </div>
  );
};

export default Login;

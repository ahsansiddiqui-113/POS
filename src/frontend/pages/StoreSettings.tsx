import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Footer from '../components/Footer';
import { FaCog, FaArrowLeft } from 'react-icons/fa';

export default function StoreSettings() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const backendUrl = window.electron?.getBackendUrl?.() || 'http://localhost:3001';

  const [settings, setSettings] = useState({
    company_name: 'WALMART',
    address: 'Post Office Road in Stylo Basement',
    phone: '03035577787',
    email: '',
    bank_account: '',
    bank_name: '',
    bank_code: '',
    terms_conditions: '',
    payment_terms: 'Payment Due Upon Receipt',
    footer_text: '',
  });

  useEffect(() => {
    if (!user) navigate('/login');
  }, [user, navigate]);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${backendUrl}/api/invoice-settings`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` },
      });
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setLoading(true);
    try {
      // Convert snake_case to camelCase for API
      const dataToSend = {
        companyName: settings.company_name,
        address: settings.address,
        phone: settings.phone,
        email: settings.email,
        bankAccount: settings.bank_account,
        bankName: settings.bank_name,
        bankCode: settings.bank_code,
        termsConditions: settings.terms_conditions,
        paymentTerms: settings.payment_terms,
        footerText: settings.footer_text,
      };

      const response = await fetch(`${backendUrl}/api/invoice-settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify(dataToSend),
      });

      if (!response.ok) throw new Error('Failed to save settings');

      setSuccess('Store settings saved successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="flex-grow">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-6 px-6">
          <div className="flex items-center gap-3 mb-2">
            <button onClick={() => navigate('/dashboard')} className="hover:bg-blue-700 p-2 rounded">
              <FaArrowLeft size={20} />
            </button>
            <FaCog size={28} />
            <h1 className="text-3xl font-bold">Store Settings</h1>
          </div>
          <p className="text-blue-100">Configure your store information for receipts and invoices</p>
        </div>

        {/* Messages */}
        {success && <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3">{success}</div>}
        {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3">{error}</div>}

        {/* Content */}
        <div className="max-w-4xl mx-auto p-6">
          <div className="bg-white rounded-lg shadow p-6 space-y-6">
            {/* Store Information */}
            <div className="border-b pb-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">📍 Store Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Store Name *</label>
                  <input
                    type="text"
                    value={settings.company_name}
                    onChange={(e) => setSettings({ ...settings, company_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                    placeholder="e.g., WALMART"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
                  <input
                    type="text"
                    value={settings.phone}
                    onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                    placeholder="e.g., 03035577787"
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Address *</label>
                <textarea
                  value={settings.address}
                  onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  rows={3}
                  placeholder="Store address for receipts"
                />
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={settings.email}
                  onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  placeholder="e.g., info@walmart.com"
                />
              </div>
            </div>

            {/* Bank Information */}
            <div className="border-b pb-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">🏦 Bank Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name</label>
                  <input
                    type="text"
                    value={settings.bank_name}
                    onChange={(e) => setSettings({ ...settings, bank_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
                  <input
                    type="text"
                    value={settings.bank_account}
                    onChange={(e) => setSettings({ ...settings, bank_account: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bank Code</label>
                  <input
                    type="text"
                    value={settings.bank_code}
                    onChange={(e) => setSettings({ ...settings, bank_code: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>
            </div>

            {/* Receipt Information */}
            <div>
              <h2 className="text-xl font-bold text-gray-800 mb-4">📄 Receipt Information</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Terms</label>
                <input
                  type="text"
                  value={settings.payment_terms}
                  onChange={(e) => setSettings({ ...settings, payment_terms: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  placeholder="e.g., Payment Due Upon Receipt"
                />
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Footer Text</label>
                <textarea
                  value={settings.footer_text}
                  onChange={(e) => setSettings({ ...settings, footer_text: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  rows={3}
                  placeholder="Thank you for shopping with us!"
                />
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Terms & Conditions</label>
                <textarea
                  value={settings.terms_conditions}
                  onChange={(e) => setSettings({ ...settings, terms_conditions: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  rows={3}
                  placeholder="Store policies and terms"
                />
              </div>
            </div>

            {/* Save Button */}
            <div className="flex gap-3 pt-6 border-t">
              <button
                onClick={() => navigate('/dashboard')}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={loading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition disabled:opacity-50"
              >
                {loading ? 'Saving...' : '💾 Save Settings'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}

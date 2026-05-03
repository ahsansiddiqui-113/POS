import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Footer from '../components/Footer';
import { FaFileInvoice, FaSignOutAlt, FaArrowLeft, FaCloudUploadAlt, FaTrash } from 'react-icons/fa';

interface InvoiceSettings {
  company_name?: string;
  logo_path?: string;
  address?: string;
  phone?: string;
  email?: string;
  bank_account?: string;
  bank_name?: string;
  bank_code?: string;
  terms_conditions?: string;
  payment_terms?: string;
  footer_text?: string;
}

const InvoiceSettings: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout, token } = useAuth();
  const [settings, setSettings] = useState<InvoiceSettings>({});
  const [formData, setFormData] = useState<InvoiceSettings>({});
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);

  const backendUrl = window.electron?.getBackendUrl?.() || 'http://localhost:3001';

  useEffect(() => {
    if (!user || user.role !== 'Admin') {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  useEffect(() => {
    fetchSettings();
  }, [token]);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => setErrorMessage(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${backendUrl}/api/invoice-settings`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch settings');
      const data = await response.json();
      setSettings(data);
      setFormData(data);
    } catch (error) {
      setErrorMessage('Failed to load settings');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${backendUrl}/api/invoice-settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          companyName: formData.company_name,
          address: formData.address,
          phone: formData.phone,
          email: formData.email,
          bankAccount: formData.bank_account,
          bankName: formData.bank_name,
          bankCode: formData.bank_code,
          termsConditions: formData.terms_conditions,
          paymentTerms: formData.payment_terms,
          footerText: formData.footer_text,
        }),
      });

      if (!response.ok) throw new Error('Failed to update settings');

      setSuccessMessage('Settings saved successfully');
      fetchSettings();
    } catch (error) {
      setErrorMessage('Failed to save settings');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('File size must be less than 5MB');
      return;
    }

    setLogoFile(file);
    setLoading(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(',')[1];
        const response = await fetch(`${backendUrl}/api/invoice-settings/logo`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            logoData: base64,
            fileName: file.name,
          }),
        });

        if (!response.ok) throw new Error('Failed to upload logo');

        setSuccessMessage('Logo uploaded successfully');
        fetchSettings();
      };
      reader.readAsDataURL(file);
    } catch (error) {
      setErrorMessage('Failed to upload logo');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = () => {
    const invoiceHTML = `
      <html>
        <head>
          <title>Invoice Template</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; }
            .company-info { margin-bottom: 20px; }
            .logo { max-height: 60px; margin-bottom: 10px; }
            h1 { color: #333; }
            .section { margin: 20px 0; padding: 10px 0; border-bottom: 1px solid #ddd; }
            table { width: 100%; border-collapse: collapse; }
            th, td { padding: 8px; text-align: left; }
          </style>
        </head>
        <body>
          <div class="company-info">
            ${settings.logo_path ? `<img src="${settings.logo_path}" alt="Logo" class="logo">` : ''}
            <h1>${settings.company_name || 'Company Name'}</h1>
            <p>${settings.address || ''}</p>
            <p>Phone: ${settings.phone || ''} | Email: ${settings.email || ''}</p>
          </div>

          <div class="section">
            <h3>Bank Details</h3>
            <p>Bank: ${settings.bank_name || 'N/A'}</p>
            <p>Account: ${settings.bank_account || 'N/A'}</p>
            <p>Code: ${settings.bank_code || 'N/A'}</p>
          </div>

          <div class="section">
            <h3>Payment Terms</h3>
            <p>${settings.payment_terms || 'N/A'}</p>
          </div>

          <div class="section">
            <h3>Terms & Conditions</h3>
            <p>${settings.terms_conditions || 'N/A'}</p>
          </div>

          <footer>${settings.footer_text || ''}</footer>
        </body>
      </html>
    `;

    const printWindow = window.open('', '', 'width=800,height=600');
    if (printWindow) {
      printWindow.document.write(invoiceHTML);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const handleExportCSV = () => {
    const csvContent = [
      ['Invoice Settings Export', new Date().toLocaleDateString()],
      [],
      ['Company Information'],
      ['Company Name', settings.company_name || ''],
      ['Address', settings.address || ''],
      ['Phone', settings.phone || ''],
      ['Email', settings.email || ''],
      [],
      ['Bank Details'],
      ['Bank Name', settings.bank_name || ''],
      ['Bank Account', settings.bank_account || ''],
      ['Bank Code', settings.bank_code || ''],
      [],
      ['Payment Terms', settings.payment_terms || ''],
      ['Terms & Conditions', settings.terms_conditions || ''],
      ['Footer Text', settings.footer_text || ''],
    ]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoice-settings-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    setSuccessMessage('Settings exported to CSV successfully');
  };

  const handleDeleteSettings = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${backendUrl}/api/invoice-settings`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to delete settings');

      setSettings({});
      setFormData({});
      setSuccessMessage('All invoice settings have been deleted');
    } catch (error) {
      setErrorMessage('Failed to delete settings');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveLogo = async () => {
    if (!window.confirm('Remove logo?')) return;

    setLoading(true);
    try {
      const response = await fetch(`${backendUrl}/api/invoice-settings/logo`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to remove logo');

      setSuccessMessage('Logo removed');
      fetchSettings();
    } catch (error) {
      setErrorMessage('Failed to remove logo');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-100 flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white p-4 shadow-lg">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/dashboard')} className="hover:bg-indigo-700 p-2 rounded">
              <FaArrowLeft size={20} />
            </button>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FaFileInvoice /> Invoice Settings
            </h1>
          </div>
          <button onClick={logout} className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded flex items-center gap-2">
            <FaSignOutAlt /> Logout
          </button>
        </div>
      </div>

      {/* Messages */}
      {successMessage && <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3">{successMessage}</div>}
      {errorMessage && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3">{errorMessage}</div>}

      {/* Content */}
      <div className="flex-1 max-w-4xl w-full mx-auto p-4">
        {loading && <div className="text-center py-8">Loading...</div>}

        {!loading && (
          <div className="space-y-6">
            {/* Logo Section */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-bold mb-4">Company Logo</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  {settings.logo_path ? (
                    <div className="mb-4">
                      <div className="border-2 border-dashed rounded p-4 text-center">
                        <img src={settings.logo_path} alt="Logo" className="max-w-full max-h-48 mx-auto" />
                      </div>
                      <button
                        onClick={handleRemoveLogo}
                        disabled={loading}
                        className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 w-full mt-2 flex items-center justify-center gap-2"
                      >
                        <FaTrash /> Remove Logo
                      </button>
                    </div>
                  ) : (
                    <label className="border-2 border-dashed rounded p-8 text-center cursor-pointer hover:bg-gray-50 block">
                      <div className="flex flex-col items-center gap-2 text-gray-600">
                        <FaCloudUploadAlt size={32} />
                        <div className="font-medium">Upload Logo</div>
                        <div className="text-sm">PNG, JPG, or GIF (max 5MB)</div>
                      </div>
                      <input
                        type="file"
                        onChange={handleLogoUpload}
                        accept="image/*"
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
                <div className="text-sm text-gray-600">
                  <p className="font-medium mb-2">Logo guidelines:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Recommended size: 200x100 pixels</li>
                    <li>Supported formats: PNG, JPG, GIF</li>
                    <li>Maximum file size: 5MB</li>
                    <li>Will appear on all invoices</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Company Information */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-bold mb-4">Company Information</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Company Name *</label>
                  <input
                    type="text"
                    value={formData.company_name || ''}
                    onChange={e => setFormData({ ...formData, company_name: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                  <textarea
                    value={formData.address || ''}
                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input
                      type="tel"
                      value={formData.phone || ''}
                      onChange={e => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full border rounded px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={formData.email || ''}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                      className="w-full border rounded px-3 py-2"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Bank Information */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-bold mb-4">Bank Information</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name</label>
                  <input
                    type="text"
                    value={formData.bank_name || ''}
                    onChange={e => setFormData({ ...formData, bank_name: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
                    <input
                      type="text"
                      value={formData.bank_account || ''}
                      onChange={e => setFormData({ ...formData, bank_account: e.target.value })}
                      className="w-full border rounded px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Bank Code</label>
                    <input
                      type="text"
                      value={formData.bank_code || ''}
                      onChange={e => setFormData({ ...formData, bank_code: e.target.value })}
                      className="w-full border rounded px-3 py-2"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Invoice Terms */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-bold mb-4">Invoice Terms & Conditions</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Terms</label>
                  <input
                    type="text"
                    value={formData.payment_terms || ''}
                    onChange={e => setFormData({ ...formData, payment_terms: e.target.value })}
                    placeholder="e.g., Payment Due Upon Receipt"
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Terms & Conditions</label>
                  <textarea
                    value={formData.terms_conditions || ''}
                    onChange={e => setFormData({ ...formData, terms_conditions: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                    rows={4}
                    placeholder="Enter your terms and conditions here..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Footer Text</label>
                  <textarea
                    value={formData.footer_text || ''}
                    onChange={e => setFormData({ ...formData, footer_text: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                    rows={2}
                    placeholder="e.g., Thank you for your business!"
                  />
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex gap-4">
              <button
                onClick={handleSaveSettings}
                disabled={loading}
                className="bg-indigo-600 text-white px-8 py-3 rounded hover:bg-indigo-700 disabled:opacity-50 font-medium"
              >
                {loading ? 'Saving...' : 'Save Settings'}
              </button>
              <button
                onClick={() => setFormData(settings)}
                className="bg-gray-300 text-gray-800 px-8 py-3 rounded hover:bg-gray-400"
              >
                Reset
              </button>
            </div>

            {/* Preview Section */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold">Invoice Preview</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleExportPDF()}
                    className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm"
                  >
                    📄 Export PDF
                  </button>
                  <button
                    onClick={() => handleExportCSV()}
                    className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm"
                  >
                    📊 Export CSV
                  </button>
                  <button
                    onClick={() => {
                      setFormData(settings);
                      setSuccessMessage('You can now edit the settings above');
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
                  >
                    ✏️ Edit
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm('Are you sure you want to delete all invoice settings?')) {
                        handleDeleteSettings();
                      }
                    }}
                    className="bg-red-700 hover:bg-red-800 text-white px-3 py-1 rounded text-sm"
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>
              <div className="border rounded p-6 bg-gray-50 text-sm">
                {settings.logo_path && (
                  <div className="mb-4 text-center">
                    <img src={settings.logo_path} alt="Logo" className="max-h-16" />
                  </div>
                )}
                <div className="font-bold mb-2">{settings.company_name || 'Company Name'}</div>
                {settings.address && <div className="text-gray-600 text-xs">{settings.address}</div>}
                {settings.phone && <div className="text-gray-600 text-xs">Phone: {settings.phone}</div>}
                {settings.email && <div className="text-gray-600 text-xs">Email: {settings.email}</div>}

                {settings.bank_name && (
                  <div className="mt-4 border-t pt-4 text-xs text-gray-600">
                    <div>Bank: {settings.bank_name}</div>
                    {settings.bank_account && <div>Account: {settings.bank_account}</div>}
                    {settings.bank_code && <div>Code: {settings.bank_code}</div>}
                  </div>
                )}

                {settings.payment_terms && (
                  <div className="mt-4 text-xs text-gray-600">
                    <strong>Payment Terms:</strong> {settings.payment_terms}
                  </div>
                )}

                {settings.footer_text && (
                  <div className="mt-4 border-t pt-4 text-xs text-center text-gray-600">
                    {settings.footer_text}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default InvoiceSettings;

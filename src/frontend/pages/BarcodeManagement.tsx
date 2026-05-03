import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Footer from '../components/Footer';
import { FaBarcode, FaSignOutAlt, FaArrowLeft, FaPlus, FaCog } from 'react-icons/fa';

interface Product {
  id: number;
  sku: string;
  name: string;
  sale_price_per_unit: number;
}

const BarcodeManagement: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout, token } = useAuth();
  const [activeTab, setActiveTab] = useState<'generate' | 'settings'>('generate');

  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const [barcodeFormat, setBarcodeFormat] = useState('CODE128');
  const [generateFormat, setGenerateFormat] = useState('CODE128');
  const [generatedBarcodes, setGeneratedBarcodes] = useState<any[]>([]);

  const backendUrl = window.electron?.getBackendUrl?.() || 'http://localhost:3001';

  useEffect(() => {
    if (!user) navigate('/login');
    fetchProducts();
  }, [user, navigate, token]);

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

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${backendUrl}/api/products?pageSize=1000`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch products');
      const data = await response.json();
      setProducts(Array.isArray(data.data) ? data.data : []);
    } catch (error) {
      setErrorMessage('Failed to load products');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateSingleBarcode = async (productId: number) => {
    setLoading(true);
    try {
      const response = await fetch(`${backendUrl}/api/barcodes/${productId}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ format: generateFormat }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate barcode');
      }

      setGeneratedBarcodes([data]);
      setSuccessMessage('Barcode generated');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to generate barcode';
      setErrorMessage(errorMsg);
      console.error('Barcode generation error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkGenerate = async () => {
    if (selectedProducts.length === 0) {
      setErrorMessage('Please select at least one product');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${backendUrl}/api/barcodes/bulk-generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ productIds: selectedProducts, format: generateFormat }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate barcodes');
      }

      setGeneratedBarcodes(data);
      const successCount = data.filter((b: any) => b.generated).length;
      setSuccessMessage(`Generated ${successCount}/${data.length} barcodes`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to generate barcodes';
      setErrorMessage(errorMsg);
      console.error('Bulk barcode generation error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleProduct = (productId: number) => {
    setSelectedProducts(prev =>
      prev.includes(productId) ? prev.filter(id => id !== productId) : [...prev, productId]
    );
  };

  const handleSelectAll = () => {
    if (selectedProducts.length === products.length) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(products.map(p => p.id));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-teal-100 flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-teal-600 text-white p-4 shadow-lg">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/dashboard')} className="hover:bg-green-700 p-2 rounded">
              <FaArrowLeft size={20} />
            </button>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FaBarcode /> Barcode Management
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

      {/* Tabs */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto flex gap-4 px-4">
          {['generate', 'settings'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-4 py-3 font-medium border-b-2 ${
                activeTab === tab ? 'border-green-600 text-green-600' : 'border-transparent text-gray-600'
              }`}
            >
              {tab === 'generate' ? '📊 Generate' : '⚙️ Settings'}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4">
        {activeTab === 'generate' && (
          <div>
            <div className="mb-6">
              <div className="bg-white rounded-lg shadow p-6 mb-6">
                <h3 className="text-lg font-bold mb-4">Single Barcode</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Select Product</label>
                    <select
                      onChange={e => handleGenerateSingleBarcode(parseInt(e.target.value))}
                      className="w-full border rounded px-3 py-2"
                      defaultValue=""
                    >
                      <option value="">Choose a product</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.sku})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Format</label>
                    <select
                      value={generateFormat}
                      onChange={e => setGenerateFormat(e.target.value)}
                      className="w-full border rounded px-3 py-2"
                    >
                      <option value="CODE128">CODE128</option>
                      <option value="QR">QR Code</option>
                      <option value="EAN13">EAN13</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-bold mb-4">Bulk Generate</h3>
                <div className="mb-4">
                  <button
                    onClick={handleSelectAll}
                    className="bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded text-sm mb-4"
                  >
                    {selectedProducts.length === products.length ? 'Deselect All' : 'Select All'}
                  </button>
                  <div className="text-sm text-gray-600 mb-4">
                    Selected: {selectedProducts.length} products
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                  {products.map(product => (
                    <label key={product.id} className="flex items-center gap-3 p-3 border rounded hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={selectedProducts.includes(product.id)}
                        onChange={() => handleToggleProduct(product.id)}
                        className="w-4 h-4"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{product.name}</div>
                        <div className="text-sm text-gray-600">{product.sku}</div>
                      </div>
                    </label>
                  ))}
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={handleBulkGenerate}
                    disabled={loading || selectedProducts.length === 0}
                    className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                  >
                    <FaPlus /> Generate Selected
                  </button>
                </div>
              </div>
            </div>

            {/* Generated Barcodes Preview */}
            {generatedBarcodes.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-bold mb-4">Generated Barcodes ({generatedBarcodes.filter(b => b.generated).length})</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {generatedBarcodes.map((barcode, idx) => (
                    <div key={idx} className="border rounded p-4">
                      {barcode.generated ? (
                        <>
                          <div className="font-bold mb-2 text-green-600">{barcode.productName}</div>
                          <div className="text-sm text-gray-600 mb-4">Barcode: {barcode.barcode}</div>
                          <div className="bg-white p-4 rounded mb-4 border">
                            <img src={barcode.imageUrl} alt={`Barcode for ${barcode.productName}`} className="w-full" />
                          </div>
                          {barcode.price && (
                            <div className="text-sm font-bold text-green-600 mb-3">Price: Rs. {barcode.price.toFixed(2)}</div>
                          )}
                          <div className="flex flex-col gap-2">
                            <button
                              onClick={() => {
                                // Create a print-friendly window
                                const printWindow = window.open('', '_blank', 'width=800,height=600');
                                if (printWindow) {
                                  printWindow.document.write(`
                                    <html>
                                      <head>
                                        <title>Print Barcode - ${barcode.productName}</title>
                                        <style>
                                          body { margin: 20px; text-align: center; font-family: Arial, sans-serif; }
                                          .barcode-container {
                                            border: 2px solid #000;
                                            padding: 20px;
                                            display: inline-block;
                                            margin-bottom: 20px;
                                          }
                                          img { max-width: 400px; height: auto; }
                                          h2 { margin: 10px 0; font-size: 20px; }
                                          p { margin: 5px 0; }
                                          .price { font-size: 18px; font-weight: bold; color: green; }
                                          @media print {
                                            body { margin: 0; }
                                            .barcode-container { border: 1px solid #000; }
                                          }
                                        </style>
                                      </head>
                                      <body>
                                        <div class="barcode-container">
                                          <h2>${barcode.productName}</h2>
                                          <img src="${barcode.imageUrl}" alt="Barcode" />
                                          <p>${barcode.barcode}</p>
                                          <p class="price">Rs. ${barcode.price ? barcode.price.toFixed(2) : 'N/A'}</p>
                                        </div>
                                        <script>
                                          window.print();
                                          window.onafterprint = function() { window.close(); };
                                        </script>
                                      </body>
                                    </html>
                                  `);
                                  printWindow.document.close();
                                }
                              }}
                              className="bg-purple-600 text-white px-4 py-2 rounded text-sm hover:bg-purple-700 flex items-center justify-center gap-2"
                            >
                              🖨️ Print Barcode
                            </button>
                            <button
                              onClick={() => {
                                const link = document.createElement('a');
                                link.href = barcode.imageUrl;
                                link.download = `${barcode.productName}-${barcode.barcode}.png`;
                                link.click();
                              }}
                              className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700"
                            >
                              ⬇️ Download Image
                            </button>
                          </div>
                        </>
                      ) : (
                        <div className="text-red-600 text-center py-4">
                          <div className="font-bold">Error</div>
                          <div className="text-sm">{barcode.error}</div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <FaCog /> Barcode Settings
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Default Format</label>
                <select
                  value={barcodeFormat}
                  onChange={e => setBarcodeFormat(e.target.value)}
                  className="border rounded px-3 py-2"
                >
                  <option value="CODE128">CODE128</option>
                  <option value="QR">QR Code</option>
                  <option value="EAN13">EAN13</option>
                </select>
              </div>
              <div className="text-sm text-gray-600 bg-blue-50 p-4 rounded">
                <p className="font-medium mb-2">ℹ️ About Formats:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li><strong>CODE128:</strong> Standard 1D barcode, compatible with most scanners</li>
                  <li><strong>QR Code:</strong> 2D barcode, can encode more data including URLs</li>
                  <li><strong>EAN13:</strong> Standard retail barcode, 13 digits</li>
                </ul>
              </div>
              <button
                className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700"
              >
                Save Settings
              </button>
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default BarcodeManagement;

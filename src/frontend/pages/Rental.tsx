import React, { useState, useEffect } from 'react';
import {
  FaGift,
  FaCalendar,
  FaUser,
  FaPhone,
  FaMailBulk,
  FaMoneyBillWave,
  FaBoxOpen,
  FaCheckCircle,
  FaTimesCircle,
  FaEye,
  FaDownload,
  FaPlus,
  FaEdit,
  FaTrash,
  FaHistory,
  FaClock,
} from 'react-icons/fa';
import Footer from '../components/Footer';
import { useAuth } from '../context/AuthContext';

interface RentalItem {
  id: number;
  product_id: number;
  rental_unit_number: string;
  daily_rental_price: number;
  weekly_rental_price: number;
  monthly_rental_price: number;
  security_deposit: number;
  status: string;
  condition: string;
}

interface RentalTransaction {
  id: number;
  rental_item_id: number;
  customer_name: string;
  customer_phone?: string;
  customer_email?: string;
  rental_start_date: string;
  rental_end_date: string;
  rental_type: 'daily' | 'weekly' | 'monthly';
  rental_amount: number;
  security_deposit_amount: number;
  late_fees: number;
  total_amount: number;
  rental_status: string;
  item_condition_on_return?: string;
}

interface RevenueSummary {
  total_rentals: number;
  total_rental_revenue: number;
  total_late_fees: number;
  total_damage_charges: number;
  total_deposits_held: number;
}

export default function Rental() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'Admin';
  const [activeTab, setActiveTab] = useState<'items' | 'active' | 'overdue' | 'revenue'>('items');
  const [rentalItems, setRentalItems] = useState<RentalItem[]>([]);
  const [activeRentals, setActiveRentals] = useState<RentalTransaction[]>([]);
  const [overdueRentals, setOverdueRentals] = useState<RentalTransaction[]>([]);
  const [revenueSummary, setRevenueSummary] = useState<RevenueSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRentalModal, setShowRentalModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [editingItem, setEditingItem] = useState<RentalItem | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [selectedRental, setSelectedRental] = useState<RentalTransaction | null>(null);
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const backendUrl = window.electron?.getBackendUrl?.() || 'http://localhost:3001';

  // Form data states
  const [createItemForm, setCreateItemForm] = useState({
    product_id: '',
    rental_unit_number: '',
    daily_rental_price: '',
    weekly_rental_price: '',
    monthly_rental_price: '',
    security_deposit: '',
    condition: 'excellent',
  });
  const [rentalForm, setRentalForm] = useState({
    rental_item_id: '',
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    rental_type: 'daily',
    rental_start_date: new Date().toISOString().split('T')[0],
    rental_end_date: new Date().toISOString().split('T')[0],
  });
  const [returnForm, setReturnForm] = useState({
    itemCondition: 'good',
    damageCharges: '',
  });

  // Fetch products from inventory
  const fetchProducts = async () => {
    try {
      const res = await fetch(`${backendUrl}/api/products?pageSize=1000`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` },
      });
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const data = await res.json();
      setProducts(Array.isArray(data.data) ? data.data : []);
    } catch (error) {
      console.error('Error fetching products:', error);
      setProducts([]);
    }
  };

  // Fetch rental items
  const fetchRentalItems = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${backendUrl}/api/rental/items`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` },
      });
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const data = await res.json();
      setRentalItems(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching rental items:', error);
      setRentalItems([]);
    }
    setLoading(false);
  };

  // Fetch active rentals
  const fetchActiveRentals = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${backendUrl}/api/rental/transactions/active`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` },
      });
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const data = await res.json();
      setActiveRentals(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching active rentals:', error);
      setActiveRentals([]);
    }
    setLoading(false);
  };

  // Fetch overdue rentals
  const fetchOverdueRentals = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${backendUrl}/api/rental/transactions/overdue`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` },
      });
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const data = await res.json();
      setOverdueRentals(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching overdue rentals:', error);
      setOverdueRentals([]);
    }
    setLoading(false);
  };

  // Fetch revenue summary
  const fetchRevenueSummary = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `${backendUrl}/api/rental/reports/revenue?startDate=${startDate}&endDate=${endDate}`,
        {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` },
        }
      );
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const data = await res.json();
      setRevenueSummary(typeof data === 'object' && data !== null ? data : null);
    } catch (error) {
      console.error('Error fetching revenue summary:', error);
      setRevenueSummary(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (activeTab === 'items') fetchRentalItems();
    else if (activeTab === 'active') fetchActiveRentals();
    else if (activeTab === 'overdue') fetchOverdueRentals();
    else if (activeTab === 'revenue') fetchRevenueSummary();
  }, [activeTab, startDate, endDate]);

  // Fetch products when create modal opens
  useEffect(() => {
    if (showCreateModal) {
      fetchProducts();
    }
  }, [showCreateModal]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.product-dropdown-container')) {
        setShowProductDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ============ FORM HANDLERS ============

  const handleCreateRentalItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createItemForm.product_id || !createItemForm.rental_unit_number || !createItemForm.daily_rental_price || !createItemForm.security_deposit) {
      alert('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${backendUrl}/api/rental/items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify({
          product_id: parseInt(createItemForm.product_id),
          rental_unit_number: createItemForm.rental_unit_number,
          daily_rental_price: parseFloat(createItemForm.daily_rental_price),
          weekly_rental_price: createItemForm.weekly_rental_price ? parseFloat(createItemForm.weekly_rental_price) : undefined,
          monthly_rental_price: createItemForm.monthly_rental_price ? parseFloat(createItemForm.monthly_rental_price) : undefined,
          security_deposit: parseFloat(createItemForm.security_deposit),
          condition: createItemForm.condition,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        // Check if it's a unique constraint error
        if (error.error && error.error.includes('UNIQUE constraint failed')) {
          const nextNumber = generateNextUnitNumber();
          throw new Error(`Unit number "${createItemForm.rental_unit_number}" already exists. Try "${nextNumber}"`);
        }
        throw new Error(error.error || 'Failed to create rental item');
      }

      // Reset form and close modal
      setCreateItemForm({
        product_id: '',
        rental_unit_number: '',
        daily_rental_price: '',
        weekly_rental_price: '',
        monthly_rental_price: '',
        security_deposit: '',
        condition: 'excellent',
      });
      setShowCreateModal(false);

      // Refresh rental items
      await fetchRentalItems();
      alert('Rental item created successfully!');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to create rental item';
      alert(errorMsg);
      console.error('Error creating rental item:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRentalTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rentalForm.customer_name || !rentalForm.rental_start_date || !rentalForm.rental_end_date) {
      alert('Please fill in all required fields');
      return;
    }

    // Validate rental dates
    const startDate = new Date(rentalForm.rental_start_date);
    const endDate = new Date(rentalForm.rental_end_date);

    if (endDate <= startDate) {
      alert('End date must be after start date');
      return;
    }

    const rentalItem = rentalItems.find(item => item.id === parseInt(rentalForm.rental_item_id));
    if (!rentalItem) {
      alert('Please select a valid rental item');
      return;
    }

    const rentalAmount = rentalItem[`${rentalForm.rental_type}_rental_price` as keyof RentalItem] as unknown as number;

    setLoading(true);
    try {
      const response = await fetch(`${backendUrl}/api/rental/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify({
          rental_item_id: parseInt(rentalForm.rental_item_id),
          customer_name: rentalForm.customer_name,
          customer_phone: rentalForm.customer_phone || undefined,
          customer_email: rentalForm.customer_email || undefined,
          rental_start_date: rentalForm.rental_start_date,
          rental_end_date: rentalForm.rental_end_date,
          rental_type: rentalForm.rental_type,
          rental_amount: rentalAmount,
          security_deposit_amount: rentalItem.security_deposit,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create rental transaction');
      }

      setRentalForm({
        rental_item_id: '',
        customer_name: '',
        customer_phone: '',
        customer_email: '',
        rental_type: 'daily',
        rental_start_date: new Date().toISOString().split('T')[0],
        rental_end_date: new Date().toISOString().split('T')[0],
      });
      setShowRentalModal(false);

      // Refresh data
      await fetchRentalItems();
      await fetchActiveRentals();
      alert('Rental transaction created successfully!');
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to create rental transaction');
      console.error('Error creating rental transaction:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProcessReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRental) return;

    setLoading(true);
    try {
      const response = await fetch(`${backendUrl}/api/rental/transactions/${selectedRental.id}/return`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify({
          itemCondition: returnForm.itemCondition,
          damageCharges: parseFloat(returnForm.damageCharges) || 0,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to process return');
      }

      setReturnForm({ itemCondition: 'good', damageCharges: '' });
      setShowReturnModal(false);
      setSelectedRental(null);

      // Refresh data
      await fetchActiveRentals();
      await fetchOverdueRentals();
      alert('Rental return processed successfully!');
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to process return');
      console.error('Error processing return:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditItem = (item: RentalItem) => {
    setEditingItem(item);
    setEditForm({
      daily_rental_price: item.daily_rental_price,
      weekly_rental_price: item.weekly_rental_price,
      monthly_rental_price: item.monthly_rental_price,
      security_deposit: item.security_deposit,
      condition: item.condition,
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    setLoading(true);
    try {
      const response = await fetch(`${backendUrl}/api/rental/items/${editingItem.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify({
          daily_rental_price: parseFloat(editForm.daily_rental_price),
          weekly_rental_price: parseFloat(editForm.weekly_rental_price),
          monthly_rental_price: parseFloat(editForm.monthly_rental_price),
          security_deposit: parseFloat(editForm.security_deposit),
          condition: editForm.condition,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update rental item');
      }

      setShowEditModal(false);
      setEditingItem(null);
      setEditForm({});

      // Refresh rental items
      await fetchRentalItems();
      alert('Rental item updated successfully!');
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to update rental item');
      console.error('Error updating rental item:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteItem = async (item: RentalItem) => {
    if (!window.confirm(`Are you sure you want to delete "${item.rental_unit_number}"? This action cannot be undone.`)) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${backendUrl}/api/rental/items/${item.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete rental item');
      }

      // Refresh rental items
      await fetchRentalItems();
      alert('Rental item deleted successfully!');
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to delete rental item');
      console.error('Error deleting rental item:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChangeStatus = async (item: RentalItem, newStatus: 'available' | 'maintenance' | 'archived') => {
    setLoading(true);
    try {
      const response = await fetch(`${backendUrl}/api/rental/items/${item.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update status');
      }

      await fetchRentalItems();
      alert(`Status changed to "${newStatus}" successfully!`);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to update status');
      console.error('Error changing status:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateDaysUntilDue = (endDate: string) => {
    const today = new Date();
    const end = new Date(endDate);
    const daysLeft = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysLeft;
  };

  // Filter products based on search
  const filteredProducts = products.filter(product =>
    product.name?.toLowerCase().includes(productSearch.toLowerCase()) ||
    product.sku?.toLowerCase().includes(productSearch.toLowerCase()) ||
    product.id?.toString().includes(productSearch)
  );

  // Generate next unit number (smarter - extracts number from existing units)
  const generateNextUnitNumber = () => {
    // Extract numbers from existing rental units
    const numbers = rentalItems
      .map(item => {
        const match = item.rental_unit_number.match(/\d+/);
        return match ? parseInt(match[0]) : 0;
      })
      .filter(n => n > 0);

    // Find the max number and increment
    const maxNumber = numbers.length > 0 ? Math.max(...numbers) : 0;
    const nextNumber = maxNumber + 1;
    return `RENTAL-${String(nextNumber).padStart(3, '0')}`;
  };

  const getRentalStatus = (daysUntilDue: number) => {
    if (daysUntilDue < 0) return 'Overdue';
    if (daysUntilDue === 0) return 'Due Today';
    if (daysUntilDue <= 3) return 'Due Soon';
    return 'Active';
  };

  const getStatusColor = (status: string) => {
    if (status === 'Overdue') return 'bg-red-100 text-red-800';
    if (status === 'Due Today') return 'bg-orange-100 text-orange-800';
    if (status === 'Due Soon') return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="flex-grow">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white py-8 px-6">
          <div className="flex items-center gap-3 mb-2">
            {React.createElement(FaGift as any, { size: 32 })}
            <h1 className="text-4xl font-bold">Jewelry Rental Management</h1>
          </div>
          <p className="text-purple-100">Manage rental items, track deposits, and process returns</p>
        </div>

        {/* Tabs */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-6 flex gap-4">
            {[
              { id: 'items', label: 'Rental Items', icon: FaBoxOpen },
              { id: 'active', label: 'Active Rentals', icon: FaClock },
              { id: 'overdue', label: 'Overdue Rentals', icon: FaTimesCircle },
              { id: 'revenue', label: 'Revenue Report', icon: FaMoneyBillWave },
            ].map((tab) => {
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-4 px-6 flex items-center gap-2 border-b-2 transition ${
                    activeTab === tab.id
                      ? 'border-purple-600 text-purple-600'
                      : 'border-transparent text-gray-600 hover:text-purple-600'
                  }`}
                >
                  {React.createElement(tab.icon as any, { size: 18 })}
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Rental Items Tab */}
          {activeTab === 'items' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Available Rental Items</h2>
                <button
                  onClick={() => {
                    setShowCreateModal(true);
                    // Auto-generate unit number when opening modal
                    const nextNumber = `RENTAL-${String(rentalItems.length + 1).padStart(3, '0')}`;
                    setCreateItemForm({
                      product_id: '',
                      rental_unit_number: nextNumber,
                      daily_rental_price: '',
                      weekly_rental_price: '',
                      monthly_rental_price: '',
                      security_deposit: '',
                      condition: 'excellent',
                    });
                  }}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg flex items-center gap-2 transition"
                >
                  {React.createElement(FaPlus as any, {})} Add Rental Item
                </button>
              </div>

              {loading ? (
                <div className="text-center py-8">Loading rental items...</div>
              ) : rentalItems.length === 0 ? (
                <div className="bg-white p-8 rounded-lg text-center text-gray-500">
                  No rental items yet. Click "Add Rental Item" to get started.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {rentalItems.map((item) => (
                    <div key={item.id} className="bg-white rounded-lg shadow hover:shadow-lg transition p-6">
                      <div className="flex justify-between items-start mb-4">
                        <h3 className="font-bold text-lg text-gray-800">{item.rental_unit_number}</h3>
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-semibold ${
                            item.status === 'available'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-orange-100 text-orange-800'
                          }`}
                        >
                          {item.status}
                        </span>
                      </div>

                      <div className="space-y-3 mb-4">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Daily Rate:</span>
                          <span className="font-semibold">Rs. {item.daily_rental_price.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Weekly Rate:</span>
                          <span className="font-semibold">Rs. {item.weekly_rental_price.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Monthly Rate:</span>
                          <span className="font-semibold">Rs. {item.monthly_rental_price.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-sm border-t pt-3">
                          <span className="text-gray-600">Deposit:</span>
                          <span className="font-semibold">Rs. {item.security_deposit.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Condition:</span>
                          <span className="font-semibold capitalize">{item.condition}</span>
                        </div>
                        <div className="flex justify-between text-sm border-t pt-3">
                          <span className="text-gray-600">Status:</span>
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${
                            item.status === 'available'
                              ? 'bg-green-100 text-green-800'
                              : item.status === 'rented'
                              ? 'bg-blue-100 text-blue-800'
                              : item.status === 'maintenance'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {item.status}
                          </span>
                        </div>
                      </div>

                      {isAdmin && item.status !== 'rented' && (
                        <div className="pt-2 border-t space-y-1 text-xs">
                          <p className="text-gray-600 font-medium">Change Status:</p>
                          <div className="flex gap-1">
                            {item.status !== 'available' && (
                              <button
                                onClick={() => handleChangeStatus(item, 'available')}
                                className="flex-1 bg-green-500 hover:bg-green-600 text-white py-1 rounded text-xs"
                                disabled={loading}
                              >
                                Available
                              </button>
                            )}
                            {item.status !== 'maintenance' && (
                              <button
                                onClick={() => handleChangeStatus(item, 'maintenance')}
                                className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white py-1 rounded text-xs"
                                disabled={loading}
                              >
                                Maintenance
                              </button>
                            )}
                            {item.status !== 'archived' && (
                              <button
                                onClick={() => handleChangeStatus(item, 'archived')}
                                className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-1 rounded text-xs"
                                disabled={loading}
                              >
                                Archive
                              </button>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="space-y-2">
                        <button
                          onClick={() => {
                            setRentalForm({
                              ...rentalForm,
                              rental_item_id: item.id.toString(),
                            });
                            setShowRentalModal(true);
                          }}
                          className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 rounded transition"
                        >
                          Process Rental
                        </button>
                        {isAdmin && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEditItem(item)}
                              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded transition text-sm"
                            >
                              ✏️ Edit
                            </button>
                            <button
                              onClick={() => handleDeleteItem(item)}
                              className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded transition text-sm"
                            >
                              🗑️ Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Active Rentals Tab */}
          {activeTab === 'active' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Active Rentals</h2>

              {loading ? (
                <div className="text-center py-8">Loading active rentals...</div>
              ) : activeRentals.length === 0 ? (
                <div className="bg-white p-8 rounded-lg text-center text-gray-500">
                  No active rentals at the moment.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-100 border-b">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold">Customer</th>
                        <th className="px-4 py-3 text-left font-semibold">Phone</th>
                        <th className="px-4 py-3 text-left font-semibold">Rental Type</th>
                        <th className="px-4 py-3 text-left font-semibold">Start Date</th>
                        <th className="px-4 py-3 text-left font-semibold">End Date</th>
                        <th className="px-4 py-3 text-left font-semibold">Days Until Due</th>
                        <th className="px-4 py-3 text-left font-semibold">Condition</th>
                        <th className="px-4 py-3 text-left font-semibold">Amount</th>
                        <th className="px-4 py-3 text-left font-semibold">Status</th>
                        <th className="px-4 py-3 text-left font-semibold">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeRentals.map((rental) => {
                        const daysUntilDue = calculateDaysUntilDue(rental.rental_end_date);
                        const status = getRentalStatus(daysUntilDue);

                        return (
                          <tr key={rental.id} className="border-b hover:bg-gray-50">
                            <td className="px-4 py-3 font-semibold">{rental.customer_name}</td>
                            <td className="px-4 py-3">{rental.customer_phone || '—'}</td>
                            <td className="px-4 py-3 capitalize">{rental.rental_type}</td>
                            <td className="px-4 py-3">{rental.rental_start_date}</td>
                            <td className="px-4 py-3">{rental.rental_end_date}</td>
                            <td className="px-4 py-3">
                              <span className={`px-3 py-1 rounded text-sm font-semibold ${getStatusColor(status)}`}>
                                {daysUntilDue} days
                              </span>
                            </td>
                            <td className="px-4 py-3 capitalize">{rental.item_condition_on_return || '—'}</td>
                            <td className="px-4 py-3 font-semibold">Rs. {rental.rental_amount.toLocaleString()}</td>
                            <td className="px-4 py-3">
                              <span className={`px-3 py-1 rounded text-sm font-semibold ${getStatusColor(status)}`}>
                                {status}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <button
                                onClick={() => {
                                  setSelectedRental(rental);
                                  setShowReturnModal(true);
                                }}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm transition"
                              >
                                Process Return
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Overdue Rentals Tab */}
          {activeTab === 'overdue' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Overdue Rentals</h2>

              {loading ? (
                <div className="text-center py-8">Loading overdue rentals...</div>
              ) : overdueRentals.length === 0 ? (
                <div className="bg-white p-8 rounded-lg text-center text-gray-500">
                  ✓ No overdue rentals. Great job!
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-red-100 border-b border-red-300">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold">Customer</th>
                        <th className="px-4 py-3 text-left font-semibold">Phone</th>
                        <th className="px-4 py-3 text-left font-semibold">Due Date</th>
                        <th className="px-4 py-3 text-left font-semibold">Days Overdue</th>
                        <th className="px-4 py-3 text-left font-semibold">Condition</th>
                        <th className="px-4 py-3 text-left font-semibold">Rental Amount</th>
                        <th className="px-4 py-3 text-left font-semibold">Est. Late Fees</th>
                        <th className="px-4 py-3 text-left font-semibold">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {overdueRentals.map((rental) => {
                        const daysOverdue = Math.abs(calculateDaysUntilDue(rental.rental_end_date));
                        const dailyRate = rental.rental_amount / 30; // Approximate for all types
                        const estimatedLateFees = (dailyRate * daysOverdue) * 0.05;

                        return (
                          <tr key={rental.id} className="border-b bg-red-50 hover:bg-red-100">
                            <td className="px-4 py-3 font-semibold">{rental.customer_name}</td>
                            <td className="px-4 py-3">{rental.customer_phone || '—'}</td>
                            <td className="px-4 py-3">{rental.rental_end_date}</td>
                            <td className="px-4 py-3">
                              <span className="bg-red-200 text-red-900 px-3 py-1 rounded font-bold">
                                {daysOverdue} days
                              </span>
                            </td>
                            <td className="px-4 py-3 capitalize">{rental.item_condition_on_return || '—'}</td>
                            <td className="px-4 py-3 font-semibold">Rs. {rental.rental_amount.toLocaleString()}</td>
                            <td className="px-4 py-3 font-semibold">Rs. {Math.round(estimatedLateFees).toLocaleString()}</td>
                            <td className="px-4 py-3">
                              <button
                                onClick={() => {
                                  setSelectedRental(rental);
                                  setShowReturnModal(true);
                                }}
                                className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm transition"
                              >
                                Collect & Return
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Revenue Report Tab */}
          {activeTab === 'revenue' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Revenue Report</h2>

              <div className="bg-white rounded-lg shadow p-6 mb-6">
                <div className="flex gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Start Date</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="border rounded px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">End Date</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="border rounded px-3 py-2"
                    />
                  </div>
                </div>

                {loading ? (
                  <div className="text-center py-8">Loading revenue data...</div>
                ) : revenueSummary ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg p-6">
                      <div className="text-sm opacity-90 mb-2">Total Rentals</div>
                      <div className="text-3xl font-bold">{revenueSummary.total_rentals}</div>
                    </div>
                    <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-lg p-6">
                      <div className="text-sm opacity-90 mb-2">Rental Revenue</div>
                      <div className="text-3xl font-bold">Rs. {(revenueSummary.total_rental_revenue || 0).toLocaleString()}</div>
                    </div>
                    <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-lg p-6">
                      <div className="text-sm opacity-90 mb-2">Late Fees</div>
                      <div className="text-3xl font-bold">Rs. {(revenueSummary.total_late_fees || 0).toLocaleString()}</div>
                    </div>
                    <div className="bg-gradient-to-br from-red-500 to-red-600 text-white rounded-lg p-6">
                      <div className="text-sm opacity-90 mb-2">Damage Charges</div>
                      <div className="text-3xl font-bold">Rs. {(revenueSummary.total_damage_charges || 0).toLocaleString()}</div>
                    </div>
                    <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-lg p-6">
                      <div className="text-sm opacity-90 mb-2">Deposits Held</div>
                      <div className="text-3xl font-bold">Rs. {(revenueSummary.total_deposits_held || 0).toLocaleString()}</div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">No revenue data available</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Rental Item Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full mx-4 p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Add Rental Item</h3>
            <form
              onSubmit={handleCreateRentalItem}
              className="space-y-4"
            >
              <div className="product-dropdown-container">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Product *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search by name, SKU, or ID..."
                    required={!createItemForm.product_id}
                    value={showProductDropdown ? productSearch : (products.find(p => p.id === parseInt(createItemForm.product_id))?.name || '')}
                    onChange={(e) => {
                      setProductSearch(e.target.value);
                      setShowProductDropdown(true);
                    }}
                    onFocus={() => {
                      setShowProductDropdown(true);
                      setProductSearch('');
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
                  />

                  {/* Dropdown */}
                  {showProductDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
                      {filteredProducts.length > 0 ? (
                        filteredProducts.map(product => (
                          <button
                            key={product.id}
                            type="button"
                            onClick={() => {
                              setCreateItemForm({ ...createItemForm, product_id: product.id.toString() });
                              setProductSearch('');
                              setShowProductDropdown(false);
                            }}
                            className="w-full text-left px-3 py-2 hover:bg-purple-50 border-b border-gray-200 last:border-b-0"
                          >
                            <div className="font-medium text-gray-900">{product.name}</div>
                            <div className="text-sm text-gray-500">ID: {product.id} • SKU: {product.sku}</div>
                          </button>
                        ))
                      ) : (
                        <div className="px-3 py-2 text-gray-500 text-sm">
                          No products found
                        </div>
                      )}
                    </div>
                  )}
                </div>
                {createItemForm.product_id && (
                  <p className="text-xs text-green-600 mt-1">
                    ✓ Selected: {products.find(p => p.id === parseInt(createItemForm.product_id))?.name}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Unit Number * (Auto-generated)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g., RENTAL-001"
                    required
                    value={createItemForm.rental_unit_number}
                    onChange={(e) => setCreateItemForm({ ...createItemForm, rental_unit_number: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const nextNumber = generateNextUnitNumber();
                      setCreateItemForm({ ...createItemForm, rental_unit_number: nextNumber });
                    }}
                    className="px-3 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 font-medium text-sm"
                  >
                    Generate
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">Click "Generate" for auto number or enter custom</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Daily Rental Price (Rs.) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  required
                  value={createItemForm.daily_rental_price}
                  onChange={(e) => setCreateItemForm({ ...createItemForm, daily_rental_price: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Weekly Rental Price (Rs.)
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={createItemForm.weekly_rental_price}
                  onChange={(e) => setCreateItemForm({ ...createItemForm, weekly_rental_price: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Monthly Rental Price (Rs.)
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={createItemForm.monthly_rental_price}
                  onChange={(e) => setCreateItemForm({ ...createItemForm, monthly_rental_price: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Security Deposit (Rs.) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  required
                  value={createItemForm.security_deposit}
                  onChange={(e) => setCreateItemForm({ ...createItemForm, security_deposit: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Item Condition
                </label>
                <select
                  value={createItemForm.condition}
                  onChange={(e) => setCreateItemForm({ ...createItemForm, condition: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600">
                  <option value="excellent">Excellent</option>
                  <option value="good">Good</option>
                  <option value="fair">Fair</option>
                  <option value="poor">Poor</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg transition disabled:opacity-50"
                >
                  {loading ? 'Adding...' : 'Add Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Process Rental Modal */}
      {showRentalModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full mx-4 p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Process Rental</h3>
            <form
              onSubmit={handleCreateRentalTransaction}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rental Item *
                </label>
                <select
                  required
                  value={rentalForm.rental_item_id}
                  onChange={(e) => setRentalForm({ ...rentalForm, rental_item_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600">
                  <option value="">Select a rental item</option>
                  {rentalItems.map(item => (
                    <option key={item.id} value={item.id}>
                      {item.rental_unit_number}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Customer Name *
                </label>
                <input
                  type="text"
                  placeholder="Enter customer name"
                  required
                  value={rentalForm.customer_name}
                  onChange={(e) => setRentalForm({ ...rentalForm, customer_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  placeholder="Enter phone number"
                  value={rentalForm.customer_phone}
                  onChange={(e) => setRentalForm({ ...rentalForm, customer_phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  placeholder="Enter email address"
                  value={rentalForm.customer_email}
                  onChange={(e) => setRentalForm({ ...rentalForm, customer_email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rental Type *
                </label>
                <select
                  required
                  value={rentalForm.rental_type}
                  onChange={(e) => setRentalForm({ ...rentalForm, rental_type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600">
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date *
                </label>
                <input
                  type="date"
                  required
                  value={rentalForm.rental_start_date}
                  onChange={(e) => setRentalForm({ ...rentalForm, rental_start_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date *
                </label>
                <input
                  type="date"
                  required
                  value={rentalForm.rental_end_date}
                  onChange={(e) => setRentalForm({ ...rentalForm, rental_end_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowRentalModal(false)}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg transition disabled:opacity-50"
                >
                  {loading ? 'Processing...' : 'Process Rental'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Return Item Modal */}
      {showReturnModal && selectedRental && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full mx-4 p-6 max-h-96 overflow-y-auto">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Process Return</h3>
            <div className="mb-4 p-3 bg-blue-50 rounded border border-blue-200">
              <p className="text-sm"><strong>Customer:</strong> {selectedRental.customer_name}</p>
              <p className="text-sm"><strong>Rental Amount:</strong> Rs. {selectedRental.rental_amount.toLocaleString()}</p>
              <p className="text-sm"><strong>End Date:</strong> {selectedRental.rental_end_date}</p>
              <p className="text-sm"><strong>Days Overdue:</strong> {Math.max(0, calculateDaysUntilDue(selectedRental.rental_end_date) * -1)}</p>
              {Math.max(0, calculateDaysUntilDue(selectedRental.rental_end_date) * -1) > 0 && (
                <div className="mt-2 p-2 bg-red-100 border border-red-300 rounded">
                  <p className="text-sm font-semibold text-red-700">
                    ⚠️ Late Fees: Rs. {Math.round(
                      (selectedRental.rental_amount / 30) *
                      Math.max(0, calculateDaysUntilDue(selectedRental.rental_end_date) * -1) *
                      0.05
                    ).toString()}
                  </p>
                </div>
              )}
            </div>
            <form
              onSubmit={handleProcessReturn}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Item Condition on Return *
                </label>
                <select
                  required
                  value={returnForm.itemCondition}
                  onChange={(e) => setReturnForm({ ...returnForm, itemCondition: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600">
                  <option value="excellent">Excellent</option>
                  <option value="good">Good</option>
                  <option value="fair">Fair</option>
                  <option value="poor">Poor</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Damage Charges (Rs.)
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={returnForm.damageCharges}
                  onChange={(e) => setReturnForm({ ...returnForm, damageCharges: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowReturnModal(false)}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition disabled:opacity-50"
                >
                  {loading ? 'Processing...' : 'Process Return'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Rental Item Modal */}
      {showEditModal && editingItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full mx-4 p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Edit Rental Item</h3>
            <div className="mb-4 p-3 bg-blue-50 rounded border border-blue-200">
              <p className="text-sm"><strong>Unit:</strong> {editingItem.rental_unit_number}</p>
              <p className="text-sm"><strong>Status:</strong> {editingItem.status}</p>
            </div>
            <form
              onSubmit={handleSaveEdit}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Daily Rental Price (Rs.) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={editForm.daily_rental_price}
                  onChange={(e) => setEditForm({ ...editForm, daily_rental_price: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Weekly Rental Price (Rs.)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={editForm.weekly_rental_price}
                  onChange={(e) => setEditForm({ ...editForm, weekly_rental_price: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Monthly Rental Price (Rs.)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={editForm.monthly_rental_price}
                  onChange={(e) => setEditForm({ ...editForm, monthly_rental_price: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Security Deposit (Rs.) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={editForm.security_deposit}
                  onChange={(e) => setEditForm({ ...editForm, security_deposit: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Item Condition
                </label>
                <select
                  value={editForm.condition}
                  onChange={(e) => setEditForm({ ...editForm, condition: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600">
                  <option value="excellent">Excellent</option>
                  <option value="good">Good</option>
                  <option value="fair">Fair</option>
                  <option value="poor">Poor</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}

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
}

interface RevenueSummary {
  total_rentals: number;
  total_rental_revenue: number;
  total_late_fees: number;
  total_damage_charges: number;
  total_deposits_held: number;
}

export default function Rental() {
  const [activeTab, setActiveTab] = useState<'items' | 'active' | 'overdue' | 'revenue'>('items');
  const [rentalItems, setRentalItems] = useState<RentalItem[]>([]);
  const [activeRentals, setActiveRentals] = useState<RentalTransaction[]>([]);
  const [overdueRentals, setOverdueRentals] = useState<RentalTransaction[]>([]);
  const [revenueSummary, setRevenueSummary] = useState<RevenueSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRentalModal, setShowRentalModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [selectedRental, setSelectedRental] = useState<RentalTransaction | null>(null);
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Fetch rental items
  const fetchRentalItems = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/rental/items', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      });
      const data = await res.json();
      setRentalItems(data);
    } catch (error) {
      console.error('Error fetching rental items:', error);
    }
    setLoading(false);
  };

  // Fetch active rentals
  const fetchActiveRentals = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/rental/transactions/active', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      });
      const data = await res.json();
      setActiveRentals(data);
    } catch (error) {
      console.error('Error fetching active rentals:', error);
    }
    setLoading(false);
  };

  // Fetch overdue rentals
  const fetchOverdueRentals = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/rental/transactions/overdue', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      });
      const data = await res.json();
      setOverdueRentals(data);
    } catch (error) {
      console.error('Error fetching overdue rentals:', error);
    }
    setLoading(false);
  };

  // Fetch revenue summary
  const fetchRevenueSummary = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/rental/reports/revenue?startDate=${startDate}&endDate=${endDate}`,
        {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        }
      );
      const data = await res.json();
      setRevenueSummary(data);
    } catch (error) {
      console.error('Error fetching revenue summary:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (activeTab === 'items') fetchRentalItems();
    else if (activeTab === 'active') fetchActiveRentals();
    else if (activeTab === 'overdue') fetchOverdueRentals();
    else if (activeTab === 'revenue') fetchRevenueSummary();
  }, [activeTab, startDate, endDate]);

  const calculateDaysUntilDue = (endDate: string) => {
    const today = new Date();
    const end = new Date(endDate);
    const daysLeft = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysLeft;
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
                  onClick={() => setShowCreateModal(true)}
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
                      </div>

                      <button
                        onClick={() => setSelectedRental({} as any)}
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 rounded transition"
                      >
                        Process Rental
                      </button>
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

      <Footer />
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Footer from '../components/Footer';
import { FaPlus, FaEdit, FaTrash, FaSignOutAlt, FaUsers, FaArrowLeft, FaClock, FaCalendar } from 'react-icons/fa';

interface Employee {
  id: number;
  user_id: number;
  name?: string;
  hire_date: string;
  base_salary: number;
  enable_commission: number;
  commission_percentage: number;
  phone?: string;
  address?: string;
  status: string;
}

interface EmployeeShift {
  id: number;
  employee_id: number;
  shift_date: string;
  start_time: string;
  end_time: string;
  worked_hours?: number;
  status: string;
  notes?: string;
}

interface EmployeeAttendance {
  id: number;
  employee_id: number;
  attendance_date: string;
  present: number;
  notes?: string;
}

const EmployeeManagement: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout, token } = useAuth();
  const [activeTab, setActiveTab] = useState<'employees' | 'shifts' | 'attendance'>('employees');

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shifts, setShifts] = useState<EmployeeShift[]>([]);
  const [attendance, setAttendance] = useState<EmployeeAttendance[]>([]);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const [showEmployeeForm, setShowEmployeeForm] = useState(false);
  const [editingEmployeeId, setEditingEmployeeId] = useState<number | null>(null);
  const [employeeFormData, setEmployeeFormData] = useState({
    name: '',
    userId: '',
    hireDate: new Date().toISOString().split('T')[0],
    baseSalary: '',
    enableCommission: 0,
    commissionPercentage: '',
    phone: '',
    address: '',
  });

  const [showShiftForm, setShowShiftForm] = useState(false);
  const [shiftFormData, setShiftFormData] = useState({
    employeeId: '',
    shiftDate: new Date().toISOString().split('T')[0],
    startTime: '09:00',
    endTime: '17:00',
    status: 'scheduled',
    notes: '',
  });

  const [showAttendanceForm, setShowAttendanceForm] = useState(false);
  const [attendanceFormData, setAttendanceFormData] = useState({
    employeeId: '',
    attendanceDate: new Date().toISOString().split('T')[0],
    present: 1,
    notes: '',
  });

  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null);

  const backendUrl = window.electron?.getBackendUrl?.() || 'http://localhost:3001';

  useEffect(() => {
    if (!user || user.role !== 'Admin') {
      navigate('/dashboard');
    }
  }, [user, navigate]);

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

  useEffect(() => {
    if (activeTab === 'employees') fetchEmployees();
    else if (activeTab === 'shifts' && selectedEmployeeId) fetchShifts();
    else if (activeTab === 'attendance' && selectedEmployeeId) fetchAttendance();
  }, [activeTab, selectedEmployeeId]);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${backendUrl}/api/employees`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch employees');
      const data = await response.json();
      setEmployees(Array.isArray(data) ? data : []);
    } catch (error) {
      setErrorMessage('Failed to load employees');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchShifts = async () => {
    if (!selectedEmployeeId) return;
    setLoading(true);
    try {
      const month = new Date().toISOString().split('T')[0].slice(0, 7);
      const [year, monthNum] = month.split('-');
      const monthEnd = new Date(parseInt(year), parseInt(monthNum), 0).toISOString().split('T')[0];
      const monthStart = `${year}-${monthNum}-01`;

      const response = await fetch(`${backendUrl}/api/employees/${selectedEmployeeId}/shifts?startDate=${monthStart}&endDate=${monthEnd}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch shifts');
      const data = await response.json();
      setShifts(Array.isArray(data) ? data : []);
    } catch (error) {
      setErrorMessage('Failed to load shifts');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendance = async () => {
    if (!selectedEmployeeId) return;
    setLoading(true);
    try {
      const month = new Date().toISOString().split('T')[0].slice(0, 7);
      const [year, monthNum] = month.split('-');
      const monthEnd = new Date(parseInt(year), parseInt(monthNum), 0).toISOString().split('T')[0];
      const monthStart = `${year}-${monthNum}-01`;

      const response = await fetch(`${backendUrl}/api/employees/${selectedEmployeeId}/attendance?startDate=${monthStart}&endDate=${monthEnd}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch attendance');
      const data = await response.json();
      setAttendance(Array.isArray(data) ? data : []);
    } catch (error) {
      setErrorMessage('Failed to load attendance');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEmployee = async () => {
    if (!employeeFormData.name || !employeeFormData.userId || !employeeFormData.baseSalary) {
      setErrorMessage('Please fill in required fields (Name, User ID, Salary)');
      return;
    }

    setLoading(true);
    try {
      const url = editingEmployeeId
        ? `${backendUrl}/api/employees/${editingEmployeeId}`
        : `${backendUrl}/api/employees`;
      const method = editingEmployeeId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: employeeFormData.name,
          userId: parseInt(employeeFormData.userId),
          hireDate: employeeFormData.hireDate,
          baseSalary: parseFloat(employeeFormData.baseSalary),
          enableCommission: employeeFormData.enableCommission,
          commissionPercentage: employeeFormData.commissionPercentage ? parseFloat(employeeFormData.commissionPercentage) : 0,
          phone: employeeFormData.phone || null,
          address: employeeFormData.address || null,
        }),
      });

      if (!response.ok) throw new Error('Failed to save employee');

      setSuccessMessage(editingEmployeeId ? 'Employee updated' : 'Employee created');
      setShowEmployeeForm(false);
      setEditingEmployeeId(null);
      setEmployeeFormData({
        name: '',
        userId: '',
        hireDate: new Date().toISOString().split('T')[0],
        baseSalary: '',
        enableCommission: 0,
        commissionPercentage: '',
        phone: '',
        address: '',
      });
      fetchEmployees();
    } catch (error) {
      setErrorMessage('Failed to save employee');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEmployee = async (id: number) => {
    if (!window.confirm('Are you sure?')) return;
    setLoading(true);
    try {
      const response = await fetch(`${backendUrl}/api/employees/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to delete');
      setSuccessMessage('Employee deleted');
      fetchEmployees();
    } catch (error) {
      setErrorMessage('Failed to delete employee');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveShift = async () => {
    if (!shiftFormData.employeeId || !shiftFormData.startTime || !shiftFormData.endTime) {
      setErrorMessage('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${backendUrl}/api/employees/${shiftFormData.employeeId}/shifts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          shiftDate: shiftFormData.shiftDate,
          startTime: shiftFormData.startTime,
          endTime: shiftFormData.endTime,
          status: shiftFormData.status,
          notes: shiftFormData.notes || null,
        }),
      });

      if (!response.ok) throw new Error('Failed to save shift');

      setSuccessMessage('Shift recorded');
      setShowShiftForm(false);
      setShiftFormData({
        employeeId: '',
        shiftDate: new Date().toISOString().split('T')[0],
        startTime: '09:00',
        endTime: '17:00',
        status: 'scheduled',
        notes: '',
      });
      fetchShifts();
    } catch (error) {
      setErrorMessage('Failed to save shift');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAttendance = async () => {
    if (!attendanceFormData.employeeId) {
      setErrorMessage('Please select employee');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${backendUrl}/api/employees/${attendanceFormData.employeeId}/attendance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          attendanceDate: attendanceFormData.attendanceDate,
          present: attendanceFormData.present,
          notes: attendanceFormData.notes || null,
        }),
      });

      if (!response.ok) throw new Error('Failed to save attendance');

      setSuccessMessage('Attendance recorded');
      setShowAttendanceForm(false);
      setAttendanceFormData({
        employeeId: '',
        attendanceDate: new Date().toISOString().split('T')[0],
        present: 1,
        notes: '',
      });
      fetchAttendance();
    } catch (error) {
      setErrorMessage('Failed to save attendance');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-4 shadow-lg">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/dashboard')} className="hover:bg-purple-700 p-2 rounded">
              <FaArrowLeft size={20} />
            </button>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FaUsers /> Employee Management
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
          {['employees', 'shifts', 'attendance'].map(tab => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab as any);
                setSelectedEmployeeId(null);
              }}
              className={`px-4 py-3 font-medium border-b-2 ${
                activeTab === tab ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-600'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4">
        {activeTab === 'employees' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Employees</h2>
              <button
                onClick={() => {
                  setEditingEmployeeId(null);
                  setEmployeeFormData({
                    name: '',
                    userId: '',
                    hireDate: new Date().toISOString().split('T')[0],
                    baseSalary: '',
                    enableCommission: 0,
                    commissionPercentage: '',
                    phone: '',
                    address: '',
                  });
                  setShowEmployeeForm(true);
                }}
                className="bg-purple-600 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-purple-700"
              >
                <FaPlus /> Add Employee
              </button>
            </div>

            <div className="bg-white rounded-lg shadow overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100 border-b">
                  <tr>
                    <th className="px-4 py-2 text-left">Name</th>
                    <th className="px-4 py-2 text-left">Hire Date</th>
                    <th className="px-4 py-2 text-right">Salary</th>
                    <th className="px-4 py-2 text-center">Commission</th>
                    <th className="px-4 py-2 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map(emp => (
                    <tr key={emp.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-2 font-medium">{emp.name || `Employee #${emp.user_id}`}</td>
                      <td className="px-4 py-2">{new Date(emp.hire_date).toLocaleDateString()}</td>
                      <td className="px-4 py-2 text-right">Rs. {emp.base_salary.toFixed(2)}</td>
                      <td className="px-4 py-2 text-center">{emp.enable_commission ? `${emp.commission_percentage}%` : 'N/A'}</td>
                      <td className="px-4 py-2 text-center">
                        <button onClick={() => {
                          setEmployeeFormData({
                            name: emp.name || '',
                            userId: emp.user_id.toString(),
                            hireDate: emp.hire_date,
                            baseSalary: emp.base_salary.toString(),
                            enableCommission: emp.enable_commission,
                            commissionPercentage: emp.commission_percentage.toString(),
                            phone: emp.phone || '',
                            address: emp.address || '',
                          });
                          setEditingEmployeeId(emp.id);
                          setShowEmployeeForm(true);
                        }} className="text-blue-600 hover:text-blue-800 mr-2"><FaEdit /></button>
                        <button onClick={() => handleDeleteEmployee(emp.id)} className="text-red-600 hover:text-red-800"><FaTrash /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'shifts' && (
          <div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Select Employee</label>
              <select
                value={selectedEmployeeId || ''}
                onChange={e => setSelectedEmployeeId(parseInt(e.target.value))}
                className="border rounded px-3 py-2 w-full md:w-64"
              >
                <option value="">Choose an employee</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name || `Employee #${emp.user_id}`}
                  </option>
                ))}
              </select>
            </div>

            {selectedEmployeeId && (
              <>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold">Shifts for {employees.find(e => e.id === selectedEmployeeId)?.name || 'Employee'}</h2>
                  <button
                    onClick={() => {
                      setShiftFormData({
                        employeeId: selectedEmployeeId.toString(),
                        shiftDate: new Date().toISOString().split('T')[0],
                        startTime: '09:00',
                        endTime: '17:00',
                        status: 'scheduled',
                        notes: '',
                      });
                      setShowShiftForm(true);
                    }}
                    className="bg-purple-600 text-white px-4 py-2 rounded flex items-center gap-2"
                  >
                    <FaPlus /> Record Shift
                  </button>
                </div>

                <div className="bg-white rounded-lg shadow overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-100 border-b">
                      <tr>
                        <th className="px-4 py-2 text-left">Date</th>
                        <th className="px-4 py-2 text-left">Start</th>
                        <th className="px-4 py-2 text-left">End</th>
                        <th className="px-4 py-2 text-center">Hours</th>
                        <th className="px-4 py-2 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {shifts.map(shift => (
                        <tr key={shift.id} className="border-b hover:bg-gray-50">
                          <td className="px-4 py-2">{new Date(shift.shift_date).toLocaleDateString()}</td>
                          <td className="px-4 py-2">{shift.start_time}</td>
                          <td className="px-4 py-2">{shift.end_time}</td>
                          <td className="px-4 py-2 text-center">{shift.worked_hours?.toFixed(1) || '-'}</td>
                          <td className="px-4 py-2 text-center">
                            <span className={`px-2 py-1 rounded text-sm ${
                              shift.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {shift.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'attendance' && (
          <div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Select Employee</label>
              <select
                value={selectedEmployeeId || ''}
                onChange={e => setSelectedEmployeeId(parseInt(e.target.value))}
                className="border rounded px-3 py-2 w-full md:w-64"
              >
                <option value="">Choose an employee</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name || `Employee #${emp.user_id}`}
                  </option>
                ))}
              </select>
            </div>

            {selectedEmployeeId && (
              <>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold">Attendance for {employees.find(e => e.id === selectedEmployeeId)?.name || 'Employee'}</h2>
                  <button
                    onClick={() => {
                      setAttendanceFormData({
                        employeeId: selectedEmployeeId.toString(),
                        attendanceDate: new Date().toISOString().split('T')[0],
                        present: 1,
                        notes: '',
                      });
                      setShowAttendanceForm(true);
                    }}
                    className="bg-purple-600 text-white px-4 py-2 rounded flex items-center gap-2"
                  >
                    <FaPlus /> Mark Attendance
                  </button>
                </div>

                <div className="bg-white rounded-lg shadow overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-100 border-b">
                      <tr>
                        <th className="px-4 py-2 text-left">Date</th>
                        <th className="px-4 py-2 text-center">Present</th>
                        <th className="px-4 py-2 text-left">Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attendance.map(att => (
                        <tr key={att.id} className="border-b hover:bg-gray-50">
                          <td className="px-4 py-2">{new Date(att.attendance_date).toLocaleDateString()}</td>
                          <td className="px-4 py-2 text-center">
                            <span className={att.present ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>
                              {att.present ? '✓ Yes' : '✗ No'}
                            </span>
                          </td>
                          <td className="px-4 py-2">{att.notes || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Employee Form Modal */}
      {showEmployeeForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">{editingEmployeeId ? 'Edit Employee' : 'Add Employee'}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Employee Name *</label>
                <input
                  type="text"
                  value={employeeFormData.name}
                  onChange={e => setEmployeeFormData({ ...employeeFormData, name: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  placeholder="e.g., Ahmed Khan"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">User ID *</label>
                <input
                  type="number"
                  value={employeeFormData.userId}
                  onChange={e => setEmployeeFormData({ ...employeeFormData, userId: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Hire Date *</label>
                <input
                  type="date"
                  value={employeeFormData.hireDate}
                  onChange={e => setEmployeeFormData({ ...employeeFormData, hireDate: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Base Salary *</label>
                <input
                  type="number"
                  step="0.01"
                  value={employeeFormData.baseSalary}
                  onChange={e => setEmployeeFormData({ ...employeeFormData, baseSalary: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={employeeFormData.enableCommission === 1}
                    onChange={e => setEmployeeFormData({ ...employeeFormData, enableCommission: e.target.checked ? 1 : 0 })}
                  />
                  <span className="text-sm font-medium">Enable Commission</span>
                </label>
              </div>
              {employeeFormData.enableCommission === 1 && (
                <div>
                  <label className="block text-sm font-medium mb-1">Commission %</label>
                  <input
                    type="number"
                    step="0.01"
                    value={employeeFormData.commissionPercentage}
                    onChange={e => setEmployeeFormData({ ...employeeFormData, commissionPercentage: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium mb-1">Phone</label>
                <input
                  type="tel"
                  value={employeeFormData.phone}
                  onChange={e => setEmployeeFormData({ ...employeeFormData, phone: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Address</label>
                <textarea
                  value={employeeFormData.address}
                  onChange={e => setEmployeeFormData({ ...employeeFormData, address: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  rows={2}
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSaveEmployee}
                  disabled={loading}
                  className="flex-1 bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={() => setShowEmployeeForm(false)}
                  className="flex-1 bg-gray-300 text-gray-800 px-4 py-2 rounded"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Shift Form Modal */}
      {showShiftForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">Record Shift</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Date *</label>
                <input
                  type="date"
                  value={shiftFormData.shiftDate}
                  onChange={e => setShiftFormData({ ...shiftFormData, shiftDate: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Start Time *</label>
                <input
                  type="time"
                  value={shiftFormData.startTime}
                  onChange={e => setShiftFormData({ ...shiftFormData, startTime: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">End Time *</label>
                <input
                  type="time"
                  value={shiftFormData.endTime}
                  onChange={e => setShiftFormData({ ...shiftFormData, endTime: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Status</label>
                <select
                  value={shiftFormData.status}
                  onChange={e => setShiftFormData({ ...shiftFormData, status: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="scheduled">Scheduled</option>
                  <option value="completed">Completed</option>
                  <option value="absent">Absent</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSaveShift}
                  disabled={loading}
                  className="flex-1 bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={() => setShowShiftForm(false)}
                  className="flex-1 bg-gray-300 text-gray-800 px-4 py-2 rounded"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Attendance Form Modal */}
      {showAttendanceForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">Mark Attendance</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Date *</label>
                <input
                  type="date"
                  value={attendanceFormData.attendanceDate}
                  onChange={e => setAttendanceFormData({ ...attendanceFormData, attendanceDate: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Present</label>
                <select
                  value={attendanceFormData.present}
                  onChange={e => setAttendanceFormData({ ...attendanceFormData, present: parseInt(e.target.value) })}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value={1}>Present</option>
                  <option value={0}>Absent</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Notes</label>
                <textarea
                  value={attendanceFormData.notes}
                  onChange={e => setAttendanceFormData({ ...attendanceFormData, notes: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  rows={2}
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSaveAttendance}
                  disabled={loading}
                  className="flex-1 bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={() => setShowAttendanceForm(false)}
                  className="flex-1 bg-gray-300 text-gray-800 px-4 py-2 rounded"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default EmployeeManagement;

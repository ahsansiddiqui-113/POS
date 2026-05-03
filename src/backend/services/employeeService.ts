import { getDatabase } from '../database/db';
import { AppError } from '../middleware/errorHandler';

export interface Employee {
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
  created_at: string;
  updated_at: string;
}

export interface EmployeeShift {
  id: number;
  employee_id: number;
  shift_date: string;
  start_time: string;
  end_time: string;
  worked_hours?: number;
  status: string;
  notes?: string;
  created_at: string;
}

export interface EmployeeAttendance {
  id: number;
  employee_id: number;
  attendance_date: string;
  present: number;
  notes?: string;
  recorded_by?: number;
  created_at: string;
}

export class EmployeeService {
  private db = getDatabase();

  // ============ EMPLOYEE CRUD ============

  createEmployee(data: {
    userId: number;
    name?: string;
    hireDate: string;
    baseSalary: number;
    enableCommission?: number;
    commissionPercentage?: number;
    phone?: string;
    address?: string;
  }): Employee {
    if (data.baseSalary <= 0) {
      throw new AppError(400, 'Base salary must be greater than 0');
    }

    const stmt = this.db.prepare(`
      INSERT INTO employees (user_id, name, hire_date, base_salary, enable_commission, commission_percentage, phone, address, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `);

    stmt.run(
      data.userId,
      data.name || null,
      data.hireDate,
      data.baseSalary,
      data.enableCommission || 0,
      data.commissionPercentage || 0,
      data.phone || null,
      data.address || null
    );

    const employeeId = (this.db.prepare('SELECT last_insert_rowid() as id').get() as any).id;
    return this.getEmployee(employeeId) as Employee;
  }

  getEmployee(id: number): Employee | null {
    return this.db
      .prepare('SELECT * FROM employees WHERE id = ?')
      .get(id) as Employee | null;
  }

  getEmployeeByUserId(userId: number): Employee | null {
    return this.db
      .prepare('SELECT * FROM employees WHERE user_id = ?')
      .get(userId) as Employee | null;
  }

  getAllEmployees(): Employee[] {
    return this.db
      .prepare("SELECT * FROM employees WHERE status = 'active' ORDER BY hire_date DESC")
      .all() as Employee[];
  }

  updateEmployee(id: number, data: {
    name?: string;
    baseSalary?: number;
    enableCommission?: number;
    commissionPercentage?: number;
    phone?: string;
    address?: string;
    status?: string;
  }): Employee {
    const employee = this.getEmployee(id);
    if (!employee) {
      throw new AppError(404, 'Employee not found');
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (data.name !== undefined) {
      updates.push('name = ?');
      values.push(data.name || null);
    }

    if (data.baseSalary !== undefined) {
      if (data.baseSalary <= 0) {
        throw new AppError(400, 'Base salary must be greater than 0');
      }
      updates.push('base_salary = ?');
      values.push(data.baseSalary);
    }

    if (data.enableCommission !== undefined) {
      updates.push('enable_commission = ?');
      values.push(data.enableCommission);
    }

    if (data.commissionPercentage !== undefined) {
      updates.push('commission_percentage = ?');
      values.push(data.commissionPercentage);
    }

    if (data.phone !== undefined) {
      updates.push('phone = ?');
      values.push(data.phone || null);
    }

    if (data.address !== undefined) {
      updates.push('address = ?');
      values.push(data.address || null);
    }

    if (data.status !== undefined && ['active', 'inactive'].includes(data.status)) {
      updates.push('status = ?');
      values.push(data.status);
    }

    if (updates.length === 0) {
      return employee;
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    const query = `UPDATE employees SET ${updates.join(', ')} WHERE id = ?`;
    this.db.prepare(query).run(...values);

    return this.getEmployee(id) as Employee;
  }

  // ============ SHIFTS ============

  recordShift(data: {
    employeeId: number;
    shiftDate: string;
    startTime: string;
    endTime: string;
    status?: string;
    notes?: string;
  }): EmployeeShift {
    const employee = this.getEmployee(data.employeeId);
    if (!employee) {
      throw new AppError(404, 'Employee not found');
    }

    const startTime = new Date(`2000-01-01T${data.startTime}`);
    const endTime = new Date(`2000-01-01T${data.endTime}`);

    if (endTime <= startTime) {
      throw new AppError(400, 'End time must be after start time');
    }

    const workedHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);

    const stmt = this.db.prepare(`
      INSERT INTO employee_shifts (employee_id, shift_date, start_time, end_time, worked_hours, status, notes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);

    stmt.run(
      data.employeeId,
      data.shiftDate,
      data.startTime,
      data.endTime,
      workedHours,
      data.status || 'scheduled',
      data.notes || null
    );

    const shiftId = (this.db.prepare('SELECT last_insert_rowid() as id').get() as any).id;
    return this.getShift(shiftId) as EmployeeShift;
  }

  getShift(id: number): EmployeeShift | null {
    return this.db
      .prepare('SELECT * FROM employee_shifts WHERE id = ?')
      .get(id) as EmployeeShift | null;
  }

  getEmployeeShifts(employeeId: number, startDate?: string, endDate?: string): EmployeeShift[] {
    if (startDate && endDate) {
      return this.db
        .prepare('SELECT * FROM employee_shifts WHERE employee_id = ? AND shift_date BETWEEN ? AND ? ORDER BY shift_date DESC')
        .all(employeeId, startDate, endDate) as EmployeeShift[];
    }

    return this.db
      .prepare('SELECT * FROM employee_shifts WHERE employee_id = ? ORDER BY shift_date DESC')
      .all(employeeId) as EmployeeShift[];
  }

  updateShiftStatus(shiftId: number, status: string): EmployeeShift {
    if (!['scheduled', 'completed', 'absent'].includes(status)) {
      throw new AppError(400, 'Invalid shift status');
    }

    const shift = this.getShift(shiftId);
    if (!shift) {
      throw new AppError(404, 'Shift not found');
    }

    this.db.prepare('UPDATE employee_shifts SET status = ? WHERE id = ?').run(status, shiftId);
    return this.getShift(shiftId) as EmployeeShift;
  }

  // ============ ATTENDANCE ============

  recordAttendance(data: {
    employeeId: number;
    attendanceDate: string;
    present: number;
    notes?: string;
    recordedBy: number;
  }): EmployeeAttendance {
    const employee = this.getEmployee(data.employeeId);
    if (!employee) {
      throw new AppError(404, 'Employee not found');
    }

    const existing = this.db
      .prepare('SELECT id FROM employee_attendance WHERE employee_id = ? AND attendance_date = ?')
      .get(data.employeeId, data.attendanceDate);

    if (existing) {
      // Update existing record
      this.db
        .prepare('UPDATE employee_attendance SET present = ?, notes = ? WHERE employee_id = ? AND attendance_date = ?')
        .run(data.present, data.notes || null, data.employeeId, data.attendanceDate);

      return this.getAttendance(
        (existing as any).id
      ) as EmployeeAttendance;
    }

    const stmt = this.db.prepare(`
      INSERT INTO employee_attendance (employee_id, attendance_date, present, notes, recorded_by, created_at)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);

    stmt.run(
      data.employeeId,
      data.attendanceDate,
      data.present,
      data.notes || null,
      data.recordedBy
    );

    const attendanceId = (this.db.prepare('SELECT last_insert_rowid() as id').get() as any).id;
    return this.getAttendance(attendanceId) as EmployeeAttendance;
  }

  getAttendance(id: number): EmployeeAttendance | null {
    return this.db
      .prepare('SELECT * FROM employee_attendance WHERE id = ?')
      .get(id) as EmployeeAttendance | null;
  }

  getEmployeeAttendance(employeeId: number, startDate: string, endDate: string): EmployeeAttendance[] {
    return this.db
      .prepare('SELECT * FROM employee_attendance WHERE employee_id = ? AND attendance_date BETWEEN ? AND ? ORDER BY attendance_date DESC')
      .all(employeeId, startDate, endDate) as EmployeeAttendance[];
  }

  // ============ PAYROLL & PERFORMANCE ============

  calculatePayableAmount(employeeId: number, year: string, month: string): any {
    const employee = this.getEmployee(employeeId);
    if (!employee) {
      throw new AppError(404, 'Employee not found');
    }

    const monthKey = `${year}-${month}`;
    const monthStart = `${year}-${month}-01`;
    const monthEnd = `${year}-${month}-31`;

    // Get shifts
    const shifts = this.db
      .prepare('SELECT SUM(worked_hours) as total_hours FROM employee_shifts WHERE employee_id = ? AND shift_date BETWEEN ? AND ? AND status = "completed"')
      .get(employeeId, monthStart, monthEnd) as { total_hours: number | null };

    // Get attendance
    const attendance = this.db
      .prepare('SELECT COUNT(*) as days_present FROM employee_attendance WHERE employee_id = ? AND attendance_date BETWEEN ? AND ? AND present = 1')
      .get(employeeId, monthStart, monthEnd) as { days_present: number };

    // Get sales performance
    const sales = this.db
      .prepare('SELECT COALESCE(SUM(total_amount), 0) as total_sales FROM sales WHERE employee_id = ? AND sale_date BETWEEN ? AND ?')
      .get(employeeId, monthStart, monthEnd) as { total_sales: number };

    const baseSalary = employee.base_salary;
    const totalHours = shifts.total_hours || 0;
    const daysPresent = attendance.days_present;
    const totalSales = sales.total_sales;

    // Calculate commission if enabled
    let commissionAmount = 0;
    if (employee.enable_commission && employee.commission_percentage > 0) {
      commissionAmount = (totalSales * employee.commission_percentage) / 100;
    }

    const payableAmount = baseSalary + commissionAmount;

    return {
      month: monthKey,
      employee_id: employeeId,
      base_salary: baseSalary,
      total_hours: totalHours,
      days_present: daysPresent,
      total_sales: totalSales.toFixed(2),
      commission_enabled: employee.enable_commission,
      commission_percentage: employee.commission_percentage,
      commission_amount: commissionAmount.toFixed(2),
      payable_amount: payableAmount.toFixed(2),
    };
  }

  getEmployeeSalesPerformance(employeeId: number, startDate: string, endDate: string): any {
    const employee = this.getEmployee(employeeId);
    if (!employee) {
      throw new AppError(404, 'Employee not found');
    }

    const sales = this.db
      .prepare('SELECT COUNT(*) as transaction_count, SUM(total_amount) as total_sales FROM sales WHERE employee_id = ? AND sale_date BETWEEN ? AND ?')
      .get(employeeId, startDate, endDate) as { transaction_count: number; total_sales: number };

    const items = this.db
      .prepare('SELECT SUM(quantity) as total_items FROM sale_items si JOIN sales s ON si.sale_id = s.id WHERE s.employee_id = ? AND s.sale_date BETWEEN ? AND ?')
      .get(employeeId, startDate, endDate) as { total_items: number };

    return {
      period: { startDate, endDate },
      employee_id: employeeId,
      transaction_count: sales.transaction_count || 0,
      total_sales: (sales.total_sales || 0).toFixed(2),
      total_items_sold: items.total_items || 0,
      average_transaction: sales.transaction_count > 0 ? ((sales.total_sales || 0) / sales.transaction_count).toFixed(2) : 0,
    };
  }
}

export const employeeService = new EmployeeService();

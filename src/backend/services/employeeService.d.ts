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
export declare class EmployeeService {
    private db;
    createEmployee(data: {
        userId: number;
        name?: string;
        hireDate: string;
        baseSalary: number;
        enableCommission?: number;
        commissionPercentage?: number;
        phone?: string;
        address?: string;
    }): Employee;
    getEmployee(id: number): Employee | null;
    getEmployeeByUserId(userId: number): Employee | null;
    getAllEmployees(): Employee[];
    updateEmployee(id: number, data: {
        name?: string;
        baseSalary?: number;
        enableCommission?: number;
        commissionPercentage?: number;
        phone?: string;
        address?: string;
        status?: string;
    }): Employee;
    recordShift(data: {
        employeeId: number;
        shiftDate: string;
        startTime: string;
        endTime: string;
        status?: string;
        notes?: string;
    }): EmployeeShift;
    getShift(id: number): EmployeeShift | null;
    getEmployeeShifts(employeeId: number, startDate?: string, endDate?: string): EmployeeShift[];
    updateShiftStatus(shiftId: number, status: string): EmployeeShift;
    recordAttendance(data: {
        employeeId: number;
        attendanceDate: string;
        present: number;
        notes?: string;
        recordedBy: number;
    }): EmployeeAttendance;
    getAttendance(id: number): EmployeeAttendance | null;
    getEmployeeAttendance(employeeId: number, startDate: string, endDate: string): EmployeeAttendance[];
    calculatePayableAmount(employeeId: number, year: string, month: string): any;
    getEmployeeSalesPerformance(employeeId: number, startDate: string, endDate: string): any;
}
export declare const employeeService: EmployeeService;
//# sourceMappingURL=employeeService.d.ts.map
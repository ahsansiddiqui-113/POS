export interface User {
    id: number;
    username: string;
    email: string | null;
    role: string;
    active: number;
    created_at: string;
    updated_at: string;
}
export interface UserAuditLog {
    id: number;
    user_id: number;
    action: string;
    entity_type: string;
    entity_id: number;
    old_value: string | null;
    new_value: string | null;
    created_at: string;
    admin_id: number | null;
}
export declare class UserService {
    private db;
    getAllUsers(): User[];
    getUser(userId: number): User | null;
    updateUser(userId: number, data: {
        username?: string;
        email?: string;
        role?: string;
        active?: number;
    }, adminId: number): User;
    changePasswordAsAdmin(userId: number, newPassword: string, adminId: number): User;
    getUserAuditLogs(userId: number, limit?: number): UserAuditLog[];
    getAllAuditLogs(limit?: number): UserAuditLog[];
}
export declare const userService: UserService;
//# sourceMappingURL=userService.d.ts.map
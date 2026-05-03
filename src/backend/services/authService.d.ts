export interface LoginRequest {
    username: string;
    password: string;
}
export interface LoginResponse {
    token: string;
    user: {
        id: number;
        username: string;
        role: string;
    };
}
export interface User {
    id: number;
    username: string;
    email: string | null;
    role: string;
    active: number;
    created_at: string;
    updated_at: string;
}
export declare class AuthService {
    private db;
    login(request: LoginRequest): LoginResponse;
    getUser(userId: number): User | null;
    getAllUsers(): User[];
    createUser(data: {
        username: string;
        email?: string;
        password: string;
        role: string;
    }): User;
    updateUser(userId: number, data: {
        email?: string;
        role?: string;
        active?: number;
    }): User;
    changePassword(userId: number, oldPassword: string, newPassword: string): void;
}
export declare const authService: AuthService;
//# sourceMappingURL=authService.d.ts.map
import { Request, Response, NextFunction } from 'express';
declare global {
    namespace Express {
        interface Request {
            user?: {
                id: number;
                username: string;
                role: string;
            };
        }
    }
}
export interface JWTPayload {
    id: number;
    username: string;
    role: string;
    iat: number;
    exp: number;
}
export declare function generateToken(user: {
    id: number;
    username: string;
    role: string;
}): string;
export declare function verifyToken(token: string): JWTPayload;
export declare function authMiddleware(req: Request, res: Response, next: NextFunction): void;
export declare function requireRole(...allowedRoles: string[]): (req: Request, res: Response, next: NextFunction) => void;
export declare function requireAdmin(req: Request, res: Response, next: NextFunction): void;
//# sourceMappingURL=auth.d.ts.map
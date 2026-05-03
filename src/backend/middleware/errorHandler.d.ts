import { Request, Response, NextFunction } from 'express';
import { ValidationException } from '../utils/validators';
export declare class AppError extends Error {
    statusCode: number;
    details?: any;
    constructor(statusCode: number, message: string, details?: any);
}
export declare function errorHandler(error: Error | AppError | ValidationException, _req: Request, res: Response, _next: NextFunction): void;
export declare function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>): (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=errorHandler.d.ts.map
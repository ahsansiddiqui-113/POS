import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { ValidationException } from '../utils/validators';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function errorHandler(
  error: Error | AppError | ValidationException,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  logger.error('Error caught by handler:', error);

  if (error instanceof ValidationException) {
    res.status(400).json({
      error: 'Validation failed',
      details: error.errors,
    });
    return;
  }

  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      error: error.message,
      details: error.details,
    });
    return;
  }

  if (error instanceof SyntaxError) {
    res.status(400).json({
      error: 'Invalid request body',
    });
    return;
  }

  // Database errors
  if ((error as any).code === 'SQLITE_CONSTRAINT') {
    res.status(409).json({
      error: 'Duplicate entry or constraint violation',
      details: error.message,
    });
    return;
  }

  // Default error
  res.status(500).json({
    error: 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { details: error.message }),
  });
}

export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

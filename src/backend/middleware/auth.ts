import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';

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

// JWT_SECRET MUST be set in environment variables
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error(
    'FATAL ERROR: JWT_SECRET environment variable is not set!\n' +
    'Please set JWT_SECRET in your .env file before starting the application.\n' +
    'Example: JWT_SECRET=your-super-secret-key-here-change-in-production'
  );
}
const JWT_EXPIRY = '24h';

export function generateToken(user: {
  id: number;
  username: string;
  role: string;
}): string {
  return jwt.sign(user, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

export function verifyToken(token: string): JWTPayload {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}

export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Missing or invalid authorization header' });
      return;
    }

    const token = authHeader.substring(7);
    const payload = verifyToken(token);

    req.user = {
      id: payload.id,
      username: payload.username,
      role: payload.role,
    };

    next();
  } catch (error) {
    logger.error('Auth middleware error:', error);
    res.status(401).json({ error: 'Unauthorized' });
  }
}

export function requireRole(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      // Silent permission denial - user gets 403 response without cluttering logs
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    next();
  };
}

export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  requireRole('Admin')(req, res, next);
}

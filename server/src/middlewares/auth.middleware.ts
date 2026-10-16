import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { JwtAuthPayload } from '../types/auth.types.js';

// Extend Express Request interface to include authenticated user and tenantId
declare global {
  namespace Express {
    interface Request {
      user?: JwtAuthPayload;
      tenantId?: number;
    }
  }
}

/**
 * Middleware that authenticates requests using JWT access tokens
 */
export const authenticateJwt = (req: Request, _res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    const err = new Error('Authentication required. Missing Bearer token.') as Error & { statusCode?: number };
    err.statusCode = 401;
    return next(err);
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as JwtAuthPayload;
    req.user = decoded;
    req.tenantId = decoded.tenantId;
    next();
  } catch (jwtErr: any) {
    const isExpired = jwtErr.name === 'TokenExpiredError';
    const err = new Error(
      isExpired
        ? 'Access token has expired. Please refresh your token.'
        : 'Invalid access token. Please log in again.'
    ) as Error & { statusCode?: number; code?: string };
    err.statusCode = 401;
    err.code = isExpired ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN';
    return next(err);
  }
};

/**
 * Role-Based Access Control (RBAC) guard
 */
export const requireRoles = (...allowedRoles: string[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      const err = new Error('Authentication required.') as Error & { statusCode?: number };
      err.statusCode = 401;
      return next(err);
    }

    // super_admin always has access across roles
    if (req.user.role === 'super_admin' || allowedRoles.includes(req.user.role)) {
      return next();
    }

    const err = new Error(`Forbidden: Insufficient privileges. Required roles: ${allowedRoles.join(', ')}`) as Error & { statusCode?: number };
    err.statusCode = 403;
    return next(err);
  };
};

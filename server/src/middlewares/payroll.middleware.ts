import { Request, Response, NextFunction } from 'express';

// In-memory or env config flag for non-owner payroll access (default off)
export let ALLOW_STAFF_PAYROLL_ACCESS = false;

export const setStaffPayrollAccessFlag = (enabled: boolean) => {
  ALLOW_STAFF_PAYROLL_ACCESS = enabled;
};

/**
 * Middleware ensuring user has payroll module access:
 * - gym_owner / super_admin: full access
 * - staff / manager: access only if enabled by gym_owner
 * - trainer: denied (403 Forbidden)
 */
export const requirePayrollAccess = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    const err = new Error('Authentication required.') as Error & { statusCode?: number };
    err.statusCode = 401;
    return next(err);
  }

  const role = req.user.role;

  if (role === 'gym_owner' || role === 'super_admin') {
    return next();
  }

  if (role === 'trainer') {
    const err = new Error('Access denied. Trainers do not have access to payroll financial data.') as Error & { statusCode?: number };
    err.statusCode = 403;
    return next(err);
  }

  if (ALLOW_STAFF_PAYROLL_ACCESS) {
    return next();
  }

  const err = new Error(
    'Access denied. Payroll access for non-owner staff is currently disabled by the gym owner.'
  ) as Error & { statusCode?: number };
  err.statusCode = 403;
  return next(err);
};

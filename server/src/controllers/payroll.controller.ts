import { Request, Response, NextFunction } from 'express';
import { PayrollService } from '../services/payroll.service.js';
import { ApiResponse } from '../utils/apiResponse.js';

export class PayrollController {
  private static getTenantId(req: Request): number {
    const tenantId = req.user?.tenantId || (req as any).tenantId;
    if (!tenantId || typeof tenantId !== 'number') {
      const err = new Error('Unauthorized: Valid tenant session required.') as Error & { statusCode?: number };
      err.statusCode = 401;
      throw err;
    }
    return tenantId;
  }

  private static getUserId(req: Request): bigint {
    const uId = req.user?.userId;
    if (!uId) {
      return BigInt(1);
    }
    return BigInt(uId);
  }

  // ================================================================
  // ATTENDANCE
  // ================================================================

  static async getDailyAttendance(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = PayrollController.getTenantId(req);
      const date = (req.query.date as string) || new Date().toISOString().split('T')[0];
      const data = await PayrollService.getDailyAttendance(tenantId, date);
      res.status(200).json(ApiResponse.success(data, 'Daily attendance retrieved successfully'));
    } catch (err) {
      next(err);
    }
  }

  static async saveAttendance(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = PayrollController.getTenantId(req);
      const userId = PayrollController.getUserId(req);
      const result = await PayrollService.saveAttendance(tenantId, userId, req.body);
      res.status(200).json(ApiResponse.success(result, 'Attendance saved successfully'));
    } catch (err) {
      next(err);
    }
  }

  static async getMonthlyAttendance(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = PayrollController.getTenantId(req);
      const now = new Date();
      const defaultMonth = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
      const month = (req.query.month as string) || defaultMonth;
      const data = await PayrollService.getMonthlyAttendance(tenantId, month);
      res.status(200).json(ApiResponse.success(data, 'Monthly attendance grid retrieved successfully'));
    } catch (err) {
      next(err);
    }
  }

  // ================================================================
  // ADVANCES
  // ================================================================

  static async getAdvances(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = PayrollController.getTenantId(req);
      const { staffId, status, from, to } = req.query;
      const data = await PayrollService.getAdvances(tenantId, {
        staffId: staffId as string,
        status: status as string,
        from: from as string,
        to: to as string,
      });
      res.status(200).json(ApiResponse.success(data, 'Advances retrieved successfully'));
    } catch (err) {
      next(err);
    }
  }

  static async getStaffLedger(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = PayrollController.getTenantId(req);
      const { staffId } = req.params;
      const data = await PayrollService.getStaffLedger(tenantId, staffId);
      res.status(200).json(ApiResponse.success(data, 'Staff advance ledger retrieved successfully'));
    } catch (err) {
      next(err);
    }
  }

  static async createAdvance(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = PayrollController.getTenantId(req);
      const userId = PayrollController.getUserId(req);
      const data = await PayrollService.createAdvance(tenantId, userId, req.body);
      res.status(201).json(ApiResponse.success(data, 'Salary advance recorded successfully', 201));
    } catch (err) {
      next(err);
    }
  }

  static async recordRepayment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = PayrollController.getTenantId(req);
      const userId = PayrollController.getUserId(req);
      const { advanceId } = req.params;
      const data = await PayrollService.recordRepayment(tenantId, userId, advanceId, req.body);
      res.status(201).json(ApiResponse.success(data, 'Repayment recorded successfully', 201));
    } catch (err) {
      next(err);
    }
  }

  static async cancelAdvance(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = PayrollController.getTenantId(req);
      const userId = PayrollController.getUserId(req);
      const { advanceId } = req.params;
      const data = await PayrollService.cancelAdvance(tenantId, userId, advanceId);
      res.status(200).json(ApiResponse.success(data, 'Advance cancelled successfully'));
    } catch (err) {
      next(err);
    }
  }

  // ================================================================
  // SALARIES
  // ================================================================

  static async getSalaries(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = PayrollController.getTenantId(req);
      const now = new Date();
      const defaultMonth = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
      const month = (req.query.month as string) || defaultMonth;
      const data = await PayrollService.getSalaries(tenantId, month);
      res.status(200).json(ApiResponse.success(data, 'Salaries retrieved successfully'));
    } catch (err) {
      next(err);
    }
  }

  static async getSalaryPreview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = PayrollController.getTenantId(req);
      const now = new Date();
      const defaultMonth = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
      const month = (req.query.month as string) || defaultMonth;
      const data = await PayrollService.getSalaryPreview(tenantId, month);
      res.status(200).json(ApiResponse.success(data, 'Salary preview calculated successfully'));
    } catch (err) {
      next(err);
    }
  }

  static async generateSalaries(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = PayrollController.getTenantId(req);
      const userId = PayrollController.getUserId(req);
      const data = await PayrollService.generateSalaries(tenantId, userId, req.body);
      res.status(201).json(ApiResponse.success(data, 'Salary slips generated as draft', 201));
    } catch (err) {
      next(err);
    }
  }

  static async finalizeSlip(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = PayrollController.getTenantId(req);
      const userId = PayrollController.getUserId(req);
      const { slipId } = req.params;
      const data = await PayrollService.finalizeSlip(tenantId, userId, slipId);
      res.status(200).json(ApiResponse.success(data, 'Salary slip finalized and locked'));
    } catch (err) {
      next(err);
    }
  }

  static async finalizeBulk(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = PayrollController.getTenantId(req);
      const userId = PayrollController.getUserId(req);
      const { slipIds } = req.body;
      if (!Array.isArray(slipIds) || slipIds.length === 0) {
        const err = new Error('slipIds array is required.') as Error & { statusCode?: number };
        err.statusCode = 400;
        throw err;
      }
      const data = await PayrollService.finalizeBulk(tenantId, userId, slipIds);
      res.status(200).json(ApiResponse.success(data, 'Salary slips bulk finalized'));
    } catch (err) {
      next(err);
    }
  }

  static async recordSalaryPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = PayrollController.getTenantId(req);
      const userId = PayrollController.getUserId(req);
      const { slipId } = req.params;
      const data = await PayrollService.recordSalaryPayment(tenantId, userId, slipId, req.body);
      res.status(201).json(ApiResponse.success(data, 'Salary payment recorded successfully', 201));
    } catch (err) {
      next(err);
    }
  }

  static async getSlipDetail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = PayrollController.getTenantId(req);
      const { slipId } = req.params;
      const data = await PayrollService.getSlipDetail(tenantId, slipId);
      res.status(200).json(ApiResponse.success(data, 'Salary slip detail retrieved successfully'));
    } catch (err) {
      next(err);
    }
  }

  static async cancelSlip(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = PayrollController.getTenantId(req);
      const userId = PayrollController.getUserId(req);
      const { slipId } = req.params;
      const data = await PayrollService.cancelSlip(tenantId, userId, slipId);
      res.status(200).json(ApiResponse.success(data, 'Salary slip cancelled successfully'));
    } catch (err) {
      next(err);
    }
  }
}

import { Request, Response, NextFunction } from 'express';
import { ExpensesService } from '../services/expenses.service.js';
import { ApiResponse } from '../utils/apiResponse.js';

export class ExpensesController {
  private static getTenantId(req: Request): number {
    const tenantId = (req as any).user?.tenantId || (req as any).tenantId;
    if (!tenantId || typeof tenantId !== 'number') {
      const err = new Error('Unauthorized: Valid tenant session required.') as Error & { statusCode?: number };
      err.statusCode = 401;
      throw err;
    }
    return tenantId;
  }

  private static getUserId(req: Request): bigint {
    const userId = (req as any).user?.userId || (req as any).user?.id;
    if (!userId) {
      const err = new Error('Unauthorized: Valid user session required.') as Error & { statusCode?: number };
      err.statusCode = 401;
      throw err;
    }
    return BigInt(userId);
  }

  // =========================================================================
  // EXPENSES
  // =========================================================================

  static async getExpenses(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = ExpensesController.getTenantId(req);
      const filters = {
        expenseTypeId: req.query.expenseTypeId as string | undefined,
        paymentMode: req.query.paymentMode as string | undefined,
        startDate: req.query.startDate as string | undefined,
        endDate: req.query.endDate as string | undefined,
        search: req.query.search as string | undefined,
        source: req.query.source as 'ALL' | 'MANUAL' | 'SALARY' | undefined,
      };

      const data = await ExpensesService.getExpenses(tenantId, filters);
      res.status(200).json(ApiResponse.success(data, 'Expenses retrieved successfully'));
    } catch (err) {
      next(err);
    }
  }

  static async getExpenseById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = ExpensesController.getTenantId(req);
      const { id } = req.params;
      const data = await ExpensesService.getExpenseById(tenantId, id);
      res.status(200).json(ApiResponse.success(data, 'Expense details retrieved'));
    } catch (err) {
      next(err);
    }
  }

  static async createExpense(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = ExpensesController.getTenantId(req);
      const userId = ExpensesController.getUserId(req);
      const data = await ExpensesService.createExpense(tenantId, userId, req.body);
      res.status(201).json(ApiResponse.success(data, 'Expense recorded successfully', 201));
    } catch (err) {
      next(err);
    }
  }

  static async updateExpense(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = ExpensesController.getTenantId(req);
      const { id } = req.params;
      const data = await ExpensesService.updateExpense(tenantId, id, req.body);
      res.status(200).json(ApiResponse.success(data, 'Expense updated successfully'));
    } catch (err) {
      next(err);
    }
  }

  static async deleteExpense(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = ExpensesController.getTenantId(req);
      const { id } = req.params;
      await ExpensesService.deleteExpense(tenantId, id);
      res.status(200).json(ApiResponse.success(null, 'Expense deleted and ledger reconciled successfully'));
    } catch (err) {
      next(err);
    }
  }

  static async getExpenseSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = ExpensesController.getTenantId(req);
      const startDate = req.query.startDate as string | undefined;
      const endDate = req.query.endDate as string | undefined;

      const data = await ExpensesService.getExpenseSummary(tenantId, startDate, endDate);
      res.status(200).json(ApiResponse.success(data, 'Expense summary retrieved successfully'));
    } catch (err) {
      next(err);
    }
  }

  // =========================================================================
  // EXPENSE TYPES
  // =========================================================================

  static async getExpenseTypes(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = ExpensesController.getTenantId(req);
      const data = await ExpensesService.getExpenseTypes(tenantId);
      res.status(200).json(ApiResponse.success(data, 'Expense types retrieved successfully'));
    } catch (err) {
      next(err);
    }
  }

  static async createExpenseType(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = ExpensesController.getTenantId(req);
      const data = await ExpensesService.createExpenseType(tenantId, req.body);
      res.status(201).json(ApiResponse.success(data, 'Expense type created successfully', 201));
    } catch (err) {
      next(err);
    }
  }

  static async updateExpenseType(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = ExpensesController.getTenantId(req);
      const { id } = req.params;
      const data = await ExpensesService.updateExpenseType(tenantId, id, req.body);
      res.status(200).json(ApiResponse.success(data, 'Expense type updated successfully'));
    } catch (err) {
      next(err);
    }
  }

  static async toggleExpenseTypeStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = ExpensesController.getTenantId(req);
      const { id } = req.params;
      const data = await ExpensesService.toggleExpenseTypeStatus(tenantId, id);
      res.status(200).json(ApiResponse.success(data, 'Expense type status updated'));
    } catch (err) {
      next(err);
    }
  }

  static async deleteExpenseType(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = ExpensesController.getTenantId(req);
      const { id } = req.params;
      await ExpensesService.deleteExpenseType(tenantId, id);
      res.status(200).json(ApiResponse.success(null, 'Expense type deleted successfully'));
    } catch (err) {
      next(err);
    }
  }
}

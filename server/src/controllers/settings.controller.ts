import { Request, Response, NextFunction } from 'express';
import { SettingsService } from '../services/settings.service.js';
import { ApiResponse } from '../utils/apiResponse.js';

export class SettingsController {
  private static getTenantId(req: Request): number {
    const tenantId = (req as any).user?.tenantId || (req as any).tenantId;
    if (!tenantId || typeof tenantId !== 'number') {
      const err = new Error('Unauthorized: Valid tenant session required.') as Error & { statusCode?: number };
      err.statusCode = 401;
      throw err;
    }
    return tenantId;
  }

  // --- Bank Accounts ---

  static async getBankAccounts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = SettingsController.getTenantId(req);
      const data = await SettingsService.getBankAccounts(tenantId);
      res.status(200).json(ApiResponse.success(data, 'Bank accounts retrieved successfully'));
    } catch (err) {
      next(err);
    }
  }

  static async createBankAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = SettingsController.getTenantId(req);
      const data = await SettingsService.createBankAccount(req.body, tenantId);
      res.status(201).json(ApiResponse.success(data, 'Bank account created successfully', 201));
    } catch (err) {
      next(err);
    }
  }

  static async updateBankAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = SettingsController.getTenantId(req);
      const { id } = req.params;
      const data = await SettingsService.updateBankAccount(id, req.body, tenantId);
      res.status(200).json(ApiResponse.success(data, 'Bank account updated successfully'));
    } catch (err) {
      next(err);
    }
  }

  static async toggleBankAccountStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = SettingsController.getTenantId(req);
      const { id } = req.params;
      const data = await SettingsService.toggleBankAccountStatus(id, tenantId);
      res.status(200).json(ApiResponse.success(data, 'Bank account status updated'));
    } catch (err) {
      next(err);
    }
  }

  static async setPrimaryBankAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = SettingsController.getTenantId(req);
      const { id } = req.params;
      const data = await SettingsService.setPrimaryBankAccount(id, tenantId);
      res.status(200).json(ApiResponse.success(data, 'Primary bank account updated'));
    } catch (err) {
      next(err);
    }
  }

  static async deleteBankAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = SettingsController.getTenantId(req);
      const { id } = req.params;
      await SettingsService.deleteBankAccount(id, tenantId);
      res.status(200).json(ApiResponse.success(null, 'Bank account deleted'));
    } catch (err) {
      next(err);
    }
  }

  // --- Fee / Plan Types ---

  static async getPlanTypes(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = SettingsController.getTenantId(req);
      const data = await SettingsService.getPlanTypes(tenantId);
      res.status(200).json(ApiResponse.success(data, 'Plan types retrieved successfully'));
    } catch (err) {
      next(err);
    }
  }

  static async createPlanType(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = SettingsController.getTenantId(req);
      const data = await SettingsService.createPlanType(req.body, tenantId);
      res.status(201).json(ApiResponse.success(data, 'Plan type created successfully', 201));
    } catch (err) {
      next(err);
    }
  }

  static async updatePlanType(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = SettingsController.getTenantId(req);
      const { id } = req.params;
      const data = await SettingsService.updatePlanType(id, req.body, tenantId);
      res.status(200).json(ApiResponse.success(data, 'Plan type updated successfully'));
    } catch (err) {
      next(err);
    }
  }

  static async togglePlanTypeStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = SettingsController.getTenantId(req);
      const { id } = req.params;
      const data = await SettingsService.togglePlanTypeStatus(id, tenantId);
      res.status(200).json(ApiResponse.success(data, 'Plan type status updated'));
    } catch (err) {
      next(err);
    }
  }

  static async deletePlanType(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = SettingsController.getTenantId(req);
      const { id } = req.params;
      await SettingsService.deletePlanType(id, tenantId);
      res.status(200).json(ApiResponse.success(null, 'Plan type deleted'));
    } catch (err) {
      next(err);
    }
  }

  // --- Payment Types ---

  static async getPaymentTypes(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await SettingsService.getPaymentTypes();
      res.status(200).json(ApiResponse.success(data, 'Payment types retrieved successfully'));
    } catch (err) {
      next(err);
    }
  }

  static async addPaymentType(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name } = req.body;
      const data = await SettingsService.addPaymentType(name || 'Custom');
      res.status(201).json(ApiResponse.success(data, 'Payment type added', 201));
    } catch (err) {
      next(err);
    }
  }

  static async togglePaymentTypeStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const data = await SettingsService.togglePaymentTypeStatus(id);
      res.status(200).json(ApiResponse.success(data, 'Payment type status updated'));
    } catch (err) {
      next(err);
    }
  }
}

import { Request, Response, NextFunction } from 'express';
import { AdminService } from '../services/admin.service.js';
import { ApiResponse } from '../utils/apiResponse.js';

export class AdminController {
  /**
   * Suggests tenant prefix, username, and strong password based on gym name
   * GET /api/admin/tenants/suggest?gymName=...
   */
  static async suggestCredentials(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const gymName = (req.query.gymName as string) || '';
      const city = (req.query.city as string) || '';
      const ownerName = (req.query.ownerName as string) || '';
      const randomize = req.query.randomize === 'true' || req.query.random === 'true';

      const suggestions = await AdminService.suggestTenantCredentials(gymName, city, ownerName, randomize);
      res.status(200).json(ApiResponse.success(suggestions, 'Tenant credentials suggested successfully'));
    } catch (err) {
      next(err);
    }
  }

  /**
   * Lists all tenants across the platform (paginated, filtered, searchable)
   * GET /api/admin/tenants
   */
  static async getTenants(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await AdminService.getTenants(req.query);
      res.status(200).json(
        ApiResponse.success(
          {
            tenants: result.tenants,
            total: result.total,
            page: result.page,
            limit: result.limit,
            totalPages: result.totalPages,
          },
          'Tenants retrieved successfully'
        )
      );
    } catch (err) {
      next(err);
    }
  }

  /**
   * Creates a tenant organization and gym_owner login atomically
   * POST /api/admin/tenants
   */
  static async createTenant(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const created = await AdminService.createTenant(req.body);
      res.status(201).json(ApiResponse.success(created, 'Tenant created successfully', 201));
    } catch (err) {
      next(err);
    }
  }

  /**
   * Toggles or sets a tenant status (active, suspended, etc.)
   * PATCH /api/admin/tenants/:id/status
   */
  static async updateTenantStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = parseInt(req.params.id, 10);
      if (isNaN(tenantId)) {
        const err = new Error('Invalid tenant ID.') as Error & { statusCode?: number };
        err.statusCode = 400;
        throw err;
      }
      const updated = await AdminService.toggleTenantStatus(tenantId, req.body?.status);
      res.status(200).json(ApiResponse.success(updated, `Tenant status updated to '${updated.status}'`));
    } catch (err) {
      next(err);
    }
  }
}

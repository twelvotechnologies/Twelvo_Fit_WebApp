import { Request, Response, NextFunction } from 'express';
import { TrainerService } from '../services/trainer.service.js';
import { ApiResponse } from '../utils/apiResponse.js';

export class TrainerController {
  /**
   * Helper to ensure tenantId is present from authenticated JWT
   */
  private static getTenantId(req: Request): number {
    const tenantId = req.user?.tenantId || req.tenantId;
    if (!tenantId) {
      const err = new Error('Authentication required: Missing tenant context in token.') as Error & { statusCode?: number };
      err.statusCode = 401;
      throw err;
    }
    return Number(tenantId);
  }

  /**
   * GET /api/v1/trainers
   * Lists all trainers for the authenticated gym (from JWT tenantId)
   */
  static async getTrainers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = TrainerController.getTenantId(req);
      const trainers = await TrainerService.getTrainers(tenantId, req.query as any);
      res.status(200).json(ApiResponse.success(trainers, 'Trainers retrieved successfully'));
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/trainers/stats
   * Summary metrics for trainers in this gym
   */
  static async getStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = TrainerController.getTenantId(req);
      const stats = await TrainerService.getTrainerStats(tenantId);
      res.status(200).json(ApiResponse.success(stats, 'Trainer stats retrieved'));
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/trainers/:id
   * Retrieves single trainer details
   */
  static async getTrainerById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = TrainerController.getTenantId(req);
      const trainer = await TrainerService.getTrainerById(tenantId, req.params.id);
      res.status(200).json(ApiResponse.success(trainer, 'Trainer details retrieved'));
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/trainers
   * Creates a new trainer in the authenticated gym (from JWT tenantId)
   */
  static async createTrainer(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = TrainerController.getTenantId(req);
      const created = await TrainerService.createTrainer(tenantId, req.body);
      res.status(201).json(ApiResponse.success(created, 'Trainer added successfully', 201));
    } catch (err) {
      next(err);
    }
  }

  /**
   * PUT /api/v1/trainers/:id
   * Updates trainer profile
   */
  static async updateTrainer(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = TrainerController.getTenantId(req);
      const updated = await TrainerService.updateTrainer(tenantId, req.params.id, req.body);
      res.status(200).json(ApiResponse.success(updated, 'Trainer updated successfully'));
    } catch (err) {
      next(err);
    }
  }

  /**
   * DELETE /api/v1/trainers/:id
   * Deactivates trainer
   */
  static async deleteTrainer(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = TrainerController.getTenantId(req);
      await TrainerService.deleteTrainer(tenantId, req.params.id);
      res.status(200).json(ApiResponse.success(null, 'Trainer removed successfully'));
    } catch (err) {
      next(err);
    }
  }
}

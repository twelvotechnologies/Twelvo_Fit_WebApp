import { Request, Response, NextFunction } from 'express';
import { HealthService } from '../services/health.service.js';
import { ApiResponse } from '../utils/apiResponse.js';

export const getHealth = (_req: Request, res: Response, next: NextFunction): void => {
  try {
    const health = HealthService.getHealthStatus('express');
    res.status(200).json(ApiResponse.success(health, 'Express server is healthy'));
  } catch (error) {
    next(error);
  }
};

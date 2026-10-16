import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service.js';
import { ApiResponse } from '../utils/apiResponse.js';

export class AuthController {
  /**
   * User login (gym owner, trainer, staff)
   * POST /api/auth/login or /api/v1/auth/login
   */
  static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await AuthService.login(req.body);
      res.status(200).json(ApiResponse.success(result, 'Login successful'));
    } catch (err) {
      next(err);
    }
  }

  /**
   * Refresh JWT access token using valid refresh token
   * POST /api/auth/refresh or /api/v1/auth/refresh
   */
  static async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const refreshToken = req.body?.refreshToken || (req.headers['x-refresh-token'] as string);
      const result = await AuthService.refreshToken(refreshToken);
      res.status(200).json(ApiResponse.success(result, 'Token refreshed successfully'));
    } catch (err) {
      next(err);
    }
  }

  /**
   * Retrieves profile of current authenticated user
   * GET /api/auth/me or /api/v1/auth/me
   */
  static async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.userId) {
        res.status(401).json(ApiResponse.error('Unauthenticated', 401));
        return;
      }
      const user = await AuthService.getMe(req.user.userId);
      res.status(200).json(ApiResponse.success(user, 'User profile retrieved'));
    } catch (err) {
      next(err);
    }
  }

  /**
   * Logout user
   * POST /api/auth/logout or /api/v1/auth/logout
   */
  static async logout(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.status(200).json(ApiResponse.success(null, 'Logged out successfully'));
    } catch (err) {
      next(err);
    }
  }
}

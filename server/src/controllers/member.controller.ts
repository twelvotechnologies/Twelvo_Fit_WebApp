import { Request, Response, NextFunction } from 'express';
import { MemberService } from '../services/member.service.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { CreateMemberDTO, UpdateMemberDTO } from '../types/member.types.js';

export class MemberController {
  private static getTenantId(req: Request): number {
    const tenantId = (req as any).user?.tenantId || (req as any).tenantId;
    if (!tenantId || typeof tenantId !== 'number') {
      const err = new Error('Unauthorized: Valid tenant session required.') as Error & { statusCode?: number };
      err.statusCode = 401;
      throw err;
    }
    return tenantId;
  }

  static async getAllMembers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = MemberController.getTenantId(req);
      const { status, search, planId, trainerId, page, limit } = req.query as {
        status?: string;
        search?: string;
        planId?: string;
        trainerId?: string;
        page?: string;
        limit?: string;
      };

      const members = await MemberService.getAllMembers(tenantId, {
        status,
        search,
        planId,
        trainerId,
        page: page ? parseInt(page, 10) : undefined,
        limit: limit ? parseInt(limit, 10) : undefined,
      });

      res.status(200).json(ApiResponse.success(members, 'Members retrieved successfully'));
    } catch (error) {
      next(error);
    }
  }

  static async getMemberStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = MemberController.getTenantId(req);
      const stats = await MemberService.getMemberStats(tenantId);
      res.status(200).json(ApiResponse.success(stats, 'Member statistics retrieved successfully'));
    } catch (error) {
      next(error);
    }
  }

  static async getMemberById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = MemberController.getTenantId(req);
      const { id } = req.params;
      const member = await MemberService.getMemberById(tenantId, id);
      res.status(200).json(ApiResponse.success(member, 'Member retrieved successfully'));
    } catch (error) {
      next(error);
    }
  }

  static async createMember(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = MemberController.getTenantId(req);
      const user = (req as any).user;
      const body = req.body as CreateMemberDTO;

      const newMember = await MemberService.createMember(
        tenantId,
        body,
        user?.userId,
        user?.role || 'gym_owner'
      );

      res.status(201).json(ApiResponse.success(newMember, 'Member registered successfully', 201));
    } catch (error) {
      next(error);
    }
  }

  static async updateMember(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = MemberController.getTenantId(req);
      const { id } = req.params;
      const body = req.body as UpdateMemberDTO;
      const updated = await MemberService.updateMember(tenantId, id, body);
      res.status(200).json(ApiResponse.success(updated, 'Member updated successfully'));
    } catch (error) {
      next(error);
    }
  }

  static async deleteMember(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = MemberController.getTenantId(req);
      const { id } = req.params;
      const deleted = await MemberService.deleteMember(tenantId, id);
      res.status(200).json(ApiResponse.success(deleted, 'Member deleted successfully'));
    } catch (error) {
      next(error);
    }
  }
}

// Export controller function bindings for backward-compatible route syntax
export const getAllMembers = MemberController.getAllMembers;
export const getMemberStats = MemberController.getMemberStats;
export const getMemberById = MemberController.getMemberById;
export const createMember = MemberController.createMember;
export const updateMember = MemberController.updateMember;
export const deleteMember = MemberController.deleteMember;

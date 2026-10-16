import { Request, Response, NextFunction } from 'express';
import { ReceiptService } from '../services/receipt.service.js';
import { ApiResponse } from '../utils/apiResponse.js';
import {
  CreateReceiptDTO,
  ApproveReceiptDTO,
  RejectReceiptDTO,
} from '../types/receipt.types.js';

export class ReceiptController {
  private static getTenantId(req: Request): number {
    const tenantId = (req as any).user?.tenantId || (req as any).tenantId;
    if (!tenantId || typeof tenantId !== 'number') {
      const err = new Error('Unauthorized: Valid tenant session required.') as Error & { statusCode?: number };
      err.statusCode = 401;
      throw err;
    }
    return tenantId;
  }

  static async getAllReceipts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = ReceiptController.getTenantId(req);
      const { status, paymentMode, search, memberId, startDate, endDate, page, limit } = req.query as {
        status?: string;
        paymentMode?: string;
        search?: string;
        memberId?: string;
        startDate?: string;
        endDate?: string;
        page?: string;
        limit?: string;
      };

      const receipts = await ReceiptService.getAllReceipts(tenantId, {
        status,
        paymentMode,
        search,
        memberId,
        startDate,
        endDate,
        page: page ? parseInt(page, 10) : undefined,
        limit: limit ? parseInt(limit, 10) : undefined,
      });

      res.status(200).json(ApiResponse.success(receipts, 'Receipts retrieved successfully'));
    } catch (error) {
      next(error);
    }
  }

  static async getReceiptStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = ReceiptController.getTenantId(req);
      const stats = await ReceiptService.getReceiptStats(tenantId);
      res.status(200).json(ApiResponse.success(stats, 'Receipt statistics retrieved successfully'));
    } catch (error) {
      next(error);
    }
  }

  static async getReceiptById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = ReceiptController.getTenantId(req);
      const { id } = req.params;
      const receipt = await ReceiptService.getReceiptById(tenantId, id);
      res.status(200).json(ApiResponse.success(receipt, 'Receipt details retrieved successfully'));
    } catch (error) {
      next(error);
    }
  }

  static async createReceipt(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = ReceiptController.getTenantId(req);
      const user = (req as any).user;
      const body = req.body as CreateReceiptDTO;

      const newReceipt = await ReceiptService.createReceipt(
        tenantId,
        user?.userId || '1',
        user?.role || 'gym_owner',
        body
      );

      res.status(201).json(ApiResponse.success(newReceipt, 'Receipt created successfully', 201));
    } catch (error) {
      next(error);
    }
  }

  static async approveReceipt(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = ReceiptController.getTenantId(req);
      const user = (req as any).user;
      const { id } = req.params;
      const body = req.body as ApproveReceiptDTO;

      const approved = await ReceiptService.approveReceipt(
        tenantId,
        id,
        user?.userId || '1',
        body
      );

      res.status(200).json(ApiResponse.success(approved, 'Receipt approved successfully'));
    } catch (error) {
      next(error);
    }
  }

  static async rejectReceipt(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = ReceiptController.getTenantId(req);
      const user = (req as any).user;
      const { id } = req.params;
      const body = req.body as RejectReceiptDTO;

      const rejected = await ReceiptService.rejectReceipt(
        tenantId,
        id,
        user?.userId || '1',
        body
      );

      res.status(200).json(ApiResponse.success(rejected, 'Receipt rejected successfully'));
    } catch (error) {
      next(error);
    }
  }
}

export const getAllReceipts = ReceiptController.getAllReceipts;
export const getReceiptStats = ReceiptController.getReceiptStats;
export const getReceiptById = ReceiptController.getReceiptById;
export const createReceipt = ReceiptController.createReceipt;
export const approveReceipt = ReceiptController.approveReceipt;
export const rejectReceipt = ReceiptController.rejectReceipt;

import { prisma } from '../config/prisma.js';
import {
  ReceiptListItem,
  CreateReceiptDTO,
  ApproveReceiptDTO,
  RejectReceiptDTO,
  ReceiptFilterDTO,
  ReceiptStatsResponse,
  PaymentMode,
} from '../types/receipt.types.js';

export class ReceiptService {
  /**
   * Helper to normalize payment mode string into DB-compliant uppercase enum
   */
  private static sanitizePaymentMode(rawMode?: string): string {
    const m = (rawMode || 'UPI').trim().toUpperCase();
    if (['CASH', 'UPI', 'BANK', 'CARD', 'CHEQUE'].includes(m)) return m;
    if (m.includes('BANK')) return 'BANK';
    if (m.includes('CARD')) return 'CARD';
    if (m.includes('CASH')) return 'CASH';
    return 'UPI';
  }

  /**
   * Transforms raw Prisma entity into frontend ReceiptListItem
   */
  private static formatReceipt(r: any): ReceiptListItem {
    const idStr = r.receiptId.toString();
    const code = r.receiptCode || `RC-${idStr}`;
    const paymentDateStr = r.paymentDate
      ? new Date(r.paymentDate).toISOString().split('T')[0]
      : new Date(r.createdAt).toISOString().split('T')[0];

    let approvalStatus: 'approved' | 'pending_approval' | 'rejected' | 'cancelled' = 'approved';
    if (r.approvalStatus === 1) approvalStatus = 'pending_approval';
    else if (r.approvalStatus === 2) approvalStatus = 'approved';
    else if (r.approvalStatus === 3) approvalStatus = 'rejected';
    else if (r.approvalStatus === 4) approvalStatus = 'cancelled';

    const rawMode = r.paymentMode as string;
    let uiPaymentMode: PaymentMode = 'UPI';
    if (rawMode === 'BANK') uiPaymentMode = 'Bank Transfer';
    else if (rawMode === 'CARD') uiPaymentMode = 'Card';
    else if (rawMode === 'CASH') uiPaymentMode = 'Cash';
    else uiPaymentMode = 'UPI';

    const planName = r.plan?.planName || 'Gym Membership';
    const memberName = r.member?.fullName || 'Unknown Member';
    const memberPhone = r.member?.phone || '';

    return {
      id: idStr,
      receiptId: idStr,
      receiptNo: code,
      receiptCode: code,
      tenantId: r.tenantId,
      memberId: r.memberId.toString(),
      memberName,
      memberPhone,
      planId: r.planId ? r.planId.toString() : null,
      planName,
      plan: planName,
      planCategory: r.plan?.planCategory || 'Regular',
      planDurationUnit: r.plan?.durationUnit || 'Months',
      planDurationValue: r.plan?.durationValue || 1,
      paymentFor: r.paymentFor || 'FEES',
      amount: Number(r.amount),
      tax: Number(r.taxAmount || 0),
      taxAmount: Number(r.taxAmount || 0),
      total: Number(r.totalAmount),
      totalAmount: Number(r.totalAmount),
      paymentDate: paymentDateStr,
      paymentMode: uiPaymentMode,
      bankAccountId: r.bankAccountId ? r.bankAccountId.toString() : null,
      bankAccountName: r.bankAccount?.accountName || null,
      upiIdId: r.upiIdId ? r.upiIdId.toString() : null,
      upiHandle: r.upiId?.upiHandle || null,
      referenceNo: r.referenceNo || `TXN-${idStr}`,
      status: 'PAID',
      approvalStatus,
      approvalStatusCode: r.approvalStatus,
      submittedBy: r.submittedBy.toString(),
      submittedByName: r.submittedByUser?.fullName || r.submittedByUser?.username || 'Staff Admin',
      submittedRole: (r.submittedRole || 'admin') as any,
      submittedOn: r.createdAt ? new Date(r.createdAt).toLocaleString('en-IN') : '',
      lastActionBy: r.lastActionBy ? r.lastActionBy.toString() : null,
      lastActionNote: r.lastActionNote || null,
      rejectionReason: r.approvalStatus === 3 ? r.lastActionNote || undefined : undefined,
      createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString(),
    };
  }

  /**
   * Advances a member's nextDueDate when a fee/plan receipt is accepted
   */
  private static async advanceMemberDueDate(
    tenantId: number,
    memberId: bigint,
    planId?: bigint | null
  ): Promise<void> {
    try {
      const member = await prisma.member.findUnique({
        where: { memberId },
        include: { currentPlan: true },
      });

      if (!member) return;

      let durationValue = 1;
      let durationUnit = 'Months';

      if (planId) {
        const plan = await prisma.plansCatalog.findUnique({ where: { planId } });
        if (plan) {
          durationValue = plan.durationValue || 1;
          durationUnit = plan.durationUnit || 'Months';
        }
      } else if (member.currentPlan) {
        durationValue = member.currentPlan.durationValue || 1;
        durationUnit = member.currentPlan.durationUnit || 'Months';
      }

      // Base date: existing nextDueDate if in future, else today
      const now = new Date();
      now.setHours(0, 0, 0, 0);

      let baseDate = new Date();
      if (member.nextDueDate && new Date(member.nextDueDate).getTime() > now.getTime()) {
        baseDate = new Date(member.nextDueDate);
      }

      if (durationUnit === 'Days') {
        baseDate.setDate(baseDate.getDate() + durationValue);
      } else if (durationUnit === 'Years') {
        baseDate.setFullYear(baseDate.getFullYear() + durationValue);
      } else {
        baseDate.setMonth(baseDate.getMonth() + durationValue);
      }

      await prisma.member.update({
        where: { memberId },
        data: {
          nextDueDate: baseDate,
          status: 'ACTIVE',
        },
      });
    } catch (err) {
      console.warn('Could not advance member due date for receipt:', err);
    }
  }

  /**
   * Retrieves all receipts for the gym tenant with filtering
   */
  static async getAllReceipts(tenantId: number, filters: ReceiptFilterDTO = {}): Promise<ReceiptListItem[]> {
    const where: any = {
      tenantId,
      isDeleted: false,
    };

    if (filters.status && filters.status !== 'all' && filters.status !== 'ALL') {
      const s = filters.status.toLowerCase();
      if (s === 'approved') where.approvalStatus = 2;
      else if (s === 'pending' || s === 'pending_approval') where.approvalStatus = 1;
      else if (s === 'rejected') where.approvalStatus = 3;
      else if (s === 'cancelled') where.approvalStatus = 4;
    }

    if (filters.paymentMode && filters.paymentMode !== 'ALL') {
      where.paymentMode = this.sanitizePaymentMode(filters.paymentMode);
    }

    if (filters.memberId) {
      try {
        where.memberId = BigInt(filters.memberId);
      } catch {
        // Ignore unparseable ID
      }
    }

    if (filters.startDate || filters.endDate) {
      where.paymentDate = {};
      if (filters.startDate) where.paymentDate.gte = new Date(filters.startDate);
      if (filters.endDate) where.paymentDate.lte = new Date(filters.endDate);
    }

    if (filters.search && filters.search.trim()) {
      const q = filters.search.trim();
      where.OR = [
        { receiptCode: { contains: q, mode: 'insensitive' } },
        { referenceNo: { contains: q, mode: 'insensitive' } },
        { member: { fullName: { contains: q, mode: 'insensitive' } } },
        { member: { phone: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const receipts = await prisma.receipt.findMany({
      where,
      include: {
        member: true,
        plan: true,
        bankAccount: true,
        upiId: true,
        submittedByUser: true,
      },
      orderBy: [{ paymentDate: 'desc' }, { createdAt: 'desc' }],
      take: filters.limit || 500,
      skip: filters.page && filters.limit ? (filters.page - 1) * filters.limit : undefined,
    });

    return receipts.map(this.formatReceipt);
  }

  /**
   * Returns revenue and receipt approval KPI counters
   */
  static async getReceiptStats(tenantId: number): Promise<ReceiptStatsResponse> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [monthAgg, todayAgg, pendingCount, totalCount] = await Promise.all([
      // Total collected this month (Approved only)
      prisma.receipt.aggregate({
        where: {
          tenantId,
          isDeleted: false,
          approvalStatus: 2,
          paymentDate: { gte: startOfMonth },
        },
        _sum: { totalAmount: true },
      }),

      // Today collected (Approved only)
      prisma.receipt.aggregate({
        where: {
          tenantId,
          isDeleted: false,
          approvalStatus: 2,
          paymentDate: { gte: todayStart },
        },
        _sum: { totalAmount: true },
      }),

      // Pending trainer submissions
      prisma.receipt.count({
        where: {
          tenantId,
          isDeleted: false,
          approvalStatus: 1,
        },
      }),

      // Total approved receipts
      prisma.receipt.count({
        where: {
          tenantId,
          isDeleted: false,
          approvalStatus: 2,
        },
      }),
    ]);

    return {
      totalCollectedThisMonth: monthAgg._sum.totalAmount ? Number(monthAgg._sum.totalAmount) : 0,
      todayCollected: todayAgg._sum.totalAmount ? Number(todayAgg._sum.totalAmount) : 0,
      pendingApprovalCount: pendingCount,
      totalReceiptsCount: totalCount,
    };
  }

  /**
   * Retrieves single receipt by ID with approval audit history
   */
  static async getReceiptById(tenantId: number, receiptId: string): Promise<ReceiptListItem & { history?: any[] }> {
    let whereCondition: any;
    try {
      whereCondition = { receiptId: BigInt(receiptId) };
    } catch {
      whereCondition = { receiptCode: receiptId };
    }

    const receipt = await prisma.receipt.findFirst({
      where: {
        ...whereCondition,
        tenantId,
        isDeleted: false,
      },
      include: {
        member: true,
        plan: true,
        bankAccount: true,
        upiId: true,
        submittedByUser: true,
        approvalHistory: {
          include: { actionByUser: true },
          orderBy: { actionAt: 'asc' },
        },
      },
    });

    if (!receipt) {
      const err = new Error(`Receipt #${receiptId} not found in this gym.`) as Error & { statusCode?: number };
      err.statusCode = 404;
      throw err;
    }

    const formatted = this.formatReceipt(receipt);
    return {
      ...formatted,
      history: (receipt as any).approvalHistory || [],
    };
  }

  /**
   * Creates a new receipt
   * Auto-approves for gym owners; queues for approval for trainers
   */
  static async createReceipt(
    tenantId: number,
    userId: string,
    userRole: string,
    data: CreateReceiptDTO
  ): Promise<ReceiptListItem> {
    if (!data.memberId && !data.memberName) {
      const err = new Error('Member identifier or name is required.') as Error & { statusCode?: number };
      err.statusCode = 400;
      throw err;
    }

    if (!data.amount || data.amount <= 0) {
      const err = new Error('Payment amount must be greater than zero.') as Error & { statusCode?: number };
      err.statusCode = 400;
      throw err;
    }

    // 1. Fetch tenant for code prefix
    const tenant = await prisma.tenant.findUnique({
      where: { tenantId },
      select: { tenantId: true, tenantPrefix: true },
    });

    if (!tenant) {
      const err = new Error('Gym tenant not found.') as Error & { statusCode?: number };
      err.statusCode = 404;
      throw err;
    }

    // 2. Resolve member
    let memberId: bigint;
    try {
      memberId = BigInt(data.memberId);
    } catch {
      const found = await prisma.member.findFirst({
        where: {
          tenantId,
          isDeleted: false,
          OR: [
            { memberCode: String(data.memberId) },
            { fullName: { equals: String(data.memberName || data.memberId), mode: 'insensitive' } },
          ],
        },
      });
      if (!found) {
        const err = new Error('Could not find existing member for this receipt.') as Error & { statusCode?: number };
        err.statusCode = 404;
        throw err;
      }
      memberId = found.memberId;
    }

    // 3. Resolve plan
    let planId: bigint | null = null;
    if (data.planId) {
      try {
        planId = BigInt(data.planId);
      } catch {
        // Fall through
      }
    }

    if (!planId && data.plan) {
      const foundPlan = await prisma.plansCatalog.findFirst({
        where: { tenantId, planName: { equals: data.plan.trim(), mode: 'insensitive' }, isDeleted: false },
      });
      if (foundPlan) planId = foundPlan.planId;
    }

    // 4. Generate unique receipt code (e.g. TWRC1001)
    const totalCount = await prisma.receipt.count({ where: { tenantId } });
    const prefix = tenant.tenantPrefix || 'GYM';
    const receiptCode = `${prefix}RC${1001 + totalCount}`;

    // 5. Determine approval status:
    // If submitter is gym_owner or admin: 2 (Accepted)
    // If trainer: 1 (Pending approval, requiring admin verification)
    const isTrainer = userRole === 'trainer';
    const approvalStatus = isTrainer ? 1 : 2;

    const amount = Number(data.amount);
    const taxAmount = Number(data.taxAmount || 0);
    const totalAmount = amount + taxAmount;
    const paymentMode = this.sanitizePaymentMode(data.paymentMode);
    const paymentDate = data.paymentDate ? new Date(data.paymentDate) : new Date();

    const submitterUserId = BigInt(userId);

    // 6. Insert receipt
    const newReceipt = await prisma.receipt.create({
      data: {
        tenantId,
        receiptCode,
        memberId,
        planId,
        paymentFor: data.paymentFor || 'FEES',
        amount,
        taxAmount,
        totalAmount,
        paymentDate,
        paymentMode,
        referenceNo: data.referenceNo || `TXN-${Date.now().toString().slice(-8)}`,
        approvalStatus,
        submittedBy: submitterUserId,
        submittedRole: isTrainer ? 'trainer' : 'gym_owner',
        lastActionBy: !isTrainer ? submitterUserId : null,
        lastActionNote: !isTrainer ? 'Auto-accepted on submission' : null,
      },
      include: {
        member: true,
        plan: true,
        bankAccount: true,
        upiId: true,
        submittedByUser: true,
      },
    });

    // 7. If accepted, advance the member's next due date
    if (approvalStatus === 2) {
      await this.advanceMemberDueDate(tenantId, memberId, planId);
    }

    return this.formatReceipt(newReceipt);
  }

  /**
   * Approves a pending receipt submission
   */
  static async approveReceipt(
    tenantId: number,
    receiptId: string,
    actionByUserId: string,
    data: ApproveReceiptDTO = {}
  ): Promise<ReceiptListItem> {
    const existing = await this.getReceiptById(tenantId, receiptId);
    const id = BigInt(existing.receiptId);

    const updated = await prisma.receipt.update({
      where: { receiptId: id },
      data: {
        approvalStatus: 2, // Accepted
        lastActionBy: BigInt(actionByUserId),
        lastActionNote: data.actionNote || 'Approved by gym owner',
      },
      include: {
        member: true,
        plan: true,
        bankAccount: true,
        upiId: true,
        submittedByUser: true,
      },
    });

    // Advance member next due date
    await this.advanceMemberDueDate(tenantId, updated.memberId, updated.planId);

    return this.formatReceipt(updated);
  }

  /**
   * Rejects a pending receipt submission
   */
  static async rejectReceipt(
    tenantId: number,
    receiptId: string,
    actionByUserId: string,
    data: RejectReceiptDTO
  ): Promise<ReceiptListItem> {
    if (!data.reason || !data.reason.trim()) {
      const err = new Error('A rejection reason is mandatory.') as Error & { statusCode?: number };
      err.statusCode = 400;
      throw err;
    }

    const existing = await this.getReceiptById(tenantId, receiptId);
    const id = BigInt(existing.receiptId);

    const updated = await prisma.receipt.update({
      where: { receiptId: id },
      data: {
        approvalStatus: 3, // Rejected
        lastActionBy: BigInt(actionByUserId),
        lastActionNote: data.reason.trim(),
      },
      include: {
        member: true,
        plan: true,
        bankAccount: true,
        upiId: true,
        submittedByUser: true,
      },
    });

    return this.formatReceipt(updated);
  }
}

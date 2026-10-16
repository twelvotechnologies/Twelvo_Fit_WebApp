import { prisma } from '../config/prisma.js';
import {
  IMember,
  CreateMemberDTO,
  UpdateMemberDTO,
  MemberFilterDTO,
  MemberStatsResponse,
} from '../types/member.types.js';

export class MemberService {
  /**
   * Formats raw Prisma Member entity into the rich IMember shape
   */
  private static formatMember(m: any): IMember {
    const idStr = m.memberId.toString();
    const joinedAt = m.joiningDate ? new Date(m.joiningDate).toISOString().split('T')[0] : new Date(m.createdAt).toISOString().split('T')[0];
    const nextDueDateStr = m.nextDueDate
      ? new Date(m.nextDueDate).toISOString().split('T')[0]
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Compute days remaining to next due date
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const dueDate = new Date(nextDueDateStr);
    dueDate.setHours(0, 0, 0, 0);
    const diffTime = dueDate.getTime() - now.getTime();
    const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    let paymentStatus: 'PAID_UP' | 'DUE_SOON' | 'OVERDUE' = 'PAID_UP';
    if (daysRemaining < 0) {
      paymentStatus = 'OVERDUE';
    } else if (daysRemaining <= 7) {
      paymentStatus = 'DUE_SOON';
    }

    const planName = m.currentPlan?.planName || 'Standard Regular';
    const planCategory = m.currentPlan?.planCategory || 'Regular';
    const trainerName = m.assignedTrainer?.fullName || null;

    return {
      id: idStr,
      memberId: idStr,
      memberCode: m.memberCode || `MB-${idStr}`,
      tenantId: m.tenantId,
      fullName: m.fullName,
      name: m.fullName,
      email: m.email || '',
      phone: m.phone || '',
      photoUrl: m.photoUrl || null,
      photo: m.photoUrl || null,
      emergencyContactName: m.emergencyContactName || null,
      emergencyContactPhone: m.emergencyContactPhone || null,
      joiningDate: joinedAt,
      joinedAt,
      assignedTrainerId: m.assignedTrainerId ? m.assignedTrainerId.toString() : null,
      assignedTrainerName: trainerName,
      assignedTrainer: trainerName || 'Unassigned',
      currentPlanId: m.currentPlanId ? m.currentPlanId.toString() : null,
      planId: m.currentPlanId ? m.currentPlanId.toString() : null,
      planName,
      planCategory,
      membershipPlan: planName,
      feeAmountAtSignup: m.feeAmountAtSignup ? Number(m.feeAmountAtSignup) : null,
      nextDueDate: nextDueDateStr,
      expiresAt: nextDueDateStr,
      expiryDate: nextDueDateStr,
      isEstimatedDueDate: Boolean(m.isEstimatedDueDate),
      daysRemaining,
      status: m.status || 'ACTIVE',
      isActiveDot: m.status === 'ACTIVE',
      paymentStatus,
      onboardedVia: m.onboardedVia || 'admin',
      pathType: (m.onboardedVia === 'existing' ? 'EXISTING' : 'NEW') as 'NEW' | 'EXISTING',
      createdAt: m.createdAt ? new Date(m.createdAt).toISOString() : undefined,
      updatedAt: m.updatedAt ? new Date(m.updatedAt).toISOString() : undefined,
    };
  }

  /**
   * Fetches all members strictly isolated by tenantId
   */
  static async getAllMembers(tenantId: number, filters: MemberFilterDTO = {}): Promise<IMember[]> {
    const where: any = {
      tenantId,
      isDeleted: false,
    };

    if (filters.status && filters.status !== 'ALL') {
      where.status = filters.status.toUpperCase();
    }

    if (filters.planId && filters.planId !== 'ALL') {
      try {
        where.currentPlanId = BigInt(filters.planId);
      } catch {
        // Ignore unparseable plan ID
      }
    }

    if (filters.trainerId && filters.trainerId !== 'ALL') {
      try {
        where.assignedTrainerId = BigInt(filters.trainerId);
      } catch {
        // Ignore unparseable trainer ID
      }
    }

    if (filters.search && filters.search.trim()) {
      const q = filters.search.trim();
      where.OR = [
        { fullName: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q, mode: 'insensitive' } },
        { memberCode: { contains: q, mode: 'insensitive' } },
      ];
    }

    const members = await prisma.member.findMany({
      where,
      include: {
        currentPlan: true,
        assignedTrainer: true,
      },
      orderBy: { createdAt: 'desc' },
      take: filters.limit || 500,
      skip: filters.page && filters.limit ? (filters.page - 1) * filters.limit : undefined,
    });

    return members.map(this.formatMember);
  }

  /**
   * Returns dashboard KPI summary counts for gym members
   */
  static async getMemberStats(tenantId: number): Promise<MemberStatsResponse> {
    const totalMembers = await prisma.member.count({
      where: { tenantId, isDeleted: false },
    });

    const activeMembers = await prisma.member.count({
      where: { tenantId, isDeleted: false, status: 'ACTIVE' },
    });

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const sevenDaysFromNow = new Date(now);
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    const expiringSoon = await prisma.member.count({
      where: {
        tenantId,
        isDeleted: false,
        status: 'ACTIVE',
        nextDueDate: {
          gte: now,
          lte: sevenDaysFromNow,
        },
      },
    });

    const overdue = await prisma.member.count({
      where: {
        tenantId,
        isDeleted: false,
        status: 'ACTIVE',
        nextDueDate: {
          lt: now,
        },
      },
    });

    // Total fees recorded in accepted receipts
    const receiptsSum = await prisma.receipt.aggregate({
      where: {
        tenantId,
        isDeleted: false,
        approvalStatus: 2, // Accepted
      },
      _sum: {
        totalAmount: true,
      },
    });

    const totalRevenue = receiptsSum._sum.totalAmount ? Number(receiptsSum._sum.totalAmount) : 0;

    return {
      totalMembers,
      activeMembers,
      expiringSoon,
      overdue,
      totalRevenue,
    };
  }

  /**
   * Fetches single member by ID or memberCode with their recent payment receipts
   */
  static async getMemberById(tenantId: number, id: string): Promise<IMember & { recentReceipts?: any[] }> {
    let whereCondition: any;
    try {
      whereCondition = { memberId: BigInt(id) };
    } catch {
      whereCondition = { memberCode: id };
    }

    const member = await prisma.member.findFirst({
      where: {
        ...whereCondition,
        tenantId,
        isDeleted: false,
      },
      include: {
        currentPlan: true,
        assignedTrainer: true,
        receipts: {
          where: { isDeleted: false },
          orderBy: { paymentDate: 'desc' },
          take: 10,
        },
      },
    });

    if (!member) {
      const err = new Error(`Member with id '${id}' not found in this gym.`) as Error & { statusCode?: number };
      err.statusCode = 404;
      throw err;
    }

    const formatted = this.formatMember(member);
    return {
      ...formatted,
      recentReceipts: (member as any).receipts || [],
    };
  }

  /**
   * Creates a new member with auto-generated code and optional immediate payment receipt
   */
  static async createMember(
    tenantId: number,
    data: CreateMemberDTO,
    submittedByUserId?: string,
    submittedRole = 'gym_owner'
  ): Promise<IMember> {
    const fullName = (data.fullName || data.name || '').trim();
    const phone = (data.phone || '').trim();

    if (!fullName || !phone) {
      const err = new Error('Full name and phone number are required.') as Error & { statusCode?: number };
      err.statusCode = 400;
      throw err;
    }

    // 1. Fetch tenant to get prefix for code generation
    const tenant = await prisma.tenant.findUnique({
      where: { tenantId },
      select: { tenantId: true, tenantPrefix: true },
    });

    if (!tenant) {
      const err = new Error('Gym tenant not found.') as Error & { statusCode?: number };
      err.statusCode = 404;
      throw err;
    }

    // 2. Generate unique member code (e.g. TWMS1001)
    const totalCount = await prisma.member.count({ where: { tenantId } });
    const prefix = tenant.tenantPrefix || 'GYM';
    const memberCode = `${prefix}MS${1001 + totalCount}`;

    // 3. Resolve plan
    let currentPlanId: bigint | null = null;
    let planDurationMonths = 1;
    let standardFee = 0;

    const requestedPlanId = data.currentPlanId || data.planId;
    if (requestedPlanId) {
      try {
        const foundPlan = await prisma.plansCatalog.findFirst({
          where: { planId: BigInt(requestedPlanId), tenantId, isDeleted: false },
        });
        if (foundPlan) {
          currentPlanId = foundPlan.planId;
          planDurationMonths = foundPlan.durationUnit === 'Years' ? foundPlan.durationValue * 12 : foundPlan.durationValue;
          standardFee = Number(foundPlan.standardFee);
        }
      } catch {
        // Fall through
      }
    }

    // Fallback: match by planName
    if (!currentPlanId && (data.planName || data.membershipPlan)) {
      const name = (data.planName || data.membershipPlan || '').trim();
      const foundPlan = await prisma.plansCatalog.findFirst({
        where: { tenantId, planName: { equals: name, mode: 'insensitive' }, isDeleted: false },
      });
      if (foundPlan) {
        currentPlanId = foundPlan.planId;
        planDurationMonths = foundPlan.durationUnit === 'Years' ? foundPlan.durationValue * 12 : foundPlan.durationValue;
        standardFee = Number(foundPlan.standardFee);
      }
    }

    // 4. Resolve assigned trainer
    let assignedTrainerId: bigint | null = null;
    const requestedTrainer = data.assignedTrainerId || data.assignedTrainer;
    if (requestedTrainer) {
      try {
        const trainer = await prisma.staff.findFirst({
          where: {
            tenantId,
            isDeleted: false,
            OR: [
              { staffId: BigInt(requestedTrainer) },
              { fullName: { equals: String(requestedTrainer), mode: 'insensitive' } },
            ],
          },
        });
        if (trainer) assignedTrainerId = trainer.staffId;
      } catch {
        // Trainer could not be resolved, keep null
      }
    }

    // 5. Calculate next due date
    let nextDueDate: Date;
    if (data.nextDueDate || data.expiresAt) {
      nextDueDate = new Date((data.nextDueDate || data.expiresAt)!);
    } else {
      nextDueDate = new Date();
      nextDueDate.setMonth(nextDueDate.getMonth() + (planDurationMonths || 1));
    }

    const joiningDate = data.joiningDate ? new Date(data.joiningDate) : new Date();

    // 6. Create Member in DB
    const newMember = await prisma.member.create({
      data: {
        tenantId,
        memberCode,
        fullName,
        email: data.email ? data.email.trim().toLowerCase() : null,
        phone,
        photoUrl: data.photoUrl || data.photo || null,
        emergencyContactName: data.emergencyContactName || null,
        emergencyContactPhone: data.emergencyContactPhone || null,
        joiningDate,
        assignedTrainerId,
        currentPlanId,
        planStartDate: joiningDate,
        feeAmountAtSignup: data.feeAmountAtSignup !== undefined ? data.feeAmountAtSignup : standardFee,
        nextDueDate,
        isEstimatedDueDate: Boolean(data.isEstimatedDueDate),
        status: (data.status || 'ACTIVE').toUpperCase(),
        onboardedVia: data.pathType === 'EXISTING' ? 'existing' : (data.onboardedVia || 'admin'),
      },
      include: {
        currentPlan: true,
        assignedTrainer: true,
      },
    });

    // 7. If recordPaymentNow is enabled, create initial Receipt atomically
    if (data.recordPaymentNow && data.paymentDetails && data.paymentDetails.amount > 0) {
      try {
        const payment = data.paymentDetails;
        const totalReceiptCount = await prisma.receipt.count({ where: { tenantId } });
        const receiptCode = `${prefix}RC${1001 + totalReceiptCount}`;

        // Resolve userId for submission
        let submitterUserId: bigint;
        if (submittedByUserId) {
          submitterUserId = BigInt(submittedByUserId);
        } else {
          const ownerUser = await prisma.user.findFirst({
            where: { tenantId, role: 'gym_owner', isDeleted: false },
          });
          submitterUserId = ownerUser?.userId || BigInt(1);
        }

        const rawMode = payment.paymentMode.toUpperCase();
        let validPaymentMode = 'UPI';
        if (['CASH', 'UPI', 'BANK', 'CARD', 'CHEQUE'].includes(rawMode)) {
          validPaymentMode = rawMode;
        } else if (rawMode.includes('BANK')) {
          validPaymentMode = 'BANK';
        } else if (rawMode.includes('CASH')) {
          validPaymentMode = 'CASH';
        } else if (rawMode.includes('CARD')) {
          validPaymentMode = 'CARD';
        }

        const isTrainer = submittedRole === 'trainer';
        const approvalStatus = isTrainer ? 1 : 2; // 1 = Pending, 2 = Accepted

        await prisma.receipt.create({
          data: {
            tenantId,
            receiptCode,
            memberId: newMember.memberId,
            planId: currentPlanId,
            paymentFor: 'REGISTRATION',
            amount: payment.amount,
            taxAmount: 0,
            totalAmount: payment.amount,
            paymentDate: payment.paymentDate ? new Date(payment.paymentDate) : new Date(),
            paymentMode: validPaymentMode,
            referenceNo: payment.referenceNo || `REG-${Date.now().toString().slice(-6)}`,
            approvalStatus,
            submittedBy: submitterUserId,
            submittedRole: isTrainer ? 'trainer' : 'gym_owner',
            lastActionBy: !isTrainer ? submitterUserId : null,
            lastActionNote: !isTrainer ? 'Auto-accepted on member signup' : null,
          },
        });
      } catch (receiptErr) {
        console.warn('Could not auto-create signup receipt:', receiptErr);
      }
    }

    return this.formatMember(newMember);
  }

  /**
   * Updates an existing member profile
   */
  static async updateMember(tenantId: number, id: string, data: UpdateMemberDTO): Promise<IMember> {
    const existing = await this.getMemberById(tenantId, id);
    const memberId = BigInt(existing.id);

    const updateData: any = {};
    if (data.fullName || data.name) updateData.fullName = (data.fullName || data.name)!.trim();
    if (data.email !== undefined) updateData.email = data.email ? data.email.trim().toLowerCase() : null;
    if (data.phone !== undefined) updateData.phone = data.phone.trim();
    if (data.photoUrl !== undefined) updateData.photoUrl = data.photoUrl;
    if (data.emergencyContactName !== undefined) updateData.emergencyContactName = data.emergencyContactName;
    if (data.emergencyContactPhone !== undefined) updateData.emergencyContactPhone = data.emergencyContactPhone;
    if (data.feeAmountAtSignup !== undefined) updateData.feeAmountAtSignup = data.feeAmountAtSignup;
    if (data.isEstimatedDueDate !== undefined) updateData.isEstimatedDueDate = data.isEstimatedDueDate;
    if (data.status !== undefined) updateData.status = data.status.toUpperCase();

    if (data.nextDueDate || data.expiresAt) {
      updateData.nextDueDate = new Date((data.nextDueDate || data.expiresAt)!);
    }

    if (data.currentPlanId !== undefined) {
      updateData.currentPlanId = data.currentPlanId ? BigInt(data.currentPlanId) : null;
    }

    if (data.assignedTrainerId !== undefined) {
      updateData.assignedTrainerId = data.assignedTrainerId ? BigInt(data.assignedTrainerId) : null;
    }

    const updated = await prisma.member.update({
      where: { memberId },
      data: updateData,
      include: {
        currentPlan: true,
        assignedTrainer: true,
      },
    });

    return this.formatMember(updated);
  }

  /**
   * Soft-deletes a member
   */
  static async deleteMember(tenantId: number, id: string): Promise<IMember> {
    const existing = await this.getMemberById(tenantId, id);
    const memberId = BigInt(existing.id);

    const deleted = await prisma.member.update({
      where: { memberId },
      data: { isDeleted: true },
      include: {
        currentPlan: true,
        assignedTrainer: true,
      },
    });

    return this.formatMember(deleted);
  }
}

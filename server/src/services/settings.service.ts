import { prisma } from '../config/prisma.js';
import {
  BankAccountItem,
  CreateBankAccountDTO,
  UpdateBankAccountDTO,
  PlanTypeItem,
  CreatePlanTypeDTO,
  UpdatePlanTypeDTO,
  PaymentTypeItem,
  DurationUnit,
  UpiIdItem,
} from '../types/settings.types.js';

export class SettingsService {
  /**
   * Helper to resolve active tenant ID
   */
  private static async getTenantId(explicitTenantId?: number): Promise<number> {
    if (explicitTenantId) return explicitTenantId;

    const firstTenant = await prisma.tenant.findFirst({
      where: { isDeleted: false },
      orderBy: { tenantId: 'asc' },
    });

    if (firstTenant) return firstTenant.tenantId;

    // Create default tenant if none exists yet
    const created = await prisma.tenant.create({
      data: {
        tenantCode: 'GYM0001',
        tenantPrefix: 'TW',
        gymName: 'Twelvo Gym & Fitness',
        email: 'admin@twelvogym.com',
        phoneNumber: '+91 9876543210',
      },
    });
    return created.tenantId;
  }

  private static computeDisplayDuration(val: number, unit: DurationUnit): string {
    if (unit === 'One-time') return 'One-time';
    if (val === 1) {
      return `1 ${unit.slice(0, -1)}`;
    }
    return `${val} ${unit}`;
  }

  // =========================================================================
  // SECTION 1: BANK ACCOUNTS & UPI IDS
  // =========================================================================

  private static formatBankAccount(b: any): BankAccountItem {
    const primaryUpi = b.upiIds && b.upiIds.length > 0
      ? (b.upiIds.find((u: any) => u.isPrimary && !u.isDeleted) || b.upiIds.find((u: any) => !u.isDeleted) || b.upiIds[0])
      : null;

    return {
      id: b.bankAccountId.toString(),
      bankAccountId: b.bankAccountId.toString(),
      tenantId: b.tenantId,
      bankName: b.bankName,
      accountName: b.accountName,
      accountHolderName: b.accountHolderName || '',
      accountNumber: b.accountNumber || '',
      ifscCode: b.ifscCode || '',
      branchName: b.branchName || '',
      upiHandle: primaryUpi ? primaryUpi.upiHandle : undefined,
      upiId: primaryUpi ? (primaryUpi.upiIdId ?? primaryUpi.upiId)?.toString() : undefined,
      balanceType: b.balanceType,
      openingBalanceAmount: Number(b.openingBalanceAmount || 0),
      openingBalance: Number(b.openingBalance || 0),
      currentBalance: Number(b.currentBalance || 0),
      isPrimary: b.isPrimary,
      isActive: b.isActive,
      createdAt: b.createdAt ? new Date(b.createdAt).toISOString() : undefined,
    };
  }

  static async getBankAccounts(tenantId?: number): Promise<BankAccountItem[]> {
    const tid = await this.getTenantId(tenantId);

    let accounts = await prisma.bankAccount.findMany({
      where: {
        tenantId: tid,
        isDeleted: false,
      },
      include: {
        upiIds: { where: { isDeleted: false } },
      },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
    });

    // If no bank accounts exist yet for this tenant, seed initial default bank account
    if (accounts.length === 0) {
      const tenant = await prisma.tenant.findUnique({
        where: { tenantId: tid },
        select: { gymName: true },
      });
      const gymName = tenant?.gymName || 'Twelvo Gym & Fitness';

      const defaultBank = await prisma.bankAccount.create({
        data: {
          tenantId: tid,
          accountName: 'HDFC Current A/C',
          bankName: 'HDFC Bank',
          accountHolderName: gymName.toUpperCase(),
          accountNumber: '50200012345678',
          ifscCode: 'HDFC0001234',
          branchName: 'Koramangala 4th Block',
          balanceType: 1,
          openingBalanceAmount: 25000,
          isPrimary: true,
          isActive: true,
        },
      });

      // Also create an associated primary UPI ID
      await prisma.upiId.create({
        data: {
          tenantId: tid,
          bankAccountId: defaultBank.bankAccountId,
          upiLabel: 'HDFC Primary UPI',
          upiHandle: `${gymName.toLowerCase().replace(/[^a-z0-9]/g, '')}@hdfcbank`,
          isPrimary: true,
          isActive: true,
        },
      });

      accounts = await prisma.bankAccount.findMany({
        where: { tenantId: tid, isDeleted: false },
        include: { upiIds: { where: { isDeleted: false } } },
        orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
      });
    }

    return accounts.map(this.formatBankAccount);
  }

  static async createBankAccount(
    data: CreateBankAccountDTO,
    tenantId?: number
  ): Promise<BankAccountItem> {
    const tid = await this.getTenantId(tenantId || data.tenantId);

    if (data.isPrimary) {
      await prisma.bankAccount.updateMany({
        where: { tenantId: tid, isPrimary: true },
        data: { isPrimary: false },
      });
      await prisma.upiId.updateMany({
        where: { tenantId: tid, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    const created = await prisma.bankAccount.create({
      data: {
        tenantId: tid,
        accountName: data.accountName || `${data.bankName} Account`,
        bankName: data.bankName.trim(),
        accountHolderName: data.accountHolderName.trim(),
        accountNumber: data.accountNumber.trim(),
        ifscCode: data.ifscCode.trim().toUpperCase(),
        branchName: data.branchName?.trim() || 'Main Branch',
        balanceType: data.balanceType || 1,
        openingBalanceAmount: data.openingBalanceAmount ? Number(data.openingBalanceAmount) : 0,
        isPrimary: !!data.isPrimary,
        isActive: true,
      },
    });

    if (data.upiHandle && data.upiHandle.trim()) {
      const handle = data.upiHandle.trim().toLowerCase();
      const existingUpi = await prisma.upiId.findFirst({
        where: { tenantId: tid, upiHandle: handle },
      });

      if (existingUpi) {
        await prisma.upiId.update({
          where: { upiIdId: existingUpi.upiIdId },
          data: {
            bankAccountId: created.bankAccountId,
            upiLabel: `${data.bankName.trim()} UPI`,
            isPrimary: !!data.isPrimary,
            isActive: true,
            isDeleted: false,
          },
        });
      } else {
        await prisma.upiId.create({
          data: {
            tenantId: tid,
            bankAccountId: created.bankAccountId,
            upiLabel: `${data.bankName.trim()} UPI`,
            upiHandle: handle,
            isPrimary: !!data.isPrimary,
            isActive: true,
          },
        });
      }
    }

    const fullRecord = await prisma.bankAccount.findUnique({
      where: { bankAccountId: created.bankAccountId },
      include: { upiIds: { where: { isDeleted: false } } },
    });

    return this.formatBankAccount(fullRecord || created);
  }

  static async updateBankAccount(
    id: string,
    data: UpdateBankAccountDTO,
    tenantId?: number
  ): Promise<BankAccountItem> {
    const bankAccountId = BigInt(id);
    const whereCondition: any = { bankAccountId, isDeleted: false };
    if (tenantId) whereCondition.tenantId = tenantId;

    const existing = await prisma.bankAccount.findFirst({
      where: whereCondition,
    });
    if (!existing) {
      const err = new Error(`Bank account '${id}' not found in this gym`) as Error & { statusCode?: number };
      err.statusCode = 404;
      throw err;
    }

    if (data.isPrimary) {
      await prisma.bankAccount.updateMany({
        where: { tenantId: existing.tenantId, isPrimary: true },
        data: { isPrimary: false },
      });
      await prisma.upiId.updateMany({
        where: { tenantId: existing.tenantId, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    const updatePayload: any = {};
    if (data.bankName !== undefined) updatePayload.bankName = data.bankName.trim();
    if (data.accountName !== undefined) updatePayload.accountName = data.accountName.trim();
    if (data.accountHolderName !== undefined) updatePayload.accountHolderName = data.accountHolderName.trim();
    if (data.accountNumber !== undefined) updatePayload.accountNumber = data.accountNumber.trim();
    if (data.ifscCode !== undefined) updatePayload.ifscCode = data.ifscCode.trim().toUpperCase();
    if (data.branchName !== undefined) updatePayload.branchName = data.branchName.trim();
    if (data.balanceType !== undefined) updatePayload.balanceType = data.balanceType;
    if (data.isPrimary !== undefined) updatePayload.isPrimary = data.isPrimary;
    if (data.isActive !== undefined) updatePayload.isActive = data.isActive;

    await prisma.bankAccount.update({
      where: { bankAccountId },
      data: updatePayload,
    });

    if (data.upiHandle !== undefined) {
      const handle = data.upiHandle.trim().toLowerCase();
      if (handle) {
        const existingUpi = await prisma.upiId.findFirst({
          where: { tenantId: existing.tenantId, upiHandle: handle },
        });

        if (existingUpi) {
          await prisma.upiId.update({
            where: { upiIdId: existingUpi.upiIdId },
            data: {
              bankAccountId,
              upiLabel: `${data.bankName || existing.bankName} UPI`,
              isPrimary: data.isPrimary ?? existing.isPrimary,
              isActive: true,
              isDeleted: false,
            },
          });
        } else {
          const currentAccountUpi = await prisma.upiId.findFirst({
            where: { bankAccountId, isDeleted: false },
          });

          if (currentAccountUpi) {
            await prisma.upiId.update({
              where: { upiIdId: currentAccountUpi.upiIdId },
              data: {
                upiHandle: handle,
                upiLabel: `${data.bankName || existing.bankName} UPI`,
                isPrimary: data.isPrimary ?? existing.isPrimary,
              },
            });
          } else {
            await prisma.upiId.create({
              data: {
                tenantId: existing.tenantId,
                bankAccountId,
                upiLabel: `${data.bankName || existing.bankName} UPI`,
                upiHandle: handle,
                isPrimary: data.isPrimary ?? existing.isPrimary,
                isActive: true,
              },
            });
          }
        }
      }
    }

    const reloaded = await prisma.bankAccount.findUnique({
      where: { bankAccountId },
      include: { upiIds: { where: { isDeleted: false } } },
    });

    return this.formatBankAccount(reloaded || existing);
  }

  static async toggleBankAccountStatus(id: string, tenantId?: number): Promise<BankAccountItem> {
    const bankAccountId = BigInt(id);
    const whereCondition: any = { bankAccountId, isDeleted: false };
    if (tenantId) whereCondition.tenantId = tenantId;

    const existing = await prisma.bankAccount.findFirst({
      where: whereCondition,
    });
    if (!existing) {
      const err = new Error(`Bank account '${id}' not found`) as Error & { statusCode?: number };
      err.statusCode = 404;
      throw err;
    }

    const updated = await prisma.bankAccount.update({
      where: { bankAccountId },
      data: { isActive: !existing.isActive },
    });

    const reloaded = await prisma.bankAccount.findUnique({
      where: { bankAccountId },
      include: { upiIds: { where: { isDeleted: false } } },
    });

    return this.formatBankAccount(reloaded || updated);
  }

  static async setPrimaryBankAccount(id: string, tenantId?: number): Promise<BankAccountItem[]> {
    const bankAccountId = BigInt(id);
    const whereCondition: any = { bankAccountId, isDeleted: false };
    if (tenantId) whereCondition.tenantId = tenantId;

    const target = await prisma.bankAccount.findFirst({
      where: whereCondition,
    });
    if (!target) {
      const err = new Error(`Bank account '${id}' not found`) as Error & { statusCode?: number };
      err.statusCode = 404;
      throw err;
    }

    // Unset current primary for tenant
    await prisma.bankAccount.updateMany({
      where: { tenantId: target.tenantId, isPrimary: true },
      data: { isPrimary: false },
    });
    await prisma.upiId.updateMany({
      where: { tenantId: target.tenantId, isPrimary: true },
      data: { isPrimary: false },
    });

    // Set new primary and ensure it is active
    await prisma.bankAccount.update({
      where: { bankAccountId },
      data: { isPrimary: true, isActive: true },
    });
    await prisma.upiId.updateMany({
      where: { bankAccountId, isDeleted: false },
      data: { isPrimary: true, isActive: true },
    });

    return this.getBankAccounts(target.tenantId);
  }

  static async deleteBankAccount(id: string, tenantId?: number): Promise<void> {
    const bankAccountId = BigInt(id);
    const whereCondition: any = { bankAccountId };
    if (tenantId) whereCondition.tenantId = tenantId;

    const target = await prisma.bankAccount.findFirst({ where: whereCondition });
    if (!target) {
      const err = new Error(`Bank account '${id}' not found`) as Error & { statusCode?: number };
      err.statusCode = 404;
      throw err;
    }

    await prisma.bankAccount.update({
      where: { bankAccountId },
      data: { isDeleted: true, isPrimary: false },
    });
    await prisma.upiId.updateMany({
      where: { bankAccountId },
      data: { isDeleted: true, isPrimary: false },
    });
  }

  // =========================================================================
  // SECTION 2: FEE / PLAN TYPES (PLANS CATALOG)
  // =========================================================================

  private static formatPlanType(p: any): PlanTypeItem {
    const unit = p.durationUnit as DurationUnit;
    const val = Number(p.durationValue);
    return {
      id: p.planId.toString(),
      planId: p.planId.toString(),
      tenantId: p.tenantId,
      name: p.planName,
      category: p.planCategory,
      durationValue: val,
      durationUnit: unit,
      displayDuration: SettingsService.computeDisplayDuration(val, unit),
      standardFee: Number(p.standardFee),
      isActive: p.isActive,
      createdAt: p.createdAt ? new Date(p.createdAt).toISOString() : undefined,
    };
  }

  static async getPlanTypes(tenantId?: number): Promise<PlanTypeItem[]> {
    const tid = await this.getTenantId(tenantId);

    let plans = await prisma.plansCatalog.findMany({
      where: {
        tenantId: tid,
        isDeleted: false,
      },
      orderBy: { planId: 'asc' },
    });

    // Seed standard catalog plans if none exist yet for this gym
    if (plans.length === 0) {
      const defaultPlansData = [
        { planName: 'Monthly Gold', planCategory: 'Regular', durationValue: 1, durationUnit: 'Months', standardFee: 2500 },
        { planName: 'Quarterly Fitness', planCategory: 'Regular', durationValue: 3, durationUnit: 'Months', standardFee: 6500 },
        { planName: 'Annual Premium', planCategory: 'Regular', durationValue: 1, durationUnit: 'Years', standardFee: 22000 },
        { planName: 'PT Monthly', planCategory: 'Personal Training', durationValue: 1, durationUnit: 'Months', standardFee: 8000 },
        { planName: 'Registration Fee', planCategory: 'Regular', durationValue: 0, durationUnit: 'One-time', standardFee: 1000 },
      ];

      for (const d of defaultPlansData) {
        await prisma.plansCatalog.create({
          data: {
            tenantId: tid,
            planName: d.planName,
            planCategory: d.planCategory,
            durationValue: d.durationValue,
            durationUnit: d.durationUnit,
            standardFee: d.standardFee,
            isActive: true,
          },
        });
      }

      plans = await prisma.plansCatalog.findMany({
        where: { tenantId: tid, isDeleted: false },
        orderBy: { planId: 'asc' },
      });
    }

    return plans.map(this.formatPlanType);
  }

  static async createPlanType(
    data: CreatePlanTypeDTO,
    tenantId?: number
  ): Promise<PlanTypeItem> {
    const tid = await this.getTenantId(tenantId || (data as any).tenantId);
    const validUnits: DurationUnit[] = ['Days', 'Months', 'Years', 'One-time'];
    const unit = validUnits.includes(data.durationUnit) ? data.durationUnit : 'Months';
    const val = unit === 'One-time' ? 0 : Math.max(1, Number(data.durationValue) || 1);
    const category = data.category === 'Personal Training' ? 'Personal Training' : 'Regular';

    // Check unique plan name per tenant
    const existing = await prisma.plansCatalog.findFirst({
      where: {
        tenantId: tid,
        planName: { equals: data.name.trim(), mode: 'insensitive' },
        isDeleted: false,
      },
    });

    if (existing) {
      const err = new Error(`Plan type '${data.name}' already exists in this gym`) as Error & { statusCode?: number };
      err.statusCode = 409;
      throw err;
    }

    const created = await prisma.plansCatalog.create({
      data: {
        tenantId: tid,
        planName: data.name.trim(),
        planCategory: category,
        durationValue: val,
        durationUnit: unit,
        standardFee: Math.max(0, Number(data.standardFee) || 0),
        isActive: true,
      },
    });

    return this.formatPlanType(created);
  }

  static async updatePlanType(
    id: string,
    data: UpdatePlanTypeDTO,
    tenantId?: number
  ): Promise<PlanTypeItem> {
    const planId = BigInt(id);
    const whereCondition: any = { planId, isDeleted: false };
    if (tenantId) whereCondition.tenantId = tenantId;

    const existing = await prisma.plansCatalog.findFirst({
      where: whereCondition,
    });
    if (!existing) {
      const err = new Error(`Plan type '${id}' not found in this gym`) as Error & { statusCode?: number };
      err.statusCode = 404;
      throw err;
    }

    const updatePayload: any = {};
    if (data.name !== undefined) updatePayload.planName = data.name.trim();
    if (data.category !== undefined) {
      updatePayload.planCategory = data.category === 'Personal Training' ? 'Personal Training' : 'Regular';
    }
    if (data.durationUnit !== undefined) {
      const validUnits: DurationUnit[] = ['Days', 'Months', 'Years', 'One-time'];
      const unit = validUnits.includes(data.durationUnit) ? data.durationUnit : 'Months';
      updatePayload.durationUnit = unit;
      updatePayload.durationValue =
        unit === 'One-time' ? 0 : Math.max(1, Number(data.durationValue ?? existing.durationValue) || 1);
    } else if (data.durationValue !== undefined) {
      updatePayload.durationValue = Math.max(1, Number(data.durationValue) || 1);
    }
    if (data.standardFee !== undefined) updatePayload.standardFee = Math.max(0, Number(data.standardFee) || 0);
    if (data.isActive !== undefined) updatePayload.isActive = data.isActive;

    const updated = await prisma.plansCatalog.update({
      where: { planId },
      data: updatePayload,
    });

    return this.formatPlanType(updated);
  }

  static async togglePlanTypeStatus(id: string, tenantId?: number): Promise<PlanTypeItem> {
    const planId = BigInt(id);
    const whereCondition: any = { planId, isDeleted: false };
    if (tenantId) whereCondition.tenantId = tenantId;

    const existing = await prisma.plansCatalog.findFirst({
      where: whereCondition,
    });
    if (!existing) {
      const err = new Error(`Plan type '${id}' not found`) as Error & { statusCode?: number };
      err.statusCode = 404;
      throw err;
    }

    const updated = await prisma.plansCatalog.update({
      where: { planId },
      data: { isActive: !existing.isActive },
    });

    return this.formatPlanType(updated);
  }

  static async deletePlanType(id: string, tenantId?: number): Promise<void> {
    const planId = BigInt(id);
    const whereCondition: any = { planId };
    if (tenantId) whereCondition.tenantId = tenantId;

    const target = await prisma.plansCatalog.findFirst({ where: whereCondition });
    if (!target) {
      const err = new Error(`Plan type '${id}' not found`) as Error & { statusCode?: number };
      err.statusCode = 404;
      throw err;
    }

    await prisma.plansCatalog.update({
      where: { planId },
      data: { isDeleted: true },
    });
  }

  // =========================================================================
  // SECTION 3: PAYMENT TYPES
  // =========================================================================

  private static defaultPaymentTypes: PaymentTypeItem[] = [
    { id: 'pt-upi', name: 'UPI', isActive: true, createdAt: '2024-01-01' },
    { id: 'pt-bank', name: 'Bank Transfer', isActive: true, createdAt: '2024-01-01' },
    { id: 'pt-card', name: 'Card', isActive: true, createdAt: '2024-01-01' },
    { id: 'pt-cash', name: 'Cash', isActive: true, createdAt: '2024-01-01' },
    { id: 'pt-cheque', name: 'Cheque', isActive: true, createdAt: '2024-01-01' },
  ];

  static async getPaymentTypes(): Promise<PaymentTypeItem[]> {
    return this.defaultPaymentTypes;
  }

  static async addPaymentType(name: string): Promise<PaymentTypeItem> {
    const newItem: PaymentTypeItem = {
      id: `pt-${Date.now()}`,
      name: name.trim(),
      isActive: true,
      createdAt: new Date().toISOString().split('T')[0],
    };
    this.defaultPaymentTypes.push(newItem);
    return newItem;
  }

  static async togglePaymentTypeStatus(id: string): Promise<PaymentTypeItem> {
    const item = this.defaultPaymentTypes.find((p) => p.id === id);
    if (!item) {
      const err = new Error(`Payment type '${id}' not found`) as Error & { statusCode?: number };
      err.statusCode = 404;
      throw err;
    }
    item.isActive = !item.isActive;
    return item;
  }
}

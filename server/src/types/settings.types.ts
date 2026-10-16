export interface BankAccountItem {
  id: string;
  bankAccountId?: string;
  tenantId?: number;
  bankName: string;
  accountName?: string;
  accountHolderName: string;
  accountNumber: string;
  ifscCode: string;
  branchName: string;
  upiHandle?: string;
  upiId?: string;
  balanceType?: number;
  openingBalanceAmount?: number;
  openingBalance?: number;
  currentBalance?: number;
  isPrimary: boolean;
  isActive: boolean;
  createdAt?: string;
}

export interface CreateBankAccountDTO {
  bankName: string;
  accountName?: string;
  accountHolderName: string;
  accountNumber: string;
  ifscCode: string;
  branchName?: string;
  upiHandle?: string;
  balanceType?: number;
  openingBalanceAmount?: number;
  isPrimary?: boolean;
  tenantId?: number;
}

export interface UpdateBankAccountDTO {
  bankName?: string;
  accountName?: string;
  accountHolderName?: string;
  accountNumber?: string;
  ifscCode?: string;
  branchName?: string;
  upiHandle?: string;
  balanceType?: number;
  isPrimary?: boolean;
  isActive?: boolean;
}

export type DurationUnit = 'Days' | 'Months' | 'Years' | 'One-time';

export interface PlanTypeItem {
  id: string;
  planId?: string;
  tenantId?: number;
  name: string;
  category: 'Regular' | 'Personal Training' | string;
  durationValue: number;
  durationUnit: DurationUnit;
  displayDuration: string;
  standardFee: number;
  isActive: boolean;
  createdAt?: string;
}

export interface CreatePlanTypeDTO {
  name: string;
  category?: 'Regular' | 'Personal Training' | string;
  durationValue?: number;
  durationUnit: DurationUnit;
  standardFee?: number;
  tenantId?: number;
}

export interface UpdatePlanTypeDTO {
  name?: string;
  category?: 'Regular' | 'Personal Training' | string;
  durationValue?: number;
  durationUnit?: DurationUnit;
  standardFee?: number;
  isActive?: boolean;
}

export interface PaymentTypeItem {
  id: string;
  name: string;
  isActive: boolean;
  createdAt?: string;
}

export interface UpiIdItem {
  id: string;
  upiIdId?: string;
  tenantId?: number;
  bankAccountId: string;
  upiLabel: string;
  upiHandle: string;
  isPrimary: boolean;
  isActive: boolean;
}

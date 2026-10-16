// Payroll Module Types & Data Transfer Objects

export type AttendanceStatus = 'FULL_DAY' | 'HALF_DAY' | 'PAID_LEAVE' | 'ABSENT';

export interface DailyAttendanceStaffItem {
  staffId: string;
  staffCode: string;
  fullName: string;
  designation?: string;
  photoUrl?: string;
  joiningDate: string;
  status: AttendanceStatus | null; // null if unmarked
  note: string | null;
  isLocked: boolean; // true if finalized slip exists for this month
}

export interface DailyAttendanceResponse {
  date: string;
  isMonthLocked: boolean;
  summary: {
    totalActive: number;
    fullDay: number;
    halfDay: number;
    paidLeave: number;
    absent: number;
    unmarked: number;
  };
  staff: DailyAttendanceStaffItem[];
}

export interface BulkUpsertAttendanceDTO {
  date: string;
  entries: Array<{
    staffId: string | number;
    status: AttendanceStatus;
    note?: string;
  }>;
}

export interface MonthlyAttendanceDayMark {
  day: number;
  date: string;
  status: AttendanceStatus | null;
  note?: string | null;
}

export interface MonthlyAttendanceStaffItem {
  staffId: string;
  staffCode: string;
  fullName: string;
  designation?: string;
  isLocked: boolean;
  marks: MonthlyAttendanceDayMark[];
  totals: {
    fullDays: number;
    halfDays: number;
    paidLeaveDays: number;
    absentDays: number; // Includes unmarked days
    unmarkedDays: number;
    payableDays: number;
  };
}

export interface MonthlyAttendanceResponse {
  month: string; // YYYY-MM
  daysInMonth: number;
  staff: MonthlyAttendanceStaffItem[];
}

// ================================================================
// ADVANCES TYPES
// ================================================================

export type PaymentMode = 'CASH' | 'UPI' | 'BANK' | 'CHEQUE';
export type AdvanceStatus = 'ACTIVE' | 'CANCELLED';
export type RepaymentType = 'SALARY_DEDUCTION' | 'DIRECT_PAYMENT';

export interface SalaryAdvanceItem {
  advanceId: string;
  tenantId: number;
  staffId: string;
  staffName: string;
  staffCode: string;
  amount: number;
  repaidAmount: number;
  outstandingAmount: number;
  advanceDate: string;
  reason?: string;
  paymentMode: PaymentMode;
  bankAccountId?: string;
  bankName?: string;
  referenceNo?: string;
  status: AdvanceStatus;
  createdByName?: string;
  createdAt: string;
}

export interface CreateAdvanceDTO {
  staffId: string | number;
  amount: number;
  advanceDate?: string;
  reason?: string;
  paymentMode: PaymentMode;
  bankAccountId?: string | number;
  upiIdId?: string | number;
  referenceNo?: string;
}

export interface CreateRepaymentDTO {
  amount: number;
  repaymentDate?: string;
  paymentMode: PaymentMode;
  bankAccountId?: string | number;
  referenceNo?: string;
  note?: string;
}

export interface AdvanceLedgerItem {
  id: string;
  date: string;
  type: 'ADVANCE_GIVEN' | 'SALARY_DEDUCTION' | 'DIRECT_PAYMENT';
  amount: number;
  paymentMode?: PaymentMode;
  referenceNo?: string;
  note?: string;
  createdByName?: string;
  runningBalance: number;
}

// ================================================================
// SALARIES TYPES
// ================================================================

export type SlipStatus = 'DRAFT' | 'FINALIZED' | 'CANCELLED';
export type SlipPaymentStatus = 'NOT_READY' | 'UNPAID' | 'PARTIAL' | 'PAID';

export interface SalaryPreviewItem {
  staffId: string;
  staffCode: string;
  fullName: string;
  designation?: string;
  baseSalary: number;
  daysInMonth: number;
  fullDays: number;
  halfDays: number;
  paidLeaveDays: number;
  absentDays: number; // Includes unmarked
  unmarkedDays: number;
  payableDays: number;
  earnedSalary: number;
  outstandingAdvance: number;
  recommendedAdvanceDeduction: number;
  bonusAmount: number;
  otherDeductions: number;
  advanceDeduction: number;
  netPayable: number;
}

export interface SalarySlipSummaryItem {
  slipId: string;
  tenantId: number;
  staffId: string;
  staffCode: string;
  staffName: string;
  designation?: string;
  salaryMonth: string; // YYYY-MM
  baseSalary: number;
  daysInMonth: number;
  fullDays: number;
  halfDays: number;
  paidLeaveDays: number;
  absentDays: number;
  payableDays: number;
  earnedSalary: number;
  bonusAmount: number;
  otherDeductions: number;
  advanceDeduction: number;
  netPayable: number;
  paidAmount: number;
  balanceAmount: number;
  status: SlipStatus;
  paymentStatus: SlipPaymentStatus;
  finalizedAt?: string;
  finalizedByName?: string;
}

export interface GenerateSalariesDTO {
  month: string; // YYYY-MM
  items: Array<{
    staffId: string | number;
    bonusAmount?: number;
    otherDeductions?: number;
    advanceDeduction?: number;
    remarks?: string;
  }>;
}

export interface RecordSalaryPaymentDTO {
  amount: number;
  paymentDate?: string;
  paymentMode: PaymentMode;
  bankAccountId?: string | number;
  upiIdId?: string | number;
  referenceNo?: string;
  note?: string;
  idempotencyKey?: string;
}

export interface SlipDetailResponse {
  slip: SalarySlipSummaryItem;
  gym: {
    gymName: string;
    address?: string;
    phone?: string;
    email?: string;
  };
  payments: Array<{
    paymentId: string;
    amount: number;
    paymentDate: string;
    paymentMode: PaymentMode;
    bankName?: string;
    referenceNo?: string;
    note?: string;
    paidByName: string;
    createdAt: string;
  }>;
  advanceDeductions: Array<{
    repaymentId: string;
    advanceId: string;
    amount: number;
    repaymentDate: string;
    advanceReason?: string;
  }>;
}

/**
 * Currency calculation helper: guarantees safe 2-decimal rounded precision
 */
export function roundCurrency(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

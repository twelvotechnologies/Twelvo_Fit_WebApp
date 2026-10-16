export type StaffRole = 'Trainer' | 'Manager' | 'Staff';
export type PaymentStatus = 'Paid' | 'Pending';

export interface SalaryAdvance {
  id: string;
  date: string;
  amount: number;
  reason: string;
  repaymentStatus: 'Deducted' | 'Pending';
}

export interface SalaryPaymentRecord {
  id: string;
  month: string; // e.g., "August 2026"
  paymentDate: string;
  baseSalary: number;
  allowances: number;
  deductions: number;
  advancesRecovered: number;
  netPaid: number;
  paymentMode: 'UPI' | 'Bank Transfer' | 'Cash';
  referenceNo: string;
}

export interface StaffMember {
  id: string;
  name: string;
  role: StaffRole;
  email: string;
  phone: string;
  joiningDate: string;
  baseSalary: number;
  allowances: number;
  deductions: number;
  advancesCurrentMonth: number;
  netPayable: number;
  paymentStatus: PaymentStatus;
  lastPaidDate: string | null;
  advanceHistory: SalaryAdvance[];
  paymentHistory: SalaryPaymentRecord[];
}

export interface PayrollFilters {
  role?: StaffRole | 'ALL';
  status?: PaymentStatus | 'ALL';
  month?: string;
  search?: string;
}

export interface RecordPaymentInput {
  staffId: string;
  month: string;
  amount: number;
  paymentMode: 'UPI' | 'Bank Transfer' | 'Cash';
  referenceNo: string;
  notes?: string;
}

export interface GiveAdvanceInput {
  staffId: string;
  amount: number;
  reason: string;
  repaymentMonth: string;
}

export interface UpdateStaffConfigInput {
  staffId: string;
  baseSalary: number;
  allowances: number;
  deductions: number;
}

export interface DashboardSummary {
  totalMembers: number;
  pendingFees: number;
  feesGeneratedLastMonth: number;
  feesCollectedLastMonth: number;
  collectionRate: number; // percentage e.g. 84.5
}

export interface MonthlyFeeData {
  month: string;
  generated: number;
  collected: number;
}

export interface PendingDueMember {
  id: string;
  name: string;
  membershipPlan: string;
  amountDue: number;
  daysOverdue: number;
  phone: string;
}

export interface PayrollActivity {
  id: string;
  type: 'Salary Paid' | 'Advance Given';
  staffName: string;
  staffRole: StaffRole;
  amount: number;
  timestamp: string;
  status: 'Completed';
}

// Settings Module Types
export interface PaymentTypeItem {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: string;
}

export interface BankAccountItem {
  id: string;
  bankName: string;
  accountName?: string;
  accountHolderName: string;
  accountNumber: string;
  ifscCode: string;
  branchName?: string;
  upiHandle?: string;
  isPrimary: boolean;
  isActive: boolean;
}

export type DurationUnit = 'Days' | 'Months' | 'Years' | 'One-time';
export type FeeCategory = 'Regular' | 'Personal Training' | string;

export interface FeeTypeItem {
  id: string;
  name: string;
  category: FeeCategory;
  durationValue: number;
  durationUnit: DurationUnit;
  displayDuration: string;
  standardFee: number;
  isActive: boolean;
}

// Alias for existing references
export type PlanTypeItem = FeeTypeItem;

export type ApprovalStatus = 'pending_approval' | 'approved' | 'rejected';
export type MemberPaymentStatus = 'PAID_UP' | 'DUE_SOON' | 'OVERDUE';

// ================================================================
// EXPENSES & EXPENSE TYPES
// ================================================================
export type ExpensePaymentMode = 'CASH' | 'UPI' | 'BANK' | 'CHEQUE' | 'CARD' | 'OTHER';

export interface ExpenseTypeItem {
  id: string;
  expenseTypeId: string;
  name: string;
  description?: string | null;
  isSystem: boolean;
  isActive: boolean;
  createdAt: string;
  expensesCount?: number;
}

export interface CreateExpenseTypeInput {
  name: string;
  description?: string;
  isActive?: boolean;
}

export interface UpdateExpenseTypeInput {
  name?: string;
  description?: string;
  isActive?: boolean;
}

export interface ExpenseItem {
  id: string;
  expenseId: string;
  expenseCode?: string | null;
  expenseTypeId: string;
  expenseTypeName: string;
  title: string;
  amount: number;
  expenseDate: string;
  paymentMode: ExpensePaymentMode;
  bankAccountId?: string | null;
  bankAccountName?: string | null;
  upiIdId?: string | null;
  upiHandle?: string | null;
  referenceNo?: string | null;
  notes?: string | null;
  salarySlipId?: string | null;
  salaryPaymentId?: string | null;
  staffName?: string | null;
  salaryMonth?: string | null;
  isSalaryExpense: boolean;
  createdByName?: string | null;
  createdAt: string;
}

export interface CreateExpenseInput {
  expenseTypeId: string;
  title: string;
  amount: number;
  expenseDate?: string;
  paymentMode: ExpensePaymentMode;
  bankAccountId?: string | null;
  upiIdId?: string | null;
  referenceNo?: string;
  notes?: string;
}

export interface UpdateExpenseInput {
  expenseTypeId?: string;
  title?: string;
  amount?: number;
  expenseDate?: string;
  paymentMode?: ExpensePaymentMode;
  bankAccountId?: string | null;
  upiIdId?: string | null;
  referenceNo?: string;
  notes?: string;
}

export interface ExpenseFilters {
  expenseTypeId?: string;
  paymentMode?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  source?: 'ALL' | 'MANUAL' | 'SALARY';
}

export interface ExpenseSummary {
  totalAmount: number;
  totalCount: number;
  operationalExpenses: number;
  salaryExpenses: number;
  cashAmount: number;
  bankAmount: number;
  byCategory: Array<{
    typeId: string;
    typeName: string;
    amount: number;
    count: number;
    percentage: number;
  }>;
}



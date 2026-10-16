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

export interface CreateExpenseTypeDTO {
  name: string;
  description?: string;
  isActive?: boolean;
}

export interface UpdateExpenseTypeDTO {
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

export interface CreateExpenseDTO {
  expenseTypeId: string;
  title: string;
  amount: number;
  expenseDate?: string;
  paymentMode: ExpensePaymentMode;
  bankAccountId?: string | null;
  upiIdId?: string | null;
  referenceNo?: string;
  notes?: string;
  salarySlipId?: string | null;
  salaryPaymentId?: string | null;
}

export interface UpdateExpenseDTO {
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

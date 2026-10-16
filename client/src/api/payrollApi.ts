import { fetchWithAuth, API_BASE } from './authFetch';
import {
  StaffMember,
  PayrollFilters,
  RecordPaymentInput,
  GiveAdvanceInput,
  UpdateStaffConfigInput,
  PayrollActivity,
} from './types';

// ================================================================
// PAYROLL MODULE TYPES
// ================================================================

export type AttendanceStatus = 'FULL_DAY' | 'HALF_DAY' | 'PAID_LEAVE' | 'ABSENT' | null;

export interface DailyAttendanceStaffItem {
  staffId: string;
  staffCode: string;
  fullName: string;
  designation?: string;
  photoUrl?: string;
  joiningDate: string;
  status: AttendanceStatus;
  note?: string | null;
  isLocked: boolean;
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

export interface SaveAttendanceEntry {
  staffId: string;
  status: 'FULL_DAY' | 'HALF_DAY' | 'PAID_LEAVE' | 'ABSENT';
  note?: string;
}

export interface SaveAttendanceInput {
  date: string;
  entries: SaveAttendanceEntry[];
}

export interface MonthlyAttendanceDayMark {
  day: number;
  date: string;
  status: AttendanceStatus;
}

export interface MonthlyAttendanceStaffItem {
  staffId: string;
  staffCode: string;
  fullName: string;
  designation?: string;
  photoUrl?: string;
  joiningDate: string;
  isLocked: boolean;
  days: MonthlyAttendanceDayMark[];
  totals: {
    fullDays: number;
    halfDays: number;
    paidLeaveDays: number;
    absentDays: number;
    unmarkedDays: number;
    payableDays: number;
  };
}

export interface MonthlyAttendanceResponse {
  month: string;
  daysInMonth: number;
  isMonthLocked: boolean;
  staff: MonthlyAttendanceStaffItem[];
}

// Advances Types
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
  paymentMode: 'CASH' | 'UPI' | 'BANK' | 'CHEQUE';
  bankAccountId?: string;
  bankName?: string;
  referenceNo?: string;
  status: 'ACTIVE' | 'CANCELLED';
  createdByName?: string;
  createdAt: string;
}

export interface AdvancesResponse {
  advances: SalaryAdvanceItem[];
  summary: {
    totalAdvanced: number;
    totalRepaid: number;
    totalOutstanding: number;
  };
}

export interface AdvanceLedgerItem {
  id: string;
  date: string;
  type: 'ADVANCE_GIVEN' | 'SALARY_DEDUCTION' | 'DIRECT_PAYMENT';
  amount: number;
  paymentMode?: string;
  referenceNo?: string;
  note?: string;
  createdByName?: string;
  runningBalance: number;
}

export interface StaffLedgerResponse {
  staffName: string;
  staffCode: string;
  currentOutstanding: number;
  ledger: AdvanceLedgerItem[];
}

export interface CreateAdvanceInput {
  staffId: string;
  amount: number;
  advanceDate?: string;
  reason?: string;
  paymentMode: 'CASH' | 'UPI' | 'BANK' | 'CHEQUE';
  bankAccountId?: string;
  referenceNo?: string;
}

export interface RecordRepaymentInput {
  amount: number;
  repaymentDate?: string;
  paymentMode: 'CASH' | 'UPI' | 'BANK' | 'CHEQUE';
  bankAccountId?: string;
  referenceNo?: string;
  note?: string;
}

// Salaries Types
export interface SalarySlipSummaryItem {
  slipId: string;
  tenantId: number;
  staffId: string;
  staffCode: string;
  staffName: string;
  designation?: string;
  salaryMonth: string;
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
  status: 'DRAFT' | 'FINALIZED' | 'CANCELLED';
  paymentStatus: 'NOT_READY' | 'UNPAID' | 'PARTIAL' | 'PAID';
  finalizedAt?: string;
  finalizedByName?: string;
}

export interface SalariesListResponse {
  slips: SalarySlipSummaryItem[];
  summary: {
    totalNetPayable: number;
    totalPaid: number;
    totalBalance: number;
    countUnpaid: number;
    countPartial: number;
    countPaid: number;
    countDraft: number;
  };
}

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
  absentDays: number;
  unmarkedDays: number;
  payableDays: number;
  earnedSalary: number;
  outstandingAdvance: number;
  recommendedAdvanceDeduction: number;
  bonusAmount: number;
  otherDeductions: number;
  advanceDeduction: number;
  netPayable: number;
  skip?: boolean;
}

export interface SalaryPreviewResponse {
  month: string;
  daysInMonth: number;
  items: SalaryPreviewItem[];
}

export interface GenerateSalariesItemInput {
  staffId: string;
  bonusAmount?: number;
  otherDeductions?: number;
  advanceDeduction?: number;
  remarks?: string;
}

export interface GenerateSalariesInput {
  month: string;
  items: GenerateSalariesItemInput[];
}

export interface RecordSalaryPaymentInput {
  amount: number;
  paymentDate?: string;
  paymentMode: 'CASH' | 'UPI' | 'BANK' | 'CHEQUE';
  bankAccountId?: string;
  referenceNo?: string;
  note?: string;
}

export interface SlipDetailResponse {
  slip: SalarySlipSummaryItem;
  gym: {
    gymName: string;
    address?: string;
    phone?: string;
    email?: string;
  };
  payments: {
    paymentId: string;
    amount: number;
    paymentDate: string;
    paymentMode: string;
    bankName?: string;
    referenceNo?: string;
    note?: string;
    paidByName: string;
    createdAt: string;
  }[];
  advanceDeductions: {
    repaymentId: string;
    advanceId: string;
    amount: number;
    repaymentDate: string;
    advanceReason?: string;
  }[];
}

// ================================================================
// API HELPER
// ================================================================

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errMsg = `Request failed with status ${res.status}`;
    try {
      const json = await res.json();
      errMsg = json.message || json.error || errMsg;
    } catch {
      // ignore
    }
    throw new Error(errMsg);
  }
  const json = await res.json();
  return json.data !== undefined ? json.data : json;
}

// ================================================================
// 1. ATTENDANCE APIS
// ================================================================

export const getDailyAttendance = async (date: string): Promise<DailyAttendanceResponse> => {
  const res = await fetchWithAuth(`${API_BASE}/v1/payroll/attendance?date=${encodeURIComponent(date)}`);
  return handleResponse<DailyAttendanceResponse>(res);
};

export const saveDailyAttendance = async (
  input: SaveAttendanceInput
): Promise<{ updatedCount: number }> => {
  const res = await fetchWithAuth(`${API_BASE}/v1/payroll/attendance`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
  return handleResponse<{ updatedCount: number }>(res);
};

export const getMonthlyAttendance = async (
  month: string
): Promise<MonthlyAttendanceResponse> => {
  const res = await fetchWithAuth(`${API_BASE}/v1/payroll/attendance/monthly?month=${encodeURIComponent(month)}`);
  return handleResponse<MonthlyAttendanceResponse>(res);
};

// ================================================================
// 2. ADVANCES APIS
// ================================================================

export const getAdvances = async (filters?: {
  staffId?: string;
  status?: string;
  from?: string;
  to?: string;
}): Promise<AdvancesResponse> => {
  const params = new URLSearchParams();
  if (filters?.staffId) params.append('staffId', filters.staffId);
  if (filters?.status && filters.status !== 'ALL') params.append('status', filters.status);
  if (filters?.from) params.append('from', filters.from);
  if (filters?.to) params.append('to', filters.to);

  const res = await fetchWithAuth(`${API_BASE}/v1/payroll/advances?${params.toString()}`);
  return handleResponse<AdvancesResponse>(res);
};

export const getStaffLedger = async (staffId: string): Promise<StaffLedgerResponse> => {
  const res = await fetchWithAuth(`${API_BASE}/v1/payroll/advances/staff/${encodeURIComponent(staffId)}/ledger`);
  return handleResponse<StaffLedgerResponse>(res);
};

export const createAdvance = async (
  input: CreateAdvanceInput
): Promise<SalaryAdvanceItem> => {
  const res = await fetchWithAuth(`${API_BASE}/v1/payroll/advances`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return handleResponse<SalaryAdvanceItem>(res);
};

export const recordAdvanceRepayment = async (
  advanceId: string,
  input: RecordRepaymentInput
): Promise<{ repaymentId: string; newOutstanding: number }> => {
  const res = await fetchWithAuth(`${API_BASE}/v1/payroll/advances/${encodeURIComponent(advanceId)}/repayments`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return handleResponse<{ repaymentId: string; newOutstanding: number }>(res);
};

export const cancelAdvance = async (
  advanceId: string
): Promise<{ success: boolean; message: string }> => {
  const res = await fetchWithAuth(`${API_BASE}/v1/payroll/advances/${encodeURIComponent(advanceId)}/cancel`, {
    method: 'PATCH',
  });
  return handleResponse<{ success: boolean; message: string }>(res);
};

// ================================================================
// 3. SALARIES APIS
// ================================================================

export const getSalaries = async (month: string): Promise<SalariesListResponse> => {
  const res = await fetchWithAuth(`${API_BASE}/v1/payroll/salaries?month=${encodeURIComponent(month)}`);
  return handleResponse<SalariesListResponse>(res);
};

export const getSalaryPreview = async (month: string): Promise<SalaryPreviewResponse> => {
  const res = await fetchWithAuth(`${API_BASE}/v1/payroll/salaries/preview?month=${encodeURIComponent(month)}`);
  return handleResponse<SalaryPreviewResponse>(res);
};

export const generateSalaries = async (
  input: GenerateSalariesInput
): Promise<{ createdCount: number }> => {
  const res = await fetchWithAuth(`${API_BASE}/v1/payroll/salaries/generate`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return handleResponse<{ createdCount: number }>(res);
};

export const finalizeSalarySlip = async (
  slipId: string
): Promise<{ success: boolean; slipId: string }> => {
  const res = await fetchWithAuth(`${API_BASE}/v1/payroll/salaries/${encodeURIComponent(slipId)}/finalize`, {
    method: 'POST',
  });
  return handleResponse<{ success: boolean; slipId: string }>(res);
};

export const finalizeBulkSalaries = async (
  slipIds: string[]
): Promise<{ finalizedCount: number }> => {
  const res = await fetchWithAuth(`${API_BASE}/v1/payroll/salaries/finalize-bulk`, {
    method: 'POST',
    body: JSON.stringify({ slipIds }),
  });
  return handleResponse<{ finalizedCount: number }>(res);
};

export const recordSalaryPayment = async (
  slipId: string,
  input: RecordSalaryPaymentInput,
  idempotencyKey?: string
): Promise<{ paymentId: string; balanceAmount: number; paymentStatus: string }> => {
  const headers: Record<string, string> = {};
  if (idempotencyKey) {
    headers['x-idempotency-key'] = idempotencyKey;
  }
  const res = await fetchWithAuth(`${API_BASE}/v1/payroll/salaries/${encodeURIComponent(slipId)}/payments`, {
    method: 'POST',
    headers,
    body: JSON.stringify(input),
  });
  return handleResponse<{ paymentId: string; balanceAmount: number; paymentStatus: string }>(res);
};

export const getSalarySlipDetail = async (slipId: string): Promise<SlipDetailResponse> => {
  const res = await fetchWithAuth(`${API_BASE}/v1/payroll/salaries/${encodeURIComponent(slipId)}`);
  return handleResponse<SlipDetailResponse>(res);
};

export const cancelSalarySlip = async (
  slipId: string
): Promise<{ success: boolean; message: string }> => {
  const res = await fetchWithAuth(`${API_BASE}/v1/payroll/salaries/${encodeURIComponent(slipId)}/cancel`, {
    method: 'PATCH',
  });
  return handleResponse<{ success: boolean; message: string }>(res);
};

// ================================================================
// LEGACY COMPATIBILITY HELPERS (preserving existing prototypes)
// ================================================================

export const mockStaffList: StaffMember[] = [];

export const getPayrollList = async (_filters?: PayrollFilters): Promise<StaffMember[]> => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const month = today.substring(0, 7);
    const data = await getSalaries(month);
    return data.slips.map((s) => ({
      id: s.staffId,
      name: s.staffName,
      role: (s.designation as any) || 'Staff',
      email: '',
      phone: '',
      joiningDate: '',
      baseSalary: s.baseSalary,
      allowances: s.bonusAmount,
      deductions: s.otherDeductions,
      advancesCurrentMonth: s.advanceDeduction,
      netPayable: s.netPayable,
      paymentStatus: s.paymentStatus === 'PAID' ? 'Paid' : 'Pending',
      lastPaidDate: s.finalizedAt || null,
      advanceHistory: [],
      paymentHistory: [],
    }));
  } catch {
    return [];
  }
};

export const getStaffDetail = async (id: string): Promise<StaffMember | null> => {
  try {
    const ledger = await getStaffLedger(id);
    return {
      id,
      name: ledger.staffName,
      role: 'Staff',
      email: '',
      phone: '',
      joiningDate: '',
      baseSalary: 0,
      allowances: 0,
      deductions: 0,
      advancesCurrentMonth: ledger.currentOutstanding,
      netPayable: 0,
      paymentStatus: 'Pending',
      lastPaidDate: null,
      advanceHistory: ledger.ledger.map((l) => ({
        id: l.id,
        date: l.date,
        amount: l.amount,
        reason: l.note || '',
        repaymentStatus: l.type === 'ADVANCE_GIVEN' ? 'Pending' : 'Deducted',
      })),
      paymentHistory: [],
    };
  } catch {
    return null;
  }
};

export const recordPayment = async (_input: RecordPaymentInput): Promise<StaffMember> => {
  return {} as StaffMember;
};

export const giveAdvance = async (input: GiveAdvanceInput): Promise<StaffMember> => {
  await createAdvance({
    staffId: input.staffId,
    amount: input.amount,
    reason: input.reason,
    paymentMode: 'CASH',
  });
  return {} as StaffMember;
};

export const updateStaffConfig = async (_input: UpdateStaffConfigInput): Promise<StaffMember> => {
  return {} as StaffMember;
};

export const getRecentPayrollActivity = async (): Promise<PayrollActivity[]> => {
  try {
    const res = await getAdvances({ status: 'ALL' });
    return res.advances.slice(0, 5).map((a) => ({
      id: `adv-${a.advanceId}`,
      type: 'Advance Given',
      staffName: a.staffName,
      staffRole: 'Staff',
      amount: a.amount,
      timestamp: a.createdAt,
      status: 'Completed',
    }));
  } catch {
    return [];
  }
};

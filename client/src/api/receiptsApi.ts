import { fetchWithAuth, API_BASE } from './authFetch';

export interface ReceiptItem {
  id: string;
  receiptNo: string;
  memberId?: string;
  memberName: string;
  memberPhone: string;
  plan: string;
  planCategory?: 'Regular' | 'Personal Training' | string;
  planDurationUnit?: string;
  planDurationValue?: number;
  amount: number;
  tax: number;
  total: number;
  paymentDate: string;
  paymentMode: 'UPI' | 'Card' | 'Bank Transfer' | 'Cash';
  referenceNo: string;
  status: 'PAID' | 'PENDING' | 'OVERDUE';
  approvalStatus?: 'approved' | 'pending_approval' | 'rejected' | 'cancelled';
  submittedBy?: string;
  submittedRole?: 'admin' | 'trainer' | 'gym_owner' | 'other';
  submittedOn?: string;
  rejectionReason?: string;
}

export interface SubmitReceiptInput {
  memberId?: string;
  memberName: string;
  memberPhone: string;
  plan: string;
  planCategory?: 'Regular' | 'Personal Training' | string;
  planDurationUnit?: string;
  planDurationValue?: number;
  amount: number;
  paymentMode: 'UPI' | 'Card' | 'Bank Transfer' | 'Cash';
  paymentDate: string;
  referenceNo?: string;
}

const STORAGE_KEY_RECEIPTS = 'gymerp_receipts_ledger';
const STORAGE_KEY_PENDING_RECEIPTS = 'gymerp_pending_receipts';

function getStoredReceipts(): ReceiptItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_RECEIPTS);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function setStoredReceipts(items: ReceiptItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY_RECEIPTS, JSON.stringify(items));
  } catch (e) {
    console.error('Failed to write receipts to localStorage:', e);
  }
}

function getStoredPendingReceipts(): ReceiptItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PENDING_RECEIPTS);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function setStoredPendingReceipts(items: ReceiptItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY_PENDING_RECEIPTS, JSON.stringify(items));
  } catch (e) {
    console.error('Failed to write pending receipts to localStorage:', e);
  }
}

/**
 * Fetch approved/active receipts from live backend API with JWT Bearer
 */
export const getReceipts = async (): Promise<ReceiptItem[]> => {
  try {
    const res = await fetchWithAuth(`${API_BASE}/v1/receipts?status=approved`);
    if (res.ok) {
      const json = await res.json();
      if (Array.isArray(json.data)) {
        setStoredReceipts(json.data);
        return json.data;
      }
    }
  } catch (err) {
    console.warn('API error fetching receipts, falling back to local cache:', err);
  }
  return getStoredReceipts();
};

/**
 * Fetch pending approval receipts from live backend API with JWT Bearer
 */
export const getPendingReceipts = async (): Promise<ReceiptItem[]> => {
  try {
    const res = await fetchWithAuth(`${API_BASE}/v1/receipts?status=pending`);
    if (res.ok) {
      const json = await res.json();
      if (Array.isArray(json.data)) {
        setStoredPendingReceipts(json.data);
        return json.data;
      }
    }
  } catch (err) {
    console.warn('API error fetching pending receipts, falling back to local cache:', err);
  }
  return getStoredPendingReceipts();
};

/**
 * Submit Receipt to live backend
 * If submitter is 'trainer', queued as 'pending_approval' (status code 1)
 * If submitter is 'admin' or 'gym_owner', auto-accepted (status code 2)
 */
export const submitReceipt = async (
  input: SubmitReceiptInput,
  submitterRole: 'admin' | 'trainer' = 'admin',
  submitterName = 'Staff Admin'
): Promise<{ isAutoApproved: boolean; receipt: ReceiptItem }> => {
  const isAutoApproved = submitterRole !== 'trainer';

  try {
    const res = await fetchWithAuth(`${API_BASE}/v1/receipts`, {
      method: 'POST',
      body: JSON.stringify({
        memberId: input.memberId,
        memberName: input.memberName,
        memberPhone: input.memberPhone,
        plan: input.plan,
        planCategory: input.planCategory,
        planDurationUnit: input.planDurationUnit,
        planDurationValue: input.planDurationValue,
        amount: input.amount,
        paymentMode: input.paymentMode,
        paymentDate: input.paymentDate,
        referenceNo: input.referenceNo,
        isAutoApproved,
      }),
    });

    if (res.ok) {
      const json = await res.json();
      const created: ReceiptItem = json.data;
      if (isAutoApproved) {
        setStoredReceipts([created, ...getStoredReceipts()]);
      } else {
        setStoredPendingReceipts([created, ...getStoredPendingReceipts()]);
      }
      return { isAutoApproved, receipt: created };
    }
  } catch (err) {
    console.warn('Backend API unavailable, saving receipt locally:', err);
  }

  // Offline / local fallback
  const baseAmount = Number(input.amount) || 0;
  const tax = Math.round(baseAmount * 0.18);
  const total = baseAmount + tax;
  const dateStr = input.paymentDate || new Date().toISOString().split('T')[0];
  const timeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  const fallbackReceipt: ReceiptItem = {
    id: `rec-${Date.now()}`,
    receiptNo: `REC-2024-${String(Date.now()).slice(-4)}`,
    memberId: input.memberId,
    memberName: input.memberName,
    memberPhone: input.memberPhone,
    plan: input.plan,
    planCategory: input.planCategory || 'Regular',
    planDurationUnit: input.planDurationUnit || 'Months',
    planDurationValue: input.planDurationValue || 1,
    amount: baseAmount,
    tax,
    total,
    paymentDate: dateStr,
    paymentMode: input.paymentMode,
    referenceNo: input.referenceNo?.trim() || `TXN_${Date.now().toString().slice(-8)}`,
    status: 'PAID',
    approvalStatus: isAutoApproved ? 'approved' : 'pending_approval',
    submittedBy: submitterName,
    submittedRole: submitterRole,
    submittedOn: `${dateStr} ${timeStr}`,
  };

  if (isAutoApproved) {
    setStoredReceipts([fallbackReceipt, ...getStoredReceipts()]);
  } else {
    setStoredPendingReceipts([fallbackReceipt, ...getStoredPendingReceipts()]);
  }

  return { isAutoApproved, receipt: fallbackReceipt };
};

/**
 * Approve Pending Receipt via backend API
 */
export const approvePendingReceipt = async (pendingId: string): Promise<ReceiptItem> => {
  try {
    const res = await fetchWithAuth(`${API_BASE}/v1/receipts/${pendingId}/approve`, {
      method: 'POST',
      body: JSON.stringify({ actionNote: 'Approved by gym owner' }),
    });

    if (res.ok) {
      const json = await res.json();
      const approved: ReceiptItem = json.data;
      setStoredPendingReceipts(getStoredPendingReceipts().filter((p) => p.id !== pendingId));
      setStoredReceipts([approved, ...getStoredReceipts()]);
      return approved;
    }
  } catch (err) {
    console.warn('API error approving receipt:', err);
  }

  // Fallback
  const pending = getStoredPendingReceipts();
  const target = pending.find((p) => p.id === pendingId);
  if (!target) throw new Error('Pending receipt record not found');

  const approvedReceipt: ReceiptItem = {
    ...target,
    approvalStatus: 'approved',
  };

  setStoredPendingReceipts(pending.filter((p) => p.id !== pendingId));
  setStoredReceipts([approvedReceipt, ...getStoredReceipts()]);
  return approvedReceipt;
};

/**
 * Reject Pending Receipt via backend API
 */
export const rejectPendingReceipt = async (
  pendingId: string,
  reason: string
): Promise<ReceiptItem> => {
  if (!reason.trim()) throw new Error('A rejection reason is mandatory');

  try {
    const res = await fetchWithAuth(`${API_BASE}/v1/receipts/${pendingId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason: reason.trim() }),
    });

    if (res.ok) {
      const json = await res.json();
      const rejected: ReceiptItem = json.data;
      setStoredPendingReceipts(getStoredPendingReceipts().filter((p) => p.id !== pendingId));
      return rejected;
    }
  } catch (err) {
    console.warn('API error rejecting receipt:', err);
  }

  // Fallback
  const pending = getStoredPendingReceipts();
  const target = pending.find((p) => p.id === pendingId);
  if (!target) throw new Error('Pending receipt record not found');

  target.approvalStatus = 'rejected';
  target.rejectionReason = reason.trim();
  setStoredPendingReceipts(pending.filter((p) => p.id !== pendingId));
  return target;
};

/**
 * Append receipt helper
 */
export const appendReceipt = (newReceipt: ReceiptItem): void => {
  const current = getStoredReceipts();
  setStoredReceipts([newReceipt, ...current]);
};

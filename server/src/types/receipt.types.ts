export type PaymentMode = 'UPI' | 'Card' | 'Bank Transfer' | 'Cash' | 'CASH' | 'BANK' | 'CARD' | 'CHEQUE';

export interface ReceiptListItem {
  id: string;
  receiptId: string;
  receiptNo: string;
  receiptCode: string;
  tenantId: number;
  memberId: string;
  memberName: string;
  memberPhone: string;
  planId?: string | null;
  planName: string;
  plan: string;
  planCategory?: string;
  planDurationUnit?: string;
  planDurationValue?: number;
  paymentFor: string;
  amount: number;
  tax: number;
  taxAmount: number;
  total: number;
  totalAmount: number;
  paymentDate: string;
  paymentMode: PaymentMode;
  bankAccountId?: string | null;
  bankAccountName?: string | null;
  upiIdId?: string | null;
  upiHandle?: string | null;
  referenceNo: string;
  status: 'PAID' | 'PENDING' | 'OVERDUE';
  approvalStatus: 'approved' | 'pending_approval' | 'rejected' | 'cancelled';
  approvalStatusCode: number; // 1 = Pending, 2 = Accepted, 3 = Rejected, 4 = Cancelled
  submittedBy: string;
  submittedByName: string;
  submittedRole: 'gym_owner' | 'trainer' | 'other' | 'admin';
  submittedOn: string;
  lastActionBy?: string | null;
  lastActionNote?: string | null;
  rejectionReason?: string;
  createdAt: string;
}

export interface CreateReceiptDTO {
  memberId: string | number;
  memberName?: string;
  memberPhone?: string;
  planId?: string | number;
  plan?: string;
  planCategory?: string;
  planDurationUnit?: string;
  planDurationValue?: number;
  paymentFor?: string;
  amount: number;
  taxAmount?: number;
  paymentDate?: string;
  paymentMode: PaymentMode;
  bankAccountId?: string | number;
  upiIdId?: string | number;
  referenceNo?: string;
  isAutoApproved?: boolean;
}

export interface ApproveReceiptDTO {
  actionNote?: string;
}

export interface RejectReceiptDTO {
  reason: string;
}

export interface ReceiptFilterDTO {
  status?: string; // 'all' | 'approved' | 'pending' | 'rejected'
  paymentMode?: string;
  search?: string;
  memberId?: string | number;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface ReceiptStatsResponse {
  totalCollectedThisMonth: number;
  todayCollected: number;
  pendingApprovalCount: number;
  totalReceiptsCount: number;
}

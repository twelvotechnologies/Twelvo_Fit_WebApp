export type MemberStatus = 'ACTIVE' | 'EXPIRING' | 'EXPIRED' | 'FROZEN' | 'INACTIVE' | 'SUSPENDED';

export interface IMember {
  id: string;
  memberId: string;
  memberCode: string;
  tenantId: number;
  fullName: string;
  name: string;
  email: string;
  phone: string;
  photoUrl?: string | null;
  photo?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  joiningDate: string;
  joinedAt: string;
  assignedTrainerId?: string | null;
  assignedTrainerName?: string | null;
  assignedTrainer?: string | null;
  currentPlanId?: string | null;
  planId?: string | null;
  planName: string;
  planCategory: string;
  membershipPlan: string;
  feeAmountAtSignup?: number | null;
  nextDueDate: string;
  expiresAt: string;
  expiryDate: string;
  isEstimatedDueDate: boolean;
  daysRemaining: number;
  status: string;
  isActiveDot: boolean;
  paymentStatus: 'PAID_UP' | 'DUE_SOON' | 'OVERDUE';
  onboardedVia: string;
  pathType: 'NEW' | 'EXISTING';
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateMemberDTO {
  fullName: string;
  name?: string;
  email: string;
  phone: string;
  photoUrl?: string | null;
  photo?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  joiningDate?: string;
  assignedTrainerId?: string | number | null;
  assignedTrainer?: string | null;
  currentPlanId?: string | number | null;
  planId?: string | number | null;
  planName?: string;
  planCategory?: string;
  membershipPlan?: string;
  feeAmountAtSignup?: number;
  nextDueDate?: string;
  expiresAt?: string;
  isEstimatedDueDate?: boolean;
  status?: MemberStatus | string;
  onboardedVia?: 'admin' | 'trainer' | string;
  pathType?: 'NEW' | 'EXISTING';

  // Immediate payment processing option
  recordPaymentNow?: boolean;
  paymentDetails?: {
    amount: number;
    paymentMode: 'UPI' | 'Card' | 'Bank Transfer' | 'Cash' | 'CASH' | 'BANK' | 'CARD' | 'CHEQUE';
    paymentDate?: string;
    referenceNo?: string;
    bankAccountId?: string | number;
    upiIdId?: string | number;
  };
}

export interface UpdateMemberDTO {
  fullName?: string;
  name?: string;
  email?: string;
  phone?: string;
  photoUrl?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  assignedTrainerId?: string | number | null;
  currentPlanId?: string | number | null;
  feeAmountAtSignup?: number;
  nextDueDate?: string;
  expiresAt?: string;
  isEstimatedDueDate?: boolean;
  status?: MemberStatus | string;
}

export interface MemberFilterDTO {
  status?: string;
  search?: string;
  planId?: string | number;
  trainerId?: string | number;
  page?: number;
  limit?: number;
}

export interface MemberStatsResponse {
  totalMembers: number;
  activeMembers: number;
  expiringSoon: number;
  overdue: number;
  totalRevenue: number;
}

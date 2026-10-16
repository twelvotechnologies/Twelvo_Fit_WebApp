import { simulateNetworkDelay } from './client';
import { appendReceipt, ReceiptItem } from './receiptsApi';
import { fetchWithAuth, API_BASE } from './authFetch';

export interface MemberRecord {
  id: string;
  memberId: string;
  name: string;
  email: string;
  phone: string;
  photo?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  joiningDate: string;
  planId: string;
  planName: string;
  planCategory: 'Regular' | 'Personal Training' | string;
  expiryDate: string; // Acts as Next Due Date
  daysRemaining: number;
  isEstimatedDueDate: boolean;
  assignedTrainer: string;
  status: 'ACTIVE' | 'EXPIRING' | 'EXPIRED' | 'FROZEN';
  isActiveDot: boolean;
  paymentStatus: 'PAID_UP' | 'DUE_SOON' | 'OVERDUE';
  attendanceCount: number;
  pathType: 'NEW' | 'EXISTING';
}

export interface MemberPlanRecord {
  id: string;
  memberId: string;
  planTypeId: string;
  planName: string;
  planCategory?: 'Regular' | 'Personal Training' | string;
  startDate: string;
  nextDueDate: string;
  feeAmount: number;
  isEstimatedDueDate: boolean;
}

export interface SaveMemberInput {
  pathType: 'NEW' | 'EXISTING';
  name: string;
  phone: string;
  email?: string;
  photo?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  joiningDate: string;
  planId: string;
  planName: string;
  planCategory?: 'Regular' | 'Personal Training' | string;
  assignedTrainer?: string;
  lastPaymentDate?: string;
  nextDueDate: string;
  isEstimatedDueDate: boolean;
  recordPaymentNow: boolean;
  paymentDetails?: {
    amount: number;
    paymentMode: 'UPI' | 'Card' | 'Bank Transfer' | 'Cash';
    paymentDate: string;
    referenceNo?: string;
  };
}

export interface PendingRegistrationRecord {
  id: string;
  name: string;
  phone: string;
  email: string;
  photo?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  joiningDate: string;
  planId: string;
  planName: string;
  planCategory: 'Regular' | 'Personal Training' | string;
  nextDueDate: string;
  isEstimatedDueDate: boolean;
  assignedTrainer: string;
  pathType: 'NEW' | 'EXISTING';
  submittedBy: string;
  submittedRole: 'trainer' | 'admin';
  submittedOn: string;
  paymentIncluded: boolean;
  paymentDetails?: {
    amount: number;
    paymentMode: 'UPI' | 'Card' | 'Bank Transfer' | 'Cash';
    paymentDate: string;
    referenceNo?: string;
  };
  status: 'pending_approval' | 'approved' | 'rejected';
  rejectionReason?: string;
}

export const computeMemberPaymentStatus = (daysRemaining: number): 'PAID_UP' | 'DUE_SOON' | 'OVERDUE' => {
  if (daysRemaining < 0) return 'OVERDUE';
  if (daysRemaining <= 7) return 'DUE_SOON';
  return 'PAID_UP';
};

export const DEFAULT_PENDING_REGISTRATIONS: PendingRegistrationRecord[] = [];

const STORAGE_MEMBERS_KEY = 'gymerp_members_list_v2';
const STORAGE_PLANS_KEY = 'gymerp_member_plans_list_v2';
const STORAGE_PENDING_REGISTRATIONS_KEY = 'gymerp_pending_registrations';

const getStoredPendingRegistrations = (): PendingRegistrationRecord[] => {
  try {
    const data = localStorage.getItem(STORAGE_PENDING_REGISTRATIONS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

const setStoredPendingRegistrations = (list: PendingRegistrationRecord[]) => {
  try {
    localStorage.setItem(STORAGE_PENDING_REGISTRATIONS_KEY, JSON.stringify(list));
  } catch {}
};

const getStoredMembers = (): MemberRecord[] => {
  try {
    const data = localStorage.getItem(STORAGE_MEMBERS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

const setStoredMembers = (list: MemberRecord[]) => {
  try {
    localStorage.setItem(STORAGE_MEMBERS_KEY, JSON.stringify(list));
  } catch {}
};

const getStoredMemberPlans = (): MemberPlanRecord[] => {
  try {
    const data = localStorage.getItem(STORAGE_PLANS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

const setStoredMemberPlans = (list: MemberPlanRecord[]) => {
  try {
    localStorage.setItem(STORAGE_PLANS_KEY, JSON.stringify(list));
  } catch {}
};

let membersList: MemberRecord[] = getStoredMembers();
let memberPlansList: MemberPlanRecord[] = getStoredMemberPlans();

export const getPendingRegistrations = async (): Promise<PendingRegistrationRecord[]> => {
  const all = getStoredPendingRegistrations();
  return simulateNetworkDelay(all.filter((r) => r.status === 'pending_approval'), 200);
};

export const getAllPendingRegistrations = async (): Promise<PendingRegistrationRecord[]> => {
  const all = getStoredPendingRegistrations();
  return simulateNetworkDelay(all, 200);
};

export const getMembers = async (): Promise<MemberRecord[]> => {
  try {
    const res = await fetchWithAuth(`${API_BASE}/v1/members`);
    if (res.ok) {
      const json = await res.json();
      if (Array.isArray(json.data) && json.data.length > 0) {
        setStoredMembers(json.data);
        membersList = json.data;
        return json.data;
      }
    }
  } catch (err) {
    console.warn('API error fetching members, falling back to local cache:', err);
  }
  membersList = getStoredMembers();
  return simulateNetworkDelay(membersList, 150);
};

export const getMemberPlans = async (): Promise<MemberPlanRecord[]> => {
  memberPlansList = getStoredMemberPlans();
  return simulateNetworkDelay(memberPlansList, 200);
};

export const computeDaysRemaining = (dueDateStr: string): number => {
  if (!dueDateStr || dueDateStr === 'One-time' || dueDateStr === 'N/A') return 0;
  const target = new Date(dueDateStr).getTime();
  const now = new Date('2024-03-14').getTime(); // Reference date aligned with system March 2024 snapshot
  const diffTime = target - now;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * ATOMIC TRANSACTION:
 * Creates:
 * 1. members record
 * 2. member_plans record
 * 3. receipts record (only if recordPaymentNow = true)
 *
 * If any step fails, roll back completely.
 */
export const createMemberAtomic = async (
  input: SaveMemberInput
): Promise<{ member: MemberRecord; plan: MemberPlanRecord; receipt?: ReceiptItem }> => {
  // Snapshot current state for rollback integrity
  const membersSnapshot = [...getStoredMembers()];
  const plansSnapshot = [...getStoredMemberPlans()];

  let createdReceipt: ReceiptItem | undefined = undefined;

  // 1. Attempt live backend creation
  try {
    const res = await fetchWithAuth(`${API_BASE}/v1/members`, {
      method: 'POST',
      body: JSON.stringify({
        fullName: input.name,
        name: input.name,
        phone: input.phone,
        email: input.email,
        photoUrl: input.photo,
        emergencyContactName: input.emergencyContactName,
        emergencyContactPhone: input.emergencyContactPhone,
        joiningDate: input.joiningDate,
        planId: input.planId,
        planName: input.planName,
        planCategory: input.planCategory,
        assignedTrainer: input.assignedTrainer,
        nextDueDate: input.nextDueDate,
        isEstimatedDueDate: input.isEstimatedDueDate,
        pathType: input.pathType,
        recordPaymentNow: input.recordPaymentNow,
        paymentDetails: input.paymentDetails,
      }),
    });

    if (res.ok) {
      const json = await res.json();
      const liveMember: MemberRecord = json.data;

      const newPlanRecord: MemberPlanRecord = {
        id: `mp-${liveMember.id}`,
        memberId: liveMember.id,
        planTypeId: input.planId,
        planName: input.planName,
        planCategory: input.planCategory || 'Regular',
        startDate: input.joiningDate,
        nextDueDate: input.nextDueDate || 'One-time',
        feeAmount: input.paymentDetails?.amount || 0,
        isEstimatedDueDate: !!input.isEstimatedDueDate,
      };

      if (input.recordPaymentNow && input.paymentDetails) {
        const baseAmount = Number(input.paymentDetails.amount) || 0;
        createdReceipt = {
          id: `rec-${liveMember.id}`,
          receiptNo: `RC-${liveMember.memberId || liveMember.id}`,
          memberId: liveMember.id,
          memberName: liveMember.name,
          memberPhone: liveMember.phone,
          plan: liveMember.planName,
          amount: baseAmount,
          tax: 0,
          total: baseAmount,
          paymentDate: input.paymentDetails.paymentDate || new Date().toISOString().split('T')[0],
          paymentMode: input.paymentDetails.paymentMode || 'UPI',
          referenceNo: input.paymentDetails.referenceNo || `TXN_${Date.now().toString().slice(-6)}`,
          status: 'PAID',
        };
        appendReceipt(createdReceipt);
      }

      const updatedMembers = [liveMember, ...membersSnapshot];
      setStoredMembers(updatedMembers);
      membersList = updatedMembers;

      return { member: liveMember, plan: newPlanRecord, receipt: createdReceipt };
    }
  } catch (apiErr) {
    console.warn('API error creating member, falling back to local storage:', apiErr);
  }

  try {
    // 1. Validation check
    if (!input.name.trim()) throw new Error('Member name is required');
    if (!input.phone.trim()) throw new Error('Member phone is required');
    if (!input.joiningDate) throw new Error('Joining date is required');
    if (!input.planId) throw new Error('Plan selection is required');

    const newMemberId = `m-${Date.now()}`;
    const formattedMemberCode = `MEM-${1058 + membersSnapshot.length}`;
    const daysRemaining = computeDaysRemaining(input.nextDueDate);

    // Derive status based on days remaining
    let status: 'ACTIVE' | 'EXPIRING' | 'EXPIRED' | 'FROZEN' = 'ACTIVE';
    if (daysRemaining < 0) {
      status = 'EXPIRED';
    } else if (daysRemaining <= 7 && daysRemaining >= 0) {
      status = 'EXPIRING';
    }

    // 2. Prepare member record
    const newMember: MemberRecord = {
      id: newMemberId,
      memberId: formattedMemberCode,
      name: input.name.trim(),
      email: input.email?.trim() || `${input.name.toLowerCase().replace(/\s+/g, '.')}@example.com`,
      phone: input.phone.trim(),
      photo: input.photo,
      emergencyContactName: input.emergencyContactName?.trim(),
      emergencyContactPhone: input.emergencyContactPhone?.trim(),
      joiningDate: input.joiningDate,
      planId: input.planId,
      planName: input.planName,
      planCategory: input.planCategory || 'Regular',
      expiryDate: input.nextDueDate || 'One-time',
      daysRemaining,
      isEstimatedDueDate: !!input.isEstimatedDueDate,
      assignedTrainer: input.assignedTrainer || 'Floor General',
      status,
      isActiveDot: true,
      paymentStatus: computeMemberPaymentStatus(daysRemaining),
      attendanceCount: 0,
      pathType: input.pathType,
    };

    // 3. Prepare member_plans record
    const newPlanRecord: MemberPlanRecord = {
      id: `mp-${Date.now()}`,
      memberId: newMemberId,
      planTypeId: input.planId,
      planName: input.planName,
      planCategory: input.planCategory || 'Regular',
      startDate: input.joiningDate,
      nextDueDate: input.nextDueDate || 'One-time',
      feeAmount: input.paymentDetails?.amount || 0,
      isEstimatedDueDate: !!input.isEstimatedDueDate,
    };

    // 4. If payment toggle is ON: Create receipts record
    if (input.recordPaymentNow && input.paymentDetails) {
      const baseAmount = Number(input.paymentDetails.amount) || 0;
      const tax = Math.round(baseAmount * 0.18);
      const total = baseAmount + tax;
      const receiptNo = `REC-2024-${String(Date.now()).slice(-4)}`;

      createdReceipt = {
        id: `rec-${Date.now()}`,
        receiptNo,
        memberId: newMemberId,
        memberName: newMember.name,
        memberPhone: newMember.phone,
        plan: newMember.planName,
        amount: baseAmount,
        tax,
        total,
        paymentDate: input.paymentDetails.paymentDate || new Date().toISOString().split('T')[0],
        paymentMode: input.paymentDetails.paymentMode || 'UPI',
        referenceNo:
          input.paymentDetails.referenceNo?.trim() ||
          `${input.paymentDetails.paymentMode || 'UPI'}/${Date.now().toString().slice(-6)}`,
        status: 'PAID',
      };

      appendReceipt(createdReceipt);
    }

    // 5. Commit member and plan records atomically
    const updatedMembers = [newMember, ...membersSnapshot];
    const updatedPlans = [newPlanRecord, ...plansSnapshot];

    setStoredMembers(updatedMembers);
    setStoredMemberPlans(updatedPlans);
    membersList = updatedMembers;
    memberPlansList = updatedPlans;

    return await simulateNetworkDelay({ member: newMember, plan: newPlanRecord, receipt: createdReceipt }, 350);
  } catch (error) {
    setStoredMembers(membersSnapshot);
    setStoredMemberPlans(plansSnapshot);
    membersList = membersSnapshot;
    memberPlansList = plansSnapshot;
    console.error('Member creation transaction failed and was rolled back:', error);
    throw error;
  }
};

export const updateMemberDueDateOverride = async (
  memberId: string,
  newDueDate: string
): Promise<MemberRecord> => {
  try {
    const res = await fetchWithAuth(`${API_BASE}/v1/members/${memberId}`, {
      method: 'PUT',
      body: JSON.stringify({ nextDueDate: newDueDate, isEstimatedDueDate: false }),
    });
    if (res.ok) {
      const json = await res.json();
      const updated: MemberRecord = json.data;
      const current = getStoredMembers();
      const idx = current.findIndex((m) => m.id === memberId || m.memberId === memberId);
      if (idx !== -1) {
        current[idx] = updated;
        setStoredMembers(current);
      }
      return updated;
    }
  } catch (err) {
    console.warn('API error in updateMemberDueDateOverride, using local fallback:', err);
  }

  const current = getStoredMembers();
  const index = current.findIndex((m) => m.id === memberId);
  if (index === -1) throw new Error('Member not found');

  const daysRemaining = computeDaysRemaining(newDueDate);
  let status: 'ACTIVE' | 'EXPIRING' | 'EXPIRED' | 'FROZEN' = 'ACTIVE';
  if (daysRemaining < 0) {
    status = 'EXPIRED';
  } else if (daysRemaining <= 7 && daysRemaining >= 0) {
    status = 'EXPIRING';
  }

  current[index] = {
    ...current[index],
    expiryDate: newDueDate,
    daysRemaining,
    isEstimatedDueDate: false,
    status,
  };

  setStoredMembers(current);
  membersList = current;
  return simulateNetworkDelay(current[index], 250);
};

export const renewMemberPlan = async (
  memberId: string,
  planName = 'Annual Premium'
): Promise<MemberRecord> => {
  const current = getStoredMembers();
  const index = current.findIndex((m) => m.id === memberId);
  if (index === -1) throw new Error('Member not found');

  const renewedDueDate = '2025-03-15'; // 1-year renewal
  current[index] = {
    ...current[index],
    planName,
    expiryDate: renewedDueDate,
    daysRemaining: 365,
    isEstimatedDueDate: false,
    status: 'ACTIVE',
  };

  setStoredMembers(current);
  membersList = current;
  return simulateNetworkDelay(current[index], 250);
};

/**
 * SUBMIT MEMBER REGISTRATION:
 * If role is 'admin': Auto-approved immediately via atomic save.
 * If role is 'trainer': Saves to Pending Registration queue with status 'pending_approval' (zero effect on All Members or Dashboard).
 */
export const submitMemberRegistration = async (
  input: SaveMemberInput,
  submitterRole: 'admin' | 'trainer' = 'admin',
  submitterName = 'Staff Admin'
): Promise<{
  isAutoApproved: boolean;
  member?: MemberRecord;
  plan?: MemberPlanRecord;
  receipt?: ReceiptItem;
  pendingRegistration?: PendingRegistrationRecord;
}> => {
  if (submitterRole === 'admin') {
    const result = await createMemberAtomic(input);
    return { isAutoApproved: true, ...result };
  }

  // Trainer path -> Save to pending registrations queue
  const pendingList = getStoredPendingRegistrations();
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const newPending: PendingRegistrationRecord = {
    id: `preg-${Date.now()}`,
    name: input.name.trim(),
    phone: input.phone.trim(),
    email: input.email?.trim() || `${input.name.toLowerCase().replace(/\s+/g, '.')}@example.com`,
    photo: input.photo,
    emergencyContactName: input.emergencyContactName?.trim(),
    emergencyContactPhone: input.emergencyContactPhone?.trim(),
    joiningDate: input.joiningDate,
    planId: input.planId,
    planName: input.planName,
    planCategory: input.planCategory || 'Regular',
    nextDueDate: input.nextDueDate || 'One-time',
    isEstimatedDueDate: !!input.isEstimatedDueDate,
    assignedTrainer: input.assignedTrainer || submitterName,
    pathType: input.pathType,
    submittedBy: submitterName,
    submittedRole: 'trainer',
    submittedOn: `${dateStr} ${timeStr}`,
    paymentIncluded: !!input.recordPaymentNow,
    paymentDetails: input.recordPaymentNow ? input.paymentDetails : undefined,
    status: 'pending_approval',
  };

  const updatedPending = [newPending, ...pendingList];
  setStoredPendingRegistrations(updatedPending);

  return simulateNetworkDelay({ isAutoApproved: false, pendingRegistration: newPending }, 300);
};

/**
 * APPROVE PENDING REGISTRATION:
 * One-click action by Admin.
 * Executes real atomic save (creates member + plan + receipt if payment included).
 * Leaves pending queue and decrements live badge count.
 */
export const approvePendingRegistration = async (
  pendingId: string
): Promise<{ member: MemberRecord; plan: MemberPlanRecord; receipt?: ReceiptItem }> => {
  const pendingList = getStoredPendingRegistrations();
  const target = pendingList.find((p) => p.id === pendingId);
  if (!target) throw new Error('Pending registration record not found');

  // Convert to SaveMemberInput and execute atomic creation
  const saveInput: SaveMemberInput = {
    pathType: target.pathType,
    name: target.name,
    phone: target.phone,
    email: target.email,
    photo: target.photo,
    emergencyContactName: target.emergencyContactName,
    emergencyContactPhone: target.emergencyContactPhone,
    joiningDate: target.joiningDate,
    planId: target.planId,
    planName: target.planName,
    planCategory: target.planCategory,
    assignedTrainer: target.assignedTrainer,
    nextDueDate: target.nextDueDate,
    isEstimatedDueDate: target.isEstimatedDueDate,
    recordPaymentNow: target.paymentIncluded && !!target.paymentDetails,
    paymentDetails: target.paymentDetails,
  };

  const created = await createMemberAtomic(saveInput);

  // Update status in pending list
  const updatedPending = pendingList.map((p) =>
    p.id === pendingId ? { ...p, status: 'approved' as const } : p
  );
  setStoredPendingRegistrations(updatedPending);

  return created;
};

/**
 * REJECT PENDING REGISTRATION:
 * Requires mandatory rejection reason.
 * Nothing is created in members or receipts.
 */
export const rejectPendingRegistration = async (
  pendingId: string,
  reason: string
): Promise<PendingRegistrationRecord> => {
  if (!reason.trim()) throw new Error('A rejection reason is mandatory');

  const pendingList = getStoredPendingRegistrations();
  const target = pendingList.find((p) => p.id === pendingId);
  if (!target) throw new Error('Pending registration record not found');

  target.status = 'rejected';
  target.rejectionReason = reason.trim();

  const updatedPending = pendingList.map((p) => (p.id === pendingId ? target : p));
  setStoredPendingRegistrations(updatedPending);

  return simulateNetworkDelay(target, 250);
};

/**
 * Recalculates the member's Next Due Date as `previous due date + plan duration`
 * (NOT from payment date, so billing cycles never drift when payment is made early/late).
 * Also automatically confirms due date (clearing isEstimatedDueDate).
 */
export const updateMemberDueDateCycle = async (
  memberId: string,
  durationUnit: string,
  durationValue: number
): Promise<MemberRecord> => {
  const current = getStoredMembers();
  const index = current.findIndex((m) => m.id === memberId);
  if (index === -1) throw new Error('Member not found');

  const prevDueDate = current[index].expiryDate;
  const baseDate = prevDueDate && prevDueDate !== 'One-time' && !isNaN(new Date(prevDueDate).getTime())
    ? new Date(prevDueDate)
    : new Date('2024-03-14');

  if (durationUnit === 'Days') {
    baseDate.setDate(baseDate.getDate() + (durationValue || 30));
  } else if (durationUnit === 'Years') {
    baseDate.setFullYear(baseDate.getFullYear() + (durationValue || 1));
  } else if (durationUnit === 'One-time') {
    // Keep One-time
  } else {
    // Months
    baseDate.setMonth(baseDate.getMonth() + (durationValue || 1));
  }

  const newDueDateStr = durationUnit === 'One-time' ? 'One-time' : baseDate.toISOString().split('T')[0];
  const daysRemaining = computeDaysRemaining(newDueDateStr);

  current[index] = {
    ...current[index],
    expiryDate: newDueDateStr,
    daysRemaining,
    isEstimatedDueDate: false, // Confirmed by real payment receipt
    status: daysRemaining < 0 ? 'EXPIRED' : daysRemaining <= 7 ? 'EXPIRING' : 'ACTIVE',
    isActiveDot: true,
    paymentStatus: computeMemberPaymentStatus(daysRemaining),
  };

  setStoredMembers(current);
  membersList = current;
  return simulateNetworkDelay(current[index], 200);
};

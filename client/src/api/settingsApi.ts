import {
  PaymentTypeItem,
  BankAccountItem,
  PlanTypeItem,
  DurationUnit,
} from './types';
import { fetchWithAuth, API_BASE } from './authFetch';

// Default fallback mock initializations for tenant
const DEFAULT_PAYMENT_TYPES: PaymentTypeItem[] = [
  { id: 'pt-upi', name: 'UPI', isActive: true, createdAt: '2024-01-01' },
  { id: 'pt-bank', name: 'Bank Transfer', isActive: true, createdAt: '2024-01-01' },
  { id: 'pt-card', name: 'Card', isActive: true, createdAt: '2024-01-01' },
  { id: 'pt-cash', name: 'Cash', isActive: true, createdAt: '2024-01-01' },
  { id: 'pt-cheque', name: 'Cheque', isActive: true, createdAt: '2024-01-01' },
];

const DEFAULT_BANK_ACCOUNTS: BankAccountItem[] = [
  {
    id: 'bnk-1',
    bankName: 'HDFC Bank',
    accountName: 'HDFC Current A/C',
    accountHolderName: 'TWELVO GYM & FITNESS',
    accountNumber: '50200012345678',
    ifscCode: 'HDFC0001234',
    branchName: 'Koramangala 4th Block',
    isPrimary: true,
    isActive: true,
  },
];

const DEFAULT_PLAN_TYPES: PlanTypeItem[] = [
  {
    id: 'fee-1',
    name: 'Monthly Gold',
    category: 'Regular',
    durationValue: 1,
    durationUnit: 'Months',
    displayDuration: '1 Month',
    standardFee: 2500,
    isActive: true,
  },
  {
    id: 'fee-2',
    name: 'Quarterly Fitness',
    category: 'Regular',
    durationValue: 3,
    durationUnit: 'Months',
    displayDuration: '3 Months',
    standardFee: 6500,
    isActive: true,
  },
  {
    id: 'fee-3',
    name: 'Annual Premium',
    category: 'Regular',
    durationValue: 1,
    durationUnit: 'Years',
    displayDuration: '1 Year',
    standardFee: 22000,
    isActive: true,
  },
  {
    id: 'fee-4',
    name: 'Registration Fee',
    category: 'Regular',
    durationValue: 0,
    durationUnit: 'One-time',
    displayDuration: 'One-time',
    standardFee: 1000,
    isActive: true,
  },
];

// In-memory state with localStorage fallback
const getStored = <T>(key: string, fallback: T): T => {
  try {
    const item = localStorage.getItem(`gymerp_settings_${key}`);
    return item ? JSON.parse(item) : fallback;
  } catch {
    return fallback;
  }
};

const setStored = <T>(key: string, data: T) => {
  try {
    localStorage.setItem(`gymerp_settings_${key}`, JSON.stringify(data));
  } catch {}
};

let paymentTypes: PaymentTypeItem[] = getStored('payment_types', DEFAULT_PAYMENT_TYPES);
let bankAccounts: BankAccountItem[] = getStored('bank_accounts', DEFAULT_BANK_ACCOUNTS);
let planTypes: PlanTypeItem[] = getStored('plan_types', DEFAULT_PLAN_TYPES);

const computeDisplayDuration = (val: number, unit: DurationUnit): string => {
  if (unit === 'One-time') return 'One-time';
  if (val === 1) {
    return `1 ${unit.slice(0, -1)}`;
  }
  return `${val} ${unit}`;
};

// =========================================================================
// SECTION 1: Payment Types API
// =========================================================================

export const getPaymentTypes = async (): Promise<PaymentTypeItem[]> => {
  try {
    const res = await fetchWithAuth(`${API_BASE}/v1/settings/payment-types`);
    if (res.ok) {
      const json = await res.json();
      if (json.data && Array.isArray(json.data)) {
        paymentTypes = json.data;
        setStored('payment_types', paymentTypes);
        return paymentTypes;
      }
    }
  } catch {
    // Fallback to local
  }
  return paymentTypes;
};

export const addPaymentType = async (name: string): Promise<PaymentTypeItem> => {
  const trimmed = name.trim();
  try {
    const res = await fetchWithAuth(`${API_BASE}/v1/settings/payment-types`, {
      method: 'POST',
      body: JSON.stringify({ name: trimmed }),
    });
    if (res.ok) {
      const json = await res.json();
      if (json.data) {
        paymentTypes = [...paymentTypes, json.data];
        setStored('payment_types', paymentTypes);
        return json.data;
      }
    }
  } catch {
    // Fallback
  }

  const newItem: PaymentTypeItem = {
    id: `pt-${Date.now()}`,
    name: trimmed,
    isActive: true,
    createdAt: new Date().toISOString().split('T')[0],
  };
  paymentTypes = [...paymentTypes, newItem];
  setStored('payment_types', paymentTypes);
  return newItem;
};

export const updatePaymentType = async (id: string, name: string): Promise<PaymentTypeItem> => {
  const item = paymentTypes.find((p) => p.id === id);
  if (!item) throw new Error('Payment type not found');
  item.name = name.trim();
  paymentTypes = [...paymentTypes];
  setStored('payment_types', paymentTypes);
  return item;
};

export const togglePaymentTypeStatus = async (id: string): Promise<PaymentTypeItem> => {
  try {
    const res = await fetchWithAuth(`${API_BASE}/v1/settings/payment-types/${id}/toggle`, {
      method: 'PATCH',
    });
    if (res.ok) {
      const json = await res.json();
      if (json.data) {
        paymentTypes = paymentTypes.map((p) => (p.id === id ? json.data : p));
        setStored('payment_types', paymentTypes);
        return json.data;
      }
    }
  } catch {
    // Fallback
  }

  const item = paymentTypes.find((p) => p.id === id);
  if (!item) throw new Error('Payment type not found');
  item.isActive = !item.isActive;
  paymentTypes = [...paymentTypes];
  setStored('payment_types', paymentTypes);
  return item;
};

// =========================================================================
// SECTION 2: Banks API
// =========================================================================

export const getBankAccounts = async (): Promise<BankAccountItem[]> => {
  try {
    const res = await fetchWithAuth(`${API_BASE}/v1/settings/banks`);
    if (res.ok) {
      const json = await res.json();
      if (json.data && Array.isArray(json.data)) {
        bankAccounts = json.data;
        setStored('bank_accounts', bankAccounts);
        return bankAccounts;
      }
    }
  } catch {
    // Fallback
  }
  return bankAccounts;
};

export interface CreateBankAccountInput {
  bankName: string;
  accountName?: string;
  accountHolderName: string;
  accountNumber: string;
  ifscCode: string;
  branchName?: string;
  upiHandle?: string;
  isPrimary?: boolean;
}

export const addBankAccount = async (input: CreateBankAccountInput): Promise<BankAccountItem> => {
  try {
    const res = await fetchWithAuth(`${API_BASE}/v1/settings/banks`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
    if (res.ok) {
      const json = await res.json();
      if (json.data) {
        if (input.isPrimary) {
          bankAccounts = bankAccounts.map((b) => ({ ...b, isPrimary: false }));
        }
        bankAccounts = [...bankAccounts, json.data];
        setStored('bank_accounts', bankAccounts);
        return json.data;
      }
    }
  } catch {
    // Fallback
  }

  if (input.isPrimary) {
    bankAccounts = bankAccounts.map((b) => ({ ...b, isPrimary: false }));
  }

  const newBank: BankAccountItem = {
    id: `bnk-${Date.now()}`,
    bankName: input.bankName.trim(),
    accountName: input.accountName || `${input.bankName} Account`,
    accountHolderName: input.accountHolderName.trim(),
    accountNumber: input.accountNumber.trim(),
    ifscCode: input.ifscCode.trim().toUpperCase(),
    branchName: input.branchName?.trim() || 'Main Branch',
    upiHandle: input.upiHandle?.trim() || undefined,
    isPrimary: !!input.isPrimary,
    isActive: true,
  };

  bankAccounts = [...bankAccounts, newBank];
  setStored('bank_accounts', bankAccounts);
  return newBank;
};

export const updateBankAccount = async (
  id: string,
  input: Partial<CreateBankAccountInput>
): Promise<BankAccountItem> => {
  try {
    const res = await fetchWithAuth(`${API_BASE}/v1/settings/banks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    });
    if (res.ok) {
      const json = await res.json();
      if (json.data) {
        if (input.isPrimary) {
          bankAccounts = bankAccounts.map((b) => ({ ...b, isPrimary: b.id === id }));
        }
        bankAccounts = bankAccounts.map((b) => (b.id === id ? json.data : b));
        setStored('bank_accounts', bankAccounts);
        return json.data;
      }
    }
  } catch {
    // Fallback
  }

  const index = bankAccounts.findIndex((b) => b.id === id);
  if (index === -1) throw new Error('Bank account not found');

  if (input.isPrimary) {
    bankAccounts = bankAccounts.map((b) => ({ ...b, isPrimary: false }));
  }

  bankAccounts[index] = {
    ...bankAccounts[index],
    ...input,
    bankName: input.bankName ? input.bankName.trim() : bankAccounts[index].bankName,
    accountHolderName: input.accountHolderName
      ? input.accountHolderName.trim()
      : bankAccounts[index].accountHolderName,
    accountNumber: input.accountNumber
      ? input.accountNumber.trim()
      : bankAccounts[index].accountNumber,
    ifscCode: input.ifscCode
      ? input.ifscCode.trim().toUpperCase()
      : bankAccounts[index].ifscCode,
    upiHandle: input.upiHandle !== undefined ? input.upiHandle.trim() : bankAccounts[index].upiHandle,
  };

  setStored('bank_accounts', bankAccounts);
  return bankAccounts[index];
};

export const toggleBankAccountStatus = async (id: string): Promise<BankAccountItem> => {
  try {
    const res = await fetchWithAuth(`${API_BASE}/v1/settings/banks/${id}/toggle`, {
      method: 'PATCH',
    });
    if (res.ok) {
      const json = await res.json();
      if (json.data) {
        bankAccounts = bankAccounts.map((b) => (b.id === id ? json.data : b));
        setStored('bank_accounts', bankAccounts);
        return json.data;
      }
    }
  } catch {
    // Fallback
  }

  const item = bankAccounts.find((b) => b.id === id);
  if (!item) throw new Error('Bank account not found');
  item.isActive = !item.isActive;
  setStored('bank_accounts', bankAccounts);
  return item;
};

export const setPrimaryBankAccount = async (id: string): Promise<BankAccountItem[]> => {
  try {
    const res = await fetchWithAuth(`${API_BASE}/v1/settings/banks/${id}/primary`, {
      method: 'PATCH',
    });
    if (res.ok) {
      const json = await res.json();
      if (json.data && Array.isArray(json.data)) {
        bankAccounts = json.data;
        setStored('bank_accounts', bankAccounts);
        return bankAccounts;
      }
    }
  } catch {
    // Fallback
  }

  bankAccounts = bankAccounts.map((b) => ({
    ...b,
    isPrimary: b.id === id,
    isActive: b.id === id ? true : b.isActive,
  }));
  setStored('bank_accounts', bankAccounts);
  return bankAccounts;
};

export const deleteBankAccount = async (id: string): Promise<void> => {
  try {
    const res = await fetchWithAuth(`${API_BASE}/v1/settings/banks/${id}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      bankAccounts = bankAccounts.filter((b) => b.id !== id);
      setStored('bank_accounts', bankAccounts);
      return;
    }
  } catch {
    // Fallback
  }

  bankAccounts = bankAccounts.filter((b) => b.id !== id);
  setStored('bank_accounts', bankAccounts);
};

// =========================================================================
// SECTION 3: Fee / Plan Types API (Plans Catalog)
// =========================================================================

export const getPlanTypes = async (): Promise<PlanTypeItem[]> => {
  try {
    const res = await fetchWithAuth(`${API_BASE}/v1/settings/plans`);
    if (res.ok) {
      const json = await res.json();
      if (json.data && Array.isArray(json.data)) {
        planTypes = json.data;
        setStored('plan_types', planTypes);
        return planTypes;
      }
    }
  } catch {
    // Fallback
  }
  return planTypes;
};

export const getFeeTypes = getPlanTypes;

export interface CreatePlanTypeInput {
  name: string;
  category?: 'Regular' | 'Personal Training' | string;
  durationValue: number;
  durationUnit: DurationUnit;
  standardFee?: number;
}

export const addPlanType = async (input: CreatePlanTypeInput): Promise<PlanTypeItem> => {
  try {
    const res = await fetchWithAuth(`${API_BASE}/v1/settings/plans`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
    if (res.ok) {
      const json = await res.json();
      if (json.data) {
        planTypes = [...planTypes, json.data];
        setStored('plan_types', planTypes);
        return json.data;
      }
    }
  } catch {
    // Fallback
  }

  const newPlan: PlanTypeItem = {
    id: `fee-${Date.now()}`,
    name: input.name.trim(),
    category: input.category || 'Regular',
    durationValue: input.durationUnit === 'One-time' ? 0 : Number(input.durationValue) || 1,
    durationUnit: input.durationUnit,
    displayDuration: computeDisplayDuration(
      input.durationUnit === 'One-time' ? 0 : Number(input.durationValue) || 1,
      input.durationUnit
    ),
    standardFee: Number(input.standardFee) || 2000,
    isActive: true,
  };

  planTypes = [...planTypes, newPlan];
  setStored('plan_types', planTypes);
  return newPlan;
};

export const updatePlanType = async (
  id: string,
  input: CreatePlanTypeInput
): Promise<PlanTypeItem> => {
  try {
    const res = await fetchWithAuth(`${API_BASE}/v1/settings/plans/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    });
    if (res.ok) {
      const json = await res.json();
      if (json.data) {
        planTypes = planTypes.map((p) => (p.id === id ? json.data : p));
        setStored('plan_types', planTypes);
        return json.data;
      }
    }
  } catch {
    // Fallback
  }

  const item = planTypes.find((p) => p.id === id);
  if (!item) throw new Error('Plan type not found');

  item.name = input.name.trim();
  if (input.category) item.category = input.category;
  item.durationUnit = input.durationUnit;
  item.durationValue = input.durationUnit === 'One-time' ? 0 : Number(input.durationValue) || 1;
  item.displayDuration = computeDisplayDuration(item.durationValue, item.durationUnit);
  if (input.standardFee !== undefined) item.standardFee = Number(input.standardFee);

  setStored('plan_types', planTypes);
  return item;
};

export const togglePlanTypeStatus = async (id: string): Promise<PlanTypeItem> => {
  try {
    const res = await fetchWithAuth(`${API_BASE}/v1/settings/plans/${id}/toggle`, {
      method: 'PATCH',
    });
    if (res.ok) {
      const json = await res.json();
      if (json.data) {
        planTypes = planTypes.map((p) => (p.id === id ? json.data : p));
        setStored('plan_types', planTypes);
        return json.data;
      }
    }
  } catch {
    // Fallback
  }

  const item = planTypes.find((p) => p.id === id);
  if (!item) throw new Error('Plan type not found');
  item.isActive = !item.isActive;
  setStored('plan_types', planTypes);
  return item;
};

export const deletePlanType = async (id: string): Promise<void> => {
  try {
    const res = await fetchWithAuth(`${API_BASE}/v1/settings/plans/${id}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      planTypes = planTypes.filter((p) => p.id !== id);
      setStored('plan_types', planTypes);
      return;
    }
  } catch {
    // Fallback
  }

  planTypes = planTypes.filter((p) => p.id !== id);
  setStored('plan_types', planTypes);
};

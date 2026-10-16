import { fetchWithAuth, API_BASE } from './authFetch';
import {
  ExpenseItem,
  ExpenseTypeItem,
  ExpenseSummary,
  CreateExpenseInput,
  UpdateExpenseInput,
  CreateExpenseTypeInput,
  UpdateExpenseTypeInput,
  ExpenseFilters,
} from './types';

// =========================================================================
// EXPENSES API
// =========================================================================

export async function getExpenses(filters: ExpenseFilters = {}): Promise<ExpenseItem[]> {
  const params = new URLSearchParams();
  if (filters.expenseTypeId) params.append('expenseTypeId', filters.expenseTypeId);
  if (filters.paymentMode) params.append('paymentMode', filters.paymentMode);
  if (filters.startDate) params.append('startDate', filters.startDate);
  if (filters.endDate) params.append('endDate', filters.endDate);
  if (filters.search) params.append('search', filters.search);
  if (filters.source) params.append('source', filters.source);

  const query = params.toString() ? `?${params.toString()}` : '';
  const res = await fetchWithAuth(`${API_BASE}/expenses${query}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to fetch expenses');
  return data.data || [];
}

export async function getExpenseById(id: string): Promise<ExpenseItem> {
  const res = await fetchWithAuth(`${API_BASE}/expenses/${id}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to fetch expense details');
  return data.data;
}

export async function createExpense(input: CreateExpenseInput): Promise<ExpenseItem> {
  const res = await fetchWithAuth(`${API_BASE}/expenses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to record expense');
  return data.data;
}

export async function updateExpense(id: string, input: UpdateExpenseInput): Promise<ExpenseItem> {
  const res = await fetchWithAuth(`${API_BASE}/expenses/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to update expense');
  return data.data;
}

export async function deleteExpense(id: string): Promise<void> {
  const res = await fetchWithAuth(`${API_BASE}/expenses/${id}`, {
    method: 'DELETE',
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to delete expense');
}

export async function getExpenseSummary(startDate?: string, endDate?: string): Promise<ExpenseSummary> {
  const params = new URLSearchParams();
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);

  const query = params.toString() ? `?${params.toString()}` : '';
  const res = await fetchWithAuth(`${API_BASE}/expenses/summary${query}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to fetch expense summary');
  return data.data || {
    totalAmount: 0,
    totalCount: 0,
    operationalExpenses: 0,
    salaryExpenses: 0,
    cashAmount: 0,
    bankAmount: 0,
    byCategory: [],
  };
}

// =========================================================================
// EXPENSE TYPES API
// =========================================================================

export async function getExpenseTypes(): Promise<ExpenseTypeItem[]> {
  const res = await fetchWithAuth(`${API_BASE}/expenses/types`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to fetch expense types');
  return data.data || [];
}

export async function createExpenseType(input: CreateExpenseTypeInput): Promise<ExpenseTypeItem> {
  const res = await fetchWithAuth(`${API_BASE}/expenses/types`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to create expense type');
  return data.data;
}

export async function updateExpenseType(id: string, input: UpdateExpenseTypeInput): Promise<ExpenseTypeItem> {
  const res = await fetchWithAuth(`${API_BASE}/expenses/types/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to update expense type');
  return data.data;
}

export async function toggleExpenseTypeStatus(id: string): Promise<ExpenseTypeItem> {
  const res = await fetchWithAuth(`${API_BASE}/expenses/types/${id}/toggle`, {
    method: 'PATCH',
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to update expense type status');
  return data.data;
}

export async function deleteExpenseType(id: string): Promise<void> {
  const res = await fetchWithAuth(`${API_BASE}/expenses/types/${id}`, {
    method: 'DELETE',
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to delete expense type');
}

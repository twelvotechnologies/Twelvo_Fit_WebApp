import { useState, useEffect, useMemo } from 'react';
import {
  Receipt,
  Plus,
  Search,
  Download,
  Building2,
  Wallet,
  TrendingDown,
  Tag,
  CreditCard,
  Edit2,
  Trash2,
  Eye,
  X,
  AlertCircle,
  RefreshCw,
  UserCheck,
} from 'lucide-react';
import {
  getExpenses,
  getExpenseSummary,
  getExpenseTypes,
  createExpense,
  updateExpense,
  deleteExpense,
} from '../../api/expensesApi';
import { getBankAccounts } from '../../api/settingsApi';
import {
  ExpenseItem,
  ExpenseTypeItem,
  ExpenseSummary,
  ExpensePaymentMode,
  CreateExpenseInput,
  BankAccountItem,
} from '../../api/types';

const formatINR = (val: number) =>
  '₹ ' + (val || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [expenseTypes, setExpenseTypes] = useState<ExpenseTypeItem[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccountItem[]>([]);
  const [summary, setSummary] = useState<ExpenseSummary | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedMode, setSelectedMode] = useState<string>('ALL');
  const [sourceFilter, setSourceFilter] = useState<'ALL' | 'MANUAL' | 'SALARY'>('ALL');
  const [dateFilter, setDateFilter] = useState<'THIS_MONTH' | 'LAST_MONTH' | 'LAST_90D' | 'ALL'>('THIS_MONTH');

  // Modals & Drawers
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseItem | null>(null);
  const [viewingExpense, setViewingExpense] = useState<ExpenseItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Form State
  const [form, setForm] = useState<CreateExpenseInput>({
    title: '',
    expenseTypeId: '',
    amount: 0,
    expenseDate: new Date().toISOString().split('T')[0],
    paymentMode: 'CASH',
    bankAccountId: '',
    referenceNo: '',
    notes: '',
  });

  // Calculate Date Bounds
  const dateRange = useMemo(() => {
    const now = new Date();
    if (dateFilter === 'THIS_MONTH') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
      return { start, end };
    }
    if (dateFilter === 'LAST_MONTH') {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
      const end = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];
      return { start, end };
    }
    if (dateFilter === 'LAST_90D') {
      const start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const end = now.toISOString().split('T')[0];
      return { start, end };
    }
    return { start: undefined, end: undefined };
  }, [dateFilter]);

  const loadData = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const [exps, smm, types, banks] = await Promise.all([
        getExpenses({
          startDate: dateRange.start,
          endDate: dateRange.end,
          expenseTypeId: selectedType !== 'ALL' ? selectedType : undefined,
          paymentMode: selectedMode !== 'ALL' ? selectedMode : undefined,
          source: sourceFilter,
        }),
        getExpenseSummary(dateRange.start, dateRange.end),
        getExpenseTypes(),
        getBankAccounts(),
      ]);

      setExpenses(exps);
      setSummary(smm);
      setExpenseTypes(types);
      setBankAccounts(banks.filter((b) => b.isActive));
    } catch (err: any) {
      console.error('Failed to load expenses', err);
      setErrorMsg(err.message || 'Failed to load expenses data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [dateFilter, selectedType, selectedMode, sourceFilter]);

  const handleOpenAddModal = () => {
    setEditingExpense(null);
    setForm({
      title: '',
      expenseTypeId: expenseTypes.find((t) => t.isActive && !t.isSystem)?.id || expenseTypes[0]?.id || '',
      amount: 0,
      expenseDate: new Date().toISOString().split('T')[0],
      paymentMode: 'CASH',
      bankAccountId: bankAccounts[0]?.id || '',
      referenceNo: '',
      notes: '',
    });
    setErrorMsg('');
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (item: ExpenseItem) => {
    if (item.isSalaryExpense) {
      alert('Salary payout expenses are generated and synchronized with the Payroll module. Edit them from Payroll.');
      return;
    }
    setEditingExpense(item);
    setForm({
      title: item.title,
      expenseTypeId: item.expenseTypeId,
      amount: item.amount,
      expenseDate: item.expenseDate,
      paymentMode: item.paymentMode,
      bankAccountId: item.bankAccountId || '',
      referenceNo: item.referenceNo || '',
      notes: item.notes || '',
    });
    setErrorMsg('');
    setIsAddModalOpen(true);
  };

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      setErrorMsg('Please provide an expense title.');
      return;
    }
    if (Number(form.amount) <= 0) {
      setErrorMsg('Amount must be greater than zero.');
      return;
    }
    if (!form.expenseTypeId) {
      setErrorMsg('Please select an expense category.');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg('');

      if (editingExpense) {
        await updateExpense(editingExpense.id, {
          title: form.title.trim(),
          expenseTypeId: form.expenseTypeId,
          amount: Number(form.amount),
          expenseDate: form.expenseDate,
          paymentMode: form.paymentMode,
          bankAccountId: form.paymentMode !== 'CASH' && form.paymentMode !== 'OTHER' ? form.bankAccountId || undefined : undefined,
          referenceNo: form.referenceNo?.trim() || undefined,
          notes: form.notes?.trim() || undefined,
        });
      } else {
        await createExpense({
          title: form.title.trim(),
          expenseTypeId: form.expenseTypeId,
          amount: Number(form.amount),
          expenseDate: form.expenseDate,
          paymentMode: form.paymentMode,
          bankAccountId: form.paymentMode !== 'CASH' && form.paymentMode !== 'OTHER' ? form.bankAccountId || undefined : undefined,
          referenceNo: form.referenceNo?.trim() || undefined,
          notes: form.notes?.trim() || undefined,
        });
      }

      setIsAddModalOpen(false);
      await loadData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save expense');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteExpense = async (item: ExpenseItem) => {
    if (item.isSalaryExpense) {
      alert('Cannot delete salary payouts here. Manage or cancel salary slips in the Payroll module.');
      return;
    }
    const confirmed = window.confirm(
      `Are you sure you want to delete expense "${item.title}" for ${formatINR(item.amount)}?\n\nThis will automatically reconcile your cash or bank ledger balance.`
    );
    if (!confirmed) return;

    try {
      await deleteExpense(item.id);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete expense');
    }
  };

  const handleExportCSV = () => {
    if (filteredExpenses.length === 0) {
      alert('No expense records to export.');
      return;
    }
    const headers = [
      'Expense Code',
      'Date',
      'Title',
      'Category',
      'Source',
      'Payment Mode',
      'Bank/Account',
      'Reference No',
      'Amount (INR)',
      'Staff Member',
      'Notes',
    ];

    const rows = filteredExpenses.map((e) => [
      e.expenseCode || e.id,
      e.expenseDate,
      `"${(e.title || '').replace(/"/g, '""')}"`,
      `"${(e.expenseTypeName || '').replace(/"/g, '""')}"`,
      e.isSalaryExpense ? 'Salary Payout' : 'Manual Expense',
      e.paymentMode,
      `"${(e.bankAccountName || '').replace(/"/g, '""')}"`,
      `"${(e.referenceNo || '').replace(/"/g, '""')}"`,
      e.amount,
      `"${(e.staffName || '').replace(/"/g, '""')}"`,
      `"${(e.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Gym_Expenses_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Client-side search filtering
  const filteredExpenses = useMemo(() => {
    if (!search.trim()) return expenses;
    const q = search.toLowerCase();
    return expenses.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        (e.expenseCode && e.expenseCode.toLowerCase().includes(q)) ||
        (e.expenseTypeName && e.expenseTypeName.toLowerCase().includes(q)) ||
        (e.referenceNo && e.referenceNo.toLowerCase().includes(q)) ||
        (e.staffName && e.staffName.toLowerCase().includes(q)) ||
        (e.notes && e.notes.toLowerCase().includes(q))
    );
  }, [expenses, search]);

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Top Banner & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#E2E6ED]">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#2F6FED] text-white flex items-center justify-center shadow-sm">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-heading text-xl font-bold text-[#1A2333] tracking-tight">
                Expenses & Payouts
              </h1>
              <p className="text-xs text-[#6B7686] mt-0.5">
                Track gym facility costs, utilities, inventory supplies, and trainer salary payouts
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Date Range Tabs */}
          <div className="flex items-center bg-white border border-[#E2E6ED] rounded-lg p-0.5 shadow-xs text-xs font-medium">
            <button
              onClick={() => setDateFilter('THIS_MONTH')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                dateFilter === 'THIS_MONTH' ? 'bg-[#2F6FED] text-white font-semibold' : 'text-[#6B7686] hover:text-[#1A2333]'
              }`}
            >
              This Month
            </button>
            <button
              onClick={() => setDateFilter('LAST_MONTH')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                dateFilter === 'LAST_MONTH' ? 'bg-[#2F6FED] text-white font-semibold' : 'text-[#6B7686] hover:text-[#1A2333]'
              }`}
            >
              Last Month
            </button>
            <button
              onClick={() => setDateFilter('LAST_90D')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                dateFilter === 'LAST_90D' ? 'bg-[#2F6FED] text-white font-semibold' : 'text-[#6B7686] hover:text-[#1A2333]'
              }`}
            >
              90 Days
            </button>
            <button
              onClick={() => setDateFilter('ALL')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                dateFilter === 'ALL' ? 'bg-[#2F6FED] text-white font-semibold' : 'text-[#6B7686] hover:text-[#1A2333]'
              }`}
            >
              All Time
            </button>
          </div>

          <button
            onClick={loadData}
            title="Refresh Data"
            className="p-2 border border-[#E2E6ED] rounded-lg text-[#6B7686] hover:text-[#1A2333] hover:bg-[#F5F7FA] transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 border border-[#E2E6ED] bg-white rounded-lg text-xs font-semibold text-[#1A2333] hover:bg-[#F5F7FA] shadow-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-[#6B7686]" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-[#2F6FED] hover:bg-[#2558bf] text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Record Expense</span>
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Expenses */}
        <div className="bg-white border border-[#E2E6ED] rounded-xl p-4 shadow-subtle flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-[#6B7686]">
            <span className="font-medium">Total Expenditure</span>
            <div className="w-7 h-7 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="font-heading text-2xl font-bold text-[#1A2333] tabular-nums">
              {formatINR(summary?.totalAmount || 0)}
            </span>
            <div className="text-[11px] text-[#6B7686] mt-0.5">
              {summary?.totalCount || 0} total payouts recorded
            </div>
          </div>
        </div>

        {/* Operational Costs */}
        <div className="bg-white border border-[#E2E6ED] rounded-xl p-4 shadow-subtle flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-[#6B7686]">
            <span className="font-medium">Operational Expenses</span>
            <div className="w-7 h-7 rounded-lg bg-[#E8EFFE] text-[#2F6FED] flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="font-heading text-2xl font-bold text-[#1A2333] tabular-nums">
              {formatINR(summary?.operationalExpenses || 0)}
            </span>
            <div className="text-[11px] text-[#6B7686] mt-0.5">
              Rent, electricity, utilities & repairs
            </div>
          </div>
        </div>

        {/* Salary Payouts */}
        <div className="bg-white border border-[#E2E6ED] rounded-xl p-4 shadow-subtle flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-[#6B7686]">
            <span className="font-medium">Staff Salaries</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="font-heading text-2xl font-bold text-[#1A2333] tabular-nums">
              {formatINR(summary?.salaryExpenses || 0)}
            </span>
            <div className="text-[11px] text-[#6B7686] mt-0.5">
              Auto-linked from Payroll slips
            </div>
          </div>
        </div>

        {/* Payment Channels */}
        <div className="bg-white border border-[#E2E6ED] rounded-xl p-4 shadow-subtle flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-[#6B7686]">
            <span className="font-medium">Outflow Breakdown</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#6B7686]">Bank / UPI:</span>
              <span className="font-bold text-[#1A2333] tabular-nums">
                {formatINR(summary?.bankAmount || 0)}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#6B7686]">Cash Outflow:</span>
              <span className="font-bold text-[#1A2333] tabular-nums">
                {formatINR(summary?.cashAmount || 0)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter / Source Tabs & Controls */}
      <div className="bg-white border border-[#E2E6ED] rounded-xl p-4 shadow-subtle space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Source Tabs */}
          <div className="flex items-center gap-1 bg-[#F5F7FA] p-1 rounded-lg text-xs font-medium">
            <button
              onClick={() => setSourceFilter('ALL')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                sourceFilter === 'ALL' ? 'bg-white text-[#2F6FED] font-bold shadow-xs' : 'text-[#6B7686] hover:text-[#1A2333]'
              }`}
            >
              All Payouts ({expenses.length})
            </button>
            <button
              onClick={() => setSourceFilter('MANUAL')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                sourceFilter === 'MANUAL' ? 'bg-white text-[#2F6FED] font-bold shadow-xs' : 'text-[#6B7686] hover:text-[#1A2333]'
              }`}
            >
              Operational Expenses
            </button>
            <button
              onClick={() => setSourceFilter('SALARY')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                sourceFilter === 'SALARY' ? 'bg-white text-[#2F6FED] font-bold shadow-xs' : 'text-[#6B7686] hover:text-[#1A2333]'
              }`}
            >
              Salary Payouts
            </button>
          </div>

          {/* Quick Filters: Type & Mode */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-[#F5F7FA] border border-[#E2E6ED] rounded-lg focus:outline-none focus:border-[#2F6FED] text-[#1A2333]"
            >
              <option value="ALL">All Categories</option>
              {expenseTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>

            <select
              value={selectedMode}
              onChange={(e) => setSelectedMode(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-[#F5F7FA] border border-[#E2E6ED] rounded-lg focus:outline-none focus:border-[#2F6FED] text-[#1A2333]"
            >
              <option value="ALL">All Modes</option>
              <option value="CASH">Cash</option>
              <option value="UPI">UPI</option>
              <option value="BANK">Bank Transfer</option>
              <option value="CHEQUE">Cheque</option>
              <option value="CARD">Card</option>
            </select>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7686]" />
          <input
            type="text"
            placeholder="Search by title, expense code, voucher #, staff name, or notes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-[#F5F7FA] border border-[#E2E6ED] rounded-lg focus:outline-none focus:border-[#2F6FED] focus:bg-white transition-colors"
          />
        </div>
      </div>

      {/* Main Expenses Table */}
      <div className="bg-white border border-[#E2E6ED] rounded-xl shadow-subtle overflow-hidden">
        {loading ? (
          <div className="p-8 text-center space-y-3">
            <RefreshCw className="w-6 h-6 animate-spin text-[#2F6FED] mx-auto" />
            <p className="text-xs text-[#6B7686]">Loading expenses...</p>
          </div>
        ) : filteredExpenses.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="w-12 h-12 rounded-2xl bg-[#E8EFFE] text-[#2F6FED] flex items-center justify-center mx-auto mb-3">
              <Receipt className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-[#1A2333]">No expense records found</h3>
            <p className="text-xs text-[#6B7686] mt-1 max-w-sm mx-auto">
              {search || selectedType !== 'ALL' || selectedMode !== 'ALL'
                ? 'Try adjusting your filters or date range.'
                : 'Click "Record Expense" to track your first operational expenditure.'}
            </p>
            <button
              onClick={handleOpenAddModal}
              className="mt-4 px-4 py-2 bg-[#2F6FED] text-white rounded-lg text-xs font-semibold hover:bg-[#2558bf] transition-colors"
            >
              Record First Expense
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#F5F7FA] border-b border-[#E2E6ED] text-[#6B7686] font-semibold">
                  <th className="py-3 px-4">Code & Date</th>
                  <th className="py-3 px-4">Title & Description</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Source / Type</th>
                  <th className="py-3 px-4">Payment Channel</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E6ED]">
                {filteredExpenses.map((item) => (
                  <tr key={item.id} className="hover:bg-[#F5F7FA]/70 transition-colors">
                    {/* Code & Date */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-semibold text-[#1A2333]">
                        {item.expenseCode || `EXP-${item.id}`}
                      </div>
                      <div className="text-[11px] text-[#6B7686] mt-0.5">
                        {item.expenseDate}
                      </div>
                    </td>

                    {/* Title */}
                    <td className="py-3 px-4">
                      <div className="font-medium text-[#1A2333] max-w-xs truncate" title={item.title}>
                        {item.title}
                      </div>
                      {item.notes && (
                        <div className="text-[11px] text-[#6B7686] max-w-xs truncate">
                          {item.notes}
                        </div>
                      )}
                    </td>

                    {/* Category */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#E8EFFE] text-[#2F6FED]">
                        <Tag className="w-3 h-3" />
                        {item.expenseTypeName}
                      </span>
                    </td>

                    {/* Source / Type */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      {item.isSalaryExpense ? (
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700">
                          <UserCheck className="w-3 h-3" />
                          <span>Salary: {item.staffName || 'Staff'}</span>
                        </div>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#F5F7FA] text-[#6B7686]">
                          Operational
                        </span>
                      )}
                    </td>

                    {/* Payment Channel */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 font-medium text-[#1A2333]">
                        {item.paymentMode === 'CASH' ? (
                          <Wallet className="w-3.5 h-3.5 text-amber-600" />
                        ) : (
                          <CreditCard className="w-3.5 h-3.5 text-[#2F6FED]" />
                        )}
                        <span>{item.paymentMode}</span>
                      </div>
                      {item.bankAccountName && (
                        <div className="text-[10px] text-[#6B7686] truncate max-w-[150px]">
                          {item.bankAccountName}
                        </div>
                      )}
                    </td>

                    {/* Amount */}
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <span className="font-heading font-bold text-sm text-[#1A2333] tabular-nums">
                        {formatINR(item.amount)}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setViewingExpense(item)}
                          title="View Details"
                          className="p-1 text-[#6B7686] hover:text-[#2F6FED] hover:bg-[#E8EFFE] rounded transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {!item.isSalaryExpense && (
                          <>
                            <button
                              onClick={() => handleOpenEditModal(item)}
                              title="Edit Expense"
                              className="p-1 text-[#6B7686] hover:text-[#2F6FED] hover:bg-[#E8EFFE] rounded transition-colors"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => handleDeleteExpense(item)}
                              title="Delete Expense"
                              className="p-1 text-[#6B7686] hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: RECORD / EDIT EXPENSE */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-[#E2E6ED] overflow-hidden">
            <div className="px-6 py-4 border-b border-[#E2E6ED] flex items-center justify-between bg-[#F5F7FA]/60">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#E8EFFE] text-[#2F6FED] flex items-center justify-center">
                  <Receipt className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-sm text-[#1A2333]">
                    {editingExpense ? 'Edit Expense Record' : 'Record New Expense'}
                  </h3>
                  <p className="text-[11px] text-[#6B7686]">
                    {editingExpense ? 'Update operational expense details' : 'Enter expenditure details to reconcile your gym accounts'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-[#6B7686] hover:text-[#1A2333] hover:bg-[#E2E6ED]/50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveExpense} className="p-6 space-y-4">
              {errorMsg && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-600">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-[#1A2333] mb-1">
                  Expense Title / Payee *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. October Electricity Bill, Machine Greasing, Water Tanker"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-[#E2E6ED] rounded-lg focus:outline-none focus:border-[#2F6FED]"
                />
              </div>

              {/* Category & Amount */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#1A2333] mb-1">
                    Expense Category *
                  </label>
                  <select
                    required
                    value={form.expenseTypeId}
                    onChange={(e) => setForm({ ...form, expenseTypeId: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-[#E2E6ED] rounded-lg focus:outline-none focus:border-[#2F6FED] bg-white"
                  >
                    <option value="">Select Category</option>
                    {expenseTypes
                      .filter((t) => t.isActive && !t.isSystem)
                      .map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1A2333] mb-1">
                    Amount (₹) *
                  </label>
                  <input
                    type="number"
                    min={1}
                    step="any"
                    required
                    placeholder="0.00"
                    value={form.amount || ''}
                    onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs border border-[#E2E6ED] rounded-lg focus:outline-none focus:border-[#2F6FED] tabular-nums font-semibold"
                  />
                </div>
              </div>

              {/* Date & Payment Mode */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#1A2333] mb-1">
                    Expense Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={form.expenseDate}
                    onChange={(e) => setForm({ ...form, expenseDate: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-[#E2E6ED] rounded-lg focus:outline-none focus:border-[#2F6FED]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1A2333] mb-1">
                    Payment Mode *
                  </label>
                  <select
                    value={form.paymentMode}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        paymentMode: e.target.value as ExpensePaymentMode,
                      })
                    }
                    className="w-full px-3 py-2 text-xs border border-[#E2E6ED] rounded-lg focus:outline-none focus:border-[#2F6FED] bg-white"
                  >
                    <option value="CASH">Cash Drawer</option>
                    <option value="UPI">UPI</option>
                    <option value="BANK">Bank Transfer (NEFT/IMPS)</option>
                    <option value="CHEQUE">Cheque</option>
                    <option value="CARD">Debit / Credit Card</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>

              {/* Bank Account Selection (if non-cash) */}
              {form.paymentMode !== 'CASH' && form.paymentMode !== 'OTHER' && (
                <div>
                  <label className="block text-xs font-semibold text-[#1A2333] mb-1">
                    Paid From Bank Account *
                  </label>
                  <select
                    required
                    value={form.bankAccountId || ''}
                    onChange={(e) => setForm({ ...form, bankAccountId: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-[#E2E6ED] rounded-lg focus:outline-none focus:border-[#2F6FED] bg-white"
                  >
                    <option value="">Select Account</option>
                    {bankAccounts.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.bankName} - {b.accountNumber} ({b.accountName || b.accountHolderName})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Reference & Notes */}
              <div>
                <label className="block text-xs font-semibold text-[#1A2333] mb-1">
                  Reference / Bill / Txn Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. INV-9021, UPI Ref 4102938102, Cheque #000124"
                  value={form.referenceNo || ''}
                  onChange={(e) => setForm({ ...form, referenceNo: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-[#E2E6ED] rounded-lg focus:outline-none focus:border-[#2F6FED]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1A2333] mb-1">
                  Notes / Payee Details
                </label>
                <textarea
                  rows={2}
                  placeholder="Additional context or remarks..."
                  value={form.notes || ''}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-[#E2E6ED] rounded-lg focus:outline-none focus:border-[#2F6FED] resize-none"
                />
              </div>

              <div className="pt-3 border-t border-[#E2E6ED] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3.5 py-2 border border-[#E2E6ED] rounded-lg text-xs font-medium text-[#1A2333] hover:bg-[#F5F7FA]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-[#2F6FED] hover:bg-[#2558bf] text-white rounded-lg text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Recording...' : editingExpense ? 'Update Expense' : 'Record Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW DETAILS DRAWER */}
      {viewingExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/40 backdrop-blur-xs animate-fade-in">
          <div className="bg-white h-full w-full max-w-md shadow-2xl border-l border-[#E2E6ED] flex flex-col justify-between overflow-y-auto">
            <div>
              <div className="px-6 py-5 border-b border-[#E2E6ED] flex items-center justify-between bg-[#F5F7FA]/70">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#E8EFFE] text-[#2F6FED] flex items-center justify-center">
                    <Receipt className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-heading font-bold text-sm text-[#1A2333]">
                      Expense Voucher
                    </h3>
                    <p className="text-[11px] text-[#6B7686]">
                      {viewingExpense.expenseCode || `EXP-${viewingExpense.id}`}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setViewingExpense(null)}
                  className="p-1 rounded-lg text-[#6B7686] hover:text-[#1A2333]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Hero Amount */}
                <div className="text-center p-6 bg-[#F5F7FA] rounded-xl border border-[#E2E6ED]">
                  <span className="text-[11px] text-[#6B7686] uppercase tracking-wider font-semibold">
                    Amount Paid
                  </span>
                  <div className="font-heading text-3xl font-extrabold text-[#1A2333] mt-1 tabular-nums">
                    {formatINR(viewingExpense.amount)}
                  </div>
                  <div className="inline-flex items-center gap-1 mt-2 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#E8EFFE] text-[#2F6FED]">
                    <Tag className="w-3 h-3" />
                    {viewingExpense.expenseTypeName}
                  </div>
                </div>

                {/* Details Grid */}
                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between py-2 border-b border-[#E2E6ED]">
                    <span className="text-[#6B7686]">Title:</span>
                    <span className="font-semibold text-[#1A2333] text-right">
                      {viewingExpense.title}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-2 border-b border-[#E2E6ED]">
                    <span className="text-[#6B7686]">Expense Date:</span>
                    <span className="font-medium text-[#1A2333] tabular-nums">
                      {viewingExpense.expenseDate}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-2 border-b border-[#E2E6ED]">
                    <span className="text-[#6B7686]">Payment Channel:</span>
                    <span className="font-semibold text-[#1A2333]">
                      {viewingExpense.paymentMode}
                    </span>
                  </div>

                  {viewingExpense.bankAccountName && (
                    <div className="flex items-center justify-between py-2 border-b border-[#E2E6ED]">
                      <span className="text-[#6B7686]">Account:</span>
                      <span className="font-medium text-[#1A2333]">
                        {viewingExpense.bankAccountName}
                      </span>
                    </div>
                  )}

                  {viewingExpense.referenceNo && (
                    <div className="flex items-center justify-between py-2 border-b border-[#E2E6ED]">
                      <span className="text-[#6B7686]">Reference / Txn:</span>
                      <span className="font-mono text-[#1A2333]">
                        {viewingExpense.referenceNo}
                      </span>
                    </div>
                  )}

                  {/* Salary Integration Details */}
                  {viewingExpense.isSalaryExpense && (
                    <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2">
                      <div className="flex items-center gap-1.5 text-emerald-800 font-bold text-xs">
                        <UserCheck className="w-4 h-4" />
                        <span>Connected Salary Payout</span>
                      </div>
                      <div className="text-[11px] text-emerald-700 space-y-1">
                        <div>
                          Staff Member: <strong className="text-emerald-900">{viewingExpense.staffName}</strong>
                        </div>
                        {viewingExpense.salaryMonth && (
                          <div>
                            Payroll Month: <strong className="text-emerald-900">{viewingExpense.salaryMonth}</strong>
                          </div>
                        )}
                        <div>
                          Linked Slip ID: #{viewingExpense.salarySlipId}
                        </div>
                      </div>
                    </div>
                  )}

                  {viewingExpense.notes && (
                    <div className="pt-2">
                      <span className="text-[#6B7686] block mb-1">Notes:</span>
                      <div className="p-3 bg-[#F5F7FA] rounded-lg text-[#1A2333]">
                        {viewingExpense.notes}
                      </div>
                    </div>
                  )}

                  {viewingExpense.createdByName && (
                    <div className="flex items-center justify-between pt-2 text-[11px] text-[#6B7686]">
                      <span>Recorded By:</span>
                      <span>{viewingExpense.createdByName}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-[#E2E6ED] bg-[#F5F7FA]/40">
              <button
                onClick={() => setViewingExpense(null)}
                className="w-full py-2 bg-white border border-[#E2E6ED] text-[#1A2333] hover:bg-[#F5F7FA] rounded-lg text-xs font-semibold shadow-xs transition-colors"
              >
                Close Voucher
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

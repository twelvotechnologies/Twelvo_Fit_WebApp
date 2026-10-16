import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  TrendingDown,
  Plus,
  Search,
  Filter,
  ArrowUpRight,
  ArrowDownLeft,
  X,
  RotateCcw,
  History,
} from 'lucide-react';
import {
  getAdvances,
  getDailyAttendance,
  getStaffLedger,
  createAdvance,
  recordAdvanceRepayment,
  cancelAdvance,
  SalaryAdvanceItem,
  StaffLedgerResponse,
} from '../../../api/payrollApi';
import { getBankAccounts } from '../../../api/settingsApi';
import { BankAccountItem } from '../../../api/types';

interface AdvancesTabProps {
  onNotify: (type: 'success' | 'error' | 'warning', message: string) => void;
}

const formatINR = (val: number) => '₹' + (val || 0).toLocaleString('en-IN');

export default function AdvancesTab({ onNotify }: AdvancesTabProps) {
  const [advances, setAdvances] = useState<SalaryAdvanceItem[]>([]);
  const [summary, setSummary] = useState({ totalAdvanced: 0, totalRepaid: 0, totalOutstanding: 0 });
  const [loading, setLoading] = useState(false);
  const [bankAccounts, setBankAccounts] = useState<BankAccountItem[]>([]);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Outstanding' | 'Cleared' | 'Cancelled'>('ALL');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Modals & Drawers
  const [isGiveModalOpen, setIsGiveModalOpen] = useState(false);
  const [repayAdvance, setRepayAdvance] = useState<SalaryAdvanceItem | null>(null);
  const [ledgerStaffId, setLedgerStaffId] = useState<string | null>(null);
  const [ledgerData, setLedgerData] = useState<StaffLedgerResponse | null>(null);
  const [loadingLedger, setLoadingLedger] = useState(false);

  // Give Advance Form
  const [giveForm, setGiveForm] = useState({
    staffId: '',
    amount: '',
    advanceDate: new Date().toISOString().split('T')[0],
    reason: '',
    paymentMode: 'CASH' as 'CASH' | 'UPI' | 'BANK' | 'CHEQUE',
    bankAccountId: '',
    referenceNo: '',
  });
  const [submittingGive, setSubmittingGive] = useState(false);

  // Repayment Form
  const [repayForm, setRepayForm] = useState({
    amount: '',
    repaymentDate: new Date().toISOString().split('T')[0],
    paymentMode: 'CASH' as 'CASH' | 'UPI' | 'BANK' | 'CHEQUE',
    bankAccountId: '',
    referenceNo: '',
    note: '',
  });
  const [submittingRepay, setSubmittingRepay] = useState(false);

  // Load Advances Data
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getAdvances({
        status: statusFilter,
        from: fromDate || undefined,
        to: toDate || undefined,
      });
      setAdvances(res.advances);
      setSummary(res.summary);
    } catch (err: any) {
      onNotify('error', err.message || 'Failed to load advances');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, fromDate, toDate, onNotify]);

  // Load Bank Accounts for payment selects
  useEffect(() => {
    getBankAccounts()
      .then((banks) => setBankAccounts(banks.filter((b) => b.isActive !== false)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load Staff Ledger
  const openLedger = async (staffId: string) => {
    try {
      setLedgerStaffId(staffId);
      setLoadingLedger(true);
      const res = await getStaffLedger(staffId);
      setLedgerData(res);
    } catch (err: any) {
      onNotify('error', err.message || 'Failed to load staff ledger');
      setLedgerStaffId(null);
    } finally {
      setLoadingLedger(false);
    }
  };

  const [allStaffList, setAllStaffList] = useState<{ staffId: string; staffName: string; staffCode: string }[]>([]);

  // Load active staff members for advance dropdown
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    getDailyAttendance(today)
      .then((res) => {
        setAllStaffList(
          res.staff.map((s) => ({
            staffId: s.staffId,
            staffName: s.fullName,
            staffCode: s.staffCode,
          }))
        );
      })
      .catch(() => {});
  }, []);

  // Merge loaded active staff with any existing advance staff
  const uniqueStaffList = useMemo(() => {
    const map = new Map<string, { staffId: string; staffName: string; staffCode: string }>();
    allStaffList.forEach((s) => map.set(s.staffId, s));
    advances.forEach((a) => {
      if (!map.has(a.staffId)) {
        map.set(a.staffId, {
          staffId: a.staffId,
          staffName: a.staffName,
          staffCode: a.staffCode,
        });
      }
    });
    return Array.from(map.values());
  }, [allStaffList, advances]);

  // Filtered advances for search query
  const filteredAdvances = useMemo(() => {
    if (!search.trim()) return advances;
    const q = search.toLowerCase();
    return advances.filter(
      (a) =>
        a.staffName.toLowerCase().includes(q) ||
        a.staffCode.toLowerCase().includes(q) ||
        (a.reason && a.reason.toLowerCase().includes(q)) ||
        (a.referenceNo && a.referenceNo.toLowerCase().includes(q))
    );
  }, [advances, search]);

  // Submit Give Advance
  const handleGiveAdvance = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(giveForm.amount);
    if (!giveForm.staffId) {
      onNotify('warning', 'Please select a staff member');
      return;
    }
    if (isNaN(amt) || amt <= 0) {
      onNotify('warning', 'Please enter a valid amount greater than zero');
      return;
    }
    if (giveForm.paymentMode !== 'CASH' && !giveForm.bankAccountId) {
      onNotify('warning', 'Bank account is required for non-cash advance payouts');
      return;
    }

    try {
      setSubmittingGive(true);
      await createAdvance({
        staffId: giveForm.staffId,
        amount: amt,
        advanceDate: giveForm.advanceDate,
        reason: giveForm.reason.trim() || undefined,
        paymentMode: giveForm.paymentMode,
        bankAccountId: giveForm.paymentMode !== 'CASH' ? giveForm.bankAccountId : undefined,
        referenceNo: giveForm.referenceNo.trim() || undefined,
      });

      onNotify('success', `Advance of ${formatINR(amt)} granted successfully`);
      setIsGiveModalOpen(false);
      setGiveForm({
        staffId: '',
        amount: '',
        advanceDate: new Date().toISOString().split('T')[0],
        reason: '',
        paymentMode: 'CASH',
        bankAccountId: '',
        referenceNo: '',
      });
      await loadData();
    } catch (err: any) {
      onNotify('error', err.message || 'Failed to issue advance');
    } finally {
      setSubmittingGive(false);
    }
  };

  // Open Repayment Modal
  const openRepayModal = (adv: SalaryAdvanceItem) => {
    setRepayAdvance(adv);
    setRepayForm({
      amount: adv.outstandingAmount.toString(),
      repaymentDate: new Date().toISOString().split('T')[0],
      paymentMode: 'CASH',
      bankAccountId: '',
      referenceNo: '',
      note: '',
    });
  };

  // Submit Repayment
  const handleRepay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repayAdvance) return;

    const amt = Number(repayForm.amount);
    if (isNaN(amt) || amt <= 0) {
      onNotify('warning', 'Please enter a valid amount greater than zero');
      return;
    }
    if (amt > repayAdvance.outstandingAmount) {
      onNotify(
        'warning',
        `Repayment amount cannot exceed the advance outstanding balance of ${formatINR(repayAdvance.outstandingAmount)}`
      );
      return;
    }
    if (repayForm.paymentMode !== 'CASH' && !repayForm.bankAccountId) {
      onNotify('warning', 'Bank account is required for non-cash repayments');
      return;
    }

    try {
      setSubmittingRepay(true);
      const res = await recordAdvanceRepayment(repayAdvance.advanceId, {
        amount: amt,
        repaymentDate: repayForm.repaymentDate,
        paymentMode: repayForm.paymentMode,
        bankAccountId: repayForm.paymentMode !== 'CASH' ? repayForm.bankAccountId : undefined,
        referenceNo: repayForm.referenceNo.trim() || undefined,
        note: repayForm.note.trim() || undefined,
      });

      onNotify(
        'success',
        `Repayment of ${formatINR(amt)} recorded. Remaining balance: ${formatINR(res.newOutstanding)}`
      );
      setRepayAdvance(null);
      await loadData();
    } catch (err: any) {
      onNotify('error', err.message || 'Failed to record repayment');
    } finally {
      setSubmittingRepay(false);
    }
  };

  // Cancel Advance
  const handleCancelAdvance = async (advanceId: string) => {
    if (!window.confirm('Are you sure you want to cancel this advance? This will revert the cash/bank balance.')) {
      return;
    }

    try {
      const res = await cancelAdvance(advanceId);
      onNotify('success', res.message || 'Advance cancelled successfully');
      await loadData();
    } catch (err: any) {
      onNotify('error', err.message || 'Failed to cancel advance');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Advanced */}
        <div className="bg-white border border-[#E2E6ED] rounded-xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-[#6B7686] uppercase tracking-wider">
              Total Advanced
            </span>
            <div className="text-2xl font-bold text-[#1A2333] font-heading mt-1">
              {formatINR(summary.totalAdvanced)}
            </div>
            <span className="text-[11px] text-[#6B7686] mt-0.5 block">Total active loans</span>
          </div>
          <div className="w-11 h-11 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
            <ArrowUpRight className="w-6 h-6" />
          </div>
        </div>

        {/* Total Repaid */}
        <div className="bg-white border border-[#E2E6ED] rounded-xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-[#6B7686] uppercase tracking-wider">
              Total Repaid
            </span>
            <div className="text-2xl font-bold text-emerald-600 font-heading mt-1">
              {formatINR(summary.totalRepaid)}
            </div>
            <span className="text-[11px] text-[#6B7686] mt-0.5 block">Via salary deductions & direct cash</span>
          </div>
          <div className="w-11 h-11 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
            <ArrowDownLeft className="w-6 h-6" />
          </div>
        </div>

        {/* Total Outstanding (Highlighted) */}
        <div className="bg-white border border-rose-200 rounded-xl p-5 shadow-xs flex items-center justify-between ring-1 ring-rose-500/10">
          <div>
            <span className="text-xs font-semibold text-rose-700 uppercase tracking-wider">
              Outstanding Balance
            </span>
            <div className="text-2xl font-bold text-rose-600 font-heading mt-1">
              {formatINR(summary.totalOutstanding)}
            </div>
            <span className="text-[11px] text-rose-600/80 mt-0.5 block">
              {summary.totalOutstanding > 0 ? 'Pending recovery' : 'All cleared'}
            </span>
          </div>
          <div className="w-11 h-11 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center flex-shrink-0">
            <TrendingDown className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Control & Filter Bar */}
      <div className="bg-white border border-[#E2E6ED] rounded-xl p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full md:w-72">
          <input
            type="text"
            placeholder="Search staff, code, reason..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 border border-[#E2E6ED] rounded-lg text-xs text-[#1A2333] placeholder:text-[#6B7686] focus:outline-none focus:ring-2 focus:ring-[#2F6FED]/20 focus:border-[#2F6FED] bg-white"
          />
          <Search className="w-3.5 h-3.5 text-[#6B7686] absolute left-3 top-2.5" />
        </div>

        {/* Filter Group */}
        <div className="flex items-center gap-3 flex-wrap w-full md:w-auto justify-end">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5 text-xs text-[#6B7686]">
            <Filter className="w-3.5 h-3.5" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-2.5 py-1.5 border border-[#E2E6ED] rounded-lg text-xs font-semibold text-[#1A2333] bg-white focus:outline-none focus:ring-1 focus:ring-[#2F6FED]"
            >
              <option value="ALL">All Statuses</option>
              <option value="Outstanding">Outstanding Only</option>
              <option value="Cleared">Cleared (₹0)</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

          {/* Date Range */}
          <div className="flex items-center gap-1.5 text-xs text-[#6B7686]">
            <span>From:</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="px-2 py-1 border border-[#E2E6ED] rounded-lg text-xs text-[#1A2333] bg-white"
            />
            <span>To:</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="px-2 py-1 border border-[#E2E6ED] rounded-lg text-xs text-[#1A2333] bg-white"
            />
          </div>

          {/* Reset Filters */}
          {(search || statusFilter !== 'ALL' || fromDate || toDate) && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setStatusFilter('ALL');
                setFromDate('');
                setToDate('');
              }}
              className="text-xs text-[#6B7686] hover:text-[#1A2333] flex items-center gap-1 underline"
            >
              <RotateCcw className="w-3 h-3" /> Reset
            </button>
          )}

          {/* Give Advance Button */}
          <button
            type="button"
            onClick={() => setIsGiveModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#2F6FED] hover:bg-[#2557BC] shadow-sm transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            Give Advance
          </button>
        </div>
      </div>

      {/* Advances Table */}
      {loading ? (
        <div className="bg-white border border-[#E2E6ED] rounded-xl p-12 text-center text-xs text-[#6B7686]">
          Loading advances register...
        </div>
      ) : filteredAdvances.length === 0 ? (
        <div className="bg-white border border-[#E2E6ED] rounded-xl p-12 text-center space-y-2">
          <div className="text-sm font-semibold text-[#1A2333]">No salary advances found</div>
          <p className="text-xs text-[#6B7686]">
            Click "Give Advance" above to grant an advance to a staff member.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-[#E2E6ED] rounded-xl shadow-subtle overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#F8FAFC] border-b border-[#E2E6ED] text-[#6B7686]">
                <th className="px-4 py-3 font-semibold">Staff Member</th>
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">Advance Amount</th>
                <th className="px-4 py-3 font-semibold">Repaid</th>
                <th className="px-4 py-3 font-semibold">Outstanding</th>
                <th className="px-4 py-3 font-semibold">Mode / Account</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E6ED]">
              {filteredAdvances.map((adv) => {
                const isCleared = adv.outstandingAmount <= 0;
                const isCancelled = adv.status === 'CANCELLED';

                return (
                  <tr key={adv.advanceId} className="hover:bg-[#F8FAFC]/50 transition-colors">
                    {/* Staff */}
                    <td className="px-4 py-3">
                      <div className="font-semibold text-[#1A2333] flex items-center gap-1.5">
                        <span>{adv.staffName}</span>
                      </div>
                      <div className="text-[11px] text-[#6B7686] flex items-center gap-1.5">
                        <span>{adv.staffCode}</span>
                        {adv.reason && (
                          <>
                            <span>•</span>
                            <span className="italic truncate max-w-[180px]" title={adv.reason}>
                              "{adv.reason}"
                            </span>
                          </>
                        )}
                      </div>
                    </td>

                    {/* Date */}
                    <td className="px-4 py-3 text-[#1A2333]">{adv.advanceDate}</td>

                    {/* Amount */}
                    <td className="px-4 py-3 font-semibold text-[#1A2333]">
                      {formatINR(adv.amount)}
                    </td>

                    {/* Repaid */}
                    <td className="px-4 py-3 text-emerald-700 font-medium">
                      {formatINR(adv.repaidAmount)}
                    </td>

                    {/* Outstanding */}
                    <td className="px-4 py-3">
                      <span
                        className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                          isCancelled
                            ? 'bg-slate-100 text-slate-500'
                            : isCleared
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-rose-50 text-rose-700 ring-1 ring-rose-200'
                        }`}
                      >
                        {formatINR(adv.outstandingAmount)}
                      </span>
                    </td>

                    {/* Mode / Account */}
                    <td className="px-4 py-3 text-[#6B7686]">
                      <div className="flex items-center gap-1 font-medium text-[#1A2333]">
                        {adv.paymentMode === 'CASH' ? (
                          <span className="text-emerald-700">Cash</span>
                        ) : (
                          <span className="text-blue-700">{adv.paymentMode}</span>
                        )}
                      </div>
                      {adv.bankName && (
                        <div className="text-[10px] text-[#6B7686]">{adv.bankName}</div>
                      )}
                      {adv.referenceNo && (
                        <div className="text-[10px] text-[#6B7686]">Ref: {adv.referenceNo}</div>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      {isCancelled ? (
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-600">
                          Cancelled
                        </span>
                      ) : isCleared ? (
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                          Cleared
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-100 text-rose-800">
                          Outstanding
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Repay Button */}
                        {!isCancelled && !isCleared && (
                          <button
                            type="button"
                            onClick={() => openRepayModal(adv)}
                            className="px-2.5 py-1 rounded border border-[#2F6FED] text-[#2F6FED] hover:bg-[#2F6FED]/5 font-semibold text-[11px] transition-colors"
                          >
                            Repay
                          </button>
                        )}

                        {/* Ledger Button */}
                        <button
                          type="button"
                          onClick={() => openLedger(adv.staffId)}
                          className="px-2.5 py-1 rounded border border-[#E2E6ED] text-[#1A2333] hover:bg-[#F8FAFC] font-semibold text-[11px] transition-colors flex items-center gap-1"
                        >
                          <History className="w-3 h-3 text-[#6B7686]" />
                          Ledger
                        </button>

                        {/* Cancel Button (only if 0 repayments) */}
                        {!isCancelled && adv.repaidAmount === 0 && (
                          <button
                            type="button"
                            onClick={() => handleCancelAdvance(adv.advanceId)}
                            className="px-2 py-1 rounded text-rose-600 hover:bg-rose-50 font-semibold text-[11px] transition-colors"
                            title="Cancel Advance (reverts cash/bank)"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ================================================================ */}
      {/* GIVE ADVANCE MODAL */}
      {/* ================================================================ */}
      {isGiveModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-[#E2E6ED] max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[#E2E6ED] pb-3">
              <div>
                <h3 className="font-heading font-bold text-base text-[#1A2333]">
                  Give Salary Advance
                </h3>
                <p className="text-xs text-[#6B7686]">
                  Record advance money given to a staff member
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsGiveModalOpen(false)}
                className="p-1 rounded-lg text-[#6B7686] hover:bg-[#F1F3F7]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleGiveAdvance} className="space-y-4 text-xs">
              {/* Staff Select */}
              <div>
                <label className="block font-semibold text-[#1A2333] mb-1">
                  Staff Member <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={giveForm.staffId}
                  onChange={(e) => setGiveForm({ ...giveForm, staffId: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E2E6ED] rounded-lg text-xs text-[#1A2333] bg-white focus:outline-none focus:ring-1 focus:ring-[#2F6FED]"
                >
                  <option value="">Select staff member...</option>
                  {uniqueStaffList.map((s) => (
                    <option key={s.staffId} value={s.staffId}>
                      {s.staffName} ({s.staffCode})
                    </option>
                  ))}
                </select>
                {uniqueStaffList.length === 0 && (
                  <p className="text-[11px] text-amber-600 mt-1">
                    No active staff found in cache. Make sure staff are configured in Settings/Trainers.
                  </p>
                )}
              </div>

              {/* Amount & Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#1A2333] mb-1">
                    Amount (₹) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    required
                    placeholder="e.g. 5000"
                    value={giveForm.amount}
                    onChange={(e) => setGiveForm({ ...giveForm, amount: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E2E6ED] rounded-lg text-xs text-[#1A2333] focus:outline-none focus:ring-1 focus:ring-[#2F6FED]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#1A2333] mb-1">
                    Advance Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={giveForm.advanceDate}
                    onChange={(e) => setGiveForm({ ...giveForm, advanceDate: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E2E6ED] rounded-lg text-xs text-[#1A2333] focus:outline-none focus:ring-1 focus:ring-[#2F6FED]"
                  />
                </div>
              </div>

              {/* Payment Mode */}
              <div>
                <label className="block font-semibold text-[#1A2333] mb-1">
                  Payment Mode <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(['CASH', 'UPI', 'BANK', 'CHEQUE'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setGiveForm({ ...giveForm, paymentMode: m })}
                      className={`py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                        giveForm.paymentMode === m
                          ? 'border-[#2F6FED] bg-[#E8EFFE] text-[#2F6FED]'
                          : 'border-[#E2E6ED] text-[#6B7686] hover:bg-[#F8FAFC]'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Bank Account (if not Cash) */}
              {giveForm.paymentMode !== 'CASH' && (
                <div>
                  <label className="block font-semibold text-[#1A2333] mb-1">
                    Disbursing Bank Account <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={giveForm.bankAccountId}
                    onChange={(e) => setGiveForm({ ...giveForm, bankAccountId: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E2E6ED] rounded-lg text-xs text-[#1A2333] bg-white focus:outline-none focus:ring-1 focus:ring-[#2F6FED]"
                  >
                    <option value="">Select bank account...</option>
                    {bankAccounts.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.bankName} - {b.accountNumber ? `•••• ${b.accountNumber.slice(-4)}` : b.accountName}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Reference No */}
              <div>
                <label className="block font-semibold text-[#1A2333] mb-1">
                  Reference No / Cheque No
                </label>
                <input
                  type="text"
                  placeholder="e.g. UTR12345 or CHQ-998"
                  value={giveForm.referenceNo}
                  onChange={(e) => setGiveForm({ ...giveForm, referenceNo: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E2E6ED] rounded-lg text-xs text-[#1A2333] focus:outline-none focus:ring-1 focus:ring-[#2F6FED]"
                />
              </div>

              {/* Reason */}
              <div>
                <label className="block font-semibold text-[#1A2333] mb-1">Reason / Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Family medical emergency"
                  value={giveForm.reason}
                  onChange={(e) => setGiveForm({ ...giveForm, reason: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E2E6ED] rounded-lg text-xs text-[#1A2333] focus:outline-none focus:ring-1 focus:ring-[#2F6FED]"
                />
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#E2E6ED]">
                <button
                  type="button"
                  onClick={() => setIsGiveModalOpen(false)}
                  className="px-4 py-2 border border-[#E2E6ED] rounded-lg text-xs font-semibold text-[#6B7686] hover:bg-[#F8FAFC]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingGive}
                  className="px-4 py-2 bg-[#2F6FED] hover:bg-[#2557BC] text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  {submittingGive ? 'Granting...' : 'Grant Advance'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* RECORD REPAYMENT MODAL */}
      {/* ================================================================ */}
      {repayAdvance && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-[#E2E6ED] max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[#E2E6ED] pb-3">
              <div>
                <h3 className="font-heading font-bold text-base text-[#1A2333]">
                  Record Advance Repayment
                </h3>
                <p className="text-xs text-[#6B7686]">
                  Direct repayment from {repayAdvance.staffName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRepayAdvance(null)}
                className="p-1 rounded-lg text-[#6B7686] hover:bg-[#F1F3F7]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-900 flex items-center justify-between">
              <span>Current Outstanding:</span>
              <span className="font-bold text-amber-950 text-sm">
                {formatINR(repayAdvance.outstandingAmount)}
              </span>
            </div>

            <form onSubmit={handleRepay} className="space-y-4 text-xs">
              {/* Amount & Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#1A2333] mb-1">
                    Repayment Amount (₹) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={repayAdvance.outstandingAmount}
                    step="0.01"
                    required
                    value={repayForm.amount}
                    onChange={(e) => setRepayForm({ ...repayForm, amount: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E2E6ED] rounded-lg text-xs text-[#1A2333] focus:outline-none focus:ring-1 focus:ring-[#2F6FED]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#1A2333] mb-1">
                    Repayment Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={repayForm.repaymentDate}
                    onChange={(e) => setRepayForm({ ...repayForm, repaymentDate: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E2E6ED] rounded-lg text-xs text-[#1A2333] focus:outline-none focus:ring-1 focus:ring-[#2F6FED]"
                  />
                </div>
              </div>

              {/* Payment Mode */}
              <div>
                <label className="block font-semibold text-[#1A2333] mb-1">
                  Payment Mode <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(['CASH', 'UPI', 'BANK', 'CHEQUE'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setRepayForm({ ...repayForm, paymentMode: m })}
                      className={`py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                        repayForm.paymentMode === m
                          ? 'border-[#2F6FED] bg-[#E8EFFE] text-[#2F6FED]'
                          : 'border-[#E2E6ED] text-[#6B7686] hover:bg-[#F8FAFC]'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Bank Account (if not Cash) */}
              {repayForm.paymentMode !== 'CASH' && (
                <div>
                  <label className="block font-semibold text-[#1A2333] mb-1">
                    Receiving Bank Account <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={repayForm.bankAccountId}
                    onChange={(e) => setRepayForm({ ...repayForm, bankAccountId: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E2E6ED] rounded-lg text-xs text-[#1A2333] bg-white focus:outline-none focus:ring-1 focus:ring-[#2F6FED]"
                  >
                    <option value="">Select receiving bank account...</option>
                    {bankAccounts.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.bankName} - {b.accountNumber ? `•••• ${b.accountNumber.slice(-4)}` : b.accountName}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Reference & Note */}
              <div>
                <label className="block font-semibold text-[#1A2333] mb-1">Reference No</label>
                <input
                  type="text"
                  placeholder="e.g. UPI Ref / Cheque No"
                  value={repayForm.referenceNo}
                  onChange={(e) => setRepayForm({ ...repayForm, referenceNo: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E2E6ED] rounded-lg text-xs text-[#1A2333] focus:outline-none focus:ring-1 focus:ring-[#2F6FED]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#1A2333] mb-1">Remarks / Note</label>
                <input
                  type="text"
                  placeholder="e.g. Paid in cash at reception"
                  value={repayForm.note}
                  onChange={(e) => setRepayForm({ ...repayForm, note: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E2E6ED] rounded-lg text-xs text-[#1A2333] focus:outline-none focus:ring-1 focus:ring-[#2F6FED]"
                />
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#E2E6ED]">
                <button
                  type="button"
                  onClick={() => setRepayAdvance(null)}
                  className="px-4 py-2 border border-[#E2E6ED] rounded-lg text-xs font-semibold text-[#6B7686] hover:bg-[#F8FAFC]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingRepay}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  {submittingRepay ? 'Recording...' : 'Record Repayment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* CHRONOLOGICAL LEDGER DRAWER */}
      {/* ================================================================ */}
      {ledgerStaffId && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex justify-end">
          <div className="bg-white w-full max-w-xl h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="p-6 border-b border-[#E2E6ED] flex items-center justify-between">
              <div>
                <h3 className="font-heading font-bold text-lg text-[#1A2333]">
                  Staff Advance Ledger
                </h3>
                {ledgerData && (
                  <p className="text-xs text-[#6B7686] mt-0.5">
                    {ledgerData.staffName} ({ledgerData.staffCode})
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  setLedgerStaffId(null);
                  setLedgerData(null);
                }}
                className="p-1.5 rounded-lg text-[#6B7686] hover:bg-[#F1F3F7]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Outstanding summary card in drawer */}
            {ledgerData && (
              <div className="mx-6 mt-4 p-4 rounded-xl bg-slate-50 border border-[#E2E6ED] flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-semibold text-[#6B7686] uppercase">
                    Current Outstanding Balance
                  </span>
                  <div className="text-xl font-bold text-rose-600 font-heading">
                    {formatINR(ledgerData.currentOutstanding)}
                  </div>
                </div>
                <div className="text-[11px] text-[#6B7686] text-right">
                  <span>FIFO Allocation</span>
                  <div className="text-slate-500 font-medium">Oldest advance recovered first</div>
                </div>
              </div>
            )}

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {loadingLedger ? (
                <div className="p-12 text-center text-xs text-[#6B7686]">
                  Loading chronological ledger transactions...
                </div>
              ) : !ledgerData || ledgerData.ledger.length === 0 ? (
                <div className="p-12 text-center text-xs text-[#6B7686]">
                  No advance transactions found for this staff member.
                </div>
              ) : (
                <div className="border border-[#E2E6ED] rounded-xl overflow-hidden shadow-xs">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-[#F8FAFC] border-b border-[#E2E6ED] text-[#6B7686]">
                        <th className="px-3 py-2.5 font-semibold">Date & Type</th>
                        <th className="px-3 py-2.5 font-semibold text-right">Amount</th>
                        <th className="px-3 py-2.5 font-semibold text-right">Running Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E6ED]">
                      {ledgerData.ledger.map((item, idx) => {
                        const isGiven = item.type === 'ADVANCE_GIVEN';

                        return (
                          <tr key={`${item.id}-${idx}`} className="hover:bg-[#F8FAFC]/50">
                            <td className="px-3 py-2.5">
                              <div className="flex items-center gap-1.5">
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                    isGiven
                                      ? 'bg-blue-100 text-blue-800'
                                      : item.type === 'SALARY_DEDUCTION'
                                      ? 'bg-purple-100 text-purple-800'
                                      : 'bg-emerald-100 text-emerald-800'
                                  }`}
                                >
                                  {isGiven
                                    ? '+ Advance'
                                    : item.type === 'SALARY_DEDUCTION'
                                    ? '- Salary Slip'
                                    : '- Direct Cash'}
                                </span>
                                <span className="font-medium text-[#1A2333]">{item.date}</span>
                              </div>
                              <div className="text-[11px] text-[#6B7686] mt-0.5">
                                {item.note || item.paymentMode || 'Transaction'}
                                {item.referenceNo && ` • Ref: ${item.referenceNo}`}
                                {item.createdByName && ` • by ${item.createdByName}`}
                              </div>
                            </td>

                            <td
                              className={`px-3 py-2.5 text-right font-semibold ${
                                isGiven ? 'text-blue-700' : 'text-emerald-700'
                              }`}
                            >
                              {isGiven ? `+${formatINR(item.amount)}` : `-${formatINR(item.amount)}`}
                            </td>

                            <td className="px-3 py-2.5 text-right font-bold text-[#1A2333]">
                              {formatINR(item.runningBalance)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-[#E2E6ED] flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setLedgerStaffId(null);
                  setLedgerData(null);
                }}
                className="px-4 py-2 border border-[#E2E6ED] rounded-lg text-xs font-semibold text-[#1A2333] hover:bg-[#F8FAFC]"
              >
                Close Ledger
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

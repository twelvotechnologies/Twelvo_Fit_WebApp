import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Calendar as CalendarIcon,
  Sparkles,
  Printer,
  X,
  CheckSquare,
  Square,
  Lock,
  AlertTriangle,
} from 'lucide-react';
import {
  getSalaries,
  getSalaryPreview,
  generateSalaries,
  finalizeSalarySlip,
  finalizeBulkSalaries,
  recordSalaryPayment,
  getSalarySlipDetail,
  cancelSalarySlip,
  SalarySlipSummaryItem,
  SalaryPreviewItem,
  SlipDetailResponse,
} from '../../../api/payrollApi';
import { getBankAccounts } from '../../../api/settingsApi';
import { BankAccountItem } from '../../../api/types';

interface SalariesTabProps {
  onNotify: (type: 'success' | 'error' | 'warning', message: string) => void;
}

const formatINR = (val: number) => '₹' + (val || 0).toLocaleString('en-IN');

export default function SalariesTab({ onNotify }: SalariesTabProps) {
  const currentMonthStr = useMemo(() => new Date().toISOString().substring(0, 7), []);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);
  const [slips, setSlips] = useState<SalarySlipSummaryItem[]>([]);
  const [summary, setSummary] = useState({
    totalNetPayable: 0,
    totalPaid: 0,
    totalBalance: 0,
    countUnpaid: 0,
    countPartial: 0,
    countPaid: 0,
    countDraft: 0,
  });
  const [loading, setLoading] = useState(false);
  const [selectedSlipIds, setSelectedSlipIds] = useState<Set<string>>(new Set());
  const [bankAccounts, setBankAccounts] = useState<BankAccountItem[]>([]);

  // Step 1: Preview & Generate Modal
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewItems, setPreviewItems] = useState<SalaryPreviewItem[]>([]);
  const [generating, setGenerating] = useState(false);

  // Step 3: Payment Modal
  const [payingSlip, setPayingSlip] = useState<SalarySlipSummaryItem | null>(null);
  const [payForm, setPayForm] = useState({
    amount: '',
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMode: 'CASH' as 'CASH' | 'UPI' | 'BANK' | 'CHEQUE',
    bankAccountId: '',
    referenceNo: '',
    note: '',
  });
  const [submittingPayment, setSubmittingPayment] = useState(false);

  // Payslip Print Drawer
  const [viewSlipId, setViewSlipId] = useState<string | null>(null);
  const [slipDetail, setSlipDetail] = useState<SlipDetailResponse | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Load Bank Accounts
  useEffect(() => {
    getBankAccounts()
      .then((banks) => setBankAccounts(banks.filter((b) => b.isActive !== false)))
      .catch(() => {});
  }, []);

  // Load Salaries List
  const loadSalaries = useCallback(async (month: string) => {
    try {
      setLoading(true);
      const res = await getSalaries(month);
      setSlips(res.slips);
      setSummary(res.summary);
      setSelectedSlipIds(new Set());
    } catch (err: any) {
      onNotify('error', err.message || 'Failed to load salary slips');
    } finally {
      setLoading(false);
    }
  }, [onNotify]);

  useEffect(() => {
    loadSalaries(selectedMonth);
  }, [selectedMonth, loadSalaries]);

  // Open Preview Modal
  const handleOpenPreview = async () => {
    try {
      setIsPreviewOpen(true);
      setPreviewLoading(true);
      const res = await getSalaryPreview(selectedMonth);
      setPreviewItems(res.items);
    } catch (err: any) {
      onNotify('error', err.message || 'Failed to load salary preview');
      setIsPreviewOpen(false);
    } finally {
      setPreviewLoading(false);
    }
  };

  // Preview inline change handlers
  const updatePreviewItem = (
    staffId: string,
    field: 'bonusAmount' | 'otherDeductions' | 'advanceDeduction' | 'skip',
    val: any
  ) => {
    setPreviewItems((prev) =>
      prev.map((item) => {
        if (item.staffId !== staffId) return item;

        const updated = { ...item, [field]: val };
        const bonus = Number(updated.bonusAmount || 0);
        const other = Number(updated.otherDeductions || 0);
        const earned = Number(updated.earnedSalary || 0);
        const gross = earned + bonus - other;

        // Auto-bound advance deduction so net payable never goes below 0
        let advDed = Number(updated.advanceDeduction || 0);
        if (field === 'advanceDeduction') {
          advDed = Math.min(advDed, Math.max(0, gross));
        } else {
          advDed = Math.min(advDed, Math.max(0, gross));
        }

        const netPayable = Math.max(0, Math.round((gross - advDed) * 100) / 100);

        return {
          ...updated,
          advanceDeduction: advDed,
          netPayable,
        };
      })
    );
  };

  // Check total unmarked days across preview
  const totalUnmarkedInPreview = useMemo(() => {
    return previewItems.reduce((acc, curr) => acc + (curr.unmarkedDays || 0), 0);
  }, [previewItems]);

  // Submit Generate Salaries (saves as DRAFT)
  const handleGenerateSalaries = async () => {
    const activeItems = previewItems.filter((i) => !i.skip);
    if (activeItems.length === 0) {
      onNotify('warning', 'Please select at least one staff member to generate salaries');
      return;
    }

    try {
      setGenerating(true);
      await generateSalaries({
        month: selectedMonth,
        items: activeItems.map((i) => ({
          staffId: i.staffId,
          bonusAmount: i.bonusAmount || 0,
          otherDeductions: i.otherDeductions || 0,
          advanceDeduction: i.advanceDeduction || 0,
        })),
      });

      onNotify('success', `Generated ${activeItems.length} draft salary slip(s) for ${selectedMonth}`);
      setIsPreviewOpen(false);
      await loadSalaries(selectedMonth);
    } catch (err: any) {
      onNotify('error', err.message || 'Failed to generate salaries');
    } finally {
      setGenerating(false);
    }
  };

  // Finalize Single Slip
  const handleFinalizeSlip = async (slipId: string, staffName: string) => {
    if (
      !window.confirm(
        `Finalize salary slip for ${staffName}? This will lock attendance and apply FIFO advance deductions.`
      )
    ) {
      return;
    }

    try {
      await finalizeSalarySlip(slipId);
      onNotify('success', `Salary slip for ${staffName} finalized successfully`);
      await loadSalaries(selectedMonth);
    } catch (err: any) {
      onNotify('error', err.message || 'Failed to finalize slip');
    }
  };

  // Finalize Bulk
  const handleFinalizeBulk = async () => {
    const ids = Array.from(selectedSlipIds);
    if (ids.length === 0) return;

    if (
      !window.confirm(
        `Finalize ${ids.length} selected salary slip(s)? Attendance will be locked and advance deductions applied.`
      )
    ) {
      return;
    }

    try {
      const res = await finalizeBulkSalaries(ids);
      onNotify('success', `Finalized ${res.finalizedCount} salary slips`);
      setSelectedSlipIds(new Set());
      await loadSalaries(selectedMonth);
    } catch (err: any) {
      onNotify('error', err.message || 'Failed to finalize slips in bulk');
    }
  };

  // Open Payment Modal
  const openPayModal = (slip: SalarySlipSummaryItem) => {
    setPayingSlip(slip);
    setPayForm({
      amount: slip.balanceAmount.toString(),
      paymentDate: new Date().toISOString().split('T')[0],
      paymentMode: 'CASH',
      bankAccountId: '',
      referenceNo: '',
      note: '',
    });
  };

  // Submit Payment
  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingSlip) return;

    const amt = Number(payForm.amount);
    if (isNaN(amt) || amt <= 0) {
      onNotify('warning', 'Please enter a valid amount greater than zero');
      return;
    }
    if (amt > payingSlip.balanceAmount) {
      onNotify(
        'warning',
        `Payment amount cannot exceed remaining balance of ${formatINR(payingSlip.balanceAmount)}`
      );
      return;
    }
    if (payForm.paymentMode !== 'CASH' && !payForm.bankAccountId) {
      onNotify('warning', 'Bank account is required for non-cash salary payout');
      return;
    }

    try {
      setSubmittingPayment(true);
      const idempotencyKey = `PAY-${payingSlip.slipId}-${Date.now()}`;
      const res = await recordSalaryPayment(
        payingSlip.slipId,
        {
          amount: amt,
          paymentDate: payForm.paymentDate,
          paymentMode: payForm.paymentMode,
          bankAccountId: payForm.paymentMode !== 'CASH' ? payForm.bankAccountId : undefined,
          referenceNo: payForm.referenceNo.trim() || undefined,
          note: payForm.note.trim() || undefined,
        },
        idempotencyKey
      );

      onNotify(
        'success',
        `Payment of ${formatINR(amt)} recorded. Slip status is now ${res.paymentStatus}`
      );
      setPayingSlip(null);
      await loadSalaries(selectedMonth);
    } catch (err: any) {
      onNotify('error', err.message || 'Failed to record payment');
    } finally {
      setSubmittingPayment(false);
    }
  };

  // Open Payslip Detail Drawer
  const openPayslipDetail = async (slipId: string) => {
    try {
      setViewSlipId(slipId);
      setLoadingDetail(true);
      const res = await getSalarySlipDetail(slipId);
      setSlipDetail(res);
    } catch (err: any) {
      onNotify('error', err.message || 'Failed to load slip details');
      setViewSlipId(null);
    } finally {
      setLoadingDetail(false);
    }
  };

  // Cancel Slip
  const handleCancelSlip = async (slipId: string, staffName: string) => {
    if (
      !window.confirm(
        `Are you sure you want to cancel the salary slip for ${staffName}? Any advance deductions will be restored.`
      )
    ) {
      return;
    }

    try {
      const res = await cancelSalarySlip(slipId);
      onNotify('success', res.message || 'Salary slip cancelled successfully');
      await loadSalaries(selectedMonth);
    } catch (err: any) {
      onNotify('error', err.message || 'Failed to cancel salary slip');
    }
  };

  // Bulk Selection Toggle
  const toggleSelectAllDrafts = () => {
    const draftIds = slips.filter((s) => s.status === 'DRAFT').map((s) => s.slipId);
    if (selectedSlipIds.size === draftIds.length) {
      setSelectedSlipIds(new Set());
    } else {
      setSelectedSlipIds(new Set(draftIds));
    }
  };

  const toggleSelectSlip = (slipId: string) => {
    setSelectedSlipIds((prev) => {
      const next = new Set(prev);
      if (next.has(slipId)) next.delete(slipId);
      else next.add(slipId);
      return next;
    });
  };

  const draftSlipsCount = useMemo(() => {
    return slips.filter((s) => s.status === 'DRAFT').length;
  }, [slips]);

  return (
    <div className="space-y-6">
      {/* Top Month & Summary Bar */}
      <div className="bg-white border border-[#E2E6ED] rounded-xl p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Month Picker */}
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-4 h-4 text-[#6B7686]" />
          <span className="text-xs font-semibold text-[#6B7686]">Salary Month:</span>
          <input
            type="month"
            value={selectedMonth}
            max={currentMonthStr}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-1.5 border border-[#E2E6ED] rounded-lg text-xs font-semibold text-[#1A2333] focus:outline-none focus:ring-2 focus:ring-[#2F6FED]/20 focus:border-[#2F6FED] bg-white cursor-pointer"
          />
        </div>

        {/* Top Actions */}
        <div className="flex items-center gap-2.5">
          {selectedSlipIds.size > 0 && (
            <button
              type="button"
              onClick={handleFinalizeBulk}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-all"
            >
              <Lock className="w-3.5 h-3.5" />
              Finalize Selected ({selectedSlipIds.size})
            </button>
          )}

          <button
            type="button"
            onClick={handleOpenPreview}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#2F6FED] hover:bg-[#2557BC] shadow-sm transition-all"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Generate Salaries for {selectedMonth}
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Net Payable */}
        <div className="bg-white border border-[#E2E6ED] rounded-xl p-4 shadow-xs">
          <span className="text-xs font-semibold text-[#6B7686] uppercase tracking-wider">
            Total Net Payable
          </span>
          <div className="text-2xl font-bold text-[#1A2333] font-heading mt-1">
            {formatINR(summary.totalNetPayable)}
          </div>
          <span className="text-[11px] text-[#6B7686] mt-0.5 block">Net payroll obligations</span>
        </div>

        {/* Paid */}
        <div className="bg-white border border-[#E2E6ED] rounded-xl p-4 shadow-xs">
          <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">
            Disbursed (Paid)
          </span>
          <div className="text-2xl font-bold text-emerald-600 font-heading mt-1">
            {formatINR(summary.totalPaid)}
          </div>
          <span className="text-[11px] text-emerald-600/80 mt-0.5 block">Total payments cleared</span>
        </div>

        {/* Balance */}
        <div className="bg-white border border-rose-200 rounded-xl p-4 shadow-xs ring-1 ring-rose-500/10">
          <span className="text-xs font-semibold text-rose-700 uppercase tracking-wider">
            Pending Balance
          </span>
          <div className="text-2xl font-bold text-rose-600 font-heading mt-1">
            {formatINR(summary.totalBalance)}
          </div>
          <span className="text-[11px] text-rose-600/80 mt-0.5 block">Unpaid disbursements</span>
        </div>

        {/* Slips Status Counts */}
        <div className="bg-white border border-[#E2E6ED] rounded-xl p-4 shadow-xs flex flex-col justify-between">
          <span className="text-xs font-semibold text-[#6B7686] uppercase tracking-wider">
            Slip Status Counts
          </span>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span
              className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200"
              title="Unpaid Slips"
            >
              {summary.countUnpaid} Unpaid
            </span>
            <span
              className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200"
              title="Partially Paid Slips"
            >
              {summary.countPartial} Partial
            </span>
            <span
              className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200"
              title="Fully Paid Slips"
            >
              {summary.countPaid} Paid
            </span>
            {summary.countDraft > 0 && (
              <span
                className="px-2 py-0.5 rounded text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200"
                title="Draft Slips"
              >
                {summary.countDraft} Draft
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Slips Table */}
      {loading ? (
        <div className="bg-white border border-[#E2E6ED] rounded-xl p-12 text-center text-xs text-[#6B7686]">
          Loading salary slips for {selectedMonth}...
        </div>
      ) : slips.length === 0 ? (
        <div className="bg-white border border-[#E2E6ED] rounded-xl p-12 text-center space-y-2">
          <div className="text-sm font-semibold text-[#1A2333]">
            No salary slips generated for {selectedMonth}
          </div>
          <p className="text-xs text-[#6B7686]">
            Click "Generate Salaries for {selectedMonth}" above to calculate and generate draft slips.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-[#E2E6ED] rounded-xl shadow-subtle overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#F8FAFC] border-b border-[#E2E6ED] text-[#6B7686]">
                <th className="px-4 py-3 w-8">
                  {draftSlipsCount > 0 && (
                    <button
                      type="button"
                      onClick={toggleSelectAllDrafts}
                      className="text-[#6B7686] hover:text-[#1A2333]"
                      title="Select all draft slips"
                    >
                      {selectedSlipIds.size === draftSlipsCount ? (
                        <CheckSquare className="w-4 h-4 text-[#2F6FED]" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  )}
                </th>
                <th className="px-3 py-3 font-semibold">Staff Member</th>
                <th className="px-3 py-3 font-semibold text-right">Base Salary</th>
                <th className="px-3 py-3 font-semibold text-center">Days (P/T)</th>
                <th className="px-3 py-3 font-semibold text-right">Earned</th>
                <th className="px-3 py-3 font-semibold text-right">Bonus / Ded</th>
                <th className="px-3 py-3 font-semibold text-right">Adv. Deduct</th>
                <th className="px-3 py-3 font-semibold text-right">Net Payable</th>
                <th className="px-3 py-3 font-semibold text-right">Paid / Balance</th>
                <th className="px-3 py-3 font-semibold text-center">Status</th>
                <th className="px-4 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E6ED]">
              {slips.map((slip) => {
                const isDraft = slip.status === 'DRAFT';
                const isCancelled = slip.status === 'CANCELLED';
                const isSelected = selectedSlipIds.has(slip.slipId);

                return (
                  <tr
                    key={slip.slipId}
                    className={`hover:bg-[#F8FAFC]/50 transition-colors ${
                      isSelected ? 'bg-blue-50/40' : ''
                    }`}
                  >
                    {/* Checkbox for draft */}
                    <td className="px-4 py-3 text-center">
                      {isDraft ? (
                        <button
                          type="button"
                          onClick={() => toggleSelectSlip(slip.slipId)}
                          className="text-[#6B7686] hover:text-[#1A2333]"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-[#2F6FED]" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      ) : (
                        <Lock className="w-3.5 h-3.5 text-slate-300 mx-auto" />
                      )}
                    </td>

                    {/* Staff Name & Code */}
                    <td className="px-3 py-3">
                      <div className="font-semibold text-[#1A2333] flex items-center gap-1.5">
                        <span>{slip.staffName}</span>
                      </div>
                      <div className="text-[11px] text-[#6B7686]">
                        {slip.staffCode} • {slip.designation || 'Staff'}
                      </div>
                    </td>

                    {/* Base Salary */}
                    <td className="px-3 py-3 text-right font-medium text-[#1A2333]">
                      {formatINR(slip.baseSalary)}
                    </td>

                    {/* Payable Days / Total Days */}
                    <td className="px-3 py-3 text-center">
                      <span className="font-bold text-[#1A2333]">{slip.payableDays}</span>
                      <span className="text-[#6B7686]">/{slip.daysInMonth}d</span>
                    </td>

                    {/* Earned Salary */}
                    <td className="px-3 py-3 text-right font-medium text-[#1A2333]">
                      {formatINR(slip.earnedSalary)}
                    </td>

                    {/* Bonus & Other Deductions */}
                    <td className="px-3 py-3 text-right text-[11px]">
                      <div className="text-emerald-700">+{formatINR(slip.bonusAmount)}</div>
                      <div className="text-rose-600">-{formatINR(slip.otherDeductions)}</div>
                    </td>

                    {/* Advance Deducted */}
                    <td className="px-3 py-3 text-right font-medium text-purple-700">
                      {slip.advanceDeduction > 0 ? `-${formatINR(slip.advanceDeduction)}` : '₹0'}
                    </td>

                    {/* Net Payable */}
                    <td className="px-3 py-3 text-right font-bold text-[#1A2333]">
                      {formatINR(slip.netPayable)}
                    </td>

                    {/* Paid / Balance */}
                    <td className="px-3 py-3 text-right text-[11px]">
                      <div className="text-emerald-700 font-semibold">{formatINR(slip.paidAmount)}</div>
                      <div className="text-rose-600 font-semibold">{formatINR(slip.balanceAmount)}</div>
                    </td>

                    {/* Status Badge */}
                    <td className="px-3 py-3 text-center">
                      {isDraft ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                          DRAFT
                        </span>
                      ) : isCancelled ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                          CANCELLED
                        </span>
                      ) : slip.paymentStatus === 'PAID' ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          PAID
                        </span>
                      ) : slip.paymentStatus === 'PARTIAL' ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                          PARTIAL
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                          UNPAID
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5 flex-wrap">
                        {/* Draft Finalize button */}
                        {isDraft && (
                          <button
                            type="button"
                            onClick={() => handleFinalizeSlip(slip.slipId, slip.staffName)}
                            className="px-2.5 py-1 rounded bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 font-semibold text-[11px] transition-colors"
                          >
                            Finalize
                          </button>
                        )}

                        {/* Pay button (if finalized and has balance) */}
                        {!isDraft && !isCancelled && slip.balanceAmount > 0 && (
                          <button
                            type="button"
                            onClick={() => openPayModal(slip)}
                            className="px-2.5 py-1 rounded bg-[#2F6FED] hover:bg-[#2557BC] text-white font-semibold text-[11px] transition-colors"
                          >
                            Pay
                          </button>
                        )}

                        {/* Print Payslip Drawer Button */}
                        {!isCancelled && (
                          <button
                            type="button"
                            onClick={() => openPayslipDetail(slip.slipId)}
                            className="px-2.5 py-1 rounded border border-[#E2E6ED] text-[#1A2333] hover:bg-[#F8FAFC] font-semibold text-[11px] transition-colors flex items-center gap-1"
                            title="View / Print Payslip"
                          >
                            <Printer className="w-3 h-3 text-[#6B7686]" />
                            Slip
                          </button>
                        )}

                        {/* Cancel slip (if draft, or finalized with zero paid) */}
                        {!isCancelled && (isDraft || slip.paidAmount === 0) && (
                          <button
                            type="button"
                            onClick={() => handleCancelSlip(slip.slipId, slip.staffName)}
                            className="px-2 py-1 text-rose-600 hover:bg-rose-50 rounded font-semibold text-[11px] transition-colors"
                            title="Cancel Salary Slip"
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
      {/* STEP 1: SALARY PREVIEW & GENERATE MODAL */}
      {/* ================================================================ */}
      {isPreviewOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-[#E2E6ED] max-w-5xl w-full max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-5 border-b border-[#E2E6ED] flex items-center justify-between">
              <div>
                <h3 className="font-heading font-bold text-base text-[#1A2333]">
                  Salary Preview & Draft Generation ({selectedMonth})
                </h3>
                <p className="text-xs text-[#6B7686] mt-0.5">
                  Review earned salaries, customize bonus/deductions, and set advance recovery.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsPreviewOpen(false)}
                className="p-1.5 rounded-lg text-[#6B7686] hover:bg-[#F1F3F7]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Unmarked Days Warning Banner */}
            {totalUnmarkedInPreview > 0 && (
              <div className="mx-5 mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2.5 text-xs text-amber-900">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <span>
                  <strong>Notice:</strong> {totalUnmarkedInPreview} unmarked days detected across staff members. A day with no marked row is counted as <strong>ABSENT</strong> in the earned salary formula.
                </span>
              </div>
            )}

            {/* Preview Table Body */}
            <div className="flex-1 overflow-y-auto p-5">
              {previewLoading ? (
                <div className="p-12 text-center text-xs text-[#6B7686]">
                  Calculating preview from attendance and advance balances...
                </div>
              ) : previewItems.length === 0 ? (
                <div className="p-12 text-center text-xs text-[#6B7686]">
                  All active staff members already have salary slips generated for this month.
                </div>
              ) : (
                <div className="border border-[#E2E6ED] rounded-xl overflow-x-auto shadow-xs">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-[#F8FAFC] border-b border-[#E2E6ED] text-[#6B7686]">
                        <th className="px-3 py-2.5 w-8">Include</th>
                        <th className="px-3 py-2.5 font-semibold">Staff</th>
                        <th className="px-3 py-2.5 font-semibold text-right">Base Salary</th>
                        <th className="px-3 py-2.5 font-semibold text-center">F/H/L/A</th>
                        <th className="px-3 py-2.5 font-semibold text-center">Payable d</th>
                        <th className="px-3 py-2.5 font-semibold text-right">Earned</th>
                        <th className="px-3 py-2.5 font-semibold text-center">Bonus (+)</th>
                        <th className="px-3 py-2.5 font-semibold text-center">Other Ded (-)</th>
                        <th className="px-3 py-2.5 font-semibold text-center">Adv. Ded (-)</th>
                        <th className="px-3 py-2.5 font-semibold text-right">Net Payable</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E6ED]">
                      {previewItems.map((item) => (
                        <tr
                          key={item.staffId}
                          className={`hover:bg-[#F8FAFC]/50 ${item.skip ? 'opacity-50 bg-slate-50' : ''}`}
                        >
                          {/* Include Checkbox */}
                          <td className="px-3 py-2.5 text-center">
                            <input
                              type="checkbox"
                              checked={!item.skip}
                              onChange={(e) => updatePreviewItem(item.staffId, 'skip', !e.target.checked)}
                              className="rounded border-[#E2E6ED] text-[#2F6FED] cursor-pointer"
                            />
                          </td>

                          {/* Staff */}
                          <td className="px-3 py-2.5">
                            <div className="font-semibold text-[#1A2333]">{item.fullName}</div>
                            <div className="text-[10px] text-[#6B7686]">{item.staffCode}</div>
                          </td>

                          {/* Base */}
                          <td className="px-3 py-2.5 text-right font-medium text-[#1A2333]">
                            {formatINR(item.baseSalary)}
                          </td>

                          {/* Attendance breakdown */}
                          <td className="px-3 py-2.5 text-center text-[10px] text-[#6B7686]">
                            <span className="text-emerald-700 font-bold">{item.fullDays}F</span> /{' '}
                            <span className="text-amber-700 font-bold">{item.halfDays}H</span> /{' '}
                            <span className="text-blue-700 font-bold">{item.paidLeaveDays}L</span> /{' '}
                            <span className="text-rose-700 font-bold">{item.absentDays}A</span>
                          </td>

                          {/* Payable days */}
                          <td className="px-3 py-2.5 text-center font-bold text-[#1A2333]">
                            {item.payableDays}d
                          </td>

                          {/* Earned Salary */}
                          <td className="px-3 py-2.5 text-right font-semibold text-emerald-700">
                            {formatINR(item.earnedSalary)}
                          </td>

                          {/* Editable Bonus */}
                          <td className="px-2 py-2.5 text-center">
                            <input
                              type="number"
                              min="0"
                              step="100"
                              disabled={item.skip}
                              value={item.bonusAmount || ''}
                              onChange={(e) =>
                                updatePreviewItem(item.staffId, 'bonusAmount', Number(e.target.value))
                              }
                              className="w-16 px-1.5 py-1 text-center border border-[#E2E6ED] rounded text-xs focus:ring-1 focus:ring-[#2F6FED]"
                              placeholder="0"
                            />
                          </td>

                          {/* Editable Other Deductions */}
                          <td className="px-2 py-2.5 text-center">
                            <input
                              type="number"
                              min="0"
                              step="100"
                              disabled={item.skip}
                              value={item.otherDeductions || ''}
                              onChange={(e) =>
                                updatePreviewItem(item.staffId, 'otherDeductions', Number(e.target.value))
                              }
                              className="w-16 px-1.5 py-1 text-center border border-[#E2E6ED] rounded text-xs focus:ring-1 focus:ring-[#2F6FED]"
                              placeholder="0"
                            />
                          </td>

                          {/* Editable Advance Deduction */}
                          <td className="px-2 py-2.5 text-center">
                            <div className="flex flex-col items-center">
                              <input
                                type="number"
                                min="0"
                                max={item.outstandingAdvance}
                                step="100"
                                disabled={item.skip || item.outstandingAdvance === 0}
                                value={item.advanceDeduction || ''}
                                onChange={(e) =>
                                  updatePreviewItem(
                                    item.staffId,
                                    'advanceDeduction',
                                    Number(e.target.value)
                                  )
                                }
                                className="w-20 px-1.5 py-1 text-center border border-[#E2E6ED] rounded text-xs focus:ring-1 focus:ring-[#2F6FED]"
                                placeholder="0"
                              />
                              {item.outstandingAdvance > 0 && (
                                <span className="text-[10px] text-[#6B7686] mt-0.5">
                                  Out: {formatINR(item.outstandingAdvance)}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Net Payable */}
                          <td className="px-3 py-2.5 text-right font-bold text-sm text-[#1A2333]">
                            {formatINR(item.netPayable)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-[#E2E6ED] flex items-center justify-between">
              <span className="text-xs text-[#6B7686]">
                Generates salary slips with status <strong>DRAFT</strong>. You can review and finalize them next.
              </span>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsPreviewOpen(false)}
                  className="px-4 py-2 border border-[#E2E6ED] rounded-lg text-xs font-semibold text-[#6B7686] hover:bg-[#F8FAFC]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={generating || previewItems.filter((i) => !i.skip).length === 0}
                  onClick={handleGenerateSalaries}
                  className="px-5 py-2 bg-[#2F6FED] hover:bg-[#2557BC] text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  {generating ? 'Generating Slips...' : 'Save Draft Slips'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* STEP 3: RECORD SALARY PAYMENT MODAL */}
      {/* ================================================================ */}
      {payingSlip && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-[#E2E6ED] max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[#E2E6ED] pb-3">
              <div>
                <h3 className="font-heading font-bold text-base text-[#1A2333]">
                  Record Salary Payment
                </h3>
                <p className="text-xs text-[#6B7686]">
                  Payout to {payingSlip.staffName} for {payingSlip.salaryMonth}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPayingSlip(null)}
                className="p-1 rounded-lg text-[#6B7686] hover:bg-[#F1F3F7]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Balance banner */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-900 flex items-center justify-between">
              <div>
                <span>Net Payable: {formatINR(payingSlip.netPayable)}</span>
                <div className="text-[11px] text-blue-700">Already Paid: {formatINR(payingSlip.paidAmount)}</div>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-blue-700 uppercase">Remaining Due</span>
                <div className="font-bold text-base text-blue-950">
                  {formatINR(payingSlip.balanceAmount)}
                </div>
              </div>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-4 text-xs">
              {/* Amount & Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#1A2333] mb-1">
                    Amount (₹) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={payingSlip.balanceAmount}
                    step="0.01"
                    required
                    value={payForm.amount}
                    onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E2E6ED] rounded-lg text-xs text-[#1A2333] focus:outline-none focus:ring-1 focus:ring-[#2F6FED]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#1A2333] mb-1">
                    Payment Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={payForm.paymentDate}
                    onChange={(e) => setPayForm({ ...payForm, paymentDate: e.target.value })}
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
                      onClick={() => setPayForm({ ...payForm, paymentMode: m })}
                      className={`py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                        payForm.paymentMode === m
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
              {payForm.paymentMode !== 'CASH' && (
                <div>
                  <label className="block font-semibold text-[#1A2333] mb-1">
                    Disbursing Bank Account <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={payForm.bankAccountId}
                    onChange={(e) => setPayForm({ ...payForm, bankAccountId: e.target.value })}
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

              {/* Reference & Note */}
              <div>
                <label className="block font-semibold text-[#1A2333] mb-1">Reference No / UTR</label>
                <input
                  type="text"
                  placeholder="e.g. UTR-9821421"
                  value={payForm.referenceNo}
                  onChange={(e) => setPayForm({ ...payForm, referenceNo: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E2E6ED] rounded-lg text-xs text-[#1A2333] focus:outline-none focus:ring-1 focus:ring-[#2F6FED]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#1A2333] mb-1">Remarks / Note</label>
                <input
                  type="text"
                  placeholder="e.g. September month salary payout"
                  value={payForm.note}
                  onChange={(e) => setPayForm({ ...payForm, note: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E2E6ED] rounded-lg text-xs text-[#1A2333] focus:outline-none focus:ring-1 focus:ring-[#2F6FED]"
                />
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#E2E6ED]">
                <button
                  type="button"
                  onClick={() => setPayingSlip(null)}
                  className="px-4 py-2 border border-[#E2E6ED] rounded-lg text-xs font-semibold text-[#6B7686] hover:bg-[#F8FAFC]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingPayment}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  {submittingPayment ? 'Processing...' : 'Confirm Payout'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* PAYSLIP DETAIL & PRINT DRAWER */}
      {/* ================================================================ */}
      {viewSlipId && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex justify-end">
          <div className="bg-white w-full max-w-2xl h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
            {/* Header */}
            <div className="p-5 border-b border-[#E2E6ED] flex items-center justify-between">
              <div>
                <h3 className="font-heading font-bold text-base text-[#1A2333]">
                  Salary Slip & Payout Timeline
                </h3>
                {slipDetail && (
                  <p className="text-xs text-[#6B7686]">
                    Slip #{slipDetail.slip.slipId} • {slipDetail.slip.staffName}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2F6FED] hover:bg-[#2557BC] text-white rounded-lg text-xs font-semibold transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print Payslip
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setViewSlipId(null);
                    setSlipDetail(null);
                  }}
                  className="p-1.5 rounded-lg text-[#6B7686] hover:bg-[#F1F3F7]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Drawer Body (Printable area) */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 printable-payslip">
              {loadingDetail ? (
                <div className="p-12 text-center text-xs text-[#6B7686]">
                  Loading payslip details...
                </div>
              ) : !slipDetail ? (
                <div className="p-12 text-center text-xs text-[#6B7686]">
                  Payslip not found.
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Gym Info Header */}
                  <div className="border-b border-[#E2E6ED] pb-4 flex justify-between items-start">
                    <div>
                      <h2 className="font-heading font-extrabold text-lg text-[#1A2333]">
                        {slipDetail.gym.gymName}
                      </h2>
                      {slipDetail.gym.address && (
                        <p className="text-xs text-[#6B7686] mt-0.5">{slipDetail.gym.address}</p>
                      )}
                      <div className="text-[11px] text-[#6B7686] flex gap-3 mt-1">
                        {slipDetail.gym.phone && <span>Tel: {slipDetail.gym.phone}</span>}
                        {slipDetail.gym.email && <span>Email: {slipDetail.gym.email}</span>}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-[#E8EFFE] text-[#2F6FED]">
                        PAYSLIP
                      </span>
                      <div className="text-xs font-semibold text-[#1A2333] mt-1.5">
                        Month: {slipDetail.slip.salaryMonth}
                      </div>
                      <div className="text-[11px] text-[#6B7686]">
                        Slip ID: #{slipDetail.slip.slipId}
                      </div>
                    </div>
                  </div>

                  {/* Staff Info Grid */}
                  <div className="grid grid-cols-2 gap-4 bg-[#F8FAFC] p-4 rounded-xl border border-[#E2E6ED] text-xs">
                    <div>
                      <span className="text-[#6B7686] text-[11px]">Employee Name:</span>
                      <div className="font-bold text-[#1A2333] text-sm mt-0.5">
                        {slipDetail.slip.staffName}
                      </div>
                      <div className="text-[11px] text-[#6B7686] mt-1">
                        Code: {slipDetail.slip.staffCode} • {slipDetail.slip.designation || 'Staff'}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[#6B7686] text-[11px]">Attendance Record:</span>
                      <div className="font-semibold text-[#1A2333] mt-0.5">
                        {slipDetail.slip.payableDays} Payable Days / {slipDetail.slip.daysInMonth} Days
                      </div>
                      <div className="text-[11px] text-[#6B7686] mt-1">
                        Full: {slipDetail.slip.fullDays} | Half: {slipDetail.slip.halfDays} | Leave:{' '}
                        {slipDetail.slip.paidLeaveDays} | Absent: {slipDetail.slip.absentDays}
                      </div>
                    </div>
                  </div>

                  {/* Earnings & Deductions Breakdown */}
                  <div className="grid grid-cols-2 gap-6 text-xs">
                    {/* Earnings */}
                    <div className="border border-[#E2E6ED] rounded-xl overflow-hidden">
                      <div className="bg-[#F8FAFC] px-4 py-2 font-bold text-[#1A2333] border-b border-[#E2E6ED]">
                        Earnings
                      </div>
                      <div className="p-4 space-y-2.5">
                        <div className="flex justify-between">
                          <span className="text-[#6B7686]">Base Monthly Salary:</span>
                          <span className="font-medium text-[#1A2333]">
                            {formatINR(slipDetail.slip.baseSalary)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#6B7686]">Earned Salary (Prorated):</span>
                          <span className="font-semibold text-emerald-700">
                            {formatINR(slipDetail.slip.earnedSalary)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#6B7686]">Incentives / Bonus:</span>
                          <span className="font-medium text-emerald-700">
                            +{formatINR(slipDetail.slip.bonusAmount)}
                          </span>
                        </div>
                        <div className="pt-2 border-t border-[#E2E6ED] flex justify-between font-bold text-[#1A2333]">
                          <span>Gross Earnings:</span>
                          <span>
                            {formatINR(slipDetail.slip.earnedSalary + slipDetail.slip.bonusAmount)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Deductions */}
                    <div className="border border-[#E2E6ED] rounded-xl overflow-hidden">
                      <div className="bg-[#F8FAFC] px-4 py-2 font-bold text-[#1A2333] border-b border-[#E2E6ED]">
                        Deductions
                      </div>
                      <div className="p-4 space-y-2.5">
                        <div className="flex justify-between">
                          <span className="text-[#6B7686]">Other Deductions:</span>
                          <span className="font-medium text-rose-600">
                            -{formatINR(slipDetail.slip.otherDeductions)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#6B7686]">Advance Recovery:</span>
                          <span className="font-medium text-purple-700">
                            -{formatINR(slipDetail.slip.advanceDeduction)}
                          </span>
                        </div>
                        <div className="pt-2 border-t border-[#E2E6ED] flex justify-between font-bold text-[#1A2333]">
                          <span>Total Deductions:</span>
                          <span className="text-rose-600">
                            -{formatINR(
                              slipDetail.slip.otherDeductions + slipDetail.slip.advanceDeduction
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Net Payable Banner */}
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                        Net Amount Payable
                      </span>
                      <div className="text-xs text-emerald-700 mt-0.5">
                        Final compensation after all adjustments
                      </div>
                    </div>
                    <div className="text-2xl font-extrabold text-emerald-900 font-heading">
                      {formatINR(slipDetail.slip.netPayable)}
                    </div>
                  </div>

                  {/* Advance Recoveries Detail */}
                  {slipDetail.advanceDeductions.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-heading font-bold text-xs text-[#1A2333]">
                        Advance Recoveries Applied (FIFO)
                      </h4>
                      <div className="border border-[#E2E6ED] rounded-lg overflow-hidden text-xs">
                        <table className="w-full text-left">
                          <thead className="bg-[#F8FAFC] border-b border-[#E2E6ED] text-[#6B7686]">
                            <tr>
                              <th className="px-3 py-1.5 font-semibold">Advance ID</th>
                              <th className="px-3 py-1.5 font-semibold">Reason</th>
                              <th className="px-3 py-1.5 font-semibold text-right">Deducted Amount</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#E2E6ED]">
                            {slipDetail.advanceDeductions.map((ad) => (
                              <tr key={ad.repaymentId}>
                                <td className="px-3 py-1.5">Advance #{ad.advanceId}</td>
                                <td className="px-3 py-1.5 text-[#6B7686]">
                                  {ad.advanceReason || 'Staff Advance'}
                                </td>
                                <td className="px-3 py-1.5 text-right font-semibold text-purple-700">
                                  {formatINR(ad.amount)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Payout History Timeline */}
                  <div className="space-y-2">
                    <h4 className="font-heading font-bold text-xs text-[#1A2333]">
                      Disbursement History
                    </h4>
                    {slipDetail.payments.length === 0 ? (
                      <div className="p-4 border border-[#E2E6ED] rounded-lg text-center text-xs text-[#6B7686]">
                        No payouts recorded yet for this salary slip.
                      </div>
                    ) : (
                      <div className="border border-[#E2E6ED] rounded-lg overflow-hidden text-xs">
                        <table className="w-full text-left">
                          <thead className="bg-[#F8FAFC] border-b border-[#E2E6ED] text-[#6B7686]">
                            <tr>
                              <th className="px-3 py-2 font-semibold">Date & Mode</th>
                              <th className="px-3 py-2 font-semibold">Reference</th>
                              <th className="px-3 py-2 font-semibold">Paid By</th>
                              <th className="px-3 py-2 font-semibold text-right">Amount Paid</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#E2E6ED]">
                            {slipDetail.payments.map((p) => (
                              <tr key={p.paymentId}>
                                <td className="px-3 py-2">
                                  <span className="font-semibold text-[#1A2333]">{p.paymentDate}</span>
                                  <div className="text-[10px] text-[#6B7686]">
                                    {p.paymentMode} {p.bankName ? `(${p.bankName})` : ''}
                                  </div>
                                </td>
                                <td className="px-3 py-2 text-[#6B7686]">{p.referenceNo || '—'}</td>
                                <td className="px-3 py-2 text-[#6B7686]">{p.paidByName}</td>
                                <td className="px-3 py-2 text-right font-bold text-emerald-700">
                                  {formatINR(p.amount)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-[#E2E6ED] flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setViewSlipId(null);
                  setSlipDetail(null);
                }}
                className="px-4 py-2 border border-[#E2E6ED] rounded-lg text-xs font-semibold text-[#1A2333] hover:bg-[#F8FAFC]"
              >
                Close Payslip
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

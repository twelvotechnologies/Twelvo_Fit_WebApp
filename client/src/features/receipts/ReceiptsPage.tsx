import { memo, useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Receipt as ReceiptIcon,
  Search,
  Plus,
  Printer,
  X,
  CheckCircle2,
  Clock,
  Check,
  AlertCircle,
  AlertTriangle,
  ShieldCheck,
  UserCheck,
  Calendar,
  CreditCard,
  ArrowRight,
  TrendingUp,
  RefreshCw,
  Building2,
  Users,
  Eye,
} from 'lucide-react';
import { useAuthStore } from '../../stores/useAuthStore';
import {
  getReceipts,
  getPendingReceipts,
  submitReceipt,
  approvePendingReceipt,
  rejectPendingReceipt,
  ReceiptItem,
} from '../../api/receiptsApi';
import { getMembers, MemberRecord } from '../../api/membersApi';
import { getPlanTypes, getPaymentTypes } from '../../api/settingsApi';
import { PlanTypeItem, PaymentTypeItem } from '../../api/types';

const formatINR = (val: number) => '₹ ' + (val || 0).toLocaleString('en-IN');

function computeRecalculatedDueDate(
  currentDueDateStr: string,
  unit: string = 'Months',
  value: number = 1
): string {
  if (!currentDueDateStr || currentDueDateStr === 'One-time') return 'One-time';
  const baseDate = !isNaN(new Date(currentDueDateStr).getTime())
    ? new Date(currentDueDateStr)
    : new Date('2024-03-14');

  if (unit === 'Days') {
    baseDate.setDate(baseDate.getDate() + (value || 30));
  } else if (unit === 'Years') {
    baseDate.setFullYear(baseDate.getFullYear() + (value || 1));
  } else if (unit === 'One-time') {
    return 'One-time';
  } else {
    baseDate.setMonth(baseDate.getMonth() + (value || 1));
  }

  return baseDate.toISOString().split('T')[0];
}

type ReceiptTab = 'ALL' | 'PENDING_APPROVAL';

function ReceiptsPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  // Tab State
  const [activeTab, setActiveTab] = useState<ReceiptTab>('ALL');

  // Ledger & Roster Data
  const [receipts, setReceipts] = useState<ReceiptItem[]>([]);
  const [pendingReceipts, setPendingReceipts] = useState<ReceiptItem[]>([]);
  const [members, setMembers] = useState<MemberRecord[]>([]);
  const [planTypes, setPlanTypes] = useState<PlanTypeItem[]>([]);
  const [paymentTypes, setPaymentTypes] = useState<PaymentTypeItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PAID' | 'PENDING' | 'OVERDUE'>('ALL');
  const [modeFilter, setModeFilter] = useState<string>('ALL');

  // Modals state
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [activeReceiptForSlip, setActiveReceiptForSlip] = useState<ReceiptItem | null>(null);

  // Review Modal State
  const [reviewingPendingReceipt, setReviewingPendingReceipt] = useState<ReceiptItem | null>(null);
  const [isRejectMode, setIsRejectMode] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Submitter Role in Record Payment Modal (derived directly from authenticated role)
  const isTrainer = user?.role === 'trainer';
  const submitterRole: 'admin' | 'trainer' = isTrainer ? 'trainer' : 'admin';
  const currentSubmitterName = user?.fullName
    ? `${user.fullName} (${isTrainer ? 'Trainer' : 'Admin'})`
    : user?.username || (isTrainer ? 'Trainer' : 'Staff Admin');

  // Record Payment Form state
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [selectedMember, setSelectedMember] = useState<MemberRecord | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [customAmount, setCustomAmount] = useState(2500);
  const [paymentMode, setPaymentMode] = useState<'UPI' | 'Card' | 'Bank Transfer' | 'Cash'>('UPI');
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [referenceNo, setReferenceNo] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [rcpts, pendingRcpts, mems, plans, pts] = await Promise.all([
        getReceipts(),
        getPendingReceipts(),
        getMembers(),
        getPlanTypes(),
        getPaymentTypes(),
      ]);
      setReceipts(rcpts);
      setPendingReceipts(pendingRcpts);
      setMembers(mems);
      const activePlans = plans.filter((p) => p.isActive);
      setPlanTypes(activePlans);
      if (activePlans.length > 0 && !selectedPlanId) {
        setSelectedPlanId(activePlans[0].id);
        setCustomAmount(activePlans[0].standardFee || 2500);
      }
      setPaymentTypes(pts.filter((p) => p.isActive));
    } catch (err) {
      console.error('Failed to load receipts data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered Approved Receipts (Ledger)
  const filteredReceipts = useMemo(() => {
    return receipts.filter((r) => {
      const matchesSearch =
        r.memberName.toLowerCase().includes(search.toLowerCase()) ||
        r.receiptNo.toLowerCase().includes(search.toLowerCase()) ||
        r.memberPhone.includes(search);

      const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
      const matchesMode = modeFilter === 'ALL' || r.paymentMode === modeFilter;

      return matchesSearch && matchesStatus && matchesMode;
    });
  }, [receipts, search, statusFilter, modeFilter]);

  // Total metrics (Only approved receipts count toward revenue)
  const totalCollected = useMemo(() => {
    return receipts
      .filter((r) => r.status === 'PAID')
      .reduce((acc, curr) => acc + curr.total, 0);
  }, [receipts]);

  const totalPendingInvoices = useMemo(() => {
    return receipts
      .filter((r) => r.status !== 'PAID')
      .reduce((acc, curr) => acc + curr.total, 0);
  }, [receipts]);

  const totalGst = useMemo(() => {
    return receipts
      .filter((r) => r.status === 'PAID')
      .reduce((acc, curr) => acc + curr.tax, 0);
  }, [receipts]);

  // Selected Plan in Modal
  const currentPlan = useMemo(() => {
    return (
      planTypes.find((p) => p.id === selectedPlanId) ||
      planTypes[0] || {
        id: 'fee-2',
        name: 'Monthly',
        category: 'Regular' as const,
        durationValue: 1,
        durationUnit: 'Months' as const,
        displayDuration: '1 Month',
        standardFee: 2500,
        isActive: true,
      }
    );
  }, [planTypes, selectedPlanId]);

  // Recalculated due date preview for Record Payment modal
  const predictedDueDate = useMemo(() => {
    if (!selectedMember) return '';
    return computeRecalculatedDueDate(
      selectedMember.expiryDate,
      currentPlan.durationUnit,
      currentPlan.durationValue
    );
  }, [selectedMember, currentPlan]);

  // Member search matching list in Record Payment modal
  const matchingMembers = useMemo(() => {
    if (!memberSearchQuery.trim()) return members;
    const q = memberSearchQuery.toLowerCase();
    return members.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        (m.phone && m.phone.includes(q)) ||
        (m.memberId && m.memberId.toLowerCase().includes(q))
    );
  }, [members, memberSearchQuery]);

  // When a member is picked in the typeahead
  const handleSelectMember = (m: MemberRecord) => {
    setSelectedMember(m);
    setMemberSearchQuery(m.name);
    // Find matching plan if available
    const matchedPlan = planTypes.find((p) => p.name === m.planName);
    if (matchedPlan) {
      setSelectedPlanId(matchedPlan.id);
      setCustomAmount(matchedPlan.standardFee || 2500);
    }
  };

  // When plan changes
  const handlePlanChange = (planId: string) => {
    setSelectedPlanId(planId);
    const p = planTypes.find((x) => x.id === planId);
    if (p) {
      setCustomAmount(p.standardFee || 2500);
    }
  };

  // Open Record Payment modal with clean form
  const handleOpenRecordModal = () => {
    setSelectedMember(null); // Never preselect default member!
    setMemberSearchQuery('');
    if (planTypes.length > 0) {
      setSelectedPlanId(planTypes[0].id);
      setCustomAmount(planTypes[0].standardFee || 2500);
    }
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setReferenceNo('');
    setIsRecordModalOpen(true);
  };

  // Submit Payment Record
  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember) {
      alert('Please select a registered member.');
      return;
    }

    const baseAmount = Number(customAmount) || 0;
    if (baseAmount <= 0) {
      alert('Please enter a valid payment amount.');
      return;
    }

    try {
      setActionLoading(true);
      const result = await submitReceipt(
        {
          memberId: selectedMember.id,
          memberName: selectedMember.name,
          memberPhone: selectedMember.phone,
          plan: currentPlan.name,
          planCategory: currentPlan.category || 'Regular',
          planDurationUnit: currentPlan.durationUnit,
          planDurationValue: currentPlan.durationValue,
          amount: baseAmount,
          paymentMode,
          paymentDate,
          referenceNo: referenceNo.trim() || undefined,
        },
        submitterRole,
        submitterRole === 'trainer' ? currentSubmitterName : (user?.fullName || 'Staff Admin')
      );

      setIsRecordModalOpen(false);

      if (result.isAutoApproved) {
        setReceipts((prev) => [result.receipt, ...prev]);
        // Update member expiry date in local state as well
        const updatedDueDate = computeRecalculatedDueDate(
          selectedMember.expiryDate,
          currentPlan.durationUnit,
          currentPlan.durationValue
        );
        setMembers((prev) =>
          prev.map((m) =>
            m.id === selectedMember.id
              ? {
                  ...m,
                  expiryDate: updatedDueDate,
                  isEstimatedDueDate: false,
                  status: 'ACTIVE',
                  paymentStatus: 'PAID_UP',
                }
              : m
          )
        );
        setActiveTab('ALL');
        setActiveReceiptForSlip(result.receipt);
      } else {
        setPendingReceipts((prev) => [result.receipt, ...prev]);
        setActiveTab('PENDING_APPROVAL');
        alert(
          `Payment receipt for ${selectedMember.name} submitted by trainer. It is queued in 'Pending Approval' for admin review.`
        );
      }
    } catch (err: any) {
      alert(err.message || 'Failed to record payment');
    } finally {
      setActionLoading(false);
    }
  };

  // Approve Pending Receipt Action
  const handleApprovePendingReceipt = async (receiptId: string) => {
    try {
      setActionLoading(true);
      const approved = await approvePendingReceipt(receiptId);
      setReceipts((prev) => [approved, ...prev]);
      setPendingReceipts((prev) => prev.filter((r) => r.id !== receiptId));

      // Update member expiry in local state
      if (approved.memberId) {
        const mem = members.find((m) => m.id === approved.memberId);
        if (mem) {
          const updatedDueDate = computeRecalculatedDueDate(
            mem.expiryDate,
            approved.planDurationUnit || 'Months',
            approved.planDurationValue || 1
          );
          setMembers((prev) =>
            prev.map((m) =>
              m.id === approved.memberId
                ? {
                    ...m,
                    expiryDate: updatedDueDate,
                    isEstimatedDueDate: false,
                    status: 'ACTIVE',
                    paymentStatus: 'PAID_UP',
                  }
                : m
            )
          );
        }
      }

      setReviewingPendingReceipt(null);
      setIsRejectMode(false);
      setRejectionReason('');
      setActiveTab('ALL');
      setActiveReceiptForSlip(approved);
    } catch (err: any) {
      alert(err.message || 'Failed to approve receipt');
    } finally {
      setActionLoading(false);
    }
  };

  // Reject Pending Receipt Action
  const handleRejectPendingReceipt = async () => {
    if (!reviewingPendingReceipt) return;
    if (!rejectionReason.trim()) {
      alert('A rejection reason is mandatory before rejecting.');
      return;
    }

    try {
      setActionLoading(true);
      await rejectPendingReceipt(reviewingPendingReceipt.id, rejectionReason.trim());
      setPendingReceipts((prev) => prev.filter((r) => r.id !== reviewingPendingReceipt.id));
      setReviewingPendingReceipt(null);
      setIsRejectMode(false);
      setRejectionReason('');
      alert('Receipt submission was rejected. No financial or due date records were altered.');
    } catch (err: any) {
      alert(err.message || 'Failed to reject receipt');
    } finally {
      setActionLoading(false);
    }
  };

  // Finding member for the receipt being reviewed
  const reviewingMember = useMemo(() => {
    if (!reviewingPendingReceipt?.memberId) return null;
    return members.find((m) => m.id === reviewingPendingReceipt.memberId) || null;
  }, [reviewingPendingReceipt, members]);

  // Recalculated due date preview in review modal
  const reviewCalculatedDueDate = useMemo(() => {
    if (!reviewingMember || !reviewingPendingReceipt) return '—';
    return computeRecalculatedDueDate(
      reviewingMember.expiryDate,
      reviewingPendingReceipt.planDurationUnit || 'Months',
      reviewingPendingReceipt.planDurationValue || 1
    );
  }, [reviewingMember, reviewingPendingReceipt]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Top Header & Segmented Control Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-heading text-2xl font-bold text-[#1A2333] tracking-tight">
              Receipts & Collections
            </h1>
            {user?.gymName && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#EEF4FF] text-[#2F6FED] border border-[#D5E3FF]">
                <Building2 className="w-3 h-3" />
                {user.gymName}
              </span>
            )}
          </div>
          <p className="text-sm text-[#6B7686] mt-0.5">
            Member fee collections, verified GST ledger, and trainer payment approval queue
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => loadData()}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-[#E2E6ED] hover:bg-[#F8FAFC] text-[#344054] rounded-lg text-xs font-medium transition-colors shadow-subtle disabled:opacity-50"
            title="Refresh receipts ledger"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#2F6FED]' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => handleOpenRecordModal()}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-[#2F6FED] hover:bg-[#2558bf] text-white rounded-lg text-xs font-semibold transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Record Payment
          </button>
        </div>
      </div>

      {/* SEGMENTED CONTROL TABS: [All Receipts] [Pending Approval (n)] */}
      <div className="flex items-center border-b border-[#E2E6ED]">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('ALL')}
            className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'ALL'
                ? 'border-[#2F6FED] text-[#2F6FED]'
                : 'border-transparent text-[#6B7686] hover:text-[#1A2333]'
            }`}
          >
            <ReceiptIcon className="w-4 h-4" />
            All Receipts
            <span className="ml-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#F5F7FA] text-[#6B7686] border border-[#E2E6ED]">
              {receipts.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('PENDING_APPROVAL')}
            className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'PENDING_APPROVAL'
                ? 'border-[#D99A3E] text-[#92400E]'
                : 'border-transparent text-[#6B7686] hover:text-[#1A2333]'
            }`}
          >
            <Clock className="w-4 h-4 text-[#D99A3E]" />
            Pending Approval
            {pendingReceipts.length > 0 && (
              <span className="ml-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#FFFBEB] text-[#D99A3E] border border-[#FDE68A] animate-pulse">
                {pendingReceipts.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: ALL RECEIPTS (LIVE FINANCIAL LEDGER) */}
      {/* ========================================================================= */}
      {activeTab === 'ALL' && (
        <div className="space-y-6 animate-fade-in">
          {/* Metrics Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-[#E2E6ED] rounded-xl p-4 shadow-subtle flex flex-col justify-between">
              <div>
                <span className="text-xs font-medium text-[#6B7686]">Total Revenue (Paid)</span>
                <div className="font-heading font-bold text-xl text-[#1A2333] mt-1 tabular-nums">
                  {formatINR(totalCollected)}
                </div>
              </div>
              <div className="mt-3 text-[11px] text-[#2E9E6D] flex items-center gap-1 font-semibold">
                <TrendingUp className="w-3.5 h-3.5" />
                Verified GST Collections
              </div>
            </div>

            <div className="bg-white border border-[#E2E6ED] rounded-xl p-4 shadow-subtle flex flex-col justify-between">
              <div>
                <span className="text-xs font-medium text-[#6B7686]">GST Output (18%)</span>
                <div className="font-heading font-bold text-xl text-[#1A2333] mt-1 tabular-nums">
                  {formatINR(totalGst)}
                </div>
              </div>
              <div className="mt-3 text-[11px] text-[#6B7686]">
                Compliant for monthly filing
              </div>
            </div>

            <div className="bg-white border border-[#E2E6ED] rounded-xl p-4 shadow-subtle flex flex-col justify-between">
              <div>
                <span className="text-xs font-medium text-[#6B7686]">Unsettled Invoices</span>
                <div className="font-heading font-bold text-xl text-[#D14343] mt-1 tabular-nums">
                  {formatINR(totalPendingInvoices)}
                </div>
              </div>
              <div className="mt-3 text-[11px] text-[#D14343] font-medium">
                Pending member fee renewals
              </div>
            </div>

            <div className="bg-white border border-[#E2E6ED] rounded-xl p-4 shadow-subtle flex flex-col justify-between">
              <div>
                <span className="text-xs font-medium text-[#6B7686]">Issued Invoices</span>
                <div className="font-heading font-bold text-xl text-[#2F6FED] mt-1 tabular-nums">
                  {receipts.length} slips
                </div>
              </div>
              <div className="mt-3 text-[11px] text-[#6B7686]">
                100% digital audit trail
              </div>
            </div>
          </div>

          {/* Filters & Search Toolbar */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-white p-3.5 border border-[#E2E6ED] rounded-xl shadow-subtle">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-[#6B7686] absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search member, phone, receipt #..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 text-xs bg-[#F5F7FA] border border-[#E2E6ED] rounded-lg focus:outline-none focus:border-[#2F6FED]"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-3 py-1.5 text-xs border border-[#E2E6ED] rounded-lg bg-white text-[#1A2333] focus:outline-none focus:border-[#2F6FED]"
              >
                <option value="ALL">All Status</option>
                <option value="PAID">Paid</option>
                <option value="PENDING">Pending</option>
                <option value="OVERDUE">Overdue</option>
              </select>

              <select
                value={modeFilter}
                onChange={(e) => setModeFilter(e.target.value)}
                className="px-3 py-1.5 text-xs border border-[#E2E6ED] rounded-lg bg-white text-[#1A2333] focus:outline-none focus:border-[#2F6FED]"
              >
                <option value="ALL">All Payment Modes</option>
                <option value="UPI">UPI</option>
                <option value="Card">Card</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Cash">Cash</option>
              </select>
            </div>
          </div>

          {/* All Receipts Table */}
          <div className="bg-white border border-[#E2E6ED] rounded-xl shadow-subtle overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#E2E6ED] bg-[#F5F7FA] text-[11px] font-semibold uppercase text-[#6B7686] tracking-wider">
                    <th className="py-3 px-4">Receipt No</th>
                    <th className="py-3 px-4">Member Name</th>
                    <th className="py-3 px-4">Plan & Category</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Payment Date</th>
                    <th className="py-3 px-4">Method & Ref</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E6ED] text-xs">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-[#6B7686]">
                        Loading verified receipts ledger...
                      </td>
                    </tr>
                  ) : filteredReceipts.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-[#6B7686]">
                        No receipts found matching current search or filters.
                      </td>
                    </tr>
                  ) : (
                    filteredReceipts.map((r) => (
                      <tr key={r.id} className="hover:bg-[#F5F7FA] transition-colors">
                        <td className="py-3 px-4 font-bold text-[#1A2333] whitespace-nowrap">
                          {r.receiptNo}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-[#1A2333]">{r.memberName}</div>
                          <div className="text-[11px] text-[#6B7686]">{r.memberPhone}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-[#1A2333]">{r.plan}</div>
                          <span
                            className={`inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-semibold border ${
                              r.planCategory === 'Personal Training'
                                ? 'bg-purple-50 text-purple-700 border-purple-200'
                                : 'bg-[#E8EFFE] text-[#2F6FED] border-[#2F6FED]/20'
                            }`}
                          >
                            {r.planCategory || 'Regular'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-[#1A2333] tabular-nums">
                            {formatINR(r.total)}
                          </div>
                          <div className="text-[10px] text-[#6B7686] tabular-nums">
                            Base: {formatINR(r.amount)} • GST: {formatINR(r.tax)}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-[#1A2333] tabular-nums whitespace-nowrap">
                          {r.paymentDate}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-[#1A2333]">{r.paymentMode}</div>
                          <div className="text-[10px] text-[#6B7686] font-mono truncate max-w-[130px]">
                            {r.referenceNo}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                              r.status === 'PAID'
                                ? 'bg-[#E8F8F0] text-[#2E9E6D] border border-[#2E9E6D]/20'
                                : r.status === 'PENDING'
                                ? 'bg-[#FFFBEB] text-[#D99A3E] border border-[#FDE68A]'
                                : 'bg-[#FDF2F2] text-[#D14343] border border-[#F8D7DA]'
                            }`}
                          >
                            {r.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => setActiveReceiptForSlip(r)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-[#2F6FED] hover:bg-[#E8EFFE] rounded-md transition-colors"
                            title="View Printable GST Slip"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            Print Slip
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="p-4 border-t border-[#E2E6ED] flex items-center justify-between text-xs text-[#6B7686]">
              <span>Verified immutable audit ledger.</span>
              <span className="font-medium text-[#1A2333]">
                Showing {filteredReceipts.length} of {receipts.length} receipts
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: PENDING APPROVAL (TRAINER PAYMENT QUEUE) */}
      {/* ========================================================================= */}
      {activeTab === 'PENDING_APPROVAL' && (
        <div className="space-y-4 animate-fade-in">
          {/* Informational Callout */}
          <div className="p-4 bg-[#FFFBEB] border border-[#FDE68A] rounded-xl flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-[#D99A3E] flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-[#92400E]">
                  Trainer Payment Approval Queue ({pendingReceipts.length} Pending)
                </h4>
                <p className="text-xs text-[#B45309] mt-0.5 leading-relaxed">
                  Fee payments submitted by floor trainers require administrative verification. Approving atomically generates the verified GST receipt, adds it to the live financial ledger, and advances the member's Next Due Date from their current anniversary cycle. Unapproved items have zero impact on dashboard revenue.
                </p>
              </div>
            </div>
            {isTrainer && (
              <span className="text-[11px] font-semibold text-amber-800 bg-amber-100/70 border border-amber-300 px-3 py-1.5 rounded-lg whitespace-nowrap self-start">
                Trainer View (Verification Pending)
              </span>
            )}
          </div>

          {/* Pending Receipts Table */}
          <div className="bg-white border border-[#E2E6ED] rounded-xl shadow-subtle overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#E2E6ED] bg-[#F5F7FA] text-[11px] font-semibold uppercase text-[#6B7686] tracking-wider">
                    <th className="py-3 px-4">Draft No</th>
                    <th className="py-3 px-4">Member Name</th>
                    <th className="py-3 px-4">Plan & Category</th>
                    <th className="py-3 px-4">Amount Collected</th>
                    <th className="py-3 px-4">Submitted By</th>
                    <th className="py-3 px-4">Submitted On</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E6ED] text-xs">
                  {pendingReceipts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-16 text-center text-[#6B7686]">
                        <div className="w-12 h-12 rounded-full bg-[#E8EFFE] text-[#2F6FED] flex items-center justify-center mx-auto mb-2">
                          <CheckCircle2 className="w-6 h-6" />
                        </div>
                        <div className="font-semibold text-sm text-[#1A2333]">
                          All Clear! No Pending Payments
                        </div>
                        <p className="text-xs text-[#6B7686] mt-0.5">
                          All trainer collections have been reviewed and committed.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    pendingReceipts.map((r) => (
                      <tr key={r.id} className="hover:bg-[#F5F7FA] transition-colors">
                        <td className="py-3 px-4 font-bold text-[#1A2333] whitespace-nowrap">
                          {r.receiptNo}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-[#1A2333]">{r.memberName}</div>
                          <div className="text-[11px] text-[#6B7686]">{r.memberPhone}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-[#1A2333]">{r.plan}</div>
                          <span
                            className={`inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-semibold border ${
                              r.planCategory === 'Personal Training'
                                ? 'bg-purple-50 text-purple-700 border-purple-200'
                                : 'bg-[#E8EFFE] text-[#2F6FED] border-[#2F6FED]/20'
                            }`}
                          >
                            {r.planCategory || 'Regular'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-[#1A2333] tabular-nums">
                            {formatINR(r.total)}
                          </div>
                          <div className="text-[10px] text-[#6B7686]">
                            Mode: {r.paymentMode}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5 text-[#1A2333] font-medium">
                            <UserCheck className="w-3.5 h-3.5 text-[#2F6FED]" />
                            <span>{r.submittedBy || 'Trainer'}</span>
                          </div>
                          <span className="text-[10px] uppercase font-bold text-[#D99A3E]">
                            Pending Verification
                          </span>
                        </td>
                        <td className="py-3 px-4 text-[#6B7686] whitespace-nowrap">
                          {r.submittedOn || r.paymentDate}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {isTrainer ? (
                            <button
                              onClick={() => {
                                setReviewingPendingReceipt(r);
                                setIsRejectMode(false);
                                setRejectionReason('');
                              }}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-slate-200"
                            >
                              <Eye className="w-3.5 h-3.5 text-slate-500" />
                              View Details
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                setReviewingPendingReceipt(r);
                                setIsRejectMode(false);
                                setRejectionReason('');
                              }}
                              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#2F6FED] hover:bg-[#2558bf] text-white rounded-lg text-xs font-semibold transition-colors shadow-sm"
                            >
                              <ShieldCheck className="w-3.5 h-3.5" />
                              Review & Verify
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="p-4 border-t border-[#E2E6ED] flex items-center justify-between text-xs text-[#6B7686]">
              <span>Pending items do not affect dashboard revenue or report numbers.</span>
              <span className="font-bold text-[#D99A3E]">
                {pendingReceipts.length} payments awaiting review
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* RECORD PAYMENT MODAL */}
      {/* ========================================================================= */}
      {isRecordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-fade-in">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between flex-shrink-0 bg-slate-50/70">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center shadow-2xs">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-heading text-lg font-bold text-slate-900 tracking-tight">
                    Record Member Fee Collection
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Collect membership fee, record payment method, and advance billing cycle
                  </p>
                </div>
              </div>

              {/* Header Right: Role Context Badge + Close */}
              <div className="flex items-center gap-3">
                <div
                  className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold ${
                    isTrainer
                      ? 'bg-amber-50 border-amber-200 text-amber-800'
                      : 'bg-blue-50 border-blue-200 text-blue-800'
                  }`}
                >
                  <ShieldCheck className={`w-3.5 h-3.5 ${isTrainer ? 'text-amber-600' : 'text-blue-600'}`} />
                  <span>
                    {isTrainer ? 'Recording as Trainer (Admin Approval Required)' : 'Recording as Gym Owner (Auto-Verified)'}
                  </span>
                </div>

                <button
                  onClick={() => setIsRecordModalOpen(false)}
                  className="text-slate-400 hover:text-slate-700 p-2 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body: Wide 2-Column Side-by-Side Form */}
            <form onSubmit={handleRecordPayment} className="p-6 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* ========================================================= */}
                {/* LEFT COLUMN: Member Selection & Plan Setup (Col 7) */}
                {/* ========================================================= */}
                <div className="lg:col-span-7 space-y-4">
                  {/* MEMBER SELECTION */}
                  <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-blue-600" />
                        Select Member <span className="text-red-500">*</span>
                      </label>
                      {selectedMember && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedMember(null);
                            setMemberSearchQuery('');
                          }}
                          className="text-xs font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1 hover:underline"
                        >
                          <X className="w-3.5 h-3.5" /> Re-select Member
                        </button>
                      )}
                    </div>

                    {!selectedMember ? (
                      <div className="space-y-2.5">
                        {/* Search Input */}
                        <div className="relative">
                          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                          <input
                            type="text"
                            placeholder="Type member name, phone number, or ID..."
                            value={memberSearchQuery}
                            onChange={(e) => setMemberSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-slate-900 font-medium placeholder-slate-400 transition-all shadow-2xs"
                            autoFocus
                          />
                        </div>

                        {/* Direct Roster Dropdown */}
                        {members.length > 0 && (
                          <select
                            value=""
                            onChange={(e) => {
                              const m = members.find((x) => x.id === e.target.value);
                              if (m) handleSelectMember(m);
                            }}
                            className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl bg-white text-slate-700 font-medium focus:outline-none focus:border-blue-500 cursor-pointer shadow-2xs"
                          >
                            <option value="">-- Or choose directly from member roster ({members.length}) --</option>
                            {members.map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.name} ({m.memberId} • {m.phone || 'No phone'} • {m.planName || 'General'})
                              </option>
                            ))}
                          </select>
                        )}

                        {/* Matching Members Scrollable List */}
                        {matchingMembers.length > 0 ? (
                          <div className="border border-slate-200 rounded-xl bg-white shadow-2xs max-h-40 overflow-y-auto divide-y divide-slate-100">
                            {matchingMembers.map((m) => (
                              <button
                                key={m.id}
                                type="button"
                                onClick={() => handleSelectMember(m)}
                                className="w-full text-left px-3.5 py-2.5 hover:bg-blue-50/50 transition-colors flex items-center justify-between group"
                              >
                                <div className="flex items-center gap-2.5">
                                  <div className="w-8 h-8 rounded-lg bg-blue-100/70 text-blue-700 font-bold text-xs flex items-center justify-center flex-shrink-0">
                                    {m.name.slice(0, 2).toUpperCase()}
                                  </div>
                                  <div>
                                    <div className="font-semibold text-xs text-slate-900 group-hover:text-blue-600 transition-colors">
                                      {m.name}
                                    </div>
                                    <div className="text-[11px] text-slate-500">
                                      {m.memberId} • {m.phone}
                                    </div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                                    {m.planName || 'General'}
                                  </span>
                                  <div className="text-[10px] text-slate-500 mt-0.5">
                                    Due: {m.expiryDate || 'N/A'}
                                  </div>
                                </div>
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl text-xs space-y-1">
                            <div className="flex items-center gap-1.5 font-bold text-amber-900">
                              <AlertTriangle className="w-4 h-4 text-amber-600" />
                              No matching member found
                            </div>
                            <p className="text-[11px] text-amber-800">
                              Receipts must be linked to an active member profile in the system.
                            </p>
                            <button
                              type="button"
                              onClick={() => {
                                setIsRecordModalOpen(false);
                                navigate('/members');
                              }}
                              className="text-xs font-semibold text-blue-600 hover:underline"
                            >
                              Add new member in Member Management &rarr;
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      /* High-end Selected Member Card */
                      <div className="p-4 bg-white border border-blue-200 rounded-xl shadow-2xs flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-xl bg-blue-600 text-white font-heading font-bold text-sm flex items-center justify-center shadow-sm flex-shrink-0">
                            {selectedMember.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-heading font-bold text-sm text-slate-900 flex items-center gap-2">
                              <span>{selectedMember.name}</span>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-600 font-mono font-medium">
                                {selectedMember.memberId}
                              </span>
                            </div>
                            <div className="text-xs text-slate-500 mt-0.5">
                              {selectedMember.phone} • {selectedMember.email || 'No email registered'}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Current Due</div>
                            <div className="text-xs font-bold text-slate-900 tabular-nums">
                              {selectedMember.expiryDate || 'N/A'}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedMember(null);
                              setMemberSearchQuery('');
                            }}
                            className="px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100/70 rounded-lg border border-rose-200 transition-colors"
                          >
                            Change
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* PLAN SELECTION & BASE AMOUNT */}
                  <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 space-y-3">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                      Fee Plan & Base Price
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                          Fee Plan Tier <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={selectedPlanId}
                          onChange={(e) => handlePlanChange(e.target.value)}
                          className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 shadow-2xs"
                        >
                          {planTypes.map((pt) => (
                            <option key={pt.id} value={pt.id}>
                              {pt.name} ({pt.category || 'Regular'} • {pt.displayDuration})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                          Base Amount (₹) <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-2 text-slate-400 text-sm font-semibold">₹</span>
                          <input
                            type="number"
                            required
                            min={1}
                            value={customAmount}
                            onChange={(e) => setCustomAmount(Number(e.target.value))}
                            className="w-full pl-8 pr-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-semibold text-slate-900 tabular-nums shadow-2xs"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* BILLING ANNIVERSARY CYCLE ADVANCEMENT PREVIEW */}
                  {selectedMember && (
                    <div className="p-4 bg-gradient-to-r from-blue-50/80 to-indigo-50/60 border border-blue-200/80 rounded-2xl text-xs space-y-2">
                      <div className="font-bold text-blue-800 flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-blue-600" />
                        Billing Cycle Anniversary Preservation
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-800 bg-white/80 p-2.5 rounded-xl border border-blue-100">
                        <div>
                          <span className="text-slate-500 text-[11px] block">Current Due Date</span>
                          <span className="font-bold text-slate-800">{selectedMember.expiryDate}</span>
                        </div>
                        <ArrowRight className="w-4 h-4 text-blue-600" />
                        <div className="text-right">
                          <span className="text-slate-500 text-[11px] block">New Extended Due Date</span>
                          <span className="font-bold text-blue-600 font-heading text-sm">{predictedDueDate}</span>
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-tight">
                        Next due date advances directly from current due date, preserving member's original recurring anniversary cycle.
                      </p>
                    </div>
                  )}
                </div>

                {/* ========================================================= */}
                {/* RIGHT COLUMN: Payment Mode, GST & Action Bar (Col 5) */}
                {/* ========================================================= */}
                <div className="lg:col-span-5 space-y-4">
                  {/* PAYMENT METHOD & DETAILS */}
                  <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 space-y-3.5">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                      Payment Collection Particulars
                    </div>

                    {/* Quick Mode Pill Selector */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Payment Mode
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {(paymentTypes.length > 0
                          ? paymentTypes.map((p) => p.name)
                          : ['UPI', 'Card', 'Bank Transfer', 'Cash']
                        ).map((mode) => (
                          <button
                            key={mode}
                            type="button"
                            onClick={() => setPaymentMode(mode as any)}
                            className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all text-center ${
                              paymentMode === mode
                                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {mode}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                          Payment Date <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          required
                          value={paymentDate}
                          onChange={(e) => setPaymentDate(e.target.value)}
                          className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-medium text-slate-800 shadow-2xs"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                          Ref / UTR (Optional)
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. UPI/408912..."
                          value={referenceNo}
                          onChange={(e) => setReferenceNo(e.target.value)}
                          className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-medium text-slate-800 placeholder-slate-400 shadow-2xs"
                        />
                      </div>
                    </div>
                  </div>

                  {/* FINANCIAL GST BREAKDOWN CARD */}
                  <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-md space-y-3">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                      <span>Receipt Financial Breakdown</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-medium border border-emerald-500/30">
                        GST 18% Certified
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs text-slate-300">
                      <div className="flex justify-between">
                        <span>Base Membership Fee</span>
                        <span className="tabular-nums font-semibold text-white">
                          {formatINR(Number(customAmount))}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>GST Tax (CGST 9% + SGST 9%)</span>
                        <span className="tabular-nums font-semibold text-white">
                          {formatINR(Math.round(Number(customAmount) * 0.18))}
                        </span>
                      </div>
                      <div className="pt-2 border-t border-slate-800 flex items-baseline justify-between">
                        <span className="text-sm font-bold text-white">Total Amount Due</span>
                        <span className="font-heading font-extrabold text-2xl text-emerald-400 tabular-nums">
                          {formatINR(Math.round(Number(customAmount) * 1.18))}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* ACTION BUTTONS */}
                  <div className="pt-2 flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setIsRecordModalOpen(false)}
                      className="px-5 py-2.5 border border-slate-200 hover:bg-slate-100 rounded-xl text-xs font-semibold text-slate-700 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={actionLoading || !selectedMember}
                      className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md hover:shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>
                        {actionLoading
                          ? 'Processing...'
                          : submitterRole === 'admin'
                          ? 'Issue Receipt & Update Dues'
                          : 'Submit for Admin Approval'}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PENDING APPROVAL REVIEW MODAL (WIDE 2-COLUMN NO-SCROLL) */}
      {/* ========================================================================= */}
      {reviewingPendingReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] overflow-hidden animate-fade-in flex flex-col">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between flex-shrink-0 bg-slate-50/70">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-heading text-lg font-bold text-slate-900 tracking-tight">
                    Review Trainer Payment Collection
                  </h3>
                  <div className="text-xs text-slate-500">
                    Submitted by <span className="font-semibold text-slate-800">{reviewingPendingReceipt.submittedBy}</span> on {reviewingPendingReceipt.submittedOn}
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  setReviewingPendingReceipt(null);
                  setIsRejectMode(false);
                  setRejectionReason('');
                }}
                className="text-slate-400 hover:text-slate-700 p-2 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body: 2 Columns */}
            <div className="p-6 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                {/* Left Column: Member & Due Date Impact */}
                <div className="space-y-4">
                  <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl text-amber-900 text-xs">
                    <div className="font-bold flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 text-amber-600" />
                      Trainer Floor Collection Verification
                    </div>
                    <div className="text-[11px] mt-0.5 text-amber-800 leading-tight">
                      Verify that funds have landed in the gym account before approving and extending member cycle.
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50/70 border border-slate-200/80 rounded-xl space-y-2 text-xs">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Member Information
                    </div>
                    <div className="font-bold text-slate-900 text-sm">
                      {reviewingPendingReceipt.memberName}
                    </div>
                    <div className="text-slate-500 text-xs">
                      Phone: {reviewingPendingReceipt.memberPhone}
                    </div>
                    <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                      <span className="text-slate-600">Assigned Plan:</span>
                      <span className="font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                        {reviewingPendingReceipt.plan} ({reviewingPendingReceipt.planCategory || 'Regular'})
                      </span>
                    </div>
                  </div>

                  {reviewingMember && (
                    <div className="p-4 bg-blue-50/70 border border-blue-200/80 rounded-xl space-y-2 text-xs">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-blue-800 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-blue-600" />
                        Billing Cycle Impact Upon Approval
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-900 bg-white p-2.5 rounded-lg border border-blue-100">
                        <div>
                          <span className="text-slate-500 text-[10px] block">Current Expiry</span>
                          <span className="font-bold">{reviewingMember.expiryDate}</span>
                        </div>
                        <ArrowRight className="w-4 h-4 text-blue-600" />
                        <div className="text-right">
                          <span className="text-slate-500 text-[10px] block">New Extended Expiry</span>
                          <span className="font-bold text-blue-600 font-heading">{reviewCalculatedDueDate}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Column: Financial Breakdown & Approval Form */}
                <div className="space-y-4">
                  <div className="p-4 bg-emerald-50/70 border border-emerald-200/80 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-bold text-base text-emerald-900 font-heading">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        {formatINR(reviewingPendingReceipt.total)} Collected
                      </div>
                      <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-white text-emerald-800 border border-emerald-200 shadow-2xs">
                        Mode: {reviewingPendingReceipt.paymentMode}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-emerald-900 pt-2 border-t border-emerald-200/60">
                      <div>Base: <span className="font-bold">{formatINR(reviewingPendingReceipt.amount)}</span></div>
                      <div>GST (18%): <span className="font-bold">{formatINR(reviewingPendingReceipt.tax)}</span></div>
                      <div>Date: <span className="font-bold">{reviewingPendingReceipt.paymentDate}</span></div>
                      <div>Ref: <span className="font-bold">{reviewingPendingReceipt.referenceNo || 'None'}</span></div>
                    </div>
                  </div>

                  {isRejectMode && (
                    <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-2 animate-fade-in">
                      <label className="block text-xs font-bold text-rose-900">
                        Mandatory Rejection Reason *
                      </label>
                      <textarea
                        rows={2}
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        placeholder="Enter reason for rejecting (e.g. invalid UTR, payment did not hit bank account)..."
                        className="w-full p-2.5 text-xs bg-white border border-rose-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500/20 text-slate-900 font-medium"
                      />
                    </div>
                  )}

                  {/* Actions inside Right Column */}
                  <div className="pt-2 flex items-center justify-end gap-3">
                    {isTrainer ? (
                      <div className="w-full flex items-center justify-between p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                        <span className="flex items-center gap-1.5 font-medium">
                          <Clock className="w-4 h-4 text-amber-600 flex-shrink-0" />
                          Pending verification by gym owner or super admin.
                        </span>
                        <button
                          type="button"
                          onClick={() => setReviewingPendingReceipt(null)}
                          className="px-3 py-1 bg-white border border-amber-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          Close
                        </button>
                      </div>
                    ) : !isRejectMode ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setIsRejectMode(true)}
                          className="px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl border border-transparent hover:border-rose-200 transition-colors"
                        >
                          Reject Submission
                        </button>
                        <button
                          type="button"
                          disabled={actionLoading}
                          onClick={() => handleApprovePendingReceipt(reviewingPendingReceipt.id)}
                          className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
                        >
                          <Check className="w-4 h-4" />
                          <span>{actionLoading ? 'Approving...' : 'Approve & Issue Receipt'}</span>
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => setIsRejectMode(false)}
                          className="px-4 py-2 border border-slate-200 hover:bg-slate-100 rounded-xl text-xs font-semibold text-slate-700"
                        >
                          Back
                        </button>
                        <button
                          type="button"
                          disabled={actionLoading || !rejectionReason.trim()}
                          onClick={handleRejectPendingReceipt}
                          className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md transition-all disabled:opacity-50"
                        >
                          {actionLoading ? 'Rejecting...' : 'Confirm Rejection'}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PRINTABLE RECEIPT SLIP MODAL */}
      {/* ========================================================================= */}
      {activeReceiptForSlip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white border border-[#E2E6ED] rounded-xl shadow-card w-full max-w-md overflow-hidden animate-fade-in">
            <div className="p-6 space-y-6">
              {/* Slip Header */}
              <div className="text-center pb-4 border-b border-[#E2E6ED]">
                <div className="font-heading text-lg font-extrabold text-[#1A2333] tracking-tight">
                  Gym<span className="text-[#2F6FED]">ERP</span> Fitness Center
                </div>
                <div className="text-[11px] text-[#6B7686] mt-0.5">
                  Downtown Flagship Branch • GSTIN: 27AABCP1234F1Z8
                </div>
                <div className="inline-block px-2.5 py-0.5 mt-2 bg-[#E8EFFE] text-[#2F6FED] text-[10px] font-bold rounded-full uppercase tracking-wider">
                  Payment Receipt Slip
                </div>
              </div>

              {/* Receipt Meta */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[#6B7686]">Receipt No:</span>{' '}
                  <span className="font-semibold text-[#1A2333]">{activeReceiptForSlip.receiptNo}</span>
                </div>
                <div className="text-right">
                  <span className="text-[#6B7686]">Date:</span>{' '}
                  <span className="font-semibold text-[#1A2333]">{activeReceiptForSlip.paymentDate}</span>
                </div>
                <div>
                  <span className="text-[#6B7686]">Member:</span>{' '}
                  <span className="font-semibold text-[#1A2333]">{activeReceiptForSlip.memberName}</span>
                </div>
                <div className="text-right">
                  <span className="text-[#6B7686]">Mode:</span>{' '}
                  <span className="font-semibold text-[#1A2333]">{activeReceiptForSlip.paymentMode}</span>
                </div>
              </div>

              {/* Line items */}
              <div className="border border-[#E2E6ED] rounded-lg overflow-hidden text-xs">
                <div className="bg-[#F5F7FA] px-3 py-2 font-semibold text-[#6B7686] flex justify-between border-b border-[#E2E6ED]">
                  <span>Description</span>
                  <span>Amount</span>
                </div>
                <div className="p-3 space-y-2">
                  <div className="flex justify-between">
                    <div>
                      <div className="font-medium text-[#1A2333]">{activeReceiptForSlip.plan}</div>
                      <div className="text-[10px] text-[#6B7686]">
                        {activeReceiptForSlip.planCategory || 'Regular'} Tier
                      </div>
                    </div>
                    <span className="tabular-nums font-medium text-[#1A2333]">
                      {formatINR(activeReceiptForSlip.amount)}
                    </span>
                  </div>
                  <div className="flex justify-between text-[#6B7686] pt-1 border-t border-[#E2E6ED]">
                    <span>GST @ 18%</span>
                    <span className="tabular-nums">{formatINR(activeReceiptForSlip.tax)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-[#1A2333] pt-1 border-t border-[#E2E6ED]">
                    <span>Net Paid:</span>
                    <span className="tabular-nums text-[#2F6FED]">
                      {formatINR(activeReceiptForSlip.total)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-[11px] text-[#6B7686] text-center italic">
                Thank you for your business! Keep pushing your fitness goals.
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-[#E2E6ED]">
                <button
                  onClick={() => setActiveReceiptForSlip(null)}
                  className="px-3.5 py-1.5 border border-[#E2E6ED] hover:bg-[#F5F7FA] rounded-lg text-xs font-medium text-[#1A2333]"
                >
                  Close
                </button>
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#2F6FED] hover:bg-[#2558bf] text-white rounded-lg text-xs font-medium"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print Slip
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(ReceiptsPage);

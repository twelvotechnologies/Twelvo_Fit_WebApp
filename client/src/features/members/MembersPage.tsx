import { memo, useState, useEffect, useMemo } from 'react';
import {
  Users,
  Search,
  Plus,
  X,
  RefreshCw,
  AlertTriangle,
  Calendar,
  CreditCard,
  Edit2,
  CheckCircle2,
  Clock,
  Check,
  AlertCircle,
  ShieldCheck,
  UserCheck,
  Building2,
  Eye,
} from 'lucide-react';
import { useAuthStore } from '../../stores/useAuthStore';
import {
  getMembers,
  getPendingRegistrations,
  submitMemberRegistration,
  approvePendingRegistration,
  rejectPendingRegistration,
  renewMemberPlan,
  updateMemberDueDateOverride,
  MemberRecord,
  PendingRegistrationRecord,
} from '../../api/membersApi';
import { getPlanTypes, getPaymentTypes } from '../../api/settingsApi';
import { PlanTypeItem, PaymentTypeItem } from '../../api/types';

// Standard plan pricing reference
const PLAN_STANDARD_FEES: Record<string, number> = {
  'Monthly Regular': 2500,
  'Monthly': 2500,
  'Quarterly Fitness': 6500,
  'Quarterly': 6500,
  'Annual Premium': 22000,
  'Yearly': 22000,
  'Registration': 1000,
  'Early Bird': 2000,
  'PT Monthly': 8000,
  'PT Quarterly': 21000,
  'PT 12-Sessions': 8000,
};

const getTodayISO = () => new Date().toISOString().split('T')[0];

function calculateDueDate(startDateStr: string, unit: string, value: number): string {
  if (!startDateStr) return '';
  if (unit === 'One-time') return 'One-time';

  const d = new Date(startDateStr);
  if (isNaN(d.getTime())) return '';

  if (unit === 'Days') {
    d.setDate(d.getDate() + (value || 1));
  } else if (unit === 'Months') {
    d.setMonth(d.getMonth() + (value || 1));
  } else if (unit === 'Years') {
    d.setFullYear(d.getFullYear() + (value || 1));
  } else {
    d.setMonth(d.getMonth() + 1);
  }

  return d.toISOString().split('T')[0];
}

type MemberTab = 'ALL' | 'PENDING_REGISTRATION';

function MembersPage() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<MemberTab>('ALL');
  const [members, setMembers] = useState<MemberRecord[]>([]);
  const [pendingRegistrations, setPendingRegistrations] = useState<PendingRegistrationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Plan Types & Payment Types from Settings
  const [planTypes, setPlanTypes] = useState<PlanTypeItem[]>([]);
  const [paymentTypes, setPaymentTypes] = useState<PaymentTypeItem[]>([]);

  // Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<MemberRecord | null>(null);

  // Pending Registration Review Modal State
  const [reviewingPending, setReviewingPending] = useState<PendingRegistrationRecord | null>(null);
  const [isRejectMode, setIsRejectMode] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Submitter Role in Add Member Modal (inferred from authenticated session)
  const isTrainer = user?.role === 'trainer';
  const submitterRole: 'admin' | 'trainer' = isTrainer ? 'trainer' : 'admin';
  const trainerSubmitterName = user?.fullName
    ? `${user.fullName} (Trainer)`
    : user?.username || 'Trainer';

  // Manual Due Date Override in Drawer
  const [isOverrideDrawerOpen, setIsOverrideDrawerOpen] = useState(false);
  const [drawerOverrideDate, setDrawerOverrideDate] = useState('');

  // --- Add Member Form State ---
  const [pathType, setPathType] = useState<'NEW' | 'EXISTING'>('NEW');

  // Shared Base Fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [photo, setPhoto] = useState('');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [showEmergencyFields, setShowEmergencyFields] = useState(false);
  const [assignedTrainer, setAssignedTrainer] = useState('Rajesh Kumar');

  // Path 1 (New) & Path 2 (Existing) Plan & Dates
  const [joiningDate, setJoiningDate] = useState(getTodayISO()); // Defaults to today for NEW, cleared for EXISTING
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [lastPaymentDate, setLastPaymentDate] = useState(''); // Existing member only
  const [isDueDateOverridden, setIsDueDateOverridden] = useState(false);
  const [manualDueDateOverride, setManualDueDateOverride] = useState('');

  // Payment Section
  const [recordPaymentNow, setRecordPaymentNow] = useState(true); // Default ON for NEW, OFF for EXISTING
  const [paymentAmount, setPaymentAmount] = useState(2500);
  const [paymentMode, setPaymentMode] = useState<'UPI' | 'Card' | 'Bank Transfer' | 'Cash'>('UPI');
  const [paymentDate, setPaymentDate] = useState(getTodayISO());
  const [referenceNo, setReferenceNo] = useState('');

  // Fetch initial data
  const loadData = async () => {
    try {
      setLoading(true);
      const [memData, pendingData, plansData, ptData] = await Promise.all([
        getMembers(),
        getPendingRegistrations(),
        getPlanTypes(),
        getPaymentTypes(),
      ]);
      setMembers(memData);
      setPendingRegistrations(pendingData);
      const activePlans = plansData.filter((p) => p.isActive);
      setPlanTypes(activePlans);
      if (activePlans.length > 0 && !selectedPlanId) {
        setSelectedPlanId(activePlans[0].id);
      }
      setPaymentTypes(ptData.filter((p) => p.isActive));
    } catch (err) {
      console.error('Failed to load members data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // When switching path type, set correct defaults
  const handleSwitchPathType = (type: 'NEW' | 'EXISTING') => {
    setPathType(type);
    if (type === 'NEW') {
      setJoiningDate(getTodayISO());
      setLastPaymentDate('');
      setIsDueDateOverridden(false);
      setManualDueDateOverride('');
      setRecordPaymentNow(true); // Default ON for new
      setPaymentDate(getTodayISO());
    } else {
      setJoiningDate(''); // Required, NO default for existing
      setLastPaymentDate('');
      setIsDueDateOverridden(false);
      setManualDueDateOverride('');
      setRecordPaymentNow(false); // Default OFF for existing
      setPaymentDate(getTodayISO());
    }
  };

  // Currently selected plan object
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

  // Update amount when plan changes
  useEffect(() => {
    if (currentPlan) {
      const fee = currentPlan.standardFee || PLAN_STANDARD_FEES[currentPlan.name] || 2500;
      setPaymentAmount(fee);
    }
  }, [currentPlan]);

  // Calculated next due date logic
  const calculatedDueDate = useMemo(() => {
    if (isDueDateOverridden && manualDueDateOverride) {
      return manualDueDateOverride;
    }

    if (currentPlan.durationUnit === 'One-time') {
      return 'One-time';
    }

    if (pathType === 'NEW') {
      return calculateDueDate(joiningDate, currentPlan.durationUnit, currentPlan.durationValue);
    } else {
      // Existing member
      if (lastPaymentDate) {
        return calculateDueDate(lastPaymentDate, currentPlan.durationUnit, currentPlan.durationValue);
      } else if (joiningDate) {
        return calculateDueDate(joiningDate, currentPlan.durationUnit, currentPlan.durationValue);
      }
      return '';
    }
  }, [pathType, joiningDate, lastPaymentDate, currentPlan, isDueDateOverridden, manualDueDateOverride]);

  // Inline warning visibility for existing member
  const isEstimateWarningVisible =
    pathType === 'EXISTING' && !lastPaymentDate && !isDueDateOverridden && !!joiningDate;

  // Final isEstimated boolean
  const isEstimated =
    pathType === 'EXISTING' && !lastPaymentDate && !isDueDateOverridden;

  // Filtered members list
  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      const matchSearch =
        m.name.toLowerCase().includes(search.toLowerCase()) ||
        m.email.toLowerCase().includes(search.toLowerCase()) ||
        m.phone.includes(search) ||
        m.memberId.toLowerCase().includes(search.toLowerCase());

      const matchPlan = planFilter === 'ALL' || m.planName === planFilter;
      const matchStatus = statusFilter === 'ALL' || m.status === statusFilter;

      return matchSearch && matchPlan && matchStatus;
    });
  }, [members, search, planFilter, statusFilter]);

  // Form Submission: Admin goes live immediately; Trainer queues in Pending Registration
  const handleSaveMember = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !phone.trim()) {
      alert('Please enter member name and phone number.');
      return;
    }

    if (!joiningDate) {
      alert('Please enter the joining date.');
      return;
    }

    try {
      setActionLoading(true);
      const result = await submitMemberRegistration(
        {
          pathType,
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim(),
          photo: photo.trim() || undefined,
          emergencyContactName: emergencyName.trim() || undefined,
          emergencyContactPhone: emergencyPhone.trim() || undefined,
          joiningDate,
          planId: currentPlan.id,
          planName: currentPlan.name,
          planCategory: currentPlan.category || 'Regular',
          assignedTrainer,
          lastPaymentDate: lastPaymentDate || undefined,
          nextDueDate: calculatedDueDate || 'One-time',
          isEstimatedDueDate: isEstimated,
          recordPaymentNow,
          paymentDetails: recordPaymentNow
            ? {
                amount: Number(paymentAmount) || 0,
                paymentMode,
                paymentDate,
                referenceNo: referenceNo.trim() || undefined,
              }
            : undefined,
        },
        submitterRole,
        submitterRole === 'trainer' ? trainerSubmitterName : 'Staff Admin'
      );

      setIsAddModalOpen(false);

      // Reset form
      setName('');
      setPhone('');
      setEmail('');
      setPhoto('');
      setEmergencyName('');
      setEmergencyPhone('');
      setShowEmergencyFields(false);
      handleSwitchPathType('NEW');

      if (result.isAutoApproved && result.member) {
        setMembers((prev) => [result.member!, ...prev]);
        setActiveTab('ALL');
        if (result.receipt) {
          alert(`Member ${result.member.name} registered and Receipt #${result.receipt.receiptNo} generated!`);
        } else {
          alert(`Member ${result.member.name} registered successfully!`);
        }
      } else if (result.pendingRegistration) {
        setPendingRegistrations((prev) => [result.pendingRegistration!, ...prev]);
        setActiveTab('PENDING_REGISTRATION');
        alert(
          `Registration for ${result.pendingRegistration.name} submitted by trainer and queued in 'Pending Registration' for admin review.`
        );
      }
    } catch (err) {
      alert(`Transaction failed: ${(err as Error).message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Review Modal Actions: Approve or Reject
  const handleApprovePending = async (pendingId: string) => {
    try {
      setActionLoading(true);
      const result = await approvePendingRegistration(pendingId);
      setMembers((prev) => [result.member, ...prev]);
      setPendingRegistrations((prev) => prev.filter((p) => p.id !== pendingId));
      setReviewingPending(null);
      setIsRejectMode(false);
      setRejectionReason('');
      setActiveTab('ALL');
      alert(`Registration approved! ${result.member.name} is now active in All Members and selectable in Receipts.`);
    } catch (err: any) {
      alert(err.message || 'Failed to approve registration');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectPending = async () => {
    if (!reviewingPending) return;
    if (!rejectionReason.trim()) {
      alert('A rejection reason is mandatory before rejecting.');
      return;
    }

    try {
      setActionLoading(true);
      await rejectPendingRegistration(reviewingPending.id, rejectionReason.trim());
      setPendingRegistrations((prev) => prev.filter((p) => p.id !== reviewingPending.id));
      setReviewingPending(null);
      setIsRejectMode(false);
      setRejectionReason('');
      alert('Pending registration rejected. No records were created.');
    } catch (err: any) {
      alert(err.message || 'Failed to reject registration');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRenew = async (member: MemberRecord) => {
    try {
      const updated = await renewMemberPlan(member.id, member.planName);
      setMembers((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
      alert(`Membership for ${member.name} has been renewed for 1 Year.`);
      if (selectedMember?.id === member.id) {
        setSelectedMember(updated);
      }
    } catch (err) {
      alert('Failed to renew member plan');
    }
  };

  const handleConfirmDueDateOverride = async (memberId: string) => {
    if (!drawerOverrideDate) return;
    try {
      const updated = await updateMemberDueDateOverride(memberId, drawerOverrideDate);
      setMembers((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
      setSelectedMember(updated);
      setIsOverrideDrawerOpen(false);
      setDrawerOverrideDate('');
      alert(`Next Due Date confirmed and updated to ${drawerOverrideDate}`);
    } catch (err) {
      alert('Failed to update due date');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Top Header & Segmented Control Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-heading text-2xl font-bold text-[#1A2333] tracking-tight">
              Member Management
            </h1>
            {user?.gymName && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#EEF4FF] text-[#2F6FED] border border-[#D5E3FF]">
                <Building2 className="w-3 h-3" />
                {user.gymName}
              </span>
            )}
          </div>
          <p className="text-sm text-[#6B7686] mt-0.5">
            Registered gym members, onboarding workflows, and fee payment status
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Main Segmented Control: All Members vs Pending Registration */}
          <div className="flex items-center bg-[#E2E6ED]/60 p-1 rounded-xl border border-[#E2E6ED]">
            <button
              onClick={() => setActiveTab('ALL')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'ALL'
                  ? 'bg-white text-[#1A2333] shadow-subtle'
                  : 'text-[#6B7686] hover:text-[#1A2333]'
              }`}
            >
              All Members
            </button>
            <button
              onClick={() => setActiveTab('PENDING_REGISTRATION')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'PENDING_REGISTRATION'
                  ? 'bg-white text-[#1A2333] shadow-subtle'
                  : 'text-[#6B7686] hover:text-[#1A2333]'
              }`}
            >
              <span>Pending Registration</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold tabular-nums ${
                  pendingRegistrations.length > 0
                    ? 'bg-[#D99A3E] text-white'
                    : 'bg-[#E2E6ED] text-[#6B7686]'
                }`}
              >
                {pendingRegistrations.length}
              </span>
            </button>
          </div>

          <button
            onClick={() => loadData()}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-[#E2E6ED] hover:bg-[#F8FAFC] text-[#344054] rounded-lg text-xs font-medium transition-colors shadow-subtle disabled:opacity-50"
            title="Refresh member roster"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#2F6FED]' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => {
              handleSwitchPathType('NEW');
              setIsAddModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-[#2F6FED] hover:bg-[#2558bf] text-white rounded-lg text-xs font-semibold transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add Member
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: ALL MEMBERS VIEW */}
      {/* ========================================================================= */}
      {activeTab === 'ALL' && (
        <div className="space-y-6 animate-fade-in">
          {/* Top Stat Row (4 Cards) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-[#E2E6ED] rounded-xl p-5 shadow-subtle">
              <span className="text-xs font-medium uppercase tracking-wider text-[#6B7686]">
                Total Roster
              </span>
              <div className="mt-3">
                <span className="stat-number font-heading text-3xl font-bold text-[#1A2333] tabular-nums tracking-tight">
                  {members.length}
                </span>
              </div>
              <div className="mt-2.5 flex items-center gap-1.5 text-xs text-[#6B7686]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#2F6FED]" />
                <span className="font-medium text-[#2F6FED]">Active directory</span>
              </div>
            </div>

            <div className="bg-white border border-[#E2E6ED] rounded-xl p-5 shadow-subtle">
              <span className="text-xs font-medium uppercase tracking-wider text-[#6B7686]">
                Active Subscriptions
              </span>
              <div className="mt-3">
                <span className="stat-number font-heading text-3xl font-bold text-[#1A2333] tabular-nums tracking-tight">
                  {members.filter((m) => m.status === 'ACTIVE').length}
                </span>
              </div>
              <div className="mt-2.5 flex items-center gap-1.5 text-xs text-[#6B7686]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#2E9E6D]" />
                <span className="font-medium text-[#2E9E6D]">
                  {Math.round((members.filter((m) => m.status === 'ACTIVE').length / (members.length || 1)) * 100)}% active
                </span>
              </div>
            </div>

            <div className="bg-white border border-[#E2E6ED] rounded-xl p-5 shadow-subtle">
              <span className="text-xs font-medium uppercase tracking-wider text-[#6B7686]">
                Expiring Within 7 Days
              </span>
              <div className="mt-3">
                <span className="stat-number font-heading text-3xl font-bold text-[#1A2333] tabular-nums tracking-tight">
                  {members.filter((m) => m.status === 'EXPIRING').length}
                </span>
              </div>
              <div className="mt-2.5 flex items-center gap-1.5 text-xs text-[#6B7686]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#D99A3E]" />
                <span className="font-medium text-[#D99A3E]">Renewal required</span>
              </div>
            </div>

            <div className="bg-white border border-[#E2E6ED] rounded-xl p-5 shadow-subtle">
              <span className="text-xs font-medium uppercase tracking-wider text-[#6B7686]">
                Estimated Due Dates
              </span>
              <div className="mt-3">
                <span className="stat-number font-heading text-3xl font-bold text-[#1A2333] tabular-nums tracking-tight">
                  {members.filter((m) => m.isEstimatedDueDate).length}
                </span>
              </div>
              <div className="mt-2.5 flex items-center gap-1.5 text-xs text-[#6B7686]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#D99A3E]" />
                <span className="font-medium text-[#D99A3E]">Needs verification</span>
              </div>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="bg-white border border-[#E2E6ED] rounded-xl p-4 shadow-subtle flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-[#6B7686] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search member by name, phone or ID..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#F5F7FA] border border-[#E2E6ED] rounded-lg text-[#1A2333] placeholder-[#6B7686] focus:outline-none focus:border-[#2F6FED]"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              {/* Status filter */}
              <div className="flex items-center bg-[#F5F7FA] p-1 rounded-lg border border-[#E2E6ED] text-xs">
                {(['ALL', 'ACTIVE', 'EXPIRING', 'EXPIRED', 'FROZEN'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-3 py-1 rounded-md transition-all font-medium ${
                      statusFilter === st
                        ? 'bg-white text-[#1A2333] shadow-sm'
                        : 'text-[#6B7686] hover:text-[#1A2333]'
                    }`}
                  >
                    {st === 'ALL'
                      ? 'All'
                      : st === 'EXPIRING'
                      ? 'Expiring Soon'
                      : st.charAt(0) + st.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>

              {/* Plan filter */}
              <select
                value={planFilter}
                onChange={(e) => setPlanFilter(e.target.value)}
                className="px-3 py-1.5 bg-[#F5F7FA] border border-[#E2E6ED] rounded-lg text-xs text-[#1A2333] focus:outline-none focus:border-[#2F6FED]"
              >
                <option value="ALL">All Membership Plans</option>
                {planTypes.map((pt) => (
                  <option key={pt.id} value={pt.name}>
                    {pt.name} ({pt.category})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Members Table */}
          <div className="bg-white border border-[#E2E6ED] rounded-xl shadow-subtle overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#E2E6ED] bg-[#F5F7FA] text-[11px] font-semibold uppercase text-[#6B7686] tracking-wider">
                    <th className="py-3 px-4">Member Info</th>
                    <th className="py-3 px-4">Plan & Category</th>
                    <th className="py-3 px-4">Joining Date</th>
                    <th className="py-3 px-4">Next Due Date</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Payment Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E6ED] text-xs">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-[#6B7686]">
                        Loading registered members...
                      </td>
                    </tr>
                  ) : filteredMembers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-[#6B7686]">
                        No members found matching your search filters.
                      </td>
                    </tr>
                  ) : (
                    filteredMembers.map((m) => (
                      <tr key={m.id} className="hover:bg-[#F5F7FA] transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            {m.photo ? (
                              <img
                                src={m.photo}
                                alt={m.name}
                                className="w-8 h-8 rounded-full object-cover border border-[#E2E6ED]"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-[#E8EFFE] text-[#2F6FED] font-bold text-xs flex items-center justify-center flex-shrink-0 border border-[#2F6FED]/20">
                                {m.name.charAt(0)}
                              </div>
                            )}
                            <div>
                              <div
                                onClick={() => setSelectedMember(m)}
                                className="font-semibold text-[#1A2333] hover:text-[#2F6FED] cursor-pointer transition-colors"
                              >
                                {m.name}
                              </div>
                              <div className="text-[11px] text-[#6B7686] flex items-center gap-2">
                                <span>{m.memberId}</span>
                                <span>•</span>
                                <span>{m.phone}</span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-[#1A2333]">{m.planName}</div>
                          <div className="mt-1">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${
                                m.planCategory === 'Personal Training'
                                  ? 'bg-purple-50 text-purple-700 border-purple-200'
                                  : 'bg-[#E8EFFE] text-[#2F6FED] border-[#2F6FED]/20'
                              }`}
                            >
                              {m.planCategory || 'Regular'}
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-[#1A2333]">
                          <div>{m.joiningDate}</div>
                          <div className="text-[10px] text-[#6B7686]">{m.assignedTrainer}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-[#1A2333]">{m.expiryDate}</span>
                            {/* SUBTLE ESTIMATED FLAG */}
                            {m.isEstimatedDueDate && (
                              <span
                                className="px-1.5 py-0.2 rounded text-[10px] font-semibold border border-[#D99A3E] text-[#D99A3E] bg-[#FEF6E9]"
                                title="Due date estimated from join date — no last payment date on record"
                              >
                                Estimated
                              </span>
                            )}
                          </div>
                          <div
                            className={`text-[11px] font-medium ${
                              m.daysRemaining < 0
                                ? 'text-[#D14343]'
                                : m.daysRemaining <= 7
                                ? 'text-[#D99A3E]'
                                : 'text-[#6B7686]'
                            }`}
                          >
                            {m.expiryDate === 'One-time'
                              ? 'One-time registration'
                              : m.daysRemaining < 0
                              ? `Overdue ${Math.abs(m.daysRemaining)}d ago`
                              : `${m.daysRemaining} days left`}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5">
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{
                                backgroundColor: m.status === 'EXPIRED' ? '#D14343' : '#2E9E6D',
                              }}
                            />
                            <span className="font-medium text-[#1A2333]">
                              {m.status === 'EXPIRED' ? 'Inactive' : 'Active'}
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          {m.daysRemaining < 0 ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#FDF0F0] text-[#D14343] border border-[#D14343]/20">
                              Overdue
                            </span>
                          ) : m.daysRemaining <= 7 ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#FEF6E9] text-[#D99A3E] border border-[#D99A3E]/20">
                              Due Soon
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#E8F8F0] text-[#2E9E6D] border border-[#2E9E6D]/20">
                              Paid Up
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {m.status === 'EXPIRED' || m.status === 'EXPIRING' ? (
                              <button
                                onClick={() => handleRenew(m)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium border border-[#2F6FED] text-[#2F6FED] hover:bg-[#E8EFFE] rounded-md transition-colors bg-white"
                              >
                                <RefreshCw className="w-3 h-3" />
                                Renew
                              </button>
                            ) : null}

                            <button
                              onClick={() => setSelectedMember(m)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium border border-[#E2E6ED] hover:border-[#2F6FED] hover:text-[#2F6FED] rounded-md transition-colors text-[#1A2333] bg-white"
                            >
                              Profile
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="p-4 border-t border-[#E2E6ED] flex items-center justify-between text-xs text-[#6B7686]">
              <span>Showing {filteredMembers.length} active records in database</span>
              <span className="font-semibold text-[#1A2333]">Central Gym Roster</span>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: PENDING REGISTRATION TAB */}
      {/* ========================================================================= */}
      {activeTab === 'PENDING_REGISTRATION' && (
        <div className="space-y-4 animate-fade-in">
          {/* Informational Workflow Callout */}
          <div className="p-4 bg-[#FFFBEB] border border-[#FDE68A] rounded-xl flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-[#D99A3E] flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-[#92400E]">
                  Trainer Onboarding Approval Queue ({pendingRegistrations.length} Pending)
                </h4>
                <p className="text-xs text-[#B45309] mt-0.5 leading-relaxed">
                  Registrations submitted by trainers require admin verification. Approved registrations atomically create the athlete profile, member plan, and initial payment receipt. Unapproved items have zero impact on dashboard revenue or member counts.
                </p>
              </div>
            </div>
            {isTrainer && (
              <span className="text-[11px] font-semibold text-amber-800 bg-amber-100/70 border border-amber-300 px-3 py-1.5 rounded-lg whitespace-nowrap self-start">
                Trainer View (Verification Pending)
              </span>
            )}
          </div>

          {/* Pending Registrations Table */}
          <div className="bg-white border border-[#E2E6ED] rounded-xl shadow-subtle overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#E2E6ED] bg-[#F5F7FA] text-[11px] font-semibold uppercase text-[#6B7686] tracking-wider">
                    <th className="py-3 px-4">Member Name</th>
                    <th className="py-3 px-4">Submitted By</th>
                    <th className="py-3 px-4">Submitted On</th>
                    <th className="py-3 px-4">Plan & Category</th>
                    <th className="py-3 px-4">Payment Included</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E6ED] text-xs">
                  {pendingRegistrations.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-16 text-center text-[#6B7686]">
                        <div className="w-12 h-12 rounded-full bg-[#E8EFFE] text-[#2F6FED] flex items-center justify-center mx-auto mb-2">
                          <CheckCircle2 className="w-6 h-6" />
                        </div>
                        <div className="font-semibold text-sm text-[#1A2333]">All Clear! No Pending Registrations</div>
                        <p className="text-xs text-[#6B7686] mt-0.5">All trainer submissions have been reviewed and approved.</p>
                      </td>
                    </tr>
                  ) : (
                    pendingRegistrations.map((p) => (
                      <tr key={p.id} className="hover:bg-[#F5F7FA] transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-[#1A2333]">{p.name}</div>
                          <div className="text-[11px] text-[#6B7686]">{p.phone}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5 text-[#1A2333] font-medium">
                            <UserCheck className="w-3.5 h-3.5 text-[#2F6FED]" />
                            <span>{p.submittedBy}</span>
                          </div>
                          <span className="text-[10px] uppercase font-bold text-[#D99A3E]">Trainer Submission</span>
                        </td>
                        <td className="py-3.5 px-4 text-[#6B7686]">
                          {p.submittedOn}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-medium text-[#1A2333]">{p.planName}</div>
                          <span
                            className={`inline-flex items-center px-2 py-0.2 rounded text-[10px] font-semibold border ${
                              p.planCategory === 'Personal Training'
                                ? 'bg-purple-50 text-purple-700 border-purple-200'
                                : 'bg-[#E8EFFE] text-[#2F6FED] border-[#2F6FED]/20'
                            }`}
                          >
                            {p.planCategory || 'Regular'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          {p.paymentIncluded ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#E8F8F0] text-[#2E9E6D] border border-[#2E9E6D]/20">
                              <Check className="w-3 h-3" />
                              Yes (₹ {(p.paymentDetails?.amount || 0).toLocaleString('en-IN')})
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#F5F7FA] text-[#6B7686] border border-[#E2E6ED]">
                              No Payment
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {isTrainer ? (
                            <button
                              onClick={() => {
                                setReviewingPending(p);
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
                                setReviewingPending(p);
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
              <span>Pending entries do not appear in All Members or Reports until approved.</span>
              <span className="font-bold text-[#D99A3E]">{pendingRegistrations.length} items awaiting action</span>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ADD MEMBER MODAL: TWO DISTINCT PATHS (NEW VS EXISTING MEMBER) */}
      {/* ========================================================================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-fade-in">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between flex-shrink-0 bg-slate-50/70">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center shadow-2xs">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-heading text-lg font-bold text-slate-900 tracking-tight">
                    Add Member to Gym
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    {pathType === 'NEW'
                      ? 'Signing up new member today — dues automatically calculated from today'
                      : 'Backfill existing member record — preserve historical join & payment cycles'}
                  </p>
                </div>
              </div>

              {/* Header Right: Path Selector + Submitter Role + Close */}
              <div className="flex items-center gap-3">
                {/* Segmented Path Switcher */}
                <div className="hidden sm:flex rounded-xl p-1 bg-slate-100 border border-slate-200/80">
                  <button
                    type="button"
                    onClick={() => handleSwitchPathType('NEW')}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                      pathType === 'NEW'
                        ? 'bg-white text-blue-600 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    New Member
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSwitchPathType('EXISTING')}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                      pathType === 'EXISTING'
                        ? 'bg-white text-blue-600 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Existing (Backfill)
                  </button>
                </div>

                {/* Submitter Role Context Badge */}
                <div
                  className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-[11px] font-semibold ${
                    isTrainer
                      ? 'bg-amber-50 border-amber-200 text-amber-800'
                      : 'bg-blue-50 border-blue-200 text-blue-800'
                  }`}
                >
                  <ShieldCheck className={`w-3.5 h-3.5 ${isTrainer ? 'text-amber-600' : 'text-blue-600'}`} />
                  <span>
                    {isTrainer ? 'Trainer Submission (Admin Approval Required)' : 'Admin Registration (Auto-Verified)'}
                  </span>
                </div>

                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="text-slate-400 hover:text-slate-700 p-2 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Form Body: Wide 2-Column Grid */}
            <form onSubmit={handleSaveMember} className="p-6 overflow-y-auto flex-1">
              {/* Mobile Path Switcher fallback */}
              <div className="sm:hidden mb-4">
                <div className="flex rounded-xl p-1 bg-slate-100 border border-slate-200">
                  <button
                    type="button"
                    onClick={() => handleSwitchPathType('NEW')}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-lg ${
                      pathType === 'NEW' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600'
                    }`}
                  >
                    New Member
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSwitchPathType('EXISTING')}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-lg ${
                      pathType === 'EXISTING' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600'
                    }`}
                  >
                    Existing (Backfill)
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* ========================================================= */}
                {/* LEFT COLUMN: Personal & Contact Information (Col 6) */}
                {/* ========================================================= */}
                <div className="lg:col-span-6 space-y-4">
                  {/* Contact Information Card */}
                  <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 space-y-3.5">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-blue-600" />
                      Member Identity & Contact
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                          Full Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Paul Saji"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-medium text-slate-900 placeholder-slate-400 shadow-2xs"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                          Phone Number <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="+91 98..."
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-medium text-slate-900 placeholder-slate-400 shadow-2xs"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                          Email Address (Optional)
                        </label>
                        <input
                          type="email"
                          placeholder="paul@twelvogym.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-medium text-slate-900 placeholder-slate-400 shadow-2xs"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                          Assigned Trainer
                        </label>
                        <select
                          value={assignedTrainer}
                          onChange={(e) => setAssignedTrainer(e.target.value)}
                          className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-medium text-slate-800 shadow-2xs"
                        >
                          <option value="Rajesh Kumar">Rajesh Kumar (Strength Coach)</option>
                          <option value="Ananya Sen">Ananya Sen (Pilates Lead)</option>
                          <option value="Kevin D’Souza">Kevin D’Souza (CrossFit Coach)</option>
                          <option value="Sandeep Nair">Sandeep Nair (Floor Trainer)</option>
                          <option value="Floor General">General Floor Access</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Emergency Contact & Profile Picture Card */}
                  <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                        Emergency Contact & Photo
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowEmergencyFields(!showEmergencyFields)}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 hover:underline"
                      >
                        {showEmergencyFields ? 'Hide details' : '+ Add emergency & photo'}
                      </button>
                    </div>

                    {showEmergencyFields && (
                      <div className="space-y-3 pt-1 animate-fade-in">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">
                              Contact Person Name
                            </label>
                            <input
                              type="text"
                              placeholder="e.g. Ramesh Malhotra (Father)"
                              value={emergencyName}
                              onChange={(e) => setEmergencyName(e.target.value)}
                              className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-slate-900 shadow-2xs"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">
                              Emergency Phone
                            </label>
                            <input
                              type="text"
                              placeholder="+91 98..."
                              value={emergencyPhone}
                              onChange={(e) => setEmergencyPhone(e.target.value)}
                              className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-slate-900 shadow-2xs"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">
                            Member Avatar / Photo URL
                          </label>
                          <input
                            type="text"
                            placeholder="https://images.unsplash.com/..."
                            value={photo}
                            onChange={(e) => setPhoto(e.target.value)}
                            className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-slate-900 shadow-2xs"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* ========================================================= */}
                {/* RIGHT COLUMN: Plan, Next Due Date & Upfront Payment (Col 6) */}
                {/* ========================================================= */}
                <div className="lg:col-span-6 space-y-4">
                  {/* Plan & Schedule Card */}
                  <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 space-y-3.5">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                      Membership Plan & Billing Timeline
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                          {pathType === 'NEW' ? 'Joining Date' : 'Original Joining Date'} <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          required
                          value={joiningDate}
                          onChange={(e) => setJoiningDate(e.target.value)}
                          className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-medium text-slate-800 shadow-2xs"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                          Membership Plan Tier <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={selectedPlanId}
                          onChange={(e) => setSelectedPlanId(e.target.value)}
                          className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-medium text-slate-800 shadow-2xs"
                        >
                          {planTypes.map((pt) => (
                            <option key={pt.id} value={pt.id}>
                              {pt.name} ({pt.category || 'Regular'} • {pt.displayDuration} - ₹{(pt.standardFee || 0).toLocaleString('en-IN')})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* PATH 2 ONLY: Last Payment Date */}
                    {pathType === 'EXISTING' && (
                      <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-2">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            When did they last pay? (Optional)
                          </label>
                          <input
                            type="date"
                            value={lastPaymentDate}
                            onChange={(e) => setLastPaymentDate(e.target.value)}
                            className="w-full sm:w-1/2 px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
                          />
                          <div className="text-[11px] text-slate-500 mt-1">
                            If provided, Next Due Date auto-calculates as Last Payment Date + Plan Duration.
                          </div>
                        </div>

                        {isEstimateWarningVisible && (
                          <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 animate-fade-in">
                            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                            <div>
                              <span className="font-semibold">Notice:</span> No last payment date provided — due date estimated from original join date.
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Next Due Date Banner */}
                    <div className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between">
                      <div>
                        <span className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-blue-600" />
                          Next Fee Due Date:
                        </span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="font-heading font-extrabold text-base text-slate-900 tabular-nums">
                            {calculatedDueDate || '— (Enter date)'}
                          </span>
                          {isEstimated && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold border border-amber-300 text-amber-700 bg-amber-50">
                              Estimated
                            </span>
                          )}
                          {isDueDateOverridden && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                              Overridden
                            </span>
                          )}
                        </div>
                      </div>

                      {pathType === 'EXISTING' && (
                        <div className="flex items-center gap-2">
                          {!isDueDateOverridden ? (
                            <button
                              type="button"
                              onClick={() => {
                                setIsDueDateOverridden(true);
                                setManualDueDateOverride(calculatedDueDate || getTodayISO());
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold border border-slate-200 hover:border-blue-500 hover:text-blue-600 bg-slate-50 hover:bg-white rounded-lg transition-colors text-slate-700"
                            >
                              <Edit2 className="w-3 h-3" />
                              Override
                            </button>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <input
                                type="date"
                                value={manualDueDateOverride}
                                onChange={(e) => setManualDueDateOverride(e.target.value)}
                                className="px-2 py-1 text-xs border border-blue-500 rounded-md bg-white text-slate-900 focus:outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  setIsDueDateOverridden(false);
                                  setManualDueDateOverride('');
                                }}
                                className="p-1 text-slate-400 hover:text-rose-600"
                                title="Reset to auto-calculated date"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Upfront Payment Section */}
                  <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                          <CreditCard className="w-4 h-4 text-blue-600" />
                          Record Upfront Payment Now
                        </span>
                        <p className="text-[11px] text-slate-500">
                          {pathType === 'NEW'
                            ? 'Record joining fee & generate verified GST receipt immediately'
                            : 'Enable only if collecting an immediate payment now'}
                        </p>
                      </div>

                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={recordPaymentNow}
                          onChange={(e) => setRecordPaymentNow(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>

                    {recordPaymentNow && (
                      <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-3 animate-fade-in">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                              Amount (₹) *
                            </label>
                            <input
                              type="number"
                              required
                              value={paymentAmount}
                              onChange={(e) => setPaymentAmount(Number(e.target.value))}
                              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 font-semibold tabular-nums text-slate-900"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                              Payment Mode
                            </label>
                            <select
                              value={paymentMode}
                              onChange={(e) => setPaymentMode(e.target.value as any)}
                              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 text-slate-800 font-medium"
                            >
                              {paymentTypes.length > 0 ? (
                                paymentTypes
                                  .filter((p) => p.isActive)
                                  .map((p) => (
                                    <option key={p.id} value={p.name}>
                                      {p.name}
                                    </option>
                                  ))
                              ) : (
                                <>
                                  <option value="UPI">UPI</option>
                                  <option value="Card">Debit / Credit Card</option>
                                  <option value="Bank Transfer">Bank Transfer</option>
                                  <option value="Cash">Cash</option>
                                </>
                              )}
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                              Payment Date *
                            </label>
                            <input
                              type="date"
                              required
                              value={paymentDate}
                              onChange={(e) => setPaymentDate(e.target.value)}
                              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 text-slate-800"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Transaction Reference / Notes
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. UPI/4089128091 or Cash voucher"
                            value={referenceNo}
                            onChange={(e) => setReferenceNo(e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 text-slate-900 placeholder-slate-400"
                          />
                        </div>

                        <div className="text-[11px] text-emerald-700 flex items-center gap-1.5 font-medium pt-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Generates a verifiable GST tax receipt and records in financial receipts ledger.
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Modal Action Buttons */}
                  <div className="pt-2 flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setIsAddModalOpen(false)}
                      className="px-5 py-2.5 border border-slate-200 hover:bg-slate-100 rounded-xl text-xs font-semibold text-slate-700 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{pathType === 'NEW' ? 'Register New Member' : 'Backfill Existing Member'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MEMBER PROFILE DRAWER / MODAL */}
      {selectedMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white border border-[#E2E6ED] rounded-xl shadow-card w-full max-w-md overflow-hidden animate-fade-in">
            <div className="p-6 space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-[#E2E6ED]">
                <div className="flex items-center gap-3">
                  {selectedMember.photo ? (
                    <img
                      src={selectedMember.photo}
                      alt={selectedMember.name}
                      className="w-11 h-11 rounded-full object-cover border border-[#E2E6ED]"
                    />
                  ) : (
                    <div className="w-11 h-11 rounded-full bg-[#E8EFFE] text-[#2F6FED] font-bold text-sm flex items-center justify-center">
                      {selectedMember.name.charAt(0)}
                    </div>
                  )}
                  <div>
                    <h3 className="font-heading text-base font-bold text-[#1A2333]">
                      {selectedMember.name}
                    </h3>
                    <div className="text-xs text-[#6B7686]">{selectedMember.memberId}</div>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedMember(null)}
                  className="text-[#6B7686] hover:text-[#1A2333]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* ESTIMATED DUE DATE BANNER IN DRAWER */}
              {selectedMember.isEstimatedDueDate && (
                <div className="p-3 bg-[#FFFBEB] border border-[#FDE68A] rounded-lg text-xs text-[#92400E] flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-[#D99A3E] flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold">Unconfirmed Due Date:</span> This member's due date is estimated from their joining date.
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setDrawerOverrideDate(selectedMember.expiryDate);
                      setIsOverrideDrawerOpen(true);
                    }}
                    className="px-2 py-1 bg-white border border-[#D99A3E] text-[#D99A3E] rounded text-[11px] font-semibold whitespace-nowrap hover:bg-[#D99A3E] hover:text-white transition-colors"
                  >
                    Confirm Date
                  </button>
                </div>
              )}

              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between py-1 border-b border-[#E2E6ED]">
                  <span className="text-[#6B7686]">Mobile:</span>
                  <span className="font-medium text-[#1A2333]">{selectedMember.phone}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#E2E6ED]">
                  <span className="text-[#6B7686]">Email:</span>
                  <span className="font-medium text-[#1A2333]">{selectedMember.email}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#E2E6ED]">
                  <span className="text-[#6B7686]">Plan:</span>
                  <span className="font-semibold text-[#2F6FED]">{selectedMember.planName}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#E2E6ED]">
                  <span className="text-[#6B7686]">Assigned Coach:</span>
                  <span className="font-medium text-[#1A2333]">{selectedMember.assignedTrainer}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#E2E6ED]">
                  <span className="text-[#6B7686]">Joined Date:</span>
                  <span className="font-medium text-[#1A2333]">{selectedMember.joiningDate}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#E2E6ED]">
                  <span className="text-[#6B7686]">Next Due / Expiry:</span>
                  <div className="text-right">
                    <span className="font-semibold text-[#1A2333]">{selectedMember.expiryDate}</span>
                    {selectedMember.isEstimatedDueDate && (
                      <div className="text-[10px] text-[#D99A3E] font-medium">Estimated</div>
                    )}
                  </div>
                </div>
                {selectedMember.emergencyContactName && (
                  <div className="flex justify-between py-1 border-b border-[#E2E6ED]">
                    <span className="text-[#6B7686]">Emergency Contact:</span>
                    <span className="font-medium text-[#1A2333]">
                      {selectedMember.emergencyContactName} ({selectedMember.emergencyContactPhone})
                    </span>
                  </div>
                )}
                <div className="flex justify-between py-1">
                  <span className="text-[#6B7686]">Attendance Record:</span>
                  <span className="font-semibold text-[#2E9E6D]">
                    {selectedMember.attendanceCount} check-ins
                  </span>
                </div>
              </div>

              {/* Drawer Inline Override Form */}
              {isOverrideDrawerOpen && (
                <div className="p-3 bg-[#F5F7FA] border border-[#2F6FED] rounded-lg space-y-2 text-xs">
                  <label className="block font-semibold text-[#1A2333]">
                    Set Confirmed Next Due Date
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={drawerOverrideDate}
                      onChange={(e) => setDrawerOverrideDate(e.target.value)}
                      className="w-full px-2 py-1 text-xs border border-[#E2E6ED] rounded bg-white"
                    />
                    <button
                      onClick={() => handleConfirmDueDateOverride(selectedMember.id)}
                      className="px-3 py-1 bg-[#2F6FED] text-white rounded font-medium"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setIsOverrideDrawerOpen(false)}
                      className="px-2 py-1 border border-[#E2E6ED] rounded"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              <div className="pt-3 border-t border-[#E2E6ED] flex items-center justify-end gap-2">
                <button
                  onClick={() => setSelectedMember(null)}
                  className="px-3 py-1.5 border border-[#E2E6ED] hover:bg-[#F5F7FA] rounded-lg text-xs font-medium text-[#1A2333]"
                >
                  Close
                </button>
                <button
                  onClick={() => handleRenew(selectedMember)}
                  className="px-3.5 py-1.5 bg-[#2F6FED] hover:bg-[#2558bf] text-white rounded-lg text-xs font-medium"
                >
                  Renew Plan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PENDING REGISTRATION REVIEW MODAL */}
      {/* ========================================================================= */}
      {reviewingPending && (
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
                    Review Member Registration
                  </h3>
                  <div className="text-xs text-slate-500">
                    Submitted by <span className="font-semibold text-slate-800">{reviewingPending.submittedBy}</span> on {reviewingPending.submittedOn}
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  setReviewingPending(null);
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
                {/* Left Column: Athlete Profile & Plan */}
                <div className="space-y-4">
                  {/* Notice */}
                  <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl text-amber-900 text-xs">
                    <div className="font-bold flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 text-amber-600" />
                      Trainer Onboarding Submission
                    </div>
                    <div className="text-[11px] mt-0.5 text-amber-800 leading-tight">
                      Review athlete details and initial payment terms before committing to the active roster.
                    </div>
                  </div>

                  {/* Profile */}
                  <div className="p-4 bg-slate-50/70 border border-slate-200/80 rounded-xl space-y-2 text-xs">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Athlete Profile
                    </div>
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div>
                        <span className="text-slate-400 text-[10px] uppercase font-bold block">Full Name</span>
                        <span className="font-bold text-slate-900 text-sm">{reviewingPending.name}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] uppercase font-bold block">Phone</span>
                        <span className="font-medium text-slate-800">{reviewingPending.phone}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] uppercase font-bold block">Email</span>
                        <span className="text-slate-700">{reviewingPending.email || '—'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] uppercase font-bold block">Trainer</span>
                        <span className="font-semibold text-slate-800">{reviewingPending.assignedTrainer}</span>
                      </div>
                    </div>
                  </div>

                  {/* Plan & Schedule */}
                  <div className="p-4 bg-blue-50/60 border border-blue-200/80 rounded-xl space-y-2 text-xs">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-blue-800">
                      Plan & Schedule
                    </div>
                    <div className="grid grid-cols-3 gap-2 pt-1">
                      <div>
                        <span className="text-slate-500 text-[10px] block">Plan</span>
                        <span className="font-bold text-blue-700">{reviewingPending.planName}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[10px] block">Joining Date</span>
                        <span className="font-semibold text-slate-800">{reviewingPending.joiningDate}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[10px] block">Next Fee Due</span>
                        <span className="font-bold text-slate-900">{reviewingPending.nextDueDate}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column: Payment & Decision */}
                <div className="space-y-4">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Initial Fee Payment
                  </div>

                  {reviewingPending.paymentIncluded && reviewingPending.paymentDetails ? (
                    <div className="p-4 bg-emerald-50/70 border border-emerald-200/80 rounded-xl space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 font-bold text-base text-emerald-900 font-heading">
                          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                          ₹ {(reviewingPending.paymentDetails.amount || 0).toLocaleString('en-IN')} Received
                        </div>
                        <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-white text-emerald-800 border border-emerald-200 shadow-2xs">
                          {reviewingPending.paymentDetails.paymentMode}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs text-emerald-900 pt-2 border-t border-emerald-200/60">
                        <div>Date: <span className="font-bold">{reviewingPending.paymentDetails.paymentDate}</span></div>
                        <div>Ref: <span className="font-bold">{reviewingPending.paymentDetails.referenceNo || 'None'}</span></div>
                      </div>
                      <div className="text-[11px] text-emerald-800 pt-1">
                        Approving will generate a verified official receipt and register it in the Receipts ledger immediately.
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600">
                      No upfront payment was recorded. Member will be activated with payment status marked Pending/Due.
                    </div>
                  )}

                  {/* Reject Mode input */}
                  {isRejectMode && (
                    <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-2 animate-fade-in">
                      <label className="block text-xs font-bold text-rose-900">
                        Mandatory Rejection Reason *
                      </label>
                      <textarea
                        rows={2}
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        placeholder="Provide reason for rejecting (e.g., duplicate phone number, incorrect plan selected)..."
                        className="w-full p-2.5 text-xs bg-white border border-rose-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500/20 text-slate-900 font-medium"
                      />
                    </div>
                  )}

                  {/* Footer Buttons */}
                  <div className="pt-2 flex items-center justify-end gap-3">
                    {isTrainer ? (
                      <div className="w-full flex items-center justify-between p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                        <span className="flex items-center gap-1.5 font-medium">
                          <Clock className="w-4 h-4 text-amber-600 flex-shrink-0" />
                          Pending verification by gym owner or super admin.
                        </span>
                        <button
                          type="button"
                          onClick={() => setReviewingPending(null)}
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
                          onClick={() => handleApprovePending(reviewingPending.id)}
                          className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
                        >
                          <Check className="w-4 h-4" />
                          <span>{actionLoading ? 'Approving...' : 'Approve & Activate Member'}</span>
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
                          onClick={handleRejectPending}
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
    </div>
  );
}

export default memo(MembersPage);

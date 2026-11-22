import { memo, useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  UserPlus,
  Users,
  CheckCircle2,
  Calendar,
  ShieldCheck,
  MessageCircle,
  Printer,
  RefreshCw,
  Phone,
  Mail,
  UserCheck,
  Building2,
  X,
  ChevronRight,
  Check,
} from 'lucide-react';
import { useAuthStore } from '../../stores/useAuthStore';
import {
  getMembers,
  getPendingRegistrations,
  submitMemberRegistration,
  approvePendingRegistration,
  rejectPendingRegistration,
  MemberRecord,
  PendingRegistrationRecord,
} from '../../api/membersApi';
import { getPlanTypes, getPaymentTypes, getGymConfiguration, DEFAULT_GYM_CONFIG } from '../../api/settingsApi';
import { PlanTypeItem, PaymentTypeItem, GymConfigSettings } from '../../api/types';
import { ReceiptItem } from '../../api/receiptsApi';
import {
  generateReceiptInvoiceWhatsAppText,
  openWhatsAppWeb,
} from '../../utils/whatsapp';

// Standard plan pricing reference fallback
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

function formatINR(val: number): string {
  return `₹${val.toLocaleString('en-IN')}`;
}

type RegistrationTab = 'FORM' | 'PENDING' | 'RECENT';

function RegistrationPage() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<RegistrationTab>('FORM');
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Reference data
  const [gymConfig, setGymConfig] = useState<GymConfigSettings>(DEFAULT_GYM_CONFIG);
  const [planTypes, setPlanTypes] = useState<PlanTypeItem[]>([]);
  const [paymentTypes, setPaymentTypes] = useState<PaymentTypeItem[]>([]);
  const [recentMembers, setRecentMembers] = useState<MemberRecord[]>([]);
  const [pendingRegistrations, setPendingRegistrations] = useState<PendingRegistrationRecord[]>([]);

  // Submitter Role
  const isTrainer = user?.role === 'trainer';
  const submitterRole: 'admin' | 'trainer' = isTrainer ? 'trainer' : 'admin';
  const trainerSubmitterName = user?.fullName
    ? `${user.fullName} (Trainer)`
    : user?.username || 'Trainer';

  // --- Big Registration Form State ---
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [photo, setPhoto] = useState('');
  const [assignedTrainer, setAssignedTrainer] = useState('Rajesh Kumar');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [showEmergencyFields, setShowEmergencyFields] = useState(false);

  // Plan & Dates
  const [joiningDate, setJoiningDate] = useState(getTodayISO());
  const [selectedPlanId, setSelectedPlanId] = useState('');

  // Payment section
  const [recordPaymentNow, setRecordPaymentNow] = useState(true);
  const [paymentAmount, setPaymentAmount] = useState<number>(2500);
  const [paymentMode, setPaymentMode] = useState<'UPI' | 'Card' | 'Bank Transfer' | 'Cash'>('UPI');
  const [paymentDate, setPaymentDate] = useState(getTodayISO());
  const [referenceNo, setReferenceNo] = useState('');

  // Receipt Modal State (shown immediately after successful registration with payment)
  const [generatedReceipt, setGeneratedReceipt] = useState<ReceiptItem | null>(null);
  const [registeredMemberName, setRegisteredMemberName] = useState('');

  // Pending Review Modal State
  const [reviewingPending, setReviewingPending] = useState<PendingRegistrationRecord | null>(null);
  const [isRejectMode, setIsRejectMode] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  // Printable receipt slip modal
  const [activeReceiptForSlip, setActiveReceiptForSlip] = useState<ReceiptItem | null>(null);

  // Load initial reference data
  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [membersData, pendingData, plansData, ptData, configData] = await Promise.all([
        getMembers(),
        getPendingRegistrations(),
        getPlanTypes(),
        getPaymentTypes(),
        getGymConfiguration(),
      ]);

      setRecentMembers(membersData);
      setPendingRegistrations(pendingData);
      const activePlans = plansData.filter((p) => p.isActive);
      setPlanTypes(activePlans);
      if (activePlans.length > 0 && !selectedPlanId) {
        setSelectedPlanId(activePlans[0].id);
      }
      setPaymentTypes(ptData.filter((p) => p.isActive));
      if (configData) {
        setGymConfig(configData);
      }
    } catch (err) {
      console.error('Failed to load registration data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // Selected Plan Object
  const currentPlan = useMemo(() => {
    return (
      planTypes.find((p) => p.id === selectedPlanId) ||
      planTypes[0] || {
        id: 'fee-2',
        name: 'Monthly Regular',
        category: 'Regular' as const,
        durationValue: 1,
        durationUnit: 'Months' as const,
        displayDuration: '1 Month',
        standardFee: 2500,
        hasGst: true,
        gstRate: 18,
        totalWithGst: 2950,
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

  // Calculate Next Due Date
  const calculatedDueDate = useMemo(() => {
    if (currentPlan.durationUnit === 'One-time') {
      return 'One-time';
    }
    return calculateDueDate(joiningDate, currentPlan.durationUnit, currentPlan.durationValue);
  }, [joiningDate, currentPlan]);

  // Calculated Tax Breakdown (respecting gymConfig & plan With/Without GST)
  const taxBreakdown = useMemo(() => {
    const base = Number(paymentAmount) || 0;
    const isGstApplicable = gymConfig.gstEnabled && currentPlan.hasGst !== false;
    const rate = isGstApplicable ? (currentPlan.gstRate ?? gymConfig.defaultGstRate ?? 18) : 0;
    const tax = isGstApplicable ? Math.round(base * (rate / 100)) : 0;
    const netTotal = base + tax;
    return { base, tax, rate, isGstApplicable, netTotal };
  }, [paymentAmount, currentPlan, gymConfig]);

  // Reset Form
  const handleResetForm = () => {
    setName('');
    setPhone('');
    setEmail('');
    setPhoto('');
    setEmergencyName('');
    setEmergencyPhone('');
    setShowEmergencyFields(false);
    setJoiningDate(getTodayISO());
    setPaymentDate(getTodayISO());
    setReferenceNo('');
    setRecordPaymentNow(true);
    if (planTypes.length > 0) {
      setSelectedPlanId(planTypes[0].id);
      setPaymentAmount(planTypes[0].standardFee || 2500);
    }
  };

  // Submit Member Registration Form
  const handleSubmitRegistration = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      alert('Please enter member full name.');
      return;
    }
    if (!phone.trim()) {
      alert('Please enter member contact phone number.');
      return;
    }
    if (!joiningDate) {
      alert('Please select a valid joining date.');
      return;
    }

    try {
      setActionLoading(true);
      const result = await submitMemberRegistration(
        {
          pathType: 'NEW',
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
          nextDueDate: calculatedDueDate || 'One-time',
          isEstimatedDueDate: false,
          recordPaymentNow,
          paymentDetails: recordPaymentNow
            ? {
                amount: taxBreakdown.base,
                taxAmount: taxBreakdown.tax,
                total: taxBreakdown.netTotal,
                paymentMode,
                paymentDate,
                referenceNo: referenceNo.trim() || undefined,
              }
            : undefined,
        },
        submitterRole,
        submitterRole === 'trainer' ? trainerSubmitterName : (user?.fullName || 'Staff Admin')
      );

      const submittedMemberName = name.trim();
      handleResetForm();

      if (result.isAutoApproved && result.member) {
        setRecentMembers((prev) => [result.member!, ...prev]);
        setRegisteredMemberName(submittedMemberName);

        if (result.receipt) {
          // Open receipt invoice modal with WhatsApp sharing
          setGeneratedReceipt(result.receipt);
        } else {
          alert(`Member ${result.member.name} registered successfully!`);
        }
      } else if (result.pendingRegistration) {
        setPendingRegistrations((prev) => [result.pendingRegistration!, ...prev]);
        setActiveTab('PENDING');
        alert(
          `Registration for ${result.pendingRegistration.name} submitted by trainer. It is queued in 'Pending Registrations' for admin approval.`
        );
      }
    } catch (err: any) {
      alert(`Registration failed: ${err.message || 'Unknown error occurred'}`);
    } finally {
      setActionLoading(false);
    }
  };

  // WhatsApp Share Handler
  const handleShareWhatsApp = (receipt: ReceiptItem) => {
    const gymName = user?.gymName || 'Twelvo Gym & Fitness';
    const text = generateReceiptInvoiceWhatsAppText(
      {
        receiptNo: receipt.receiptNo,
        memberName: receipt.memberName,
        memberPhone: receipt.memberPhone,
        plan: receipt.plan,
        planCategory: receipt.planCategory,
        amount: receipt.amount,
        tax: receipt.tax,
        total: receipt.total,
        paymentDate: receipt.paymentDate,
        paymentMode: receipt.paymentMode,
        referenceNo: receipt.referenceNo,
      },
      gymName
    );
    openWhatsAppWeb(receipt.memberPhone, text);
  };

  // Approve Pending Registration
  const handleApprovePending = async (pendingId: string) => {
    try {
      setActionLoading(true);
      const result = await approvePendingRegistration(pendingId);
      setRecentMembers((prev) => [result.member, ...prev]);
      setPendingRegistrations((prev) => prev.filter((p) => p.id !== pendingId));
      setReviewingPending(null);
      setIsRejectMode(false);
      setRejectionReason('');
      alert(`Registration approved! ${result.member.name} is now active.`);
    } catch (err: any) {
      alert(err.message || 'Failed to approve registration');
    } finally {
      setActionLoading(false);
    }
  };

  // Reject Pending Registration
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
      alert('Pending registration rejected.');
    } catch (err: any) {
      alert(err.message || 'Failed to reject registration');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header & Navigation Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#2F6FED]/10 border border-[#2F6FED]/20 text-[#2F6FED] flex items-center justify-center shadow-xs">
              <UserPlus className="w-5 h-5" strokeWidth={2.2} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-heading text-2xl font-bold text-[#1A2333] tracking-tight">
                  New Member Registration
                </h1>
                {user?.gymName && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#EEF4FF] text-[#2F6FED] border border-[#D5E3FF]">
                    <Building2 className="w-3 h-3" />
                    {user.gymName}
                  </span>
                )}
              </div>
              <p className="text-sm text-[#6B7686]">
                Official member enrollment, plan assignment, and instant GST invoice generation
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Module Navigation Tabs */}
          <div className="flex items-center bg-[#E2E6ED]/70 p-1 rounded-xl border border-[#E2E6ED]">
            <button
              onClick={() => setActiveTab('FORM')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'FORM'
                  ? 'bg-white text-[#1A2333] shadow-subtle'
                  : 'text-[#6B7686] hover:text-[#1A2333]'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5 text-[#2F6FED]" />
              <span>Registration Form</span>
            </button>

            <button
              onClick={() => setActiveTab('PENDING')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'PENDING'
                  ? 'bg-white text-[#1A2333] shadow-subtle'
                  : 'text-[#6B7686] hover:text-[#1A2333]'
              }`}
            >
              <span>Pending Approvals</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold tabular-nums ${
                  pendingRegistrations.length > 0
                    ? 'bg-[#D99A3E] text-white'
                    : 'bg-[#E2E6ED] text-[#6B7686]'
                }`}
              >
                {pendingRegistrations.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('RECENT')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'RECENT'
                  ? 'bg-white text-[#1A2333] shadow-subtle'
                  : 'text-[#6B7686] hover:text-[#1A2333]'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-slate-500" />
              <span>Recent Registrations</span>
            </button>
          </div>

          <Link
            to="/members"
            className="flex items-center gap-1 px-3 py-2 text-xs font-semibold text-[#2F6FED] hover:bg-[#EEF4FF] rounded-lg transition-colors border border-transparent hover:border-[#D5E3FF]"
          >
            <span>Member Directory</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: THE BIG REGISTRATION FORM */}
      {/* ========================================================================= */}
      {activeTab === 'FORM' && (
        <form onSubmit={handleSubmitRegistration} className="space-y-6 animate-fade-in">
          {/* Submitter Role Notification Banner */}
          <div
            className={`p-4 rounded-xl border flex items-center justify-between gap-4 ${
              isTrainer
                ? 'bg-amber-50/80 border-amber-200 text-amber-900'
                : 'bg-blue-50/70 border-blue-200 text-blue-900'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  isTrainer ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                }`}
              >
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold uppercase tracking-wider">
                  {isTrainer ? 'Trainer Registration Mode' : 'Admin Instant Enrollment'}
                </div>
                <div className="text-xs text-slate-600 mt-0.5">
                  {isTrainer
                    ? 'Submissions require Gym Owner / Super Admin approval before member goes live.'
                    : 'Auto-verified: Member is activated immediately and a verified GST receipt is issued.'}
                </div>
              </div>
            </div>

            <div className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <span>Acting as:</span>
              <span className="px-2 py-0.5 rounded bg-white border border-slate-200 font-bold text-slate-900">
                {user?.fullName || user?.username || (isTrainer ? 'Trainer' : 'Admin')}
              </span>
            </div>
          </div>

          {/* Big Form Container: 2 Spacious Columns */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* ========================================================= */}
            {/* LEFT COLUMN: Identity, Contact, Coach, Emergency (Col 6) */}
            {/* ========================================================= */}
            <div className="lg:col-span-6 space-y-6">
              {/* Member Profile Card */}
              <div className="bg-white border border-[#E2E6ED] rounded-2xl p-6 shadow-subtle space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-[#F0F2F5]">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#2F6FED]" />
                    <h2 className="text-sm font-bold uppercase tracking-wider text-[#1A2333]">
                      Member Identity & Contact
                    </h2>
                  </div>
                  <span className="text-[11px] text-slate-400 font-medium">Fields with * are required</span>
                </div>

                {/* Full Name & Phone Number */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#1A2333] mb-1.5">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Rahul Sharma"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-4 py-3 text-sm bg-white border border-[#CBD5E1] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2F6FED]/20 focus:border-[#2F6FED] font-medium text-[#1A2333] placeholder-slate-400 shadow-2xs transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#1A2333] mb-1.5 flex items-center justify-between">
                      <span>Phone / Mobile <span className="text-red-500">*</span></span>
                      <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-0.5">
                        <MessageCircle className="w-3 h-3 text-emerald-500" /> WhatsApp Ready
                      </span>
                    </label>
                    <div className="relative">
                      <input
                        type="tel"
                        required
                        placeholder="+91 9876543210"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 text-sm bg-white border border-[#CBD5E1] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2F6FED]/20 focus:border-[#2F6FED] font-medium text-[#1A2333] placeholder-slate-400 shadow-2xs transition-all"
                      />
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    </div>
                  </div>
                </div>

                {/* Email Address & Assigned Trainer */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#1A2333] mb-1.5">
                      Email Address (Optional)
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        placeholder="rahul@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 text-sm bg-white border border-[#CBD5E1] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2F6FED]/20 focus:border-[#2F6FED] font-medium text-[#1A2333] placeholder-slate-400 shadow-2xs transition-all"
                      />
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#1A2333] mb-1.5">
                      Assigned Floor Coach / Trainer
                    </label>
                    <select
                      value={assignedTrainer}
                      onChange={(e) => setAssignedTrainer(e.target.value)}
                      className="w-full px-4 py-3 text-sm bg-white border border-[#CBD5E1] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2F6FED]/20 focus:border-[#2F6FED] font-medium text-[#1A2333] shadow-2xs transition-all"
                    >
                      <option value="Rajesh Kumar">Rajesh Kumar (Strength Coach)</option>
                      <option value="Ananya Sen">Ananya Sen (Pilates Lead)</option>
                      <option value="Kevin D’Souza">Kevin D’Souza (CrossFit Coach)</option>
                      <option value="Sandeep Nair">Sandeep Nair (Floor Trainer)</option>
                      <option value="Floor General">General Floor Access</option>
                    </select>
                  </div>
                </div>

                {/* Photo / Avatar with live preview */}
                <div>
                  <label className="block text-xs font-bold text-[#1A2333] mb-1.5">
                    Member Photo / Avatar URL (Optional)
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center flex-shrink-0 text-slate-400">
                      {photo ? (
                        <img
                          src={photo}
                          alt="Avatar"
                          className="w-full h-full object-cover"
                          onError={(e) => ((e.target as HTMLElement).style.display = 'none')}
                        />
                      ) : (
                        <Users className="w-6 h-6" />
                      )}
                    </div>
                    <input
                      type="url"
                      placeholder="https://images.unsplash.com/photo-..."
                      value={photo}
                      onChange={(e) => setPhoto(e.target.value)}
                      className="flex-1 px-4 py-2.5 text-xs bg-white border border-[#CBD5E1] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2F6FED]/20 focus:border-[#2F6FED] font-medium text-[#1A2333] placeholder-slate-400 shadow-2xs"
                    />
                  </div>
                </div>

                {/* Emergency Contact Expandable Section */}
                <div className="pt-2 border-t border-[#F0F2F5]">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-600">
                      Emergency Contact Person (Recommended)
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowEmergencyFields(!showEmergencyFields)}
                      className="text-xs font-bold text-[#2F6FED] hover:underline flex items-center gap-1"
                    >
                      {showEmergencyFields ? 'Hide Emergency Details' : '+ Add Emergency Contact'}
                    </button>
                  </div>

                  {showEmergencyFields && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3 animate-fade-in p-4 bg-slate-50/70 border border-slate-200/80 rounded-xl">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Contact Person & Relation
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Ramesh Sharma (Father)"
                          value={emergencyName}
                          onChange={(e) => setEmergencyName(e.target.value)}
                          className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Emergency Mobile Number
                        </label>
                        <input
                          type="tel"
                          placeholder="+91 98..."
                          value={emergencyPhone}
                          onChange={(e) => setEmergencyPhone(e.target.value)}
                          className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ========================================================= */}
            {/* RIGHT COLUMN: Plan, Validity, Payment & WhatsApp (Col 6) */}
            {/* ========================================================= */}
            <div className="lg:col-span-6 space-y-6">
              {/* Membership Plan & Duration Card */}
              <div className="bg-white border border-[#E2E6ED] rounded-2xl p-6 shadow-subtle space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-[#F0F2F5]">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#2E9E6D]" />
                    <h2 className="text-sm font-bold uppercase tracking-wider text-[#1A2333]">
                      Membership Plan & Validity
                    </h2>
                  </div>
                  <span className="text-xs font-semibold text-[#2F6FED]">
                    {currentPlan.displayDuration} Tier
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#1A2333] mb-1.5">
                      Joining / Start Date <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="date"
                        required
                        value={joiningDate}
                        onChange={(e) => setJoiningDate(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 text-sm bg-white border border-[#CBD5E1] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2F6FED]/20 focus:border-[#2F6FED] font-semibold text-[#1A2333] shadow-2xs"
                      />
                      <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#1A2333] mb-1.5">
                      Select Plan Tier <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={selectedPlanId}
                      onChange={(e) => setSelectedPlanId(e.target.value)}
                      className="w-full px-4 py-3 text-sm bg-white border border-[#CBD5E1] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2F6FED]/20 focus:border-[#2F6FED] font-semibold text-[#1A2333] shadow-2xs"
                    >
                      {planTypes.map((pt) => (
                        <option key={pt.id} value={pt.id}>
                          {pt.name} ({pt.category || 'Regular'} • {pt.displayDuration} - ₹{(pt.standardFee || 0).toLocaleString('en-IN')})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Visual Plan Selector Chips */}
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-slate-600 block">Popular Packages</span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {planTypes.slice(0, 6).map((pt) => {
                      const isSelected = pt.id === selectedPlanId;
                      return (
                        <button
                          key={pt.id}
                          type="button"
                          onClick={() => setSelectedPlanId(pt.id)}
                          className={`p-3 rounded-xl border text-left transition-all ${
                            isSelected
                              ? 'bg-[#EEF4FF] border-[#2F6FED] ring-2 ring-[#2F6FED]/20'
                              : 'bg-[#F8FAFC] border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className="text-xs font-bold text-[#1A2333] truncate">{pt.name}</div>
                          <div className="text-[11px] text-[#6B7686]">{pt.displayDuration}</div>
                          <div className="text-xs font-extrabold text-[#2F6FED] mt-1 tabular-nums">
                            {formatINR(pt.standardFee || 0)}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Validity & Expiry Preview Banner */}
                <div className="p-4 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50/50 border border-blue-200/80 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-blue-600" />
                      Calculated Next Due Date
                    </span>
                    <div className="font-heading text-xl font-extrabold text-blue-950 mt-0.5 tabular-nums">
                      {calculatedDueDate || 'Select Date'}
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-white text-blue-700 border border-blue-200 shadow-2xs">
                    {currentPlan.displayDuration} Cycle
                  </span>
                </div>
              </div>

              {/* Upfront Payment & Instant GST Invoice Card */}
              <div className="bg-white border border-[#E2E6ED] rounded-2xl p-6 shadow-subtle space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-[#F0F2F5]">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#D99A3E]" />
                      <h2 className="text-sm font-bold uppercase tracking-wider text-[#1A2333]">
                        Registration Payment & Invoice
                      </h2>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Record upfront joining fee and generate verified GST invoice
                    </p>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={recordPaymentNow}
                      onChange={(e) => setRecordPaymentNow(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#2F6FED]"></div>
                  </label>
                </div>

                {recordPaymentNow ? (
                  <div className="space-y-4 animate-fade-in">
                    {/* Amount & Mode */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-[#1A2333] mb-1.5">
                          Base Fee Amount (₹) <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          required
                          value={paymentAmount}
                          onChange={(e) => setPaymentAmount(Number(e.target.value))}
                          className="w-full px-4 py-3 text-sm bg-white border border-[#CBD5E1] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2F6FED]/20 focus:border-[#2F6FED] font-bold text-[#1A2333] tabular-nums shadow-2xs"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#1A2333] mb-1.5">
                          Payment Mode
                        </label>
                        <select
                          value={paymentMode}
                          onChange={(e) => setPaymentMode(e.target.value as any)}
                          className="w-full px-4 py-3 text-sm bg-white border border-[#CBD5E1] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2F6FED]/20 focus:border-[#2F6FED] font-semibold text-[#1A2333] shadow-2xs"
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
                              <option value="UPI">UPI (Google Pay / PhonePe / Paytm)</option>
                              <option value="Card">Debit / Credit Card</option>
                              <option value="Bank Transfer">Bank Transfer / NEFT</option>
                              <option value="Cash">Cash at Reception</option>
                            </>
                          )}
                        </select>
                      </div>
                    </div>

                    {/* Payment Date & Reference No */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-[#1A2333] mb-1.5">
                          Payment Date <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          required
                          value={paymentDate}
                          onChange={(e) => setPaymentDate(e.target.value)}
                          className="w-full px-4 py-2.5 text-xs bg-white border border-[#CBD5E1] rounded-xl focus:outline-none focus:border-[#2F6FED] text-[#1A2333] font-medium shadow-2xs"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#1A2333] mb-1.5">
                          Transaction Reference / UTR
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. UPI/4089128091"
                          value={referenceNo}
                          onChange={(e) => setReferenceNo(e.target.value)}
                          className="w-full px-4 py-2.5 text-xs bg-white border border-[#CBD5E1] rounded-xl focus:outline-none focus:border-[#2F6FED] text-[#1A2333] font-mono shadow-2xs"
                        />
                      </div>
                    </div>

                    {/* Tax & Total Calculation Breakdown */}
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                      <div className="flex justify-between text-slate-600">
                        <span>Base Subscription Fee:</span>
                        <span className="font-semibold tabular-nums">{formatINR(taxBreakdown.base)}</span>
                      </div>
                      <div className="flex justify-between items-center text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <span>GST Calculation:</span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              taxBreakdown.isGstApplicable
                                ? 'bg-blue-100 text-blue-700 border border-blue-200'
                                : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            {taxBreakdown.isGstApplicable
                              ? `With GST (${taxBreakdown.rate}%)`
                              : 'Without GST (Exempt / 0%)'}
                          </span>
                        </div>
                        <span className="font-semibold tabular-nums">{formatINR(taxBreakdown.tax)}</span>
                      </div>
                      {taxBreakdown.isGstApplicable && taxBreakdown.tax > 0 && (
                        <div className="flex justify-between text-[11px] text-slate-400 pl-2">
                          <span>• CGST ({taxBreakdown.rate / 2}%) + SGST ({taxBreakdown.rate / 2}%):</span>
                          <span className="tabular-nums">
                            {formatINR(Math.round(taxBreakdown.tax / 2))} + {formatINR(Math.round(taxBreakdown.tax / 2))}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between font-bold text-sm text-[#1A2333] pt-2 border-t border-slate-200">
                        <span>Net Total Invoice:</span>
                        <span className="text-[#2F6FED] tabular-nums font-extrabold text-base">
                          {formatINR(taxBreakdown.netTotal)}
                        </span>
                      </div>
                    </div>

                    {/* WhatsApp Invoice Notice */}
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">
                      <MessageCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <span>
                        Official GST receipt invoice can be sent instantly to member's WhatsApp upon submission.
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500 italic">
                    Member will be registered without an initial fee transaction. Future payments can be recorded from the Receipts module.
                  </div>
                )}
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleResetForm}
                  className="px-5 py-3 border border-slate-200 hover:bg-slate-100 rounded-xl text-xs font-semibold text-slate-700 transition-colors"
                >
                  Clear Form
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 py-3.5 bg-[#2F6FED] hover:bg-[#2558bf] text-white rounded-xl text-sm font-bold transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {actionLoading ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5" />
                      <span>Complete Registration & Issue Receipt</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: PENDING REGISTRATIONS APPROVAL VIEW */}
      {/* ========================================================================= */}
      {activeTab === 'PENDING' && (
        <div className="space-y-4 animate-fade-in">
          <div className="bg-white border border-[#E2E6ED] rounded-2xl p-6 shadow-subtle">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-heading text-lg font-bold text-[#1A2333]">
                  Pending Registration Submissions
                </h3>
                <p className="text-xs text-[#6B7686]">
                  Registrations submitted by gym trainers awaiting administrative verification and ledger authorization
                </p>
              </div>
              <button
                onClick={loadInitialData}
                disabled={loading}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-xs font-semibold rounded-lg text-slate-700"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>

            {pendingRegistrations.length === 0 ? (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <UserCheck className="w-10 h-10 mx-auto text-slate-300" />
                <p className="text-sm font-medium">All registrations are cleared!</p>
                <p className="text-xs">No pending member registrations currently waiting for review.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F8FAFC] border-b border-[#E2E6ED] text-[#6B7686] font-semibold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-3 px-4">Member Name</th>
                      <th className="py-3 px-4">Phone</th>
                      <th className="py-3 px-4">Plan & Category</th>
                      <th className="py-3 px-4">Payment</th>
                      <th className="py-3 px-4">Submitted By</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E6ED]">
                    {pendingRegistrations.map((p) => (
                      <tr key={p.id} className="hover:bg-[#F8FAFC] transition-colors">
                        <td className="py-3 px-4 font-bold text-[#1A2333]">{p.name}</td>
                        <td className="py-3 px-4 text-[#1A2333] font-mono">{p.phone}</td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-[#1A2333]">{p.planName}</span>
                          <span className="text-[10px] text-slate-500 block">{p.planCategory}</span>
                        </td>
                        <td className="py-3 px-4">
                          {p.paymentIncluded && p.paymentDetails ? (
                            <span className="font-bold text-emerald-700">
                              {formatINR(p.paymentDetails.amount)} ({p.paymentDetails.paymentMode})
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">No upfront fee</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-slate-800">{p.submittedBy}</span>
                          <span className="text-[10px] uppercase font-bold text-amber-600 block">
                            Trainer Queue
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-500">{p.submittedOn}</td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => {
                              setReviewingPending(p);
                              setIsRejectMode(false);
                              setRejectionReason('');
                            }}
                            className="px-3 py-1.5 bg-[#2F6FED] hover:bg-[#2558bf] text-white rounded-lg font-semibold text-xs transition-colors"
                          >
                            Review & Verify
                          </button>
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

      {/* ========================================================================= */}
      {/* TAB 3: RECENT REGISTRATIONS ROSTER */}
      {/* ========================================================================= */}
      {activeTab === 'RECENT' && (
        <div className="space-y-4 animate-fade-in">
          <div className="bg-white border border-[#E2E6ED] rounded-2xl p-6 shadow-subtle">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-heading text-lg font-bold text-[#1A2333]">
                  Recently Registered Members
                </h3>
                <p className="text-xs text-[#6B7686]">
                  Active gym roster members with instant WhatsApp invoice sharing
                </p>
              </div>
              <Link
                to="/members"
                className="text-xs font-semibold text-[#2F6FED] hover:underline flex items-center gap-1"
              >
                <span>Full Member Management Directory</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8FAFC] border-b border-[#E2E6ED] text-[#6B7686] font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Member</th>
                    <th className="py-3 px-4">Phone</th>
                    <th className="py-3 px-4">Plan</th>
                    <th className="py-3 px-4">Joining Date</th>
                    <th className="py-3 px-4">Next Due Date</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E6ED]">
                  {recentMembers.slice(0, 15).map((m) => (
                    <tr key={m.id} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-[#1A2333]">{m.name}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{m.memberId}</div>
                      </td>
                      <td className="py-3 px-4 text-[#1A2333] font-mono">{m.phone}</td>
                      <td className="py-3 px-4 font-semibold text-[#1A2333]">{m.planName}</td>
                      <td className="py-3 px-4 text-slate-600">{m.joiningDate}</td>
                      <td className="py-3 px-4 font-medium text-slate-900">{m.expiryDate}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            m.status === 'ACTIVE'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {m.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => {
                            // Construct on-the-fly shareable receipt
                            const mockReceipt: ReceiptItem = {
                              id: `rec-${m.id}`,
                              receiptNo: `REC-${m.memberId}`,
                              memberId: m.id,
                              memberName: m.name,
                              memberPhone: m.phone,
                              plan: m.planName,
                              planCategory: m.planCategory,
                              amount: 2500,
                              tax: 450,
                              total: 2950,
                              paymentDate: m.joiningDate,
                              paymentMode: 'UPI',
                              referenceNo: 'VERIFIED_ACTIVE',
                              status: 'PAID',
                            };
                            handleShareWhatsApp(mockReceipt);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors"
                          title="Share Invoice via WhatsApp Web"
                        >
                          <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                          <span>WhatsApp</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* POST-REGISTRATION RECEIPT & WHATSAPP MODAL */}
      {/* ========================================================================= */}
      {generatedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white border border-[#E2E6ED] rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-scale-in">
            {/* Modal Header */}
            <div className="p-6 bg-gradient-to-r from-emerald-600 to-teal-700 text-white text-center space-y-2 relative">
              <button
                onClick={() => setGeneratedReceipt(null)}
                className="absolute top-4 right-4 text-white/80 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="w-12 h-12 rounded-full bg-white/20 mx-auto flex items-center justify-center">
                <Check className="w-6 h-6 text-white" strokeWidth={3} />
              </div>
              <h3 className="font-heading text-xl font-bold tracking-tight">
                Registration & Receipt Generated!
              </h3>
              <p className="text-xs text-emerald-100">
                {registeredMemberName} has been enrolled and an official invoice has been created.
              </p>
            </div>

            {/* Receipt Summary Card */}
            <div className="p-6 space-y-5">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 text-xs">
                <div className="flex justify-between pb-2 border-b border-slate-200">
                  <span className="text-slate-500">Receipt Number:</span>
                  <span className="font-mono font-bold text-slate-900">{generatedReceipt.receiptNo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Member:</span>
                  <span className="font-bold text-slate-900">{generatedReceipt.memberName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Phone:</span>
                  <span className="font-mono text-slate-900">{generatedReceipt.memberPhone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Plan:</span>
                  <span className="font-semibold text-slate-900">{generatedReceipt.plan}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Payment Mode:</span>
                  <span className="font-medium text-slate-900">{generatedReceipt.paymentMode}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-200 text-sm font-bold">
                  <span className="text-slate-700">Net Amount Paid:</span>
                  <span className="text-emerald-700 font-extrabold">{formatINR(generatedReceipt.total)}</span>
                </div>
              </div>

              {/* ACTION: SEND TO WHATSAPP WEB */}
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => handleShareWhatsApp(generatedReceipt)}
                  className="w-full py-3.5 bg-[#25D366] hover:bg-[#20ba5a] text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2.5 shadow-md hover:shadow-lg transition-all cursor-pointer"
                >
                  <MessageCircle className="w-5 h-5" />
                  <span>Send Receipt to WhatsApp Web</span>
                </button>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveReceiptForSlip(generatedReceipt);
                    }}
                    className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-100 rounded-xl text-xs font-semibold text-slate-700 flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Printer className="w-4 h-4 text-slate-500" />
                    <span>View & Print Slip</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setGeneratedReceipt(null)}
                    className="flex-1 py-2.5 bg-[#2F6FED] hover:bg-[#2558bf] text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <span>Register Next Member</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* REVIEW PENDING REGISTRATION MODAL */}
      {/* ========================================================================= */}
      {reviewingPending && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-blue-600" />
                <h3 className="font-heading font-bold text-slate-900">
                  Review Pending Registration
                </h3>
              </div>
              <button
                onClick={() => setReviewingPending(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-500 block">Member Name:</span>
                  <span className="font-bold text-sm text-slate-900">{reviewingPending.name}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Phone Number:</span>
                  <span className="font-mono font-bold text-slate-900">{reviewingPending.phone}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Requested Plan:</span>
                  <span className="font-semibold text-slate-900">{reviewingPending.planName}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Trainer Submitter:</span>
                  <span className="font-semibold text-slate-900">{reviewingPending.submittedBy}</span>
                </div>
                {reviewingPending.paymentIncluded && reviewingPending.paymentDetails && (
                  <div className="col-span-2 pt-2 border-t border-slate-200">
                    <span className="text-slate-500 block">Payment Details:</span>
                    <span className="font-bold text-emerald-700">
                      {formatINR(reviewingPending.paymentDetails.amount)} via {reviewingPending.paymentDetails.paymentMode} on {reviewingPending.paymentDetails.paymentDate}
                    </span>
                  </div>
                )}
              </div>

              {isRejectMode && (
                <div className="space-y-2 animate-fade-in">
                  <label className="block text-xs font-bold text-red-700">
                    Mandatory Rejection Reason:
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Enter reason for rejecting this member registration..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="w-full px-3 py-2 border border-red-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-red-500/20"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                {!isRejectMode ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setIsRejectMode(true)}
                      className="px-4 py-2 border border-red-200 text-red-600 hover:bg-red-50 rounded-xl font-semibold transition-colors"
                    >
                      Reject Submission
                    </button>
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => handleApprovePending(reviewingPending.id)}
                      className="px-5 py-2 bg-[#2F6FED] hover:bg-[#2558bf] text-white rounded-xl font-bold shadow-sm transition-colors"
                    >
                      Approve & Enroll Member
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setIsRejectMode(false)}
                      className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl font-semibold"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={handleRejectPending}
                      className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold shadow-sm"
                    >
                      Confirm Rejection
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PRINTABLE RECEIPT SLIP MODAL */}
      {/* ========================================================================= */}
      {activeReceiptForSlip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white border border-[#E2E6ED] rounded-xl shadow-card w-full max-w-md overflow-hidden">
            <div className="p-6 space-y-6">
              <div className="text-center pb-4 border-b border-[#E2E6ED]">
                <div className="font-heading text-lg font-extrabold text-[#1A2333] tracking-tight">
                  {user?.gymName || 'GymERP Fitness Center'}
                </div>
                <div className="text-[11px] text-[#6B7686] mt-0.5">
                  Downtown Flagship Branch • GSTIN: 27AABCP1234F1Z8
                </div>
                <div className="inline-block px-2.5 py-0.5 mt-2 bg-[#E8EFFE] text-[#2F6FED] text-[10px] font-bold rounded-full uppercase tracking-wider">
                  Payment Receipt Slip
                </div>
              </div>

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

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#E2E6ED]">
                <button
                  onClick={() => setActiveReceiptForSlip(null)}
                  className="px-3.5 py-1.5 border border-[#E2E6ED] hover:bg-[#F5F7FA] rounded-lg text-xs font-medium text-[#1A2333]"
                >
                  Close
                </button>
                <button
                  onClick={() => handleShareWhatsApp(activeReceiptForSlip)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#25D366] hover:bg-[#20ba5a] text-white rounded-lg text-xs font-semibold shadow-xs"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>WhatsApp Web</span>
                </button>
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#2F6FED] hover:bg-[#2558bf] text-white rounded-lg text-xs font-medium"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Slip</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(RegistrationPage);

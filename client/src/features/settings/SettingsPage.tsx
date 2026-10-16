import { memo, useState, useEffect } from 'react';
import {
  CreditCard,
  Building2,
  CalendarCheck,
  Plus,
  Edit2,
  Eye,
  EyeOff,
  X,
  ShieldCheck,
  RefreshCw,
  Trash2,
  QrCode,
  ReceiptText,
} from 'lucide-react';
import ExpenseTypesTab from './ExpenseTypesTab';
import { useAuthStore } from '../../stores/useAuthStore';
import {
  getPaymentTypes,
  addPaymentType,
  updatePaymentType,
  togglePaymentTypeStatus,
  getBankAccounts,
  addBankAccount,
  updateBankAccount,
  toggleBankAccountStatus,
  setPrimaryBankAccount,
  deleteBankAccount,
  getPlanTypes,
  addPlanType,
  updatePlanType,
  togglePlanTypeStatus,
  deletePlanType,
  CreateBankAccountInput,
  CreatePlanTypeInput,
} from '../../api/settingsApi';
import {
  PaymentTypeItem,
  BankAccountItem,
  PlanTypeItem,
  DurationUnit,
} from '../../api/types';

type SettingsTab = 'PAYMENT_TYPES' | 'BANKS' | 'PLAN_TYPES' | 'EXPENSE_TYPES';

function SettingsPage() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<SettingsTab>('PAYMENT_TYPES');
  const [loading, setLoading] = useState(true);

  // Section 1: Payment Types State
  const [paymentTypes, setPaymentTypes] = useState<PaymentTypeItem[]>([]);
  const [isAddPaymentModalOpen, setIsAddPaymentModalOpen] = useState(false);
  const [editingPaymentType, setEditingPaymentType] = useState<PaymentTypeItem | null>(null);
  const [paymentTypeName, setPaymentTypeName] = useState('');

  // Section 2: Banks State
  const [banks, setBanks] = useState<BankAccountItem[]>([]);
  const [isAddBankModalOpen, setIsAddBankModalOpen] = useState(false);
  const [editingBank, setEditingBank] = useState<BankAccountItem | null>(null);
  const [revealedAccountIds, setRevealedAccountIds] = useState<Record<string, boolean>>({});
  const [bankForm, setBankForm] = useState<CreateBankAccountInput>({
    bankName: '',
    accountHolderName: '',
    accountNumber: '',
    ifscCode: '',
    branchName: '',
    upiHandle: '',
    isPrimary: false,
  });

  // Section 3: Fee Types State
  const [planTypes, setPlanTypes] = useState<PlanTypeItem[]>([]);
  const [isAddPlanModalOpen, setIsAddPlanModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PlanTypeItem | null>(null);
  const [planForm, setPlanForm] = useState<CreatePlanTypeInput>({
    name: '',
    category: 'Regular',
    durationValue: 1,
    durationUnit: 'Months',
    standardFee: 2500,
  });

  // Initial Data Load
  const fetchAllSettings = async () => {
    try {
      setLoading(true);
      const [pt, bnk, plans] = await Promise.all([
        getPaymentTypes(),
        getBankAccounts(),
        getPlanTypes(),
      ]);
      setPaymentTypes(pt);
      setBanks(bnk);
      setPlanTypes(plans);
    } catch (err) {
      console.error('Failed to load settings data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllSettings();
  }, []);

  // --- Payment Types Actions ---
  const handleSavePaymentType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentTypeName.trim()) return;

    try {
      if (editingPaymentType) {
        // Optimistic update
        setPaymentTypes((prev) =>
          prev.map((p) => (p.id === editingPaymentType.id ? { ...p, name: paymentTypeName.trim() } : p))
        );
        await updatePaymentType(editingPaymentType.id, paymentTypeName);
      } else {
        const created = await addPaymentType(paymentTypeName);
        setPaymentTypes((prev) => [...prev, created]);
      }
      setIsAddPaymentModalOpen(false);
      setEditingPaymentType(null);
      setPaymentTypeName('');
    } catch (err) {
      alert('Error saving payment type');
      fetchAllSettings();
    }
  };

  const handleTogglePaymentStatus = async (id: string) => {
    setPaymentTypes((prev) =>
      prev.map((p) => (p.id === id ? { ...p, isActive: !p.isActive } : p))
    );
    try {
      await togglePaymentTypeStatus(id);
    } catch {
      fetchAllSettings();
    }
  };

  // --- Bank Account Actions ---
  const handleSaveBank = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankForm.bankName.trim() || !bankForm.accountNumber.trim()) return;

    try {
      if (editingBank) {
        setBanks((prev) =>
          prev.map((b) => {
            if (bankForm.isPrimary) {
              return b.id === editingBank.id
                ? { ...b, ...bankForm, isPrimary: true }
                : { ...b, isPrimary: false };
            }
            return b.id === editingBank.id ? { ...b, ...bankForm } : b;
          })
        );
        await updateBankAccount(editingBank.id, bankForm);
      } else {
        const created = await addBankAccount(bankForm);
        setBanks((prev) => {
          if (bankForm.isPrimary) {
            return [...prev.map((b) => ({ ...b, isPrimary: false })), created];
          }
          return [...prev, created];
        });
      }
      setIsAddBankModalOpen(false);
      setEditingBank(null);
      setBankForm({
        bankName: '',
        accountHolderName: '',
        accountNumber: '',
        ifscCode: '',
        branchName: '',
        upiHandle: '',
        isPrimary: false,
      });
    } catch (err) {
      alert('Error saving bank account');
      fetchAllSettings();
    }
  };

  const handleToggleBankStatus = async (id: string) => {
    setBanks((prev) =>
      prev.map((b) => (b.id === id ? { ...b, isActive: !b.isActive } : b))
    );
    try {
      await toggleBankAccountStatus(id);
    } catch {
      fetchAllSettings();
    }
  };

  const handleSetPrimaryBank = async (id: string) => {
    setBanks((prev) =>
      prev.map((b) => ({
        ...b,
        isPrimary: b.id === id,
        isActive: b.id === id ? true : b.isActive,
      }))
    );
    try {
      await setPrimaryBankAccount(id);
    } catch {
      fetchAllSettings();
    }
  };

  const handleDeleteBank = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to remove bank account "${name}"?`)) return;
    setBanks((prev) => prev.filter((b) => b.id !== id));
    try {
      await deleteBankAccount(id);
    } catch {
      alert('Failed to delete bank account');
      fetchAllSettings();
    }
  };

  const toggleRevealAccount = (id: string) => {
    setRevealedAccountIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const maskAccountNumber = (acc: string, isRevealed: boolean) => {
    if (isRevealed) return acc;
    if (acc.length <= 4) return '•••• ' + acc;
    const last4 = acc.slice(-4);
    return '•••• •••• ' + last4;
  };

  // --- Plan Types Actions ---
  const handleSavePlanType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!planForm.name.trim()) return;

    try {
      if (editingPlan) {
        setPlanTypes((prev) =>
          prev.map((p) =>
            p.id === editingPlan.id
              ? {
                  ...p,
                  name: planForm.name.trim(),
                  category: planForm.category || 'Regular',
                  durationUnit: planForm.durationUnit,
                  durationValue: planForm.durationUnit === 'One-time' ? 0 : planForm.durationValue,
                  standardFee: Number(planForm.standardFee) || 2500,
                  displayDuration:
                    planForm.durationUnit === 'One-time'
                      ? 'One-time'
                      : `${planForm.durationValue} ${planForm.durationUnit}`,
                }
              : p
          )
        );
        await updatePlanType(editingPlan.id, planForm);
      } else {
        const created = await addPlanType(planForm);
        setPlanTypes((prev) => [...prev, created]);
      }
      setIsAddPlanModalOpen(false);
      setEditingPlan(null);
      setPlanForm({ name: '', category: 'Regular', durationValue: 1, durationUnit: 'Months', standardFee: 2500 });
    } catch (err) {
      alert('Error saving plan type');
      fetchAllSettings();
    }
  };

  const handleTogglePlanStatus = async (id: string) => {
    setPlanTypes((prev) =>
      prev.map((p) => (p.id === id ? { ...p, isActive: !p.isActive } : p))
    );
    try {
      await togglePlanTypeStatus(id);
    } catch {
      fetchAllSettings();
    }
  };

  const handleDeletePlan = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete fee type "${name}"?`)) return;
    setPlanTypes((prev) => prev.filter((p) => p.id !== id));
    try {
      await deletePlanType(id);
    } catch {
      alert('Failed to delete plan type');
      fetchAllSettings();
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-heading text-2xl font-bold text-[#1A2333] tracking-tight">
              System & Financial Settings
            </h1>
            {user?.gymName && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#EEF4FF] text-[#2F6FED] border border-[#D5E3FF]">
                <Building2 className="w-3 h-3" />
                {user.gymName}
              </span>
            )}
          </div>
          <p className="text-sm text-[#6B7686] mt-0.5">
            Configure collection modes, gym settlement bank accounts, and membership fee durations
          </p>
        </div>

        <button
          onClick={() => fetchAllSettings()}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-2 bg-white border border-[#E2E6ED] hover:bg-[#F8FAFC] text-[#344054] rounded-lg text-xs font-medium transition-colors shadow-subtle disabled:opacity-50 self-start sm:self-auto"
          title="Refresh settings"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#2F6FED]' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Main Settings Grid: Sub-Navigation on Left, Content on Right */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Left Sub-Navigation */}
        <div className="md:col-span-4 lg:col-span-3 bg-white border border-[#E2E6ED] rounded-xl p-2 shadow-subtle space-y-1">
          <button
            onClick={() => setActiveTab('PAYMENT_TYPES')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === 'PAYMENT_TYPES'
                ? 'bg-[#E8EFFE] text-[#2F6FED] font-semibold'
                : 'text-[#1A2333] hover:bg-[#F5F7FA]'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <CreditCard className="w-4 h-4 text-[#2F6FED]" strokeWidth={1.8} />
              <span>Payment Types</span>
            </div>
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] tabular-nums font-bold ${
                activeTab === 'PAYMENT_TYPES'
                  ? 'bg-white text-[#2F6FED]'
                  : 'bg-[#F5F7FA] text-[#6B7686]'
              }`}
            >
              {paymentTypes.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('BANKS')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === 'BANKS'
                ? 'bg-[#E8EFFE] text-[#2F6FED] font-semibold'
                : 'text-[#1A2333] hover:bg-[#F5F7FA]'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Building2 className="w-4 h-4 text-[#2F6FED]" strokeWidth={1.8} />
              <span>Bank Accounts</span>
            </div>
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] tabular-nums font-bold ${
                activeTab === 'BANKS'
                  ? 'bg-white text-[#2F6FED]'
                  : 'bg-[#F5F7FA] text-[#6B7686]'
              }`}
            >
              {banks.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('PLAN_TYPES')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === 'PLAN_TYPES'
                ? 'bg-[#E8EFFE] text-[#2F6FED] font-semibold'
                : 'text-[#1A2333] hover:bg-[#F5F7FA]'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <CalendarCheck className="w-4 h-4 text-[#2F6FED]" strokeWidth={1.8} />
              <span>Fee Types</span>
            </div>
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] tabular-nums font-bold ${
                activeTab === 'PLAN_TYPES'
                  ? 'bg-white text-[#2F6FED]'
                  : 'bg-[#F5F7FA] text-[#6B7686]'
              }`}
            >
              {planTypes.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('EXPENSE_TYPES')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === 'EXPENSE_TYPES'
                ? 'bg-[#E8EFFE] text-[#2F6FED] font-semibold'
                : 'text-[#1A2333] hover:bg-[#F5F7FA]'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <ReceiptText className="w-4 h-4 text-[#2F6FED]" strokeWidth={1.8} />
              <span>Expense Types</span>
            </div>
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                activeTab === 'EXPENSE_TYPES'
                  ? 'bg-white text-[#2F6FED]'
                  : 'bg-[#F5F7FA] text-[#6B7686]'
              }`}
            >
              Active
            </span>
          </button>
        </div>

        {/* Right Active Section Content */}
        <div className="md:col-span-8 lg:col-span-9 bg-white border border-[#E2E6ED] rounded-xl p-6 shadow-subtle">
          {loading ? (
            /* Skeleton Loader */
            <div className="space-y-4 animate-pulse">
              <div className="h-6 bg-[#F5F7FA] rounded w-1/4" />
              <div className="h-4 bg-[#F5F7FA] rounded w-2/3" />
              <div className="h-48 bg-[#F5F7FA] rounded-xl mt-6" />
            </div>
          ) : (
            <>
              {/* SECTION 1: PAYMENT TYPES */}
              {activeTab === 'PAYMENT_TYPES' && (
                <div className="space-y-6 animate-fade-in">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E2E6ED]">
                    <div>
                      <h2 className="font-heading text-lg font-bold text-[#1A2333]">
                        Accepted Payment Types
                      </h2>
                      <p className="text-xs text-[#6B7686] mt-0.5">
                        Define payment instruments accepted at the front desk and digital terminals
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        setEditingPaymentType(null);
                        setPaymentTypeName('');
                        setIsAddPaymentModalOpen(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#2F6FED] hover:bg-[#2558bf] text-white rounded-lg text-xs font-medium transition-colors shadow-sm self-start sm:self-auto"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Payment Type
                    </button>
                  </div>

                  {/* Payment Types Table */}
                  <div className="overflow-x-auto border border-[#E2E6ED] rounded-lg">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-[#E2E6ED] bg-[#F5F7FA] text-[11px] font-semibold uppercase text-[#6B7686] tracking-wider">
                          <th className="py-3 px-4">Payment Method Name</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4">Added On</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E2E6ED] text-xs">
                        {paymentTypes.map((pt) => (
                          <tr
                            key={pt.id}
                            className={`transition-colors ${
                              pt.isActive ? 'hover:bg-[#F5F7FA]' : 'opacity-55 bg-[#F5F7FA]/40'
                            }`}
                          >
                            <td className="py-3.5 px-4">
                              <span className="font-semibold text-[#1A2333]">{pt.name}</span>
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-1.5">
                                <span
                                  className="w-1.5 h-1.5 rounded-full"
                                  style={{ backgroundColor: pt.isActive ? '#2E9E6D' : '#6B7686' }}
                                />
                                <span
                                  className="font-medium"
                                  style={{ color: pt.isActive ? '#2E9E6D' : '#6B7686' }}
                                >
                                  {pt.isActive ? 'Active' : 'Inactive'}
                                </span>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-[#6B7686]">{pt.createdAt}</td>
                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => {
                                    setEditingPaymentType(pt);
                                    setPaymentTypeName(pt.name);
                                    setIsAddPaymentModalOpen(true);
                                  }}
                                  className="p-1 text-[#6B7686] hover:text-[#2F6FED] hover:bg-[#E8EFFE] rounded transition-colors"
                                  title="Edit payment type"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>

                                <button
                                  onClick={() => handleTogglePaymentStatus(pt.id)}
                                  className={`px-2.5 py-1 text-[11px] font-medium rounded border transition-colors ${
                                    pt.isActive
                                      ? 'border-[#E2E6ED] text-[#6B7686] hover:text-[#D14343] hover:border-[#D14343]'
                                      : 'border-[#2E9E6D] text-[#2E9E6D] hover:bg-[#E8EFFE]'
                                  }`}
                                >
                                  {pt.isActive ? 'Deactivate' : 'Activate'}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="text-[11px] text-[#6B7686] italic">
                    Note: Deactivating a payment type retains historical audit references in member fee receipts without deleting records.
                  </div>
                </div>
              )}

              {/* SECTION 2: BANKS */}
              {activeTab === 'BANKS' && (
                <div className="space-y-6 animate-fade-in">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E2E6ED]">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="font-heading text-lg font-bold text-[#1A2333]">
                          Gym Settlement Bank Accounts
                        </h2>
                        <span className="flex items-center gap-1 text-[10px] font-semibold text-[#2F6FED] bg-[#E8EFFE] px-2 py-0.5 rounded-full">
                          <ShieldCheck className="w-3 h-3" />
                          Masked & Secured
                        </span>
                      </div>
                      <p className="text-xs text-[#6B7686] mt-0.5">
                        Manage corporate accounts used for member fee deposits, UPI payouts, and vendor clearing
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        setEditingBank(null);
                        setBankForm({
                          bankName: '',
                          accountHolderName: '',
                          accountNumber: '',
                          ifscCode: '',
                          branchName: '',
                          upiHandle: '',
                          isPrimary: banks.length === 0,
                        });
                        setIsAddBankModalOpen(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#2F6FED] hover:bg-[#2558bf] text-white rounded-lg text-xs font-medium transition-colors shadow-sm self-start sm:self-auto"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Bank
                    </button>
                  </div>

                  {/* Banks Table */}
                  <div className="overflow-x-auto border border-[#E2E6ED] rounded-lg">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-[#E2E6ED] bg-[#F5F7FA] text-[11px] font-semibold uppercase text-[#6B7686] tracking-wider">
                          <th className="py-3 px-4">Bank Name & Branch</th>
                          <th className="py-3 px-4">Account Holder</th>
                          <th className="py-3 px-4">Account Number</th>
                          <th className="py-3 px-4">IFSC Code</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E2E6ED] text-xs">
                        {banks.map((b) => {
                          const isRevealed = !!revealedAccountIds[b.id];
                          return (
                            <tr
                              key={b.id}
                              className={`transition-colors ${
                                b.isActive ? 'hover:bg-[#F5F7FA]' : 'opacity-55 bg-[#F5F7FA]/40'
                              }`}
                            >
                              <td className="py-3.5 px-4">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-[#1A2333]">{b.bankName}</span>
                                  {b.isPrimary && (
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#E8EFFE] text-[#2F6FED] border border-[#2F6FED]/30 uppercase tracking-wider">
                                      Primary
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-[#6B7686] flex flex-wrap items-center gap-1.5 mt-0.5">
                                  {b.branchName && <span>{b.branchName}</span>}
                                  {b.upiHandle && (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#F0FDF4] text-[#166534] border border-[#BBF7D0]">
                                      <QrCode className="w-2.5 h-2.5" />
                                      {b.upiHandle}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="py-3.5 px-4 font-medium text-[#1A2333]">
                                {b.accountHolderName}
                              </td>
                              <td className="py-3.5 px-4">
                                <div className="flex items-center gap-2 font-mono tabular-nums text-[#1A2333]">
                                  <span>{maskAccountNumber(b.accountNumber, isRevealed)}</span>
                                  <button
                                    onClick={() => toggleRevealAccount(b.id)}
                                    className="text-[#6B7686] hover:text-[#2F6FED] p-1 transition-colors"
                                    title={isRevealed ? 'Hide account number' : 'Reveal account number'}
                                  >
                                    {isRevealed ? (
                                      <EyeOff className="w-3.5 h-3.5" />
                                    ) : (
                                      <Eye className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                </div>
                              </td>
                              <td className="py-3.5 px-4 font-mono font-medium text-[#1A2333]">
                                {b.ifscCode}
                              </td>
                              <td className="py-3.5 px-4">
                                <div className="flex items-center gap-1.5">
                                  <span
                                    className="w-1.5 h-1.5 rounded-full"
                                    style={{
                                      backgroundColor: b.isActive ? '#2E9E6D' : '#6B7686',
                                    }}
                                  />
                                  <span
                                    className="font-medium"
                                    style={{ color: b.isActive ? '#2E9E6D' : '#6B7686' }}
                                  >
                                    {b.isActive ? 'Active' : 'Inactive'}
                                  </span>
                                </div>
                              </td>
                              <td className="py-3.5 px-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  {!b.isPrimary && b.isActive && (
                                    <button
                                      onClick={() => handleSetPrimaryBank(b.id)}
                                      className="px-2 py-1 text-[11px] font-medium border border-[#E2E6ED] hover:border-[#2F6FED] hover:text-[#2F6FED] rounded transition-colors text-[#1A2333] bg-white"
                                    >
                                      Make Primary
                                    </button>
                                  )}

                                  <button
                                    onClick={() => {
                                      setEditingBank(b);
                                      setBankForm({
                                        bankName: b.bankName,
                                        accountHolderName: b.accountHolderName,
                                        accountNumber: b.accountNumber,
                                        ifscCode: b.ifscCode,
                                        branchName: b.branchName || '',
                                        upiHandle: b.upiHandle || '',
                                        isPrimary: b.isPrimary,
                                      });
                                      setIsAddBankModalOpen(true);
                                    }}
                                    className="p-1 text-[#6B7686] hover:text-[#2F6FED] hover:bg-[#E8EFFE] rounded transition-colors"
                                    title="Edit bank account"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>

                                  <button
                                    onClick={() => handleToggleBankStatus(b.id)}
                                    disabled={b.isPrimary}
                                    className={`px-2 py-1 text-[11px] font-medium rounded border transition-colors ${
                                      b.isPrimary
                                        ? 'border-transparent text-[#6B7686] opacity-40 cursor-not-allowed'
                                        : b.isActive
                                        ? 'border-[#E2E6ED] text-[#6B7686] hover:text-[#D14343] hover:border-[#D14343]'
                                        : 'border-[#2E9E6D] text-[#2E9E6D] hover:bg-[#E8EFFE]'
                                    }`}
                                    title={b.isPrimary ? 'Primary bank cannot be deactivated' : undefined}
                                  >
                                    {b.isActive ? 'Deactivate' : 'Activate'}
                                  </button>

                                  {!b.isPrimary && (
                                    <button
                                      onClick={() => handleDeleteBank(b.id, b.bankName)}
                                      className="p-1 text-[#6B7686] hover:text-[#D14343] hover:bg-[#FEE2E2] rounded transition-colors"
                                      title="Delete bank account"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
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

                  <div className="text-[11px] text-[#6B7686] italic">
                    Security Notice: Account numbers are masked by default. Clicking the eye icon temporarily reveals the number for verification without storing unencrypted tokens in browser storage.
                  </div>
                </div>
              )}

              {/* SECTION 3: PLAN TYPES */}
              {activeTab === 'PLAN_TYPES' && (
                <div className="space-y-6 animate-fade-in">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E2E6ED]">
                    <div>
                      <h2 className="font-heading text-lg font-bold text-[#1A2333]">
                        Fee Types
                      </h2>
                      <p className="text-xs text-[#6B7686] mt-0.5">
                        Configure membership fee types, categories (Regular / Personal Training), and billing cycle durations
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        setEditingPlan(null);
                        setPlanForm({ name: '', category: 'Regular', durationValue: 1, durationUnit: 'Months', standardFee: 2500 });
                        setIsAddPlanModalOpen(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#2F6FED] hover:bg-[#2558bf] text-white rounded-lg text-xs font-medium transition-colors shadow-sm self-start sm:self-auto"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Fee Type
                    </button>
                  </div>

                  {/* Fee Types Table */}
                  <div className="overflow-x-auto border border-[#E2E6ED] rounded-lg">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-[#E2E6ED] bg-[#F5F7FA] text-[11px] font-semibold uppercase text-[#6B7686] tracking-wider">
                          <th className="py-3 px-4">Fee Type Name</th>
                          <th className="py-3 px-4">Category</th>
                          <th className="py-3 px-4">Duration</th>
                          <th className="py-3 px-4">Standard Fee</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E2E6ED] text-xs">
                        {planTypes.map((plan) => (
                          <tr
                            key={plan.id}
                            className={`transition-colors ${
                              plan.isActive ? 'hover:bg-[#F5F7FA]' : 'opacity-55 bg-[#F5F7FA]/40'
                            }`}
                          >
                            <td className="py-3.5 px-4 font-semibold text-[#1A2333]">
                              {plan.name}
                            </td>
                            <td className="py-3.5 px-4">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ${
                                  plan.category === 'Personal Training'
                                    ? 'bg-purple-50 text-purple-700 border-purple-200'
                                    : 'bg-[#E8EFFE] text-[#2F6FED] border-[#2F6FED]/20'
                                }`}
                              >
                                {plan.category || 'Regular'}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 font-medium text-[#1A2333]">
                              {plan.displayDuration}
                            </td>
                            <td className="py-3.5 px-4 font-medium text-[#1A2333] tabular-nums">
                              ₹ {(plan.standardFee || 0).toLocaleString('en-IN')}
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-1.5">
                                <span
                                  className="w-1.5 h-1.5 rounded-full"
                                  style={{
                                    backgroundColor: plan.isActive ? '#2E9E6D' : '#6B7686',
                                  }}
                                />
                                <span
                                  className="font-medium"
                                  style={{ color: plan.isActive ? '#2E9E6D' : '#6B7686' }}
                                >
                                  {plan.isActive ? 'Active' : 'Inactive'}
                                </span>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => {
                                    setEditingPlan(plan);
                                    setPlanForm({
                                      name: plan.name,
                                      category: plan.category || 'Regular',
                                      durationValue: plan.durationValue || 1,
                                      durationUnit: plan.durationUnit,
                                      standardFee: plan.standardFee || 2500,
                                    });
                                    setIsAddPlanModalOpen(true);
                                  }}
                                  className="p-1 text-[#6B7686] hover:text-[#2F6FED] hover:bg-[#E8EFFE] rounded transition-colors"
                                  title="Edit plan configuration"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>

                                <button
                                  onClick={() => handleTogglePlanStatus(plan.id)}
                                  className={`px-2.5 py-1 text-[11px] font-medium rounded border transition-colors ${
                                    plan.isActive
                                      ? 'border-[#E2E6ED] text-[#6B7686] hover:text-[#D14343] hover:border-[#D14343]'
                                      : 'border-[#2E9E6D] text-[#2E9E6D] hover:bg-[#E8EFFE]'
                                  }`}
                                >
                                  {plan.isActive ? 'Deactivate' : 'Activate'}
                                </button>

                                <button
                                  onClick={() => handleDeletePlan(plan.id, plan.name)}
                                  className="p-1 text-[#6B7686] hover:text-[#D14343] hover:bg-[#FEE2E2] rounded transition-colors"
                                  title="Delete fee type"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="text-[11px] text-[#6B7686] italic">
                    Tip: Gym owners can add custom durations such as "3 Months," "6 Months," or "Trial 14 Days" for seasonal promotions.
                  </div>
                </div>
              )}

              {/* SECTION 4: EXPENSE TYPES */}
              {activeTab === 'EXPENSE_TYPES' && <ExpenseTypesTab />}
            </>
          )}
        </div>
      </div>

      {/* MODAL 1: ADD / EDIT PAYMENT TYPE */}
      {isAddPaymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white border border-[#E2E6ED] rounded-xl shadow-card w-full max-w-sm overflow-hidden animate-fade-in">
            <div className="px-5 py-4 border-b border-[#E2E6ED] flex items-center justify-between">
              <h3 className="font-heading text-sm font-bold text-[#1A2333]">
                {editingPaymentType ? 'Edit Payment Type' : 'Add Payment Type'}
              </h3>
              <button
                onClick={() => setIsAddPaymentModalOpen(false)}
                className="text-[#6B7686] hover:text-[#1A2333]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePaymentType} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#1A2333] mb-1">
                  Payment Type Name *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. Credit Card, Cheque, Razorpay"
                  value={paymentTypeName}
                  onChange={(e) => setPaymentTypeName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-[#E2E6ED] rounded-lg focus:outline-none focus:border-[#2F6FED]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddPaymentModalOpen(false)}
                  className="px-3 py-1.5 border border-[#E2E6ED] rounded-lg text-xs font-medium text-[#1A2333] hover:bg-[#F5F7FA]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-[#2F6FED] hover:bg-[#2558bf] text-white rounded-lg text-xs font-medium shadow-sm"
                >
                  {editingPaymentType ? 'Update' : 'Add Type'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD / EDIT BANK ACCOUNT */}
      {isAddBankModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white border border-[#E2E6ED] rounded-xl shadow-card w-full max-w-md overflow-hidden animate-fade-in">
            <div className="px-6 py-4 border-b border-[#E2E6ED] flex items-center justify-between">
              <h3 className="font-heading text-base font-bold text-[#1A2333]">
                {editingBank ? 'Edit Bank Account' : 'Add Bank Account'}
              </h3>
              <button
                onClick={() => setIsAddBankModalOpen(false)}
                className="text-[#6B7686] hover:text-[#1A2333]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBank} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#1A2333] mb-1">
                  Bank Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. HDFC Bank"
                  value={bankForm.bankName}
                  onChange={(e) => setBankForm({ ...bankForm, bankName: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-[#E2E6ED] rounded-lg focus:outline-none focus:border-[#2F6FED]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1A2333] mb-1">
                  Account Holder Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. PULSE FITNESS ENTERPRISES LLP"
                  value={bankForm.accountHolderName}
                  onChange={(e) => setBankForm({ ...bankForm, accountHolderName: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-[#E2E6ED] rounded-lg focus:outline-none focus:border-[#2F6FED]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#1A2333] mb-1">
                    Account Number *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Enter full account #"
                    value={bankForm.accountNumber}
                    onChange={(e) => setBankForm({ ...bankForm, accountNumber: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-[#E2E6ED] rounded-lg focus:outline-none focus:border-[#2F6FED] font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1A2333] mb-1">
                    IFSC Code *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. HDFC0001092"
                    value={bankForm.ifscCode}
                    onChange={(e) => setBankForm({ ...bankForm, ifscCode: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 text-xs border border-[#E2E6ED] rounded-lg focus:outline-none focus:border-[#2F6FED] font-mono uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1A2333] mb-1">
                  Branch Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Central Downtown Branch"
                  value={bankForm.branchName}
                  onChange={(e) => setBankForm({ ...bankForm, branchName: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-[#E2E6ED] rounded-lg focus:outline-none focus:border-[#2F6FED]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1A2333] mb-1">
                  UPI ID / Handle (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. twelvogym@hdfcbank or pulse@okhdfcbank"
                  value={bankForm.upiHandle || ''}
                  onChange={(e) => setBankForm({ ...bankForm, upiHandle: e.target.value.toLowerCase() })}
                  className="w-full px-3 py-2 text-xs border border-[#E2E6ED] rounded-lg focus:outline-none focus:border-[#2F6FED] font-mono lowercase"
                />
                <p className="text-[11px] text-[#6B7686] mt-0.5">
                  Used on digital payment invoices, QR codes, and instant fee reconciliations.
                </p>
              </div>

              <div className="pt-1">
                <label className="flex items-center gap-2 text-xs text-[#1A2333] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={bankForm.isPrimary}
                    onChange={(e) => setBankForm({ ...bankForm, isPrimary: e.target.checked })}
                    className="rounded border-[#E2E6ED] text-[#2F6FED] focus:ring-0"
                  />
                  <span>Mark as Primary Settlement Bank</span>
                </label>
                <div className="text-[11px] text-[#6B7686] pl-5 mt-0.5">
                  Only one account can be marked primary. Selecting this will unset other accounts.
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddBankModalOpen(false)}
                  className="px-3.5 py-1.5 border border-[#E2E6ED] rounded-lg text-xs font-medium text-[#1A2333] hover:bg-[#F5F7FA]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#2F6FED] hover:bg-[#2558bf] text-white rounded-lg text-xs font-medium shadow-sm"
                >
                  {editingBank ? 'Update Account' : 'Save Bank'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: ADD / EDIT PLAN TYPE */}
      {isAddPlanModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white border border-[#E2E6ED] rounded-xl shadow-card w-full max-w-md overflow-hidden animate-fade-in">
            <div className="px-6 py-4 border-b border-[#E2E6ED] flex items-center justify-between">
              <h3 className="font-heading text-base font-bold text-[#1A2333]">
                {editingPlan ? 'Edit Fee Type' : 'Add Fee Type'}
              </h3>
              <button
                onClick={() => setIsAddPlanModalOpen(false)}
                className="text-[#6B7686] hover:text-[#1A2333]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePlanType} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-[#1A2333] mb-1">
                    Fee Type Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Monthly, Quarterly, PT Monthly, Registration"
                    value={planForm.name}
                    onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-[#E2E6ED] rounded-lg focus:outline-none focus:border-[#2F6FED]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1A2333] mb-1">
                    Category *
                  </label>
                  <select
                    value={planForm.category || 'Regular'}
                    onChange={(e) =>
                      setPlanForm({
                        ...planForm,
                        category: e.target.value as 'Regular' | 'Personal Training',
                      })
                    }
                    className="w-full px-3 py-2 text-xs border border-[#E2E6ED] rounded-lg focus:outline-none focus:border-[#2F6FED] bg-white font-medium"
                  >
                    <option value="Regular">Regular</option>
                    <option value="Personal Training">Personal Training</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1A2333] mb-1">
                    Standard Fee (₹) *
                  </label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={planForm.standardFee || 0}
                    onChange={(e) =>
                      setPlanForm({
                        ...planForm,
                        standardFee: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 text-xs border border-[#E2E6ED] rounded-lg focus:outline-none focus:border-[#2F6FED] tabular-nums"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#1A2333] mb-1">
                    Duration Unit *
                  </label>
                  <select
                    value={planForm.durationUnit}
                    onChange={(e) =>
                      setPlanForm({
                        ...planForm,
                        durationUnit: e.target.value as DurationUnit,
                      })
                    }
                    className="w-full px-3 py-2 text-xs border border-[#E2E6ED] rounded-lg focus:outline-none focus:border-[#2F6FED] bg-white"
                  >
                    <option value="Months">Months</option>
                    <option value="Years">Years</option>
                    <option value="Days">Days</option>
                    <option value="One-time">One-time Fee</option>
                  </select>
                </div>

                {planForm.durationUnit !== 'One-time' && (
                  <div>
                    <label className="block text-xs font-semibold text-[#1A2333] mb-1">
                      Duration Value (Number) *
                    </label>
                    <input
                      type="number"
                      min={1}
                      required
                      value={planForm.durationValue}
                      onChange={(e) =>
                        setPlanForm({
                          ...planForm,
                          durationValue: Number(e.target.value),
                        })
                      }
                      className="w-full px-3 py-2 text-xs border border-[#E2E6ED] rounded-lg focus:outline-none focus:border-[#2F6FED] tabular-nums"
                    />
                  </div>
                )}
              </div>

              {/* Live Duration Preview */}
              <div className="p-3 bg-[#F5F7FA] border border-[#E2E6ED] rounded-lg text-xs flex items-center justify-between">
                <span className="text-[#6B7686]">Calculated Membership Duration:</span>
                <span className="font-bold text-[#2F6FED]">
                  {planForm.durationUnit === 'One-time'
                    ? 'One-time'
                    : planForm.durationValue === 1
                    ? `1 ${planForm.durationUnit.slice(0, -1)}`
                    : `${planForm.durationValue} ${planForm.durationUnit}`}
                </span>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddPlanModalOpen(false)}
                  className="px-3.5 py-1.5 border border-[#E2E6ED] rounded-lg text-xs font-medium text-[#1A2333] hover:bg-[#F5F7FA]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#2F6FED] hover:bg-[#2558bf] text-white rounded-lg text-xs font-medium shadow-sm"
                >
                  {editingPlan ? 'Update Fee Type' : 'Add Fee Type'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(SettingsPage);

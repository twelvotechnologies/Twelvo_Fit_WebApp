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
  Sliders,
  Check,
  Percent,
  CheckCircle2,
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
  getGymConfiguration,
  updateGymConfiguration,
  DEFAULT_GYM_CONFIG,
  CreateBankAccountInput,
  CreatePlanTypeInput,
} from '../../api/settingsApi';
import {
  PaymentTypeItem,
  BankAccountItem,
  PlanTypeItem,
  DurationUnit,
  GymConfigSettings,
} from '../../api/types';

type SettingsTab = 'CONFIGURATIONS' | 'PLAN_TYPES' | 'PAYMENT_TYPES' | 'BANKS' | 'EXPENSE_TYPES';

function SettingsPage() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<SettingsTab>('CONFIGURATIONS');
  const [loading, setLoading] = useState(true);

  // Section 0: System & GST Configurations State
  const [gymConfig, setGymConfig] = useState<GymConfigSettings>(DEFAULT_GYM_CONFIG);
  const [configSaving, setConfigSaving] = useState(false);
  const [configSuccessMsg, setConfigSuccessMsg] = useState('');

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
    hasGst: true,
    gstRate: 18,
  });

  // Initial Data Load
  const fetchAllSettings = async () => {
    try {
      setLoading(true);
      const [pt, bnk, plans, cfg] = await Promise.all([
        getPaymentTypes(),
        getBankAccounts(),
        getPlanTypes(),
        getGymConfiguration(),
      ]);
      setPaymentTypes(pt);
      setBanks(bnk);
      setPlanTypes(plans);
      if (cfg) {
        setGymConfig(cfg);
      }
    } catch (err) {
      console.error('Failed to load settings data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllSettings();
  }, []);

  // --- Gym Configurations Actions ---
  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setConfigSaving(true);
      setConfigSuccessMsg('');
      const updated = await updateGymConfiguration(gymConfig);
      setGymConfig(updated);
      setConfigSuccessMsg('Gym and GST configurations saved successfully!');
      setTimeout(() => setConfigSuccessMsg(''), 4000);
    } catch (err) {
      alert('Failed to save configuration settings');
    } finally {
      setConfigSaving(false);
    }
  };

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

    const hasGst = planForm.hasGst !== undefined ? planForm.hasGst : true;
    const gstRate = hasGst ? (planForm.gstRate !== undefined ? planForm.gstRate : (gymConfig.defaultGstRate || 18)) : 0;
    const standardFee = Number(planForm.standardFee) || 2500;
    const totalWithGst = hasGst ? standardFee + Math.round(standardFee * (gstRate / 100)) : standardFee;

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
                  standardFee,
                  hasGst,
                  gstRate,
                  totalWithGst,
                  displayDuration:
                    planForm.durationUnit === 'One-time'
                      ? 'One-time'
                      : `${planForm.durationValue} ${planForm.durationUnit}`,
                }
              : p
          )
        );
        await updatePlanType(editingPlan.id, {
          ...planForm,
          standardFee,
          hasGst,
          gstRate,
        });
      } else {
        const created = await addPlanType({
          ...planForm,
          standardFee,
          hasGst,
          gstRate,
        });
        setPlanTypes((prev) => [...prev, created]);
      }
      setIsAddPlanModalOpen(false);
      setEditingPlan(null);
      setPlanForm({
        name: '',
        category: 'Regular',
        durationValue: 1,
        durationUnit: 'Months',
        standardFee: 2500,
        hasGst: gymConfig.gstEnabled,
        gstRate: gymConfig.defaultGstRate || 18,
      });
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
            onClick={() => setActiveTab('CONFIGURATIONS')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === 'CONFIGURATIONS'
                ? 'bg-[#E8EFFE] text-[#2F6FED] font-semibold'
                : 'text-[#1A2333] hover:bg-[#F5F7FA]'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Sliders className="w-4 h-4 text-[#2F6FED]" strokeWidth={1.8} />
              <span>Configurations</span>
            </div>
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                gymConfig.gstEnabled
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-[#F5F7FA] text-[#6B7686]'
              }`}
            >
              {gymConfig.gstEnabled ? 'GST: ON' : 'GST: OFF'}
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
              {/* SECTION 0: CONFIGURATIONS */}
              {activeTab === 'CONFIGURATIONS' && (
                <div className="space-y-6 animate-fade-in">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E2E6ED]">
                    <div>
                      <h2 className="font-heading text-lg font-bold text-[#1A2333]">
                        Gym Configurations & GST Settings
                      </h2>
                      <p className="text-xs text-[#6B7686] mt-0.5">
                        Configure Goods & Services Tax (GST) rules, tax exemption, business identity, and receipt invoicing
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
                          gymConfig.gstEnabled
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-100 text-slate-700 border-slate-300'
                        }`}
                      >
                        <span
                          className={`w-2 h-2 rounded-full ${
                            gymConfig.gstEnabled ? 'bg-emerald-500' : 'bg-slate-400'
                          }`}
                        />
                        {gymConfig.gstEnabled ? 'GST Enabled' : 'Tax Exempt (No GST)'}
                      </span>
                    </div>
                  </div>

                  {configSuccessMsg && (
                    <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2.5 text-xs text-emerald-800 animate-fade-in">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <span className="font-medium">{configSuccessMsg}</span>
                    </div>
                  )}

                  <form onSubmit={handleSaveConfig} className="space-y-6">
                    {/* GST APPLICABILITY CARD */}
                    <div className="bg-[#F8FAFC] border border-[#E2E6ED] rounded-xl p-5 space-y-4">
                      <div>
                        <h3 className="text-sm font-bold text-[#1A2333] flex items-center gap-2">
                          <Percent className="w-4 h-4 text-[#2F6FED]" />
                          <span>Goods & Services Tax (GST) Policy</span>
                        </h3>
                        <p className="text-xs text-[#6B7686] mt-0.5">
                          Specify whether your gym charges GST on member subscriptions and fees
                        </p>
                      </div>

                      {/* GST Yes / No Segmented Selector */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        <button
                          type="button"
                          onClick={() => setGymConfig({ ...gymConfig, gstEnabled: true })}
                          className={`p-4 rounded-xl border-2 text-left transition-all ${
                            gymConfig.gstEnabled
                              ? 'border-[#2F6FED] bg-[#EEF4FF] shadow-xs'
                              : 'border-[#E2E6ED] bg-white hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-[#1A2333]">Yes (With GST)</span>
                            <div
                              className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                                gymConfig.gstEnabled
                                  ? 'border-[#2F6FED] bg-[#2F6FED]'
                                  : 'border-slate-300'
                              }`}
                            >
                              {gymConfig.gstEnabled && <Check className="w-3 h-3 text-white" />}
                            </div>
                          </div>
                          <p className="text-[11px] text-[#6B7686] mt-1.5 leading-snug">
                            Collect GST on fees and provide itemized tax invoices (CGST + SGST) for registered members.
                          </p>
                        </button>

                        <button
                          type="button"
                          onClick={() => setGymConfig({ ...gymConfig, gstEnabled: false })}
                          className={`p-4 rounded-xl border-2 text-left transition-all ${
                            !gymConfig.gstEnabled
                              ? 'border-[#2F6FED] bg-[#EEF4FF] shadow-xs'
                              : 'border-[#E2E6ED] bg-white hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-[#1A2333]">No (Without GST / Exempt)</span>
                            <div
                              className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                                !gymConfig.gstEnabled
                                  ? 'border-[#2F6FED] bg-[#2F6FED]'
                                  : 'border-slate-300'
                              }`}
                            >
                              {!gymConfig.gstEnabled && <Check className="w-3 h-3 text-white" />}
                            </div>
                          </div>
                          <p className="text-[11px] text-[#6B7686] mt-1.5 leading-snug">
                            Exempt from GST (e.g. non-registered turnover or composite scheme). All fees display 0% tax.
                          </p>
                        </button>
                      </div>

                      {/* GST Options (When GST is enabled) */}
                      {gymConfig.gstEnabled && (
                        <div className="pt-3 border-t border-[#E2E6ED] space-y-4 animate-fade-in">
                          {/* Rate selection */}
                          <div>
                            <label className="block text-xs font-semibold text-[#1A2333] mb-1.5">
                              Default GST Rate (%)
                            </label>
                            <div className="flex flex-wrap items-center gap-2">
                              {[18, 12, 5, 0].map((rate) => (
                                <button
                                  key={rate}
                                  type="button"
                                  onClick={() => setGymConfig({ ...gymConfig, defaultGstRate: rate })}
                                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                                    gymConfig.defaultGstRate === rate
                                      ? 'bg-[#2F6FED] text-white border-[#2F6FED]'
                                      : 'bg-white text-[#1A2333] border-[#E2E6ED] hover:bg-[#F5F7FA]'
                                  }`}
                                >
                                  {rate}% {rate === 18 && '(Standard Fitness)'}
                                </button>
                              ))}
                              <div className="flex items-center gap-1.5 ml-2">
                                <span className="text-xs text-[#6B7686]">Custom:</span>
                                <input
                                  type="number"
                                  min={0}
                                  max={100}
                                  value={gymConfig.defaultGstRate}
                                  onChange={(e) =>
                                    setGymConfig({
                                      ...gymConfig,
                                      defaultGstRate: Number(e.target.value),
                                    })
                                  }
                                  className="w-16 px-2 py-1 text-xs border border-[#E2E6ED] rounded-lg focus:outline-none focus:border-[#2F6FED] text-center font-bold"
                                />
                                <span className="text-xs text-[#6B7686]">%</span>
                              </div>
                            </div>
                          </div>

                          {/* Tax Calculation Mode: Exclusive vs Inclusive */}
                          <div>
                            <label className="block text-xs font-semibold text-[#1A2333] mb-1.5">
                              Tax Calculation Mode
                            </label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <label
                                className={`p-3 rounded-lg border cursor-pointer flex items-center justify-between text-xs transition-colors ${
                                  gymConfig.taxCalculationType === 'EXCLUSIVE'
                                    ? 'bg-white border-[#2F6FED] ring-1 ring-[#2F6FED]'
                                    : 'bg-white border-[#E2E6ED] hover:bg-[#F5F7FA]'
                                }`}
                              >
                                <div>
                                  <div className="font-bold text-[#1A2333]">Exclusive (Recommended)</div>
                                  <div className="text-[11px] text-[#6B7686]">
                                    Base Fee + GST added on top (e.g. ₹2,500 + 18% = ₹2,950 total)
                                  </div>
                                </div>
                                <input
                                  type="radio"
                                  name="taxMode"
                                  checked={gymConfig.taxCalculationType === 'EXCLUSIVE'}
                                  onChange={() =>
                                    setGymConfig({ ...gymConfig, taxCalculationType: 'EXCLUSIVE' })
                                  }
                                  className="text-[#2F6FED]"
                                />
                              </label>

                              <label
                                className={`p-3 rounded-lg border cursor-pointer flex items-center justify-between text-xs transition-colors ${
                                  gymConfig.taxCalculationType === 'INCLUSIVE'
                                    ? 'bg-white border-[#2F6FED] ring-1 ring-[#2F6FED]'
                                    : 'bg-white border-[#E2E6ED] hover:bg-[#F5F7FA]'
                                }`}
                              >
                                <div>
                                  <div className="font-bold text-[#1A2333]">Inclusive</div>
                                  <div className="text-[11px] text-[#6B7686]">
                                    Fee amount includes GST (e.g. ₹2,500 total, base is ₹2,119 + ₹381 tax)
                                  </div>
                                </div>
                                <input
                                  type="radio"
                                  name="taxMode"
                                  checked={gymConfig.taxCalculationType === 'INCLUSIVE'}
                                  onChange={() =>
                                    setGymConfig({ ...gymConfig, taxCalculationType: 'INCLUSIVE' })
                                  }
                                  className="text-[#2F6FED]"
                                />
                              </label>
                            </div>
                          </div>

                          {/* GSTIN and PAN Numbers */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                            <div>
                              <label className="block text-xs font-semibold text-[#1A2333] mb-1">
                                GSTIN (15-digit GST Identification Number)
                              </label>
                              <input
                                type="text"
                                placeholder="e.g. 27AABCP1234F1Z8"
                                maxLength={15}
                                value={gymConfig.gstin || ''}
                                onChange={(e) =>
                                  setGymConfig({ ...gymConfig, gstin: e.target.value.toUpperCase() })
                                }
                                className="w-full px-3 py-2 text-xs border border-[#E2E6ED] rounded-lg focus:outline-none focus:border-[#2F6FED] font-mono uppercase"
                              />
                              <p className="text-[11px] text-[#6B7686] mt-0.5">
                                Printed on official payment receipts, invoices, and WhatsApp shares.
                              </p>
                            </div>

                            <div>
                              <label className="block text-xs font-semibold text-[#1A2333] mb-1">
                                Permanent Account Number (PAN)
                              </label>
                              <input
                                type="text"
                                placeholder="e.g. AABCP1234F"
                                maxLength={10}
                                value={gymConfig.panNumber || ''}
                                onChange={(e) =>
                                  setGymConfig({
                                    ...gymConfig,
                                    panNumber: e.target.value.toUpperCase(),
                                  })
                                }
                                className="w-full px-3 py-2 text-xs border border-[#E2E6ED] rounded-lg focus:outline-none focus:border-[#2F6FED] font-mono uppercase"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* BUSINESS & INVOICING CARD */}
                    <div className="bg-[#F8FAFC] border border-[#E2E6ED] rounded-xl p-5 space-y-4">
                      <div>
                        <h3 className="text-sm font-bold text-[#1A2333] flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-[#2F6FED]" />
                          <span>Legal Entity & Receipt Particulars</span>
                        </h3>
                        <p className="text-xs text-[#6B7686] mt-0.5">
                          Information printed on official member tax invoices and WhatsApp receipts
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-[#1A2333] mb-1">
                            Legal / Business Entity Name
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Twelvo Gym & Fitness Pvt Ltd"
                            value={gymConfig.businessLegalName || ''}
                            onChange={(e) =>
                              setGymConfig({ ...gymConfig, businessLegalName: e.target.value })
                            }
                            className="w-full px-3 py-2 text-xs border border-[#E2E6ED] rounded-lg focus:outline-none focus:border-[#2F6FED]"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-[#1A2333] mb-1">
                            Receipt / Invoice Code Prefix
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. REC, INV, TW-"
                            maxLength={8}
                            value={gymConfig.invoicePrefix || ''}
                            onChange={(e) =>
                              setGymConfig({
                                ...gymConfig,
                                invoicePrefix: e.target.value.toUpperCase(),
                              })
                            }
                            className="w-full px-3 py-2 text-xs border border-[#E2E6ED] rounded-lg focus:outline-none focus:border-[#2F6FED] font-mono uppercase"
                          />
                        </div>
                      </div>
                    </div>

                    {/* LIVE GST CALCULATION SIMULATOR */}
                    <div className="p-4 bg-white border border-[#D5E3FF] rounded-xl space-y-3 shadow-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#1A2333] flex items-center gap-1.5">
                          <Sliders className="w-3.5 h-3.5 text-[#2F6FED]" />
                          Live Tax Calculation Preview (Sample ₹2,500 Fee)
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            gymConfig.gstEnabled
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}
                        >
                          {gymConfig.gstEnabled
                            ? `GST Active @ ${gymConfig.defaultGstRate || 18}% (${gymConfig.taxCalculationType})`
                            : 'GST Inactive (0% / Exempt)'}
                        </span>
                      </div>

                      {gymConfig.gstEnabled ? (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                          <div className="p-2.5 bg-[#F8FAFC] rounded-lg border border-[#E2E6ED]">
                            <span className="text-[11px] text-[#6B7686] block">Base Fee</span>
                            <span className="font-bold text-[#1A2333] tabular-nums">₹ 2,500</span>
                          </div>
                          <div className="p-2.5 bg-[#F8FAFC] rounded-lg border border-[#E2E6ED]">
                            <span className="text-[11px] text-[#6B7686] block">
                              CGST ({(gymConfig.defaultGstRate || 18) / 2}%)
                            </span>
                            <span className="font-bold text-[#1A2333] tabular-nums">
                              ₹ {Math.round(2500 * (((gymConfig.defaultGstRate || 18) / 2) / 100))}
                            </span>
                          </div>
                          <div className="p-2.5 bg-[#F8FAFC] rounded-lg border border-[#E2E6ED]">
                            <span className="text-[11px] text-[#6B7686] block">
                              SGST ({(gymConfig.defaultGstRate || 18) / 2}%)
                            </span>
                            <span className="font-bold text-[#1A2333] tabular-nums">
                              ₹ {Math.round(2500 * (((gymConfig.defaultGstRate || 18) / 2) / 100))}
                            </span>
                          </div>
                          <div className="p-2.5 bg-[#EEF4FF] rounded-lg border border-[#D5E3FF]">
                            <span className="text-[11px] text-[#2F6FED] font-semibold block">Total Payable</span>
                            <span className="font-extrabold text-[#2F6FED] tabular-nums text-sm">
                              ₹{' '}
                              {(
                                2500 +
                                Math.round(2500 * ((gymConfig.defaultGstRate || 18) / 100))
                              ).toLocaleString('en-IN')}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs flex items-center justify-between">
                          <span className="text-[#6B7686]">
                            GST is disabled globally. All plans and receipts will show:
                          </span>
                          <span className="font-bold text-[#1A2333]">
                            Base: ₹2,500 • GST: ₹0 (Exempt) • Net Total: ₹2,500
                          </span>
                        </div>
                      )}
                    </div>

                    {/* SAVE BUTTON */}
                    <div className="flex items-center justify-end gap-3 pt-2">
                      <button
                        type="submit"
                        disabled={configSaving}
                        className="flex items-center gap-2 px-5 py-2.5 bg-[#2F6FED] hover:bg-[#2558bf] text-white rounded-lg text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
                      >
                        {configSaving ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Saving Configurations...</span>
                          </>
                        ) : (
                          <>
                            <Check className="w-4 h-4" />
                            <span>Save Configurations</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              )}

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
                        Fee Types & Pricing
                      </h2>
                      <p className="text-xs text-[#6B7686] mt-0.5">
                        Configure membership fee structures, GST calculation rules (With/Without GST), and duration tiers
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        setEditingPlan(null);
                        setPlanForm({
                          name: '',
                          category: 'Regular',
                          durationValue: 1,
                          durationUnit: 'Months',
                          standardFee: 2500,
                          hasGst: gymConfig.gstEnabled,
                          gstRate: gymConfig.defaultGstRate || 18,
                        });
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
                          <th className="py-3 px-4">Base Fee</th>
                          <th className="py-3 px-4">GST Option</th>
                          <th className="py-3 px-4">Total Amount</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E2E6ED] text-xs">
                        {planTypes.map((plan) => {
                          const hasGst = plan.hasGst !== false;
                          const rate = hasGst ? (plan.gstRate !== undefined ? plan.gstRate : (gymConfig.defaultGstRate || 18)) : 0;
                          const baseFee = plan.standardFee || 0;
                          const total = plan.totalWithGst !== undefined
                            ? plan.totalWithGst
                            : hasGst
                            ? baseFee + Math.round(baseFee * (rate / 100))
                            : baseFee;

                          return (
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
                                ₹ {baseFee.toLocaleString('en-IN')}
                              </td>
                              <td className="py-3.5 px-4">
                                {hasGst ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                                    <Percent className="w-2.5 h-2.5" />
                                    With GST ({rate}%)
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                                    Without GST (Exempt)
                                  </span>
                                )}
                              </td>
                              <td className="py-3.5 px-4 font-bold text-[#1A2333] tabular-nums">
                                ₹ {total.toLocaleString('en-IN')}
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
                                        hasGst: plan.hasGst !== false,
                                        gstRate: plan.gstRate !== undefined ? plan.gstRate : (gymConfig.defaultGstRate || 18),
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
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="text-[11px] text-[#6B7686] italic">
                    Tip: Plans configured as "With GST" dynamically calculate CGST + SGST in new member registrations and fee receipts. Plans configured as "Without GST" remain tax exempt (₹0 tax).
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
          <div className="bg-white border border-[#E2E6ED] rounded-xl shadow-card w-full max-w-md overflow-hidden animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-[#E2E6ED] flex items-center justify-between sticky top-0 bg-white z-10">
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
              <div className="space-y-3">
                <div>
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

                <div className="grid grid-cols-2 gap-3">
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
                      Base Fee (₹) *
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
                      className="w-full px-3 py-2 text-xs border border-[#E2E6ED] rounded-lg focus:outline-none focus:border-[#2F6FED] tabular-nums font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* GST APPLICABILITY FOR THIS FEE */}
              <div className="p-3.5 bg-[#F8FAFC] border border-[#E2E6ED] rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-[#1A2333]">
                    GST Applicable *
                  </label>
                  <span className="text-[10px] text-[#6B7686]">
                    Global: {gymConfig.gstEnabled ? 'GST Enabled' : 'Tax Exempt'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setPlanForm({
                        ...planForm,
                        hasGst: true,
                        gstRate: planForm.gstRate || gymConfig.defaultGstRate || 18,
                      })
                    }
                    className={`py-2 px-3 text-xs font-semibold rounded-lg border text-center transition-all ${
                      planForm.hasGst !== false
                        ? 'bg-[#2F6FED] text-white border-[#2F6FED] shadow-xs'
                        : 'bg-white text-[#1A2333] border-[#E2E6ED] hover:bg-[#F5F7FA]'
                    }`}
                  >
                    With GST
                  </button>

                  <button
                    type="button"
                    onClick={() => setPlanForm({ ...planForm, hasGst: false, gstRate: 0 })}
                    className={`py-2 px-3 text-xs font-semibold rounded-lg border text-center transition-all ${
                      planForm.hasGst === false
                        ? 'bg-[#2F6FED] text-white border-[#2F6FED] shadow-xs'
                        : 'bg-white text-[#1A2333] border-[#E2E6ED] hover:bg-[#F5F7FA]'
                    }`}
                  >
                    Without GST (0%)
                  </button>
                </div>

                {/* If With GST is selected, allow choosing / entering GST Rate */}
                {planForm.hasGst !== false && (
                  <div className="pt-2 border-t border-[#E2E6ED] space-y-2">
                    <label className="block text-[11px] font-semibold text-[#6B7686]">
                      GST Rate for this Fee:
                    </label>
                    <div className="flex items-center gap-2">
                      {[18, 12, 5].map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setPlanForm({ ...planForm, gstRate: r })}
                          className={`px-2.5 py-1 text-xs font-medium rounded border transition-colors ${
                            (planForm.gstRate || 18) === r
                              ? 'bg-blue-50 text-[#2F6FED] border-[#2F6FED] font-bold'
                              : 'bg-white text-[#6B7686] border-[#E2E6ED] hover:bg-[#F5F7FA]'
                          }`}
                        >
                          {r}%
                        </button>
                      ))}
                      <div className="flex items-center gap-1 ml-auto">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={planForm.gstRate !== undefined ? planForm.gstRate : 18}
                          onChange={(e) =>
                            setPlanForm({ ...planForm, gstRate: Number(e.target.value) })
                          }
                          className="w-14 px-2 py-1 text-xs border border-[#E2E6ED] rounded text-center font-bold"
                        />
                        <span className="text-xs text-[#6B7686]">%</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* DURATION */}
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

              {/* LIVE FEE & GST BREAKDOWN PREVIEW */}
              {(() => {
                const base = Number(planForm.standardFee) || 0;
                const hasGst = planForm.hasGst !== false;
                const rate = hasGst
                  ? planForm.gstRate !== undefined
                    ? planForm.gstRate
                    : gymConfig.defaultGstRate || 18
                  : 0;
                const tax = hasGst ? Math.round(base * (rate / 100)) : 0;
                const total = base + tax;

                return (
                  <div className="p-3.5 bg-gradient-to-r from-blue-50/70 to-indigo-50/50 border border-blue-200/80 rounded-xl space-y-1.5 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Base Membership Fee:</span>
                      <span className="font-semibold tabular-nums">
                        ₹ {base.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>
                        GST {hasGst ? `@ ${rate}% (CGST + SGST)` : '(0% / Exempt)'}:
                      </span>
                      <span className="font-semibold tabular-nums">
                        {hasGst ? `₹ ${tax.toLocaleString('en-IN')}` : '₹ 0'}
                      </span>
                    </div>
                    <div className="flex justify-between font-bold text-[#1A2333] pt-1.5 border-t border-blue-200">
                      <span>Total Payable Amount:</span>
                      <span className="font-extrabold text-[#2F6FED] text-sm tabular-nums">
                        ₹ {total.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                );
              })()}

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

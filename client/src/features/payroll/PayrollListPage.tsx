import { useState, useMemo } from 'react';
import {
  CalendarCheck,
  TrendingDown,
  Coins,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  X,
  Sparkles,
  Calendar,
} from 'lucide-react';
import { useAuthStore } from '../../stores/useAuthStore';
import AttendanceTab from './components/AttendanceTab';
import AdvancesTab from './components/AdvancesTab';
import SalariesTab from './components/SalariesTab';

type TabKey = 'attendance' | 'advances' | 'salaries';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning';
  message: string;
}

export default function PayrollListPage() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<TabKey>('attendance');
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Toast notification dispatcher
  const notify = (type: 'success' | 'error' | 'warning', message: string) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Role Access Guard: trainers are restricted from the payroll management module
  const isTrainer = user?.role === 'trainer';
  const isGymOwner = user?.role === 'gym_owner' || user?.role === 'super_admin';

  const currentMonthName = useMemo(() => {
    return new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
  }, []);

  if (isTrainer) {
    return (
      <div className="max-w-3xl mx-auto py-16 px-4">
        <div className="bg-white border border-[#E2E6ED] rounded-3xl p-10 text-center shadow-lg space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto ring-8 ring-rose-50">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div>
            <h2 className="font-heading text-xl font-bold text-[#1A2333]">
              Payroll Access Restricted
            </h2>
            <p className="text-xs text-[#6B7686] mt-2 max-w-md mx-auto leading-relaxed">
              Attendance management, staff salary slips, and financial advance ledgers are restricted to Gym Owners and authorized accounting administrators.
            </p>
          </div>
          <div className="pt-2">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
              Active Role: Trainer
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-fadeIn">
      {/* Toast Notification Container */}
      <div className="fixed top-5 right-5 z-50 flex flex-col gap-2 pointer-events-none max-w-md w-full">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-2xl shadow-xl border text-xs font-medium animate-in slide-in-from-top-2 duration-200 ${
              toast.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : toast.type === 'error'
                ? 'bg-rose-50 border-rose-200 text-rose-900'
                : 'bg-amber-50 border-amber-200 text-amber-900'
            }`}
          >
            {toast.type === 'success' && (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
            )}
            {toast.type === 'error' && (
              <XCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
            )}
            {toast.type === 'warning' && (
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1 leading-relaxed">{toast.message}</div>
            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              className="text-[#6B7686] hover:text-[#1A2333] p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* Header & Title Context */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Staff Compensation & Shift Ledger
            </span>
            {isGymOwner && (
              <span className="text-[11px] text-slate-400 font-mono font-medium">
                [{user?.gymName || 'Gym'}]
              </span>
            )}
          </div>
          <h1 className="font-heading text-2xl font-bold text-[#1A2333] tracking-tight">
            Payroll & Staff Disbursements
          </h1>
          <p className="text-xs text-[#6B7686] mt-0.5">
            Daily checkbox shift attendance, staff advance loans with FIFO deductions, and monthly salary disbursement registers.
          </p>
        </div>

        {/* Current Cycle Chip */}
        <div className="flex items-center gap-2.5">
          <div className="px-4 py-2 bg-white border border-[#E2E6ED] rounded-xl text-xs text-[#6B7686] shadow-xs flex items-center gap-2.5">
            <Calendar className="w-3.5 h-3.5 text-[#2F6FED]" />
            <span>Active Cycle:</span>
            <span className="font-bold text-[#1A2333]">{currentMonthName}</span>
          </div>
        </div>
      </div>

      {/* Primary Tab Navigation */}
      <div className="bg-white border border-[#E2E6ED] rounded-2xl p-1.5 shadow-xs flex items-center gap-1.5 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('attendance')}
          className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'attendance'
              ? 'bg-[#2F6FED] text-white shadow-sm shadow-blue-500/20'
              : 'text-[#6B7686] hover:text-[#1A2333] hover:bg-[#F8FAFC]'
          }`}
        >
          <CalendarCheck className="w-4 h-4" />
          <span>Daily Checkbox Attendance</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('advances')}
          className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'advances'
              ? 'bg-[#2F6FED] text-white shadow-sm shadow-blue-500/20'
              : 'text-[#6B7686] hover:text-[#1A2333] hover:bg-[#F8FAFC]'
          }`}
        >
          <TrendingDown className="w-4 h-4" />
          <span>Advances & Loan Recovery</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('salaries')}
          className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'salaries'
              ? 'bg-[#2F6FED] text-white shadow-sm shadow-blue-500/20'
              : 'text-[#6B7686] hover:text-[#1A2333] hover:bg-[#F8FAFC]'
          }`}
        >
          <Coins className="w-4 h-4" />
          <span>Salaries & Payslips</span>
        </button>
      </div>

      {/* Tab Panels */}
      <div>
        {activeTab === 'attendance' && <AttendanceTab onNotify={notify} />}
        {activeTab === 'advances' && <AdvancesTab onNotify={notify} />}
        {activeTab === 'salaries' && <SalariesTab onNotify={notify} />}
      </div>
    </div>
  );
}

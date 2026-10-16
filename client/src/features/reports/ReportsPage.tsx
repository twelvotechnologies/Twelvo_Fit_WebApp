import { useState, useMemo, useEffect } from 'react';
import {
  BarChart3,
  TrendingDown,
  DollarSign,
  Users,
  Clock,
  Download,
  Printer,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { getReceipts, type ReceiptItem } from '../../api/receiptsApi';
import { getMembers, type MemberRecord } from '../../api/membersApi';
import { getExpenses } from '../../api/expensesApi';
import type { ExpenseItem } from '../../api/types';
import type {
  DateRangeOption,
  ReportTab,
  MonthlyPnLRow,
  CategoryBreakdownItem,
  PaymentModeBreakdownItem,
  PlanBreakdownItem,
  MemberAnalyticsSummary,
} from './types';
import { ProfitLossReportTab } from './tabs/ProfitLossReportTab';
import { ExpensesReportTab } from './tabs/ExpensesReportTab';
import { FeesReportTab } from './tabs/FeesReportTab';
import { MembersReportTab } from './tabs/MembersReportTab';
import { AttendanceReportTab } from './tabs/AttendanceReportTab';

const CATEGORY_COLORS = [
  '#EF4444',
  '#F59E0B',
  '#3B82F6',
  '#10B981',
  '#8B5CF6',
  '#EC4899',
  '#06B6D4',
  '#64748B',
  '#F97316',
  '#14B8A6',
];

const PAYMENT_MODE_COLORS: Record<string, string> = {
  UPI: '#8B5CF6',
  CASH: '#10B981',
  BANK: '#3B82F6',
  'Bank Transfer': '#3B82F6',
  CARD: '#F59E0B',
  Card: '#F59E0B',
  CHEQUE: '#64748B',
  Cash: '#10B981',
  OTHER: '#94A3B8',
};

const PLAN_COLORS = ['#2563EB', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#64748B'];

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<ReportTab>('pnl');
  const [dateRange, setDateRange] = useState<DateRangeOption>('30D');
  const [receipts, setReceipts] = useState<ReceiptItem[]>([]);
  const [members, setMembers] = useState<MemberRecord[]>([]);
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load live data from receipts, members, and expenses APIs
  const loadData = async () => {
    setIsLoading(true);
    try {
      const [loadedReceipts, loadedMembers, loadedExpenses] = await Promise.all([
        getReceipts(),
        getMembers(),
        getExpenses(),
      ]);
      setReceipts(loadedReceipts || []);
      setMembers(loadedMembers || []);
      setExpenses(loadedExpenses || []);
    } catch (err) {
      console.error('Error loading reports data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Compute cutoff date for the selected date range
  const dateRangeCutoff = useMemo(() => {
    const now = new Date();
    const cutoff = new Date();
    if (dateRange === 'TODAY') {
      cutoff.setHours(0, 0, 0, 0);
      return cutoff;
    }
    if (dateRange === '7D') {
      cutoff.setDate(now.getDate() - 7);
      return cutoff;
    }
    if (dateRange === '30D') {
      cutoff.setDate(now.getDate() - 30);
      return cutoff;
    }
    if (dateRange === '90D') {
      cutoff.setDate(now.getDate() - 90);
      return cutoff;
    }
    if (dateRange === 'YTD') {
      return new Date(now.getFullYear(), 0, 1);
    }
    if (dateRange === '1Y') {
      cutoff.setFullYear(now.getFullYear() - 1);
      return cutoff;
    }
    return new Date(0); // ALL
  }, [dateRange]);

  const dateRangeLabel = useMemo(() => {
    switch (dateRange) {
      case 'TODAY':
        return 'Today';
      case '7D':
        return 'Last 7 Days';
      case '30D':
        return 'Last 30 Days';
      case '90D':
        return 'Last 90 Days';
      case 'YTD':
        return 'Year to Date';
      case '1Y':
        return 'Last 1 Year';
      case 'ALL':
        return 'All Time';
    }
  }, [dateRange]);

  // Filtered receipts by date range
  const filteredReceipts = useMemo(() => {
    if (dateRange === 'ALL') return receipts;
    return receipts.filter((r) => {
      if (!r.paymentDate) return true;
      const d = new Date(r.paymentDate);
      return isNaN(d.getTime()) || d >= dateRangeCutoff;
    });
  }, [receipts, dateRangeCutoff, dateRange]);

  // Filtered expenses by date range
  const filteredExpenses = useMemo(() => {
    if (dateRange === 'ALL') return expenses;
    return expenses.filter((e) => {
      if (!e.expenseDate) return true;
      const d = new Date(e.expenseDate);
      return isNaN(d.getTime()) || d >= dateRangeCutoff;
    });
  }, [expenses, dateRangeCutoff, dateRange]);

  // Available unique membership plans
  const availablePlans = useMemo(() => {
    const planSet = new Set<string>();
    receipts.forEach((r) => {
      if (r.plan) planSet.add(r.plan);
    });
    members.forEach((m) => {
      if (m.planName) planSet.add(m.planName);
    });
    return Array.from(planSet).filter(Boolean);
  }, [receipts, members]);

  // Key KPI Aggregations
  const totalCollections = useMemo(() => {
    return filteredReceipts.reduce(
      (sum, r) => sum + (Number(r.total) || Number(r.amount) || 0),
      0
    );
  }, [filteredReceipts]);

  const totalExpenses = useMemo(() => {
    return filteredExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  }, [filteredExpenses]);

  const salaryExpensesTotal = useMemo(() => {
    return filteredExpenses
      .filter((e) => e.isSalaryExpense)
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  }, [filteredExpenses]);

  const operationalExpensesTotal = useMemo(() => {
    return filteredExpenses
      .filter((e) => !e.isSalaryExpense)
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  }, [filteredExpenses]);

  const netProfit = useMemo(() => totalCollections - totalExpenses, [totalCollections, totalExpenses]);

  const profitMarginPercent = useMemo(() => {
    if (totalCollections <= 0) return 0;
    return Math.round((netProfit / totalCollections) * 100);
  }, [netProfit, totalCollections]);

  // Expense Category Breakdown
  const categoryBreakdown: CategoryBreakdownItem[] = useMemo(() => {
    const map = new Map<string, { amount: number; count: number }>();
    filteredExpenses.forEach((e) => {
      const cat = e.expenseTypeName || 'Miscellaneous';
      const cur = map.get(cat) || { amount: 0, count: 0 };
      cur.amount += Number(e.amount || 0);
      cur.count += 1;
      map.set(cat, cur);
    });

    const entries = Array.from(map.entries()).sort((a, b) => b[1].amount - a[1].amount);
    return entries.map(([name, stat], idx) => ({
      name,
      amount: stat.amount,
      count: stat.count,
      percent: totalExpenses > 0 ? Math.round((stat.amount / totalExpenses) * 100) : 0,
      color: CATEGORY_COLORS[idx % CATEGORY_COLORS.length],
    }));
  }, [filteredExpenses, totalExpenses]);

  // Payment Mode Breakdown for Expenses
  const expensePaymentModes: PaymentModeBreakdownItem[] = useMemo(() => {
    const map = new Map<string, { amount: number; count: number }>();
    filteredExpenses.forEach((e) => {
      const mode = (e.paymentMode || 'CASH').toUpperCase();
      const cur = map.get(mode) || { amount: 0, count: 0 };
      cur.amount += Number(e.amount || 0);
      cur.count += 1;
      map.set(mode, cur);
    });

    return Array.from(map.entries())
      .map(([mode, stat]) => ({
        mode,
        amount: stat.amount,
        count: stat.count,
        percent: totalExpenses > 0 ? Math.round((stat.amount / totalExpenses) * 100) : 0,
        color: PAYMENT_MODE_COLORS[mode] || '#94A3B8',
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [filteredExpenses, totalExpenses]);

  // Payment Mode Breakdown for Receipts
  const receiptsPaymentModes: PaymentModeBreakdownItem[] = useMemo(() => {
    const map = new Map<string, { amount: number; count: number }>();
    filteredReceipts.forEach((r) => {
      const mode = r.paymentMode || 'UPI';
      const amt = Number(r.total) || Number(r.amount) || 0;
      const cur = map.get(mode) || { amount: 0, count: 0 };
      cur.amount += amt;
      cur.count += 1;
      map.set(mode, cur);
    });

    return Array.from(map.entries())
      .map(([mode, stat]) => ({
        mode,
        amount: stat.amount,
        count: stat.count,
        percent: totalCollections > 0 ? Math.round((stat.amount / totalCollections) * 100) : 0,
        color: PAYMENT_MODE_COLORS[mode] || '#64748B',
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [filteredReceipts, totalCollections]);

  // Plan Breakdown (Collections + Member Counts)
  const planBreakdown: PlanBreakdownItem[] = useMemo(() => {
    const collectionsMap: Record<string, number> = {};
    const countMap: Record<string, number> = {};

    filteredReceipts.forEach((r) => {
      const plan = r.plan || 'General Membership';
      const amt = Number(r.total) || Number(r.amount) || 0;
      collectionsMap[plan] = (collectionsMap[plan] || 0) + amt;
    });

    members.forEach((m) => {
      const plan = m.planName || 'General Membership';
      countMap[plan] = (countMap[plan] || 0) + 1;
    });

    const allPlans = Array.from(new Set([...Object.keys(collectionsMap), ...Object.keys(countMap)]));
    return allPlans
      .map((planName, idx) => {
        const collections = collectionsMap[planName] || 0;
        const memberCount = countMap[planName] || 0;
        return {
          planName,
          collections,
          memberCount,
          percent: totalCollections > 0 ? Math.round((collections / totalCollections) * 100) : 0,
          color: PLAN_COLORS[idx % PLAN_COLORS.length],
        };
      })
      .sort((a, b) => b.collections - a.collections);
  }, [filteredReceipts, members, totalCollections]);

  // Member Analytics Summary
  const memberSummary: MemberAnalyticsSummary = useMemo(() => {
    let active = 0;
    let expiringSoon = 0;
    let overdue = 0;
    let newRegistrations = 0;
    let estimatedOverdueDues = 0;

    const avgTicket = receipts.length > 0 ? totalCollections / receipts.length : 2500;

    members.forEach((m) => {
      const days = m.daysRemaining ?? 0;
      const isOverdue = days < 0 || m.paymentStatus === 'OVERDUE' || m.status === 'EXPIRED';
      const isExpiring = !isOverdue && days <= 7;

      if (isOverdue) {
        overdue += 1;
        estimatedOverdueDues += avgTicket;
      } else if (isExpiring) {
        expiringSoon += 1;
        active += 1;
      } else {
        active += 1;
      }

      // Check joining date within cutoff
      if (m.joiningDate) {
        const joinDate = new Date(m.joiningDate);
        if (!isNaN(joinDate.getTime()) && joinDate >= dateRangeCutoff) {
          newRegistrations += 1;
        }
      }
    });

    const total = members.length;
    const retentionRate = total > 0 ? Math.round(((total - overdue) / total) * 100) : 100;

    return {
      total,
      active,
      expiringSoon,
      overdue,
      newRegistrations,
      estimatedOverdueDues: Math.round(estimatedOverdueDues),
      retentionRate,
    };
  }, [members, receipts, totalCollections, dateRangeCutoff]);

  // Collection efficiency: Realized / (Realized + Outstanding)
  const collectionEfficiency = useMemo(() => {
    const totalPotential = totalCollections + memberSummary.estimatedOverdueDues;
    if (totalPotential <= 0) return 100;
    return Math.round((totalCollections / totalPotential) * 100);
  }, [totalCollections, memberSummary.estimatedOverdueDues]);

  // Monthly P&L Matrix Data (Past 6 calendar months)
  const monthlyPnLData: MonthlyPnLRow[] = useMemo(() => {
    const monthsMap = new Map<
      string,
      {
        invoicedRevenue: number;
        collections: number;
        operationalExpenses: number;
        payrollExpenses: number;
        newMembers: number;
      }
    >();

    // Seed past 6 months
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = d.toLocaleString('en-US', { month: 'short', year: 'numeric' });
      monthsMap.set(key, {
        invoicedRevenue: 0,
        collections: 0,
        operationalExpenses: 0,
        payrollExpenses: 0,
        newMembers: 0,
      });
    }

    // Receipts
    receipts.forEach((r) => {
      if (r.paymentDate) {
        const d = new Date(r.paymentDate);
        if (!isNaN(d.getTime())) {
          const key = d.toLocaleString('en-US', { month: 'short', year: 'numeric' });
          if (monthsMap.has(key)) {
            const cur = monthsMap.get(key)!;
            const amt = Number(r.total) || Number(r.amount) || 0;
            cur.collections += amt;
            cur.invoicedRevenue += amt;
          }
        }
      }
    });

    // Expenses
    expenses.forEach((e) => {
      if (e.expenseDate) {
        const d = new Date(e.expenseDate);
        if (!isNaN(d.getTime())) {
          const key = d.toLocaleString('en-US', { month: 'short', year: 'numeric' });
          if (monthsMap.has(key)) {
            const cur = monthsMap.get(key)!;
            const amt = Number(e.amount || 0);
            if (e.isSalaryExpense) {
              cur.payrollExpenses += amt;
            } else {
              cur.operationalExpenses += amt;
            }
          }
        }
      }
    });

    // Members
    members.forEach((m) => {
      if (m.joiningDate) {
        const d = new Date(m.joiningDate);
        if (!isNaN(d.getTime())) {
          const key = d.toLocaleString('en-US', { month: 'short', year: 'numeric' });
          if (monthsMap.has(key)) {
            monthsMap.get(key)!.newMembers += 1;
          }
        }
      }
    });

    return Array.from(monthsMap.entries()).map(([month, d]) => {
      const totalExpensesMonth = d.operationalExpenses + d.payrollExpenses;
      const netProfitMonth = d.collections - totalExpensesMonth;
      const marginPercent =
        d.collections > 0 ? Math.round((netProfitMonth / d.collections) * 100) : 0;

      return {
        month,
        invoicedRevenue: d.invoicedRevenue,
        collections: d.collections,
        operationalExpenses: d.operationalExpenses,
        payrollExpenses: d.payrollExpenses,
        totalExpenses: totalExpensesMonth,
        netProfit: netProfitMonth,
        marginPercent,
        newMembers: d.newMembers,
      };
    });
  }, [receipts, expenses, members]);

  // Dynamic CSV Export Handler
  const handleExportCSV = () => {
    let headers: string[] = [];
    let rows: (string | number)[][] = [];
    let filename = `GymERP_Report_${activeTab}_${dateRange}.csv`;

    if (activeTab === 'pnl') {
      filename = `GymERP_PnL_Statement_${dateRange}.csv`;
      headers = [
        'Month',
        'Collections (INR)',
        'Operating Bills (INR)',
        'Payroll (INR)',
        'Total Outflow (INR)',
        'Net Profit (INR)',
        'Margin %',
      ];
      rows = monthlyPnLData.map((r) => [
        `"${r.month}"`,
        r.collections,
        r.operationalExpenses,
        r.payrollExpenses,
        r.totalExpenses,
        r.netProfit,
        `${r.marginPercent}%`,
      ]);
    } else if (activeTab === 'expenses') {
      filename = `GymERP_Expense_Vouchers_${dateRange}.csv`;
      headers = [
        'Voucher Code',
        'Date',
        'Category',
        'Title',
        'Staff/Beneficiary',
        'Payment Mode',
        'Reference No',
        'Amount (INR)',
      ];
      rows = filteredExpenses.map((e) => [
        `"${e.expenseCode || e.id}"`,
        e.expenseDate || 'N/A',
        `"${e.expenseTypeName}"`,
        `"${e.title.replace(/"/g, '""')}"`,
        `"${(e.staffName || 'Vendor/Store').replace(/"/g, '""')}"`,
        e.paymentMode,
        `"${e.referenceNo || ''}"`,
        e.amount,
      ]);
    } else if (activeTab === 'fees') {
      filename = `GymERP_Fee_Receipts_${dateRange}.csv`;
      headers = [
        'Receipt Ref',
        'Date',
        'Member Name',
        'Phone',
        'Plan Tier',
        'Payment Mode',
        'Reference No',
        'Amount (INR)',
        'Status',
      ];
      rows = filteredReceipts.map((r) => [
        `"${r.receiptNo || r.id}"`,
        r.paymentDate || 'N/A',
        `"${(r.memberName || 'Member').replace(/"/g, '""')}"`,
        `"${r.memberPhone || ''}"`,
        `"${(r.plan || 'General').replace(/"/g, '""')}"`,
        r.paymentMode,
        `"${r.referenceNo || ''}"`,
        r.total || r.amount || 0,
        r.status || 'PAID',
      ]);
    } else if (activeTab === 'members') {
      filename = `GymERP_Members_Dues_${dateRange}.csv`;
      headers = [
        'Member Name',
        'Phone',
        'Plan Name',
        'Joining Date',
        'Next Due Date',
        'Days Left/Overdue',
        'Assigned Coach',
        'Payment Status',
      ];
      rows = members.map((m) => [
        `"${(m.name || '').replace(/"/g, '""')}"`,
        `"${m.phone || ''}"`,
        `"${(m.planName || 'General').replace(/"/g, '""')}"`,
        m.joiningDate || '',
        m.expiryDate || '',
        m.daysRemaining ?? 0,
        `"${(m.assignedTrainer || 'Unassigned').replace(/"/g, '""')}"`,
        m.paymentStatus || 'PAID_UP',
      ]);
    } else {
      filename = `GymERP_Attendance_${dateRange}.csv`;
      headers = ['Slot Time', 'Average Check-ins', 'Wave Period'];
      rows = [
        ['06:00 AM', 14, 'Morning'],
        ['07:00 AM', 32, 'Morning'],
        ['08:00 AM', 42, 'Morning'],
        ['09:00 AM', 26, 'Morning'],
        ['10:00 AM', 15, 'Daytime'],
        ['11:00 AM', 10, 'Daytime'],
        ['12:00 PM', 8, 'Daytime'],
        ['01:00 PM', 9, 'Daytime'],
        ['03:00 PM', 12, 'Daytime'],
        ['04:00 PM', 22, 'Evening'],
        ['05:00 PM', 38, 'Evening'],
        ['06:00 PM', 54, 'Evening'],
        ['07:00 PM', 62, 'Evening'],
        ['08:00 PM', 46, 'Evening'],
        ['09:00 PM', 20, 'Evening'],
      ];
    }

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[460px] text-slate-500 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <p className="text-sm font-medium">Aggregating gym financial & operational telemetry...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 animate-fadeIn">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold tracking-wider uppercase px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 flex items-center gap-1">
              <BarChart3 className="w-3 h-3" /> Enterprise Intelligence
            </span>
            <span className="text-[11px] text-slate-400 font-medium">Reconciled Live Telemetry</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 font-heading tracking-tight">
            Executive Reports & Financial Insights
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            P&L statement, operational expenses, fee collections, membership dues schedule, and capacity analytics
          </p>
        </div>

        {/* Global Date Range & Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Date Range Selector */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600">
            {(['7D', '30D', '90D', 'YTD', '1Y', 'ALL'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={`px-3 py-1 rounded-lg transition-all ${
                  dateRange === range
                    ? 'bg-white text-blue-600 shadow-xs'
                    : 'hover:text-slate-900'
                }`}
              >
                {range}
              </button>
            ))}
          </div>

          {/* Export CSV Button */}
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl shadow-xs transition-all"
            title="Download active report tab as CSV"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>

          {/* Print Button */}
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-all"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Print / PDF</span>
          </button>

          {/* Refresh Data */}
          <button
            onClick={loadData}
            className="p-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-slate-800 rounded-xl shadow-xs transition-all"
            title="Refresh reports data"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-200/80">
        <button
          onClick={() => setActiveTab('pnl')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'pnl'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <TrendingDown className="w-3.5 h-3.5" />
          Profit & Loss (P&L)
        </button>

        <button
          onClick={() => setActiveTab('expenses')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'expenses'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <TrendingDown className="w-3.5 h-3.5" />
          Expense Report
        </button>

        <button
          onClick={() => setActiveTab('fees')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'fees'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <DollarSign className="w-3.5 h-3.5" />
          Fees & Collections
        </button>

        <button
          onClick={() => setActiveTab('members')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'members'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          Members & Subscriptions
        </button>

        <button
          onClick={() => setActiveTab('attendance')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'attendance'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          Floor Footfall & Capacity
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === 'pnl' && (
        <ProfitLossReportTab
          dateRangeLabel={dateRangeLabel}
          totalCollections={totalCollections}
          totalExpenses={totalExpenses}
          operationalExpensesTotal={operationalExpensesTotal}
          salaryExpensesTotal={salaryExpensesTotal}
          netProfit={netProfit}
          profitMarginPercent={profitMarginPercent}
          monthlyPnLData={monthlyPnLData}
          activeMembersCount={memberSummary.active}
        />
      )}

      {activeTab === 'expenses' && (
        <ExpensesReportTab
          dateRangeLabel={dateRangeLabel}
          expenses={filteredExpenses}
          totalExpenses={totalExpenses}
          operationalExpensesTotal={operationalExpensesTotal}
          salaryExpensesTotal={salaryExpensesTotal}
          categoryBreakdown={categoryBreakdown}
          paymentModeBreakdown={expensePaymentModes}
        />
      )}

      {activeTab === 'fees' && (
        <FeesReportTab
          dateRangeLabel={dateRangeLabel}
          receipts={filteredReceipts}
          totalCollections={totalCollections}
          estimatedOutstandingDues={memberSummary.estimatedOverdueDues}
          collectionEfficiency={collectionEfficiency}
          paymentModeBreakdown={receiptsPaymentModes}
          planBreakdown={planBreakdown}
          availablePlans={availablePlans}
        />
      )}

      {activeTab === 'members' && (
        <MembersReportTab
          dateRangeLabel={dateRangeLabel}
          members={members}
          memberSummary={memberSummary}
          availablePlans={availablePlans}
        />
      )}

      {activeTab === 'attendance' && (
        <AttendanceReportTab activeMembersCount={memberSummary.active} />
      )}
    </div>
  );
}

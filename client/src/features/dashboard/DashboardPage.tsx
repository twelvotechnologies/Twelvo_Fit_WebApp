import { memo, useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import {
  ArrowUpRight,
  TrendingUp,
  CreditCard,
  Send,
  Calendar,
  Users,
  Building2,
  RefreshCw,
  WalletCards,
  CheckCircle2,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/useAuthStore';
import {
  getDashboardSummary,
  getFeesChartData,
  getPendingDues,
  getRecentPayrollActivity,
} from '../../api/dashboardApi';
import { DashboardSummary, MonthlyFeeData, PendingDueMember } from '../../api/types';
import { getMembers, MemberRecord } from '../../api/membersApi';

const formatINR = (val: number) => {
  return '₹ ' + (val || 0).toLocaleString('en-IN');
};

const PLAN_COLORS = ['#1A4CB0', '#2F6FED', '#5E93F5', '#9CBDFA', '#2E9E6D'];

const CustomChartTooltip = ({ active, payload, label, isCurrency = true }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white px-3 py-2 border border-[#E2E6ED] rounded-lg shadow-card text-xs text-[#1A2333]">
        <div className="font-semibold text-[#6B7686] mb-1.5 pb-1 border-b border-[#E2E6ED]">
          {label}
        </div>
        <div className="space-y-1">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 text-[#6B7686]">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: entry.color || entry.fill }}
                />
                {entry.name}:
              </span>
              <span className="font-semibold tabular-nums text-[#1A2333]">
                {isCurrency ? formatINR(entry.value) : entry.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

function DashboardPage() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<DashboardSummary>({
    totalMembers: 0,
    pendingFees: 0,
    feesGeneratedLastMonth: 0,
    feesCollectedLastMonth: 0,
    collectionRate: 100,
  });
  const [feesComparisonData, setFeesComparisonData] = useState<MonthlyFeeData[]>([]);
  const [pendingDuesList, setPendingDuesList] = useState<PendingDueMember[]>([]);
  const [payrollActivity, setPayrollActivity] = useState<any[]>([]);
  const [planDistribution, setPlanDistribution] = useState<any[]>([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [sum, chartData, dues, payroll, members] = await Promise.all([
        getDashboardSummary().catch(() => ({
          totalMembers: 0,
          pendingFees: 0,
          feesGeneratedLastMonth: 0,
          feesCollectedLastMonth: 0,
          collectionRate: 100,
        })),
        getFeesChartData().catch(() => []),
        getPendingDues().catch(() => []),
        getRecentPayrollActivity().catch(() => []),
        getMembers().catch(() => []),
      ]);

      setSummary(sum);
      setFeesComparisonData(chartData);
      setPendingDuesList(dues);
      setPayrollActivity(payroll || []);

      // Calculate dynamic plan distribution from real members
      const planCounts: Record<string, number> = {};
      members.forEach((m: MemberRecord) => {
        const planName = m.planName || 'General Fitness';
        planCounts[planName] = (planCounts[planName] || 0) + 1;
      });

      const totalM = members.length || 1;
      const plansArray = Object.entries(planCounts).map(([name, count], idx) => ({
        name,
        value: count,
        percentage: Math.round((count / totalM) * 100),
        color: PLAN_COLORS[idx % PLAN_COLORS.length],
      }));

      setPlanDistribution(
        plansArray.length > 0
          ? plansArray
          : [{ name: 'Standard Regular', value: 1, percentage: 100, color: '#2F6FED' }]
      );
    } catch (err) {
      console.warn('Dashboard telemetry fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const currentMonthName = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10 animate-fadeIn">
      {/* Top Header / Context Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 flex items-center gap-1">
              <Building2 className="w-3 h-3" /> {user?.gymName || 'Gym Workspace'}
            </span>
            <span className="text-[11px] text-slate-400 font-mono font-medium">
              [{user?.tenantCode || 'GYM'}]
            </span>
          </div>
          <h1 className="font-heading text-2xl font-bold text-[#1A2333] tracking-tight">
            Executive Dashboard
          </h1>
          <p className="text-xs text-[#6B7686] mt-0.5">
            Operational snapshot & fee collections for {currentMonthName}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-[#E2E6ED] rounded-lg text-xs text-[#6B7686]">
            <Calendar className="w-3.5 h-3.5 text-[#2F6FED]" />
            <span className="font-medium text-[#1A2333]">{currentMonthName}</span>
          </div>

          <button
            onClick={loadData}
            title="Refresh dashboard metrics"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-[#F5F7FA] border border-[#E2E6ED] rounded-lg text-xs font-medium text-[#1A2333] transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-600' : 'text-[#6B7686]'}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* TOP STAT ROW: 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Members */}
        <div className="bg-white border border-[#E2E6ED] rounded-xl p-5 shadow-subtle hover:border-[#CBD5E1] transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-[#6B7686]">
              Total Active Members
            </span>
            <span className="p-1.5 rounded-md bg-[#F5F7FA] text-[#6B7686]">
              <Users className="w-4 h-4 text-blue-600" strokeWidth={1.75} />
            </span>
          </div>
          <div className="mt-3">
            <span className="stat-number font-heading text-3xl font-bold text-[#1A2333] tabular-nums tracking-tight">
              {summary.totalMembers}
            </span>
          </div>
          <div className="mt-2.5 flex items-center gap-1.5 text-xs text-[#6B7686]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#2E9E6D]" />
            <span className="font-medium text-[#2E9E6D]">Active Roster</span>
            <span>in this facility</span>
          </div>
        </div>

        {/* Card 2: Pending Fees */}
        <div className="bg-white border border-[#E2E6ED] rounded-xl p-5 shadow-subtle hover:border-[#CBD5E1] transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-[#6B7686]">
              Pending Fees Due
            </span>
            <span className="p-1.5 rounded-md bg-[#F5F7FA] text-[#6B7686]">
              <CreditCard className="w-4 h-4 text-amber-600" strokeWidth={1.75} />
            </span>
          </div>
          <div className="mt-3">
            <span className="stat-number font-heading text-3xl font-bold text-[#1A2333] tabular-nums tracking-tight">
              {formatINR(summary.pendingFees)}
            </span>
          </div>
          <div className="mt-2.5 flex items-center gap-1.5 text-xs text-[#6B7686]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#D99A3E]" />
            <span className="font-medium text-[#D99A3E]">{pendingDuesList.length} members</span>
            <span>overdue / expiring</span>
          </div>
        </div>

        {/* Card 3: Fees Collected */}
        <div className="bg-white border border-[#E2E6ED] rounded-xl p-5 shadow-subtle hover:border-[#CBD5E1] transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-[#6B7686]">
              Fees Collected (This Month)
            </span>
            <span className="p-1.5 rounded-md bg-[#F5F7FA] text-[#6B7686]">
              <ArrowUpRight className="w-4 h-4 text-emerald-600" strokeWidth={1.75} />
            </span>
          </div>
          <div className="mt-3">
            <span className="stat-number font-heading text-3xl font-bold text-[#1A2333] tabular-nums tracking-tight">
              {formatINR(summary.feesCollectedLastMonth)}
            </span>
          </div>
          <div className="mt-2.5 flex items-center gap-1.5 text-xs text-[#6B7686]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#2E9E6D]" />
            <span className="font-medium text-[#2E9E6D]">Realized Revenue</span>
            <span>from paid receipts</span>
          </div>
        </div>

        {/* Card 4: Collection Rate (%) */}
        <div className="bg-white border border-[#E2E6ED] rounded-xl p-5 shadow-subtle hover:border-[#CBD5E1] transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-[#6B7686]">
              Collection Rate
            </span>
            <span className="p-1.5 rounded-md bg-[#F5F7FA] text-[#6B7686]">
              <TrendingUp className="w-4 h-4 text-[#2F6FED]" strokeWidth={1.75} />
            </span>
          </div>
          <div className="mt-3">
            <span className="stat-number font-heading text-3xl font-bold text-[#1A2333] tabular-nums tracking-tight">
              {summary.collectionRate}%
            </span>
          </div>
          <div className="mt-2.5 flex items-center gap-1.5 text-xs text-[#6B7686]">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                summary.collectionRate >= 80 ? 'bg-[#2E9E6D]' : 'bg-[#D99A3E]'
              }`}
            />
            <span
              className={`font-medium ${
                summary.collectionRate >= 80 ? 'text-[#2E9E6D]' : 'text-[#D99A3E]'
              }`}
            >
              Efficiency Ratio
            </span>
            <span>collected vs due</span>
          </div>
        </div>
      </div>

      {/* CHARTS ROW: Revenue Trend & Plan Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Monthly Fees Comparison */}
        <div className="lg:col-span-2 bg-white border border-[#E2E6ED] rounded-xl p-6 shadow-subtle flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-[#E2E6ED]">
              <div>
                <h2 className="font-heading text-base font-bold text-[#1A2333]">
                  Fees Invoiced vs Collected
                </h2>
                <p className="text-xs text-[#6B7686] mt-0.5">
                  Monthly fee generation against realized receipts over the past 6 months
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#E2E6ED]" />
                  <span className="text-[#6B7686]">Invoiced</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#2F6FED]" />
                  <span className="text-[#1A2333] font-medium">Collected</span>
                </span>
              </div>
            </div>

            <div className="h-64 w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={feesComparisonData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F4F9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6B7686' }} />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#6B7686' }}
                    tickFormatter={(val) => `₹${val > 999 ? (val / 1000).toFixed(0) + 'k' : val}`}
                  />
                  <Tooltip content={<CustomChartTooltip isCurrency={true} />} />
                  <Bar dataKey="generated" name="Invoiced" fill="#E2E6ED" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="collected" name="Collected" fill="#2F6FED" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="pt-3 border-t border-[#E2E6ED] flex items-center justify-between text-xs text-[#6B7686] mt-4">
            <span>6-Month Trend Overview</span>
            <Link to="/receipts" className="text-[#2F6FED] font-semibold hover:underline flex items-center gap-1">
              View Receipts Ledger
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Right Col: Plan Distribution */}
        <div className="bg-white border border-[#E2E6ED] rounded-xl p-6 shadow-subtle flex flex-col justify-between">
          <div>
            <div className="pb-4 border-b border-[#E2E6ED]">
              <h2 className="font-heading text-base font-bold text-[#1A2333]">
                Membership Tier Share
              </h2>
              <p className="text-xs text-[#6B7686] mt-0.5">
                Active roster distribution across subscription packages
              </p>
            </div>

            <div className="h-48 w-full flex items-center justify-center pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={planDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {planDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: number) => [`${val} Members`, 'Enrolled']}
                    contentStyle={{
                      backgroundColor: '#1E293B',
                      borderRadius: '8px',
                      color: '#FFF',
                      fontSize: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-2 pt-2 border-t border-[#E2E6ED]">
              {planDistribution.map((item) => (
                <div key={item.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 truncate">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="text-[#1A2333] font-medium truncate max-w-[140px]">{item.name}</span>
                  </div>
                  <span className="font-bold text-[#1A2333] tabular-nums">{item.percentage}%</span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-[#E2E6ED] flex items-center justify-between text-xs text-[#6B7686] mt-4">
            <Link to="/members" className="text-[#2F6FED] font-semibold hover:underline flex items-center gap-1">
              Manage Members
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* LOWER ROW: Pending Overdue Dues Table & Recent Payroll */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pending Dues Table (2 Columns wide) */}
        <div className="lg:col-span-2 bg-white border border-[#E2E6ED] rounded-xl p-6 shadow-subtle flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-[#E2E6ED]">
              <div>
                <h2 className="font-heading text-base font-bold text-[#1A2333]">
                  Overdue Accounts & Collections
                </h2>
                <p className="text-xs text-[#6B7686] mt-0.5">
                  Members with pending subscription fees requiring follow-up
                </p>
              </div>
              <Link
                to="/receipts"
                className="text-xs font-semibold text-[#2F6FED] hover:underline flex items-center gap-1"
              >
                View all in Receipts
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="overflow-x-auto mt-2">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#E2E6ED] text-[11px] font-semibold uppercase text-[#6B7686] tracking-wider">
                    <th className="py-2.5 px-2">Member</th>
                    <th className="py-2.5 px-2">Plan</th>
                    <th className="py-2.5 px-2 text-right">Estimated Due</th>
                    <th className="py-2.5 px-2">Overdue Status</th>
                    <th className="py-2.5 px-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E6ED] text-xs">
                  {pendingDuesList.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-slate-400">
                        <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-1.5" />
                        <p className="font-semibold text-slate-700 text-sm">All collections are up to date</p>
                        <p className="text-xs text-slate-400 mt-0.5">No members currently have overdue balances.</p>
                      </td>
                    </tr>
                  ) : (
                    pendingDuesList.slice(0, 5).map((m) => (
                      <tr key={m.id} className="hover:bg-[#F5F7FA] transition-colors">
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-[#E8EFFE] text-[#2F6FED] font-bold text-[11px] flex items-center justify-center flex-shrink-0">
                              {m.name.charAt(0)}
                            </div>
                            <div>
                              <div className="font-medium text-[#1A2333]">{m.name}</div>
                              <div className="text-[11px] text-[#6B7686]">{m.phone}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-2 text-[#6B7686]">{m.membershipPlan}</td>
                        <td className="py-3 px-2 text-right font-semibold tabular-nums text-[#1A2333]">
                          {formatINR(m.amountDue)}
                        </td>
                        <td className="py-3 px-2">
                          <span className="inline-flex items-center gap-1 font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full text-[10px]">
                            {m.daysOverdue > 0 ? `${m.daysOverdue}d overdue` : 'Expiring soon'}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-right">
                          <Link
                            to={`/receipts`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium border border-[#E2E6ED] hover:border-[#2F6FED] hover:text-[#2F6FED] rounded-md transition-colors text-[#1A2333] bg-white"
                          >
                            <Send className="w-2.5 h-2.5" />
                            Record Fee
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="pt-3 border-t border-[#E2E6ED] flex items-center justify-between text-xs text-[#6B7686] mt-4">
            <span>Showing {Math.min(5, pendingDuesList.length)} of {pendingDuesList.length} overdue</span>
            <span className="font-semibold tabular-nums text-[#1A2333]">
              Cumulative Overdue: {formatINR(summary.pendingFees)}
            </span>
          </div>
        </div>

        {/* Recent Payroll Activity Mini-List */}
        <div className="bg-white border border-[#E2E6ED] rounded-xl p-6 shadow-subtle flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-[#E2E6ED]">
              <div>
                <h2 className="font-heading text-base font-bold text-[#1A2333]">
                  Staff Payroll
                </h2>
                <p className="text-xs text-[#6B7686] mt-0.5">
                  Latest trainer payout statuses
                </p>
              </div>
              <Link
                to="/payroll"
                className="text-xs font-semibold text-[#2F6FED] hover:underline flex items-center gap-1"
              >
                Open Payroll
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="divide-y divide-[#E2E6ED] mt-2">
              {payrollActivity.length === 0 ? (
                <div className="py-10 text-center text-slate-400">
                  <WalletCards className="w-8 h-8 text-slate-300 mx-auto mb-1.5" />
                  <p className="font-medium text-slate-600 text-xs">No payroll activity recorded</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Salaries generated this cycle will display here.</p>
                </div>
              ) : (
                payrollActivity.slice(0, 5).map((p) => (
                  <div key={p.id} className="py-3 flex items-center justify-between">
                    <div>
                      <div className="font-medium text-xs text-[#1A2333]">{p.trainer}</div>
                      <div className="text-[11px] text-[#6B7686]">{p.role}</div>
                    </div>

                    <div className="text-right">
                      <div className="text-xs font-semibold tabular-nums text-[#1A2333]">
                        {formatINR(p.amount)}
                      </div>
                      <div className="flex items-center justify-end gap-1.5 mt-0.5">
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: p.statusColor || '#2E9E6D' }}
                        />
                        <span className="text-[11px] font-medium text-slate-700">
                          {p.status}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-[#E2E6ED] flex items-center justify-between text-xs text-[#6B7686] mt-4">
            <span>Cycle: {currentMonthName}</span>
            <Link to="/payroll" className="text-[#2F6FED] font-medium hover:underline">
              Review Staff
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(DashboardPage);

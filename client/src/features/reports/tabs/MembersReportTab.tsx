import React, { useState, useMemo } from 'react';
import {
  Users,
  UserCheck,
  Clock,
  AlertTriangle,
  UserPlus,
  Search,
  FileText,
  ShieldAlert,
  Layers,
} from 'lucide-react';
import type { MemberRecord } from '../../../api/membersApi';
import type { MemberAnalyticsSummary } from '../types';

interface MembersReportTabProps {
  dateRangeLabel: string;
  members: MemberRecord[];
  memberSummary: MemberAnalyticsSummary;
  availablePlans: string[];
}

export const MembersReportTab: React.FC<MembersReportTabProps> = ({
  dateRangeLabel,
  members,
  memberSummary,
  availablePlans,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'EXPIRING' | 'OVERDUE'>('ALL');
  const [selectedPlan, setSelectedPlan] = useState<string>('ALL');

  // Filter members for roster table
  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      // Plan filter
      if (selectedPlan !== 'ALL' && (!m.planName || !m.planName.toLowerCase().includes(selectedPlan.toLowerCase()))) {
        return false;
      }

      // Status filter
      if (statusFilter !== 'ALL') {
        const isExpiring = m.status === 'EXPIRING' || (m.daysRemaining >= 0 && m.daysRemaining <= 7);
        const isOverdue = m.status === 'EXPIRED' || m.daysRemaining < 0 || m.paymentStatus === 'OVERDUE';
        const isActive = (m.status === 'ACTIVE' || !m.status) && !isExpiring && !isOverdue;

        if (statusFilter === 'ACTIVE' && !isActive) return false;
        if (statusFilter === 'EXPIRING' && !isExpiring) return false;
        if (statusFilter === 'OVERDUE' && !isOverdue) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = m.name?.toLowerCase().includes(q);
        const matchesPhone = m.phone?.toLowerCase().includes(q);
        const matchesTrainer = m.assignedTrainer?.toLowerCase().includes(q);
        const matchesPlan = m.planName?.toLowerCase().includes(q);
        if (!matchesName && !matchesPhone && !matchesTrainer && !matchesPlan) return false;
      }

      return true;
    }).sort((a, b) => (a.daysRemaining || 0) - (b.daysRemaining || 0));
  }, [members, statusFilter, selectedPlan, searchQuery]);

  // Plan distribution counts
  const planDistributionData = useMemo(() => {
    const counts: Record<string, number> = {};
    members.forEach((m) => {
      const plan = m.planName || 'General Membership';
      counts[plan] = (counts[plan] || 0) + 1;
    });

    const total = members.length || 1;
    return Object.entries(counts)
      .map(([name, count]) => ({
        name,
        count,
        percent: Math.round((count / total) * 100),
      }))
      .sort((a, b) => b.count - a.count);
  }, [members]);

  // Trainer Allocation Breakdown
  const trainerAllocationData = useMemo(() => {
    const counts: Record<string, number> = {};
    members.forEach((m) => {
      const trainer = m.assignedTrainer || 'Unassigned / Floor';
      counts[trainer] = (counts[trainer] || 0) + 1;
    });

    const total = members.length || 1;
    return Object.entries(counts)
      .map(([name, count]) => ({
        name,
        count,
        percent: Math.round((count / total) * 100),
      }))
      .sort((a, b) => b.count - a.count);
  }, [members]);

  // Status Summary Rows
  const statusSummaryRows = useMemo(() => {
    const total = memberSummary.total || 1;
    return [
      {
        status: 'Active (Paid Up)',
        description: 'Dues settled and active membership',
        count: memberSummary.active,
        percent: Math.round((memberSummary.active / total) * 100),
        badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
      },
      {
        status: 'Expiring Soon (<= 7d)',
        description: 'Renewal due within next 7 days',
        count: memberSummary.expiringSoon,
        percent: Math.round((memberSummary.expiringSoon / total) * 100),
        badgeClass: 'bg-amber-50 text-amber-700 border-amber-200/60',
      },
      {
        status: 'Overdue Dues',
        description: 'Expired or overdue renewal subscription',
        count: memberSummary.overdue,
        percent: Math.round((memberSummary.overdue / total) * 100),
        badgeClass: 'bg-red-50 text-red-700 border-red-200/60',
      },
    ];
  }, [memberSummary]);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Hero KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* Total Members */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium mb-1.5">
            <span>Total Enrolled</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 font-heading">
            {memberSummary.total}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 font-medium">All registered members</div>
        </div>

        {/* Active Members */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium mb-1.5">
            <span>Active (Paid Up)</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <UserCheck className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-700 font-heading">
            {memberSummary.active}
          </div>
          <div className="text-[11px] text-emerald-700 mt-1 font-semibold">
            {memberSummary.retentionRate}% healthy rate
          </div>
        </div>

        {/* Expiring Soon */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium mb-1.5">
            <span>Due Soon (7d)</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-amber-600 font-heading">
            {memberSummary.expiringSoon}
          </div>
          <div className="text-[11px] text-amber-700 mt-1 font-medium">Renewals due shortly</div>
        </div>

        {/* Overdue / Expired */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium mb-1.5">
            <span>Overdue Dues</span>
            <div className="w-7 h-7 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
              <AlertTriangle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-red-600 font-heading">
            {memberSummary.overdue}
          </div>
          <div className="text-[11px] text-red-600 mt-1 font-medium">Actionable churn risk</div>
        </div>

        {/* New Enrollments */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium mb-1.5">
            <span>New ({dateRangeLabel})</span>
            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <UserPlus className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-indigo-700 font-heading">
            {memberSummary.newRegistrations}
          </div>
          <div className="text-[11px] text-indigo-600 mt-1 font-medium">Joined in period</div>
        </div>
      </div>

      {/* Structured Summary Tables: Status Breakdown & Plan Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Member Status & Retention Table */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 font-heading">
                Member Retention & Status
              </h3>
              <p className="text-xs text-slate-500">
                Active subscribers vs approaching due dates vs overdue accounts
              </p>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg">
              {memberSummary.total} Total
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Membership Status</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4 text-center">Members</th>
                  <th className="py-3 px-4 text-right">Share %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {statusSummaryRows.map((row) => (
                  <tr key={row.status} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${row.badgeClass}`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-[11px]">
                      {row.description}
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-slate-900 font-mono">
                      {row.count}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-slate-600">
                      {row.percent}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Plan Distribution Table */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900 font-heading">
                  Membership Plan Enrollment
                </h3>
              </div>
              <p className="text-xs text-slate-500">
                Member count enrolled under each active tier
              </p>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg">
              {planDistributionData.length} Tiers
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Membership Plan</th>
                  <th className="py-3 px-4 text-center">Enrolled</th>
                  <th className="py-3 px-4 text-right">Share %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {planDistributionData.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-slate-400">
                      No plan subscriptions found.
                    </td>
                  </tr>
                ) : (
                  planDistributionData.map((item) => (
                    <tr key={item.name} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {item.name}
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-slate-900 font-mono">
                        {item.count}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-slate-600">
                        {item.percent}%
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Coach / Trainer Allocation Roster */}
      {trainerAllocationData.length > 0 && (
        <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 font-heading">
                Coach & Trainer Member Allocation
              </h3>
              <p className="text-xs text-slate-500">
                Distribution of enrolled members across personal trainers and floor staff
              </p>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 bg-slate-100 text-slate-600 rounded">
              {trainerAllocationData.length} Coaches
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            {trainerAllocationData.map((t) => (
              <div
                key={t.name}
                className="p-3 bg-slate-50 border border-slate-200/60 rounded-xl flex items-center gap-3 min-w-[180px]"
              >
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-xs text-slate-900">{t.name}</div>
                  <div className="text-[11px] text-slate-500">
                    <span className="font-bold text-blue-600 font-mono">{t.count}</span> members ({t.percent}%)
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Comprehensive Member Roster & Dues Schedule Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden space-y-3">
        {/* Table Filters Bar */}
        <div className="p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900 font-heading">
              Member Roster & Subscription Dues Schedule
            </h3>
            <p className="text-xs text-slate-500">
              Audit log of member renewal dates, days remaining, overdue tracking, and assigned coaches
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search member, phone, coach..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 w-52"
              />
            </div>

            {/* Plan Select */}
            <select
              value={selectedPlan}
              onChange={(e) => setSelectedPlan(e.target.value)}
              className="text-xs font-medium px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">All Membership Tiers</option>
              {availablePlans.map((plan) => (
                <option key={plan} value={plan}>
                  {plan}
                </option>
              ))}
            </select>

            {/* Status Filter Buttons */}
            <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs font-semibold">
              <button
                onClick={() => setStatusFilter('ALL')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  statusFilter === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                All ({members.length})
              </button>
              <button
                onClick={() => setStatusFilter('ACTIVE')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  statusFilter === 'ACTIVE' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                Active
              </button>
              <button
                onClick={() => setStatusFilter('EXPIRING')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  statusFilter === 'EXPIRING' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                Due Soon
              </button>
              <button
                onClick={() => setStatusFilter('OVERDUE')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  statusFilter === 'OVERDUE' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                Overdue
              </button>
            </div>
          </div>
        </div>

        {/* Member Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Member Name</th>
                <th className="py-3 px-4">Phone / Contact</th>
                <th className="py-3 px-4">Plan Tier</th>
                <th className="py-3 px-4">Joining Date</th>
                <th className="py-3 px-4">Next Due Date</th>
                <th className="py-3 px-4">Days Left / Overdue</th>
                <th className="py-3 px-4">Assigned Coach</th>
                <th className="py-3 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <FileText className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-slate-700 text-sm">No members match criteria</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Adjust your search or status filters to view member records.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredMembers.map((m) => {
                  const days = m.daysRemaining ?? 0;
                  const isOverdue = days < 0 || m.paymentStatus === 'OVERDUE' || m.status === 'EXPIRED';
                  const isExpiring = !isOverdue && days <= 7;

                  return (
                    <tr key={m.id || m.memberId} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {m.name}
                      </td>
                      <td className="py-3 px-4 text-slate-500 font-mono">
                        {m.phone || '-'}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium text-[11px]">
                          {m.planName || 'General Membership'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                        {m.joiningDate || '-'}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap font-medium">
                        <span className={isOverdue ? 'text-red-600 font-bold' : isExpiring ? 'text-amber-600 font-bold' : 'text-slate-700'}>
                          {m.expiryDate || 'N/A'}
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {isOverdue ? (
                          <span className="inline-flex items-center gap-1 text-red-700 bg-red-50 px-2 py-0.5 rounded text-[11px] font-bold">
                            <ShieldAlert className="w-3 h-3" />
                            {Math.abs(days)} days overdue
                          </span>
                        ) : isExpiring ? (
                          <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 px-2 py-0.5 rounded text-[11px] font-semibold">
                            <Clock className="w-3 h-3" />
                            {days} days left
                          </span>
                        ) : (
                          <span className="text-emerald-700 font-medium text-[11px]">
                            {days} days remaining
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {m.assignedTrainer || 'Unassigned'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isOverdue
                              ? 'bg-red-50 text-red-700 border border-red-200/60'
                              : isExpiring
                              ? 'bg-amber-50 text-amber-700 border border-amber-200/60'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                          }`}
                        >
                          {isOverdue ? 'OVERDUE' : isExpiring ? 'DUE SOON' : 'ACTIVE'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

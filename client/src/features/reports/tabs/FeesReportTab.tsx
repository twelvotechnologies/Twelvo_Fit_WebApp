import React, { useState, useMemo } from 'react';
import {
  DollarSign,
  CreditCard,
  Search,
  FileText,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  ArrowUpRight,
  Layers,
} from 'lucide-react';
import type { ReceiptItem } from '../../../api/receiptsApi';
import type { PaymentModeBreakdownItem, PlanBreakdownItem } from '../types';

interface FeesReportTabProps {
  dateRangeLabel: string;
  receipts: ReceiptItem[];
  totalCollections: number;
  estimatedOutstandingDues: number;
  collectionEfficiency: number;
  paymentModeBreakdown: PaymentModeBreakdownItem[];
  planBreakdown: PlanBreakdownItem[];
  availablePlans: string[];
}

const formatINR = (val: number) => '₹ ' + Math.round(val).toLocaleString('en-IN');

export const FeesReportTab: React.FC<FeesReportTabProps> = ({
  dateRangeLabel,
  receipts,
  totalCollections,
  estimatedOutstandingDues,
  collectionEfficiency,
  paymentModeBreakdown,
  planBreakdown,
  availablePlans,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<string>('ALL');
  const [selectedMode, setSelectedMode] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PAID' | 'PENDING'>('ALL');

  const filteredReceipts = useMemo(() => {
    return receipts.filter((r) => {
      // Plan filter
      if (selectedPlan !== 'ALL' && (!r.plan || !r.plan.toLowerCase().includes(selectedPlan.toLowerCase()))) {
        return false;
      }

      // Mode filter
      if (selectedMode !== 'ALL' && r.paymentMode !== selectedMode) {
        return false;
      }

      // Status filter
      if (statusFilter !== 'ALL') {
        const isPending = r.approvalStatus === 'pending_approval' || r.status === 'PENDING';
        if (statusFilter === 'PAID' && isPending) return false;
        if (statusFilter === 'PENDING' && !isPending) return false;
      }

      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = r.memberName?.toLowerCase().includes(q);
        const matchesCode = r.receiptNo?.toLowerCase().includes(q) || r.id?.toLowerCase().includes(q);
        const matchesPhone = r.memberPhone?.toLowerCase().includes(q);
        const matchesRef = r.referenceNo?.toLowerCase().includes(q);
        if (!matchesName && !matchesCode && !matchesPhone && !matchesRef) return false;
      }

      return true;
    }).sort((a, b) => new Date(b.paymentDate || 0).getTime() - new Date(a.paymentDate || 0).getTime());
  }, [receipts, selectedPlan, selectedMode, statusFilter, searchQuery]);

  const filteredTotal = useMemo(() => {
    return filteredReceipts.reduce((s, r) => s + (Number(r.total) || Number(r.amount) || 0), 0);
  }, [filteredReceipts]);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Hero KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Realized Collections */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium mb-2">
            <span>Realized Fees ({dateRangeLabel})</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 font-heading tabular-nums">
            {formatINR(totalCollections)}
          </div>
          <div className="flex items-center gap-1.5 mt-2.5 text-xs text-emerald-700 font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{receipts.length} successful receipts</span>
          </div>
        </div>

        {/* Estimated Outstanding Dues */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium mb-2">
            <span>Outstanding / Overdue Dues</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 font-heading tabular-nums">
            {formatINR(estimatedOutstandingDues)}
          </div>
          <div className="flex items-center gap-1.5 mt-2.5 text-xs text-amber-700 font-semibold">
            <span>Actionable uncollected dues</span>
          </div>
        </div>

        {/* Collection Efficiency */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium mb-2">
            <span>Collection Efficiency</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 font-heading tabular-nums">
            {collectionEfficiency}%
          </div>
          <div className="flex items-center gap-1.5 mt-2.5 text-xs text-blue-700 font-semibold">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>Ratio of realized vs total billed</span>
          </div>
        </div>

        {/* Average Fee Ticket */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium mb-2">
            <span>Average Subscription Ticket</span>
            <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 font-heading tabular-nums">
            {formatINR(receipts.length > 0 ? totalCollections / receipts.length : 0)}
          </div>
          <div className="flex items-center gap-1.5 mt-2.5 text-xs text-slate-500 font-medium">
            <span>Per fee receipt</span>
          </div>
        </div>
      </div>

      {/* Structured Summary Tables: Collections by Mode & Collections by Plan */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Collections by Payment Method Table */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 font-heading">
                Collections by Payment Method
              </h3>
              <p className="text-xs text-slate-500">
                Inflow channels (UPI, Cash, Cards, Direct Bank Transfers)
              </p>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg">
              {paymentModeBreakdown.length} Channels
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Payment Channel</th>
                  <th className="py-3 px-4 text-center">Receipts</th>
                  <th className="py-3 px-4 text-right">Collected (INR)</th>
                  <th className="py-3 px-4 text-right">Share %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {paymentModeBreakdown.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-400">
                      No payment data available.
                    </td>
                  </tr>
                ) : (
                  paymentModeBreakdown.map((item) => (
                    <tr key={item.mode} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: item.color }}
                          />
                          <span>{item.mode}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center text-slate-500 font-mono">
                        {item.count}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900 tabular-nums">
                        {formatINR(item.amount)}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-slate-600">
                        {item.percent}%
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {paymentModeBreakdown.length > 0 && (
                <tfoot>
                  <tr className="bg-slate-50/90 border-t-2 border-slate-200 font-bold text-xs">
                    <td className="py-3 px-4 text-slate-900">Total Collections</td>
                    <td className="py-3 px-4 text-center text-slate-700">
                      {receipts.length}
                    </td>
                    <td className="py-3 px-4 text-right text-emerald-700 tabular-nums">
                      {formatINR(totalCollections)}
                    </td>
                    <td className="py-3 px-4 text-right">100%</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        {/* Right: Collections by Membership Plan Tier Table */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900 font-heading">
                  Collections by Membership Tier
                </h3>
              </div>
              <p className="text-xs text-slate-500">
                Revenue contribution across active membership packages
              </p>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg">
              {planBreakdown.length} Plan Tiers
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Membership Plan</th>
                  <th className="py-3 px-4 text-center">Subscribers</th>
                  <th className="py-3 px-4 text-right">Total Inflow (INR)</th>
                  <th className="py-3 px-4 text-right">Share %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {planBreakdown.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-400">
                      No subscription plan data available.
                    </td>
                  </tr>
                ) : (
                  planBreakdown.map((item) => (
                    <tr key={item.planName} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: item.color }}
                          />
                          <span>{item.planName}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center text-slate-500 font-mono">
                        {item.memberCount}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900 tabular-nums">
                        {formatINR(item.collections)}
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

      {/* Comprehensive Fee Transactions Register Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden space-y-3">
        {/* Table Filters Bar */}
        <div className="p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900 font-heading">
              Fee Receipts & Transactions Register
            </h3>
            <p className="text-xs text-slate-500">
              Detailed transaction records of member payments, invoices, and settlement modes
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search member, receipt..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 w-44"
              />
            </div>

            {/* Plan Filter */}
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

            {/* Payment Mode */}
            <select
              value={selectedMode}
              onChange={(e) => setSelectedMode(e.target.value)}
              className="text-xs font-medium px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">All Payment Modes</option>
              <option value="UPI">UPI</option>
              <option value="Cash">Cash</option>
              <option value="Card">Card</option>
              <option value="Bank Transfer">Bank Transfer</option>
            </select>

            {/* Status Filter */}
            <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs font-semibold">
              <button
                onClick={() => setStatusFilter('ALL')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  statusFilter === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setStatusFilter('PAID')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  statusFilter === 'PAID' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                Approved
              </button>
              <button
                onClick={() => setStatusFilter('PENDING')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  statusFilter === 'PENDING' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                Pending
              </button>
            </div>
          </div>
        </div>

        {/* Register Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Receipt Ref</th>
                <th className="py-3 px-4">Payment Date</th>
                <th className="py-3 px-4">Member Name</th>
                <th className="py-3 px-4">Membership Plan</th>
                <th className="py-3 px-4">Payment Mode</th>
                <th className="py-3 px-4">Txn Ref</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredReceipts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <FileText className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-slate-700 text-sm">No transaction receipts found</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Adjust your filters or date range to view fee records.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredReceipts.map((tx) => (
                  <tr key={tx.id || tx.receiptNo} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-blue-600">
                      {tx.receiptNo || tx.id}
                    </td>
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                      {tx.paymentDate || 'N/A'}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{tx.memberName}</div>
                      {tx.memberPhone && (
                        <div className="text-[11px] text-slate-400 font-mono">{tx.memberPhone}</div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium text-[11px]">
                        {tx.plan || 'General Membership'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-medium whitespace-nowrap">
                      {tx.paymentMode || 'Cash'}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                      {tx.referenceNo || '-'}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900 tabular-nums">
                      {formatINR(Number(tx.total) || Number(tx.amount) || 0)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          tx.approvalStatus === 'approved' || tx.status === 'PAID'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                            : tx.approvalStatus === 'pending_approval' || tx.status === 'PENDING'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200/60'
                            : 'bg-red-50 text-red-700 border border-red-200/60'
                        }`}
                      >
                        {tx.approvalStatus === 'pending_approval' ? 'Pending' : (tx.status || 'PAID')}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {filteredReceipts.length > 0 && (
              <tfoot>
                <tr className="bg-slate-50/90 border-t-2 border-slate-200 font-bold text-xs">
                  <td colSpan={6} className="py-3 px-4 text-slate-700">
                    Filtered Collections Total ({filteredReceipts.length} receipts)
                  </td>
                  <td className="py-3 px-4 text-right text-emerald-700 font-heading text-sm tabular-nums">
                    {formatINR(filteredTotal)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
};

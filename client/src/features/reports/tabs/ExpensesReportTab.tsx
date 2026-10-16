import React, { useState, useMemo } from 'react';
import {
  TrendingDown,
  Receipt,
  Users,
  Search,
  FileText,
  DollarSign,
  Building,
  CreditCard,
} from 'lucide-react';
import type { ExpenseItem } from '../../../api/types';
import type { CategoryBreakdownItem, PaymentModeBreakdownItem } from '../types';

interface ExpensesReportTabProps {
  dateRangeLabel: string;
  expenses: ExpenseItem[];
  totalExpenses: number;
  operationalExpensesTotal: number;
  salaryExpensesTotal: number;
  categoryBreakdown: CategoryBreakdownItem[];
  paymentModeBreakdown: PaymentModeBreakdownItem[];
}

const formatINR = (val: number) => '₹ ' + Math.round(val).toLocaleString('en-IN');

export const ExpensesReportTab: React.FC<ExpensesReportTabProps> = ({
  dateRangeLabel,
  expenses,
  totalExpenses,
  operationalExpensesTotal,
  salaryExpensesTotal,
  categoryBreakdown,
  paymentModeBreakdown,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedMode, setSelectedMode] = useState<string>('ALL');
  const [sourceFilter, setSourceFilter] = useState<'ALL' | 'OPERATIONAL' | 'SALARY'>('ALL');

  // Filtered expense vouchers for the ledger
  const filteredVouchers = useMemo(() => {
    return expenses.filter((e) => {
      // Source filter
      if (sourceFilter === 'OPERATIONAL' && e.isSalaryExpense) return false;
      if (sourceFilter === 'SALARY' && !e.isSalaryExpense) return false;

      // Category filter
      if (selectedCategory !== 'ALL' && e.expenseTypeName !== selectedCategory) return false;

      // Mode filter
      if (selectedMode !== 'ALL' && e.paymentMode !== selectedMode) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = e.title?.toLowerCase().includes(q);
        const matchesCode = e.expenseCode?.toLowerCase().includes(q) || e.id?.toLowerCase().includes(q);
        const matchesStaff = e.staffName?.toLowerCase().includes(q);
        const matchesRef = e.referenceNo?.toLowerCase().includes(q);
        const matchesNotes = e.notes?.toLowerCase().includes(q);
        if (!matchesTitle && !matchesCode && !matchesStaff && !matchesRef && !matchesNotes) return false;
      }

      return true;
    }).sort((a, b) => new Date(b.expenseDate || 0).getTime() - new Date(a.expenseDate || 0).getTime());
  }, [expenses, sourceFilter, selectedCategory, selectedMode, searchQuery]);

  const filteredTotal = useMemo(() => {
    return filteredVouchers.reduce((s, v) => s + Number(v.amount || 0), 0);
  }, [filteredVouchers]);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Outflow */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium mb-2">
            <span>Total Outflow ({dateRangeLabel})</span>
            <div className="w-8 h-8 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 font-heading tabular-nums">
            {formatINR(totalExpenses)}
          </div>
          <div className="flex items-center gap-1.5 mt-2.5 text-xs text-slate-500 font-medium">
            <Receipt className="w-3.5 h-3.5 text-red-500" />
            <span>{expenses.length} expense vouchers logged</span>
          </div>
        </div>

        {/* Operational Expenses */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium mb-2">
            <span>Operational & Facility Bills</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Building className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 font-heading tabular-nums">
            {formatINR(operationalExpensesTotal)}
          </div>
          <div className="flex items-center gap-1.5 mt-2.5 text-xs text-amber-700 font-semibold">
            <span>{totalExpenses > 0 ? Math.round((operationalExpensesTotal / totalExpenses) * 100) : 0}% of total outflow</span>
          </div>
        </div>

        {/* Staff Salaries */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium mb-2">
            <span>Staff & Trainer Payroll</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 font-heading tabular-nums">
            {formatINR(salaryExpensesTotal)}
          </div>
          <div className="flex items-center gap-1.5 mt-2.5 text-xs text-blue-700 font-semibold">
            <span>{totalExpenses > 0 ? Math.round((salaryExpensesTotal / totalExpenses) * 100) : 0}% of total outflow</span>
          </div>
        </div>

        {/* Average Voucher Size */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium mb-2">
            <span>Average Expense Size</span>
            <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 font-heading tabular-nums">
            {formatINR(expenses.length > 0 ? totalExpenses / expenses.length : 0)}
          </div>
          <div className="flex items-center gap-1.5 mt-2.5 text-xs text-slate-500 font-medium">
            <span>Across all vouchers</span>
          </div>
        </div>
      </div>

      {/* Structured Summary Tables: Category Breakdown & Payment Modes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Category Breakdown Table */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 font-heading">
                Expenditure by Category
              </h3>
              <p className="text-xs text-slate-500">
                Detailed cost allocation across rent, utilities, maintenance, wages, and operations
              </p>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 bg-red-50 text-red-700 rounded-lg">
              {categoryBreakdown.length} Categories
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Expense Category</th>
                  <th className="py-3 px-4 text-center">Vouchers</th>
                  <th className="py-3 px-4 text-right">Amount (INR)</th>
                  <th className="py-3 px-4 text-right">Share %</th>
                  <th className="py-3 px-4 w-36">Distribution</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {categoryBreakdown.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      No expenses recorded for this period.
                    </td>
                  </tr>
                ) : (
                  categoryBreakdown.map((item) => (
                    <tr key={item.name} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: item.color }}
                          />
                          <span>{item.name}</span>
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
                      <td className="py-3 px-4">
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${item.percent}%`,
                              backgroundColor: item.color,
                            }}
                          />
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Col: Outflow by Payment Mode Table */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col justify-between">
          <div>
            <div className="p-5 border-b border-slate-100">
              <div className="flex items-center gap-2 mb-1">
                <CreditCard className="w-4 h-4 text-slate-600" />
                <h3 className="text-base font-bold text-slate-900 font-heading">
                  Disbursements by Payment Mode
                </h3>
              </div>
              <p className="text-xs text-slate-500">
                Payment channels used for settlements
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Channel</th>
                    <th className="py-3 px-3 text-center">Items</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                    <th className="py-3 px-4 text-right">Share</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {paymentModeBreakdown.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-400">
                        No payment data.
                      </td>
                    </tr>
                  ) : (
                    paymentModeBreakdown.map((item) => (
                      <tr key={item.mode} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4 font-semibold text-slate-800">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-2.5 h-2.5 rounded-full"
                              style={{ backgroundColor: item.color }}
                            />
                            <span>{item.mode}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center text-slate-500 font-mono">
                          {item.count}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-slate-900 tabular-nums">
                          {formatINR(item.amount)}
                        </td>
                        <td className="py-3 px-4 text-right text-slate-500 font-medium">
                          {item.percent}%
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="p-4 bg-slate-50/80 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
            <span>Total Outflow Settled:</span>
            <span className="font-bold text-slate-900 font-heading tabular-nums">{formatINR(totalExpenses)}</span>
          </div>
        </div>
      </div>

      {/* Comprehensive Filterable Expense Ledger Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden space-y-3">
        {/* Table Filters Bar */}
        <div className="p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900 font-heading">
              Detailed Expense Voucher Register
            </h3>
            <p className="text-xs text-slate-500">
              Audit trail of all recorded expenditures, facility bills, and payroll payouts
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search voucher, title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 w-44"
              />
            </div>

            {/* Source Filter */}
            <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs font-semibold">
              <button
                onClick={() => setSourceFilter('ALL')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  sourceFilter === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setSourceFilter('OPERATIONAL')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  sourceFilter === 'OPERATIONAL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                Bills
              </button>
              <button
                onClick={() => setSourceFilter('SALARY')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  sourceFilter === 'SALARY' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                Salaries
              </button>
            </div>

            {/* Category Select */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="text-xs font-medium px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">All Categories</option>
              {categoryBreakdown.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>

            {/* Payment Mode Select */}
            <select
              value={selectedMode}
              onChange={(e) => setSelectedMode(e.target.value)}
              className="text-xs font-medium px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">All Modes</option>
              <option value="CASH">Cash</option>
              <option value="UPI">UPI</option>
              <option value="BANK">Bank</option>
              <option value="CHEQUE">Cheque</option>
              <option value="CARD">Card</option>
            </select>
          </div>
        </div>

        {/* Ledger Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Voucher #</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Expense Title / Notes</th>
                <th className="py-3 px-4">Beneficiary / Staff</th>
                <th className="py-3 px-4">Payment Mode</th>
                <th className="py-3 px-4">Ref #</th>
                <th className="py-3 px-4 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredVouchers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <FileText className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-slate-700 text-sm">No expense vouchers match criteria</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Adjust your filters or date range to view logged expenses.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredVouchers.map((exp) => (
                  <tr key={exp.id || exp.expenseId} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-red-600">
                      {exp.expenseCode || `EXP-${exp.id}`}
                    </td>
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                      {exp.expenseDate || 'N/A'}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium text-[11px] whitespace-nowrap">
                        {exp.expenseTypeName}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900 truncate max-w-xs">{exp.title}</div>
                      {exp.notes && (
                        <div className="text-[11px] text-slate-400 truncate max-w-xs">{exp.notes}</div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      {exp.staffName ? (
                        <span className="inline-flex items-center gap-1 text-blue-700 font-semibold bg-blue-50 px-2 py-0.5 rounded">
                          <Users className="w-3 h-3" /> {exp.staffName}
                        </span>
                      ) : (
                        <span className="text-slate-400">Vendor / Store</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-600 whitespace-nowrap font-medium">
                      {exp.paymentMode}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                      {exp.referenceNo || '-'}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900 tabular-nums">
                      {formatINR(Number(exp.amount) || 0)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {filteredVouchers.length > 0 && (
              <tfoot>
                <tr className="bg-slate-50/90 border-t-2 border-slate-200 font-bold text-xs">
                  <td colSpan={7} className="py-3 px-4 text-slate-700">
                    Filtered Total ({filteredVouchers.length} vouchers)
                  </td>
                  <td className="py-3 px-4 text-right text-red-600 font-heading text-sm tabular-nums">
                    {formatINR(filteredTotal)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
};

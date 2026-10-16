import React from 'react';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Percent,
  CheckCircle2,
  FileSpreadsheet,
  Receipt,
  Users,
} from 'lucide-react';
import type { MonthlyPnLRow } from '../types';

interface ProfitLossReportTabProps {
  dateRangeLabel: string;
  totalCollections: number;
  totalExpenses: number;
  operationalExpensesTotal: number;
  salaryExpensesTotal: number;
  netProfit: number;
  profitMarginPercent: number;
  monthlyPnLData: MonthlyPnLRow[];
  activeMembersCount: number;
}

const formatINR = (val: number) => '₹ ' + Math.round(val).toLocaleString('en-IN');

export const ProfitLossReportTab: React.FC<ProfitLossReportTabProps> = ({
  dateRangeLabel,
  totalCollections,
  totalExpenses,
  operationalExpensesTotal,
  salaryExpensesTotal,
  netProfit,
  profitMarginPercent,
  monthlyPnLData,
  activeMembersCount,
}) => {
  const isProfitable = netProfit >= 0;
  const costToIncomeRatio = totalCollections > 0 ? Math.min(100, Math.round((totalExpenses / totalCollections) * 100)) : 0;
  const avgMonthlyNet = monthlyPnLData.length > 0
    ? Math.round(monthlyPnLData.reduce((s, r) => s + r.netProfit, 0) / monthlyPnLData.length)
    : netProfit;

  // Monthly table totals
  const totalInflowAll = monthlyPnLData.reduce((s, r) => s + r.collections, 0);
  const totalBillsAll = monthlyPnLData.reduce((s, r) => s + r.operationalExpenses, 0);
  const totalPayrollAll = monthlyPnLData.reduce((s, r) => s + r.payrollExpenses, 0);
  const totalOutflowAll = monthlyPnLData.reduce((s, r) => s + r.totalExpenses, 0);
  const totalNetAll = monthlyPnLData.reduce((s, r) => s + r.netProfit, 0);
  const overallMarginAll = totalInflowAll > 0 ? Math.round((totalNetAll / totalInflowAll) * 100) : 0;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Inflow / Collections */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium mb-2">
            <span>Gross Inflow ({dateRangeLabel})</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 font-heading tabular-nums">
            {formatINR(totalCollections)}
          </div>
          <div className="flex items-center gap-1.5 mt-2.5 text-xs text-emerald-700 font-semibold">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Realized Membership Collections</span>
          </div>
        </div>

        {/* Total Expenditure */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium mb-2">
            <span>Total Outflow ({dateRangeLabel})</span>
            <div className="w-8 h-8 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 font-heading tabular-nums">
            {formatINR(totalExpenses)}
          </div>
          <div className="flex items-center justify-between mt-2.5 text-[11px] text-slate-500 font-medium">
            <span>Salaries: {formatINR(salaryExpensesTotal)}</span>
            <span>Bills: {formatINR(operationalExpensesTotal)}</span>
          </div>
        </div>

        {/* Net Profit / Operating Surplus */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium mb-2">
            <span>Net Operating Margin</span>
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                isProfitable ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
              }`}
            >
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div
            className={`text-2xl font-bold font-heading tabular-nums ${
              isProfitable ? 'text-emerald-700' : 'text-red-600'
            }`}
          >
            {formatINR(netProfit)}
          </div>
          <div className="flex items-center gap-2 mt-2.5">
            <span
              className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${
                isProfitable
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-red-100 text-red-800'
              }`}
            >
              {isProfitable ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {profitMarginPercent}% Net Margin
            </span>
          </div>
        </div>

        {/* Cost to Income & Health */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium mb-2">
            <span>Operating Efficiency</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 font-heading tabular-nums">
            {costToIncomeRatio}%
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium mt-2.5">
            <span>Cost-to-Income</span>
            <span className="text-blue-600 font-semibold">{activeMembersCount} paid members</span>
          </div>
        </div>
      </div>

      {/* Grid: Statement of Profit & Loss & Monthly Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Monthly Financial Matrix Table */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h3 className="text-base font-bold text-slate-900 font-heading">
                Monthly Profit & Loss Ledger Matrix
              </h3>
              <p className="text-xs text-slate-500">
                Detailed month-by-month financial summary with margin percentages
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 rounded-lg text-slate-700">
              Avg Net: {formatINR(avgMonthlyNet)}/mo
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Period</th>
                  <th className="py-3 px-4 text-right">Collections</th>
                  <th className="py-3 px-4 text-right">Operating Bills</th>
                  <th className="py-3 px-4 text-right">Payroll</th>
                  <th className="py-3 px-4 text-right">Total Outflow</th>
                  <th className="py-3 px-4 text-right">Net Profit</th>
                  <th className="py-3 px-4 text-right">Margin %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {monthlyPnLData.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      No financial data available for this range.
                    </td>
                  </tr>
                ) : (
                  monthlyPnLData.map((row) => {
                    const isRowProfit = row.netProfit >= 0;
                    return (
                      <tr key={row.month} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4 font-semibold text-slate-900">{row.month}</td>
                        <td className="py-3 px-4 text-right font-medium text-emerald-700 tabular-nums">
                          {formatINR(row.collections)}
                        </td>
                        <td className="py-3 px-4 text-right text-slate-600 tabular-nums">
                          {formatINR(row.operationalExpenses)}
                        </td>
                        <td className="py-3 px-4 text-right text-slate-600 tabular-nums">
                          {formatINR(row.payrollExpenses)}
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-red-600 tabular-nums">
                          {formatINR(row.totalExpenses)}
                        </td>
                        <td
                          className={`py-3 px-4 text-right font-bold tabular-nums ${
                            isRowProfit ? 'text-emerald-700' : 'text-red-600'
                          }`}
                        >
                          {formatINR(row.netProfit)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                              isRowProfit
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-red-50 text-red-700'
                            }`}
                          >
                            {row.marginPercent}%
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              {monthlyPnLData.length > 0 && (
                <tfoot>
                  <tr className="bg-slate-50/90 border-t-2 border-slate-200 font-bold text-xs">
                    <td className="py-3 px-4 text-slate-900">Summary Total</td>
                    <td className="py-3 px-4 text-right text-emerald-700 tabular-nums">
                      {formatINR(totalInflowAll)}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-700 tabular-nums">
                      {formatINR(totalBillsAll)}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-700 tabular-nums">
                      {formatINR(totalPayrollAll)}
                    </td>
                    <td className="py-3 px-4 text-right text-red-600 tabular-nums">
                      {formatINR(totalOutflowAll)}
                    </td>
                    <td
                      className={`py-3 px-4 text-right tabular-nums ${
                        totalNetAll >= 0 ? 'text-emerald-700' : 'text-red-600'
                      }`}
                    >
                      {formatINR(totalNetAll)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                          totalNetAll >= 0
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {overallMarginAll}%
                      </span>
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        {/* Right Col: High Level Executive P&L Statement */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <FileSpreadsheet className="w-4 h-4 text-blue-600" />
              <h3 className="text-base font-bold text-slate-900 font-heading">
                Statement of Profit & Loss
              </h3>
            </div>
            <p className="text-xs text-slate-500">
              Aggregated accounting format for executive reviews ({dateRangeLabel})
            </p>
          </div>

          <div className="space-y-3 pt-2 text-xs">
            {/* Operating Revenue */}
            <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100 space-y-1.5">
              <div className="flex items-center justify-between font-bold text-emerald-900">
                <span className="flex items-center gap-1.5">
                  <Receipt className="w-3.5 h-3.5 text-emerald-600" /> OPERATING INFLOW (REVENUE)
                </span>
                <span className="tabular-nums">{formatINR(totalCollections)}</span>
              </div>
              <div className="flex items-center justify-between text-slate-600 text-[11px] pl-5">
                <span>Membership Fees & Renewals</span>
                <span className="tabular-nums font-medium">{formatINR(totalCollections)}</span>
              </div>
            </div>

            {/* Operating Expenses */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60 space-y-2">
              <div className="flex items-center justify-between font-bold text-slate-900">
                <span className="flex items-center gap-1.5">
                  <TrendingDown className="w-3.5 h-3.5 text-red-600" /> OPERATING EXPENDITURES
                </span>
                <span className="text-red-600 tabular-nums">{formatINR(totalExpenses)}</span>
              </div>

              <div className="flex items-center justify-between text-slate-600 text-[11px] pl-5 border-l-2 border-slate-200 ml-1">
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3 text-blue-600" /> Staff & Trainer Payroll
                </span>
                <span className="font-semibold text-slate-800 tabular-nums">
                  {formatINR(salaryExpensesTotal)}
                </span>
              </div>

              <div className="flex items-center justify-between text-slate-600 text-[11px] pl-5 border-l-2 border-slate-200 ml-1">
                <span>Facility Bills & Upkeep</span>
                <span className="font-semibold text-slate-800 tabular-nums">
                  {formatINR(operationalExpensesTotal)}
                </span>
              </div>
            </div>

            {/* Net EBITDA / Surplus */}
            <div
              className={`p-4 rounded-xl border space-y-2 ${
                isProfitable
                  ? 'bg-emerald-50 border-emerald-200/80 text-emerald-900'
                  : 'bg-red-50 border-red-200/80 text-red-900'
              }`}
            >
              <div className="flex items-center justify-between font-bold text-sm">
                <span>NET OPERATING PROFIT</span>
                <span className="tabular-nums font-heading text-base font-extrabold">
                  {formatINR(netProfit)}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] font-medium border-t border-current/20 pt-1.5">
                <span>Net Margin Percentage</span>
                <span className="font-bold">{profitMarginPercent}%</span>
              </div>
            </div>
          </div>

          <div className="pt-2 text-[11px] text-slate-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Figures reconciled with Cash, Bank & UPI transaction ledgers.</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export type DateRangeOption = 'TODAY' | '7D' | '30D' | '90D' | 'YTD' | '1Y' | 'ALL';

export type ReportTab = 'pnl' | 'expenses' | 'fees' | 'members' | 'attendance';

export interface MonthlyPnLRow {
  month: string;
  invoicedRevenue: number;
  collections: number;
  operationalExpenses: number;
  payrollExpenses: number;
  totalExpenses: number;
  netProfit: number;
  marginPercent: number;
  newMembers: number;
}

export interface CategoryBreakdownItem {
  name: string;
  amount: number;
  count: number;
  percent: number;
  color: string;
}

export interface PaymentModeBreakdownItem {
  mode: string;
  amount: number;
  count: number;
  percent: number;
  color: string;
}

export interface PlanBreakdownItem {
  planName: string;
  collections: number;
  memberCount: number;
  percent: number;
  color: string;
}

export interface MemberAnalyticsSummary {
  total: number;
  active: number;
  expiringSoon: number;
  overdue: number;
  newRegistrations: number;
  estimatedOverdueDues: number;
  retentionRate: number;
}

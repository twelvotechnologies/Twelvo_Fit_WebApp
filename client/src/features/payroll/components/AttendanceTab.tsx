import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Clock,
  CalendarCheck,
  XCircle,
  Save,
  Lock,
  RotateCcw,
  Check,
  Search,
  Users,
  Sun,
  Sparkles,
  CheckSquare,
  AlertCircle,
  CalendarDays,
  Table as TableIcon,
} from 'lucide-react';
import {
  getDailyAttendance,
  saveDailyAttendance,
  getMonthlyAttendance,
  AttendanceStatus,
  DailyAttendanceStaffItem,
  MonthlyAttendanceResponse,
} from '../../../api/payrollApi';

interface AttendanceTabProps {
  onNotify: (type: 'success' | 'error' | 'warning', message: string) => void;
}

type AttendanceType = 'FULL_DAY' | 'HALF_DAY' | 'PAID_LEAVE' | 'ABSENT';

interface ColumnConfig {
  key: AttendanceType;
  label: string;
  weight: string;
  color: string;
  activeBg: string;
  activeBorder: string;
  ringColor: string;
  icon: React.ComponentType<{ className?: string }>;
  badgeClass: string;
}

const ATTENDANCE_COLUMNS: ColumnConfig[] = [
  {
    key: 'FULL_DAY',
    label: 'Full Day',
    weight: '1.0d',
    color: 'text-emerald-700',
    activeBg: 'bg-emerald-600',
    activeBorder: 'border-emerald-600',
    ringColor: 'ring-emerald-200',
    icon: Sun,
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  },
  {
    key: 'HALF_DAY',
    label: 'Half Day',
    weight: '0.5d',
    color: 'text-amber-700',
    activeBg: 'bg-amber-500',
    activeBorder: 'border-amber-500',
    ringColor: 'ring-amber-200',
    icon: Clock,
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
  },
  {
    key: 'PAID_LEAVE',
    label: 'Paid Leave',
    weight: '1.0d',
    color: 'text-blue-700',
    activeBg: 'bg-blue-600',
    activeBorder: 'border-blue-600',
    ringColor: 'ring-blue-200',
    icon: CalendarCheck,
    badgeClass: 'bg-blue-100 text-blue-800 border-blue-200',
  },
  {
    key: 'ABSENT',
    label: 'Absent',
    weight: '0.0d',
    color: 'text-rose-700',
    activeBg: 'bg-rose-600',
    activeBorder: 'border-rose-600',
    ringColor: 'ring-rose-200',
    icon: XCircle,
    badgeClass: 'bg-rose-100 text-rose-800 border-rose-200',
  },
];

export default function AttendanceTab({ onNotify }: AttendanceTabProps) {
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [viewMode, setViewMode] = useState<'daily' | 'monthly'>('daily');

  // Daily View States
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [dailyStaff, setDailyStaff] = useState<DailyAttendanceStaffItem[]>([]);
  const [localStatuses, setLocalStatuses] = useState<Record<string, { status: AttendanceStatus; note: string }>>({});
  const [isMonthLocked, setIsMonthLocked] = useState(false);
  const [loadingDaily, setLoadingDaily] = useState(false);
  const [savingDaily, setSavingDaily] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Monthly View States
  const [selectedMonth, setSelectedMonth] = useState<string>(todayStr.substring(0, 7));
  const [monthlyData, setMonthlyData] = useState<MonthlyAttendanceResponse | null>(null);
  const [loadingMonthly, setLoadingMonthly] = useState(false);

  // Quick edit modal for monthly cell
  const [editingCell, setEditingCell] = useState<{
    staffId: string;
    staffName: string;
    date: string;
    day: number;
    currentStatus: AttendanceStatus;
  } | null>(null);
  const [savingCell, setSavingCell] = useState(false);

  // Load Daily Attendance
  const loadDaily = useCallback(
    async (date: string) => {
      try {
        setLoadingDaily(true);
        const res = await getDailyAttendance(date);
        setDailyStaff(res.staff || []);
        setIsMonthLocked(Boolean(res.isMonthLocked));

        const initialMap: Record<string, { status: AttendanceStatus; note: string }> = {};
        (res.staff || []).forEach((s) => {
          initialMap[s.staffId] = {
            status: s.status,
            note: s.note || '',
          };
        });
        setLocalStatuses(initialMap);
        setIsDirty(false);
      } catch (err: any) {
        onNotify('error', err.message || 'Failed to load daily attendance');
      } finally {
        setLoadingDaily(false);
      }
    },
    [onNotify]
  );

  // Load Monthly Attendance
  const loadMonthly = useCallback(
    async (month: string) => {
      try {
        setLoadingMonthly(true);
        const res = await getMonthlyAttendance(month);
        setMonthlyData(res);
      } catch (err: any) {
        onNotify('error', err.message || 'Failed to load monthly attendance');
      } finally {
        setLoadingMonthly(false);
      }
    },
    [onNotify]
  );

  useEffect(() => {
    if (viewMode === 'daily') {
      loadDaily(selectedDate);
    } else {
      loadMonthly(selectedMonth);
    }
  }, [viewMode, selectedDate, selectedMonth, loadDaily, loadMonthly]);

  // Keyboard shortcut Ctrl+S or Cmd+S to save attendance
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (isDirty && !savingDaily) {
          handleSaveDaily();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDirty, savingDaily]);

  // Date Navigation
  const handlePrevDay = () => {
    if (isDirty && !window.confirm('You have unsaved changes. Discard them?')) return;
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    if (selectedDate >= todayStr) return;
    if (isDirty && !window.confirm('You have unsaved changes. Discard them?')) return;
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    const nextStr = d.toISOString().split('T')[0];
    if (nextStr <= todayStr) {
      setSelectedDate(nextStr);
    }
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val > todayStr) {
      onNotify('warning', 'Cannot select future dates');
      return;
    }
    if (isDirty && !window.confirm('You have unsaved changes. Discard them?')) return;
    setSelectedDate(val);
  };

  // Checkbox toggle logic (Mutually exclusive per row)
  const toggleStaffStatus = (staffId: string, type: AttendanceType) => {
    setLocalStatuses((prev) => {
      const current = prev[staffId]?.status;
      // If already checked, uncheck it (set to null)
      const nextStatus: AttendanceStatus = current === type ? null : type;
      return {
        ...prev,
        [staffId]: {
          ...(prev[staffId] || { note: '' }),
          status: nextStatus,
        },
      };
    });
    setIsDirty(true);
  };

  const setStaffNote = (staffId: string, note: string) => {
    setLocalStatuses((prev) => ({
      ...prev,
      [staffId]: {
        status: prev[staffId]?.status || null,
        note,
      },
    }));
    setIsDirty(true);
  };

  // Bulk Column Actions
  const handleSelectAllForColumn = (type: AttendanceType) => {
    const updated = { ...localStatuses };
    let changed = false;

    // Check if ALL currently matching active staff already have this type
    const allMatchingHaveType = filteredStaff.every((s) => {
      if (s.isLocked) return true;
      return updated[s.staffId]?.status === type;
    });

    filteredStaff.forEach((s) => {
      if (!s.isLocked) {
        updated[s.staffId] = {
          status: allMatchingHaveType ? null : type,
          note: updated[s.staffId]?.note || '',
        };
        changed = true;
      }
    });

    if (changed) {
      setLocalStatuses(updated);
      setIsDirty(true);
    }
  };

  const handleMarkUnmarkedAbsent = () => {
    const updated = { ...localStatuses };
    let markedCount = 0;
    dailyStaff.forEach((s) => {
      if (!s.isLocked && !updated[s.staffId]?.status) {
        updated[s.staffId] = {
          status: 'ABSENT',
          note: updated[s.staffId]?.note || '',
        };
        markedCount++;
      }
    });
    if (markedCount > 0) {
      setLocalStatuses(updated);
      setIsDirty(true);
      onNotify('success', `Marked ${markedCount} unmarked staff members as Absent.`);
    } else {
      onNotify('warning', 'No unmarked staff members found.');
    }
  };

  const handleClearAll = () => {
    if (!window.confirm(`Clear all marked attendance for ${selectedDate}?`)) return;
    const updated = { ...localStatuses };
    dailyStaff.forEach((s) => {
      if (!s.isLocked) {
        updated[s.staffId] = {
          status: null,
          note: updated[s.staffId]?.note || '',
        };
      }
    });
    setLocalStatuses(updated);
    setIsDirty(true);
  };

  // Save Daily Attendance
  const handleSaveDaily = async () => {
    try {
      setSavingDaily(true);
      const entries: { staffId: string; status: 'FULL_DAY' | 'HALF_DAY' | 'PAID_LEAVE' | 'ABSENT'; note?: string }[] = [];

      dailyStaff.forEach((s) => {
        const item = localStatuses[s.staffId];
        if (item && item.status && !s.isLocked) {
          entries.push({
            staffId: s.staffId,
            status: item.status,
            note: item.note ? item.note.trim() : undefined,
          });
        }
      });

      await saveDailyAttendance({
        date: selectedDate,
        entries,
      });

      onNotify('success', `Attendance updated successfully for ${selectedDate} (${entries.length} staff records).`);
      setIsDirty(false);
      await loadDaily(selectedDate);
    } catch (err: any) {
      onNotify('error', err.message || 'Failed to save attendance');
    } finally {
      setSavingDaily(false);
    }
  };

  // Summary counts
  const dailySummary = useMemo(() => {
    let full = 0;
    let half = 0;
    let leave = 0;
    let absent = 0;
    let unmarked = 0;

    dailyStaff.forEach((s) => {
      const st = localStatuses[s.staffId]?.status;
      if (st === 'FULL_DAY') full++;
      else if (st === 'HALF_DAY') half++;
      else if (st === 'PAID_LEAVE') leave++;
      else if (st === 'ABSENT') absent++;
      else unmarked++;
    });

    const totalDaysPayable = full * 1.0 + half * 0.5 + leave * 1.0;

    return {
      full,
      half,
      leave,
      absent,
      unmarked,
      total: dailyStaff.length,
      totalDaysPayable,
    };
  }, [dailyStaff, localStatuses]);

  // Filtered staff based on search & filter
  const filteredStaff = useMemo(() => {
    return dailyStaff.filter((staff) => {
      const currentSt = localStatuses[staff.staffId]?.status;
      const matchSearch =
        !searchQuery ||
        staff.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        staff.staffCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (staff.designation && staff.designation.toLowerCase().includes(searchQuery.toLowerCase()));

      let matchFilter = true;
      if (statusFilter === 'UNMARKED') {
        matchFilter = !currentSt;
      } else if (statusFilter !== 'ALL') {
        matchFilter = currentSt === statusFilter;
      }

      return matchSearch && matchFilter;
    });
  }, [dailyStaff, localStatuses, searchQuery, statusFilter]);

  // Helper for column select-all checkbox state
  const getColumnSelectState = (type: AttendanceType) => {
    if (filteredStaff.length === 0) return false;
    const unlockStaff = filteredStaff.filter((s) => !s.isLocked);
    if (unlockStaff.length === 0) return false;
    return unlockStaff.every((s) => localStatuses[s.staffId]?.status === type);
  };

  // Monthly Quick Cell Save
  const handleSaveCellStatus = async (status: AttendanceStatus) => {
    if (!editingCell || !status) return;
    try {
      setSavingCell(true);
      await saveDailyAttendance({
        date: editingCell.date,
        entries: [
          {
            staffId: editingCell.staffId,
            status,
          },
        ],
      });
      onNotify('success', `Updated attendance for ${editingCell.staffName}`);
      setEditingCell(null);
      await loadMonthly(selectedMonth);
    } catch (err: any) {
      onNotify('error', err.message || 'Failed to update cell attendance');
    } finally {
      setSavingCell(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-fadeIn">
      {/* Top View Toggle & Date Navigator Bar */}
      <div className="bg-white border border-[#E2E6ED] rounded-2xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left: View Mode Tabs */}
        <div className="flex items-center gap-1 bg-[#F5F7FA] p-1 rounded-xl border border-[#E2E6ED]/80">
          <button
            type="button"
            onClick={() => setViewMode('daily')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              viewMode === 'daily'
                ? 'bg-white text-[#2F6FED] shadow-xs'
                : 'text-[#6B7686] hover:text-[#1A2333]'
            }`}
          >
            <CheckSquare className="w-4 h-4" />
            <span>Daily Checkbox Register</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('monthly')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              viewMode === 'monthly'
                ? 'bg-white text-[#2F6FED] shadow-xs'
                : 'text-[#6B7686] hover:text-[#1A2333]'
            }`}
          >
            <TableIcon className="w-4 h-4" />
            <span>Monthly Matrix Grid</span>
          </button>
        </div>

        {/* Center / Right: Date Controls */}
        {viewMode === 'daily' ? (
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center bg-[#F8FAFC] border border-[#E2E6ED] rounded-xl p-1 shadow-2xs">
              <button
                type="button"
                onClick={handlePrevDay}
                title="Previous Day"
                className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-1.5 px-3">
                <CalendarIcon className="w-3.5 h-3.5 text-[#2F6FED]" />
                <input
                  type="date"
                  max={todayStr}
                  value={selectedDate}
                  onChange={handleDateChange}
                  className="bg-transparent text-xs font-bold text-[#1A2333] focus:outline-none cursor-pointer"
                />
              </div>

              <button
                type="button"
                onClick={handleNextDay}
                disabled={selectedDate >= todayStr}
                title="Next Day"
                className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {selectedDate !== todayStr && (
              <button
                type="button"
                onClick={() => setSelectedDate(todayStr)}
                className="px-3 py-1.5 text-xs font-bold text-[#2F6FED] bg-blue-50 hover:bg-blue-100 rounded-xl border border-blue-200 transition-colors"
              >
                Jump to Today
              </button>
            )}

            {/* Save Button */}
            <button
              type="button"
              disabled={!isDirty || savingDaily}
              onClick={handleSaveDaily}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm ${
                isDirty
                  ? 'bg-[#2F6FED] hover:bg-[#2358C2] text-white ring-4 ring-blue-500/20 shadow-blue-500/25'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <Save className="w-4 h-4" />
              <span>{savingDaily ? 'Saving Changes...' : 'Save Attendance'}</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#6B7686] font-semibold">Select Month:</span>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-1.5 border border-[#E2E6ED] rounded-xl text-xs font-bold text-[#1A2333] bg-[#F8FAFC] focus:outline-none focus:border-[#2F6FED]"
            />
          </div>
        )}
      </div>

      {/* Dirty-state Warning Alert */}
      {viewMode === 'daily' && isDirty && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-3.5 flex items-center justify-between gap-3 text-amber-900 text-xs shadow-xs animate-pulse">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <div>
              <span className="font-bold">Unsaved Attendance Edits: </span>
              <span>You have modified marks for {selectedDate}. Press </span>
              <kbd className="px-1.5 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 rounded text-[10px] font-mono font-bold">
                Ctrl+S
              </kbd>
              <span> or click <strong>Save Attendance</strong> to record to payroll.</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => loadDaily(selectedDate)}
            className="flex items-center gap-1 text-[11px] font-bold text-amber-800 hover:text-amber-950 px-2.5 py-1 bg-amber-100/70 hover:bg-amber-200 rounded-lg transition-colors"
          >
            <RotateCcw className="w-3 h-3" /> Discard
          </button>
        </div>
      )}

      {/* Month Locked Banner */}
      {isMonthLocked && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3.5 flex items-center gap-2.5 text-blue-900 text-xs shadow-xs">
          <Lock className="w-4 h-4 text-blue-600 flex-shrink-0" />
          <span>
            <strong>Salary Cycle Locked:</strong> Finalized staff salary slips exist for this cycle. Attendance records for finalized staff are locked to protect accounting integrity.
          </span>
        </div>
      )}

      {/* ================================================================ */}
      {/* DAILY VIEW (Modern Checkbox Table) */}
      {/* ================================================================ */}
      {viewMode === 'daily' && (
        <div className="space-y-4">
          {/* Executive Attendance Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* Total Staff */}
            <div className="p-3.5 bg-white rounded-2xl border border-[#E2E6ED] shadow-xs">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Total Staff
                </span>
                <Users className="w-4 h-4 text-[#2F6FED]" />
              </div>
              <div className="text-xl font-bold font-heading text-slate-900">
                {dailySummary.total}
              </div>
              <span className="text-[10px] text-slate-400 font-medium">On payroll roster</span>
            </div>

            {/* Full Day */}
            <div className="p-3.5 bg-emerald-50/60 rounded-2xl border border-emerald-200/80 shadow-xs">
              <div className="flex items-center justify-between text-emerald-600 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider">
                  Full Day (1.0)
                </span>
                <Sun className="w-4 h-4" />
              </div>
              <div className="text-xl font-bold font-heading text-emerald-800">
                {dailySummary.full}
              </div>
              <span className="text-[10px] text-emerald-700/80 font-medium">
                {dailySummary.total > 0
                  ? `${Math.round((dailySummary.full / dailySummary.total) * 100)}% attendance`
                  : '0%'}
              </span>
            </div>

            {/* Half Day */}
            <div className="p-3.5 bg-amber-50/60 rounded-2xl border border-amber-200/80 shadow-xs">
              <div className="flex items-center justify-between text-amber-600 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider">
                  Half Day (0.5)
                </span>
                <Clock className="w-4 h-4" />
              </div>
              <div className="text-xl font-bold font-heading text-amber-800">
                {dailySummary.half}
              </div>
              <span className="text-[10px] text-amber-700/80 font-medium">Half shift credits</span>
            </div>

            {/* Paid Leave */}
            <div className="p-3.5 bg-blue-50/60 rounded-2xl border border-blue-200/80 shadow-xs">
              <div className="flex items-center justify-between text-blue-600 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider">
                  Paid Leave
                </span>
                <CalendarCheck className="w-4 h-4" />
              </div>
              <div className="text-xl font-bold font-heading text-blue-800">
                {dailySummary.leave}
              </div>
              <span className="text-[10px] text-blue-700/80 font-medium">Authorized leave</span>
            </div>

            {/* Absent */}
            <div className="p-3.5 bg-rose-50/60 rounded-2xl border border-rose-200/80 shadow-xs">
              <div className="flex items-center justify-between text-rose-600 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider">
                  Absent
                </span>
                <XCircle className="w-4 h-4" />
              </div>
              <div className="text-xl font-bold font-heading text-rose-800">
                {dailySummary.absent}
              </div>
              <span className="text-[10px] text-rose-700/80 font-medium">Loss of pay</span>
            </div>

            {/* Total Shift Credits Logged */}
            <div className="p-3.5 bg-indigo-50/60 rounded-2xl border border-indigo-200/80 shadow-xs">
              <div className="flex items-center justify-between text-indigo-600 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider">
                  Days Credit
                </span>
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="text-xl font-bold font-heading text-indigo-900">
                {dailySummary.totalDaysPayable.toFixed(1)}d
              </div>
              <span className="text-[10px] text-indigo-700/80 font-medium">
                {dailySummary.unmarked} unmarked
              </span>
            </div>
          </div>

          {/* Quick Actions & Search Bar */}
          <div className="p-4 bg-white rounded-2xl border border-[#E2E6ED] shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
            {/* Search Input & Status Filter */}
            <div className="flex items-center gap-2.5 w-full md:w-auto flex-1 max-w-md">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search staff by name or code..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-[#F8FAFC] border border-[#E2E6ED] rounded-xl text-xs text-[#1A2333] placeholder-slate-400 focus:outline-none focus:border-[#2F6FED] focus:bg-white transition-all font-medium"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 bg-[#F8FAFC] border border-[#E2E6ED] rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-[#2F6FED]"
              >
                <option value="ALL">All Statuses</option>
                <option value="FULL_DAY">Full Day</option>
                <option value="HALF_DAY">Half Day</option>
                <option value="PAID_LEAVE">Paid Leave</option>
                <option value="ABSENT">Absent</option>
                <option value="UNMARKED">Unmarked Only</option>
              </select>
            </div>

            {/* Quick Bulk Presets */}
            <div className="flex items-center gap-2 flex-wrap w-full md:w-auto justify-end">
              <button
                type="button"
                onClick={() => handleSelectAllForColumn('FULL_DAY')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-200 transition-colors"
                title="Mark all matching staff as Full Day"
              >
                <Sun className="w-3.5 h-3.5 text-emerald-600" />
                <span>Mark All Full Day</span>
              </button>

              <button
                type="button"
                onClick={handleMarkUnmarkedAbsent}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 text-xs font-bold border border-rose-200 transition-colors"
                title="Mark any staff member without a check as Absent"
              >
                <XCircle className="w-3.5 h-3.5 text-rose-600" />
                <span>Unmarked → Absent</span>
              </button>

              <button
                type="button"
                onClick={handleClearAll}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
                title="Clear all marked checkboxes"
              >
                Clear All
              </button>
            </div>
          </div>

          {/* CHECKBOX ATTENDANCE TABLE */}
          {loadingDaily ? (
            <div className="bg-white border border-[#E2E6ED] rounded-2xl p-16 text-center space-y-3 shadow-xs">
              <div className="w-8 h-8 rounded-full border-3 border-blue-600 border-t-transparent animate-spin mx-auto" />
              <p className="text-xs font-bold text-slate-700">Loading staff attendance register...</p>
            </div>
          ) : filteredStaff.length === 0 ? (
            <div className="bg-white border border-[#E2E6ED] rounded-2xl p-14 text-center space-y-2 shadow-xs">
              <Users className="w-10 h-10 text-slate-300 mx-auto" />
              <div className="text-sm font-bold text-slate-900">No staff members found</div>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {dailyStaff.length === 0
                  ? `No active staff registered on or before ${selectedDate}.`
                  : 'No staff match the current search criteria or status filter.'}
              </p>
            </div>
          ) : (
            <div className="bg-white border border-[#E2E6ED] rounded-2xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#F8FAFC] border-b border-[#E2E6ED] text-[11px] font-bold text-slate-600 uppercase tracking-wider select-none">
                      {/* Employee Info Header */}
                      <th className="py-4 px-5 min-w-[240px]">
                        <span className="flex items-center gap-2">
                          <Users className="w-3.5 h-3.5 text-slate-400" /> Employee / Staff
                        </span>
                      </th>

                      {/* 4 Checkbox Columns */}
                      {ATTENDANCE_COLUMNS.map((col) => {
                        const Icon = col.icon;
                        const isAllSelected = getColumnSelectState(col.key);

                        return (
                          <th
                            key={col.key}
                            className={`py-4 px-3 text-center min-w-[125px] border-l border-[#E2E6ED]/80 cursor-pointer transition-colors hover:bg-slate-100/70`}
                            onClick={() => handleSelectAllForColumn(col.key)}
                            title={`Click column header to toggle all staff as ${col.label}`}
                          >
                            <div className="flex flex-col items-center gap-1.5">
                              <div className="flex items-center gap-1.5 font-bold">
                                <Icon className={`w-3.5 h-3.5 ${col.color}`} />
                                <span className={col.color}>{col.label}</span>
                                <span className="text-[10px] font-mono font-semibold px-1 py-0.2 bg-white rounded border border-slate-200 text-slate-500">
                                  {col.weight}
                                </span>
                              </div>

                              {/* Column Bulk Toggle Button */}
                              <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-semibold mt-0.5">
                                <div
                                  className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                                    isAllSelected
                                      ? `${col.activeBg} ${col.activeBorder} text-white`
                                      : 'border-slate-300 bg-white hover:border-slate-400'
                                  }`}
                                >
                                  {isAllSelected && <Check className="w-3 h-3 stroke-[3]" />}
                                </div>
                                <span>Select All</span>
                              </div>
                            </div>
                          </th>
                        );
                      })}

                      {/* Calculated Credit Header */}
                      <th className="py-4 px-4 min-w-[140px] text-center border-l border-[#E2E6ED]/80">
                        Pay Credit
                      </th>

                      {/* Shift Remarks / Notes Header */}
                      <th className="py-4 px-5 min-w-[200px] border-l border-[#E2E6ED]/80">
                        Shift Remarks / Notes
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-[#E2E6ED] text-slate-700">
                    {filteredStaff.map((staff) => {
                      const current = localStatuses[staff.staffId] || { status: null, note: '' };
                      const isLocked = staff.isLocked;

                      // Derive active row background style based on marked attendance
                      let rowStyle = 'hover:bg-slate-50/70';
                      if (current.status === 'FULL_DAY') {
                        rowStyle = 'bg-emerald-50/30 hover:bg-emerald-50/60 border-l-4 border-l-emerald-500';
                      } else if (current.status === 'HALF_DAY') {
                        rowStyle = 'bg-amber-50/30 hover:bg-amber-50/60 border-l-4 border-l-amber-500';
                      } else if (current.status === 'PAID_LEAVE') {
                        rowStyle = 'bg-blue-50/30 hover:bg-blue-50/60 border-l-4 border-l-blue-500';
                      } else if (current.status === 'ABSENT') {
                        rowStyle = 'bg-rose-50/30 hover:bg-rose-50/60 border-l-4 border-l-rose-500';
                      }

                      return (
                        <tr
                          key={staff.staffId}
                          className={`transition-colors ${isLocked ? 'bg-slate-50/80 opacity-75' : rowStyle}`}
                        >
                          {/* Staff Details */}
                          <td className="py-3.5 px-5">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shadow-xs flex-shrink-0">
                                {staff.fullName
                                  .split(' ')
                                  .map((n) => n[0])
                                  .slice(0, 2)
                                  .join('')
                                  .toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-slate-900 text-xs truncate">
                                    {staff.fullName}
                                  </span>
                                  {isLocked && (
                                    <span
                                      className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-200 text-slate-700"
                                      title="Finalized salary cycle"
                                    >
                                      <Lock className="w-2.5 h-2.5" /> Locked
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                                  <span className="font-mono font-medium text-slate-600">
                                    {staff.staffCode}
                                  </span>
                                  <span>•</span>
                                  <span className="truncate max-w-[140px]">
                                    {staff.designation || 'Staff'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* 4 Checkbox Cells */}
                          {ATTENDANCE_COLUMNS.map((col) => {
                            const isChecked = current.status === col.key;

                            return (
                              <td
                                key={col.key}
                                onClick={() => {
                                  if (!isLocked) {
                                    toggleStaffStatus(staff.staffId, col.key);
                                  }
                                }}
                                className={`py-3.5 px-3 text-center border-l border-[#E2E6ED]/60 select-none ${
                                  isLocked
                                    ? 'cursor-not-allowed opacity-60'
                                    : 'cursor-pointer hover:bg-slate-100/50'
                                }`}
                              >
                                <div className="flex items-center justify-center">
                                  <button
                                    type="button"
                                    role="checkbox"
                                    aria-checked={isChecked}
                                    disabled={isLocked}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (!isLocked) {
                                        toggleStaffStatus(staff.staffId, col.key);
                                      }
                                    }}
                                    className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all duration-150 transform active:scale-90 ${
                                      isChecked
                                        ? `${col.activeBg} ${col.activeBorder} shadow-sm ring-4 ${col.ringColor}`
                                        : 'bg-white border-slate-300 hover:border-slate-400'
                                    }`}
                                  >
                                    {isChecked && (
                                      <Check className="w-3.5 h-3.5 stroke-[3.5] text-white animate-in zoom-in-50 duration-150" />
                                    )}
                                  </button>
                                </div>
                              </td>
                            );
                          })}

                          {/* Pay Credit Column */}
                          <td className="py-3.5 px-4 text-center border-l border-[#E2E6ED]/60 font-semibold">
                            {current.status === 'FULL_DAY' ? (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300/80">
                                +1.0 Day Credit
                              </span>
                            ) : current.status === 'HALF_DAY' ? (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300/80">
                                +0.5 Day Credit
                              </span>
                            ) : current.status === 'PAID_LEAVE' ? (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-300/80">
                                +1.0 Day (Paid)
                              </span>
                            ) : current.status === 'ABSENT' ? (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300/80">
                                0.0 Day (LOP)
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
                                Unmarked (0.0d)
                              </span>
                            )}
                          </td>

                          {/* Remarks / Shift Notes */}
                          <td className="py-3.5 px-5 border-l border-[#E2E6ED]/60">
                            <input
                              type="text"
                              disabled={isLocked}
                              placeholder="Add shift remarks..."
                              value={current.note || ''}
                              onChange={(e) => setStaffNote(staff.staffId, e.target.value)}
                              className="w-full px-3 py-1.5 text-xs bg-white border border-[#E2E6ED] rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#2F6FED] focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-100 transition-all"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Table Footer Helper */}
              <div className="p-3.5 bg-[#F8FAFC] border-t border-[#E2E6ED] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-500">
                <div className="flex items-center gap-4 flex-wrap">
                  <span className="font-bold text-slate-700">Quick Tips:</span>
                  <span>• Click any checkbox or table cell to mark an employee.</span>
                  <span>• Clicking an active checkbox unchecks it.</span>
                  <span>• Press <strong>Ctrl+S</strong> anytime to commit all marks to payroll.</span>
                </div>
                <div className="font-bold text-slate-700">
                  Showing {filteredStaff.length} of {dailyStaff.length} Staff
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================================================================ */}
      {/* MONTHLY GRID VIEW */}
      {/* ================================================================ */}
      {viewMode === 'monthly' && (
        <div className="space-y-4">
          {loadingMonthly ? (
            <div className="bg-white border border-[#E2E6ED] rounded-2xl p-16 text-center space-y-3 shadow-xs">
              <div className="w-8 h-8 rounded-full border-3 border-blue-600 border-t-transparent animate-spin mx-auto" />
              <p className="text-xs font-bold text-slate-700">Loading monthly attendance grid for {selectedMonth}...</p>
            </div>
          ) : !monthlyData || monthlyData.staff.length === 0 ? (
            <div className="bg-white border border-[#E2E6ED] rounded-2xl p-14 text-center space-y-2 shadow-xs">
              <CalendarDays className="w-10 h-10 text-slate-300 mx-auto" />
              <div className="text-sm font-bold text-slate-900">No active staff records found for {selectedMonth}</div>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Staff members added to your roster will appear here automatically with their daily shift progression.
              </p>
            </div>
          ) : (
            <div className="bg-white border border-[#E2E6ED] rounded-2xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#F8FAFC] border-b border-[#E2E6ED] text-[11px] font-bold text-slate-600">
                      <th className="sticky left-0 bg-[#F8FAFC] px-4 py-3.5 min-w-[200px] z-10 border-r border-[#E2E6ED]">
                        Staff Member
                      </th>
                      {Array.from({ length: monthlyData.daysInMonth }, (_, i) => i + 1).map((d) => (
                        <th
                          key={d}
                          className="px-1.5 py-3.5 font-bold text-center min-w-[30px] border-r border-[#E2E6ED]/60"
                        >
                          {d}
                        </th>
                      ))}
                      <th className="sticky right-0 bg-[#F8FAFC] px-3.5 py-3.5 font-bold text-center min-w-[180px] z-10 border-l border-[#E2E6ED]">
                        Monthly Summary
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E6ED]">
                    {monthlyData.staff.map((stf) => (
                      <tr key={stf.staffId} className="hover:bg-slate-50/60 transition-colors">
                        {/* Sticky Staff Column */}
                        <td className="sticky left-0 bg-white hover:bg-slate-50 px-4 py-3 z-10 border-r border-[#E2E6ED]">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 truncate max-w-[140px]" title={stf.fullName}>
                              {stf.fullName}
                            </span>
                            {stf.isLocked && (
                              <span title="Cycle is finalized">
                                <Lock className="w-3 h-3 text-slate-400 flex-shrink-0" />
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono">{stf.staffCode}</div>
                        </td>

                        {/* Day Cells */}
                        {stf.days.map((dm) => {
                          let badgeBg = 'bg-slate-50 text-slate-400 border-slate-200';
                          let char = '·';
                          if (dm.status === 'FULL_DAY') {
                            badgeBg = 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold';
                            char = 'F';
                          } else if (dm.status === 'HALF_DAY') {
                            badgeBg = 'bg-amber-100 text-amber-800 border-amber-300 font-bold';
                            char = 'H';
                          } else if (dm.status === 'PAID_LEAVE') {
                            badgeBg = 'bg-blue-100 text-blue-800 border-blue-300 font-bold';
                            char = 'L';
                          } else if (dm.status === 'ABSENT') {
                            badgeBg = 'bg-rose-100 text-rose-800 border-rose-300 font-bold';
                            char = 'A';
                          }

                          const canEdit = !stf.isLocked && dm.date <= todayStr;

                          return (
                            <td
                              key={dm.day}
                              onClick={() => {
                                if (canEdit) {
                                  setEditingCell({
                                    staffId: stf.staffId,
                                    staffName: stf.fullName,
                                    date: dm.date,
                                    day: dm.day,
                                    currentStatus: dm.status,
                                  });
                                }
                              }}
                              className={`p-1 text-center border-r border-[#E2E6ED]/50 select-none ${
                                canEdit ? 'cursor-pointer hover:bg-blue-50/80' : 'cursor-default'
                              }`}
                              title={
                                stf.isLocked
                                  ? 'Locked: Cycle is finalized'
                                  : dm.date > todayStr
                                  ? 'Future date'
                                  : `${stf.fullName} - ${dm.date}: ${dm.status || 'Unmarked'}`
                              }
                            >
                              <span
                                className={`inline-flex items-center justify-center w-6 h-6 rounded-md text-[11px] border ${badgeBg}`}
                              >
                                {char}
                              </span>
                            </td>
                          );
                        })}

                        {/* Sticky Totals Column */}
                        <td className="sticky right-0 bg-white hover:bg-slate-50 px-3 py-2 text-center text-xs font-medium z-10 border-l border-[#E2E6ED]">
                          <div className="flex items-center justify-center gap-1.5 text-[11px]">
                            <span className="text-emerald-700 font-bold" title="Full Days">
                              {stf.totals.fullDays}F
                            </span>
                            <span className="text-amber-700 font-bold" title="Half Days">
                              {stf.totals.halfDays}H
                            </span>
                            <span className="text-blue-700 font-bold" title="Paid Leave">
                              {stf.totals.paidLeaveDays}L
                            </span>
                            <span className="text-rose-700 font-bold" title="Absent / Unmarked">
                              {stf.totals.absentDays}A
                            </span>
                            <span
                              className="font-extrabold text-[#2F6FED] ml-1 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200"
                              title="Calculated Payable Days"
                            >
                              {stf.totals.payableDays}d
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Monthly Legend */}
              <div className="bg-[#F8FAFC] border-t border-[#E2E6ED] p-3.5 flex items-center justify-between flex-wrap gap-4 text-xs text-slate-600">
                <div className="flex items-center gap-4 flex-wrap">
                  <span className="font-bold text-slate-800">Legend:</span>
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block w-4 h-4 rounded text-[10px] font-bold text-center bg-emerald-100 text-emerald-800 border border-emerald-300">
                      F
                    </span>
                    Full Day (1.0d)
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block w-4 h-4 rounded text-[10px] font-bold text-center bg-amber-100 text-amber-800 border border-amber-300">
                      H
                    </span>
                    Half Day (0.5d)
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block w-4 h-4 rounded text-[10px] font-bold text-center bg-blue-100 text-blue-800 border border-blue-300">
                      L
                    </span>
                    Paid Leave (1.0d)
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block w-4 h-4 rounded text-[10px] font-bold text-center bg-rose-100 text-rose-800 border border-rose-300">
                      A
                    </span>
                    Absent (0.0d)
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block w-4 h-4 rounded text-[10px] font-bold text-center bg-slate-100 text-slate-400 border border-slate-200">
                      ·
                    </span>
                    Unmarked
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 font-medium">
                  * Click any cell up to today to quickly modify attendance marks.
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Monthly Quick Edit Modal */}
      {editingCell && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-sm w-full p-6 space-y-4">
            <div>
              <h3 className="font-heading font-bold text-base text-slate-900">
                Update Attendance Mark
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                <strong>{editingCell.staffName}</strong> • Day {editingCell.day} ({editingCell.date})
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                disabled={savingCell}
                onClick={() => handleSaveCellStatus('FULL_DAY')}
                className="p-3 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 font-bold text-xs hover:bg-emerald-100 transition-colors flex items-center justify-center gap-2 shadow-xs"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Full Day
              </button>
              <button
                type="button"
                disabled={savingCell}
                onClick={() => handleSaveCellStatus('HALF_DAY')}
                className="p-3 rounded-xl border border-amber-200 bg-amber-50 text-amber-800 font-bold text-xs hover:bg-amber-100 transition-colors flex items-center justify-center gap-2 shadow-xs"
              >
                <Clock className="w-4 h-4 text-amber-600" /> Half Day
              </button>
              <button
                type="button"
                disabled={savingCell}
                onClick={() => handleSaveCellStatus('PAID_LEAVE')}
                className="p-3 rounded-xl border border-blue-200 bg-blue-50 text-blue-800 font-bold text-xs hover:bg-blue-100 transition-colors flex items-center justify-center gap-2 shadow-xs"
              >
                <CalendarCheck className="w-4 h-4 text-blue-600" /> Paid Leave
              </button>
              <button
                type="button"
                disabled={savingCell}
                onClick={() => handleSaveCellStatus('ABSENT')}
                className="p-3 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 font-bold text-xs hover:bg-rose-100 transition-colors flex items-center justify-center gap-2 shadow-xs"
              >
                <XCircle className="w-4 h-4 text-rose-600" /> Absent
              </button>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setEditingCell(null)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

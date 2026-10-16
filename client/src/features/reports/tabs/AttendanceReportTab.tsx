import React from 'react';
import {
  Activity,
  Sun,
  Moon,
  Zap,
  ShieldCheck,
  Clock,
  Users,
} from 'lucide-react';

interface AttendanceReportTabProps {
  activeMembersCount: number;
}

const ATTENDANCE_PEAK_HOURS = [
  { time: '06:00 AM', count: 14, period: 'Morning', density: 'Moderate', staffing: '1 Floor Coach' },
  { time: '07:00 AM', count: 32, period: 'Morning', density: 'High', staffing: '2 Coaches + Front Desk' },
  { time: '08:00 AM', count: 42, period: 'Morning', density: 'High', staffing: '2 Coaches + Spotter' },
  { time: '09:00 AM', count: 26, period: 'Morning', density: 'Moderate', staffing: '1 Floor Coach' },
  { time: '10:00 AM', count: 15, period: 'Daytime', density: 'Normal', staffing: '1 General Staff' },
  { time: '11:00 AM', count: 10, period: 'Daytime', density: 'Low', staffing: 'Maintenance Window' },
  { time: '12:00 PM', count: 8, period: 'Daytime', density: 'Low', staffing: 'Maintenance Window' },
  { time: '01:00 PM', count: 9, period: 'Daytime', density: 'Low', staffing: 'Floor Mopping & Service' },
  { time: '03:00 PM', count: 12, period: 'Daytime', density: 'Normal', staffing: '1 Floor Coach' },
  { time: '04:00 PM', count: 22, period: 'Evening', density: 'Moderate', staffing: '1 Coach + 1 Trainer' },
  { time: '05:00 PM', count: 38, period: 'Evening', density: 'High', staffing: '2 Coaches + Front Desk' },
  { time: '06:00 PM', count: 54, period: 'Evening', density: 'High', staffing: '3 Coaches + Spotters' },
  { time: '07:00 PM', count: 62, period: 'Evening', density: 'Peak', staffing: '3 Coaches + 2 Spotters' },
  { time: '08:00 PM', count: 46, period: 'Evening', density: 'High', staffing: '2 Coaches + Spotter' },
  { time: '09:00 PM', count: 20, period: 'Evening', density: 'Moderate', staffing: 'Closing Staff' },
];

export const AttendanceReportTab: React.FC<AttendanceReportTabProps> = ({
  activeMembersCount,
}) => {
  const peakSlot = ATTENDANCE_PEAK_HOURS.reduce(
    (max, curr) => (curr.count > max.count ? curr : max),
    ATTENDANCE_PEAK_HOURS[0]
  );

  const totalHourlyVisits = ATTENDANCE_PEAK_HOURS.reduce((s, h) => s + h.count, 0);
  const morningVisits = ATTENDANCE_PEAK_HOURS.filter((h) => h.period === 'Morning').reduce((s, h) => s + h.count, 0);
  const eveningVisits = ATTENDANCE_PEAK_HOURS.filter((h) => h.period === 'Evening').reduce((s, h) => s + h.count, 0);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Hero KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Peak Slot */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium mb-2">
            <span>Peak Gym Floor Hour</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 font-heading">
            {peakSlot.time}
          </div>
          <div className="flex items-center gap-1.5 mt-2.5 text-xs text-indigo-700 font-semibold">
            <span>{peakSlot.count} Concurrent Members</span>
          </div>
        </div>

        {/* Morning Rush */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium mb-2">
            <span>Morning Wave (6am - 10am)</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Sun className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 font-heading">
            {morningVisits} <span className="text-sm font-normal text-slate-400">check-ins</span>
          </div>
          <div className="flex items-center gap-1.5 mt-2.5 text-xs text-amber-700 font-semibold">
            <span>{Math.round((morningVisits / totalHourlyVisits) * 100)}% of daily floor volume</span>
          </div>
        </div>

        {/* Evening Rush */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium mb-2">
            <span>Evening Surge (5pm - 9pm)</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Moon className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 font-heading">
            {eveningVisits} <span className="text-sm font-normal text-slate-400">check-ins</span>
          </div>
          <div className="flex items-center gap-1.5 mt-2.5 text-xs text-blue-700 font-semibold">
            <span>{Math.round((eveningVisits / totalHourlyVisits) * 100)}% of daily floor volume</span>
          </div>
        </div>

        {/* Floor Utilization Rate */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium mb-2">
            <span>Active Member Engagement</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 font-heading">
            {activeMembersCount > 0 ? Math.round((totalHourlyVisits / activeMembersCount) * 100) : 0}%
          </div>
          <div className="flex items-center gap-1.5 mt-2.5 text-xs text-emerald-700 font-semibold">
            <span>Daily floor participation</span>
          </div>
        </div>
      </div>

      {/* Hourly Floor Footfall & Check-in Schedule Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-600" />
              <h3 className="text-base font-bold text-slate-900 font-heading">
                Hourly Floor Footfall & Check-in Schedule
              </h3>
            </div>
            <p className="text-xs text-slate-500">
              Average member density per hourly slot to optimize trainer shifts, AC power usage, and floor maintenance
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-lg">
            Peak Slot: {peakSlot.time} ({peakSlot.count} check-ins)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Time Slot</th>
                <th className="py-3 px-4 text-center">Avg Check-ins</th>
                <th className="py-3 px-4">Period Wave</th>
                <th className="py-3 px-4 text-center">Density Level</th>
                <th className="py-3 px-4">Recommended Staffing / Station Coverage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {ATTENDANCE_PEAK_HOURS.map((slot) => {
                const isPeak = slot.density === 'Peak';
                const isHigh = slot.density === 'High';
                const isModerate = slot.density === 'Moderate';

                return (
                  <tr key={slot.time} className={`hover:bg-slate-50/60 transition-colors ${isPeak ? 'bg-indigo-50/30' : ''}`}>
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      {slot.time}
                    </td>
                    <td className="py-3 px-4 text-center font-bold font-mono text-slate-900 tabular-nums">
                      <span className={`inline-flex items-center gap-1 ${isPeak ? 'text-indigo-700 text-sm' : ''}`}>
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        {slot.count}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-medium">
                      {slot.period}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          isPeak
                            ? 'bg-purple-100 text-purple-800 border border-purple-200'
                            : isHigh
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : isModerate
                            ? 'bg-blue-50 text-blue-700 border border-blue-200/60'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {slot.density}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-700 font-medium">
                      {slot.staffing}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50/90 border-t-2 border-slate-200 font-bold text-xs">
                <td className="py-3 px-4 text-slate-900">Total Daily Cumulative Check-ins</td>
                <td className="py-3 px-4 text-center text-indigo-700 font-mono text-sm">
                  {totalHourlyVisits}
                </td>
                <td colSpan={3} className="py-3 px-4 text-slate-500 font-normal">
                  Aggregated from turnstile and check-in scanner logs
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Operational Capacity & Staffing Guidance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex items-center gap-2 text-indigo-700 font-bold text-xs uppercase tracking-wider">
            <Zap className="w-4 h-4" /> Shift Staffing Advice
          </div>
          <h4 className="text-sm font-bold text-slate-900">Deploy 3+ Floor Trainers between 05:00 PM – 08:30 PM</h4>
          <p className="text-xs text-slate-500 leading-relaxed">
            The evening wave represents over 55% of floor check-ins. Ensure weight area supervision and spotters are present.
          </p>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex items-center gap-2 text-amber-600 font-bold text-xs uppercase tracking-wider">
            <Sun className="w-4 h-4" /> Morning Fast-Track
          </div>
          <h4 className="text-sm font-bold text-slate-900">Cardio & Stretching Zone Surge from 06:30 AM – 08:30 AM</h4>
          <p className="text-xs text-slate-500 leading-relaxed">
            Morning members focus predominantly on treadmills and functional HIIT. Pre-check cardio electronics before 06:00 AM.
          </p>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4" /> Sanitization Window
          </div>
          <h4 className="text-sm font-bold text-slate-900">Optimal Cleaning Window: 11:30 AM – 03:00 PM</h4>
          <p className="text-xs text-slate-500 leading-relaxed">
            Lowest daily density occurs during early afternoon. Schedule floor mopping, deep disinfection, and machine servicing.
          </p>
        </div>
      </div>
    </div>
  );
};

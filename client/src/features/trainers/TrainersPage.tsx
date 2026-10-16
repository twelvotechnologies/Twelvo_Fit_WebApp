import { memo, useState, useMemo, useEffect } from 'react';
import {
  Dumbbell,
  Search,
  Plus,
  Star,
  X,
  Loader2,
  RefreshCw,
  Building2,
} from 'lucide-react';
import { trainerApi, TrainerItem } from '../../api/trainerApi';
import { useAuthStore } from '../../stores/useAuthStore';

const formatINR = (val: number) => '₹ ' + val.toLocaleString('en-IN');

function TrainersPage() {
  const [trainers, setTrainers] = useState<TrainerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [specialtyFilter, setSpecialtyFilter] = useState('ALL');
  const [viewMode, setViewMode] = useState<'CARDS' | 'TABLE'>('CARDS');

  // Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedTrainer, setSelectedTrainer] = useState<TrainerItem | null>(null);

  const { user } = useAuthStore();

  // Add Trainer Form State
  const [form, setForm] = useState({
    name: '',
    role: 'Personal Trainer',
    specialty: 'Strength & Conditioning',
    phone: '',
    email: '',
    experienceYears: 3,
    baseSalary: 28000,
    commissionPerSession: 400,
  });

  const loadTrainers = async () => {
    setLoading(true);
    try {
      const data = await trainerApi.getTrainers({
        search: search.trim(),
        specialty: specialtyFilter,
      });
      setTrainers(data || []);
    } catch (err: any) {
      console.warn('Could not load trainers from API:', err);
      setTrainers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTrainers();
  }, [specialtyFilter]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      loadTrainers();
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  const filteredTrainers = useMemo(() => {
    return trainers.filter((t) => {
      const matchSearch =
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        t.role.toLowerCase().includes(search.toLowerCase()) ||
        t.specialty.toLowerCase().includes(search.toLowerCase()) ||
        t.phone.includes(search);

      const matchSpecialty = specialtyFilter === 'ALL' || t.specialty === specialtyFilter;

      return matchSearch && matchSpecialty;
    });
  }, [trainers, search, specialtyFilter]);

  const totalClients = useMemo(
    () => trainers.reduce((acc, curr) => acc + (curr.activeClients || 0), 0),
    [trainers]
  );
  const totalSessions = useMemo(
    () => trainers.reduce((acc, curr) => acc + (curr.sessionsThisMonth || 0), 0),
    [trainers]
  );

  const handleAddTrainer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) return;

    setIsSubmitting(true);
    try {
      const created = await trainerApi.createTrainer(form);
      setTrainers((prev) => [created, ...prev]);
      setIsAddModalOpen(false);
      setForm({
        name: '',
        role: 'Personal Trainer',
        specialty: 'Strength & Conditioning',
        phone: '',
        email: '',
        experienceYears: 3,
        baseSalary: 28000,
        commissionPerSession: 400,
      });
    } catch (err: any) {
      alert(err.message || 'Failed to add trainer');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-heading text-2xl font-bold text-[#1A2333] tracking-tight">
              Trainers & Coaching Staff
            </h1>
            {user?.gymName && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#EEF4FF] text-[#2F6FED] border border-[#D5E3FF]">
                <Building2 className="w-3 h-3" />
                {user.gymName}
              </span>
            )}
          </div>
          <p className="text-sm text-[#6B7686] mt-0.5">
            Manage fitness coaches, active client allocations, personal training sessions & payouts
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => loadTrainers()}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-[#E2E6ED] hover:bg-[#F8FAFC] text-[#344054] rounded-lg text-xs font-medium transition-colors shadow-subtle disabled:opacity-50"
            title="Refresh list"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#2F6FED]' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-[#2F6FED] hover:bg-[#2558bf] text-white rounded-lg text-xs font-medium transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add Trainer
          </button>
        </div>
      </div>

      {/* Top Stat Row (4 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-[#E2E6ED] rounded-xl p-5 shadow-subtle">
          <span className="text-xs font-medium uppercase tracking-wider text-[#6B7686]">
            Active Trainers
          </span>
          <div className="mt-3">
            <span className="stat-number font-heading text-3xl font-bold text-[#1A2333] tabular-nums tracking-tight">
              {trainers.filter((t) => t.status !== 'ON_LEAVE').length}
            </span>
          </div>
          <div className="mt-2.5 flex items-center gap-1.5 text-xs text-[#6B7686]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#2E9E6D]" />
            <span className="font-medium text-[#2E9E6D]">100% certified</span>
            <span>on duty roster</span>
          </div>
        </div>

        <div className="bg-white border border-[#E2E6ED] rounded-xl p-5 shadow-subtle">
          <span className="text-xs font-medium uppercase tracking-wider text-[#6B7686]">
            Assigned Clients
          </span>
          <div className="mt-3">
            <span className="stat-number font-heading text-3xl font-bold text-[#1A2333] tabular-nums tracking-tight">
              {totalClients}
            </span>
          </div>
          <div className="mt-2.5 flex items-center gap-1.5 text-xs text-[#6B7686]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#2F6FED]" />
            <span className="font-medium text-[#2F6FED]">
              Avg {(totalClients / trainers.length).toFixed(1)} clients / coach
            </span>
          </div>
        </div>

        <div className="bg-white border border-[#E2E6ED] rounded-xl p-5 shadow-subtle">
          <span className="text-xs font-medium uppercase tracking-wider text-[#6B7686]">
            PT Sessions This Month
          </span>
          <div className="mt-3">
            <span className="stat-number font-heading text-3xl font-bold text-[#1A2333] tabular-nums tracking-tight">
              {totalSessions}
            </span>
          </div>
          <div className="mt-2.5 flex items-center gap-1.5 text-xs text-[#6B7686]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#2E9E6D]" />
            <span className="font-medium text-[#2E9E6D]">+8.2%</span>
            <span>vs previous month</span>
          </div>
        </div>

        <div className="bg-white border border-[#E2E6ED] rounded-xl p-5 shadow-subtle">
          <span className="text-xs font-medium uppercase tracking-wider text-[#6B7686]">
            Trainer Base Payroll
          </span>
          <div className="mt-3">
            <span className="stat-number font-heading text-3xl font-bold text-[#1A2333] tabular-nums tracking-tight">
              {formatINR(trainers.reduce((a, b) => a + b.baseSalary, 0))}
            </span>
          </div>
          <div className="mt-2.5 flex items-center gap-1.5 text-xs text-[#6B7686]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#2F6FED]" />
            <span className="font-medium text-[#2F6FED]">Excludes session incentives</span>
          </div>
        </div>
      </div>

      {/* Filter and View Bar */}
      <div className="bg-white border border-[#E2E6ED] rounded-xl p-4 shadow-subtle flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-[#6B7686] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search trainer by name, specialty..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#F5F7FA] border border-[#E2E6ED] rounded-lg text-[#1A2333] placeholder-[#6B7686] focus:outline-none focus:border-[#2F6FED]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Specialty Filter */}
          <div className="flex items-center bg-[#F5F7FA] p-1 rounded-lg border border-[#E2E6ED] text-xs">
            {['ALL', 'Strength & Conditioning', 'Pilates & Yoga', 'CrossFit & HIIT', 'Nutrition'].map(
              (sp) => (
                <button
                  key={sp}
                  onClick={() => setSpecialtyFilter(sp)}
                  className={`px-3 py-1 rounded-md transition-all font-medium ${
                    specialtyFilter === sp
                      ? 'bg-white text-[#1A2333] shadow-sm'
                      : 'text-[#6B7686] hover:text-[#1A2333]'
                  }`}
                >
                  {sp === 'ALL' ? 'All Disciplines' : sp.split(' ')[0]}
                </button>
              )
            )}
          </div>

          {/* Card / Table Switcher */}
          <div className="flex items-center bg-[#F5F7FA] p-1 rounded-lg border border-[#E2E6ED] text-xs">
            <button
              onClick={() => setViewMode('CARDS')}
              className={`px-3 py-1 rounded-md transition-all font-medium ${
                viewMode === 'CARDS'
                  ? 'bg-white text-[#1A2333] shadow-sm'
                  : 'text-[#6B7686] hover:text-[#1A2333]'
              }`}
            >
              Cards
            </button>
            <button
              onClick={() => setViewMode('TABLE')}
              className={`px-3 py-1 rounded-md transition-all font-medium ${
                viewMode === 'TABLE'
                  ? 'bg-white text-[#1A2333] shadow-sm'
                  : 'text-[#6B7686] hover:text-[#1A2333]'
              }`}
            >
              Table
            </button>
          </div>
        </div>
      </div>

      {/* Content: Cards or Table */}
      {viewMode === 'CARDS' ? (
        filteredTrainers.length === 0 ? (
          <div className="py-16 text-center bg-white border border-[#E2E6ED] rounded-2xl p-8">
            <Dumbbell className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h3 className="font-semibold text-slate-700 text-sm">No trainers found</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              {search ? 'Try adjusting your search criteria' : 'Click "+ Onboard Trainer" to register your first gym fitness trainer.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredTrainers.map((t) => (
            <div
              key={t.id}
              className="bg-white border border-[#E2E6ED] rounded-xl p-5 shadow-subtle hover:border-[#CBD5E1] transition-all flex flex-col justify-between space-y-4"
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#E8EFFE] text-[#2F6FED] font-bold text-sm flex items-center justify-center border border-[#2F6FED]/20">
                      {t.name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')}
                    </div>
                    <div>
                      <h3 className="font-heading font-bold text-sm text-[#1A2333]">{t.name}</h3>
                      <div className="text-xs text-[#6B7686]">{t.role}</div>
                    </div>
                  </div>

                  {/* Status Indicator */}
                  <div className="flex items-center gap-1.5 text-[11px] font-medium">
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{
                        backgroundColor:
                          t.status === 'ACTIVE'
                            ? '#2E9E6D'
                            : t.status === 'IN_SESSION'
                            ? '#2F6FED'
                            : '#D99A3E',
                      }}
                    />
                    <span
                      style={{
                        color:
                          t.status === 'ACTIVE'
                            ? '#2E9E6D'
                            : t.status === 'IN_SESSION'
                            ? '#2F6FED'
                            : '#D99A3E',
                      }}
                    >
                      {t.status === 'ACTIVE'
                        ? 'Available'
                        : t.status === 'IN_SESSION'
                        ? 'In Session'
                        : 'On Leave'}
                    </span>
                  </div>
                </div>

                {/* Specialty Pill */}
                <div className="mt-3">
                  <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-[#E8EFFE] text-[#2F6FED]">
                    {t.specialty}
                  </span>
                </div>

                {/* Key Metrics */}
                <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-[#E2E6ED] text-xs">
                  <div>
                    <span className="text-[#6B7686]">Active Clients:</span>
                    <div className="font-bold text-[#1A2333] tabular-nums text-sm">
                      {t.activeClients}
                    </div>
                  </div>
                  <div>
                    <span className="text-[#6B7686]">Sessions / Mo:</span>
                    <div className="font-bold text-[#1A2333] tabular-nums text-sm">
                      {t.sessionsThisMonth}
                    </div>
                  </div>
                </div>

                {/* Pay & Rating Details */}
                <div className="mt-3 space-y-1 text-xs text-[#6B7686]">
                  <div className="flex justify-between">
                    <span>Base Salary:</span>
                    <span className="font-semibold text-[#1A2333] tabular-nums">
                      {formatINR(t.baseSalary)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Per-Session Incentive:</span>
                    <span className="font-semibold text-[#1A2333] tabular-nums">
                      {formatINR(t.commissionPerSession)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-[#E2E6ED] flex items-center justify-between">
                <div className="flex items-center gap-1 text-xs text-[#6B7686]">
                  <Star className="w-3.5 h-3.5 text-[#D99A3E] fill-[#D99A3E]" />
                  <span className="font-bold text-[#1A2333]">{t.rating}</span>
                  <span>({t.experienceYears}y exp)</span>
                </div>

                <button
                  onClick={() => setSelectedTrainer(t)}
                  className="px-2.5 py-1 text-xs font-medium border border-[#E2E6ED] hover:border-[#2F6FED] hover:text-[#2F6FED] rounded-md transition-colors text-[#1A2333] bg-white"
                >
                  View Details
                </button>
              </div>
            </div>
          ))}
          </div>
        )
      ) : (
        /* Table View */
        <div className="bg-white border border-[#E2E6ED] rounded-xl shadow-subtle overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E2E6ED] bg-[#F5F7FA] text-[11px] font-semibold uppercase text-[#6B7686] tracking-wider">
                <th className="py-3 px-4">Trainer</th>
                <th className="py-3 px-4">Specialty & Role</th>
                <th className="py-3 px-4 text-center">Clients</th>
                <th className="py-3 px-4 text-center">Sessions (Mar)</th>
                <th className="py-3 px-4 text-right">Base Salary</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E6ED] text-xs">
              {filteredTrainers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Dumbbell className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-700 text-sm">No trainers found</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {search ? 'Try adjusting your search' : 'Click "+ Onboard Trainer" to register your gym staff.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredTrainers.map((t) => (
                <tr key={t.id} className="hover:bg-[#F5F7FA] transition-colors">
                  <td className="py-3 px-4">
                    <div className="font-semibold text-[#1A2333]">{t.name}</div>
                    <div className="text-[11px] text-[#6B7686]">{t.phone}</div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="text-[#1A2333] font-medium">{t.role}</div>
                    <div className="text-[11px] text-[#2F6FED]">{t.specialty}</div>
                  </td>
                  <td className="py-3 px-4 text-center font-bold tabular-nums text-[#1A2333]">
                    {t.activeClients}
                  </td>
                  <td className="py-3 px-4 text-center font-bold tabular-nums text-[#1A2333]">
                    {t.sessionsThisMonth}
                  </td>
                  <td className="py-3 px-4 text-right font-semibold tabular-nums text-[#1A2333]">
                    {formatINR(t.baseSalary)}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{
                          backgroundColor:
                            t.status === 'ACTIVE'
                              ? '#2E9E6D'
                              : t.status === 'IN_SESSION'
                              ? '#2F6FED'
                              : '#D99A3E',
                        }}
                      />
                      <span className="font-medium text-[#1A2333]">
                        {t.status === 'ACTIVE'
                          ? 'Available'
                          : t.status === 'IN_SESSION'
                          ? 'In Session'
                          : 'On Leave'}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => setSelectedTrainer(t)}
                      className="px-2.5 py-1 text-xs font-medium border border-[#E2E6ED] hover:border-[#2F6FED] hover:text-[#2F6FED] rounded-md transition-colors text-[#1A2333] bg-white"
                    >
                      Profile
                    </button>
                  </td>
                </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Trainer Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden animate-fade-in flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center shadow-2xs">
                  <Dumbbell className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-heading text-lg font-bold text-slate-900 tracking-tight">
                    Add Trainer / Coach to Roster
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Register fitness coach profile, specialty, compensation & commission
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-2 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddTrainer} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Left Column */}
                <div className="space-y-3.5">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Coach Profile Details
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Paul Saji"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-medium text-slate-900 placeholder-slate-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Phone Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="+91 98..."
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-medium text-slate-900 placeholder-slate-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Specialty Discipline
                    </label>
                    <select
                      value={form.specialty}
                      onChange={(e) => setForm({ ...form, specialty: e.target.value })}
                      className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-medium text-slate-800"
                    >
                      <option value="Strength & Conditioning">Strength & Conditioning</option>
                      <option value="Pilates & Yoga">Pilates & Yoga</option>
                      <option value="CrossFit & HIIT">CrossFit & HIIT</option>
                      <option value="Nutrition">Sports Nutrition</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Designation / Title
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Head Coach / Floor Lead"
                      value={form.role}
                      onChange={(e) => setForm({ ...form, role: e.target.value })}
                      className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-medium text-slate-900 placeholder-slate-400"
                    />
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-3.5">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Experience & Compensation
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Experience (Years)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={form.experienceYears}
                      onChange={(e) => setForm({ ...form, experienceYears: Number(e.target.value) })}
                      className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-medium text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Monthly Base Salary (₹)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={form.baseSalary}
                      onChange={(e) => setForm({ ...form, baseSalary: Number(e.target.value) })}
                      className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-bold tabular-nums text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      PT Commission (₹ / session)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={form.commissionPerSession}
                      onChange={(e) =>
                        setForm({ ...form, commissionPerSession: Number(e.target.value) })
                      }
                      className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-bold tabular-nums text-slate-900"
                    />
                  </div>

                  <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-xl text-xs text-blue-900">
                    <span className="font-bold">Automated Payroll Integration:</span> Coach base compensation and session commissions are synced with the GymERP monthly payroll ledger.
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-5 py-2.5 border border-slate-200 hover:bg-slate-100 rounded-xl text-xs font-semibold text-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md hover:shadow-lg disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{isSubmitting ? 'Saving...' : 'Register Trainer'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Trainer Detail Modal */}
      {selectedTrainer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white border border-[#E2E6ED] rounded-xl shadow-card w-full max-w-md overflow-hidden animate-fade-in">
            <div className="p-6 space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-[#E2E6ED]">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-[#E8EFFE] text-[#2F6FED] font-bold text-sm flex items-center justify-center">
                    {selectedTrainer.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')}
                  </div>
                  <div>
                    <h3 className="font-heading text-base font-bold text-[#1A2333]">
                      {selectedTrainer.name}
                    </h3>
                    <div className="text-xs text-[#6B7686]">{selectedTrainer.role}</div>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedTrainer(null)}
                  className="text-[#6B7686] hover:text-[#1A2333]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-1.5 border-b border-[#E2E6ED]">
                  <span className="text-[#6B7686]">Specialty:</span>
                  <span className="font-medium text-[#2F6FED]">{selectedTrainer.specialty}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[#E2E6ED]">
                  <span className="text-[#6B7686]">Phone:</span>
                  <span className="font-medium text-[#1A2333]">{selectedTrainer.phone}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[#E2E6ED]">
                  <span className="text-[#6B7686]">Email:</span>
                  <span className="font-medium text-[#1A2333]">{selectedTrainer.email}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[#E2E6ED]">
                  <span className="text-[#6B7686]">Active Clients Assigned:</span>
                  <span className="font-bold text-[#1A2333]">{selectedTrainer.activeClients}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[#E2E6ED]">
                  <span className="text-[#6B7686]">Sessions Conducted This Month:</span>
                  <span className="font-bold text-[#1A2333]">
                    {selectedTrainer.sessionsThisMonth}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[#E2E6ED]">
                  <span className="text-[#6B7686]">Base Monthly Salary:</span>
                  <span className="font-semibold text-[#1A2333] tabular-nums">
                    {formatINR(selectedTrainer.baseSalary)}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[#E2E6ED]">
                  <span className="text-[#6B7686]">Incentive Rate:</span>
                  <span className="font-semibold text-[#1A2333] tabular-nums">
                    {formatINR(selectedTrainer.commissionPerSession)} / session
                  </span>
                </div>

                <div className="pt-2">
                  <span className="font-semibold text-[#1A2333] block mb-1.5">
                    Certifications & Accreditations:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedTrainer.certifications.map((c, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded bg-[#F5F7FA] border border-[#E2E6ED] text-[11px] text-[#6B7686]"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-[#E2E6ED] flex items-center justify-end">
                <button
                  onClick={() => setSelectedTrainer(null)}
                  className="px-4 py-2 bg-[#2F6FED] hover:bg-[#2558bf] text-white rounded-lg text-xs font-medium"
                >
                  Close Profile
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(TrainersPage);

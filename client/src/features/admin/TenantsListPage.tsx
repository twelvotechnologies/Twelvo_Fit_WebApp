import { useState, useEffect } from 'react';
import {
  Building2,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Users,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  MapPin,
  Mail,
  Phone,
  Power,
  ChevronLeft,
  ChevronRight,
  Eye,
} from 'lucide-react';
import { adminApi, TenantItem, CreatedTenantResult } from '../../api/adminApi';
import AddTenantModal from './AddTenantModal';
import TenantConfirmationModal from './TenantConfirmationModal';
import TenantDetailsModal from './TenantDetailsModal';

export default function TenantsListPage() {
  const [tenants, setTenants] = useState<TenantItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedTenantForDetails, setSelectedTenantForDetails] = useState<TenantItem | null>(null);
  const [confirmationData, setConfirmationData] = useState<{
    result: CreatedTenantResult;
    plainPassword: string;
  } | null>(null);

  const fetchTenants = async () => {
    setLoading(true);
    try {
      const data = await adminApi.getTenants({
        page,
        limit,
        search,
        status: statusFilter,
      });
      setTenants(data.tenants || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch (err: any) {
      console.error('Failed to load tenants:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenants();
  }, [page, statusFilter]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchTenants();
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  /**
   * Toggles tenant status (active <-> suspended)
   */
  const handleToggleStatus = async (tenant: TenantItem) => {
    setActionLoadingId(tenant.tenantId);
    try {
      const updated = await adminApi.toggleTenantStatus(tenant.tenantId);
      setTenants((prev) =>
        prev.map((t) => (t.tenantId === tenant.tenantId ? { ...t, status: updated.status } : t))
      );
    } catch (err: any) {
      alert(err.message || 'Failed to update tenant status');
    } finally {
      setActionLoadingId(null);
    }
  };

  /**
   * Callback when a new gym is created from AddTenantModal
   */
  const handleTenantCreated = (result: CreatedTenantResult, plainPassword: string) => {
    setConfirmationData({ result, plainPassword });
    // Refresh list
    fetchTenants();
  };

  // Metrics computation
  const activeCount = tenants.filter((t) => t.status === 'active').length;
  const suspendedCount = tenants.filter((t) => t.status === 'suspended').length;
  const totalMembersAcrossPlatform = tenants.reduce((acc, t) => acc + (t.membersCount || 0), 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-fadeIn">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" /> Super-Admin Console
            </span>
            <span className="text-[11px] text-slate-400 font-medium">Multi-Tenant Platform</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 font-heading tracking-tight">
            Tenant Management
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitor, onboard, and manage all gym organizations and owners across the platform
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-semibold rounded-xl shadow-sm transition-all hover:shadow-md"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Gym</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-medium block">Total Gyms</span>
            <span className="text-xl font-bold text-slate-900 font-heading">{total}</span>
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-medium block">Active Gyms</span>
            <span className="text-xl font-bold text-emerald-600 font-heading">{activeCount}</span>
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-medium block">Suspended</span>
            <span className="text-xl font-bold text-amber-600 font-heading">{suspendedCount}</span>
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-medium block">Total Members</span>
            <span className="text-xl font-bold text-slate-900 font-heading">
              {totalMembersAcrossPlatform}
            </span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search gym, city, owner, code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <Filter className="w-3.5 h-3.5" />
            <span>Status:</span>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-700 font-medium focus:outline-none focus:border-blue-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="suspended">Suspended Only</option>
            <option value="trial">Trial</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <button
            onClick={fetchTenants}
            title="Refresh list"
            className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tenants Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">Gym Name & Code</th>
                <th className="py-3.5 px-4">Owner & Contact</th>
                <th className="py-3.5 px-4">Location</th>
                <th className="py-3.5 px-4">SaaS Plan</th>
                <th className="py-3.5 px-4 text-center">Members</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {loading && tenants.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                    <span>Loading gym organizations...</span>
                  </td>
                </tr>
              ) : tenants.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Building2 className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-slate-700 text-sm">No gyms found</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {search ? 'Try adjusting your search criteria' : 'Click "+ Add New Gym" to onboard your first gym tenant.'}
                    </p>
                  </td>
                </tr>
              ) : (
                tenants.map((tenant) => (
                  <tr
                    key={tenant.tenantId}
                    className="hover:bg-slate-50/80 transition-colors group"
                  >
                    {/* Gym Name & Code */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shadow-sm flex-shrink-0">
                          {tenant.tenantPrefix || 'GM'}
                        </div>
                        <div>
                          <span className="font-semibold text-slate-900 block group-hover:text-blue-600 transition-colors">
                            {tenant.gymName}
                          </span>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="font-mono text-[10px] bg-slate-100 px-1.5 py-0.2 rounded text-slate-600 border border-slate-200/60">
                              {tenant.tenantCode}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              Prefix: [{tenant.tenantPrefix}]
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Owner & Contact */}
                    <td className="py-3.5 px-4">
                      <div>
                        <span className="font-medium text-slate-900 block">
                          {tenant.ownerName || '—'}
                        </span>
                        <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-0.5">
                          <Mail className="w-3 h-3 text-slate-400 flex-shrink-0" />
                          <span className="truncate max-w-[150px]">{tenant.email}</span>
                        </div>
                        {tenant.phoneNumber && (
                          <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-0.5">
                            <Phone className="w-2.5 h-2.5" />
                            <span>{tenant.phoneNumber}</span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Location */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <span>
                          {tenant.city || tenant.state
                            ? `${tenant.city || ''}${tenant.city && tenant.state ? ', ' : ''}${tenant.state || ''}`
                            : '—'}
                        </span>
                      </div>
                    </td>

                    {/* Plan */}
                    <td className="py-3.5 px-4">
                      <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200/70">
                        {tenant.planName || 'Standard SaaS'}
                      </span>
                    </td>

                    {/* Members */}
                    <td className="py-3.5 px-4 text-center">
                      <span className="font-semibold text-slate-900 bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full text-xs">
                        {tenant.membersCount || 0}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      {tenant.status === 'active' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Active
                        </span>
                      ) : tenant.status === 'suspended' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200/60">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                          Suspended
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600">
                          {tenant.status}
                        </span>
                      )}
                    </td>

                    {/* Actions: View Details & Toggle Status */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedTenantForDetails(tenant)}
                          title="View Organization Details"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all border border-slate-200 text-slate-700 bg-white hover:bg-slate-50"
                        >
                          <Eye className="w-3 h-3 text-slate-500" />
                          <span>View</span>
                        </button>

                        <button
                          onClick={() => handleToggleStatus(tenant)}
                          disabled={actionLoadingId === tenant.tenantId}
                          title={tenant.status === 'active' ? 'Suspend Gym Access' : 'Activate Gym'}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all border ${
                            tenant.status === 'active'
                              ? 'text-amber-700 bg-amber-50/70 hover:bg-amber-100 border-amber-200/60'
                              : 'text-emerald-700 bg-emerald-50/70 hover:bg-emerald-100 border-emerald-200/60'
                          }`}
                        >
                          {actionLoadingId === tenant.tenantId ? (
                            <RefreshCw className="w-3 h-3 animate-spin" />
                          ) : (
                            <Power className="w-3 h-3" />
                          )}
                          <span>{tenant.status === 'active' ? 'Suspend' : 'Activate'}</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {total > 0 && (
          <div className="flex items-center justify-between px-4 py-3 bg-slate-50/60 border-t border-slate-100 text-xs text-slate-500">
            <div>
              Showing <span className="font-semibold text-slate-700">{(page - 1) * limit + 1}</span> to{' '}
              <span className="font-semibold text-slate-700">
                {Math.min(page * limit, total)}
              </span>{' '}
              of <span className="font-semibold text-slate-700">{total}</span> gyms
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || loading}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-white disabled:opacity-40 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2 font-medium">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || loading}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-white disabled:opacity-40 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Gym Modal */}
      <AddTenantModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={handleTenantCreated}
      />

      {/* One-Time Credentials Confirmation Modal */}
      <TenantConfirmationModal
        isOpen={!!confirmationData}
        tenantData={confirmationData?.result || null}
        plainPassword={confirmationData?.plainPassword || ''}
        onClose={() => setConfirmationData(null)}
      />

      {/* Tenant Details Modal */}
      <TenantDetailsModal
        isOpen={!!selectedTenantForDetails}
        tenant={selectedTenantForDetails}
        onClose={() => setSelectedTenantForDetails(null)}
        onToggleStatus={handleToggleStatus}
        isActionLoading={actionLoadingId === selectedTenantForDetails?.tenantId}
      />
    </div>
  );
}

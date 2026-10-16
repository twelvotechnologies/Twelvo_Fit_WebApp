import {
  X,
  Mail,
  Phone,
  MapPin,
  Power,
  Copy,
  Check,
} from 'lucide-react';
import { useState } from 'react';
import { TenantItem } from '../../api/adminApi';

interface TenantDetailsModalProps {
  isOpen: boolean;
  tenant: TenantItem | null;
  onClose: () => void;
  onToggleStatus: (tenant: TenantItem) => void;
  isActionLoading: boolean;
}

export default function TenantDetailsModal({
  isOpen,
  tenant,
  onClose,
  onToggleStatus,
  isActionLoading,
}: TenantDetailsModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !tenant) return null;

  const handleCopyDetails = async () => {
    const text = `Gym: ${tenant.gymName} (${tenant.tenantCode})
Prefix: ${tenant.tenantPrefix}
Owner: ${tenant.ownerName || '—'}
Email: ${tenant.email}
Phone: ${tenant.phoneNumber || '—'}
Status: ${tenant.status}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Ignore clipboard fallback
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white font-bold text-sm flex items-center justify-center shadow-sm">
              {tenant.tenantPrefix || 'GM'}
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 font-heading">
                {tenant.gymName}
              </h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="font-mono text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-bold">
                  {tenant.tenantCode}
                </span>
                <span className="text-xs text-slate-400">
                  Prefix: [{tenant.tenantPrefix}]
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 text-xs text-slate-700">
          {/* Status and Summary Cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                Account Status
              </span>
              {tenant.status === 'active' ? (
                <span className="inline-flex items-center gap-1 font-bold text-emerald-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Active
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 font-bold text-amber-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  Suspended
                </span>
              )}
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                Total Members
              </span>
              <span className="font-bold text-slate-900 text-sm">
                {tenant.membersCount || 0}
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                SaaS Plan
              </span>
              <span className="font-semibold text-slate-900 truncate block">
                {tenant.planName || 'Standard SaaS'}
              </span>
            </div>
          </div>

          {/* Contact Details */}
          <div className="space-y-2.5 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
            <h3 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
              Organization & Contact Information
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <span className="text-slate-400 block text-[10px]">Owner / Director</span>
                <span className="font-medium text-slate-800">
                  {tenant.ownerName || 'Not Specified'}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block text-[10px]">Email Address</span>
                <div className="flex items-center gap-1 text-slate-800">
                  <Mail className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                  <span className="truncate">{tenant.email}</span>
                </div>
              </div>

              <div>
                <span className="text-slate-400 block text-[10px]">Contact Phone</span>
                <div className="flex items-center gap-1 text-slate-800">
                  <Phone className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                  <span>{tenant.phoneNumber || 'Not Specified'}</span>
                </div>
              </div>

              <div>
                <span className="text-slate-400 block text-[10px]">Location</span>
                <div className="flex items-center gap-1 text-slate-800">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                  <span>
                    {tenant.city || tenant.state
                      ? `${tenant.city || ''}${tenant.city && tenant.state ? ', ' : ''}${tenant.state || ''}`
                      : 'Not Specified'}
                  </span>
                </div>
              </div>

              {tenant.gstNumber && (
                <div className="sm:col-span-2">
                  <span className="text-slate-400 block text-[10px]">GST Number</span>
                  <span className="font-mono font-medium text-slate-800">
                    {tenant.gstNumber}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Audit Timestamp */}
          <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
            <span>
              Onboarded: {new Date(tenant.createdAt).toLocaleDateString()}
            </span>
            <span>Last Updated: {new Date(tenant.updatedAt).toLocaleDateString()}</span>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/40">
          <button
            onClick={handleCopyDetails}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-all"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy Summary'}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onToggleStatus(tenant)}
              disabled={isActionLoading}
              className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl transition-all ${
                tenant.status === 'active'
                  ? 'bg-amber-600 hover:bg-amber-700 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              <Power className="w-3.5 h-3.5" />
              <span>{tenant.status === 'active' ? 'Suspend Gym' : 'Activate Gym'}</span>
            </button>

            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

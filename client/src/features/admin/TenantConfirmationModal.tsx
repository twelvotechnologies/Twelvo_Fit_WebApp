import { useState } from 'react';
import {
  CheckCircle2,
  Copy,
  Check,
  ShieldAlert,
  Building2,
  ArrowRight,
  Key,
} from 'lucide-react';
import { CreatedTenantResult } from '../../api/adminApi';

interface TenantConfirmationModalProps {
  isOpen: boolean;
  tenantData: CreatedTenantResult | null;
  plainPassword: string;
  onClose: () => void;
}

export default function TenantConfirmationModal({
  isOpen,
  tenantData,
  plainPassword,
  onClose,
}: TenantConfirmationModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !tenantData) return null;

  const { tenant, user } = tenantData;

  const credentialsSummary = `=== Gym ERP Admin Credentials ===
Gym: ${tenant.gymName} (${tenant.tenantCode})
Prefix: ${tenant.tenantPrefix}
Owner: ${tenant.ownerName || 'Gym Owner'}
Email: ${tenant.email}
Username: ${user.username}
Password: ${plainPassword}
Login URL: ${window.location.origin}/login
=================================`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(credentialsSummary);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      // Fallback manual selection
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
        {/* Celebration Top Banner */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-6 text-white text-center">
          <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner">
            <CheckCircle2 className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-xl font-bold font-heading">Gym Created Successfully!</h2>
          <p className="text-xs text-emerald-100 mt-1">
            <strong>{tenant.gymName}</strong> is now live on the platform
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Gym Overview Badge */}
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs">
            <div className="flex items-center gap-2.5">
              <Building2 className="w-4 h-4 text-slate-500" />
              <div>
                <span className="font-semibold text-slate-800">{tenant.gymName}</span>
                <span className="text-slate-400 block text-[11px]">{tenant.city ? `${tenant.city}, ` : ''}{tenant.email}</span>
              </div>
            </div>
            <div className="text-right">
              <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200/60 text-[11px]">
                {tenant.tenantCode}
              </span>
              <span className="text-slate-400 block text-[10px] mt-0.5">Prefix: [{tenant.tenantPrefix}]</span>
            </div>
          </div>

          {/* Credentials Card */}
          <div className="bg-slate-900 rounded-xl p-4.5 text-white space-y-3.5 shadow-md">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-emerald-400" /> Owner Login Credentials
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors border border-emerald-500/30"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy Credentials'}</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
              <div className="p-2.5 bg-slate-800/80 rounded-lg border border-slate-700/60">
                <span className="text-[10px] text-slate-400 block uppercase font-sans mb-1">Username</span>
                <span className="text-white font-bold select-all">{user.username}</span>
              </div>

              <div className="p-2.5 bg-slate-800/80 rounded-lg border border-slate-700/60">
                <span className="text-[10px] text-slate-400 block uppercase font-sans mb-1">Initial Password</span>
                <span className="text-emerald-400 font-bold select-all tracking-wider">{plainPassword}</span>
              </div>
            </div>
          </div>

          {/* Security Warning Notice */}
          <div className="flex items-start gap-2.5 p-3.5 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-xs">
            <ShieldAlert className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-bold text-amber-800">Save these credentials now!</p>
              <p className="text-[11px] text-amber-700 leading-relaxed">
                This password has been securely hashed in the database using <strong>bcrypt</strong>.
                For privacy and security, it will <strong>never be shown again</strong>. Share it with the gym owner immediately.
              </p>
            </div>
          </div>

          {/* Close Action */}
          <div className="pt-2 flex items-center justify-end">
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2"
            >
              <span>Done & Return to Tenants</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

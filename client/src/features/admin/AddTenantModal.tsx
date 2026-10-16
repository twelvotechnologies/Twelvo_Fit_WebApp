import { useState, type ChangeEvent, type FormEvent } from 'react';
import {
  X,
  Building2,
  KeyRound,
  RefreshCw,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { adminApi, CreateTenantInput, CreatedTenantResult } from '../../api/adminApi';

interface AddTenantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (result: CreatedTenantResult, plainPassword: string) => void;
}

export default function AddTenantModal({ isOpen, onClose, onSuccess }: AddTenantModalProps) {
  const [formData, setFormData] = useState<CreateTenantInput>({
    gymName: '',
    ownerName: '',
    email: '',
    phone: '',
    city: '',
    state: '',
    gstNumber: '',
    tenantPrefix: '',
    username: '',
    password: '',
  });

  const [isSuggesting, setIsSuggesting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [hasManuallyEditedCredentials, setHasManuallyEditedCredentials] = useState(false);

  if (!isOpen) return null;

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error for this field
    if (fieldErrors[name]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
    setError(null);
  };

  /**
   * Auto-suggest credentials when Gym Name loses focus (onBlur)
   */
  const handleGymNameBlur = async () => {
    const name = formData.gymName.trim();
    if (!name || name.length < 2) return;

    // Only auto-fill if the user hasn't already customized their credentials
    if (!hasManuallyEditedCredentials || !formData.tenantPrefix || !formData.username) {
      await fetchSuggestions(name, formData.city, formData.ownerName);
    }
  };

  /**
   * Re-evaluates suggestions when City loses focus if credentials not yet customized
   */
  const handleCityBlur = async () => {
    const name = formData.gymName.trim();
    if (!name || name.length < 2) return;
    if (!hasManuallyEditedCredentials) {
      await fetchSuggestions(name, formData.city, formData.ownerName);
    }
  };

  const fetchSuggestions = async (gymName: string, city?: string, ownerName?: string) => {
    setIsSuggesting(true);
    try {
      const suggestions = await adminApi.suggestCredentials({
        gymName,
        city: (city !== undefined ? city : formData.city)?.trim(),
        ownerName: (ownerName !== undefined ? ownerName : formData.ownerName)?.trim(),
      });
      setFormData((prev) => ({
        ...prev,
        tenantPrefix: suggestions.tenantPrefix,
        username: suggestions.username,
        password: suggestions.password,
      }));
    } catch (err: any) {
      console.warn('Could not auto-generate suggestions:', err);
    } finally {
      setIsSuggesting(false);
    }
  };

  /**
   * Regenerates password following the algorithm with randomized PIN
   */
  const handleRegeneratePassword = async () => {
    setIsSuggesting(true);
    try {
      const suggestions = await adminApi.suggestCredentials({
        gymName: formData.gymName || 'Twelvo Gym',
        city: formData.city,
        ownerName: formData.ownerName,
        randomize: true,
      });
      setFormData((prev) => ({
        ...prev,
        password: suggestions.password,
      }));
    } catch {
      // Fallback local password generation matching algorithm
      const rawBase = formData.city?.trim() || formData.gymName?.trim() || 'Twelvo';
      const cleaned = rawBase.replace(/[^a-zA-Z0-9]/g, '');
      const baseWord = cleaned ? cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase() : 'Twelvo';
      const digits = Math.floor(1000 + Math.random() * 9000);
      setFormData((prev) => ({ ...prev, password: `${baseWord}@${digits}` }));
    } finally {
      setIsSuggesting(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    // Client-side quick validations
    const errors: Record<string, string> = {};
    if (!formData.gymName.trim()) errors.gymName = 'Gym name is required';
    if (!formData.email.trim()) errors.email = 'Email address is required';
    if (!formData.tenantPrefix.trim()) errors.tenantPrefix = 'Prefix is required';
    if (!formData.username.trim()) errors.username = 'Username is required';
    if (!formData.password || formData.password.length < 8) {
      errors.password = 'Password must be at least 8 characters long';
    } else if (
      !/[A-Z]/.test(formData.password) ||
      !/[a-z]/.test(formData.password) ||
      !/[0-9]/.test(formData.password) ||
      !/[@$!%*?&#^_\-.]/.test(formData.password)
    ) {
      errors.password = 'Password must contain uppercase, lowercase, a number, and a symbol (e.g. @)';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setIsSubmitting(true);
    try {
      const plainPassword = formData.password;
      const result = await adminApi.createTenant({
        ...formData,
        tenantPrefix: formData.tenantPrefix.trim().toUpperCase(),
        username: formData.username.trim().toLowerCase(),
      });

      // Pass result to parent confirmation modal
      onSuccess(result, plainPassword);
      onClose();
    } catch (err: any) {
      const msg = err.message || 'Failed to create gym tenant';
      setError(msg);
      if (err.field) {
        setFieldErrors({ [err.field]: msg });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/10 flex items-center justify-center text-blue-600">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 font-heading">Onboard New Gym Tenant</h2>
              <p className="text-xs text-slate-500">Create organization & initial gym owner credentials</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-red-700 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Section 1: Gym Information */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold tracking-wider text-slate-400 uppercase">1. Gym Details</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Gym Name */}
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Gym Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    name="gymName"
                    required
                    placeholder="e.g. Twelvo Gym & Fitness"
                    value={formData.gymName}
                    onChange={handleChange}
                    onBlur={handleGymNameBlur}
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm transition-all focus:ring-2 focus:ring-blue-500/20 focus:outline-none ${
                      fieldErrors.gymName ? 'border-red-400 bg-red-50/20' : 'border-slate-200 focus:border-blue-500'
                    }`}
                  />
                  {isSuggesting && (
                    <div className="absolute right-3 top-3 flex items-center gap-1.5 text-xs text-blue-600 bg-white px-1">
                      <Sparkles className="w-3.5 h-3.5 animate-spin" />
                      <span>Suggesting...</span>
                    </div>
                  )}
                </div>
                {fieldErrors.gymName && (
                  <p className="mt-1 text-[11px] text-red-500">{fieldErrors.gymName}</p>
                )}
              </div>

              {/* Owner Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Owner / Primary Contact Name
                </label>
                <input
                  type="text"
                  name="ownerName"
                  placeholder="e.g. Paul Saji"
                  value={formData.ownerName}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Official Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  required
                  placeholder="owner@twelvogym.com"
                  value={formData.email}
                  onChange={handleChange}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm transition-all focus:ring-2 focus:ring-blue-500/20 focus:outline-none ${
                    fieldErrors.email ? 'border-red-400 bg-red-50/20' : 'border-slate-200 focus:border-blue-500'
                  }`}
                />
                {fieldErrors.email && (
                  <p className="mt-1 text-[11px] text-red-500">{fieldErrors.email}</p>
                )}
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Phone Number</label>
                <input
                  type="tel"
                  name="phone"
                  placeholder="+91 9876543210"
                  value={formData.phone}
                  onChange={handleChange}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm transition-all focus:ring-2 focus:ring-blue-500/20 focus:outline-none ${
                    fieldErrors.phone ? 'border-red-400 bg-red-50/20' : 'border-slate-200 focus:border-blue-500'
                  }`}
                />
                {fieldErrors.phone && (
                  <p className="mt-1 text-[11px] text-red-500">{fieldErrors.phone}</p>
                )}
              </div>

              {/* GST Number */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  GST Number <span className="text-slate-400 text-[10px]">(Optional)</span>
                </label>
                <input
                  type="text"
                  name="gstNumber"
                  placeholder="29AAAAA0000A1Z5"
                  value={formData.gstNumber}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm uppercase focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                />
              </div>

              {/* City */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">City</label>
                <input
                  type="text"
                  name="city"
                  placeholder="e.g. Bengaluru"
                  value={formData.city}
                  onChange={handleChange}
                  onBlur={handleCityBlur}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                />
              </div>

              {/* State */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">State</label>
                <input
                  type="text"
                  name="state"
                  placeholder="e.g. Karnataka"
                  value={formData.state}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Auto-Generated Login Credentials */}
          <div className="p-4.5 bg-gradient-to-br from-slate-50 to-blue-50/40 rounded-xl border border-blue-100/70 space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-blue-600" />
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  2. Platform Login Credentials
                </h3>
              </div>
              <span className="text-[10px] font-medium bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5" /> Auto-Generated & Editable
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Tenant Prefix */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tenant Prefix <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="tenantPrefix"
                  required
                  maxLength={6}
                  placeholder="TW"
                  value={formData.tenantPrefix}
                  onChange={(e) => {
                    setHasManuallyEditedCredentials(true);
                    handleChange(e);
                  }}
                  className={`w-full px-3 py-2 rounded-lg border text-sm font-mono uppercase tracking-wider transition-all focus:ring-2 focus:ring-blue-500/20 focus:outline-none ${
                    fieldErrors.tenantPrefix ? 'border-red-400 bg-red-50/30' : 'border-slate-200 focus:border-blue-500 bg-white'
                  }`}
                />
                <span className="text-[10px] text-slate-400">Used in member & staff codes</span>
                {fieldErrors.tenantPrefix && (
                  <p className="text-[11px] text-red-500 mt-0.5">{fieldErrors.tenantPrefix}</p>
                )}
              </div>

              {/* Username */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Owner Username <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="username"
                  required
                  placeholder="twadmin"
                  value={formData.username}
                  onChange={(e) => {
                    setHasManuallyEditedCredentials(true);
                    handleChange(e);
                  }}
                  className={`w-full px-3 py-2 rounded-lg border text-sm font-mono transition-all focus:ring-2 focus:ring-blue-500/20 focus:outline-none ${
                    fieldErrors.username ? 'border-red-400 bg-red-50/30' : 'border-slate-200 focus:border-blue-500 bg-white'
                  }`}
                />
                <span className="text-[10px] text-slate-400">Unique login username</span>
                {fieldErrors.username && (
                  <p className="text-[11px] text-red-500 mt-0.5">{fieldErrors.username}</p>
                )}
              </div>

              {/* Password (Visible Plain Text during creation as requested) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Initial Password <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleRegeneratePassword}
                    title="Regenerate random password"
                    className="text-[10px] text-blue-600 hover:text-blue-800 flex items-center gap-1 font-medium transition-colors"
                  >
                    <RefreshCw className={`w-2.5 h-2.5 ${isSuggesting ? 'animate-spin' : ''}`} />
                    Regenerate
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    name="password"
                    required
                    placeholder="Newgymfit@1234"
                    value={formData.password}
                    onChange={(e) => {
                      setHasManuallyEditedCredentials(true);
                      handleChange(e);
                    }}
                    className={`w-full px-3 py-2 rounded-lg border text-sm font-mono font-medium tracking-wide transition-all focus:ring-2 focus:ring-blue-500/20 focus:outline-none ${
                      fieldErrors.password ? 'border-red-400 bg-red-50/30 text-red-600' : 'border-slate-200 focus:border-blue-500 bg-white text-slate-900'
                    }`}
                  />
                </div>
                <span className="text-[10px] text-emerald-600 flex items-center gap-0.5 mt-0.5">
                  <CheckCircle2 className="w-2.5 h-2.5" /> Plaintext visible now only
                </span>
                {fieldErrors.password && (
                  <p className="text-[11px] text-red-500 mt-0.5">{fieldErrors.password}</p>
                )}
              </div>
            </div>

            <div className="text-[11px] text-slate-500 bg-white/70 p-2.5 rounded-lg border border-slate-100 flex items-start gap-2">
              <Lock className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
              <span>
                <strong>One-Time Visibility:</strong> The initial password is shown in plain text so you can copy it.
                Upon submission, it is encrypted via <strong>bcrypt (cost factor 12)</strong> and can never be retrieved again.
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl shadow-sm transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Creating Tenant...</span>
                </>
              ) : (
                <>
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Create Gym Tenant</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

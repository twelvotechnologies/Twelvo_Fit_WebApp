import { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/useAuthStore';
import { ShieldAlert, RefreshCw } from 'lucide-react';

interface ProtectedRouteProps {
  allowedRoles?: string[];
}

export default function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const location = useLocation();
  const { isAuthenticated, isLoading, user, refreshSession } = useAuthStore();

  // Attempt session refresh if tokens exist but user isn't authenticated yet
  useEffect(() => {
    if (!isAuthenticated) {
      const refreshToken = localStorage.getItem('gymerp_refresh_token');
      if (refreshToken) {
        refreshSession().catch(() => {});
      }
    }
  }, [isAuthenticated, refreshSession]);

  // Loading state during initial session check
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white p-4">
        <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mb-3" />
        <span className="text-xs font-medium text-slate-400">
          Verifying secure session...
        </span>
      </div>
    );
  }

  // Not authenticated -> redirect to login with original destination
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Role check if specific roles are required for this route
  if (allowedRoles && allowedRoles.length > 0) {
    const userRole = user.role?.toLowerCase() || '';
    const isAllowed =
      userRole === 'super_admin' ||
      allowedRoles.some((r) => r.toLowerCase() === userRole);

    if (!isAllowed) {
      return (
        <div className="min-h-[70vh] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-lg space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto ring-8 ring-rose-50">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-xl font-bold font-heading text-slate-900">
                Access Restricted
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Your role (<strong>{user.role}</strong>) does not have authorization
                to view this section.
              </p>
            </div>
            <div className="pt-2">
              <button
                onClick={() => window.history.back()}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-all"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      );
    }
  }

  return <Outlet />;
}

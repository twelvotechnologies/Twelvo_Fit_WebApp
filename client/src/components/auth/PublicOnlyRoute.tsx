import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/useAuthStore';

/**
 * Route wrapper that prevents authenticated users from viewing public auth pages (e.g. /login).
 * If already logged in, redirects to the attempted destination or role home page.
 */
export default function PublicOnlyRoute() {
  const { isAuthenticated, user } = useAuthStore();
  const location = useLocation();

  if (isAuthenticated && user) {
    const from = (location.state as any)?.from?.pathname;
    if (from && from !== '/login') {
      return <Navigate to={from} replace />;
    }

    if (user.role === 'super_admin') {
      return <Navigate to="/admin/tenants" replace />;
    }

    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

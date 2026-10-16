import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { Suspense } from 'react';
import AppLayout from '../layouts/AppLayout';
import RouteErrorBoundary from '../components/RouteErrorBoundary';
import ProtectedRoute from '../components/auth/ProtectedRoute';
import PublicOnlyRoute from '../components/auth/PublicOnlyRoute';
import { lazyWithRetry } from '../utils/lazyWithRetry';
import { useAuthStore } from '../stores/useAuthStore';

// Lazy load feature pages with automatic chunk retry and dev reload handling
const DashboardPage = lazyWithRetry(() => import('../features/dashboard/DashboardPage'));
const PayrollListPage = lazyWithRetry(() => import('../features/payroll/PayrollListPage'));
const StaffDetailPage = lazyWithRetry(() => import('../features/payroll/StaffDetailPage'));
const ReceiptsPage = lazyWithRetry(() => import('../features/receipts/ReceiptsPage'));
const MembersPage = lazyWithRetry(() => import('../features/members/MembersPage'));
const TrainersPage = lazyWithRetry(() => import('../features/trainers/TrainersPage'));
const SettingsPage = lazyWithRetry(() => import('../features/settings/SettingsPage'));
const ExpensesPage = lazyWithRetry(() => import('../features/expenses/ExpensesPage'));
const TenantsListPage = lazyWithRetry(() => import('../features/admin/TenantsListPage'));
const ReportsPage = lazyWithRetry(() => import('../features/reports/ReportsPage'));
const InventoryPage = lazyWithRetry(() => import('../features/inventory/InventoryPage'));
const NotFoundPage = lazyWithRetry(() => import('../features/error/NotFoundPage'));
const LoginPage = lazyWithRetry(() => import('../features/auth/LoginPage'));

const PageLoader = ({ label = 'Loading page...' }: { label?: string }) => (
  <div className="flex items-center justify-center min-h-[50vh] p-8 text-xs text-slate-400 gap-2">
    <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />
    <span>{label}</span>
  </div>
);

// Dashboard router handler: trainers are redirected to receipts
const DashboardHome = () => {
  const { user } = useAuthStore();
  if (user?.role === 'trainer') {
    return <Navigate to="/receipts" replace />;
  }
  return (
    <Suspense fallback={<PageLoader label="Loading Dashboard..." />}>
      <DashboardPage />
    </Suspense>
  );
};

const router = createBrowserRouter([
  // Public Auth Route (restricted from already-authenticated users)
  {
    element: <PublicOnlyRoute />,
    errorElement: <RouteErrorBoundary />,
    children: [
      {
        path: '/login',
        element: (
          <Suspense
            fallback={
              <div className="min-h-screen bg-slate-950 flex items-center justify-center text-xs text-slate-400">
                Loading Login...
              </div>
            }
          >
            <LoginPage />
          </Suspense>
        ),
      },
    ],
  },

  // Protected Core Application Routes
  {
    element: <ProtectedRoute />, // Top-level authentication barrier
    errorElement: <RouteErrorBoundary />,
    children: [
      {
        element: <AppLayout />, // Persistent layout with sticky sidebar & header
        children: [
          {
            index: true,
            element: <DashboardHome />,
          },
          // Shared modules: accessible to both Gym Owners and Floor Trainers
          {
            path: 'receipts',
            element: (
              <Suspense fallback={<PageLoader label="Loading Receipts..." />}>
                <ReceiptsPage />
              </Suspense>
            ),
          },
          {
            path: 'members',
            element: (
              <Suspense fallback={<PageLoader label="Loading Member Management..." />}>
                <MembersPage />
              </Suspense>
            ),
          },

          // Admin-Only Modules: Restricted from Trainers (Gym Owner & Super Admin only)
          {
            element: <ProtectedRoute allowedRoles={['gym_owner', 'super_admin']} />,
            children: [
              {
                path: 'trainers',
                element: (
                  <Suspense fallback={<PageLoader label="Loading Trainers..." />}>
                    <TrainersPage />
                  </Suspense>
                ),
              },
              {
                path: 'reports',
                element: (
                  <Suspense fallback={<PageLoader label="Loading Reports & Analytics..." />}>
                    <ReportsPage />
                  </Suspense>
                ),
              },
              {
                path: 'inventory',
                element: (
                  <Suspense fallback={<PageLoader label="Loading Inventory & Assets..." />}>
                    <InventoryPage />
                  </Suspense>
                ),
              },
              {
                path: 'settings',
                element: (
                  <Suspense fallback={<PageLoader label="Loading Settings..." />}>
                    <SettingsPage />
                  </Suspense>
                ),
              },
              {
                path: 'payroll',
                element: (
                  <Suspense fallback={<PageLoader label="Loading Payroll..." />}>
                    <PayrollListPage />
                  </Suspense>
                ),
              },
              {
                path: 'payroll/:id',
                element: (
                  <Suspense fallback={<PageLoader label="Loading Staff Detail..." />}>
                    <StaffDetailPage />
                  </Suspense>
                ),
              },
              {
                path: 'expenses',
                element: (
                  <Suspense fallback={<PageLoader label="Loading Expenses & Payouts..." />}>
                    <ExpensesPage />
                  </Suspense>
                ),
              },
            ],
          },

          // Role-Restricted: Super-Admin Tenant Console
          {
            element: <ProtectedRoute allowedRoles={['super_admin', 'gym_owner']} />,
            children: [
              {
                path: 'admin',
                element: <Navigate to="/admin/tenants" replace />,
              },
              {
                path: 'admin/tenants',
                element: (
                  <Suspense fallback={<PageLoader label="Loading Super-Admin Tenants..." />}>
                    <TenantsListPage />
                  </Suspense>
                ),
              },
            ],
          },

          // 404 Route within app layout
          {
            path: '404',
            element: (
              <Suspense fallback={<PageLoader />}>
                <NotFoundPage />
              </Suspense>
            ),
          },
          // Catch-all route within layout
          {
            path: '*',
            element: (
              <Suspense fallback={<PageLoader />}>
                <NotFoundPage />
              </Suspense>
            ),
          },
        ],
      },
    ],
  },

  // Global wildcard fallback for any unhandled routes
  {
    path: '*',
    element: <Navigate to="/login" replace />,
  },
]);

export default function AppRouter() {
  return <RouterProvider router={router} />;
}

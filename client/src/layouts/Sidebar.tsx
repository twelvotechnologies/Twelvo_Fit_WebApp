import { memo } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Receipt,
  Users,
  Dumbbell,
  WalletCards,
  BarChart3,
  Package,
  Settings,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Activity,
  ReceiptText,
  type LucideIcon,
} from 'lucide-react';
import { useSidebarStore } from '../stores/useSidebarStore';

import { useAuthStore } from '../stores/useAuthStore';

interface NavItemConfig {
  to: string;
  label: string;
  icon: LucideIcon;
  isSoon?: boolean;
  roles?: string[];
}

const NAV_ITEMS: NavItemConfig[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, roles: ['gym_owner', 'super_admin'] },
  { to: '/receipts', label: 'Receipts', icon: Receipt, roles: ['gym_owner', 'trainer', 'super_admin'] },
  { to: '/members', label: 'Member Management', icon: Users, roles: ['gym_owner', 'trainer', 'super_admin'] },
  { to: '/trainers', label: 'Trainers', icon: Dumbbell, roles: ['gym_owner', 'super_admin'] },
  { to: '/payroll', label: 'Payroll', icon: WalletCards, roles: ['gym_owner', 'super_admin'] },
  { to: '/expenses', label: 'Expenses', icon: ReceiptText, roles: ['gym_owner', 'super_admin'] },
  { to: '/reports', label: 'Reports', icon: BarChart3, roles: ['gym_owner', 'super_admin'] },
  { to: '/inventory', label: 'Inventory', icon: Package, roles: ['gym_owner', 'super_admin'] },
  { to: '/settings', label: 'Settings', icon: Settings, roles: ['gym_owner', 'super_admin'] },
  { to: '/admin/tenants', label: 'Super Admin', icon: ShieldCheck, roles: ['super_admin'] },
];

function Sidebar() {
  const { isCollapsed, toggleCollapse } = useSidebarStore();
  const { user } = useAuthStore();

  const visibleItems = NAV_ITEMS.filter((item) => {
    if (!item.roles || item.roles.length === 0) return true;
    if (!user) return false;
    return item.roles.includes(user.role);
  });

  return (
    <aside
      className={`h-screen sticky top-0 flex flex-col flex-shrink-0 transition-all duration-300 z-30 select-none ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
      style={{ backgroundColor: 'var(--ink)' }}
    >
      {/* App Branding */}
      <NavLink
        to={user?.role === 'trainer' ? '/receipts' : '/'}
        className="h-16 flex items-center px-5 border-b border-white/[0.08] gap-3 overflow-hidden cursor-pointer group"
      >
        <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 bg-[#2F6FED] text-white shadow-sm group-hover:scale-105 transition-transform">
          <Activity className="w-5 h-5 text-white" strokeWidth={2.2} />
        </div>
        {!isCollapsed && (
          <div className="flex flex-col truncate">
            <span className="font-heading font-bold text-white text-base tracking-tight leading-tight">
              Gym<span className="text-[#7FA8E8]">ERP</span>
            </span>
            <span className="text-[11px] text-white/50 tracking-wider uppercase font-medium">
              {user?.role === 'trainer' ? 'Trainer Portal' : 'Enterprise Suite'}
            </span>
          </div>
        )}
      </NavLink>

      {/* Navigation List */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto overflow-x-hidden">
        {visibleItems.map((item) => {
          const Icon = item.icon;

          if (item.isSoon) {
            return (
              <div
                key={item.label}
                title={isCollapsed ? `${item.label} (Coming Soon)` : undefined}
                className={`relative flex items-center rounded-md px-3 py-2.5 text-white/40 cursor-not-allowed select-none transition-colors ${
                  isCollapsed ? 'justify-center' : 'justify-between'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon className="w-5 h-5 flex-shrink-0" strokeWidth={1.75} />
                  {!isCollapsed && (
                    <span className="text-sm font-normal truncate">{item.label}</span>
                  )}
                </div>
                {!isCollapsed && (
                  <span
                    className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded border border-[#D99A3E] text-[#D99A3E] bg-transparent leading-none flex-shrink-0"
                    style={{ letterSpacing: '0.04em' }}
                  >
                    Soon
                  </span>
                )}
              </div>
            );
          }

          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              title={isCollapsed ? item.label : undefined}
              className={({ isActive }) =>
                `group relative flex items-center rounded-md px-3 py-2.5 text-sm transition-colors duration-150 ${
                  isActive
                    ? 'text-white font-medium bg-white/[0.06]'
                    : 'text-white/65 hover:text-white hover:bg-white/[0.04]'
                } ${isCollapsed ? 'justify-center' : 'gap-3'}`
              }
            >
              {({ isActive }) => (
                <>
                  {/* Active 4px accent bar on left */}
                  {isActive && (
                    <span
                      className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r bg-[#2F6FED]"
                      aria-hidden="true"
                    />
                  )}
                  <Icon
                    className={`w-5 h-5 flex-shrink-0 transition-colors ${
                      isActive ? 'text-[#2F6FED]' : 'text-white/65 group-hover:text-white'
                    }`}
                    strokeWidth={1.8}
                  />
                  {!isCollapsed && (
                    <span className="truncate">{item.label}</span>
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Collapse toggle at the bottom of the sidebar */}
      <div className="p-3 border-t border-white/[0.08]">
        <button
          onClick={toggleCollapse}
          className={`w-full flex items-center gap-3 px-3 py-2 text-white/60 hover:text-white hover:bg-white/[0.05] rounded-md transition-colors text-xs font-medium ${
            isCollapsed ? 'justify-center' : ''
          }`}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4" strokeWidth={2} />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4" strokeWidth={2} />
              <span className="truncate">Collapse Menu</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}

export default memo(Sidebar);


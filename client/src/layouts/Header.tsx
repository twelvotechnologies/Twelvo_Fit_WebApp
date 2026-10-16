import { memo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, Search, ShieldCheck, LogOut, LogIn, Building2 } from 'lucide-react';
import { useAuthStore } from '../stores/useAuthStore';

function Header() {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuthStore();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Derive initials
  const initials = user?.fullName
    ? user.fullName
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : user?.username
    ? user.username.slice(0, 2).toUpperCase()
    : 'TW';

  return (
    <header className="h-16 px-6 bg-white border-b border-[#E2E6ED] flex items-center justify-between sticky top-0 z-20">
      {/* Search / Context bar */}
      <div className="flex items-center gap-4 flex-1 max-w-md">
        <div className="relative w-full">
          <Search className="w-4 h-4 text-[#6B7686] absolute left-3 top-1/2 -translate-y-1/2" strokeWidth={1.8} />
          <input
            type="text"
            placeholder="Search members, phone, receipts..."
            className="w-full pl-9 pr-3 py-1.5 text-sm bg-[#F5F7FA] border border-[#E2E6ED] rounded-lg text-[#1A2333] placeholder-[#6B7686] focus:outline-none focus:border-[#2F6FED] focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* Right side controls */}
      <div className="flex items-center gap-4">
        {/* Active Gym Tenant Indicator */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#F5F7FA] border border-[#E2E6ED] text-xs">
          <span className="w-2 h-2 rounded-full bg-[#2E9E6D] flex-shrink-0 animate-pulse" />
          <div className="flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-[#2F6FED]" />
            <span className="font-semibold text-[#1A2333]">
              {user ? user.gymName : 'Twelvo Gym & Fitness'}
            </span>
            <span className="font-mono text-[10px] text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200/60 font-bold">
              {user ? user.tenantCode : 'GYM0001'}
            </span>
          </div>
        </div>

        {/* Notification Bell */}
        <button
          className="relative p-2 text-[#6B7686] hover:text-[#1A2333] hover:bg-[#F5F7FA] rounded-lg transition-colors"
          aria-label="Notifications"
        >
          <Bell className="w-4 h-4" strokeWidth={1.8} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#2F6FED] rounded-full" />
        </button>

        {/* Separator */}
        <div className="w-[1px] h-6 bg-[#E2E6ED]" />

        {/* User profile / Auth actions */}
        {isAuthenticated && user ? (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shadow-sm">
                {initials}
              </div>
              <div className="hidden md:flex flex-col text-left">
                <span className="text-xs font-bold text-[#1A2333] leading-tight">
                  {user.fullName || user.username}
                </span>
                <span className="text-[10px] text-[#6B7686] flex items-center gap-1 capitalize">
                  <ShieldCheck className="w-3 h-3 text-[#2F6FED]" />
                  {user.role === 'gym_owner' ? 'Gym Owner' : user.role}
                </span>
              </div>
            </div>

            {/* Logout button */}
            <button
              onClick={handleLogout}
              title="Sign Out"
              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <Link
            to="/login"
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </Link>
        )}
      </div>
    </header>
  );
}

export default memo(Header);


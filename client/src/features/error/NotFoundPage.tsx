import { Link, useNavigate } from 'react-router-dom';
import {
  Dumbbell,
  Home,
  ArrowLeft,
  Users,
  Receipt,
  WalletCards,
} from 'lucide-react';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-6 animate-fadeIn">
      <div className="w-full max-w-xl text-center space-y-6">
        {/* Large Decorative Badge */}
        <div className="relative inline-flex items-center justify-center">
          <div className="w-24 h-24 rounded-3xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-sm">
            <Dumbbell className="w-12 h-12 transform -rotate-12" strokeWidth={1.8} />
          </div>
          <span className="absolute -top-2 -right-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-mono font-black text-xs px-2.5 py-1 rounded-full shadow-md">
            404
          </span>
        </div>

        {/* Message */}
        <div className="space-y-2">
          <h1 className="text-3xl font-extrabold font-heading text-slate-900 tracking-tight">
            Page Out of Range
          </h1>
          <p className="text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
            The page or record you are trying to reach doesn't exist, has been removed, or your
            membership doesn't grant access.
          </p>
        </div>

        {/* Primary Navigation Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            onClick={() => navigate(-1)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Go Back</span>
          </button>

          <Link
            to="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-semibold rounded-xl shadow-sm transition-all hover:shadow"
          >
            <Home className="w-4 h-4" />
            <span>Return to Dashboard</span>
          </Link>
        </div>

        {/* Helpful Quick Links */}
        <div className="pt-8 border-t border-slate-200/70">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
            Common Destinations
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-md mx-auto">
            <Link
              to="/members"
              className="flex items-center gap-2.5 p-3 rounded-xl bg-white border border-slate-200/80 hover:border-blue-300 hover:bg-blue-50/30 text-xs font-medium text-slate-700 hover:text-blue-600 transition-all shadow-sm group"
            >
              <Users className="w-4 h-4 text-blue-500 group-hover:scale-110 transition-transform" />
              <span>Members</span>
            </Link>

            <Link
              to="/receipts"
              className="flex items-center gap-2.5 p-3 rounded-xl bg-white border border-slate-200/80 hover:border-blue-300 hover:bg-blue-50/30 text-xs font-medium text-slate-700 hover:text-blue-600 transition-all shadow-sm group"
            >
              <Receipt className="w-4 h-4 text-emerald-500 group-hover:scale-110 transition-transform" />
              <span>Receipts</span>
            </Link>

            <Link
              to="/payroll"
              className="flex items-center gap-2.5 p-3 rounded-xl bg-white border border-slate-200/80 hover:border-blue-300 hover:bg-blue-50/30 text-xs font-medium text-slate-700 hover:text-blue-600 transition-all shadow-sm group"
            >
              <WalletCards className="w-4 h-4 text-purple-500 group-hover:scale-110 transition-transform" />
              <span>Payroll</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

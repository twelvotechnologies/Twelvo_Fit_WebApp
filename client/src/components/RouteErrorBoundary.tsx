import { useState } from 'react';
import {
  useRouteError,
  isRouteErrorResponse,
  useNavigate,
  Link,
} from 'react-router-dom';
import {
  AlertTriangle,
  RefreshCw,
  Home,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  ServerCrash,
  WifiOff,
  FileQuestion,
  Terminal,
} from 'lucide-react';

export default function RouteErrorBoundary() {
  const error = useRouteError() as any;
  const navigate = useNavigate();
  const [showDetails, setShowDetails] = useState(false);

  // Check if the error is a Vite dynamic module import failure
  const isModuleImportError =
    error?.message?.includes('dynamically imported module') ||
    error?.message?.includes('Failed to fetch') ||
    error?.message?.includes('Importing a module script failed') ||
    error?.name === 'ChunkLoadError';

  let title = 'Something Went Wrong';
  let message =
    'An unexpected application error occurred. You can try refreshing the page or navigating back to the dashboard.';
  let statusCode = 500;
  let IconComponent = AlertTriangle;
  let iconBg = 'bg-rose-50 text-rose-600 ring-rose-100';

  if (isModuleImportError) {
    statusCode = 503;
    title = 'Module Loading Failed';
    message =
      'The requested page module could not be loaded. This typically happens after an app update or if the local development server was temporarily reloaded. Refreshing the page will download the latest version.';
    IconComponent = WifiOff;
    iconBg = 'bg-amber-50 text-amber-600 ring-amber-100';
  } else if (isRouteErrorResponse(error)) {
    statusCode = error.status;
    if (error.status === 404) {
      title = 'Page Not Found';
      message = "The page you are looking for doesn't exist or has been moved.";
      IconComponent = FileQuestion;
      iconBg = 'bg-blue-50 text-blue-600 ring-blue-100';
    } else {
      title = error.statusText || 'Application Error';
      message = error.data?.message || 'A routing error prevented this page from displaying.';
      IconComponent = ServerCrash;
    }
  } else if (error instanceof Error) {
    message = error.message;
  }

  const handleReload = () => {
    // Clear any chunk retry cache flag for current route
    sessionStorage.removeItem(`chunk_reload_${window.location.pathname}`);
    window.location.reload();
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-6 animate-fadeIn">
      <div className="w-full max-w-xl bg-white rounded-3xl border border-slate-200/80 shadow-xl overflow-hidden">
        {/* Top Accent Strip */}
        <div
          className={`h-2 w-full ${
            statusCode === 404
              ? 'bg-blue-600'
              : isModuleImportError
              ? 'bg-amber-500'
              : 'bg-rose-600'
          }`}
        />

        <div className="p-8 sm:p-10 space-y-6 text-center">
          {/* Status Badge & Icon */}
          <div className="inline-flex flex-col items-center">
            <div
              className={`w-16 h-16 rounded-2xl ${iconBg} ring-8 flex items-center justify-center mb-4 transition-transform hover:scale-105`}
            >
              <IconComponent className="w-8 h-8" strokeWidth={2} />
            </div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
              Status Code: {statusCode}
            </span>
          </div>

          {/* Heading & Friendly Explanation */}
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-bold font-heading text-slate-900 tracking-tight">
              {title}
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
              {message}
            </p>
          </div>

          {/* Recovery Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              onClick={handleReload}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-semibold rounded-xl shadow-sm transition-all hover:shadow"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Reload Page</span>
            </button>

            <button
              onClick={() => navigate(-1)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Go Back</span>
            </button>

            <Link
              to="/"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl transition-all"
            >
              <Home className="w-4 h-4" />
              <span>Dashboard</span>
            </Link>
          </div>

          {/* Technical Diagnostics Accordion */}
          {error && (
            <div className="pt-4 border-t border-slate-100 text-left">
              <button
                type="button"
                onClick={() => setShowDetails(!showDetails)}
                className="w-full flex items-center justify-between py-2 text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors"
              >
                <span className="flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5" />
                  Technical Details & Diagnostics
                </span>
                {showDetails ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>

              {showDetails && (
                <div className="mt-2 p-4 bg-slate-900 rounded-2xl text-slate-300 font-mono text-[11px] overflow-x-auto max-h-56 space-y-2 border border-slate-800 shadow-inner">
                  <div>
                    <span className="text-amber-400 font-bold">Location:</span>{' '}
                    {window.location.href}
                  </div>
                  <div>
                    <span className="text-rose-400 font-bold">Error:</span>{' '}
                    {error?.name || 'Error'}: {error?.message || String(error)}
                  </div>
                  {error?.stack && (
                    <div className="pt-2 text-slate-400 border-t border-slate-800 whitespace-pre-wrap leading-tight text-[10px]">
                      {error.stack}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

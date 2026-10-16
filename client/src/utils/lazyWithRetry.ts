import { lazy, ComponentType } from 'react';

/**
 * Resilient lazy import that automatically retries when dynamic imports fail
 * due to network issues, dev server restarts, or Vite chunk hash mismatches.
 */
export function lazyWithRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
  retries = 2,
  intervalMs = 1000
) {
  return lazy(() =>
    factory().catch(async (error: any) => {
      // 1. Attempt retries with delay
      for (let attempt = 1; attempt <= retries; attempt++) {
        try {
          await new Promise((resolve) => setTimeout(resolve, intervalMs));
          return await factory();
        } catch (retryErr) {
          // Continue to next attempt
        }
      }

      // 2. Detect if it's a dynamic module import failure or chunk load error
      const isDynamicImportError =
        error?.message?.includes('dynamically imported module') ||
        error?.message?.includes('Failed to fetch') ||
        error?.message?.includes('Importing a module script failed') ||
        error?.name === 'ChunkLoadError';

      // 3. To prevent an infinite reload loop, use sessionStorage with a 15-second expiration flag
      const reloadKey = `chunk_reload_${window.location.pathname}`;
      const lastReload = sessionStorage.getItem(reloadKey);
      const now = Date.now();

      if (isDynamicImportError && (!lastReload || now - parseInt(lastReload, 10) > 15000)) {
        sessionStorage.setItem(reloadKey, now.toString());
        // Reload page to refresh stale chunk cache from dev server or build
        window.location.reload();
        // Return a never-resolving promise so React doesn't crash before reload occurs
        return new Promise<{ default: T }>(() => {});
      }

      // If already reloaded or non-recoverable, propagate error to RouteErrorBoundary
      throw error;
    })
  );
}

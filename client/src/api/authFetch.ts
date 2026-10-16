import { useAuthStore } from '../stores/useAuthStore';

const rawBase = (import.meta.env.VITE_API_BASE_URL || '/api').trim().replace(/\/+$/, '');
export const API_BASE = rawBase.endsWith('/v1') ? rawBase.slice(0, -3) : rawBase;

/**
 * Shared authenticated fetch helper for all API modules:
 * - Attaches Authorization: Bearer <accessToken>
 * - If response is 401, attempts transparent token refresh and retries request
 */
export async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const store = useAuthStore.getState();
  let token = store.accessToken || localStorage.getItem('gymerp_access_token');

  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  headers.set('ngrok-skip-browser-warning', 'true');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  let res = await fetch(url, { ...options, headers });

  // If unauthorized / token expired, attempt refresh
  if (res.status === 401) {
    const refreshed = await store.refreshSession();
    if (refreshed) {
      token = useAuthStore.getState().accessToken;
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
        res = await fetch(url, { ...options, headers });
      }
    }
  }

  return res;
}

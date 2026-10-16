import { AuthTokensResponse, AuthUser, LoginPayload } from '../types/auth';

const rawBase = (import.meta.env.VITE_API_BASE_URL || '/api').trim().replace(/\/+$/, '');
const API_BASE = rawBase.endsWith('/v1') ? rawBase.slice(0, -3) : rawBase;

export const authApi = {
  /**
   * Logs in with username/email and password
   */
  async login(payload: LoginPayload): Promise<AuthTokensResponse> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(json.message || `Login failed (${res.status})`);
    }

    return json.data;
  },

  /**
   * Refreshes JWT access token using a valid refresh token
   */
  async refresh(refreshToken: string): Promise<AuthTokensResponse> {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(json.message || `Session refresh failed (${res.status})`);
    }

    return json.data;
  },

  /**
   * Fetches the profile of the currently logged-in user
   */
  async getMe(accessToken: string): Promise<AuthUser> {
    const res = await fetch(`${API_BASE}/auth/me`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(json.message || `Failed to fetch profile (${res.status})`);
    }

    return json.data;
  },

  /**
   * Logs out user
   */
  async logout(): Promise<void> {
    try {
      await fetch(`${API_BASE}/auth/logout`, { method: 'POST' });
    } catch {
      // Ignore network errors on logout
    }
  },
};

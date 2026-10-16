import { create } from 'zustand';
import { AuthUser, LoginPayload } from '../types/auth';
import { authApi } from '../api/authApi';

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (payload: LoginPayload) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
  setUser: (user: AuthUser) => void;
}

const TOKEN_KEY = 'gymerp_access_token';
const REFRESH_TOKEN_KEY = 'gymerp_refresh_token';
const USER_KEY = 'gymerp_user';

export const useAuthStore = create<AuthState>((set, get) => {
  // Load initial credentials from localStorage
  let initialUser: AuthUser | null = null;
  let initialAccessToken: string | null = null;
  let initialRefreshToken: string | null = null;

  try {
    initialAccessToken = localStorage.getItem(TOKEN_KEY);
    initialRefreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    const storedUser = localStorage.getItem(USER_KEY);
    if (storedUser) {
      initialUser = JSON.parse(storedUser);
    }
  } catch (err) {
    console.warn('Could not read auth state from localStorage:', err);
  }

  return {
    user: initialUser,
    accessToken: initialAccessToken,
    refreshToken: initialRefreshToken,
    isAuthenticated: Boolean(initialAccessToken && initialUser),
    isLoading: false,

    login: async (payload: LoginPayload) => {
      set({ isLoading: true });
      try {
        const data = await authApi.login(payload);

        // Store tokens & complete user context in localStorage
        try {
          localStorage.setItem(TOKEN_KEY, data.accessToken);
          localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
          localStorage.setItem(USER_KEY, JSON.stringify(data.user));
        } catch (e) {
          console.warn('Could not persist auth to localStorage:', e);
        }

        set({
          user: data.user,
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          isAuthenticated: true,
          isLoading: false,
        });

        return data.user;
      } catch (err) {
        set({ isLoading: false });
        throw err;
      }
    },

    logout: async () => {
      try {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(REFRESH_TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
      } catch {}

      set({
        user: null,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,
        isLoading: false,
      });

      await authApi.logout();
    },

    refreshSession: async () => {
      const currentRefresh = get().refreshToken || localStorage.getItem(REFRESH_TOKEN_KEY);
      if (!currentRefresh) {
        await get().logout();
        return false;
      }

      try {
        const data = await authApi.refresh(currentRefresh);

        try {
          localStorage.setItem(TOKEN_KEY, data.accessToken);
          localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
          localStorage.setItem(USER_KEY, JSON.stringify(data.user));
        } catch {}

        set({
          user: data.user,
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          isAuthenticated: true,
        });

        return true;
      } catch {
        await get().logout();
        return false;
      }
    },

    setUser: (user: AuthUser) => {
      try {
        localStorage.setItem(USER_KEY, JSON.stringify(user));
      } catch {}
      set({ user });
    },
  };
});

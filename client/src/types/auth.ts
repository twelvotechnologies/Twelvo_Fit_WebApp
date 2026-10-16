export interface AuthUser {
  userId: string;
  tenantId: number;
  tenantCode: string;
  tenantPrefix: string;
  gymName: string;
  role: 'gym_owner' | 'trainer' | 'other' | 'super_admin' | string;
  username: string;
  email: string | null;
  fullName: string | null;
  city: string | null;
  status: string;
}

export interface LoginPayload {
  usernameOrEmail: string;
  password: string;
}

export interface AuthTokensResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: AuthUser;
}

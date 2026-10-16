export interface JwtAuthPayload {
  userId: string;
  tenantId: number;
  tenantCode: string;
  tenantPrefix: string;
  gymName: string;
  role: string;
  username: string;
  email: string | null;
  fullName: string | null;
  city?: string | null;
}

export interface LoginDTO {
  usernameOrEmail?: string;
  email?: string;
  username?: string;
  password: string;
}

export interface RefreshTokenDTO {
  refreshToken: string;
}

export interface AuthUser {
  userId: string;
  tenantId: number;
  tenantCode: string;
  tenantPrefix: string;
  gymName: string;
  role: string;
  username: string;
  email: string | null;
  fullName: string | null;
  city: string | null;
  status: string;
}

export interface AuthTokensResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // in seconds
  user: AuthUser;
}

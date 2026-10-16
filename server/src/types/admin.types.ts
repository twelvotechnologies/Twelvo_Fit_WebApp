export type TenantStatus = 'active' | 'suspended' | 'trial' | 'cancelled';

export interface TenantListItem {
  tenantId: number;
  tenantCode: string;
  tenantPrefix: string | null;
  gymName: string;
  ownerName: string | null;
  email: string;
  phoneNumber: string | null;
  addressLine: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  pincode: string | null;
  gstNumber: string | null;
  logoUrl: string | null;
  status: TenantStatus;
  planId: number | null;
  planName?: string | null;
  subscriptionStart: string | null;
  subscriptionEnd: string | null;
  membersCount: number;
  usersCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface TenantQueryDTO {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  city?: string;
}

export interface SuggestTenantCredentialsResponse {
  tenantPrefix: string;
  username: string;
  password: string;
}

export interface CreateTenantDTO {
  gymName: string;
  ownerName?: string;
  email: string;
  phone?: string;
  city?: string;
  state?: string;
  gstNumber?: string;
  tenantPrefix: string;
  username: string;
  password: string;
}

export interface CreatedTenantResponse {
  tenant: {
    tenantId: number;
    tenantCode: string;
    tenantPrefix: string;
    gymName: string;
    ownerName: string | null;
    email: string;
    phoneNumber: string | null;
    city: string | null;
    state: string | null;
    status: string;
    createdAt: string;
  };
  user: {
    userId: string;
    username: string;
    email: string | null;
    role: string;
    fullName: string | null;
  };
}

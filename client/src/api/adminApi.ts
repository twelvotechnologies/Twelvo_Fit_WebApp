export type TenantStatus = 'active' | 'suspended' | 'trial' | 'cancelled';

export interface TenantItem {
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

export interface TenantPagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface GetTenantsResponse {
  tenants: TenantItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface SuggestCredentialsResponse {
  tenantPrefix: string;
  username: string;
  password: string;
}

export interface CreateTenantInput {
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

export interface CreatedTenantResult {
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

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

export const adminApi = {
  /**
   * Fetches paginated, searchable tenants list
   */
  async getTenants(params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    city?: string;
  } = {}): Promise<GetTenantsResponse> {
    const query = new URLSearchParams();
    if (params.page) query.append('page', params.page.toString());
    if (params.limit) query.append('limit', params.limit.toString());
    if (params.search && params.search.trim()) query.append('search', params.search.trim());
    if (params.status && params.status !== 'ALL') query.append('status', params.status);
    if (params.city && params.city.trim()) query.append('city', params.city.trim());

    const qs = query.toString() ? `?${query.toString()}` : '';
    const res = await fetch(`${API_BASE}/admin/tenants${qs}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Failed to fetch tenants (${res.status})`);
    }
    const json = await res.json();
    return json.data;
  },

  /**
   * Calls suggestion endpoint for unique prefix, username, and algorithmic password
   */
  async suggestCredentials(params: {
    gymName: string;
    city?: string;
    ownerName?: string;
    randomize?: boolean;
  } | string): Promise<SuggestCredentialsResponse> {
    const p = typeof params === 'string' ? { gymName: params } : params;
    const query = new URLSearchParams();
    if (p.gymName) query.append('gymName', p.gymName.trim());
    if (p.city) query.append('city', p.city.trim());
    if (p.ownerName) query.append('ownerName', p.ownerName.trim());
    if (p.randomize) query.append('randomize', 'true');

    const qs = query.toString() ? `?${query.toString()}` : '';
    const res = await fetch(`${API_BASE}/admin/tenants/suggest${qs}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to suggest credentials');
    }
    const json = await res.json();
    return json.data;
  },

  /**
   * Creates a tenant and gym_owner login atomically
   */
  async createTenant(payload: CreateTenantInput): Promise<CreatedTenantResult> {
    const res = await fetch(`${API_BASE}/admin/tenants`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      const error = new Error(json.message || `Failed to create gym (${res.status})`) as Error & {
        statusCode?: number;
        field?: string;
      };
      error.statusCode = res.status;
      // Identify error field for inline UI highlights
      const msg = (json.message || '').toLowerCase();
      if (msg.includes('prefix')) error.field = 'tenantPrefix';
      else if (msg.includes('username')) error.field = 'username';
      else if (msg.includes('email')) error.field = 'email';
      else if (msg.includes('password')) error.field = 'password';
      else if (msg.includes('phone')) error.field = 'phone';
      throw error;
    }

    return json.data;
  },

  /**
   * Toggles or updates a tenant's status
   */
  async toggleTenantStatus(tenantId: number, status?: TenantStatus): Promise<TenantItem> {
    const res = await fetch(`${API_BASE}/admin/tenants/${tenantId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(status ? { status } : {}),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Failed to update tenant status (${res.status})`);
    }

    const json = await res.json();
    return json.data;
  },
};

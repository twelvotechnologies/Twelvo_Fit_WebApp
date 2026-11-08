import { IApiResponse, IHealthStatus, IMember, CreateMemberDTO } from '../types';
import { API_BASE } from '../api/authFetch';

export interface HealthCheckResult {
  data: IHealthStatus | null;
  latencyMs: number;
  online: boolean;
  error?: string;
}

export const api = {
  async checkHealth(): Promise<HealthCheckResult> {
    const start = performance.now();
    try {
      const res = await fetch(`${API_BASE}/v1/health`, { cache: 'no-store' });
      const latencyMs = Math.round(performance.now() - start);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const json: IApiResponse<IHealthStatus> = await res.json();
      return {
        data: json.data,
        latencyMs,
        online: true,
      };
    } catch (err: any) {
      return {
        data: null,
        latencyMs: Math.round(performance.now() - start),
        online: false,
        error: err.message || 'Offline',
      };
    }
  },

  async getMembers(status?: string, search?: string): Promise<IMember[]> {
    const params = new URLSearchParams();
    if (status && status !== 'ALL') params.append('status', status);
    if (search && search.trim()) params.append('search', search.trim());

    const queryString = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(`${API_BASE}/members${queryString}`);
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.message || `Failed to fetch members (${res.status})`);
    }
    const json: IApiResponse<IMember[]> = await res.json();
    return json.data || [];
  },

  async createMember(payload: CreateMemberDTO): Promise<IMember> {
    const res = await fetch(`${API_BASE}/members`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const json: IApiResponse<IMember> = await res.json();
    if (!res.ok) {
      throw new Error(json.message || 'Failed to create member');
    }
    return json.data;
  },

  async deleteMember(id: string): Promise<IMember> {
    const res = await fetch(`${API_BASE}/members/${id}`, {
      method: 'DELETE',
    });
    const json: IApiResponse<IMember> = await res.json();
    if (!res.ok) {
      throw new Error(json.message || 'Failed to delete member');
    }
    return json.data;
  },
};

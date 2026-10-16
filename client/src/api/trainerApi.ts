import { useAuthStore } from '../stores/useAuthStore';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

export interface TrainerItem {
  id: string;
  staffId: string;
  staffCode: string;
  tenantId: number;
  userId: string;
  name: string;
  fullName: string;
  role: string;
  designation: string;
  specialty: string;
  specialization: string | null;
  experienceYears: number;
  certifications: string[];
  email: string;
  phone: string;
  photoUrl: string | null;
  joiningDate: string;
  status: 'ACTIVE' | 'IN_SESSION' | 'ON_LEAVE' | 'INACTIVE';
  employmentStatus: 'active' | 'in_session' | 'on_leave' | 'inactive';
  baseSalary: number;
  commissionPerSession: number;
  rating: number;
  activeClients: number;
  sessionsThisMonth: number;
}

export interface CreateTrainerInput {
  name: string;
  role: string;
  specialty: string;
  phone: string;
  email?: string;
  experienceYears?: number;
  baseSalary?: number;
  commissionPerSession?: number;
  status?: string;
  certifications?: string[];
}

export interface TrainerStats {
  totalTrainers: number;
  activeOnFloor: number;
  totalClients: number;
  avgRating: number;
}

/**
 * Authenticated fetch helper:
 * Attaches Authorization: Bearer <accessToken>
 * If response is 401, attempts transparent token refresh and retries request
 */
async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const store = useAuthStore.getState();
  let token = store.accessToken || localStorage.getItem('gymerp_access_token');

  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
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

export const trainerApi = {
  /**
   * Fetches all trainers for the authenticated gym tenant
   */
  async getTrainers(filters: { search?: string; status?: string; specialty?: string } = {}): Promise<TrainerItem[]> {
    const query = new URLSearchParams();
    if (filters.search) query.append('search', filters.search);
    if (filters.status && filters.status !== 'ALL') query.append('status', filters.status);
    if (filters.specialty && filters.specialty !== 'ALL') query.append('specialty', filters.specialty);

    const qs = query.toString() ? `?${query.toString()}` : '';
    const res = await fetchWithAuth(`${API_BASE}/v1/trainers${qs}`);

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Failed to fetch trainers (${res.status})`);
    }

    const json = await res.json();
    return json.data || [];
  },

  /**
   * Fetches summary statistics for trainers
   */
  async getStats(): Promise<TrainerStats> {
    const res = await fetchWithAuth(`${API_BASE}/v1/trainers/stats`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to fetch trainer statistics');
    }
    const json = await res.json();
    return json.data;
  },

  /**
   * Creates a new trainer in the authenticated gym
   */
  async createTrainer(input: CreateTrainerInput): Promise<TrainerItem> {
    const res = await fetchWithAuth(`${API_BASE}/v1/trainers`, {
      method: 'POST',
      body: JSON.stringify({
        fullName: input.name,
        designation: input.role,
        specialization: input.specialty,
        phone: input.phone,
        email: input.email,
        experienceYears: input.experienceYears,
        baseSalary: input.baseSalary,
        commissionPerSession: input.commissionPerSession,
        employmentStatus: (input.status || 'ACTIVE').toLowerCase(),
        certifications: input.certifications,
      }),
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(json.message || `Failed to add trainer (${res.status})`);
    }

    return json.data;
  },

  /**
   * Updates an existing trainer
   */
  async updateTrainer(id: string, updates: Partial<CreateTrainerInput>): Promise<TrainerItem> {
    const res = await fetchWithAuth(`${API_BASE}/v1/trainers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(json.message || 'Failed to update trainer');
    }

    return json.data;
  },

  /**
   * Deactivates a trainer
   */
  async deleteTrainer(id: string): Promise<void> {
    const res = await fetchWithAuth(`${API_BASE}/v1/trainers/${id}`, {
      method: 'DELETE',
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to delete trainer');
    }
  },
};

export type MemberStatus = 'ACTIVE' | 'INACTIVE' | 'EXPIRED' | 'SUSPENDED';

export interface IMember {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  membershipPlan: string;
  status: MemberStatus;
  joinedAt: string;
  expiresAt: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateMemberDTO {
  fullName: string;
  email: string;
  phone?: string;
  membershipPlan?: string;
  status?: MemberStatus;
  expiresAt?: string;
}

export interface IHealthStatus {
  status: 'UP' | 'DOWN';
  framework: string;
  uptimeSeconds: number;
  timestamp: string;
  nodeVersion: string;
  memoryUsage?: {
    rssMb: number;
    heapUsedMb: number;
  };
}

export interface IApiResponse<T = unknown> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
  timestamp: string;
}

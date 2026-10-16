export interface IApiResponse<T = unknown> {
  success: boolean;
  statusCode: number;
  message: string;
  data?: T | null;
  errors?: unknown;
  timestamp: string;
}

export interface IHealthStatus {
  status: 'UP' | 'DOWN';
  framework: 'express';
  uptimeSeconds: number;
  timestamp: string;
  nodeVersion: string;
  memoryUsage: {
    rssMb: number;
    heapUsedMb: number;
  };
}

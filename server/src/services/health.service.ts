import { IHealthStatus } from '../types/api.types.js';

export class HealthService {
  static getHealthStatus(framework: 'express' = 'express'): IHealthStatus {
    return {
      status: 'UP',
      framework,
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      nodeVersion: process.version,
      memoryUsage: {
        rssMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
        heapUsedMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      },
    };
  }
}

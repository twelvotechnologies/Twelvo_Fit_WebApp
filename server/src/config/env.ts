import dotenv from 'dotenv';

dotenv.config();

const buildDatabaseUrl = (): string => {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }
  if (process.env.DB_USER && process.env.DB_HOST && process.env.DB_NAME) {
    const user = encodeURIComponent(process.env.DB_USER);
    const pass = process.env.DB_PASSWORD ? `:${encodeURIComponent(process.env.DB_PASSWORD)}` : '';
    const host = process.env.DB_HOST || 'localhost';
    const port = process.env.DB_PORT || '5432';
    const name = process.env.DB_NAME;
    const url = `postgresql://${user}${pass}@${host}:${port}/${name}?schema=public`;
    process.env.DATABASE_URL = url;
    return url;
  }
  return '';
};

export interface IConfig {
  port: number;
  env: string;
  corsOrigin: string;
  databaseUrl: string;
  autoMigrate: boolean;
  isDev: boolean;
  isProd: boolean;
  jwtSecret: string;
  jwtExpiresIn: string;
  jwtRefreshSecret: string;
  jwtRefreshExpiresIn: string;
}

export const config: IConfig = {
  port: parseInt(process.env.PORT || '3000', 10),
  env: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  databaseUrl: buildDatabaseUrl(),
  autoMigrate: process.env.AUTO_MIGRATE !== 'false',
  isDev: (process.env.NODE_ENV || 'development') === 'development',
  isProd: process.env.NODE_ENV === 'production',
  jwtSecret: process.env.JWT_SECRET || 'twelvo-gym-erp-jwt-super-secret-access-key-2026',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '15m',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'twelvo-gym-erp-jwt-super-secret-refresh-key-2026',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
};

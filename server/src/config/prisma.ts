import { PrismaClient } from '@prisma/client';
import { config } from './env.js';
import { logger } from '../utils/logger.js';

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export const prisma: PrismaClient =
  globalThis.__prisma ||
  new PrismaClient({
    log: config.isDev ? ['query', 'info', 'warn', 'error'] : ['error'],
  });

if (config.isDev) {
  globalThis.__prisma = prisma;
}

// Graceful connection and disconnection handlers
export const connectPrisma = async (): Promise<void> => {
  try {
    await prisma.$connect();
    logger.info('📦 Prisma connected successfully to the database.');
  } catch (err) {
    logger.error('Failed to connect Prisma to the database:', err);
    throw err;
  }
};

export const disconnectPrisma = async (): Promise<void> => {
  try {
    await prisma.$disconnect();
    logger.info('📦 Prisma disconnected cleanly.');
  } catch (err) {
    logger.error('Error disconnecting Prisma:', err);
  }
};

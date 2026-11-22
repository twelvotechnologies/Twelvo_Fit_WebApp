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

// Graceful connection and disconnection handlers with auto-retry for cloud DBs (e.g. Neon waking up)
export const connectPrisma = async (retries = 5, delayMs = 2500): Promise<void> => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await prisma.$connect();
      logger.info('📦 Prisma connected successfully to the database.');
      return;
    } catch (err) {
      logger.warn(`Database connection attempt ${attempt}/${retries} failed: ${(err as Error).message}`);
      if (attempt === retries) {
        logger.error('All database connection retries exhausted.', err);
        throw err;
      }
      logger.info(`Retrying database connection in ${delayMs / 1000}s...`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
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

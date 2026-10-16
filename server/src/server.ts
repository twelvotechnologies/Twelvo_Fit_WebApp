import { createApp } from './app.js';
import { config } from './config/env.js';
import { logger } from './utils/logger.js';
import { connectPrisma, disconnectPrisma } from './config/prisma.js';
import { runMigration } from './scripts/runMigration.js';

const startServer = async () => {
  // 1. Connect database & auto-migrate if enabled
  try {
    await connectPrisma();
    if (config.autoMigrate) {
      await runMigration({ isStartupHook: true });
    }
  } catch (err) {
    logger.error('Failed to initialize database connection. Exiting...', err);
    process.exit(1);
  }

  // 2. Initialize Express application
  const app = createApp();

  const server = app.listen(config.port, () => {
    logger.info(`=================================================`);
    logger.info(`🚀 Gym ERP Express (TypeScript) running on port ${config.port}`);
    logger.info(`   URL:          http://localhost:${config.port}`);
    logger.info(`   Swagger Docs: http://localhost:${config.port}/api-docs`);
    logger.info(`   Health check: http://localhost:${config.port}/api/v1/health`);
    logger.info(`   Members API:  http://localhost:${config.port}/api/v1/members`);
    logger.info(`   Database:     Prisma ORM`);
    logger.info(`   Environment:  ${config.env}`);
    logger.info(`=================================================`);
  });

  // Graceful Shutdown Handlers
  const handleShutdown = async (signal: string): Promise<void> => {
    logger.warn(`Received ${signal}. Shutting down server gracefully...`);

    server.close(async () => {
      logger.info('Express server closed cleanly.');
      await disconnectPrisma();
      process.exit(0);
    });

    setTimeout(() => {
      logger.error('Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
  process.on('SIGINT', () => handleShutdown('SIGINT'));
};

startServer();

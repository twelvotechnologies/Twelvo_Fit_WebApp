import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { prisma } from '../config/prisma.js';
import { logger } from '../utils/logger.js';
import '../utils/bigintSerializer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function rollbackMigration(): Promise<void> {
  const serverRoot = path.resolve(__dirname, '../../');
  const sqlFilePath = path.resolve(__dirname, '../../prisma/rollback_consolidated_schema_v1.sql');

  logger.warn(`=======================================================`);
  logger.warn(`⚠️  Rolling Back Gym ERP Consolidated Schema (v1)`);
  logger.warn(`   Target SQL: ${sqlFilePath}`);
  logger.warn(`=======================================================`);

  if (!fs.existsSync(sqlFilePath)) {
    throw new Error(`Rollback SQL file not found at: ${sqlFilePath}`);
  }

  try {
    const prismaCmd = process.platform === 'win32' ? 'npx.cmd prisma' : 'npx prisma';
    const relativeSqlPath = path.relative(serverRoot, sqlFilePath).replace(/\\/g, '/');
    execSync(`${prismaCmd} db execute --file ${relativeSqlPath}`, {
      cwd: serverRoot,
      env: process.env,
      stdio: 'pipe',
    });

    logger.info('✅ Rollback executed cleanly. Database schema reset.');
  } catch (error: any) {
    logger.error('❌ Rollback failed with error:', error.message || error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Execute when invoked directly
if (process.argv[1] && process.argv[1].endsWith('rollbackMigration.ts')) {
  rollbackMigration();
}

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { prisma } from '../config/prisma.js';
import { logger } from '../utils/logger.js';
import '../utils/bigintSerializer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface MigrationOptions {
  disconnectOnFinish?: boolean;
  isStartupHook?: boolean;
}

export async function runMigration(options: MigrationOptions = {}): Promise<boolean> {
  const { disconnectOnFinish = false, isStartupHook = false } = options;
  const serverRoot = path.resolve(__dirname, '../../');
  const sqlFilePath = path.resolve(__dirname, '../../prisma/consolidated_schema_v1.sql');

  if (!fs.existsSync(sqlFilePath)) {
    logger.error(`Migration SQL file not found at: ${sqlFilePath}`);
    if (!isStartupHook) process.exit(1);
    return false;
  }

  try {
    if (!isStartupHook) {
      logger.info(`=======================================================`);
      logger.info(`🚀 Starting Gym ERP Consolidated Schema (v1) Migration`);
      logger.info(`   Target SQL: ${sqlFilePath}`);
      logger.info(`=======================================================`);
    } else {
      logger.info(`🔄 [Auto-Migrate] Checking and applying PostgreSQL schema & triggers...`);
    }

    // Execute multi-statement SQL via Prisma db execute (supports PL/pgSQL & multi-statements)
    const prismaCmd = process.platform === 'win32' ? 'npx.cmd prisma' : 'npx prisma';
    const relativeSqlPath = path.relative(serverRoot, sqlFilePath).replace(/\\/g, '/');
    execSync(`${prismaCmd} db execute --file ${relativeSqlPath}`, {
      cwd: serverRoot,
      env: process.env,
      stdio: 'pipe',
    });

    const payrollSqlPath = path.resolve(__dirname, '../../prisma/gym_erp_payroll_schema.sql');
    if (fs.existsSync(payrollSqlPath)) {
      const relativePayrollPath = path.relative(serverRoot, payrollSqlPath).replace(/\\/g, '/');
      execSync(`${prismaCmd} db execute --file ${relativePayrollPath}`, {
        cwd: serverRoot,
        env: process.env,
        stdio: 'pipe',
      });
    }

    const expensesSqlPath = path.resolve(__dirname, '../../prisma/gym_erp_expenses_schema.sql');
    if (fs.existsSync(expensesSqlPath)) {
      const relativeExpensesPath = path.relative(serverRoot, expensesSqlPath).replace(/\\/g, '/');
      execSync(`${prismaCmd} db execute --file ${relativeExpensesPath}`, {
        cwd: serverRoot,
        env: process.env,
        stdio: 'pipe',
      });
    }

    if (isStartupHook) {
      logger.info(`✅ [Auto-Migrate] PostgreSQL schema, triggers, and functions are active.`);
    } else {
      logger.info(`✅ PostgreSQL schema executed successfully!`);

      // Catalog verification
      const tables: Array<{ table_name: string }> = await prisma.$queryRaw`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_type = 'BASE TABLE'
        ORDER BY table_name;
      `;
      logger.info(`📋 Active Tables (${tables.length}): ${tables.map((t) => t.table_name).join(', ')}`);

      const functions: Array<{ routine_name: string }> = await prisma.$queryRaw`
        SELECT routine_name 
        FROM information_schema.routines 
        WHERE routine_schema = 'public' 
          AND routine_type = 'FUNCTION'
        ORDER BY routine_name;
      `;
      logger.info(`⚙️  Functions (${functions.length}): ${functions.map((f) => f.routine_name).join(', ')}`);

      const triggers: Array<{ trigger_name: string }> = await prisma.$queryRaw`
        SELECT trigger_name 
        FROM information_schema.triggers 
        WHERE trigger_schema = 'public';
      `;
      logger.info(`⚡ Active Triggers (${triggers.length}): ${triggers.map((tr) => tr.trigger_name).join(', ')}`);
    }

    return true;
  } catch (error: any) {
    logger.error('❌ Migration error:', error.message || error);
    if (!isStartupHook) {
      process.exit(1);
    }
    return false;
  } finally {
    if (disconnectOnFinish) {
      await prisma.$disconnect();
    }
  }
}

// Execute when invoked directly via CLI (npm run db:migrate)
if (process.argv[1] && process.argv[1].endsWith('runMigration.ts')) {
  runMigration({ disconnectOnFinish: true });
}

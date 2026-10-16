import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { prisma } from '../config/prisma.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
  const sqlPath = path.resolve(__dirname, '../../prisma/gym_erp_payroll_schema.sql');
  const sql = fs.readFileSync(sqlPath, 'utf-8');
  console.log('Applying payroll schema from:', sqlPath);

  await prisma.$executeRawUnsafe(sql);
  console.log('Payroll schema applied successfully!');

  const tables = await prisma.$queryRawUnsafe(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_name IN ('staff_attendance', 'salary_slips', 'salary_payments', 'salary_advances', 'advance_repayments', 'v_advance_balances', 'v_salary_slip_summary')
    ORDER BY table_name;
  `);
  console.log('Verified database objects:', tables);
  await prisma.$disconnect();
}

run().catch((err) => {
  console.error('Failed to apply schema:', err);
  process.exit(1);
});

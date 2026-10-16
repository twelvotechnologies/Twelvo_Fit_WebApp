import { PrismaClient } from '@prisma/client';

const localUrl = 'postgresql://postgres:Twelvotech%40123@localhost:5432/gym-erp?schema=public';
const neonUrl = 'postgresql://neondb_owner:npg_Gp2DH4RSdQIf@ep-snowy-poetry-a1bdwqux.ap-southeast-1.aws.neon.tech/gym-erp?sslmode=require';

const localPrisma = new PrismaClient({ datasources: { db: { url: localUrl } } });
const neonPrisma = new PrismaClient({ datasources: { db: { url: neonUrl } } });

const TABLE_ORDER = [
  'plans',
  'tenants',
  'tenant_code_counters',
  'users',
  'staff',
  'plans_catalog',
  'members',
  'bank_accounts',
  'upi_ids',
  'cash_transactions',
  'receipts',
  'receipt_approval_history',
  'staff_attendance',
  'salary_slips',
  'salary_advances',
  'advance_repayments',
  'salary_payments',
];

async function main() {
  console.log('🚀 Starting Data Migration from Local PostgreSQL to Neon Live Database...');
  
  try {
    // 1. Disable user triggers on Neon
    console.log('🔒 Disabling user triggers on Neon tables...');
    for (const table of TABLE_ORDER) {
      try {
        await neonPrisma.$executeRawUnsafe(`ALTER TABLE "${table}" DISABLE TRIGGER USER;`);
      } catch (err: any) {
        console.warn(`Warning disabling trigger on ${table}:`, err.message);
      }
    }

    // 2. Clear any existing rows on Neon (in reverse dependency order)
    console.log('🧹 Ensuring Neon tables are empty before migration...');
    for (const table of [...TABLE_ORDER].reverse()) {
      await neonPrisma.$executeRawUnsafe(`DELETE FROM "${table}";`);
    }

    // 3. Migrate each table in dependency order
    for (const table of TABLE_ORDER) {
      console.log(`\n📦 Migrating table: "${table}"...`);

      // Get columns & check for identity
      const columnsInfo: Array<{ column_name: string; is_identity: string; data_type: string; udt_name: string }> = await localPrisma.$queryRawUnsafe(`
        SELECT column_name, is_identity, data_type, udt_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = '${table}'
        ORDER BY ordinal_position;
      `);

      if (!columnsInfo || columnsInfo.length === 0) {
        console.log(`   ⚠️ Table ${table} has no columns or does not exist locally. Skipping.`);
        continue;
      }

      const columnNames = columnsInfo.map(c => `"${c.column_name}"`);
      const hasIdentity = columnsInfo.some(c => c.is_identity === 'YES');

      // Fetch all rows from local database
      const rows: any[] = await localPrisma.$queryRawUnsafe(`SELECT * FROM "${table}"`);
      console.log(`   Found ${rows.length} rows in local "${table}".`);

      if (rows.length === 0) {
        continue;
      }

      // Insert each row into Neon
      const overridingClause = hasIdentity ? ' OVERRIDING SYSTEM VALUE' : '';

      for (const row of rows) {
        const values: any[] = [];
        const placeholders: string[] = [];

        columnsInfo.forEach((col, idx) => {
          let val = row[col.column_name];

          // Use PostgreSQL udt_name for explicit casting
          placeholders.push(`$${idx + 1}::${col.udt_name}`);

          if (val === null || val === undefined) {
            values.push(null);
          } else if (col.udt_name === 'jsonb' || col.udt_name === 'json') {
            values.push(typeof val === 'string' ? val : JSON.stringify(val));
          } else if (col.udt_name === 'date') {
            values.push(val instanceof Date ? val.toISOString().split('T')[0] : String(val).split('T')[0]);
          } else if (col.udt_name.includes('timestamp')) {
            values.push(val instanceof Date ? val.toISOString() : String(val));
          } else if (typeof val === 'bigint') {
            values.push(val.toString());
          } else {
            values.push(val);
          }
        });

        const insertSql = `
          INSERT INTO "${table}" (${columnNames.join(', ')})${overridingClause}
          VALUES (${placeholders.join(', ')})
        `;

        await neonPrisma.$executeRawUnsafe(insertSql, ...values);
      }

      console.log(`   ✅ Successfully inserted ${rows.length} rows into Neon "${table}".`);

      // Update sequence if table has identity or serial column
      const pkCol = columnsInfo.find(c => c.is_identity === 'YES' || c.column_name.endsWith('_id'));
      if (pkCol) {
        try {
          await neonPrisma.$executeRawUnsafe(`
            SELECT setval(
              pg_get_serial_sequence('${table}', '${pkCol.column_name}'),
              COALESCE((SELECT MAX("${pkCol.column_name}") FROM "${table}"), 1)
            );
          `);
          console.log(`   🔄 Sequence reset for "${table}"."${pkCol.column_name}".`);
        } catch (seqErr: any) {
          // Ignore if no sequence exists for pkCol
        }
      }
    }

    // 4. Re-enable user triggers on Neon
    console.log('\n🔓 Re-enabling user triggers on Neon tables...');
    for (const table of TABLE_ORDER) {
      try {
        await neonPrisma.$executeRawUnsafe(`ALTER TABLE "${table}" ENABLE TRIGGER USER;`);
      } catch (err: any) {
        console.warn(`Warning enabling trigger on ${table}:`, err.message);
      }
    }

    // 5. Verification
    console.log('\n==================================================');
    console.log('📊 VERIFYING MIGRATED ROW COUNTS:');
    console.log('==================================================');
    let allMatched = true;

    for (const table of TABLE_ORDER) {
      const localCountRes: any[] = await localPrisma.$queryRawUnsafe(`SELECT COUNT(*)::int as count FROM "${table}"`);
      const neonCountRes: any[] = await neonPrisma.$queryRawUnsafe(`SELECT COUNT(*)::int as count FROM "${table}"`);

      const localCount = localCountRes[0]?.count ?? 0;
      const neonCount = neonCountRes[0]?.count ?? 0;

      const match = localCount === neonCount;
      if (!match) allMatched = false;

      console.log(` ${match ? '✅' : '❌'} ${table.padEnd(25)} Local: ${localCount.toString().padStart(3)} | Neon: ${neonCount.toString().padStart(3)}`);
    }

    console.log('==================================================');
    if (allMatched) {
      console.log('🎉 ALL DATA MIGRATED AND VERIFIED SUCCESSFULLY!');
    } else {
      console.log('⚠️ Some table counts did not match. Please review output above.');
    }

  } catch (err: any) {
    console.error('❌ Data migration failed:', err);
    // Ensure triggers get re-enabled on error
    for (const table of TABLE_ORDER) {
      try {
        await neonPrisma.$executeRawUnsafe(`ALTER TABLE "${table}" ENABLE TRIGGER USER;`);
      } catch {}
    }
  } finally {
    await localPrisma.$disconnect();
    await neonPrisma.$disconnect();
  }
}

main();

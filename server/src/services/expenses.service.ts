import { prisma } from '../config/prisma.js';
import {
  ExpenseTypeItem,
  CreateExpenseTypeDTO,
  UpdateExpenseTypeDTO,
  ExpenseItem,
  CreateExpenseDTO,
  UpdateExpenseDTO,
  ExpenseFilters,
  ExpenseSummary,
  ExpensePaymentMode,
} from '../types/expenses.types.js';

export class ExpensesService {
  // =========================================================================
  // 1. EXPENSE TYPES (SETTINGS)
  // =========================================================================

  static async getExpenseTypes(tenantId: number): Promise<ExpenseTypeItem[]> {
    // Ensure default system types exist for this tenant
    await this.ensureDefaultExpenseTypes(tenantId);

    const rows: any[] = await prisma.$queryRawUnsafe(
      `SELECT 
         et.expense_type_id,
         et.name,
         et.description,
         et.is_system,
         et.is_active,
         et.created_at,
         COUNT(e.expense_id)::int AS expenses_count
       FROM expense_types et
       LEFT JOIN expenses e ON e.expense_type_id = et.expense_type_id AND e.is_deleted = FALSE
       WHERE et.tenant_id = $1 AND et.is_deleted = FALSE
       GROUP BY et.expense_type_id
       ORDER BY et.is_system DESC, et.name ASC`,
      tenantId
    );

    return rows.map((r) => ({
      id: r.expense_type_id.toString(),
      expenseTypeId: r.expense_type_id.toString(),
      name: r.name,
      description: r.description,
      isSystem: Boolean(r.is_system),
      isActive: Boolean(r.is_active),
      createdAt: new Date(r.created_at).toISOString(),
      expensesCount: Number(r.expenses_count || 0),
    }));
  }

  static async createExpenseType(tenantId: number, dto: CreateExpenseTypeDTO): Promise<ExpenseTypeItem> {
    const trimmedName = dto.name.trim();
    if (!trimmedName) {
      const err = new Error('Expense type name is required.') as Error & { statusCode?: number };
      err.statusCode = 400;
      throw err;
    }

    // Check duplicate
    const existing: any[] = await prisma.$queryRawUnsafe(
      `SELECT expense_type_id, is_deleted 
       FROM expense_types 
       WHERE tenant_id = $1 AND LOWER(name) = LOWER($2)`,
      tenantId,
      trimmedName
    );

    if (existing.length > 0) {
      if (!existing[0].is_deleted) {
        const err = new Error(`Expense type "${trimmedName}" already exists.`) as Error & { statusCode?: number };
        err.statusCode = 409;
        throw err;
      }
      // Reactivate if previously deleted
      const updated: any[] = await prisma.$queryRawUnsafe(
        `UPDATE expense_types 
         SET is_deleted = FALSE, is_active = TRUE, description = $1, updated_at = now()
         WHERE expense_type_id = $2
         RETURNING *`,
        dto.description?.trim() || null,
        existing[0].expense_type_id
      );
      const row = updated[0];
      return {
        id: row.expense_type_id.toString(),
        expenseTypeId: row.expense_type_id.toString(),
        name: row.name,
        description: row.description,
        isSystem: Boolean(row.is_system),
        isActive: Boolean(row.is_active),
        createdAt: new Date(row.created_at).toISOString(),
        expensesCount: 0,
      };
    }

    const inserted: any[] = await prisma.$queryRawUnsafe(
      `INSERT INTO expense_types (tenant_id, name, description, is_system, is_active)
       VALUES ($1, $2, $3, FALSE, $4)
       RETURNING *`,
      tenantId,
      trimmedName,
      dto.description?.trim() || null,
      dto.isActive !== false
    );

    const row = inserted[0];
    return {
      id: row.expense_type_id.toString(),
      expenseTypeId: row.expense_type_id.toString(),
      name: row.name,
      description: row.description,
      isSystem: Boolean(row.is_system),
      isActive: Boolean(row.is_active),
      createdAt: new Date(row.created_at).toISOString(),
      expensesCount: 0,
    };
  }

  static async updateExpenseType(tenantId: number, id: string, dto: UpdateExpenseTypeDTO): Promise<ExpenseTypeItem> {
    const typeId = BigInt(id);

    const rows: any[] = await prisma.$queryRawUnsafe(
      `SELECT * FROM expense_types WHERE expense_type_id = $1 AND tenant_id = $2 AND is_deleted = FALSE`,
      typeId,
      tenantId
    );

    if (rows.length === 0) {
      const err = new Error('Expense type not found.') as Error & { statusCode?: number };
      err.statusCode = 404;
      throw err;
    }

    const current = rows[0];
    const newName = dto.name !== undefined ? dto.name.trim() : current.name;
    const newDesc = dto.description !== undefined ? dto.description.trim() : current.description;
    const newActive = dto.isActive !== undefined ? dto.isActive : current.is_active;

    if (!newName) {
      const err = new Error('Expense type name cannot be blank.') as Error & { statusCode?: number };
      err.statusCode = 400;
      throw err;
    }

    const updated: any[] = await prisma.$queryRawUnsafe(
      `UPDATE expense_types 
       SET name = $1, description = $2, is_active = $3, updated_at = now()
       WHERE expense_type_id = $4
       RETURNING *`,
      newName,
      newDesc,
      newActive,
      typeId
    );

    const r = updated[0];
    return {
      id: r.expense_type_id.toString(),
      expenseTypeId: r.expense_type_id.toString(),
      name: r.name,
      description: r.description,
      isSystem: Boolean(r.is_system),
      isActive: Boolean(r.is_active),
      createdAt: new Date(r.created_at).toISOString(),
    };
  }

  static async toggleExpenseTypeStatus(tenantId: number, id: string): Promise<ExpenseTypeItem> {
    const typeId = BigInt(id);
    const updated: any[] = await prisma.$queryRawUnsafe(
      `UPDATE expense_types 
       SET is_active = NOT is_active, updated_at = now()
       WHERE expense_type_id = $1 AND tenant_id = $2 AND is_deleted = FALSE
       RETURNING *`,
      typeId,
      tenantId
    );

    if (updated.length === 0) {
      const err = new Error('Expense type not found.') as Error & { statusCode?: number };
      err.statusCode = 404;
      throw err;
    }

    const r = updated[0];
    return {
      id: r.expense_type_id.toString(),
      expenseTypeId: r.expense_type_id.toString(),
      name: r.name,
      description: r.description,
      isSystem: Boolean(r.is_system),
      isActive: Boolean(r.is_active),
      createdAt: new Date(r.created_at).toISOString(),
    };
  }

  static async deleteExpenseType(tenantId: number, id: string): Promise<void> {
    const typeId = BigInt(id);

    const rows: any[] = await prisma.$queryRawUnsafe(
      `SELECT * FROM expense_types WHERE expense_type_id = $1 AND tenant_id = $2 AND is_deleted = FALSE`,
      typeId,
      tenantId
    );

    if (rows.length === 0) {
      const err = new Error('Expense type not found.') as Error & { statusCode?: number };
      err.statusCode = 404;
      throw err;
    }

    if (rows[0].is_system) {
      const err = new Error('System expense types cannot be deleted.') as Error & { statusCode?: number };
      err.statusCode = 400;
      throw err;
    }

    // Check if expenses exist under this type
    const countRes: any[] = await prisma.$queryRawUnsafe(
      `SELECT COUNT(*)::int AS count FROM expenses WHERE expense_type_id = $1 AND is_deleted = FALSE`,
      typeId
    );

    if (Number(countRes[0]?.count || 0) > 0) {
      const err = new Error(`Cannot delete this expense type because ${countRes[0].count} expense record(s) are linked to it. Consider deactivating it instead.`) as Error & { statusCode?: number };
      err.statusCode = 400;
      throw err;
    }

    await prisma.$queryRawUnsafe(
      `UPDATE expense_types SET is_deleted = TRUE, updated_at = now() WHERE expense_type_id = $1`,
      typeId
    );
  }

  // =========================================================================
  // 2. EXPENSES (RECORDS & LEDGER)
  // =========================================================================

  static async getExpenses(tenantId: number, filters: ExpenseFilters = {}): Promise<ExpenseItem[]> {
    let query = `
      SELECT 
        e.*,
        et.name AS expense_type_name,
        ba.account_name AS bank_name,
        ba.bank_name AS bank_institution_name,
        ui.upi_handle,
        u.full_name AS created_by_name,
        st.full_name AS staff_name,
        ss.salary_month
      FROM expenses e
      JOIN expense_types et ON et.expense_type_id = e.expense_type_id
      LEFT JOIN bank_accounts ba ON ba.bank_account_id = e.bank_account_id
      LEFT JOIN upi_ids ui ON ui.upi_id_id = e.upi_id_id
      LEFT JOIN users u ON u.user_id = e.created_by
      LEFT JOIN salary_slips ss ON ss.slip_id = e.salary_slip_id
      LEFT JOIN staff st ON st.staff_id = ss.staff_id
      WHERE e.tenant_id = $1 AND e.is_deleted = FALSE
    `;

    const params: any[] = [tenantId];
    let pIdx = 2;

    if (filters.expenseTypeId) {
      query += ` AND e.expense_type_id = $${pIdx++}`;
      params.push(BigInt(filters.expenseTypeId));
    }

    if (filters.paymentMode) {
      query += ` AND e.payment_mode = $${pIdx++}`;
      params.push(filters.paymentMode.toUpperCase());
    }

    if (filters.startDate) {
      query += ` AND e.expense_date >= $${pIdx++}::date`;
      params.push(filters.startDate);
    }

    if (filters.endDate) {
      query += ` AND e.expense_date <= $${pIdx++}::date`;
      params.push(filters.endDate);
    }

    if (filters.source === 'MANUAL') {
      query += ` AND e.salary_payment_id IS NULL`;
    } else if (filters.source === 'SALARY') {
      query += ` AND e.salary_payment_id IS NOT NULL`;
    }

    if (filters.search) {
      const s = `%${filters.search.trim().toLowerCase()}%`;
      query += ` AND (
        LOWER(e.title) LIKE $${pIdx} OR 
        LOWER(COALESCE(e.expense_code, '')) LIKE $${pIdx} OR 
        LOWER(COALESCE(e.reference_no, '')) LIKE $${pIdx} OR 
        LOWER(COALESCE(e.notes, '')) LIKE $${pIdx} OR 
        LOWER(et.name) LIKE $${pIdx} OR 
        LOWER(COALESCE(st.full_name, '')) LIKE $${pIdx}
      )`;
      params.push(s);
      pIdx++;
    }

    query += ` ORDER BY e.expense_date DESC, e.expense_id DESC`;

    const rows: any[] = await prisma.$queryRawUnsafe(query, ...params);

    return rows.map((r) => this.formatExpenseRow(r));
  }

  static async getExpenseById(tenantId: number, id: string): Promise<ExpenseItem> {
    const eId = BigInt(id);
    const rows: any[] = await prisma.$queryRawUnsafe(
      `SELECT 
        e.*,
        et.name AS expense_type_name,
        ba.account_name AS bank_name,
        ba.bank_name AS bank_institution_name,
        ui.upi_handle,
        u.full_name AS created_by_name,
        st.full_name AS staff_name,
        ss.salary_month
      FROM expenses e
      JOIN expense_types et ON et.expense_type_id = e.expense_type_id
      LEFT JOIN bank_accounts ba ON ba.bank_account_id = e.bank_account_id
      LEFT JOIN upi_ids ui ON ui.upi_id_id = e.upi_id_id
      LEFT JOIN users u ON u.user_id = e.created_by
      LEFT JOIN salary_slips ss ON ss.slip_id = e.salary_slip_id
      LEFT JOIN staff st ON st.staff_id = ss.staff_id
      WHERE e.expense_id = $1 AND e.tenant_id = $2 AND e.is_deleted = FALSE`,
      eId,
      tenantId
    );

    if (rows.length === 0) {
      const err = new Error('Expense not found.') as Error & { statusCode?: number };
      err.statusCode = 404;
      throw err;
    }

    return this.formatExpenseRow(rows[0]);
  }

  static async createExpense(
    tenantId: number,
    userId: bigint,
    dto: CreateExpenseDTO
  ): Promise<ExpenseItem> {
    const amount = Number(dto.amount);
    if (!amount || amount <= 0) {
      const err = new Error('Expense amount must be greater than zero.') as Error & { statusCode?: number };
      err.statusCode = 400;
      throw err;
    }

    const title = dto.title?.trim();
    if (!title) {
      const err = new Error('Expense title/description is required.') as Error & { statusCode?: number };
      err.statusCode = 400;
      throw err;
    }

    const expenseTypeId = BigInt(dto.expenseTypeId);
    const typeCheck: any[] = await prisma.$queryRawUnsafe(
      `SELECT expense_type_id, name, is_active FROM expense_types WHERE expense_type_id = $1 AND tenant_id = $2 AND is_deleted = FALSE`,
      expenseTypeId,
      tenantId
    );

    if (typeCheck.length === 0) {
      const err = new Error('Selected expense type not found.') as Error & { statusCode?: number };
      err.statusCode = 404;
      throw err;
    }

    const mode = (dto.paymentMode || 'CASH').toUpperCase() as ExpensePaymentMode;
    const expenseDate = dto.expenseDate || new Date().toISOString().split('T')[0];

    let bankAccountId: bigint | null = null;
    let upiIdId: bigint | null = null;

    if (mode !== 'CASH' && mode !== 'OTHER') {
      if (dto.bankAccountId) {
        bankAccountId = BigInt(dto.bankAccountId);
        const bank = await prisma.bankAccount.findFirst({
          where: { bankAccountId, tenantId, isDeleted: false },
        });
        if (!bank) {
          const err = new Error('Bank account not found.') as Error & { statusCode?: number };
          err.statusCode = 404;
          throw err;
        }
      }
      if (dto.upiIdId) {
        upiIdId = BigInt(dto.upiIdId);
      }
    }

    return await prisma.$transaction(async (tx) => {
      // 1. Generate Expense Code: e.g. EXP-1001
      const countRes: any[] = await tx.$queryRawUnsafe(
        `SELECT COUNT(*)::int AS count FROM expenses WHERE tenant_id = $1`,
        tenantId
      );
      const nextNum = (countRes[0]?.count || 0) + 1;
      const expenseCode = `EXP-${String(nextNum).padStart(4, '0')}`;

      // 2. Insert into expenses
      const insRes: any[] = await tx.$queryRawUnsafe(
        `INSERT INTO expenses (
           tenant_id, expense_code, expense_type_id, title, amount,
           expense_date, payment_mode, bank_account_id, upi_id_id,
           reference_no, notes, salary_slip_id, salary_payment_id,
           created_by
         )
         VALUES ($1, $2, $3, $4, $5, $6::date, $7, $8, $9, $10, $11, $12, $13, $14)
         RETURNING expense_id`,
        tenantId,
        expenseCode,
        expenseTypeId,
        title,
        amount,
        expenseDate,
        mode,
        bankAccountId,
        upiIdId,
        dto.referenceNo?.trim() || null,
        dto.notes?.trim() || null,
        dto.salarySlipId ? BigInt(dto.salarySlipId) : null,
        dto.salaryPaymentId ? BigInt(dto.salaryPaymentId) : null,
        userId
      );

      const expenseId = insRes[0].expense_id;

      // 3. Ledger movement (only for manual expenses, because salary_payments already moved funds)
      if (!dto.salaryPaymentId) {
        if (mode === 'CASH') {
          await tx.cashTransaction.create({
            data: {
              tenantId,
              transactionType: 2, // Outflow
              amount,
              transactionDate: new Date(expenseDate),
              description: `Expense [${typeCheck[0].name}]: ${title}`,
              referenceType: 'EXPENSE',
              referenceId: expenseId,
              createdBy: userId,
            },
          });
        } else if (bankAccountId) {
          await tx.bankAccount.update({
            where: { bankAccountId },
            data: { currentBalance: { decrement: amount } },
          });
        }
      }

      return await ExpensesService.getExpenseById(tenantId, expenseId.toString());
    });
  }

  static async updateExpense(
    tenantId: number,
    id: string,
    dto: UpdateExpenseDTO
  ): Promise<ExpenseItem> {
    const eId = BigInt(id);

    const rows: any[] = await prisma.$queryRawUnsafe(
      `SELECT * FROM expenses WHERE expense_id = $1 AND tenant_id = $2 AND is_deleted = FALSE`,
      eId,
      tenantId
    );

    if (rows.length === 0) {
      const err = new Error('Expense not found.') as Error & { statusCode?: number };
      err.statusCode = 404;
      throw err;
    }

    const current = rows[0];
    if (current.salary_payment_id) {
      const err = new Error('Direct edits on salary payouts are restricted. Please manage salary slips from the Payroll module.') as Error & { statusCode?: number };
      err.statusCode = 400;
      throw err;
    }

    const title = dto.title !== undefined ? dto.title.trim() : current.title;
    const notes = dto.notes !== undefined ? dto.notes.trim() : current.notes;
    const referenceNo = dto.referenceNo !== undefined ? dto.referenceNo.trim() : current.reference_no;
    const expenseDate = dto.expenseDate !== undefined ? dto.expenseDate : current.expense_date;
    const expenseTypeId = dto.expenseTypeId ? BigInt(dto.expenseTypeId) : current.expense_type_id;

    await prisma.$queryRawUnsafe(
      `UPDATE expenses 
       SET title = $1, notes = $2, reference_no = $3, expense_date = $4::date, expense_type_id = $5, updated_at = now()
       WHERE expense_id = $6`,
      title,
      notes,
      referenceNo,
      expenseDate,
      expenseTypeId,
      eId
    );

    return await ExpensesService.getExpenseById(tenantId, id);
  }

  static async deleteExpense(tenantId: number, id: string): Promise<void> {
    const eId = BigInt(id);

    const rows: any[] = await prisma.$queryRawUnsafe(
      `SELECT * FROM expenses WHERE expense_id = $1 AND tenant_id = $2 AND is_deleted = FALSE`,
      eId,
      tenantId
    );

    if (rows.length === 0) {
      const err = new Error('Expense not found.') as Error & { statusCode?: number };
      err.statusCode = 404;
      throw err;
    }

    const expense = rows[0];
    if (expense.salary_payment_id) {
      const err = new Error('Cannot delete a salary payout expense directly. Cancel or rollback the payment in the Payroll module.') as Error & { statusCode?: number };
      err.statusCode = 400;
      throw err;
    }

    await prisma.$transaction(async (tx) => {
      // Rollback money movement
      const amount = Number(expense.amount);
      const mode = expense.payment_mode;

      if (mode === 'CASH') {
        // Rollback cash transaction
        await tx.cashTransaction.deleteMany({
          where: {
            tenantId,
            referenceType: 'EXPENSE',
            referenceId: eId,
          },
        });
      } else if (expense.bank_account_id) {
        // Restore bank account balance
        await tx.bankAccount.update({
          where: { bankAccountId: expense.bank_account_id },
          data: { currentBalance: { increment: amount } },
        });
      }

      // Soft delete expense
      await tx.$queryRawUnsafe(
        `UPDATE expenses SET is_deleted = TRUE, updated_at = now() WHERE expense_id = $1`,
        eId
      );
    });
  }

  // =========================================================================
  // 3. EXPENSE SUMMARY & ANALYTICS (FOR REPORTS & DASHBOARD)
  // =========================================================================

  static async getExpenseSummary(
    tenantId: number,
    startDate?: string,
    endDate?: string
  ): Promise<ExpenseSummary> {
    let whereClause = `e.tenant_id = $1 AND e.is_deleted = FALSE`;
    const params: any[] = [tenantId];
    let pIdx = 2;

    if (startDate) {
      whereClause += ` AND e.expense_date >= $${pIdx++}::date`;
      params.push(startDate);
    }
    if (endDate) {
      whereClause += ` AND e.expense_date <= $${pIdx++}::date`;
      params.push(endDate);
    }

    // Totals
    const totalsRes: any[] = await prisma.$queryRawUnsafe(
      `SELECT 
         COALESCE(SUM(e.amount), 0) AS total_amount,
         COUNT(e.expense_id)::int AS total_count,
         COALESCE(SUM(CASE WHEN e.salary_payment_id IS NOT NULL THEN e.amount ELSE 0 END), 0) AS salary_expenses,
         COALESCE(SUM(CASE WHEN e.salary_payment_id IS NULL THEN e.amount ELSE 0 END), 0) AS operational_expenses,
         COALESCE(SUM(CASE WHEN e.payment_mode = 'CASH' THEN e.amount ELSE 0 END), 0) AS cash_amount,
         COALESCE(SUM(CASE WHEN e.payment_mode != 'CASH' THEN e.amount ELSE 0 END), 0) AS bank_amount
       FROM expenses e
       WHERE ${whereClause}`,
      ...params
    );

    const totals = totalsRes[0] || {};
    const totalAmount = Number(totals.total_amount || 0);

    // Group by category
    const catRes: any[] = await prisma.$queryRawUnsafe(
      `SELECT 
         et.expense_type_id,
         et.name,
         COALESCE(SUM(e.amount), 0) AS amount,
         COUNT(e.expense_id)::int AS count
       FROM expense_types et
       JOIN expenses e ON e.expense_type_id = et.expense_type_id AND e.is_deleted = FALSE
       WHERE ${whereClause}
       GROUP BY et.expense_type_id, et.name
       ORDER BY amount DESC`,
      ...params
    );

    const byCategory = catRes.map((c) => {
      const amt = Number(c.amount || 0);
      return {
        typeId: c.expense_type_id.toString(),
        typeName: c.name,
        amount: amt,
        count: Number(c.count || 0),
        percentage: totalAmount > 0 ? Number(((amt / totalAmount) * 100).toFixed(1)) : 0,
      };
    });

    return {
      totalAmount,
      totalCount: Number(totals.total_count || 0),
      operationalExpenses: Number(totals.operational_expenses || 0),
      salaryExpenses: Number(totals.salary_expenses || 0),
      cashAmount: Number(totals.cash_amount || 0),
      bankAmount: Number(totals.bank_amount || 0),
      byCategory,
    };
  }

  // =========================================================================
  // 4. HELPERS
  // =========================================================================

  private static formatExpenseRow(r: any): ExpenseItem {
    return {
      id: r.expense_id.toString(),
      expenseId: r.expense_id.toString(),
      expenseCode: r.expense_code,
      expenseTypeId: r.expense_type_id.toString(),
      expenseTypeName: r.expense_type_name,
      title: r.title,
      amount: Number(r.amount),
      expenseDate: r.expense_date instanceof Date ? r.expense_date.toISOString().split('T')[0] : String(r.expense_date).split('T')[0],
      paymentMode: r.payment_mode as ExpensePaymentMode,
      bankAccountId: r.bank_account_id ? r.bank_account_id.toString() : null,
      bankAccountName: r.bank_name ? `${r.bank_name} (${r.bank_institution_name || ''})` : null,
      upiIdId: r.upi_id_id ? r.upi_id_id.toString() : null,
      upiHandle: r.upi_handle,
      referenceNo: r.reference_no,
      notes: r.notes,
      salarySlipId: r.salary_slip_id ? r.salary_slip_id.toString() : null,
      salaryPaymentId: r.salary_payment_id ? r.salary_payment_id.toString() : null,
      staffName: r.staff_name,
      salaryMonth: r.salary_month instanceof Date ? r.salary_month.toISOString().split('T')[0] : (r.salary_month ? String(r.salary_month).split('T')[0] : null),
      isSalaryExpense: Boolean(r.salary_payment_id),
      createdByName: r.created_by_name,
      createdAt: new Date(r.created_at).toISOString(),
    };
  }

  private static async ensureDefaultExpenseTypes(tenantId: number): Promise<void> {
    const defaults = [
      { name: 'Staff Salary & Payroll', desc: 'Staff wages, trainer salaries, advances and compensation', isSystem: true },
      { name: 'Rent & Facility', desc: 'Gym premises rent and lease charges', isSystem: false },
      { name: 'Electricity & Power', desc: 'Power bills, backup generator diesel and electricity charges', isSystem: false },
      { name: 'Water & Utilities', desc: 'Water tanker, dispenser bottles, and sanitary utilities', isSystem: false },
      { name: 'Equipment Maintenance & Repair', desc: 'Gym machine servicing, cable replacements, and weights upkeep', isSystem: false },
      { name: 'Housekeeping & Cleaning', desc: 'Cleaning liquids, sanitizers, toilet rolls, and housekeeping supplies', isSystem: false },
      { name: 'Marketing & Advertising', desc: 'Social media ads, banners, pamphlets, and promotions', isSystem: false },
      { name: 'Software & Internet', desc: 'Wi-Fi broadband connection, music subscriptions, and software tools', isSystem: false },
      { name: 'Miscellaneous', desc: 'General day-to-day miscellaneous operational expenses', isSystem: false },
    ];

    for (const d of defaults) {
      await prisma.$executeRawUnsafe(
        `INSERT INTO expense_types (tenant_id, name, description, is_system, is_active)
         SELECT $1, $2, $3, $4, TRUE
         WHERE NOT EXISTS (
           SELECT 1 FROM expense_types WHERE tenant_id = $1 AND LOWER(name) = LOWER($2)
         )`,
        tenantId,
        d.name,
        d.desc,
        d.isSystem
      );
    }
  }
}

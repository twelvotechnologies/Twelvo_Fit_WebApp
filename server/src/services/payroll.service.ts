import { prisma } from '../config/prisma.js';
import {
  AttendanceStatus,
  DailyAttendanceResponse,
  DailyAttendanceStaffItem,
  BulkUpsertAttendanceDTO,
  MonthlyAttendanceResponse,
  MonthlyAttendanceStaffItem,
  MonthlyAttendanceDayMark,
  PaymentMode,
  SalaryAdvanceItem,
  CreateAdvanceDTO,
  CreateRepaymentDTO,
  AdvanceLedgerItem,
  SalaryPreviewItem,
  SalarySlipSummaryItem,
  GenerateSalariesDTO,
  RecordSalaryPaymentDTO,
  SlipDetailResponse,
  roundCurrency,
} from '../types/payroll.types.js';

export class PayrollService {
  // ================================================================
  // SECTION 1: ATTENDANCE
  // ================================================================

  /**
   * Get active staff daily attendance for a given date
   */
  static async getDailyAttendance(
    tenantId: number,
    dateStr: string
  ): Promise<DailyAttendanceResponse> {
    // Check if the month of this date is locked (has a finalized slip)
    const monthStart = `${dateStr.substring(0, 7)}-01`;
    const lockedSlips: any[] = await prisma.$queryRawUnsafe(
      `SELECT staff_id FROM salary_slips 
       WHERE tenant_id = $1 AND salary_month = $2::date AND status = 'FINALIZED'`,
      tenantId,
      monthStart
    );
    const lockedStaffIds = new Set(lockedSlips.map((s) => s.staff_id.toString()));

    // Query 7a: active staff joining_date <= dateStr, left join staff_attendance
    const rows: any[] = await prisma.$queryRawUnsafe(
      `SELECT 
         s.staff_id, 
         s.staff_code, 
         s.full_name, 
         s.designation,
         s.photo_url,
         s.joining_date,
         a.status, 
         a.note
       FROM staff s
       LEFT JOIN staff_attendance a
              ON a.staff_id = s.staff_id 
             AND a.attendance_date = $2::date
             AND a.tenant_id = $1
       WHERE s.tenant_id = $1 
         AND s.is_deleted = FALSE
         AND s.employment_status = 'active' 
         AND s.joining_date <= $2::date
       ORDER BY s.full_name ASC`,
      tenantId,
      dateStr
    );

    let fullDay = 0;
    let halfDay = 0;
    let paidLeave = 0;
    let absent = 0;
    let unmarked = 0;

    const staff: DailyAttendanceStaffItem[] = rows.map((r) => {
      const sId = r.staff_id.toString();
      const status = (r.status as AttendanceStatus) || null;

      if (status === 'FULL_DAY') fullDay++;
      else if (status === 'HALF_DAY') halfDay++;
      else if (status === 'PAID_LEAVE') paidLeave++;
      else if (status === 'ABSENT') absent++;
      else unmarked++;

      return {
        staffId: sId,
        staffCode: r.staff_code || `STF-${sId}`,
        fullName: r.full_name,
        designation: r.designation || undefined,
        photoUrl: r.photo_url || undefined,
        joiningDate: r.joining_date ? new Date(r.joining_date).toISOString().split('T')[0] : '',
        status,
        note: r.note || null,
        isLocked: lockedStaffIds.has(sId),
      };
    });

    return {
      date: dateStr,
      isMonthLocked: lockedStaffIds.size > 0,
      summary: {
        totalActive: staff.length,
        fullDay,
        halfDay,
        paidLeave,
        absent,
        unmarked,
      },
      staff,
    };
  }

  /**
   * Bulk upsert attendance for a single date
   */
  static async saveAttendance(
    tenantId: number,
    userId: bigint,
    dto: BulkUpsertAttendanceDTO
  ): Promise<{ updatedCount: number }> {
    const { date, entries } = dto;
    if (!date || !Array.isArray(entries)) {
      const err = new Error('Invalid attendance payload.') as Error & { statusCode?: number };
      err.statusCode = 400;
      throw err;
    }

    // Verify date is not in future
    const today = new Date().toISOString().split('T')[0];
    if (date > today) {
      const err = new Error('Cannot mark attendance for future dates.') as Error & { statusCode?: number };
      err.statusCode = 400;
      throw err;
    }

    const monthStart = `${date.substring(0, 7)}-01`;

    // Execute bulk upsert in single transaction
    await prisma.$transaction(async (tx) => {
      // 1. Verify no staff member in the batch has a finalized slip for this month
      const staffIds = entries.map((e) => BigInt(e.staffId));
      if (staffIds.length === 0) return;

      const finalized: any[] = await tx.$queryRawUnsafe(
        `SELECT s.staff_id, st.full_name 
         FROM salary_slips s
         JOIN staff st ON st.staff_id = s.staff_id
         WHERE s.tenant_id = $1 
           AND s.salary_month = $2::date 
           AND s.status = 'FINALIZED'
           AND s.staff_id = ANY($3::bigint[])`,
        tenantId,
        monthStart,
        staffIds
      );

      if (finalized.length > 0) {
        const names = finalized.map((f) => f.full_name).join(', ');
        const err = new Error(
          `Cannot modify attendance: Salary slip for ${names} is already FINALIZED for this month.`
        ) as Error & { statusCode?: number };
        err.statusCode = 422;
        throw err;
      }

      // 2. Query 7b: Bulk upsert attendance
      for (const entry of entries) {
        await tx.$executeRawUnsafe(
          `INSERT INTO staff_attendance (tenant_id, staff_id, attendance_date, status, note, marked_by)
           VALUES ($1, $2, $3::date, $4, $5, $6)
           ON CONFLICT (staff_id, attendance_date)
           DO UPDATE SET status = EXCLUDED.status, 
                         note = EXCLUDED.note,
                         marked_by = EXCLUDED.marked_by, 
                         updated_at = now()`,
          tenantId,
          BigInt(entry.staffId),
          date,
          entry.status,
          entry.note?.trim() || null,
          userId
        );
      }
    });

    return { updatedCount: entries.length };
  }

  /**
   * Monthly Attendance Grid View
   */
  static async getMonthlyAttendance(
    tenantId: number,
    monthStr: string
  ): Promise<MonthlyAttendanceResponse> {
    const [yearStr, mStr] = monthStr.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(mStr, 10);
    const daysInMonth = new Date(year, month, 0).getDate();

    const mStart = `${monthStr}-01`;
    const mEnd = `${monthStr}-${daysInMonth.toString().padStart(2, '0')}`;

    // Get active staff for month
    const staffRows: any[] = await prisma.$queryRawUnsafe(
      `SELECT staff_id, staff_code, full_name, designation, joining_date
       FROM staff
       WHERE tenant_id = $1 
         AND is_deleted = FALSE 
         AND employment_status = 'active'
         AND joining_date <= $2::date
       ORDER BY full_name ASC`,
      tenantId,
      mEnd
    );

    // Get all attendance marks for this tenant and month
    const attendanceRows: any[] = await prisma.$queryRawUnsafe(
      `SELECT staff_id, attendance_date, status, note
       FROM staff_attendance
       WHERE tenant_id = $1 
         AND attendance_date BETWEEN $2::date AND $3::date`,
      tenantId,
      mStart,
      mEnd
    );

    // Get finalized slips to check lock status
    const lockedSlips: any[] = await prisma.$queryRawUnsafe(
      `SELECT staff_id FROM salary_slips
       WHERE tenant_id = $1 AND salary_month = $2::date AND status = 'FINALIZED'`,
      tenantId,
      mStart
    );
    const lockedStaffIds = new Set(lockedSlips.map((s) => s.staff_id.toString()));

    // Map marks by staff_id -> dateStr -> { status, note }
    const marksMap = new Map<string, Map<string, { status: AttendanceStatus; note: string | null }>>();
    for (const r of attendanceRows) {
      const sId = r.staff_id.toString();
      const dStr = new Date(r.attendance_date).toISOString().split('T')[0];
      if (!marksMap.has(sId)) {
        marksMap.set(sId, new Map());
      }
      marksMap.get(sId)!.set(dStr, {
        status: r.status as AttendanceStatus,
        note: r.note || null,
      });
    }

    const staff: MonthlyAttendanceStaffItem[] = staffRows.map((s) => {
      const sId = s.staff_id.toString();
      const sMarks = marksMap.get(sId);
      const isLocked = lockedStaffIds.has(sId);

      const dayMarks: MonthlyAttendanceDayMark[] = [];
      let fullDays = 0;
      let halfDays = 0;
      let paidLeaveDays = 0;
      let explicitAbsent = 0;
      let unmarkedDays = 0;

      for (let day = 1; day <= daysInMonth; day++) {
        const curDate = `${monthStr}-${day.toString().padStart(2, '0')}`;
        const mark = sMarks?.get(curDate);
        const status = mark ? mark.status : null;

        if (status === 'FULL_DAY') fullDays++;
        else if (status === 'HALF_DAY') halfDays++;
        else if (status === 'PAID_LEAVE') paidLeaveDays++;
        else if (status === 'ABSENT') explicitAbsent++;
        else unmarkedDays++;

        dayMarks.push({
          day,
          date: curDate,
          status,
          note: mark ? mark.note : null,
        });
      }

      const absentDays = explicitAbsent + unmarkedDays; // Rule: unmarked counts as absent
      const payableDays = roundCurrency(fullDays + halfDays * 0.5 + paidLeaveDays);

      return {
        staffId: sId,
        staffCode: s.staff_code || `STF-${sId}`,
        fullName: s.full_name,
        designation: s.designation || undefined,
        isLocked,
        marks: dayMarks,
        totals: {
          fullDays,
          halfDays,
          paidLeaveDays,
          absentDays,
          unmarkedDays,
          payableDays,
        },
      };
    });

    return {
      month: monthStr,
      daysInMonth,
      staff,
    };
  }

  // ================================================================
  // SECTION 2: ADVANCES & REPAYMENTS
  // ================================================================

  /**
   * Get advances with repayment balances (uses v_advance_balances)
   */
  static async getAdvances(
    tenantId: number,
    filters: {
      staffId?: string;
      status?: string;
      from?: string;
      to?: string;
    }
  ): Promise<{
    advances: SalaryAdvanceItem[];
    summary: { totalAdvanced: number; totalRepaid: number; totalOutstanding: number };
  }> {
    let query = `
      SELECT 
        v.advance_id,
        v.tenant_id,
        v.staff_id,
        v.amount,
        v.advance_date,
        v.status,
        v.repaid_amount,
        v.outstanding_amount,
        a.reason,
        a.payment_mode,
        a.bank_account_id,
        a.reference_no,
        a.created_at,
        s.full_name AS staff_name,
        s.staff_code,
        b.bank_name,
        u.full_name AS created_by_name
      FROM v_advance_balances v
      JOIN salary_advances a ON a.advance_id = v.advance_id
      JOIN staff s ON s.staff_id = v.staff_id
      LEFT JOIN bank_accounts b ON b.bank_account_id = a.bank_account_id
      LEFT JOIN users u ON u.user_id = a.created_by
      WHERE v.tenant_id = $1
    `;

    const params: any[] = [tenantId];
    let pIdx = 2;

    if (filters.staffId) {
      query += ` AND v.staff_id = $${pIdx++}`;
      params.push(BigInt(filters.staffId));
    }

    if (filters.status) {
      if (filters.status === 'Outstanding') {
        query += ` AND v.status = 'ACTIVE' AND v.outstanding_amount > 0`;
      } else if (filters.status === 'Cleared') {
        query += ` AND v.status = 'ACTIVE' AND v.outstanding_amount <= 0`;
      } else if (filters.status === 'Cancelled') {
        query += ` AND v.status = 'CANCELLED'`;
      } else {
        query += ` AND v.status = $${pIdx++}`;
        params.push(filters.status.toUpperCase());
      }
    }

    if (filters.from) {
      query += ` AND v.advance_date >= $${pIdx++}::date`;
      params.push(filters.from);
    }

    if (filters.to) {
      query += ` AND v.advance_date <= $${pIdx++}::date`;
      params.push(filters.to);
    }

    query += ` ORDER BY v.advance_date DESC, v.advance_id DESC`;

    const rows: any[] = await prisma.$queryRawUnsafe(query, ...params);

    let totalAdvanced = 0;
    let totalRepaid = 0;
    let totalOutstanding = 0;

    const advances: SalaryAdvanceItem[] = rows.map((r) => {
      const amt = Number(r.amount);
      const rep = Number(r.repaid_amount);
      const out = Number(r.outstanding_amount);

      if (r.status === 'ACTIVE') {
        totalAdvanced += amt;
        totalRepaid += rep;
        totalOutstanding += out;
      }

      return {
        advanceId: r.advance_id.toString(),
        tenantId: r.tenant_id,
        staffId: r.staff_id.toString(),
        staffName: r.staff_name,
        staffCode: r.staff_code || `STF-${r.staff_id}`,
        amount: amt,
        repaidAmount: rep,
        outstandingAmount: out,
        advanceDate: new Date(r.advance_date).toISOString().split('T')[0],
        reason: r.reason || undefined,
        paymentMode: r.payment_mode,
        bankAccountId: r.bank_account_id ? r.bank_account_id.toString() : undefined,
        bankName: r.bank_name || undefined,
        referenceNo: r.reference_no || undefined,
        status: r.status,
        createdByName: r.created_by_name || undefined,
        createdAt: new Date(r.created_at).toISOString(),
      };
    });

    return {
      advances,
      summary: {
        totalAdvanced: roundCurrency(totalAdvanced),
        totalRepaid: roundCurrency(totalRepaid),
        totalOutstanding: roundCurrency(totalOutstanding),
      },
    };
  }

  /**
   * Get chronological ledger for a staff member (Query 7e)
   */
  static async getStaffLedger(
    tenantId: number,
    staffId: string
  ): Promise<{
    staffName: string;
    staffCode: string;
    currentOutstanding: number;
    ledger: AdvanceLedgerItem[];
  }> {
    const sId = BigInt(staffId);

    // Get staff info
    const staffRow: any = await prisma.staff.findFirst({
      where: { staffId: sId, tenantId, isDeleted: false },
      select: { fullName: true, staffCode: true },
    });

    if (!staffRow) {
      const err = new Error(`Staff '${staffId}' not found`) as Error & { statusCode?: number };
      err.statusCode = 404;
      throw err;
    }

    // Query 7e union query
    const rows: any[] = await prisma.$queryRawUnsafe(
      `SELECT 
         a.advance_id::text AS id,
         a.advance_date AS txn_date, 
         'ADVANCE_GIVEN' AS kind, 
         a.amount, 
         a.payment_mode,
         a.reference_no,
         a.reason AS note,
         u.full_name AS created_by_name,
         a.created_at
       FROM salary_advances a
       LEFT JOIN users u ON u.user_id = a.created_by
       WHERE a.tenant_id = $1 AND a.staff_id = $2 AND a.status = 'ACTIVE'

       UNION ALL

       SELECT 
         r.repayment_id::text AS id,
         r.repayment_date AS txn_date, 
         r.repayment_type AS kind, 
         r.amount, 
         r.payment_mode,
         r.reference_no,
         COALESCE(r.note, CASE WHEN r.repayment_type = 'SALARY_DEDUCTION' THEN 'Deducted from Salary Slip #' || r.slip_id ELSE NULL END) AS note,
         u.full_name AS created_by_name,
         r.created_at
       FROM advance_repayments r
       JOIN salary_advances a ON a.advance_id = r.advance_id
       LEFT JOIN users u ON u.user_id = r.created_by
       WHERE r.tenant_id = $1 AND a.staff_id = $2

       ORDER BY txn_date ASC, created_at ASC`,
      tenantId,
      sId
    );

    let runningBalance = 0;
    const ledger: AdvanceLedgerItem[] = rows.map((r) => {
      const amt = Number(r.amount);
      if (r.kind === 'ADVANCE_GIVEN') {
        runningBalance += amt;
      } else {
        runningBalance -= amt;
      }

      return {
        id: r.id,
        date: new Date(r.txn_date).toISOString().split('T')[0],
        type: r.kind,
        amount: amt,
        paymentMode: r.payment_mode || undefined,
        referenceNo: r.reference_no || undefined,
        note: r.note || undefined,
        createdByName: r.created_by_name || undefined,
        runningBalance: roundCurrency(runningBalance),
      };
    });

    return {
      staffName: staffRow.fullName,
      staffCode: staffRow.staffCode || `STF-${staffId}`,
      currentOutstanding: roundCurrency(Math.max(0, runningBalance)),
      ledger,
    };
  }

  /**
   * Create a salary advance with money movement
   */
  static async createAdvance(
    tenantId: number,
    userId: bigint,
    dto: CreateAdvanceDTO
  ): Promise<SalaryAdvanceItem> {
    const sId = BigInt(dto.staffId);
    const amount = roundCurrency(Number(dto.amount));
    if (amount <= 0) {
      const err = new Error('Advance amount must be greater than zero.') as Error & { statusCode?: number };
      err.statusCode = 400;
      throw err;
    }

    const mode = (dto.paymentMode || 'CASH').toUpperCase() as PaymentMode;
    const advanceDate = dto.advanceDate || new Date().toISOString().split('T')[0];

    // Single transaction for advance creation & money movement
    const created = await prisma.$transaction(async (tx) => {
      // Verify staff belongs to tenant
      const staff: any = await tx.staff.findFirst({
        where: { staffId: sId, tenantId, isDeleted: false },
        select: { fullName: true, staffCode: true },
      });
      if (!staff) {
        const err = new Error('Staff member not found.') as Error & { statusCode?: number };
        err.statusCode = 404;
        throw err;
      }

      let bankAccountId: bigint | null = null;
      if (mode !== 'CASH') {
        if (!dto.bankAccountId) {
          const err = new Error('Bank account is required for non-cash advance payout.') as Error & { statusCode?: number };
          err.statusCode = 400;
          throw err;
        }
        bankAccountId = BigInt(dto.bankAccountId);

        // Verify bank account belongs to tenant
        const bank = await tx.bankAccount.findFirst({
          where: { bankAccountId, tenantId, isDeleted: false },
        });
        if (!bank) {
          const err = new Error('Selected bank account not found in this gym.') as Error & { statusCode?: number };
          err.statusCode = 404;
          throw err;
        }
      }

      // 1. Insert salary_advances
      const res: any[] = await tx.$queryRawUnsafe(
        `INSERT INTO salary_advances (
           tenant_id, staff_id, amount, advance_date, reason,
           payment_mode, bank_account_id, reference_no, status, created_by
         )
         VALUES ($1, $2, $3, $4::date, $5, $6, $7, $8, 'ACTIVE', $9)
         RETURNING advance_id, created_at`,
        tenantId,
        sId,
        amount,
        advanceDate,
        dto.reason?.trim() || null,
        mode,
        bankAccountId,
        dto.referenceNo?.trim() || null,
        userId
      );

      const advanceId = res[0].advance_id;

      // 2. Money movement:
      if (mode === 'CASH') {
        // Advance given, mode CASH -> insert cash_transactions { transaction_type: 2 (payable/out) }
        await tx.cashTransaction.create({
          data: {
            tenantId,
            transactionType: 2, // Payable/Out
            amount,
            transactionDate: new Date(advanceDate),
            description: `Salary Advance to ${staff.fullName}`,
            referenceType: 'ADVANCE',
            referenceId: advanceId,
            createdBy: userId,
          },
        });
      } else if (bankAccountId) {
        // Advance given, mode BANK/UPI/CHEQUE -> bank_accounts.current_balance -= amount
        await tx.bankAccount.update({
          where: { bankAccountId },
          data: {
            currentBalance: { decrement: amount },
          },
        });
      }

      return {
        advanceId: advanceId.toString(),
        tenantId,
        staffId: sId.toString(),
        staffName: staff.fullName,
        staffCode: staff.staffCode || `STF-${sId}`,
        amount,
        repaidAmount: 0,
        outstandingAmount: amount,
        advanceDate,
        reason: dto.reason || undefined,
        paymentMode: mode,
        bankAccountId: bankAccountId ? bankAccountId.toString() : undefined,
        referenceNo: dto.referenceNo || undefined,
        status: 'ACTIVE' as const,
        createdAt: new Date(res[0].created_at).toISOString(),
      };
    });

    return created;
  }

  /**
   * Record a direct repayment for an advance
   */
  static async recordRepayment(
    tenantId: number,
    userId: bigint,
    advanceId: string,
    dto: CreateRepaymentDTO
  ): Promise<{ repaymentId: string; newOutstanding: number }> {
    const advId = BigInt(advanceId);
    const amount = roundCurrency(Number(dto.amount));
    if (amount <= 0) {
      const err = new Error('Repayment amount must be greater than zero.') as Error & { statusCode?: number };
      err.statusCode = 400;
      throw err;
    }

    const mode = (dto.paymentMode || 'CASH').toUpperCase() as PaymentMode;
    const repaymentDate = dto.repaymentDate || new Date().toISOString().split('T')[0];

    return await prisma.$transaction(async (tx) => {
      // Lock advance row with SELECT ... FOR UPDATE
      const advRows: any[] = await tx.$queryRawUnsafe(
        `SELECT a.*, s.full_name AS staff_name
         FROM salary_advances a
         JOIN staff s ON s.staff_id = a.staff_id
         WHERE a.advance_id = $1 AND a.tenant_id = $2
         FOR UPDATE`,
        advId,
        tenantId
      );

      if (advRows.length === 0) {
        const err = new Error('Advance record not found.') as Error & { statusCode?: number };
        err.statusCode = 404;
        throw err;
      }

      const adv = advRows[0];
      if (adv.status !== 'ACTIVE') {
        const err = new Error('Cannot repay a cancelled advance.') as Error & { statusCode?: number };
        err.statusCode = 422;
        throw err;
      }

      // Calculate already repaid amount
      const repSumRows: any[] = await tx.$queryRawUnsafe(
        `SELECT COALESCE(SUM(amount), 0) AS total_repaid 
         FROM advance_repayments 
         WHERE advance_id = $1`,
        advId
      );
      const totalRepaid = Number(repSumRows[0].total_repaid);
      const outstanding = roundCurrency(Number(adv.amount) - totalRepaid);

      if (amount > outstanding) {
        const err = new Error(
          `Repayment amount (₹${amount.toLocaleString('en-IN')}) exceeds current outstanding balance of ₹${outstanding.toLocaleString('en-IN')}.`
        ) as Error & { statusCode?: number };
        err.statusCode = 422;
        throw err;
      }

      let bankAccountId: bigint | null = null;
      if (mode !== 'CASH') {
        if (!dto.bankAccountId) {
          const err = new Error('Bank account is required for non-cash repayment.') as Error & { statusCode?: number };
          err.statusCode = 400;
          throw err;
        }
        bankAccountId = BigInt(dto.bankAccountId);

        const bank = await tx.bankAccount.findFirst({
          where: { bankAccountId, tenantId, isDeleted: false },
        });
        if (!bank) {
          const err = new Error('Bank account not found in this gym.') as Error & { statusCode?: number };
          err.statusCode = 404;
          throw err;
        }
      }

      // 1. Insert advance_repayments (DIRECT_PAYMENT)
      const insRes: any[] = await tx.$queryRawUnsafe(
        `INSERT INTO advance_repayments (
           tenant_id, advance_id, amount, repayment_date, repayment_type,
           payment_mode, bank_account_id, reference_no, note, created_by
         )
         VALUES ($1, $2, $3, $4::date, 'DIRECT_PAYMENT', $5, $6, $7, $8, $9)
         RETURNING repayment_id`,
        tenantId,
        advId,
        amount,
        repaymentDate,
        mode,
        bankAccountId,
        dto.referenceNo?.trim() || null,
        dto.note?.trim() || null,
        userId
      );

      const repaymentId = insRes[0].repayment_id;

      // 2. Money movement:
      if (mode === 'CASH') {
        // DIRECT_PAYMENT repayment, CASH -> cash_transactions type 1 (in)
        await tx.cashTransaction.create({
          data: {
            tenantId,
            transactionType: 1, // Inflow
            amount,
            transactionDate: new Date(repaymentDate),
            description: `Advance Repayment by ${adv.staff_name}`,
            referenceType: 'ADVANCE_REPAYMENT',
            referenceId: repaymentId,
            createdBy: userId,
          },
        });
      } else if (bankAccountId) {
        // DIRECT_PAYMENT repayment, bank -> bank_accounts.current_balance += amount
        await tx.bankAccount.update({
          where: { bankAccountId },
          data: {
            currentBalance: { increment: amount },
          },
        });
      }

      return {
        repaymentId: repaymentId.toString(),
        newOutstanding: roundCurrency(outstanding - amount),
      };
    });
  }

  /**
   * Cancel an advance (only if zero repayments exist)
   */
  static async cancelAdvance(
    tenantId: number,
    userId: bigint,
    advanceId: string
  ): Promise<{ success: boolean; message: string }> {
    const advId = BigInt(advanceId);

    return await prisma.$transaction(async (tx) => {
      const advRows: any[] = await tx.$queryRawUnsafe(
        `SELECT a.*, s.full_name AS staff_name
         FROM salary_advances a
         JOIN staff s ON s.staff_id = a.staff_id
         WHERE a.advance_id = $1 AND a.tenant_id = $2
         FOR UPDATE`,
        advId,
        tenantId
      );

      if (advRows.length === 0) {
        const err = new Error('Advance not found.') as Error & { statusCode?: number };
        err.statusCode = 404;
        throw err;
      }

      const adv = advRows[0];
      if (adv.status === 'CANCELLED') {
        const err = new Error('Advance is already cancelled.') as Error & { statusCode?: number };
        err.statusCode = 422;
        throw err;
      }

      // Check repayments
      const repCountRows: any[] = await tx.$queryRawUnsafe(
        `SELECT COUNT(*) AS count FROM advance_repayments WHERE advance_id = $1`,
        advId
      );
      if (parseInt(repCountRows[0].count, 10) > 0) {
        const err = new Error(
          'Cannot cancel an advance that already has repayment records. Repayments must be reversed first.'
        ) as Error & { statusCode?: number };
        err.statusCode = 422;
        throw err;
      }

      // Revert money movement
      const amount = Number(adv.amount);
      if (adv.payment_mode === 'CASH') {
        await tx.cashTransaction.create({
          data: {
            tenantId,
            transactionType: 1, // Inflow reversal
            amount,
            transactionDate: new Date(),
            description: `Reversal of cancelled advance #${advanceId} to ${adv.staff_name}`,
            referenceType: 'ADVANCE',
            referenceId: advId,
            createdBy: userId,
          },
        });
      } else if (adv.bank_account_id) {
        await tx.bankAccount.update({
          where: { bankAccountId: adv.bank_account_id },
          data: { currentBalance: { increment: amount } },
        });
      }

      // Mark cancelled
      await tx.$executeRawUnsafe(
        `UPDATE salary_advances SET status = 'CANCELLED', updated_at = now() WHERE advance_id = $1`,
        advId
      );

      return {
        success: true,
        message: 'Advance cancelled successfully and balance reversed.',
      };
    });
  }

  // ================================================================
  // SECTION 3: SALARIES (DRAFT, FINALIZE, PAYOUTS)
  // ================================================================

  /**
   * Get salary list for a month (from v_salary_slip_summary + staff)
   */
  static async getSalaries(
    tenantId: number,
    monthStr: string
  ): Promise<{
    slips: SalarySlipSummaryItem[];
    summary: {
      totalNetPayable: number;
      totalPaid: number;
      totalBalance: number;
      countUnpaid: number;
      countPartial: number;
      countPaid: number;
      countDraft: number;
    };
  }> {
    const salaryMonth = `${monthStr}-01`;

    const rows: any[] = await prisma.$queryRawUnsafe(
      `SELECT 
         v.*,
         s.full_name AS staff_name,
         s.staff_code,
         s.designation,
         u.full_name AS finalized_by_name
       FROM v_salary_slip_summary v
       JOIN staff s ON s.staff_id = v.staff_id
       LEFT JOIN users u ON u.user_id = v.finalized_by
       WHERE v.tenant_id = $1 AND v.salary_month = $2::date
       ORDER BY s.full_name ASC`,
      tenantId,
      salaryMonth
    );

    let totalNetPayable = 0;
    let totalPaid = 0;
    let totalBalance = 0;
    let countUnpaid = 0;
    let countPartial = 0;
    let countPaid = 0;
    let countDraft = 0;

    const slips: SalarySlipSummaryItem[] = rows.map((r) => {
      const net = Number(r.net_payable);
      const paid = Number(r.paid_amount);
      const bal = Number(r.balance_amount);

      if (r.status !== 'CANCELLED') {
        totalNetPayable += net;
        totalPaid += paid;
        totalBalance += bal;
      }

      if (r.status === 'DRAFT') countDraft++;
      else if (r.payment_status === 'UNPAID') countUnpaid++;
      else if (r.payment_status === 'PARTIAL') countPartial++;
      else if (r.payment_status === 'PAID') countPaid++;

      return {
        slipId: r.slip_id.toString(),
        tenantId: r.tenant_id,
        staffId: r.staff_id.toString(),
        staffCode: r.staff_code || `STF-${r.staff_id}`,
        staffName: r.staff_name,
        designation: r.designation || undefined,
        salaryMonth: monthStr,
        baseSalary: Number(r.base_salary),
        daysInMonth: Number(r.days_in_month),
        fullDays: Number(r.full_days),
        halfDays: Number(r.half_days),
        paidLeaveDays: Number(r.paid_leave_days),
        absentDays: Number(r.absent_days),
        payableDays: Number(r.payable_days),
        earnedSalary: Number(r.earned_salary),
        bonusAmount: Number(r.bonus_amount),
        otherDeductions: Number(r.other_deductions),
        advanceDeduction: Number(r.advance_deduction),
        netPayable: net,
        paidAmount: paid,
        balanceAmount: bal,
        status: r.status,
        paymentStatus: r.payment_status,
        finalizedAt: r.finalized_at ? new Date(r.finalized_at).toISOString() : undefined,
        finalizedByName: r.finalized_by_name || undefined,
      };
    });

    return {
      slips,
      summary: {
        totalNetPayable: roundCurrency(totalNetPayable),
        totalPaid: roundCurrency(totalPaid),
        totalBalance: roundCurrency(totalBalance),
        countUnpaid,
        countPartial,
        countPaid,
        countDraft,
      },
    };
  }

  /**
   * Salary PREVIEW for a month (Query 7c)
   */
  static async getSalaryPreview(
    tenantId: number,
    monthStr: string
  ): Promise<{ month: string; daysInMonth: number; items: SalaryPreviewItem[] }> {
    const salaryMonth = `${monthStr}-01`;

    const rows: any[] = await prisma.$queryRawUnsafe(
      `WITH m AS (
         SELECT $2::date AS m_start,
                (date_trunc('month', $2::date) + INTERVAL '1 month - 1 day')::date AS m_end,
                EXTRACT(DAY FROM (date_trunc('month', $2::date) + INTERVAL '1 month - 1 day'))::int AS dim
       ),
       att AS (
         SELECT a.staff_id,
                COUNT(*) FILTER (WHERE a.status = 'FULL_DAY')   AS full_days,
                COUNT(*) FILTER (WHERE a.status = 'HALF_DAY')   AS half_days,
                COUNT(*) FILTER (WHERE a.status = 'PAID_LEAVE') AS paid_leave_days,
                COUNT(*) FILTER (WHERE a.status = 'ABSENT')     AS explicit_absent
         FROM staff_attendance a, m
         WHERE a.tenant_id = $1 AND a.attendance_date BETWEEN m.m_start AND m.m_end
         GROUP BY a.staff_id
       ),
       adv AS (
         SELECT staff_id, SUM(outstanding_amount) AS outstanding_advance
         FROM v_advance_balances
         WHERE tenant_id = $1 AND status = 'ACTIVE' AND outstanding_amount > 0
         GROUP BY staff_id
       )
       SELECT s.staff_id, s.staff_code, s.full_name, s.designation, s.base_salary, m.dim AS days_in_month,
              COALESCE(att.full_days,0)       AS full_days,
              COALESCE(att.half_days,0)       AS half_days,
              COALESCE(att.paid_leave_days,0) AS paid_leave_days,
              m.dim - COALESCE(att.full_days,0) - COALESCE(att.half_days,0)
                    - COALESCE(att.paid_leave_days,0) AS absent_days,
              m.dim - COALESCE(att.full_days,0) - COALESCE(att.half_days,0)
                    - COALESCE(att.paid_leave_days,0) - COALESCE(att.explicit_absent,0) AS unmarked_days,
              COALESCE(att.full_days,0) + COALESCE(att.half_days,0)*0.5
                    + COALESCE(att.paid_leave_days,0) AS payable_days,
              ROUND(s.base_salary / m.dim *
                    (COALESCE(att.full_days,0) + COALESCE(att.half_days,0)*0.5
                     + COALESCE(att.paid_leave_days,0)), 2) AS earned_salary,
              COALESCE(adv.outstanding_advance, 0) AS outstanding_advance
       FROM staff s
       CROSS JOIN m
       LEFT JOIN att ON att.staff_id = s.staff_id
       LEFT JOIN adv ON adv.staff_id = s.staff_id
       WHERE s.tenant_id = $1 AND s.is_deleted = FALSE
         AND s.employment_status = 'active' AND s.joining_date <= m.m_end
         AND NOT EXISTS (
           SELECT 1 FROM salary_slips x
           WHERE x.staff_id = s.staff_id AND x.salary_month = m.m_start
             AND x.status <> 'CANCELLED'
         )
       ORDER BY s.full_name ASC`,
      tenantId,
      salaryMonth
    );

    const [yearStr, mStr] = monthStr.split('-');
    const daysInMonth = new Date(parseInt(yearStr, 10), parseInt(mStr, 10), 0).getDate();

    const items: SalaryPreviewItem[] = rows.map((r) => {
      const base = Number(r.base_salary);
      const earned = Number(r.earned_salary);
      const outstandingAdv = Number(r.outstanding_advance);
      // Default advance deduction = min(outstanding advance, earned)
      const recommendedAdvDeduction = roundCurrency(Math.min(outstandingAdv, earned));
      const netPayable = roundCurrency(earned - recommendedAdvDeduction);

      return {
        staffId: r.staff_id.toString(),
        staffCode: r.staff_code || `STF-${r.staff_id}`,
        fullName: r.full_name,
        designation: r.designation || undefined,
        baseSalary: base,
        daysInMonth: Number(r.days_in_month),
        fullDays: Number(r.full_days),
        halfDays: Number(r.half_days),
        paidLeaveDays: Number(r.paid_leave_days),
        absentDays: Math.max(0, Number(r.absent_days)),
        unmarkedDays: Math.max(0, Number(r.unmarked_days)),
        payableDays: Number(r.payable_days),
        earnedSalary: earned,
        outstandingAdvance: outstandingAdv,
        recommendedAdvanceDeduction: recommendedAdvDeduction,
        bonusAmount: 0,
        otherDeductions: 0,
        advanceDeduction: recommendedAdvDeduction,
        netPayable,
      };
    });

    return {
      month: monthStr,
      daysInMonth,
      items,
    };
  }

  /**
   * Generate DRAFT salary slips
   */
  static async generateSalaries(
    tenantId: number,
    userId: bigint,
    dto: GenerateSalariesDTO
  ): Promise<{ createdCount: number }> {
    const salaryMonth = `${dto.month}-01`;
    const [yearStr, mStr] = dto.month.split('-');
    const daysInMonth = new Date(parseInt(yearStr, 10), parseInt(mStr, 10), 0).getDate();

    await prisma.$transaction(async (tx) => {
      for (const item of dto.items) {
        const sId = BigInt(item.staffId);

        // Fetch staff info
        const staff = await tx.staff.findFirst({
          where: { staffId: sId, tenantId, isDeleted: false },
        });
        if (!staff) continue;

        const baseSalary = Number(staff.baseSalary || 0);

        // Compute attendance breakdown for this staff for this month
        const attRows: any[] = await tx.$queryRawUnsafe(
          `SELECT 
             COUNT(*) FILTER (WHERE status = 'FULL_DAY')   AS full_days,
             COUNT(*) FILTER (WHERE status = 'HALF_DAY')   AS half_days,
             COUNT(*) FILTER (WHERE status = 'PAID_LEAVE') AS paid_leave_days
           FROM staff_attendance
           WHERE tenant_id = $1 AND staff_id = $2
             AND attendance_date BETWEEN $3::date AND ($3::date + INTERVAL '1 month - 1 day')::date`,
          tenantId,
          sId,
          salaryMonth
        );

        const fullDays = Number(attRows[0]?.full_days || 0);
        const halfDays = Number(attRows[0]?.half_days || 0);
        const paidLeaveDays = Number(attRows[0]?.paid_leave_days || 0);
        const absentDays = daysInMonth - fullDays - halfDays - paidLeaveDays;
        const payableDays = roundCurrency(fullDays + halfDays * 0.5 + paidLeaveDays);
        const earnedSalary = roundCurrency((baseSalary / daysInMonth) * payableDays);

        const bonus = Math.max(0, roundCurrency(Number(item.bonusAmount || 0)));
        const otherDed = Math.max(0, roundCurrency(Number(item.otherDeductions || 0)));
        const advDed = Math.max(0, roundCurrency(Number(item.advanceDeduction || 0)));

        const gross = earnedSalary + bonus - otherDed;
        if (advDed > gross) {
          const err = new Error(
            `Advance deduction (₹${advDed}) cannot exceed earnings (₹${gross}) for ${staff.fullName}. Net payable cannot be negative.`
          ) as Error & { statusCode?: number };
          err.statusCode = 422;
          throw err;
        }

        const netPayable = roundCurrency(gross - advDed);

        // Upsert salary slip as DRAFT
        await tx.$executeRawUnsafe(
          `INSERT INTO salary_slips (
             tenant_id, staff_id, salary_month, base_salary, days_in_month,
             full_days, half_days, paid_leave_days, absent_days, payable_days,
             earned_salary, bonus_amount, other_deductions, advance_deduction,
             net_payable, status, remarks, created_by
           )
           VALUES ($1, $2, $3::date, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 'DRAFT', $16, $17)
           ON CONFLICT (staff_id, salary_month)
           DO UPDATE SET
             base_salary = EXCLUDED.base_salary,
             days_in_month = EXCLUDED.days_in_month,
             full_days = EXCLUDED.full_days,
             half_days = EXCLUDED.half_days,
             paid_leave_days = EXCLUDED.paid_leave_days,
             absent_days = EXCLUDED.absent_days,
             payable_days = EXCLUDED.payable_days,
             earned_salary = EXCLUDED.earned_salary,
             bonus_amount = EXCLUDED.bonus_amount,
             other_deductions = EXCLUDED.other_deductions,
             advance_deduction = EXCLUDED.advance_deduction,
             net_payable = EXCLUDED.net_payable,
             remarks = EXCLUDED.remarks,
             status = 'DRAFT',
             updated_at = now()
           WHERE salary_slips.status = 'DRAFT'`,
          tenantId,
          sId,
          salaryMonth,
          baseSalary,
          daysInMonth,
          fullDays,
          halfDays,
          paidLeaveDays,
          absentDays,
          payableDays,
          earnedSalary,
          bonus,
          otherDed,
          advDed,
          netPayable,
          item.remarks?.trim() || null,
          userId
        );
      }
    });

    return { createdCount: dto.items.length };
  }

  /**
   * Finalize a salary slip with FIFO advance repayments allocation
   */
  static async finalizeSlip(
    tenantId: number,
    userId: bigint,
    slipId: string
  ): Promise<{ success: boolean; slipId: string }> {
    const sId = BigInt(slipId);

    return await prisma.$transaction(async (tx) => {
      // 1. Lock slip with SELECT ... FOR UPDATE
      const slipRows: any[] = await tx.$queryRawUnsafe(
        `SELECT * FROM salary_slips WHERE slip_id = $1 AND tenant_id = $2 FOR UPDATE`,
        sId,
        tenantId
      );

      if (slipRows.length === 0) {
        const err = new Error('Salary slip not found.') as Error & { statusCode?: number };
        err.statusCode = 404;
        throw err;
      }

      const slip = slipRows[0];
      if (slip.status !== 'DRAFT') {
        const err = new Error(`Salary slip is already ${slip.status}.`) as Error & { statusCode?: number };
        err.statusCode = 422;
        throw err;
      }

      const advanceDeduction = Number(slip.advance_deduction || 0);

      // 2. If advance_deduction > 0, allocate across open advances FIFO (oldest first)
      if (advanceDeduction > 0) {
        let remainingToDeduct = advanceDeduction;

        // Fetch open advances for staff oldest first
        const openAdvances: any[] = await tx.$queryRawUnsafe(
          `SELECT 
             a.advance_id, 
             a.amount - COALESCE((SELECT SUM(r.amount) FROM advance_repayments r WHERE r.advance_id = a.advance_id), 0) AS outstanding_amount
           FROM salary_advances a
           WHERE a.tenant_id = $1 AND a.staff_id = $2 AND a.status = 'ACTIVE'
             AND (a.amount - COALESCE((SELECT SUM(r.amount) FROM advance_repayments r WHERE r.advance_id = a.advance_id), 0)) > 0
           ORDER BY a.advance_date ASC, a.advance_id ASC
           FOR UPDATE`,
          tenantId,
          slip.staff_id
        );

        for (const adv of openAdvances) {
          if (remainingToDeduct <= 0) break;

          const out = Number(adv.outstanding_amount);
          const deductAmount = roundCurrency(Math.min(remainingToDeduct, out));

          // Insert into advance_repayments (SALARY_DEDUCTION)
          await tx.$executeRawUnsafe(
            `INSERT INTO advance_repayments (
               tenant_id, advance_id, amount, repayment_date, repayment_type,
               slip_id, created_by
             )
             VALUES ($1, $2, $3, $4::date, 'SALARY_DEDUCTION', $5, $6)`,
            tenantId,
            adv.advance_id,
            deductAmount,
            slip.salary_month,
            sId,
            userId
          );

          remainingToDeduct = roundCurrency(remainingToDeduct - deductAmount);
        }
      }

      // 3. Update slip status to FINALIZED
      await tx.$executeRawUnsafe(
        `UPDATE salary_slips 
         SET status = 'FINALIZED', finalized_by = $1, finalized_at = now(), updated_at = now()
         WHERE slip_id = $2`,
        userId,
        sId
      );

      return { success: true, slipId };
    });
  }

  /**
   * Finalize multiple salary slips in bulk
   */
  static async finalizeBulk(
    tenantId: number,
    userId: bigint,
    slipIds: string[]
  ): Promise<{ finalizedCount: number }> {
    for (const id of slipIds) {
      await this.finalizeSlip(tenantId, userId, id);
    }
    return { finalizedCount: slipIds.length };
  }

  /**
   * Record a payment against a finalized salary slip
   */
  static async recordSalaryPayment(
    tenantId: number,
    userId: bigint,
    slipId: string,
    dto: RecordSalaryPaymentDTO
  ): Promise<{ paymentId: string; balanceAmount: number; paymentStatus: string }> {
    const sId = BigInt(slipId);
    const amount = roundCurrency(Number(dto.amount));
    if (amount <= 0) {
      const err = new Error('Payment amount must be greater than zero.') as Error & { statusCode?: number };
      err.statusCode = 400;
      throw err;
    }

    const mode = (dto.paymentMode || 'CASH').toUpperCase() as PaymentMode;
    const paymentDate = dto.paymentDate || new Date().toISOString().split('T')[0];

    return await prisma.$transaction(async (tx) => {
      // 1. Lock slip with SELECT ... FOR UPDATE
      const slipRows: any[] = await tx.$queryRawUnsafe(
        `SELECT s.*, st.full_name AS staff_name
         FROM salary_slips s
         JOIN staff st ON st.staff_id = s.staff_id
         WHERE s.slip_id = $1 AND s.tenant_id = $2
         FOR UPDATE`,
        sId,
        tenantId
      );

      if (slipRows.length === 0) {
        const err = new Error('Salary slip not found.') as Error & { statusCode?: number };
        err.statusCode = 404;
        throw err;
      }

      const slip = slipRows[0];
      if (slip.status !== 'FINALIZED') {
        const err = new Error(
          `Cannot pay a salary slip that is ${slip.status}. Slip must be FINALIZED before payouts.`
        ) as Error & { statusCode?: number };
        err.statusCode = 422;
        throw err;
      }

      // Check current paid amount & balance
      const paidSumRows: any[] = await tx.$queryRawUnsafe(
        `SELECT COALESCE(SUM(amount), 0) AS total_paid FROM salary_payments WHERE slip_id = $1`,
        sId
      );
      const totalPaid = Number(paidSumRows[0].total_paid);
      const balance = roundCurrency(Number(slip.net_payable) - totalPaid);

      if (amount > balance) {
        const err = new Error(
          `Payment amount (₹${amount.toLocaleString('en-IN')}) exceeds unpaid slip balance (₹${balance.toLocaleString('en-IN')}).`
        ) as Error & { statusCode?: number };
        err.statusCode = 422;
        throw err;
      }

      let bankAccountId: bigint | null = null;
      if (mode !== 'CASH') {
        if (!dto.bankAccountId) {
          const err = new Error('Bank account is required for non-cash salary payout.') as Error & { statusCode?: number };
          err.statusCode = 400;
          throw err;
        }
        bankAccountId = BigInt(dto.bankAccountId);

        const bank = await tx.bankAccount.findFirst({
          where: { bankAccountId, tenantId, isDeleted: false },
        });
        if (!bank) {
          const err = new Error('Bank account not found in this gym.') as Error & { statusCode?: number };
          err.statusCode = 404;
          throw err;
        }
      }

      // 2. Insert into salary_payments
      const insRes: any[] = await tx.$queryRawUnsafe(
        `INSERT INTO salary_payments (
           tenant_id, slip_id, amount, payment_date, payment_mode,
           bank_account_id, reference_no, note, paid_by
         )
         VALUES ($1, $2, $3, $4::date, $5, $6, $7, $8, $9)
         RETURNING payment_id`,
        tenantId,
        sId,
        amount,
        paymentDate,
        mode,
        bankAccountId,
        dto.referenceNo?.trim() || null,
        dto.note?.trim() || null,
        userId
      );

      const paymentId = insRes[0].payment_id;

      // 3. Money movement:
      if (mode === 'CASH') {
        // CASH -> cash_transactions type 2, reference_type 'SALARY'
        await tx.cashTransaction.create({
          data: {
            tenantId,
            transactionType: 2, // Outflow
            amount,
            transactionDate: new Date(paymentDate),
            description: `Salary payout to ${slip.staff_name} for ${new Date(slip.salary_month).toLocaleString('default', { month: 'short', year: 'numeric' })}`,
            referenceType: 'SALARY',
            referenceId: paymentId,
            createdBy: userId,
          },
        });
      } else if (bankAccountId) {
        // Bank/UPI/Cheque -> bank_accounts.current_balance -= amount
        await tx.bankAccount.update({
          where: { bankAccountId },
          data: { currentBalance: { decrement: amount } },
        });
      }

      // 4. Auto-record into expenses table (linking salary_slip_id & salary_payment_id)
      try {
        let expTypeRows: any[] = await tx.$queryRawUnsafe(
          `SELECT expense_type_id FROM expense_types 
           WHERE tenant_id = $1 AND LOWER(name) = 'staff salary & payroll' AND is_deleted = FALSE
           LIMIT 1`,
          tenantId
        );
        if (expTypeRows.length === 0) {
          expTypeRows = await tx.$queryRawUnsafe(
            `INSERT INTO expense_types (tenant_id, name, description, is_system, is_active)
             VALUES ($1, 'Staff Salary & Payroll', 'Staff wages, trainer salaries, advances and compensation', TRUE, TRUE)
             RETURNING expense_type_id`,
            tenantId
          );
        }
        const expenseTypeId = expTypeRows[0].expense_type_id;
        const monthLabel = new Date(slip.salary_month).toLocaleString('default', { month: 'short', year: 'numeric' });
        const expTitle = `Salary Payout: ${slip.staff_name} (${monthLabel})`;

        await tx.$queryRawUnsafe(
          `INSERT INTO expenses (
             tenant_id, expense_code, expense_type_id, title, amount,
             expense_date, payment_mode, bank_account_id, reference_no, notes,
             salary_slip_id, salary_payment_id, created_by
           )
           VALUES ($1, $2, $3, $4, $5, $6::date, $7, $8, $9, $10, $11, $12, $13)`,
          tenantId,
          `SAL-EXP-${paymentId}`,
          expenseTypeId,
          expTitle,
          amount,
          paymentDate,
          mode,
          bankAccountId,
          dto.referenceNo?.trim() || null,
          dto.note?.trim() || `Auto-recorded salary payout for ${slip.staff_name}`,
          sId,
          paymentId,
          userId
        );
      } catch (expErr) {
        console.warn('Could not auto-create expense record for salary payout:', expErr);
      }

      const newBalance = roundCurrency(balance - amount);
      const newStatus = newBalance === 0 ? 'PAID' : 'PARTIAL';

      return {
        paymentId: paymentId.toString(),
        balanceAmount: newBalance,
        paymentStatus: newStatus,
      };
    });
  }

  /**
   * Get detailed slip information for payslip drawer/print
   */
  static async getSlipDetail(tenantId: number, slipId: string): Promise<SlipDetailResponse> {
    const sId = BigInt(slipId);

    const rows: any[] = await prisma.$queryRawUnsafe(
      `SELECT 
         v.*,
         s.full_name AS staff_name,
         s.staff_code,
         s.designation,
         u.full_name AS finalized_by_name,
         t.gym_name,
         t.address_line,
         t.city,
         t.phone_number,
         t.email AS gym_email
       FROM v_salary_slip_summary v
       JOIN staff s ON s.staff_id = v.staff_id
       JOIN tenants t ON t.tenant_id = v.tenant_id
       LEFT JOIN users u ON u.user_id = v.finalized_by
       WHERE v.slip_id = $1 AND v.tenant_id = $2`,
      sId,
      tenantId
    );

    if (rows.length === 0) {
      const err = new Error('Salary slip not found.') as Error & { statusCode?: number };
      err.statusCode = 404;
      throw err;
    }

    const r = rows[0];

    // Fetch payments
    const paymentRows: any[] = await prisma.$queryRawUnsafe(
      `SELECT p.*, b.bank_name, u.full_name AS paid_by_name
       FROM salary_payments p
       LEFT JOIN bank_accounts b ON b.bank_account_id = p.bank_account_id
       LEFT JOIN users u ON u.user_id = p.paid_by
       WHERE p.slip_id = $1
       ORDER BY p.payment_date ASC, p.payment_id ASC`,
      sId
    );

    // Fetch advance deductions
    const advDedRows: any[] = await prisma.$queryRawUnsafe(
      `SELECT r.*, a.reason AS advance_reason
       FROM advance_repayments r
       JOIN salary_advances a ON a.advance_id = r.advance_id
       WHERE r.slip_id = $1
       ORDER BY r.repayment_id ASC`,
      sId
    );

    const d = new Date(r.salary_month);
    const monthStr = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;

    return {
      slip: {
        slipId: r.slip_id.toString(),
        tenantId: r.tenant_id,
        staffId: r.staff_id.toString(),
        staffCode: r.staff_code || `STF-${r.staff_id}`,
        staffName: r.staff_name,
        designation: r.designation || undefined,
        salaryMonth: monthStr,
        baseSalary: Number(r.base_salary),
        daysInMonth: Number(r.days_in_month),
        fullDays: Number(r.full_days),
        halfDays: Number(r.half_days),
        paidLeaveDays: Number(r.paid_leave_days),
        absentDays: Number(r.absent_days),
        payableDays: Number(r.payable_days),
        earnedSalary: Number(r.earned_salary),
        bonusAmount: Number(r.bonus_amount),
        otherDeductions: Number(r.other_deductions),
        advanceDeduction: Number(r.advance_deduction),
        netPayable: Number(r.net_payable),
        paidAmount: Number(r.paid_amount),
        balanceAmount: Number(r.balance_amount),
        status: r.status,
        paymentStatus: r.payment_status,
        finalizedAt: r.finalized_at ? new Date(r.finalized_at).toISOString() : undefined,
        finalizedByName: r.finalized_by_name || undefined,
      },
      gym: {
        gymName: r.gym_name,
        address: r.address_line ? `${r.address_line}, ${r.city || ''}` : r.city || undefined,
        phone: r.phone_number || undefined,
        email: r.gym_email || undefined,
      },
      payments: paymentRows.map((p) => ({
        paymentId: p.payment_id.toString(),
        amount: Number(p.amount),
        paymentDate: new Date(p.payment_date).toISOString().split('T')[0],
        paymentMode: p.payment_mode,
        bankName: p.bank_name || undefined,
        referenceNo: p.reference_no || undefined,
        note: p.note || undefined,
        paidByName: p.paid_by_name || 'System',
        createdAt: new Date(p.created_at).toISOString(),
      })),
      advanceDeductions: advDedRows.map((ad) => ({
        repaymentId: ad.repayment_id.toString(),
        advanceId: ad.advance_id.toString(),
        amount: Number(ad.amount),
        repaymentDate: new Date(ad.repayment_date).toISOString().split('T')[0],
        advanceReason: ad.advance_reason || undefined,
      })),
    };
  }

  /**
   * Cancel a salary slip (only if DRAFT, or FINALIZED with zero payments)
   */
  static async cancelSlip(
    tenantId: number,
    userId: bigint,
    slipId: string
  ): Promise<{ success: boolean; message: string }> {
    const sId = BigInt(slipId);

    return await prisma.$transaction(async (tx) => {
      const slipRows: any[] = await tx.$queryRawUnsafe(
        `SELECT * FROM salary_slips WHERE slip_id = $1 AND tenant_id = $2 FOR UPDATE`,
        sId,
        tenantId
      );

      if (slipRows.length === 0) {
        const err = new Error('Salary slip not found.') as Error & { statusCode?: number };
        err.statusCode = 404;
        throw err;
      }

      const slip = slipRows[0];
      if (slip.status === 'CANCELLED') {
        const err = new Error('Salary slip is already cancelled.') as Error & { statusCode?: number };
        err.statusCode = 422;
        throw err;
      }

      // Check payments count
      const pCountRows: any[] = await tx.$queryRawUnsafe(
        `SELECT COUNT(*) AS count FROM salary_payments WHERE slip_id = $1`,
        sId
      );
      if (parseInt(pCountRows[0].count, 10) > 0) {
        const err = new Error(
          'Cannot cancel a salary slip that already has recorded payments.'
        ) as Error & { statusCode?: number };
        err.statusCode = 422;
        throw err;
      }

      // If finalized and has advance deduction rows, delete the SALARY_DEDUCTION repayment rows so advances regain balance
      await tx.$executeRawUnsafe(
        `DELETE FROM advance_repayments WHERE slip_id = $1 AND repayment_type = 'SALARY_DEDUCTION'`,
        sId
      );

      // Set slip status = CANCELLED
      await tx.$executeRawUnsafe(
        `UPDATE salary_slips SET status = 'CANCELLED', updated_at = now() WHERE slip_id = $1`,
        sId
      );

      return {
        success: true,
        message: 'Salary slip cancelled successfully.',
      };
    });
  }
}

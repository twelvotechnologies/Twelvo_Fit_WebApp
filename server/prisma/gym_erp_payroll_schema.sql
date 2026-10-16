-- ================================================================
-- GYM ERP — PAYROLL MODULE (Attendance, Advances, Salaries)
-- Run AFTER gym_erp_schema_v1.sql
-- Assumes existing: tenants, users, staff, bank_accounts, upi_ids,
--                   cash_transactions, trg_set_updated_at()
-- ================================================================
-- Design rules:
--   * Attendance rows are stored ONLY for marked days. A day with no row
--     is treated as ABSENT when salary is calculated.
--   * Nothing derivable is stored twice: paid amount, balance, outstanding
--     advance and payment status come from VIEWS, so they can never drift.
--   * Money movement (cash ledger / bank balance) is done by the backend
--     inside one DB transaction per action (no extra triggers).
-- ================================================================

-- ================================================================
-- 1. STAFF_ATTENDANCE  (one row per staff per marked day)
-- ================================================================
CREATE TABLE IF NOT EXISTS staff_attendance (
    attendance_id     BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tenant_id         INT NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    staff_id          BIGINT NOT NULL REFERENCES staff(staff_id) ON DELETE CASCADE,
    attendance_date   DATE NOT NULL,
    status            VARCHAR(15) NOT NULL
                        CHECK (status IN ('FULL_DAY','HALF_DAY','PAID_LEAVE','ABSENT')),
    note              VARCHAR(255),
    marked_by         BIGINT REFERENCES users(user_id),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT uq_staff_attendance_day UNIQUE (staff_id, attendance_date)
);

CREATE INDEX IF NOT EXISTS idx_staff_attendance_tenant_date ON staff_attendance(tenant_id, attendance_date);

DROP TRIGGER IF EXISTS before_staff_attendance_update ON staff_attendance;
CREATE TRIGGER before_staff_attendance_update
BEFORE UPDATE ON staff_attendance
FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();


-- ================================================================
-- 2. SALARY_SLIPS  (one row per staff per month)
-- Created before advance_repayments because repayments can point here.
-- ================================================================
CREATE TABLE IF NOT EXISTS salary_slips (
    slip_id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tenant_id           INT NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    staff_id            BIGINT NOT NULL REFERENCES staff(staff_id),
    salary_month        DATE NOT NULL CHECK (EXTRACT(DAY FROM salary_month) = 1),  -- always 1st of month

    -- snapshot of the numbers used, so later edits to staff/attendance never rewrite history
    base_salary         NUMERIC(10,2) NOT NULL CHECK (base_salary >= 0),
    days_in_month       SMALLINT NOT NULL,
    full_days           SMALLINT NOT NULL DEFAULT 0,
    half_days           SMALLINT NOT NULL DEFAULT 0,
    paid_leave_days     SMALLINT NOT NULL DEFAULT 0,
    absent_days         SMALLINT NOT NULL DEFAULT 0,          -- includes UNMARKED days
    payable_days        NUMERIC(5,1) NOT NULL DEFAULT 0,      -- full + half*0.5 + paid_leave

    earned_salary       NUMERIC(10,2) NOT NULL DEFAULT 0,     -- base / days_in_month * payable_days
    bonus_amount        NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (bonus_amount >= 0),
    other_deductions    NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (other_deductions >= 0),
    advance_deduction   NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (advance_deduction >= 0),
    net_payable         NUMERIC(10,2) NOT NULL CHECK (net_payable >= 0),

    status              VARCHAR(15) NOT NULL DEFAULT 'DRAFT'
                          CHECK (status IN ('DRAFT','FINALIZED','CANCELLED')),
    remarks             TEXT,
    finalized_by        BIGINT REFERENCES users(user_id),
    finalized_at        TIMESTAMPTZ,
    created_by          BIGINT REFERENCES users(user_id),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT uq_salary_slip_staff_month UNIQUE (staff_id, salary_month),
    CONSTRAINT chk_net_payable_math
        CHECK (net_payable = earned_salary + bonus_amount - other_deductions - advance_deduction)
);

CREATE INDEX IF NOT EXISTS idx_salary_slips_tenant_month ON salary_slips(tenant_id, salary_month);
CREATE INDEX IF NOT EXISTS idx_salary_slips_tenant_status ON salary_slips(tenant_id, status);

DROP TRIGGER IF EXISTS before_salary_slips_update ON salary_slips;
CREATE TRIGGER before_salary_slips_update
BEFORE UPDATE ON salary_slips
FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();


-- ================================================================
-- 3. SALARY_PAYMENTS  (partial or full payouts against a slip)
-- ================================================================
CREATE TABLE IF NOT EXISTS salary_payments (
    payment_id        BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tenant_id         INT NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    slip_id           BIGINT NOT NULL REFERENCES salary_slips(slip_id),
    amount            NUMERIC(10,2) NOT NULL CHECK (amount > 0),
    payment_date      DATE NOT NULL DEFAULT CURRENT_DATE,
    payment_mode      VARCHAR(20) NOT NULL
                        CHECK (payment_mode IN ('CASH','UPI','BANK','CHEQUE')),
    bank_account_id   BIGINT REFERENCES bank_accounts(bank_account_id),
    upi_id_id         BIGINT REFERENCES upi_ids(upi_id_id),
    reference_no      VARCHAR(100),
    note              VARCHAR(255),
    paid_by           BIGINT NOT NULL REFERENCES users(user_id),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- non-cash payouts must say which bank account the money left from
    CONSTRAINT chk_salary_payment_account
        CHECK (payment_mode = 'CASH' OR bank_account_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_salary_payments_slip ON salary_payments(slip_id);
CREATE INDEX IF NOT EXISTS idx_salary_payments_tenant_date ON salary_payments(tenant_id, payment_date);


-- ================================================================
-- 4. SALARY_ADVANCES  (money given to staff in advance)
-- ================================================================
CREATE TABLE IF NOT EXISTS salary_advances (
    advance_id        BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tenant_id         INT NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    staff_id          BIGINT NOT NULL REFERENCES staff(staff_id),
    amount            NUMERIC(10,2) NOT NULL CHECK (amount > 0),
    advance_date      DATE NOT NULL DEFAULT CURRENT_DATE,
    reason            VARCHAR(255),
    payment_mode      VARCHAR(20) NOT NULL
                        CHECK (payment_mode IN ('CASH','UPI','BANK','CHEQUE')),
    bank_account_id   BIGINT REFERENCES bank_accounts(bank_account_id),
    upi_id_id         BIGINT REFERENCES upi_ids(upi_id_id),
    reference_no      VARCHAR(100),
    status            VARCHAR(15) NOT NULL DEFAULT 'ACTIVE'
                        CHECK (status IN ('ACTIVE','CANCELLED')),
    created_by        BIGINT NOT NULL REFERENCES users(user_id),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT chk_advance_account
        CHECK (payment_mode = 'CASH' OR bank_account_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_salary_advances_tenant_staff ON salary_advances(tenant_id, staff_id);
CREATE INDEX IF NOT EXISTS idx_salary_advances_tenant_status ON salary_advances(tenant_id, status);

DROP TRIGGER IF EXISTS before_salary_advances_update ON salary_advances;
CREATE TRIGGER before_salary_advances_update
BEFORE UPDATE ON salary_advances
FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();


-- ================================================================
-- 5. ADVANCE_REPAYMENTS  (repayment history)
--   SALARY_DEDUCTION : recovered from a salary slip (no cash moves)
--   DIRECT_PAYMENT   : staff hands money back (cash/bank moves IN)
-- ================================================================
CREATE TABLE IF NOT EXISTS advance_repayments (
    repayment_id      BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tenant_id         INT NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    advance_id        BIGINT NOT NULL REFERENCES salary_advances(advance_id),
    amount            NUMERIC(10,2) NOT NULL CHECK (amount > 0),
    repayment_date    DATE NOT NULL DEFAULT CURRENT_DATE,
    repayment_type    VARCHAR(20) NOT NULL
                        CHECK (repayment_type IN ('SALARY_DEDUCTION','DIRECT_PAYMENT')),
    slip_id           BIGINT REFERENCES salary_slips(slip_id),
    payment_mode      VARCHAR(20) CHECK (payment_mode IN ('CASH','UPI','BANK','CHEQUE')),
    bank_account_id   BIGINT REFERENCES bank_accounts(bank_account_id),
    reference_no      VARCHAR(100),
    note              VARCHAR(255),
    created_by        BIGINT NOT NULL REFERENCES users(user_id),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT chk_repayment_shape CHECK (
        (repayment_type = 'SALARY_DEDUCTION' AND slip_id IS NOT NULL)
        OR
        (repayment_type = 'DIRECT_PAYMENT' AND payment_mode IS NOT NULL
            AND (payment_mode = 'CASH' OR bank_account_id IS NOT NULL))
    )
);

CREATE INDEX IF NOT EXISTS idx_advance_repayments_advance ON advance_repayments(advance_id, repayment_date);
CREATE INDEX IF NOT EXISTS idx_advance_repayments_tenant ON advance_repayments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_advance_repayments_slip ON advance_repayments(slip_id);


-- ================================================================
-- 6. VIEWS  (derived numbers — never stored, never out of sync)
-- ================================================================

-- 6a. Each advance with repaid + outstanding
CREATE OR REPLACE VIEW v_advance_balances AS
SELECT
    a.advance_id,
    a.tenant_id,
    a.staff_id,
    a.amount,
    a.advance_date,
    a.status,
    COALESCE(SUM(r.amount), 0)              AS repaid_amount,
    a.amount - COALESCE(SUM(r.amount), 0)   AS outstanding_amount
FROM salary_advances a
LEFT JOIN advance_repayments r ON r.advance_id = a.advance_id
GROUP BY a.advance_id;

-- 6b. Each slip with paid amount, balance and payment status
CREATE OR REPLACE VIEW v_salary_slip_summary AS
SELECT
    s.*,
    COALESCE(SUM(p.amount), 0)                       AS paid_amount,
    s.net_payable - COALESCE(SUM(p.amount), 0)       AS balance_amount,
    CASE
        WHEN s.status <> 'FINALIZED'                 THEN 'NOT_READY'
        WHEN COALESCE(SUM(p.amount), 0) = 0          THEN 'UNPAID'
        WHEN COALESCE(SUM(p.amount), 0) < s.net_payable THEN 'PARTIAL'
        ELSE 'PAID'
    END                                              AS payment_status
FROM salary_slips s
LEFT JOIN salary_payments p ON p.slip_id = s.slip_id
GROUP BY s.slip_id;

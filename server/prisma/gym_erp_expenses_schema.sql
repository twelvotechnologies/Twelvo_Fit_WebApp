-- ================================================================
-- GYM ERP — EXPENSES MODULE (Expense Types, Expenses, Salary Link)
-- Run AFTER consolidated_schema_v1.sql AND gym_erp_payroll_schema.sql
-- ================================================================

BEGIN;

-- 1. EXPENSE_TYPES
CREATE TABLE IF NOT EXISTS expense_types (
    expense_type_id   BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tenant_id         INT NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    name              VARCHAR(100) NOT NULL,
    description       TEXT,
    is_system         BOOLEAN NOT NULL DEFAULT FALSE,
    is_active         BOOLEAN NOT NULL DEFAULT TRUE,
    is_deleted        BOOLEAN NOT NULL DEFAULT FALSE,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT uq_expense_types_tenant_name UNIQUE (tenant_id, name)
);

CREATE INDEX IF NOT EXISTS idx_expense_types_tenant ON expense_types(tenant_id);
CREATE INDEX IF NOT EXISTS idx_expense_types_active ON expense_types(tenant_id, is_active) WHERE is_deleted = FALSE;

DROP TRIGGER IF EXISTS before_expense_types_update ON expense_types;
CREATE TRIGGER before_expense_types_update
BEFORE UPDATE ON expense_types
FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();


-- 2. EXPENSES
CREATE TABLE IF NOT EXISTS expenses (
    expense_id        BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tenant_id         INT NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    expense_code      VARCHAR(30),
    expense_type_id   BIGINT NOT NULL REFERENCES expense_types(expense_type_id) ON DELETE RESTRICT,
    title             VARCHAR(150) NOT NULL,
    amount            NUMERIC(10,2) NOT NULL CHECK (amount > 0),
    expense_date      DATE NOT NULL DEFAULT CURRENT_DATE,
    payment_mode      VARCHAR(20) NOT NULL
                        CHECK (payment_mode IN ('CASH','UPI','BANK','CHEQUE','CARD','OTHER')),
    bank_account_id   BIGINT REFERENCES bank_accounts(bank_account_id) ON DELETE SET NULL,
    upi_id_id         BIGINT REFERENCES upi_ids(upi_id_id) ON DELETE SET NULL,
    reference_no      VARCHAR(100),
    notes             TEXT,
    
    -- Two salary links connecting salary rows to the expense table:
    salary_slip_id    BIGINT REFERENCES salary_slips(slip_id) ON DELETE SET NULL,
    salary_payment_id BIGINT REFERENCES salary_payments(payment_id) ON DELETE SET NULL,
    
    created_by        BIGINT REFERENCES users(user_id) ON DELETE SET NULL,
    is_deleted        BOOLEAN NOT NULL DEFAULT FALSE,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT chk_expense_account
        CHECK (payment_mode = 'CASH' OR payment_mode = 'OTHER' OR bank_account_id IS NOT NULL OR salary_payment_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_expenses_tenant_date ON expenses(tenant_id, expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_type ON expenses(tenant_id, expense_type_id);
CREATE INDEX IF NOT EXISTS idx_expenses_slip ON expenses(salary_slip_id);
CREATE INDEX IF NOT EXISTS idx_expenses_payment ON expenses(salary_payment_id);
CREATE INDEX IF NOT EXISTS idx_expenses_bank ON expenses(bank_account_id);
CREATE INDEX IF NOT EXISTS idx_expenses_deleted ON expenses(tenant_id, is_deleted);

DROP TRIGGER IF EXISTS before_expenses_update ON expenses;
CREATE TRIGGER before_expenses_update
BEFORE UPDATE ON expenses
FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

-- Seed Default Expense Types for existing tenants if not present
INSERT INTO expense_types (tenant_id, name, description, is_system, is_active)
SELECT t.tenant_id, 'Staff Salary & Payroll', 'Staff wages, trainer salaries, advances and compensation', TRUE, TRUE
FROM tenants t
WHERE NOT EXISTS (
    SELECT 1 FROM expense_types et WHERE et.tenant_id = t.tenant_id AND et.name = 'Staff Salary & Payroll'
);

INSERT INTO expense_types (tenant_id, name, description, is_system, is_active)
SELECT t.tenant_id, 'Rent & Facility', 'Gym premises rent and lease charges', FALSE, TRUE
FROM tenants t
WHERE NOT EXISTS (
    SELECT 1 FROM expense_types et WHERE et.tenant_id = t.tenant_id AND et.name = 'Rent & Facility'
);

INSERT INTO expense_types (tenant_id, name, description, is_system, is_active)
SELECT t.tenant_id, 'Electricity & Power', 'Power bills, backup generator diesel and electricity charges', FALSE, TRUE
FROM tenants t
WHERE NOT EXISTS (
    SELECT 1 FROM expense_types et WHERE et.tenant_id = t.tenant_id AND et.name = 'Electricity & Power'
);

INSERT INTO expense_types (tenant_id, name, description, is_system, is_active)
SELECT t.tenant_id, 'Water & Utilities', 'Water tanker, dispenser bottles, and sanitary utilities', FALSE, TRUE
FROM tenants t
WHERE NOT EXISTS (
    SELECT 1 FROM expense_types et WHERE et.tenant_id = t.tenant_id AND et.name = 'Water & Utilities'
);

INSERT INTO expense_types (tenant_id, name, description, is_system, is_active)
SELECT t.tenant_id, 'Equipment Maintenance & Repair', 'Gym machine servicing, cable replacements, and weights upkeep', FALSE, TRUE
FROM tenants t
WHERE NOT EXISTS (
    SELECT 1 FROM expense_types et WHERE et.tenant_id = t.tenant_id AND et.name = 'Equipment Maintenance & Repair'
);

INSERT INTO expense_types (tenant_id, name, description, is_system, is_active)
SELECT t.tenant_id, 'Housekeeping & Cleaning', 'Cleaning liquids, sanitizers, toilet rolls, and housekeeping supplies', FALSE, TRUE
FROM tenants t
WHERE NOT EXISTS (
    SELECT 1 FROM expense_types et WHERE et.tenant_id = t.tenant_id AND et.name = 'Housekeeping & Cleaning'
);

INSERT INTO expense_types (tenant_id, name, description, is_system, is_active)
SELECT t.tenant_id, 'Marketing & Advertising', 'Social media ads, banners, pamphlets, and promotions', FALSE, TRUE
FROM tenants t
WHERE NOT EXISTS (
    SELECT 1 FROM expense_types et WHERE et.tenant_id = t.tenant_id AND et.name = 'Marketing & Advertising'
);

INSERT INTO expense_types (tenant_id, name, description, is_system, is_active)
SELECT t.tenant_id, 'Software & Internet', 'Wi-Fi broadband connection, music subscriptions, and software tools', FALSE, TRUE
FROM tenants t
WHERE NOT EXISTS (
    SELECT 1 FROM expense_types et WHERE et.tenant_id = t.tenant_id AND et.name = 'Software & Internet'
);

INSERT INTO expense_types (tenant_id, name, description, is_system, is_active)
SELECT t.tenant_id, 'Miscellaneous', 'General day-to-day miscellaneous operational expenses', FALSE, TRUE
FROM tenants t
WHERE NOT EXISTS (
    SELECT 1 FROM expense_types et WHERE et.tenant_id = t.tenant_id AND et.name = 'Miscellaneous'
);

-- Backfill existing salary_payments into expenses table
INSERT INTO expenses (
    tenant_id,
    expense_code,
    expense_type_id,
    title,
    amount,
    expense_date,
    payment_mode,
    bank_account_id,
    upi_id_id,
    reference_no,
    notes,
    salary_slip_id,
    salary_payment_id,
    created_by,
    created_at
)
SELECT 
    sp.tenant_id,
    'SAL-EXP-' || sp.payment_id,
    et.expense_type_id,
    'Salary Payout: ' || COALESCE(st.full_name, 'Staff Member') || ' (' || TO_CHAR(ss.salary_month, 'Mon YYYY') || ')',
    sp.amount,
    sp.payment_date,
    sp.payment_mode,
    sp.bank_account_id,
    sp.upi_id_id,
    sp.reference_no,
    COALESCE(sp.note, 'Auto-generated salary payout expense'),
    sp.slip_id,
    sp.payment_id,
    sp.paid_by,
    sp.created_at
FROM salary_payments sp
JOIN salary_slips ss ON ss.slip_id = sp.slip_id
JOIN staff st ON st.staff_id = ss.staff_id
JOIN expense_types et ON et.tenant_id = sp.tenant_id AND et.name = 'Staff Salary & Payroll'
WHERE NOT EXISTS (
    SELECT 1 FROM expenses e WHERE e.salary_payment_id = sp.payment_id
);

COMMIT;

-- ================================================================
-- GYM ERP — PRISMA MIGRATION (20260927000000_consolidated_schema_v1)
-- ================================================================

-- 1. Tenants
CREATE TABLE IF NOT EXISTS "tenants" (
    "tenant_id" INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    "tenant_code" VARCHAR(20) NOT NULL UNIQUE,
    "tenant_prefix" VARCHAR(6),
    "gym_name" VARCHAR(150) NOT NULL,
    "owner_name" VARCHAR(100),
    "email" VARCHAR(150) NOT NULL UNIQUE,
    "phone_number" VARCHAR(20),
    "address_line" VARCHAR(255),
    "city" VARCHAR(100),
    "state" VARCHAR(100),
    "country" VARCHAR(100) DEFAULT 'India',
    "pincode" VARCHAR(10),
    "gst_number" VARCHAR(20),
    "logo_url" TEXT,
    "status" VARCHAR(20) NOT NULL DEFAULT 'active' CHECK ("status" IN ('active','suspended','trial','cancelled')),
    "plan_id" INT,
    "subscription_start" DATE,
    "subscription_end" DATE,
    "is_deleted" BOOLEAN NOT NULL DEFAULT FALSE,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT "uq_tenant_prefix" UNIQUE ("tenant_prefix")
);

CREATE INDEX IF NOT EXISTS "idx_tenants_status" ON "tenants"("status") WHERE "is_deleted" = FALSE;
CREATE INDEX IF NOT EXISTS "idx_tenants_plan_id" ON "tenants"("plan_id");

-- 2. Plans
CREATE TABLE IF NOT EXISTS "plans" (
    "plan_id" INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    "plan_name" VARCHAR(100) NOT NULL,
    "plan_code" VARCHAR(30) NOT NULL UNIQUE,
    "duration_months" SMALLINT NOT NULL,
    "price" NUMERIC(10,2) NOT NULL,
    "currency" VARCHAR(10) NOT NULL DEFAULT 'INR',
    "max_members" INTEGER,
    "max_trainers" INTEGER,
    "features" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_plans_active" ON "plans"("is_active");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_tenants_plan'
    ) THEN
        ALTER TABLE "tenants"
            ADD CONSTRAINT "fk_tenants_plan"
            FOREIGN KEY ("plan_id") REFERENCES "plans"("plan_id");
    END IF;
END $$;

-- 3. Users
CREATE TABLE IF NOT EXISTS "users" (
    "user_id" BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    "tenant_id" INT NOT NULL REFERENCES "tenants"("tenant_id") ON DELETE CASCADE,
    "username" VARCHAR(50) NOT NULL,
    "email" VARCHAR(150),
    "phone_number" VARCHAR(20),
    "password_hash" TEXT NOT NULL,
    "role" VARCHAR(20) NOT NULL CHECK ("role" IN ('gym_owner','trainer','other')),
    "full_name" VARCHAR(100),
    "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
    "is_deleted" BOOLEAN NOT NULL DEFAULT FALSE,
    "last_login_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT "uq_users_tenant_username" UNIQUE ("tenant_id", "username")
);

CREATE INDEX IF NOT EXISTS "idx_users_tenant_id" ON "users"("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_users_tenant_role" ON "users"("tenant_id", "role");
CREATE INDEX IF NOT EXISTS "idx_users_email" ON "users"("email") WHERE "is_deleted" = FALSE;

-- 4. Shared Functions & Code Generator Counter
CREATE OR REPLACE FUNCTION trg_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS "tenant_code_counters" (
    "tenant_id" INT NOT NULL REFERENCES "tenants"("tenant_id") ON DELETE CASCADE,
    "entity_type" VARCHAR(20) NOT NULL CHECK ("entity_type" IN ('STAFF','MEMBER','RECEIPT')),
    "last_number" BIGINT NOT NULL DEFAULT 1000,
    PRIMARY KEY ("tenant_id", "entity_type")
);

CREATE OR REPLACE FUNCTION generate_entity_code(p_tenant_id INT, p_entity_type VARCHAR)
RETURNS VARCHAR AS $$
DECLARE
    v_prefix   VARCHAR(6);
    v_next_num BIGINT;
    v_letters  VARCHAR(2);
BEGIN
    SELECT tenant_prefix INTO v_prefix FROM "tenants" WHERE tenant_id = p_tenant_id;

    IF v_prefix IS NULL THEN
        RAISE EXCEPTION 'Tenant % has no tenant_prefix set', p_tenant_id;
    END IF;

    v_letters := CASE p_entity_type
                   WHEN 'STAFF'   THEN 'TR'
                   WHEN 'MEMBER'  THEN 'MS'
                   WHEN 'RECEIPT' THEN 'RC'
                   ELSE 'XX'
                 END;

    INSERT INTO "tenant_code_counters" ("tenant_id", "entity_type", "last_number")
    VALUES (p_tenant_id, p_entity_type, 1001)
    ON CONFLICT ("tenant_id", "entity_type")
    DO UPDATE SET "last_number" = "tenant_code_counters"."last_number" + 1
    RETURNING "last_number" INTO v_next_num;

    RETURN v_prefix || v_letters || v_next_num;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS before_tenants_update ON "tenants";
CREATE TRIGGER before_tenants_update
BEFORE UPDATE ON "tenants"
FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

DROP TRIGGER IF EXISTS before_plans_update ON "plans";
CREATE TRIGGER before_plans_update
BEFORE UPDATE ON "plans"
FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

DROP TRIGGER IF EXISTS before_users_update ON "users";
CREATE TRIGGER before_users_update
BEFORE UPDATE ON "users"
FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

-- 5. Staff
CREATE TABLE IF NOT EXISTS "staff" (
    "staff_id" BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    "tenant_id" INT NOT NULL REFERENCES "tenants"("tenant_id") ON DELETE CASCADE,
    "user_id" BIGINT NOT NULL REFERENCES "users"("user_id") ON DELETE CASCADE,
    "staff_code" VARCHAR(20) UNIQUE,
    "full_name" VARCHAR(100) NOT NULL,
    "designation" VARCHAR(100) NOT NULL,
    "specialization" VARCHAR(150),
    "experience_years" NUMERIC(4,1),
    "certifications" TEXT,
    "email" VARCHAR(150),
    "phone" VARCHAR(20),
    "photo_url" TEXT,
    "joining_date" DATE NOT NULL,
    "employment_status" VARCHAR(20) NOT NULL DEFAULT 'active' CHECK ("employment_status" IN ('active','on_leave','terminated','resigned')),
    "base_salary" NUMERIC(10,2),
    "is_deleted" BOOLEAN NOT NULL DEFAULT FALSE,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_staff_tenant_id" ON "staff"("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_staff_tenant_status" ON "staff"("tenant_id", "employment_status") WHERE "is_deleted" = FALSE;
CREATE INDEX IF NOT EXISTS "idx_staff_user_id" ON "staff"("user_id");

DROP TRIGGER IF EXISTS before_staff_update ON "staff";
CREATE TRIGGER before_staff_update
BEFORE UPDATE ON "staff"
FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

CREATE OR REPLACE FUNCTION trg_set_staff_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.staff_code IS NULL THEN
        NEW.staff_code := generate_entity_code(NEW.tenant_id, 'STAFF');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS before_staff_insert ON "staff";
CREATE TRIGGER before_staff_insert
BEFORE INSERT ON "staff"
FOR EACH ROW EXECUTE FUNCTION trg_set_staff_code();

-- 6. Plans Catalog
CREATE TABLE IF NOT EXISTS "plans_catalog" (
    "plan_id" BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    "tenant_id" INT NOT NULL REFERENCES "tenants"("tenant_id") ON DELETE CASCADE,
    "plan_name" VARCHAR(100) NOT NULL,
    "plan_category" VARCHAR(30) NOT NULL DEFAULT 'Regular' CHECK ("plan_category" IN ('Regular','Personal Training')),
    "duration_value" INTEGER NOT NULL,
    "duration_unit" VARCHAR(20) NOT NULL CHECK ("duration_unit" IN ('Days','Months','Years','One-time')),
    "standard_fee" NUMERIC(10,2) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
    "is_deleted" BOOLEAN NOT NULL DEFAULT FALSE,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT "uq_plan_name_per_tenant" UNIQUE ("tenant_id", "plan_name")
);

CREATE INDEX IF NOT EXISTS "idx_plans_catalog_tenant" ON "plans_catalog"("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_plans_catalog_active" ON "plans_catalog"("tenant_id", "is_active") WHERE "is_deleted" = FALSE;

DROP TRIGGER IF EXISTS before_plans_catalog_update ON "plans_catalog";
CREATE TRIGGER before_plans_catalog_update
BEFORE UPDATE ON "plans_catalog"
FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

-- 7. Members
CREATE TABLE IF NOT EXISTS "members" (
    "member_id" BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    "tenant_id" INT NOT NULL REFERENCES "tenants"("tenant_id") ON DELETE CASCADE,
    "member_code" VARCHAR(20) UNIQUE,
    "full_name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(150),
    "phone" VARCHAR(20) NOT NULL,
    "photo_url" TEXT,
    "emergency_contact_name" VARCHAR(100),
    "emergency_contact_phone" VARCHAR(20),
    "joining_date" DATE NOT NULL,
    "assigned_trainer_id" BIGINT REFERENCES "staff"("staff_id"),
    "current_plan_id" BIGINT REFERENCES "plans_catalog"("plan_id"),
    "plan_start_date" DATE,
    "fee_amount_at_signup" NUMERIC(10,2),
    "next_due_date" DATE,
    "is_estimated_due_date" BOOLEAN NOT NULL DEFAULT FALSE,
    "status" VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK ("status" IN ('ACTIVE','EXPIRED','FROZEN')),
    "onboarded_via" VARCHAR(20) NOT NULL DEFAULT 'admin' CHECK ("onboarded_via" IN ('admin','trainer')),
    "is_deleted" BOOLEAN NOT NULL DEFAULT FALSE,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_members_tenant_id" ON "members"("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_members_tenant_status" ON "members"("tenant_id", "status") WHERE "is_deleted" = FALSE;
CREATE INDEX IF NOT EXISTS "idx_members_trainer" ON "members"("assigned_trainer_id");
CREATE INDEX IF NOT EXISTS "idx_members_next_due" ON "members"("tenant_id", "next_due_date");
CREATE INDEX IF NOT EXISTS "idx_members_plan" ON "members"("current_plan_id");

DROP TRIGGER IF EXISTS before_members_update ON "members";
CREATE TRIGGER before_members_update
BEFORE UPDATE ON "members"
FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

CREATE OR REPLACE FUNCTION trg_set_member_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.member_code IS NULL THEN
        NEW.member_code := generate_entity_code(NEW.tenant_id, 'MEMBER');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS before_members_insert ON "members";
CREATE TRIGGER before_members_insert
BEFORE INSERT ON "members"
FOR EACH ROW EXECUTE FUNCTION trg_set_member_code();

-- 8. Bank Accounts
CREATE TABLE IF NOT EXISTS "bank_accounts" (
    "bank_account_id" BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    "tenant_id" INT NOT NULL REFERENCES "tenants"("tenant_id") ON DELETE CASCADE,
    "account_name" VARCHAR(100) NOT NULL,
    "bank_name" VARCHAR(100) NOT NULL,
    "account_holder_name" VARCHAR(100),
    "account_number" VARCHAR(30),
    "ifsc_code" VARCHAR(15),
    "branch_name" VARCHAR(100),
    "balance_type" SMALLINT NOT NULL DEFAULT 1 CHECK ("balance_type" IN (1, 2)),
    "opening_balance_amount" NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK ("opening_balance_amount" >= 0),
    "opening_balance" NUMERIC(12,2) NOT NULL DEFAULT 0,
    "current_balance" NUMERIC(12,2) NOT NULL DEFAULT 0,
    "is_primary" BOOLEAN NOT NULL DEFAULT FALSE,
    "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
    "is_deleted" BOOLEAN NOT NULL DEFAULT FALSE,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_bank_accounts_tenant" ON "bank_accounts"("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_bank_accounts_active" ON "bank_accounts"("tenant_id", "is_active") WHERE "is_deleted" = FALSE;

CREATE UNIQUE INDEX IF NOT EXISTS "uq_one_primary_bank_per_tenant"
    ON "bank_accounts"("tenant_id") WHERE "is_primary" = TRUE AND "is_deleted" = FALSE;

DROP TRIGGER IF EXISTS before_bank_accounts_update ON "bank_accounts";
CREATE TRIGGER before_bank_accounts_update
BEFORE UPDATE ON "bank_accounts"
FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

CREATE OR REPLACE FUNCTION trg_set_signed_balance()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.balance_type = 2 THEN
        NEW.opening_balance := -1 * NEW.opening_balance_amount;
    ELSE
        NEW.opening_balance := NEW.opening_balance_amount;
    END IF;
    NEW.current_balance := NEW.opening_balance;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS before_bank_accounts_insert ON "bank_accounts";
CREATE TRIGGER before_bank_accounts_insert
BEFORE INSERT ON "bank_accounts"
FOR EACH ROW EXECUTE FUNCTION trg_set_signed_balance();

-- 9. UPI IDs
CREATE TABLE IF NOT EXISTS "upi_ids" (
    "upi_id_id" BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    "tenant_id" INT NOT NULL REFERENCES "tenants"("tenant_id") ON DELETE CASCADE,
    "bank_account_id" BIGINT NOT NULL REFERENCES "bank_accounts"("bank_account_id") ON DELETE CASCADE,
    "upi_label" VARCHAR(50) NOT NULL,
    "upi_handle" VARCHAR(100) NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT FALSE,
    "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
    "is_deleted" BOOLEAN NOT NULL DEFAULT FALSE,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT "uq_upi_handle_per_tenant" UNIQUE ("tenant_id", "upi_handle")
);

CREATE INDEX IF NOT EXISTS "idx_upi_ids_tenant" ON "upi_ids"("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_upi_ids_bank_account" ON "upi_ids"("bank_account_id");
CREATE INDEX IF NOT EXISTS "idx_upi_ids_active" ON "upi_ids"("tenant_id", "is_active") WHERE "is_deleted" = FALSE;

DROP TRIGGER IF EXISTS before_upi_ids_update ON "upi_ids";
CREATE TRIGGER before_upi_ids_update
BEFORE UPDATE ON "upi_ids"
FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

-- 10. Cash Transactions
CREATE TABLE IF NOT EXISTS "cash_transactions" (
    "transaction_id" BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    "tenant_id" INT NOT NULL REFERENCES "tenants"("tenant_id") ON DELETE CASCADE,
    "transaction_type" SMALLINT NOT NULL CHECK ("transaction_type" IN (1, 2)),
    "amount" NUMERIC(12,2) NOT NULL CHECK ("amount" > 0),
    "is_opening" SMALLINT NOT NULL DEFAULT 1 CHECK ("is_opening" IN (0, 1)),
    "transaction_date" DATE NOT NULL DEFAULT CURRENT_DATE,
    "reference_type" VARCHAR(30),
    "reference_id" BIGINT,
    "description" TEXT,
    "created_by" BIGINT REFERENCES "users"("user_id"),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_cash_txn_tenant" ON "cash_transactions"("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_cash_txn_date" ON "cash_transactions"("tenant_id", "transaction_date");
CREATE INDEX IF NOT EXISTS "idx_cash_txn_opening" ON "cash_transactions"("tenant_id", "is_opening");
CREATE INDEX IF NOT EXISTS "idx_cash_txn_reference" ON "cash_transactions"("reference_type", "reference_id");

CREATE UNIQUE INDEX IF NOT EXISTS "uq_one_opening_entry_per_tenant"
    ON "cash_transactions"("tenant_id") WHERE "is_opening" = 0;

-- 11. Receipts + Approval History
CREATE TABLE IF NOT EXISTS "receipts" (
    "receipt_id" BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    "tenant_id" INT NOT NULL REFERENCES "tenants"("tenant_id") ON DELETE CASCADE,
    "receipt_code" VARCHAR(20) UNIQUE,
    "member_id" BIGINT NOT NULL REFERENCES "members"("member_id"),
    "plan_id" BIGINT REFERENCES "plans_catalog"("plan_id"),
    "payment_for" VARCHAR(20) NOT NULL DEFAULT 'FEES' CHECK ("payment_for" IN ('FEES','REGISTRATION')),
    "amount" NUMERIC(10,2) NOT NULL CHECK ("amount" >= 0),
    "tax_amount" NUMERIC(10,2) NOT NULL DEFAULT 0,
    "total_amount" NUMERIC(10,2) NOT NULL,
    "payment_date" DATE NOT NULL DEFAULT CURRENT_DATE,
    "payment_mode" VARCHAR(20) NOT NULL CHECK ("payment_mode" IN ('CASH','UPI','BANK','CARD','CHEQUE')),
    "bank_account_id" BIGINT REFERENCES "bank_accounts"("bank_account_id"),
    "upi_id_id" BIGINT REFERENCES "upi_ids"("upi_id_id"),
    "reference_no" VARCHAR(100),
    "approval_status" SMALLINT NOT NULL DEFAULT 1 CHECK ("approval_status" IN (1, 2, 3, 4)),
    "submitted_by" BIGINT NOT NULL REFERENCES "users"("user_id"),
    "submitted_role" VARCHAR(20) NOT NULL CHECK ("submitted_role" IN ('gym_owner','trainer','other')),
    "last_action_by" BIGINT REFERENCES "users"("user_id"),
    "last_action_note" TEXT,
    "is_deleted" BOOLEAN NOT NULL DEFAULT FALSE,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_receipts_tenant" ON "receipts"("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_receipts_member" ON "receipts"("member_id");
CREATE INDEX IF NOT EXISTS "idx_receipts_status" ON "receipts"("tenant_id", "approval_status");
CREATE INDEX IF NOT EXISTS "idx_receipts_date" ON "receipts"("tenant_id", "payment_date");
CREATE INDEX IF NOT EXISTS "idx_receipts_payment_for" ON "receipts"("tenant_id", "payment_for");
CREATE INDEX IF NOT EXISTS "idx_receipts_bank_account" ON "receipts"("bank_account_id");
CREATE INDEX IF NOT EXISTS "idx_receipts_upi" ON "receipts"("upi_id_id");

DROP TRIGGER IF EXISTS before_receipts_update ON "receipts";
CREATE TRIGGER before_receipts_update
BEFORE UPDATE ON "receipts"
FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

CREATE OR REPLACE FUNCTION trg_set_receipt_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.receipt_code IS NULL THEN
        NEW.receipt_code := generate_entity_code(NEW.tenant_id, 'RECEIPT');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS before_receipts_insert ON "receipts";
CREATE TRIGGER before_receipts_insert
BEFORE INSERT ON "receipts"
FOR EACH ROW EXECUTE FUNCTION trg_set_receipt_code();

CREATE TABLE IF NOT EXISTS "receipt_approval_history" (
    "history_id" BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    "tenant_id" INT NOT NULL REFERENCES "tenants"("tenant_id") ON DELETE CASCADE,
    "receipt_id" BIGINT NOT NULL REFERENCES "receipts"("receipt_id") ON DELETE CASCADE,
    "previous_status" SMALLINT CHECK ("previous_status" IN (1, 2, 3, 4)),
    "new_status" SMALLINT NOT NULL CHECK ("new_status" IN (1, 2, 3, 4)),
    "action_by" BIGINT NOT NULL REFERENCES "users"("user_id"),
    "action_note" TEXT,
    "action_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_receipt_history_tenant" ON "receipt_approval_history"("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_receipt_history_receipt" ON "receipt_approval_history"("receipt_id", "action_at");

CREATE OR REPLACE FUNCTION trg_log_receipt_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO "receipt_approval_history" ("tenant_id", "receipt_id", "previous_status", "new_status", "action_by", "action_note")
        VALUES (NEW.tenant_id, NEW.receipt_id, NULL, NEW.approval_status, NEW.submitted_by, NULL);

    ELSIF TG_OP = 'UPDATE' AND NEW.approval_status IS DISTINCT FROM OLD.approval_status THEN
        INSERT INTO "receipt_approval_history" ("tenant_id", "receipt_id", "previous_status", "new_status", "action_by", "action_note")
        VALUES (NEW.tenant_id, NEW.receipt_id, OLD.approval_status, NEW.approval_status, NEW.last_action_by, NEW.last_action_note);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS after_receipts_insert_log ON "receipts";
CREATE TRIGGER after_receipts_insert_log
AFTER INSERT ON "receipts"
FOR EACH ROW EXECUTE FUNCTION trg_log_receipt_status_change();

DROP TRIGGER IF EXISTS after_receipts_update_log ON "receipts";
CREATE TRIGGER after_receipts_update_log
AFTER UPDATE ON "receipts"
FOR EACH ROW EXECUTE FUNCTION trg_log_receipt_status_change();

CREATE OR REPLACE FUNCTION trg_apply_accepted_receipt_to_member()
RETURNS TRIGGER AS $$
DECLARE
    v_duration_value INT;
    v_duration_unit  VARCHAR(20);
    v_base_date      DATE;
BEGIN
    IF NEW.approval_status = 2 AND (TG_OP = 'INSERT' OR OLD.approval_status IS DISTINCT FROM 2) THEN

        SELECT duration_value, duration_unit INTO v_duration_value, v_duration_unit
        FROM "plans_catalog" WHERE plan_id = NEW.plan_id;

        SELECT GREATEST(next_due_date, CURRENT_DATE) INTO v_base_date
        FROM "members" WHERE member_id = NEW.member_id;

        IF v_base_date IS NULL THEN
            v_base_date := CURRENT_DATE;
        END IF;

        UPDATE "members"
        SET current_plan_id = NEW.plan_id,
            next_due_date = CASE v_duration_unit
                               WHEN 'Days'   THEN (v_base_date + (v_duration_value || ' days')::INTERVAL)::DATE
                               WHEN 'Months' THEN (v_base_date + (v_duration_value || ' months')::INTERVAL)::DATE
                               WHEN 'Years'  THEN (v_base_date + (v_duration_value || ' years')::INTERVAL)::DATE
                               ELSE next_due_date
                             END,
            is_estimated_due_date = FALSE,
            status = 'ACTIVE'
        WHERE member_id = NEW.member_id;

    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS after_receipts_update_member_due_date ON "receipts";
CREATE TRIGGER after_receipts_update_member_due_date
AFTER INSERT OR UPDATE ON "receipts"
FOR EACH ROW EXECUTE FUNCTION trg_apply_accepted_receipt_to_member();

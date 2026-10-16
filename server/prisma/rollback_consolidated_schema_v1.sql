-- ================================================================
-- GYM ERP — ROLLBACK MIGRATION SCHEMA (v1)
-- Description: Completely tears down all v1 tables, triggers, and functions
-- Database Engine: PostgreSQL 14+
-- ================================================================

BEGIN;

-- 1. DROP TRIGGERS
DROP TRIGGER IF EXISTS after_receipts_update_member_due_date ON receipts;
DROP TRIGGER IF EXISTS after_receipts_update_log ON receipts;
DROP TRIGGER IF EXISTS after_receipts_insert_log ON receipts;
DROP TRIGGER IF EXISTS before_receipts_insert ON receipts;
DROP TRIGGER IF EXISTS before_receipts_update ON receipts;

DROP TRIGGER IF EXISTS before_upi_ids_update ON upi_ids;
DROP TRIGGER IF EXISTS before_bank_accounts_insert ON bank_accounts;
DROP TRIGGER IF EXISTS before_bank_accounts_update ON bank_accounts;

DROP TRIGGER IF EXISTS before_members_insert ON members;
DROP TRIGGER IF EXISTS before_members_update ON members;

DROP TRIGGER IF EXISTS before_plans_catalog_update ON plans_catalog;
DROP TRIGGER IF EXISTS before_staff_insert ON staff;
DROP TRIGGER IF EXISTS before_staff_update ON staff;

DROP TRIGGER IF EXISTS before_users_update ON users;
DROP TRIGGER IF EXISTS before_plans_update ON plans;
DROP TRIGGER IF EXISTS before_tenants_update ON tenants;

-- 2. DROP FUNCTIONS
DROP FUNCTION IF EXISTS trg_apply_accepted_receipt_to_member();
DROP FUNCTION IF EXISTS trg_log_receipt_status_change();
DROP FUNCTION IF EXISTS trg_set_receipt_code();
DROP FUNCTION IF EXISTS trg_set_signed_balance();
DROP FUNCTION IF EXISTS trg_set_member_code();
DROP FUNCTION IF EXISTS trg_set_staff_code();
DROP FUNCTION IF EXISTS generate_entity_code(INT, VARCHAR);
DROP FUNCTION IF EXISTS trg_set_updated_at();

-- 3. DROP TABLES (Reverse dependency order)
DROP TABLE IF EXISTS receipt_approval_history CASCADE;
DROP TABLE IF EXISTS receipts CASCADE;
DROP TABLE IF EXISTS cash_transactions CASCADE;
DROP TABLE IF EXISTS upi_ids CASCADE;
DROP TABLE IF EXISTS bank_accounts CASCADE;
DROP TABLE IF EXISTS members CASCADE;
DROP TABLE IF EXISTS plans_catalog CASCADE;
DROP TABLE IF EXISTS staff CASCADE;
DROP TABLE IF EXISTS tenant_code_counters CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Break circular dependency between tenants and plans if exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_tenants_plan'
    ) THEN
        ALTER TABLE tenants DROP CONSTRAINT fk_tenants_plan;
    END IF;
END $$;

DROP TABLE IF EXISTS tenants CASCADE;
DROP TABLE IF EXISTS plans CASCADE;

COMMIT;
-- ================================================================
-- END OF ROLLBACK MIGRATION SCHEMA (v1)
-- ================================================================

-- =============================================
-- TENANT MANAGEMENT SYSTEM ROLLBACK MIGRATION
-- Safe rollback for tenant management enhancements
-- =============================================

-- =============================================
-- 1. DROP TRIGGERS FIRST
-- =============================================

DROP TRIGGER IF EXISTS trigger_update_org_activity_leads ON leads;
DROP TRIGGER IF EXISTS trigger_update_org_activity_bookings ON bookings;
DROP TRIGGER IF EXISTS trigger_update_org_activity_messages ON messages;
DROP TRIGGER IF EXISTS update_tenant_plan_features_updated_at ON tenant_plan_features;
DROP TRIGGER IF EXISTS update_tenant_risk_scores_updated_at ON tenant_risk_scores;
DROP TRIGGER IF EXISTS update_customer_success_managers_updated_at ON customer_success_managers;

-- =============================================
-- 2. DROP FUNCTIONS
-- =============================================

DROP FUNCTION IF EXISTS calculate_tenant_risk_score(UUID);
DROP FUNCTION IF EXISTS track_usage(UUID, TEXT, INTEGER, JSONB);
DROP FUNCTION IF EXISTS update_org_activity();

-- =============================================
-- 3. DROP VIEWS
-- =============================================

DROP VIEW IF EXISTS admin_tenant_dashboard;

-- =============================================
-- 4. DROP INDEXES
-- =============================================

-- Organizations indexes
DROP INDEX IF EXISTS idx_organizations_status;
DROP INDEX IF EXISTS idx_organizations_risk_score;
DROP INDEX IF EXISTS idx_organizations_health_score;
DROP INDEX IF EXISTS idx_organizations_churn_risk;
DROP INDEX IF EXISTS idx_organizations_csm;
DROP INDEX IF EXISTS idx_organizations_mrr;
DROP INDEX IF EXISTS idx_organizations_last_activity;
DROP INDEX IF EXISTS idx_organizations_trial_ends;
DROP INDEX IF EXISTS idx_organizations_status_risk;
DROP INDEX IF EXISTS idx_organizations_csm_status;

-- Usage ledger indexes
DROP INDEX IF EXISTS idx_usage_ledger_org;
DROP INDEX IF EXISTS idx_usage_ledger_type;
DROP INDEX IF EXISTS idx_usage_ledger_billing_period;
DROP INDEX IF EXISTS idx_usage_ledger_recorded;
DROP INDEX IF EXISTS idx_usage_ledger_billable;

-- Risk scores indexes
DROP INDEX IF EXISTS idx_tenant_risk_scores_org;
DROP INDEX IF EXISTS idx_tenant_risk_scores_date;
DROP INDEX IF EXISTS idx_tenant_risk_scores_health;
DROP INDEX IF EXISTS idx_tenant_risk_scores_churn;

-- Tenant events indexes
DROP INDEX IF EXISTS idx_tenant_events_org;
DROP INDEX IF EXISTS idx_tenant_events_type;
DROP INDEX IF EXISTS idx_tenant_events_created;
DROP INDEX IF EXISTS idx_tenant_events_impact;

-- Plan features indexes
DROP INDEX IF EXISTS idx_tenant_plan_features_plan;
DROP INDEX IF EXISTS idx_tenant_plan_features_category;

-- CSM indexes
DROP INDEX IF EXISTS idx_csm_active;
DROP INDEX IF EXISTS idx_csm_user;

-- =============================================
-- 5. DROP TABLES
-- =============================================

-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS tenant_events;
DROP TABLE IF EXISTS tenant_risk_scores;
DROP TABLE IF EXISTS usage_ledger;
DROP TABLE IF EXISTS customer_success_managers;
DROP TABLE IF EXISTS tenant_plan_features;

-- =============================================
-- 6. REMOVE COLUMNS FROM ORGANIZATIONS
-- =============================================

-- Remove tenant management columns from organizations
-- Note: In production, consider a more gradual approach
ALTER TABLE organizations DROP COLUMN IF EXISTS status;
ALTER TABLE organizations DROP COLUMN IF EXISTS risk_score;
ALTER TABLE organizations DROP COLUMN IF EXISTS health_score;
ALTER TABLE organizations DROP COLUMN IF EXISTS mrr_cents;
ALTER TABLE organizations DROP COLUMN IF EXISTS churn_risk_level;
ALTER TABLE organizations DROP COLUMN IF EXISTS owner_csm_id;
ALTER TABLE organizations DROP COLUMN IF EXISTS trial_ends_at;
ALTER TABLE organizations DROP COLUMN IF EXISTS last_activity_at;
ALTER TABLE organizations DROP COLUMN IF EXISTS onboarding_completed_at;
ALTER TABLE organizations DROP COLUMN IF EXISTS first_payment_at;
ALTER TABLE organizations DROP COLUMN IF EXISTS billing_email;
ALTER TABLE organizations DROP COLUMN IF EXISTS company_size;
ALTER TABLE organizations DROP COLUMN IF EXISTS industry;
ALTER TABLE organizations DROP COLUMN IF EXISTS timezone;
ALTER TABLE organizations DROP COLUMN IF EXISTS country_code;

-- =============================================
-- ROLLBACK COMPLETE
-- =============================================

-- Log rollback completion
DO $$
BEGIN
  RAISE NOTICE 'Tenant management system rollback completed successfully';
END $$;
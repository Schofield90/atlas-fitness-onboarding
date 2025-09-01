-- =====================================================
-- Multi-Tenant Standardization Migration
-- Date: 2025-09-01
-- Purpose: Standardize all tables for multi-tenant SaaS
-- =====================================================

-- This migration:
-- 1. Renames all 'org_id' columns to 'organization_id'
-- 2. Adds missing organization_id columns
-- 3. Creates RLS policies for all tenant tables
-- 4. Adds performance indexes
-- 5. Ensures data isolation between organizations

-- =====================================================
-- STEP 1: Column Standardization
-- =====================================================

-- Helper function to safely rename columns
CREATE OR REPLACE FUNCTION rename_column_if_exists(
    table_name text,
    old_column text,
    new_column text
) RETURNS void AS $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = $1 
        AND column_name = $2
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = $1 
        AND column_name = $3
    ) THEN
        EXECUTE format('ALTER TABLE %I RENAME COLUMN %I TO %I', $1, $2, $3);
        RAISE NOTICE 'Renamed %.% to %', $1, $2, $3;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Standardize 'org_id' to 'organization_id' in all tables
SELECT rename_column_if_exists('clients', 'org_id', 'organization_id');
SELECT rename_column_if_exists('leads', 'org_id', 'organization_id');
SELECT rename_column_if_exists('facebook_leads', 'org_id', 'organization_id');
SELECT rename_column_if_exists('calendar_events', 'org_id', 'organization_id');
SELECT rename_column_if_exists('tasks', 'org_id', 'organization_id');
SELECT rename_column_if_exists('notes', 'org_id', 'organization_id');
SELECT rename_column_if_exists('email_templates', 'org_id', 'organization_id');
SELECT rename_column_if_exists('automations', 'org_id', 'organization_id');
SELECT rename_column_if_exists('workout_programs', 'org_id', 'organization_id');
SELECT rename_column_if_exists('exercises', 'org_id', 'organization_id');
SELECT rename_column_if_exists('facebook_integrations', 'org_id', 'organization_id');

-- =====================================================
-- STEP 2: Add Missing organization_id Columns
-- =====================================================

-- Contacts table
ALTER TABLE contacts 
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- Update NULL organization_ids (should not happen in production)
UPDATE contacts 
SET organization_id = (
    SELECT organization_id FROM user_organizations 
    WHERE user_id = contacts.user_id 
    LIMIT 1
)
WHERE organization_id IS NULL AND user_id IS NOT NULL;

-- Make organization_id NOT NULL after populating
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'contacts' 
        AND column_name = 'organization_id' 
        AND is_nullable = 'YES'
    ) THEN
        -- Delete any remaining records without organization_id
        DELETE FROM contacts WHERE organization_id IS NULL;
        -- Now make it NOT NULL
        ALTER TABLE contacts ALTER COLUMN organization_id SET NOT NULL;
    END IF;
END $$;

-- Booking links table
ALTER TABLE booking_links 
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

UPDATE booking_links bl
SET organization_id = (
    SELECT organization_id FROM user_organizations 
    WHERE user_id = bl.user_id 
    LIMIT 1
)
WHERE organization_id IS NULL AND user_id IS NOT NULL;

-- Appointment types table
ALTER TABLE appointment_types 
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- Calendar settings table
ALTER TABLE calendar_settings 
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- Google calendar tokens table
ALTER TABLE google_calendar_tokens 
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- Facebook integrations (ensure it has organization_id)
ALTER TABLE facebook_integrations 
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- Automations table
ALTER TABLE automations 
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- Workout programs table
ALTER TABLE workout_programs 
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- Exercises table
ALTER TABLE exercises 
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- =====================================================
-- STEP 3: Create RLS Policies for All Tables
-- =====================================================

-- Helper function to create standard RLS policies
CREATE OR REPLACE FUNCTION create_rls_policies(table_name text) RETURNS void AS $$
BEGIN
    -- Enable RLS
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
    
    -- Drop existing policies
    EXECUTE format('DROP POLICY IF EXISTS "org_isolation_select" ON %I', table_name);
    EXECUTE format('DROP POLICY IF EXISTS "org_isolation_insert" ON %I', table_name);
    EXECUTE format('DROP POLICY IF EXISTS "org_isolation_update" ON %I', table_name);
    EXECUTE format('DROP POLICY IF EXISTS "org_isolation_delete" ON %I', table_name);
    
    -- Create new policies
    EXECUTE format('
        CREATE POLICY "org_isolation_select" ON %I
        FOR SELECT TO authenticated
        USING (
            organization_id IN (
                SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
                UNION
                SELECT organization_id FROM organization_members 
                WHERE user_id = auth.uid() AND is_active = true
            )
        )', table_name);
    
    EXECUTE format('
        CREATE POLICY "org_isolation_insert" ON %I
        FOR INSERT TO authenticated
        WITH CHECK (
            organization_id IN (
                SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
                UNION
                SELECT organization_id FROM organization_members 
                WHERE user_id = auth.uid() AND is_active = true
            )
        )', table_name);
    
    EXECUTE format('
        CREATE POLICY "org_isolation_update" ON %I
        FOR UPDATE TO authenticated
        USING (
            organization_id IN (
                SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
                UNION
                SELECT organization_id FROM organization_members 
                WHERE user_id = auth.uid() AND is_active = true
            )
        )', table_name);
    
    EXECUTE format('
        CREATE POLICY "org_isolation_delete" ON %I
        FOR DELETE TO authenticated
        USING (
            organization_id IN (
                SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
                UNION
                SELECT organization_id FROM organization_members 
                WHERE user_id = auth.uid() AND is_active = true
            )
        )', table_name);
    
    RAISE NOTICE 'Created RLS policies for %', table_name;
END;
$$ LANGUAGE plpgsql;

-- Apply RLS to all tenant tables
SELECT create_rls_policies('contacts');
SELECT create_rls_policies('clients');
SELECT create_rls_policies('leads');
SELECT create_rls_policies('booking_links');
SELECT create_rls_policies('appointment_types');
SELECT create_rls_policies('calendar_settings');
SELECT create_rls_policies('google_calendar_tokens');
SELECT create_rls_policies('facebook_integrations');
SELECT create_rls_policies('automations');
SELECT create_rls_policies('workout_programs');
SELECT create_rls_policies('exercises');
SELECT create_rls_policies('calendar_events');
SELECT create_rls_policies('tasks');
SELECT create_rls_policies('notes');
SELECT create_rls_policies('email_templates');
SELECT create_rls_policies('messages');
SELECT create_rls_policies('conversations');

-- Special case for tables that might not exist yet
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'facebook_leads') THEN
        PERFORM create_rls_policies('facebook_leads');
    END IF;
END $$;

-- =====================================================
-- STEP 4: Create Performance Indexes
-- =====================================================

-- Create indexes on organization_id for all tables
CREATE INDEX IF NOT EXISTS idx_contacts_organization_id ON contacts(organization_id);
CREATE INDEX IF NOT EXISTS idx_clients_organization_id ON clients(organization_id);
CREATE INDEX IF NOT EXISTS idx_leads_organization_id ON leads(organization_id);
CREATE INDEX IF NOT EXISTS idx_booking_links_organization_id ON booking_links(organization_id);
CREATE INDEX IF NOT EXISTS idx_appointment_types_organization_id ON appointment_types(organization_id);
CREATE INDEX IF NOT EXISTS idx_calendar_settings_organization_id ON calendar_settings(organization_id);
CREATE INDEX IF NOT EXISTS idx_google_calendar_tokens_organization_id ON google_calendar_tokens(organization_id);
CREATE INDEX IF NOT EXISTS idx_facebook_integrations_organization_id ON facebook_integrations(organization_id);
CREATE INDEX IF NOT EXISTS idx_automations_organization_id ON automations(organization_id);
CREATE INDEX IF NOT EXISTS idx_workout_programs_organization_id ON workout_programs(organization_id);
CREATE INDEX IF NOT EXISTS idx_exercises_organization_id ON exercises(organization_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_organization_id ON calendar_events(organization_id);
CREATE INDEX IF NOT EXISTS idx_tasks_organization_id ON tasks(organization_id);
CREATE INDEX IF NOT EXISTS idx_notes_organization_id ON notes(organization_id);
CREATE INDEX IF NOT EXISTS idx_email_templates_organization_id ON email_templates(organization_id);
CREATE INDEX IF NOT EXISTS idx_messages_organization_id ON messages(organization_id);
CREATE INDEX IF NOT EXISTS idx_conversations_organization_id ON conversations(organization_id);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_leads_org_created ON leads(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_clients_org_created ON clients(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_calendar_events_org_start ON calendar_events(organization_id, start_time);
CREATE INDEX IF NOT EXISTS idx_messages_org_created ON messages(organization_id, created_at DESC);

-- =====================================================
-- STEP 5: Verify Migration
-- =====================================================

-- Create verification function
CREATE OR REPLACE FUNCTION verify_multi_tenant_setup() RETURNS TABLE(
    table_name text,
    has_organization_id boolean,
    has_rls boolean,
    has_index boolean,
    is_compliant boolean
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.tablename::text,
        EXISTS(
            SELECT 1 FROM information_schema.columns c
            WHERE c.table_name = t.tablename 
            AND c.column_name = 'organization_id'
        ) as has_organization_id,
        t.rowsecurity as has_rls,
        EXISTS(
            SELECT 1 FROM pg_indexes i
            WHERE i.tablename = t.tablename 
            AND i.indexname LIKE '%organization_id%'
        ) as has_index,
        (
            EXISTS(
                SELECT 1 FROM information_schema.columns c
                WHERE c.table_name = t.tablename 
                AND c.column_name = 'organization_id'
            ) 
            AND t.rowsecurity
            AND EXISTS(
                SELECT 1 FROM pg_indexes i
                WHERE i.tablename = t.tablename 
                AND i.indexname LIKE '%organization_id%'
            )
        ) as is_compliant
    FROM pg_tables t
    WHERE t.schemaname = 'public'
    AND t.tablename IN (
        'contacts', 'clients', 'leads', 'booking_links', 
        'appointment_types', 'calendar_settings', 'google_calendar_tokens',
        'facebook_integrations', 'automations', 'workout_programs', 
        'exercises', 'calendar_events', 'tasks', 'notes', 
        'email_templates', 'messages', 'conversations'
    )
    ORDER BY t.tablename;
END;
$$ LANGUAGE plpgsql;

-- Run verification
SELECT * FROM verify_multi_tenant_setup();

-- =====================================================
-- STEP 6: Grant Permissions
-- =====================================================

-- Ensure authenticated users can access their data
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- =====================================================
-- CLEANUP
-- =====================================================

-- Drop helper functions (keep verify function for future use)
DROP FUNCTION IF EXISTS rename_column_if_exists(text, text, text);
DROP FUNCTION IF EXISTS create_rls_policies(text);

-- Notify that migration is complete
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Multi-tenant migration complete!';
    RAISE NOTICE 'All tables now use organization_id';
    RAISE NOTICE 'RLS policies have been applied';
    RAISE NOTICE 'Performance indexes have been created';
    RAISE NOTICE '========================================';
END $$;
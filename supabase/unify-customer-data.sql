-- Migration to unify CRM and booking system customer data
-- This migration consolidates customer data to use the leads table as the single source of truth

-- Step 1: Add 'client' to the leads status enum if not already present
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'client' 
        AND enumtypid = (
            SELECT oid FROM pg_type WHERE typname = 'lead_status'
        )
    ) THEN
        ALTER TYPE lead_status ADD VALUE 'client' AFTER 'converted';
    END IF;
END $$;

-- Step 2: Migrate all clients data back to leads table
-- First, update existing leads that have corresponding clients
UPDATE leads l
SET 
    status = 'client',
    first_name = COALESCE(l.first_name, c.first_name),
    last_name = COALESCE(l.last_name, c.last_name),
    email = COALESCE(l.email, c.email),
    phone = COALESCE(l.phone, c.phone),
    date_of_birth = COALESCE(l.date_of_birth, c.date_of_birth),
    gender = COALESCE(l.gender, c.gender),
    tags = COALESCE(l.tags, c.tags),
    notes = COALESCE(l.notes, c.notes),
    source = COALESCE(l.source, c.source),
    metadata = COALESCE(l.metadata, c.metadata),
    updated_at = NOW()
FROM clients c
WHERE c.lead_id = l.id;

-- Step 3: Insert clients that don't have corresponding leads
INSERT INTO leads (
    id,
    organization_id,
    name,
    first_name,
    last_name,
    email,
    phone,
    status,
    date_of_birth,
    gender,
    tags,
    notes,
    source,
    metadata,
    created_at,
    updated_at
)
SELECT 
    c.id,
    c.organization_id,
    c.name,
    c.first_name,
    c.last_name,
    c.email,
    c.phone,
    'client'::lead_status,
    c.date_of_birth,
    c.gender,
    c.tags,
    c.notes,
    c.source,
    c.metadata,
    c.created_at,
    c.updated_at
FROM clients c
WHERE c.lead_id IS NULL
ON CONFLICT (id) DO NOTHING;

-- Step 4: Update customer_memberships to point to the correct lead IDs
-- First, update memberships that point to client IDs
UPDATE customer_memberships cm
SET customer_id = l.id
FROM clients c
JOIN leads l ON c.lead_id = l.id
WHERE cm.customer_id = c.id;

-- Step 5: Update bookings table to use consistent customer references
-- Add registration_type column if it doesn't exist
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS registration_type VARCHAR(50) DEFAULT 'membership';

-- Update bookings that use client_id to use the corresponding lead_id
UPDATE bookings b
SET customer_id = COALESCE(c.lead_id, c.id)
FROM clients c
WHERE b.customer_id = c.id OR b.client_id = c.id;

-- Step 6: Create a view for backward compatibility with clients table
CREATE OR REPLACE VIEW clients_view AS
SELECT 
    l.id,
    l.id as lead_id,  -- Self-reference since we're using leads as source
    'gym_member'::text as client_type,
    l.first_name,
    l.last_name,
    l.email,
    l.phone,
    l.date_of_birth,
    l.gender,
    CASE 
        WHEN l.status = 'client' THEN 'active'
        WHEN l.status = 'lost' THEN 'inactive'
        ELSE 'inactive'
    END as status,
    0 as lifetime_value,
    0 as monthly_revenue,
    50 as engagement_score,
    '{}'::jsonb as custom_fields,
    l.created_at,
    l.updated_at,
    l.organization_id,
    l.name,
    l.tags,
    l.notes,
    l.source,
    l.metadata,
    null::uuid as user_id,
    null::text as referral_code,
    null::uuid as referred_by,
    '{}'::jsonb as notification_preferences,
    '{}'::jsonb as emergency_contact,
    ARRAY[]::text[] as medical_conditions,
    ARRAY[]::text[] as fitness_goals
FROM leads l
WHERE l.status IN ('client', 'converted');

-- Step 7: Handle duplicate Sam Schofield records
-- Find and merge duplicate records based on email
WITH duplicate_groups AS (
    SELECT 
        email,
        array_agg(id ORDER BY created_at) as ids,
        count(*) as count
    FROM leads
    WHERE email IS NOT NULL
    GROUP BY email
    HAVING count(*) > 1
),
sam_duplicates AS (
    SELECT * FROM duplicate_groups 
    WHERE email = 'samschofield90@hotmail.co.uk'
)
-- Update all references to use the first (oldest) record
UPDATE customer_memberships cm
SET customer_id = (
    SELECT ids[1] FROM sam_duplicates sd 
    WHERE sd.email = (SELECT email FROM leads WHERE id = cm.customer_id)
)
WHERE customer_id IN (
    SELECT unnest(ids[2:]) FROM sam_duplicates
);

-- Do the same for bookings
UPDATE bookings b
SET customer_id = (
    SELECT ids[1] FROM sam_duplicates sd 
    WHERE sd.email = (SELECT email FROM leads WHERE id = b.customer_id)
)
WHERE customer_id IN (
    SELECT unnest(ids[2:]) FROM sam_duplicates
);

-- Mark duplicate records as archived
UPDATE leads
SET 
    status = 'lost',
    notes = COALESCE(notes || E'\n', '') || 'Archived as duplicate on ' || NOW()::date::text
WHERE id IN (
    SELECT unnest(ids[2:]) FROM duplicate_groups
);

-- Step 8: Add helpful indexes
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_organization_status ON leads(organization_id, status);

-- Step 9: Update RLS policies for the clients_view
GRANT SELECT ON clients_view TO authenticated;

-- Step 10: Add trigger to keep lead status updated when memberships change
CREATE OR REPLACE FUNCTION update_lead_status_on_membership()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'active' THEN
        UPDATE leads 
        SET status = 'client'
        WHERE id = NEW.customer_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_lead_status_on_membership_change
AFTER INSERT OR UPDATE ON customer_memberships
FOR EACH ROW
EXECUTE FUNCTION update_lead_status_on_membership();

-- Summary of changes:
-- 1. All customer data now lives in the leads table
-- 2. Status field differentiates between leads and active clients
-- 3. Customer_memberships properly references leads table
-- 4. Duplicate records are merged and archived
-- 5. Backward compatibility maintained with clients_view
-- 6. All booking references standardized to use leads table
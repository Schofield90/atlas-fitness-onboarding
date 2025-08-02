-- Fix clients table schema
-- This migration ensures the clients table has all necessary columns

-- First, check if the table exists and create it if it doesn't
CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES leads(id),
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
    tags JSONB DEFAULT '[]',
    notes TEXT,
    source TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    -- Client portal specific fields
    user_id UUID UNIQUE,
    client_type VARCHAR DEFAULT 'gym_member' CHECK (client_type IN ('gym_member', 'coaching_client', 'both')),
    referral_code VARCHAR UNIQUE,
    referred_by UUID REFERENCES clients(id),
    notification_preferences JSONB DEFAULT '{}',
    emergency_contact JSONB DEFAULT '{}',
    medical_conditions JSONB DEFAULT '[]',
    fitness_goals JSONB DEFAULT '[]',
    date_of_birth DATE
);

-- Add columns if they don't exist (for existing tables)
ALTER TABLE clients ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived'));
ALTER TABLE clients ADD COLUMN IF NOT EXISTS user_id UUID UNIQUE;

-- Update any NULL names with email as fallback
UPDATE clients SET name = COALESCE(name, split_part(email, '@', 1)) WHERE name IS NULL;

-- Make name NOT NULL after populating it
ALTER TABLE clients ALTER COLUMN name SET NOT NULL;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_clients_organization_id ON clients(organization_id);
CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email);
CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(name);
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON clients(user_id);

-- Add RLS policies
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own organization clients" ON clients;
DROP POLICY IF EXISTS "Users can manage own organization clients" ON clients;
DROP POLICY IF EXISTS "Service role has full access to clients" ON clients;

-- Users can view clients in their organization
CREATE POLICY "Users can view own organization clients" ON clients
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
        )
    );

-- Users can manage clients in their organization
CREATE POLICY "Users can manage own organization clients" ON clients
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
        )
    );

-- Service role bypass
CREATE POLICY "Service role has full access to clients" ON clients
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
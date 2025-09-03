-- Migration: 007_membership_plans
-- Created: 2025-09-03
-- Description: Add membership_plans table for managing gym membership types and pricing

-- Create membership_plans table
CREATE TABLE membership_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    price_pennies INTEGER NOT NULL DEFAULT 0, -- Store price in pennies to avoid decimal issues
    currency TEXT NOT NULL DEFAULT 'GBP',
    billing_cycle TEXT NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'quarterly', 'yearly', 'one-time')),
    trial_days INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    features JSONB DEFAULT '[]', -- Array of features included in the plan
    max_members INTEGER, -- NULL for unlimited
    access_hours JSONB DEFAULT '{"monday": "24/7", "tuesday": "24/7", "wednesday": "24/7", "thursday": "24/7", "friday": "24/7", "saturday": "24/7", "sunday": "24/7"}',
    includes_personal_training BOOLEAN DEFAULT false,
    includes_classes BOOLEAN DEFAULT true,
    includes_nutrition BOOLEAN DEFAULT false,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX idx_membership_plans_organization_id ON membership_plans(organization_id);
CREATE INDEX idx_membership_plans_is_active ON membership_plans(is_active);
CREATE INDEX idx_membership_plans_sort_order ON membership_plans(sort_order);

-- Create trigger for updated_at
CREATE TRIGGER update_membership_plans_updated_at BEFORE UPDATE ON membership_plans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE membership_plans ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can view membership plans in their organization
CREATE POLICY "Users can view membership plans in their organization" ON membership_plans
    FOR SELECT USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

-- Users can manage membership plans in their organization (admin/owner only)
CREATE POLICY "Admins can manage membership plans in their organization" ON membership_plans
    FOR ALL USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid() AND role IN ('owner', 'admin')));

-- Insert some default membership plans for new organizations
-- This would typically be done via application code, but included here for reference
INSERT INTO membership_plans (organization_id, name, description, price_pennies, billing_cycle, features, sort_order) 
SELECT 
    o.id,
    'Basic Membership',
    'Access to gym equipment and basic facilities during regular hours',
    2999, -- £29.99
    'monthly',
    '["Gym access", "Locker room", "Basic equipment"]'::jsonb,
    1
FROM organizations o
WHERE NOT EXISTS (SELECT 1 FROM membership_plans mp WHERE mp.organization_id = o.id);

INSERT INTO membership_plans (organization_id, name, description, price_pennies, billing_cycle, features, sort_order, includes_personal_training, includes_classes)
SELECT 
    o.id,
    'Premium Membership',
    'Full access to all facilities, classes, and personal training sessions',
    4999, -- £49.99
    'monthly',
    '["24/7 gym access", "All classes", "Personal training", "Nutrition guidance", "Premium locker room"]'::jsonb,
    2,
    true,
    true
FROM organizations o
WHERE NOT EXISTS (SELECT 1 FROM membership_plans mp WHERE mp.organization_id = o.id AND mp.name = 'Premium Membership');

-- Add a column to clients table to reference membership plan
ALTER TABLE clients ADD COLUMN membership_plan_id UUID REFERENCES membership_plans(id);

-- Create index for the new column
CREATE INDEX idx_clients_membership_plan_id ON clients(membership_plan_id);

-- Migrate existing membership_type data to membership_plan_id
-- This is a placeholder - actual migration would need to match existing data
UPDATE clients 
SET membership_plan_id = (
    SELECT mp.id 
    FROM membership_plans mp 
    WHERE mp.organization_id = clients.organization_id 
    AND LOWER(mp.name) LIKE '%' || LOWER(clients.membership_type) || '%'
    LIMIT 1
)
WHERE membership_plan_id IS NULL;

-- Add foreign key constraint
ALTER TABLE clients ADD CONSTRAINT fk_clients_membership_plan_id 
    FOREIGN KEY (membership_plan_id) REFERENCES membership_plans(id);
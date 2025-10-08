-- Migration: Add membership categories feature
-- Description: Allow gyms to organize membership plans into custom categories

-- 1. Create membership_categories table
CREATE TABLE IF NOT EXISTS membership_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#6B7280', -- Default gray color (hex)
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure unique category names per organization
  UNIQUE(organization_id, name)
);

-- 2. Add category_id to membership_plans table
ALTER TABLE membership_plans
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES membership_categories(id) ON DELETE SET NULL;

-- 3. Create index for faster category lookups
CREATE INDEX IF NOT EXISTS idx_membership_plans_category_id ON membership_plans(category_id);
CREATE INDEX IF NOT EXISTS idx_membership_categories_org_id ON membership_categories(organization_id);

-- 4. Add RLS policies for membership_categories
ALTER TABLE membership_categories ENABLE ROW LEVEL SECURITY;

-- Allow organizations to view their own categories
CREATE POLICY "Organizations can view own categories" ON membership_categories
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
    )
    OR
    organization_id IN (
      SELECT organization_id FROM organization_staff WHERE user_id = auth.uid()
    )
  );

-- Allow organizations to insert their own categories
CREATE POLICY "Organizations can create own categories" ON membership_categories
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
    )
    OR
    organization_id IN (
      SELECT organization_id FROM organization_staff WHERE user_id = auth.uid()
    )
  );

-- Allow organizations to update their own categories
CREATE POLICY "Organizations can update own categories" ON membership_categories
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
    )
    OR
    organization_id IN (
      SELECT organization_id FROM organization_staff WHERE user_id = auth.uid()
    )
  );

-- Allow organizations to delete their own categories
CREATE POLICY "Organizations can delete own categories" ON membership_categories
  FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
    )
    OR
    organization_id IN (
      SELECT organization_id FROM organization_staff WHERE user_id = auth.uid()
    )
  );

-- 5. Create default "Uncategorized" category for existing plans (optional)
-- This can be run manually or as part of data migration
-- INSERT INTO membership_categories (organization_id, name, description, color)
-- SELECT DISTINCT organization_id, 'Uncategorized', 'Plans without a category', '#6B7280'
-- FROM membership_plans
-- WHERE organization_id IS NOT NULL
-- ON CONFLICT (organization_id, name) DO NOTHING;

COMMENT ON TABLE membership_categories IS 'Custom categories for organizing membership plans';
COMMENT ON COLUMN membership_categories.color IS 'Hex color code for UI display (e.g., #FF0000)';
COMMENT ON COLUMN membership_categories.display_order IS 'Order in which categories should be displayed (lower = first)';
COMMENT ON COLUMN membership_plans.category_id IS 'Optional category to group this plan under';

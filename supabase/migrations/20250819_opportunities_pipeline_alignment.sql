-- Migration: Align Opportunities with Pipelines Table
-- Created: 2025-08-19
-- Description: Ensures opportunities work with the pipelines table and adds missing columns

-- Add pipeline_id column to opportunities table if it doesn't exist
-- This allows opportunities to reference both the pipeline and the current stage
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'opportunities' 
    AND column_name = 'pipeline_id'
  ) THEN
    ALTER TABLE opportunities ADD COLUMN pipeline_id UUID REFERENCES pipelines(id);
  END IF;
END $$;

-- Add stage column to opportunities for simple string-based stage tracking
-- This is for backward compatibility with the frontend code
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'opportunities' 
    AND column_name = 'stage'
  ) THEN
    ALTER TABLE opportunities ADD COLUMN stage TEXT;
  END IF;
END $$;

-- Add value column for simplified value tracking
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'opportunities' 
    AND column_name = 'value'
  ) THEN
    ALTER TABLE opportunities ADD COLUMN value DECIMAL(12,2) DEFAULT 0.00;
  END IF;
END $$;

-- Add probability column for simplified probability tracking
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'opportunities' 
    AND column_name = 'probability'
  ) THEN
    ALTER TABLE opportunities ADD COLUMN probability INTEGER DEFAULT 50;
  END IF;
END $$;

-- Add source column if it doesn't exist
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'opportunities' 
    AND column_name = 'source'
  ) THEN
    ALTER TABLE opportunities ADD COLUMN source TEXT;
  END IF;
END $$;

-- Add assigned_to_id column for simplified assignment tracking
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'opportunities' 
    AND column_name = 'assigned_to_id'
  ) THEN
    ALTER TABLE opportunities ADD COLUMN assigned_to_id UUID REFERENCES staff(id);
  END IF;
END $$;

-- Create default pipelines for organizations that don't have any
INSERT INTO pipelines (organization_id, name, description, type, stages, is_default, is_active)
SELECT 
  o.id,
  'Sales Pipeline',
  'Default sales pipeline for tracking membership opportunities',
  'sales',
  '["discovery", "qualification", "proposal", "negotiation", "closed_won", "closed_lost"]'::jsonb,
  true,
  true
FROM organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM pipelines p WHERE p.organization_id = o.id
);

INSERT INTO pipelines (organization_id, name, description, type, stages, is_default, is_active)
SELECT 
  o.id,
  'Member Onboarding',
  'Pipeline for tracking new member onboarding process',
  'membership',
  '["contacted", "tour_scheduled", "tour_completed", "trial_started", "converted", "cancelled"]'::jsonb,
  false,
  true
FROM organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM pipelines p WHERE p.organization_id = o.id AND p.name = 'Member Onboarding'
);

INSERT INTO pipelines (organization_id, name, description, type, stages, is_default, is_active)
SELECT 
  o.id,
  'PT Sales',
  'Pipeline for personal training sales opportunities',
  'sales',
  '["initial_contact", "assessment", "package_presented", "follow_up", "signed", "declined"]'::jsonb,
  false,
  true
FROM organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM pipelines p WHERE p.organization_id = o.id AND p.name = 'PT Sales'
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_opportunities_pipeline_id ON opportunities(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_stage ON opportunities(stage);
CREATE INDEX IF NOT EXISTS idx_opportunities_assigned_to ON opportunities(assigned_to_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_organization_status ON opportunities(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_opportunities_value ON opportunities(value);
CREATE INDEX IF NOT EXISTS idx_opportunities_expected_close ON opportunities(expected_close_date);

-- Update RLS policies for opportunities
DROP POLICY IF EXISTS "Users can view opportunities in their organization" ON opportunities;
DROP POLICY IF EXISTS "Users can manage opportunities in their organization" ON opportunities;

CREATE POLICY "Users can view opportunities in their organization"
  ON opportunities FOR SELECT
  USING (
    organization_id IN (
      SELECT uo.organization_id 
      FROM user_organizations uo 
      WHERE uo.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage opportunities in their organization"
  ON opportunities FOR ALL
  USING (
    organization_id IN (
      SELECT uo.organization_id 
      FROM user_organizations uo 
      WHERE uo.user_id = auth.uid()
    )
  );

-- Function to sync value and probability fields
CREATE OR REPLACE FUNCTION sync_opportunity_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- Sync estimated_value with value
  IF NEW.value IS NOT NULL AND NEW.value != COALESCE(OLD.value, 0) THEN
    NEW.estimated_value = NEW.value;
  ELSIF NEW.estimated_value IS NOT NULL AND NEW.estimated_value != COALESCE(OLD.estimated_value, 0) THEN
    NEW.value = NEW.estimated_value;
  END IF;
  
  -- Sync probability_percentage with probability
  IF NEW.probability IS NOT NULL AND NEW.probability != COALESCE(OLD.probability, 50) THEN
    NEW.probability_percentage = NEW.probability;
  ELSIF NEW.probability_percentage IS NOT NULL AND NEW.probability_percentage != COALESCE(OLD.probability_percentage, 50) THEN
    NEW.probability = NEW.probability_percentage;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to sync fields
DROP TRIGGER IF EXISTS sync_opportunity_fields_trigger ON opportunities;
CREATE TRIGGER sync_opportunity_fields_trigger
  BEFORE INSERT OR UPDATE ON opportunities
  FOR EACH ROW
  EXECUTE FUNCTION sync_opportunity_fields();
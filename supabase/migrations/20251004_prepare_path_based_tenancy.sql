-- Migration: Prepare for Path-Based Multi-Tenancy
-- Date: 2025-10-04
-- Description: Add helper functions and ensure database is ready for path-based routing

-- ============================================================================
-- STEP 1: Ensure all organizations have valid slugs (Already done via UI)
-- ============================================================================

-- Generate slugs for any missing ones (defensive - should be none)
UPDATE organizations
SET slug = lower(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g'))
WHERE slug IS NULL OR slug = '';

-- ============================================================================
-- STEP 2: Add index for fast slug lookups (If not exists)
-- ============================================================================

-- Note: UNIQUE index already exists (organizations_slug_key)
-- Adding a regular index would create a duplicate, so we'll verify the constraint instead
DO $$
BEGIN
  -- Verify unique constraint exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'organizations_slug_key'
  ) THEN
    ALTER TABLE organizations ADD CONSTRAINT organizations_slug_key UNIQUE (slug);
  END IF;
END $$;

-- ============================================================================
-- STEP 3: Create helper function to verify org access by slug
-- ============================================================================

CREATE OR REPLACE FUNCTION verify_org_access_by_slug(
  p_slug TEXT,
  p_user_id UUID
) RETURNS TABLE(
  organization_id UUID,
  user_role TEXT,
  has_access BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    o.id as organization_id,
    COALESCE(
      uo.role::TEXT,     -- Check user_organizations first (cast to TEXT)
      os.role::TEXT,     -- Then organization_staff (cast to TEXT)
      CASE
        WHEN o.owner_id = p_user_id THEN 'owner'::TEXT
        ELSE 'none'::TEXT
      END
    ) as user_role,
    (
      uo.user_id IS NOT NULL OR
      os.user_id IS NOT NULL OR
      o.owner_id = p_user_id
    ) as has_access
  FROM organizations o
  LEFT JOIN user_organizations uo ON uo.organization_id = o.id AND uo.user_id = p_user_id
  LEFT JOIN organization_staff os ON os.organization_id = o.id AND os.user_id = p_user_id
  WHERE o.slug = p_slug;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION verify_org_access_by_slug(TEXT, UUID) TO authenticated;

-- Add helpful comment
COMMENT ON FUNCTION verify_org_access_by_slug IS
  'Verifies user access to an organization by slug. Returns org_id, role, and access status. Used for path-based multi-tenancy routing.';

-- ============================================================================
-- STEP 4: Create helper function to get organization by slug
-- ============================================================================

CREATE OR REPLACE FUNCTION get_organization_by_slug(p_slug TEXT)
RETURNS TABLE(
  id UUID,
  name TEXT,
  slug TEXT,
  owner_id UUID,
  created_at TIMESTAMP,
  settings JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    o.id,
    o.name::TEXT,
    o.slug,
    o.owner_id,
    o.created_at,
    o.settings
  FROM organizations o
  WHERE o.slug = p_slug;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_organization_by_slug(TEXT) TO authenticated;

-- Add helpful comment
COMMENT ON FUNCTION get_organization_by_slug IS
  'Retrieves organization details by slug. Used for path-based multi-tenancy routing.';

-- ============================================================================
-- STEP 5: Create audit log for slug changes (Optional but recommended)
-- ============================================================================

-- Create trigger to log slug changes
CREATE OR REPLACE FUNCTION log_slug_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS DISTINCT FROM OLD.slug THEN
    INSERT INTO audit_logs (
      organization_id,
      user_id,
      action,
      table_name,
      record_id,
      old_values,
      new_values,
      created_at
    ) VALUES (
      NEW.id,
      auth.uid(),
      'UPDATE',
      'organizations',
      NEW.id,
      jsonb_build_object('slug', OLD.slug),
      jsonb_build_object('slug', NEW.slug),
      NOW()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Only create trigger if audit_logs table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_logs') THEN
    DROP TRIGGER IF EXISTS organization_slug_audit ON organizations;
    CREATE TRIGGER organization_slug_audit
      AFTER UPDATE ON organizations
      FOR EACH ROW
      EXECUTE FUNCTION log_slug_changes();
  END IF;
END $$;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify all organizations have slugs
DO $$
DECLARE
  missing_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO missing_count
  FROM organizations
  WHERE slug IS NULL OR slug = '';

  IF missing_count > 0 THEN
    RAISE WARNING 'Found % organizations without slugs', missing_count;
  ELSE
    RAISE NOTICE 'All organizations have valid slugs ✓';
  END IF;
END $$;

-- Verify unique constraint exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'organizations_slug_key'
  ) THEN
    RAISE NOTICE 'Unique constraint on slug exists ✓';
  ELSE
    RAISE WARNING 'Unique constraint on slug is missing!';
  END IF;
END $$;

-- Verify functions exist
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'verify_org_access_by_slug'
  ) THEN
    RAISE NOTICE 'Function verify_org_access_by_slug exists ✓';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'get_organization_by_slug'
  ) THEN
    RAISE NOTICE 'Function get_organization_by_slug exists ✓';
  END IF;
END $$;

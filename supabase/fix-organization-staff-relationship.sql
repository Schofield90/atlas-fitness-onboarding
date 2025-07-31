-- Migration: Fix organization_staff and user relationships
BEGIN;

-- 1. First, let's check and update the user_id column type
-- Note: We need to handle existing data carefully
-- Since user_id is currently TEXT and might have "pending" values

-- Create a backup of organization_staff data
CREATE TABLE IF NOT EXISTS organization_staff_backup AS 
SELECT * FROM organization_staff;

-- 2. Update any "pending" entries to match actual user IDs
UPDATE organization_staff os
SET user_id = o.owner_id::TEXT
FROM organizations o
WHERE os.organization_id = o.id
AND (os.user_id = 'pending' OR os.user_id NOT SIMILAR TO '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}')
AND os.email = (SELECT email FROM auth.users WHERE id = o.owner_id);

-- 3. Delete any orphaned entries that can't be matched
DELETE FROM organization_staff
WHERE user_id NOT SIMILAR TO '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';

-- 4. Now we can safely alter the column type
ALTER TABLE organization_staff 
ALTER COLUMN user_id TYPE UUID USING user_id::UUID;

-- 5. Add foreign key to auth.users
ALTER TABLE organization_staff
ADD CONSTRAINT fk_organization_staff_user 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 6. Add is_active column if it doesn't exist
ALTER TABLE organization_staff 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 7. Create a function to automatically create organization_staff entry
CREATE OR REPLACE FUNCTION public.handle_new_user_organization()
RETURNS TRIGGER AS $$
DECLARE
  org_id UUID;
BEGIN
  -- Check if user is creating an organization (owner)
  IF NEW.owner_id IS NOT NULL THEN
    -- Insert organization_staff entry for owner
    INSERT INTO public.organization_staff (
      organization_id,
      user_id,
      email,
      phone_number,
      role,
      is_active
    )
    SELECT 
      NEW.id,
      NEW.owner_id,
      COALESCE(
        (SELECT email FROM auth.users WHERE id = NEW.owner_id),
        'owner@' || NEW.slug || '.com'
      ),
      '',
      'owner',
      true
    WHERE NOT EXISTS (
      SELECT 1 FROM public.organization_staff 
      WHERE organization_id = NEW.id 
      AND user_id = NEW.owner_id
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Create trigger for new organizations
DROP TRIGGER IF EXISTS on_organization_created ON organizations;
CREATE TRIGGER on_organization_created
  AFTER INSERT ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user_organization();

-- 9. Function to ensure user has organization access
CREATE OR REPLACE FUNCTION public.get_user_organization_id(user_uuid UUID)
RETURNS UUID AS $$
DECLARE
  org_id UUID;
BEGIN
  -- First try to get from organization_staff
  SELECT organization_id INTO org_id
  FROM organization_staff
  WHERE user_id = user_uuid
  AND is_active = true
  LIMIT 1;
  
  -- If not found, check if user owns an organization
  IF org_id IS NULL THEN
    SELECT id INTO org_id
    FROM organizations
    WHERE owner_id = user_uuid
    LIMIT 1;
    
    -- If they own an org but no staff entry, create it
    IF org_id IS NOT NULL THEN
      INSERT INTO organization_staff (
        organization_id,
        user_id,
        email,
        phone_number,
        role,
        is_active
      )
      SELECT 
        org_id,
        user_uuid,
        COALESCE(
          (SELECT email FROM auth.users WHERE id = user_uuid),
          'owner@' || (SELECT slug FROM organizations WHERE id = org_id) || '.com'
        ),
        '',
        'owner',
        true
      WHERE NOT EXISTS (
        SELECT 1 FROM organization_staff 
        WHERE organization_id = org_id 
        AND user_id = user_uuid
      );
    END IF;
  END IF;
  
  RETURN org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Fix existing data - ensure all organization owners have staff entries
INSERT INTO organization_staff (
  organization_id,
  user_id,
  email,
  phone_number,
  role,
  is_active
)
SELECT 
  o.id,
  o.owner_id,
  COALESCE(
    (SELECT email FROM auth.users WHERE id = o.owner_id),
    'owner@' || o.slug || '.com'
  ),
  '',
  'owner',
  true
FROM organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM organization_staff 
  WHERE organization_id = o.id 
  AND user_id = o.owner_id
);

-- 11. Create a view for easy access
CREATE OR REPLACE VIEW user_organizations_view AS
SELECT 
  u.id as user_id,
  u.email as user_email,
  o.id as organization_id,
  o.name as organization_name,
  o.slug as organization_slug,
  os.role as user_role,
  os.is_active,
  os.permissions,
  os.system_mode,
  os.visible_systems
FROM auth.users u
JOIN organization_staff os ON os.user_id = u.id
JOIN organizations o ON o.id = os.organization_id
WHERE os.is_active = true;

-- 12. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.organization_staff TO authenticated;
GRANT ALL ON public.organizations TO authenticated;
GRANT SELECT ON public.user_organizations_view TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_organization_id TO authenticated;

-- 13. Update RLS policies to use the new structure
-- Drop old policies if they exist
DROP POLICY IF EXISTS "Users can view discount codes from their organization" ON discount_codes;
DROP POLICY IF EXISTS "Users can create discount codes for their organization" ON discount_codes;
DROP POLICY IF EXISTS "Users can update discount codes from their organization" ON discount_codes;
DROP POLICY IF EXISTS "Users can delete discount codes from their organization" ON discount_codes;

-- Create new policies using the fixed user_id type
CREATE POLICY "Users can view discount codes from their organization" ON discount_codes
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM organization_staff WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create discount codes for their organization" ON discount_codes
    FOR INSERT WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM organization_staff WHERE user_id = auth.uid()
        ) AND created_by = auth.uid()
    );

CREATE POLICY "Users can update discount codes from their organization" ON discount_codes
    FOR UPDATE USING (
        organization_id IN (
            SELECT organization_id FROM organization_staff WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete discount codes from their organization" ON discount_codes
    FOR DELETE USING (
        organization_id IN (
            SELECT organization_id FROM organization_staff WHERE user_id = auth.uid()
        )
    );

COMMIT;
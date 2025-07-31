-- Add permissions column to organization_staff table
ALTER TABLE organization_staff 
ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{
  "dashboard": true,
  "activity_feed": true,
  "point_of_sale": true,
  "calendar": true,
  "customers": true,
  "conversations": true,
  "todos": true,
  "reports": true,
  "classes": true,
  "courses": true,
  "memberships": true,
  "billing": true,
  "discount_codes": true,
  "forms": true,
  "settings": false,
  "staff": false,
  "my_account": true,
  "leads": true,
  "opportunities": true,
  "workflows": true,
  "marketing": true,
  "sites": true,
  "surveys": true,
  "analytics": true,
  "reporting": true,
  "products": true,
  "messages": true,
  "instructors": true,
  "members": true
}'::jsonb;

-- Add system_mode preference to organization_staff
ALTER TABLE organization_staff
ADD COLUMN IF NOT EXISTS system_mode VARCHAR(10) DEFAULT 'crm' CHECK (system_mode IN ('crm', 'booking'));

-- Add visible_systems column to control which systems staff can see
ALTER TABLE organization_staff
ADD COLUMN IF NOT EXISTS visible_systems JSONB DEFAULT '{"crm": true, "booking": true}'::jsonb;

-- Create function to update staff permissions
CREATE OR REPLACE FUNCTION update_staff_permissions(
  p_staff_id UUID,
  p_permissions JSONB
)
RETURNS VOID AS $$
BEGIN
  UPDATE organization_staff
  SET permissions = p_permissions,
      updated_at = NOW()
  WHERE id = p_staff_id;
END;
$$ LANGUAGE plpgsql;

-- Create function to update staff system preferences
CREATE OR REPLACE FUNCTION update_staff_system_preferences(
  p_staff_id UUID,
  p_system_mode VARCHAR(10),
  p_visible_systems JSONB
)
RETURNS VOID AS $$
BEGIN
  UPDATE organization_staff
  SET system_mode = p_system_mode,
      visible_systems = p_visible_systems,
      updated_at = NOW()
  WHERE id = p_staff_id;
END;
$$ LANGUAGE plpgsql;

-- Add RLS policy for staff to read their own permissions
CREATE POLICY "Staff can read own permissions" ON organization_staff
  FOR SELECT
  USING (user_id = auth.uid());

-- Add RLS policy for admins to update staff permissions
CREATE POLICY "Admins can update staff permissions" ON organization_staff
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM organization_staff
      WHERE organization_id = organization_staff.organization_id
      AND user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

-- Create index for faster permission lookups
CREATE INDEX IF NOT EXISTS idx_organization_staff_permissions ON organization_staff USING GIN (permissions);
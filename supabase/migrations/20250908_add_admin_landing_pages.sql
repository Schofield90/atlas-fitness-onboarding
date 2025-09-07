-- Add support for admin landing pages
ALTER TABLE landing_pages 
ADD COLUMN IF NOT EXISTS is_admin_page BOOLEAN DEFAULT FALSE;

-- Add index for admin pages
CREATE INDEX IF NOT EXISTS idx_landing_pages_is_admin 
ON landing_pages(is_admin_page) 
WHERE is_admin_page = true;

-- Update RLS policies to allow admin access to admin pages
DROP POLICY IF EXISTS "Admin users can view all admin landing pages" ON landing_pages;
DROP POLICY IF EXISTS "Admin users can create admin landing pages" ON landing_pages;
DROP POLICY IF EXISTS "Admin users can update admin landing pages" ON landing_pages;
DROP POLICY IF EXISTS "Admin users can delete admin landing pages" ON landing_pages;

-- Create admin-specific policies
CREATE POLICY "Admin users can view all admin landing pages" ON landing_pages
  FOR SELECT USING (
    is_admin_page = true 
    AND auth.uid() IN (
      SELECT id FROM auth.users 
      WHERE email IN ('sam@gymleadhub.co.uk', 'sam@atlas-gyms.co.uk')
    )
  );

CREATE POLICY "Admin users can create admin landing pages" ON landing_pages
  FOR INSERT WITH CHECK (
    is_admin_page = true 
    AND auth.uid() IN (
      SELECT id FROM auth.users 
      WHERE email IN ('sam@gymleadhub.co.uk', 'sam@atlas-gyms.co.uk')
    )
  );

CREATE POLICY "Admin users can update admin landing pages" ON landing_pages
  FOR UPDATE USING (
    is_admin_page = true 
    AND auth.uid() IN (
      SELECT id FROM auth.users 
      WHERE email IN ('sam@gymleadhub.co.uk', 'sam@atlas-gyms.co.uk')
    )
  );

CREATE POLICY "Admin users can delete admin landing pages" ON landing_pages
  FOR DELETE USING (
    is_admin_page = true 
    AND auth.uid() IN (
      SELECT id FROM auth.users 
      WHERE email IN ('sam@gymleadhub.co.uk', 'sam@atlas-gyms.co.uk')
    )
  );

-- Ensure public can view published admin pages
DROP POLICY IF EXISTS "Public can view published admin pages" ON landing_pages;
CREATE POLICY "Public can view published admin pages" ON landing_pages
  FOR SELECT USING (
    is_admin_page = true 
    AND status = 'published'
  );
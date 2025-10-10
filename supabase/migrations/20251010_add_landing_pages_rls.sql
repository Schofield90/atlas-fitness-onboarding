-- Add RLS policies for landing_pages table
-- Organization-scoped access control

-- Enable RLS (already enabled, but ensure it's on)
ALTER TABLE landing_pages ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view landing pages in their organization
CREATE POLICY "Users can view org landing pages"
ON landing_pages
FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id
    FROM user_organizations
    WHERE user_id = auth.uid()
    UNION
    SELECT organization_id
    FROM organization_staff
    WHERE user_id = auth.uid()
    UNION
    SELECT id
    FROM organizations
    WHERE owner_id = auth.uid()
  )
);

-- Policy: Users can insert landing pages in their organization
CREATE POLICY "Users can create org landing pages"
ON landing_pages
FOR INSERT
WITH CHECK (
  organization_id IN (
    SELECT organization_id
    FROM user_organizations
    WHERE user_id = auth.uid()
    UNION
    SELECT organization_id
    FROM organization_staff
    WHERE user_id = auth.uid()
    UNION
    SELECT id
    FROM organizations
    WHERE owner_id = auth.uid()
  )
);

-- Policy: Users can update landing pages in their organization
CREATE POLICY "Users can update org landing pages"
ON landing_pages
FOR UPDATE
USING (
  organization_id IN (
    SELECT organization_id
    FROM user_organizations
    WHERE user_id = auth.uid()
    UNION
    SELECT organization_id
    FROM organization_staff
    WHERE user_id = auth.uid()
    UNION
    SELECT id
    FROM organizations
    WHERE owner_id = auth.uid()
  )
);

-- Policy: Users can delete landing pages in their organization
CREATE POLICY "Users can delete org landing pages"
ON landing_pages
FOR DELETE
USING (
  organization_id IN (
    SELECT organization_id
    FROM user_organizations
    WHERE user_id = auth.uid()
    UNION
    SELECT organization_id
    FROM organization_staff
    WHERE user_id = auth.uid()
    UNION
    SELECT id
    FROM organizations
    WHERE owner_id = auth.uid()
  )
);

-- Public landing pages policy (for published pages accessible via public URL)
CREATE POLICY "Anyone can view published landing pages"
ON landing_pages
FOR SELECT
USING (
  status = 'published'
);

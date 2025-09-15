-- Create migration_links table to track what was imported where
CREATE TABLE IF NOT EXISTS migration_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  migration_record_id UUID REFERENCES migration_records(id) ON DELETE CASCADE,
  target_table VARCHAR(50) NOT NULL,
  target_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(migration_record_id, target_table)
);

-- Add index for lookups
CREATE INDEX IF NOT EXISTS idx_migration_links_record ON migration_links(migration_record_id);
CREATE INDEX IF NOT EXISTS idx_migration_links_target ON migration_links(target_table, target_id);

-- Enable RLS
ALTER TABLE migration_links ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY "Users can view their organization's migration links"
ON migration_links FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM migration_records mr
    JOIN migration_jobs mj ON mr.migration_job_id = mj.id
    WHERE mr.id = migration_links.migration_record_id
    AND mj.organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
      UNION
      SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
    )
  )
);

-- Grant permissions
GRANT ALL ON migration_links TO authenticated;
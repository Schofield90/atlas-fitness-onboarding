-- Create instructors table
CREATE TABLE IF NOT EXISTS instructors (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create index for faster queries
CREATE INDEX idx_instructors_organization_id ON instructors(organization_id);
CREATE INDEX idx_instructors_name ON instructors(name);

-- Enable RLS
ALTER TABLE instructors ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view instructors in their organization" ON instructors
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id 
            FROM user_organizations 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Organization admins can insert instructors" ON instructors
    FOR INSERT WITH CHECK (
        organization_id IN (
            SELECT organization_id 
            FROM user_organizations 
            WHERE user_id = auth.uid() 
            AND role IN ('owner', 'admin', 'staff')
        )
    );

CREATE POLICY "Organization admins can update instructors" ON instructors
    FOR UPDATE USING (
        organization_id IN (
            SELECT organization_id 
            FROM user_organizations 
            WHERE user_id = auth.uid() 
            AND role IN ('owner', 'admin', 'staff')
        )
    );

CREATE POLICY "Organization admins can delete instructors" ON instructors
    FOR DELETE USING (
        organization_id IN (
            SELECT organization_id 
            FROM user_organizations 
            WHERE user_id = auth.uid() 
            AND role IN ('owner', 'admin')
        )
    );

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_instructors_updated_at BEFORE UPDATE ON instructors 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Migrate existing instructor names from class_sessions to instructors table
INSERT INTO instructors (organization_id, name)
SELECT DISTINCT cs.organization_id, cs.instructor_name
FROM class_sessions cs
WHERE cs.instructor_name IS NOT NULL 
AND cs.instructor_name != ''
AND NOT EXISTS (
    SELECT 1 FROM instructors i 
    WHERE i.organization_id = cs.organization_id 
    AND i.name = cs.instructor_name
);
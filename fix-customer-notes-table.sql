-- Fix customer_notes table issue
-- The customer_notes table is missing or has incorrect columns

-- First, check if the table exists and drop it if it does
DROP TABLE IF EXISTS customer_notes CASCADE;

-- Create customer_notes table with correct schema
CREATE TABLE customer_notes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE, -- Support both customer_id and client_id
    organization_id UUID NOT NULL,
    note TEXT NOT NULL,
    note_type VARCHAR(50) DEFAULT 'general',
    content TEXT, -- Alternative column name for note content
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_customer_notes_customer_id ON customer_notes(customer_id);
CREATE INDEX idx_customer_notes_client_id ON customer_notes(client_id);
CREATE INDEX idx_customer_notes_organization_id ON customer_notes(organization_id);
CREATE INDEX idx_customer_notes_created_at ON customer_notes(created_at DESC);

-- Enable RLS
ALTER TABLE customer_notes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view notes in their organization"
    ON customer_notes FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id 
            FROM organization_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create notes in their organization"
    ON customer_notes FOR INSERT
    WITH CHECK (
        organization_id IN (
            SELECT organization_id 
            FROM organization_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update notes in their organization"
    ON customer_notes FOR UPDATE
    USING (
        organization_id IN (
            SELECT organization_id 
            FROM organization_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete notes in their organization"
    ON customer_notes FOR DELETE
    USING (
        organization_id IN (
            SELECT organization_id 
            FROM organization_members 
            WHERE user_id = auth.uid()
        )
    );

-- Grant permissions
GRANT ALL ON customer_notes TO authenticated;
GRANT SELECT ON customer_notes TO anon;
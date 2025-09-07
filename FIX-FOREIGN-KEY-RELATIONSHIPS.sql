-- Fix the foreign key relationship issue
-- Run this AFTER the previous SQL to fix the relationship errors

-- Drop and recreate customer_class_packages with proper foreign key
DROP TABLE IF EXISTS customer_class_packages CASCADE;

CREATE TABLE customer_class_packages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL,
    package_id UUID REFERENCES class_packages(id) ON DELETE CASCADE,  -- This creates the proper foreign key
    status VARCHAR(50) DEFAULT 'active',
    classes_remaining INTEGER DEFAULT 0,
    classes_used INTEGER DEFAULT 0,
    purchase_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expiry_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT check_customer_or_client CHECK (
        (client_id IS NOT NULL AND customer_id IS NULL) OR 
        (client_id IS NULL AND customer_id IS NOT NULL)
    )
);

-- Create indexes
CREATE INDEX idx_customer_class_packages_client_id ON customer_class_packages(client_id);
CREATE INDEX idx_customer_class_packages_customer_id ON customer_class_packages(customer_id);
CREATE INDEX idx_customer_class_packages_organization_id ON customer_class_packages(organization_id);
CREATE INDEX idx_customer_class_packages_package_id ON customer_class_packages(package_id);

-- Enable RLS
ALTER TABLE customer_class_packages ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view packages in their organization" ON customer_class_packages
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create packages in their organization" ON customer_class_packages
    FOR INSERT WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update packages in their organization" ON customer_class_packages
    FOR UPDATE USING (
        organization_id IN (
            SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
        )
    );

-- Grant permissions
GRANT ALL ON customer_class_packages TO authenticated;

-- Verify the fix
SELECT 'Foreign key relationship fixed!' as status;
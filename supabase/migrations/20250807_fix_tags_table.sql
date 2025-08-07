-- ========================================
-- CREATE TAGS TABLE IF NOT EXISTS
-- ========================================

-- Create tags table for contact/lead tagging
CREATE TABLE IF NOT EXISTS public.tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    color VARCHAR(7) DEFAULT '#3B82F6',
    description TEXT,
    type VARCHAR(20) DEFAULT 'general' CHECK (type IN ('lead', 'customer', 'general')),
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT tags_unique_name_per_org UNIQUE (organization_id, name),
    
    -- Indexes
    INDEX idx_tags_org (organization_id),
    INDEX idx_tags_type (type),
    INDEX idx_tags_name (name)
);

-- Enable RLS
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DROP POLICY IF EXISTS "Users can view tags in their organization" ON public.tags;
CREATE POLICY "Users can view tags in their organization" ON public.tags
    FOR SELECT
    USING (organization_id IN (
        SELECT organization_id 
        FROM user_organizations 
        WHERE user_id = auth.uid()
    ));

DROP POLICY IF EXISTS "Users can create tags in their organization" ON public.tags;
CREATE POLICY "Users can create tags in their organization" ON public.tags
    FOR INSERT
    WITH CHECK (organization_id IN (
        SELECT organization_id 
        FROM user_organizations 
        WHERE user_id = auth.uid()
    ));

DROP POLICY IF EXISTS "Users can update tags in their organization" ON public.tags;
CREATE POLICY "Users can update tags in their organization" ON public.tags
    FOR UPDATE
    USING (organization_id IN (
        SELECT organization_id 
        FROM user_organizations 
        WHERE user_id = auth.uid()
    ));

DROP POLICY IF EXISTS "Users can delete tags in their organization" ON public.tags;
CREATE POLICY "Users can delete tags in their organization" ON public.tags
    FOR DELETE
    USING (organization_id IN (
        SELECT organization_id 
        FROM user_organizations 
        WHERE user_id = auth.uid()
    ));

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS tags_updated_at ON public.tags;
CREATE TRIGGER tags_updated_at
    BEFORE UPDATE ON public.tags
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- CREATE LEAD_TAGS JUNCTION TABLE
-- ========================================

-- Create junction table for lead-tag relationships
CREATE TABLE IF NOT EXISTS public.lead_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT lead_tags_unique UNIQUE (lead_id, tag_id),
    
    -- Indexes
    INDEX idx_lead_tags_lead (lead_id),
    INDEX idx_lead_tags_tag (tag_id)
);

-- Enable RLS
ALTER TABLE public.lead_tags ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for lead_tags
DROP POLICY IF EXISTS "Users can view lead tags in their organization" ON public.lead_tags;
CREATE POLICY "Users can view lead tags in their organization" ON public.lead_tags
    FOR SELECT
    USING (tag_id IN (
        SELECT id FROM tags WHERE organization_id IN (
            SELECT organization_id 
            FROM user_organizations 
            WHERE user_id = auth.uid()
        )
    ));

DROP POLICY IF EXISTS "Users can create lead tags in their organization" ON public.lead_tags;
CREATE POLICY "Users can create lead tags in their organization" ON public.lead_tags
    FOR INSERT
    WITH CHECK (tag_id IN (
        SELECT id FROM tags WHERE organization_id IN (
            SELECT organization_id 
            FROM user_organizations 
            WHERE user_id = auth.uid()
        )
    ));

DROP POLICY IF EXISTS "Users can delete lead tags in their organization" ON public.lead_tags;
CREATE POLICY "Users can delete lead tags in their organization" ON public.lead_tags
    FOR DELETE
    USING (tag_id IN (
        SELECT id FROM tags WHERE organization_id IN (
            SELECT organization_id 
            FROM user_organizations 
            WHERE user_id = auth.uid()
        )
    ));

-- ========================================
-- UPDATE USAGE COUNT FUNCTION
-- ========================================

-- Function to update tag usage count
CREATE OR REPLACE FUNCTION update_tag_usage_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE tags 
        SET usage_count = usage_count + 1 
        WHERE id = NEW.tag_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE tags 
        SET usage_count = GREATEST(usage_count - 1, 0)
        WHERE id = OLD.tag_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for usage count
DROP TRIGGER IF EXISTS lead_tags_usage_count ON public.lead_tags;
CREATE TRIGGER lead_tags_usage_count
    AFTER INSERT OR DELETE ON public.lead_tags
    FOR EACH ROW
    EXECUTE FUNCTION update_tag_usage_count();

-- ========================================
-- INSERT SOME DEFAULT TAGS
-- ========================================

-- Insert default tags for existing organizations
INSERT INTO public.tags (organization_id, name, color, description, type)
SELECT 
    o.id,
    'Hot Lead',
    '#EF4444',
    'High-priority lead requiring immediate follow-up',
    'lead'
FROM organizations o
WHERE NOT EXISTS (
    SELECT 1 FROM tags t 
    WHERE t.organization_id = o.id 
    AND t.name = 'Hot Lead'
)
ON CONFLICT (organization_id, name) DO NOTHING;

INSERT INTO public.tags (organization_id, name, color, description, type)
SELECT 
    o.id,
    'Member',
    '#10B981',
    'Current paying member',
    'customer'
FROM organizations o
WHERE NOT EXISTS (
    SELECT 1 FROM tags t 
    WHERE t.organization_id = o.id 
    AND t.name = 'Member'
)
ON CONFLICT (organization_id, name) DO NOTHING;

INSERT INTO public.tags (organization_id, name, color, description, type)
SELECT 
    o.id,
    'VIP',
    '#F59E0B',
    'VIP member with premium services',
    'customer'
FROM organizations o
WHERE NOT EXISTS (
    SELECT 1 FROM tags t 
    WHERE t.organization_id = o.id 
    AND t.name = 'VIP'
)
ON CONFLICT (organization_id, name) DO NOTHING;
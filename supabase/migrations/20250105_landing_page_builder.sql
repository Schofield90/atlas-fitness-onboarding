-- Landing Page Builder Schema
-- This creates a comprehensive system for building, managing, and publishing landing pages

-- Landing pages table
CREATE TABLE IF NOT EXISTS landing_pages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Basic info
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    title VARCHAR(255),
    description TEXT,
    
    -- Page content (JSON structure for drag-drop components)
    content JSONB DEFAULT '[]',
    styles JSONB DEFAULT '{}',
    settings JSONB DEFAULT '{}',
    
    -- SEO
    meta_title VARCHAR(255),
    meta_description TEXT,
    meta_keywords TEXT[],
    og_image VARCHAR(500),
    
    -- Tracking
    tracking_codes JSONB DEFAULT '{}', -- GA, FB Pixel, etc.
    
    -- Status
    status VARCHAR(50) DEFAULT 'draft', -- draft, published, archived
    is_template BOOLEAN DEFAULT FALSE,
    template_category VARCHAR(100), -- offer, trial, lead-magnet, webinar, etc.
    
    -- Publishing
    published_at TIMESTAMP WITH TIME ZONE,
    unpublished_at TIMESTAMP WITH TIME ZONE,
    
    -- Analytics
    views_count INTEGER DEFAULT 0,
    conversions_count INTEGER DEFAULT 0,
    conversion_rate DECIMAL(5,2) DEFAULT 0,
    
    -- A/B Testing
    is_variant BOOLEAN DEFAULT FALSE,
    parent_page_id UUID REFERENCES landing_pages(id) ON DELETE CASCADE,
    variant_name VARCHAR(100),
    traffic_percentage INTEGER DEFAULT 50,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- Landing page components library (reusable components)
CREATE TABLE IF NOT EXISTS landing_page_components (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL, -- header, hero, features, testimonials, cta, footer, etc.
    component_type VARCHAR(100) NOT NULL, -- specific type within category
    
    -- Component structure
    template JSONB NOT NULL, -- HTML/React structure
    default_props JSONB DEFAULT '{}',
    styles JSONB DEFAULT '{}',
    
    -- Component settings
    is_global BOOLEAN DEFAULT FALSE, -- Available to all organizations
    is_premium BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    thumbnail_url VARCHAR(500),
    description TEXT,
    tags TEXT[],
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Landing page forms (for lead capture)
CREATE TABLE IF NOT EXISTS landing_page_forms (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    landing_page_id UUID REFERENCES landing_pages(id) ON DELETE CASCADE,
    
    name VARCHAR(255) NOT NULL,
    form_id VARCHAR(100) NOT NULL, -- Unique identifier for the form on the page
    
    -- Form configuration
    fields JSONB NOT NULL, -- Array of field definitions
    submit_action VARCHAR(100) NOT NULL, -- email, webhook, crm, etc.
    submit_config JSONB DEFAULT '{}', -- Configuration for the action
    
    -- Post-submission
    success_message TEXT,
    redirect_url VARCHAR(500),
    
    -- Tracking
    submissions_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Landing page form submissions
CREATE TABLE IF NOT EXISTS landing_page_submissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    landing_page_id UUID REFERENCES landing_pages(id) ON DELETE CASCADE,
    form_id UUID REFERENCES landing_page_forms(id) ON DELETE CASCADE,
    
    -- Submission data
    form_data JSONB NOT NULL,
    
    -- Visitor info
    ip_address INET,
    user_agent TEXT,
    referrer VARCHAR(500),
    utm_source VARCHAR(100),
    utm_medium VARCHAR(100),
    utm_campaign VARCHAR(100),
    utm_term VARCHAR(100),
    utm_content VARCHAR(100),
    
    -- Lead tracking
    lead_id UUID REFERENCES leads(id),
    converted_to_lead BOOLEAN DEFAULT FALSE,
    
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Landing page templates (pre-built templates)
CREATE TABLE IF NOT EXISTS landing_page_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    industry VARCHAR(100),
    
    -- Template content
    content JSONB NOT NULL,
    styles JSONB DEFAULT '{}',
    settings JSONB DEFAULT '{}',
    
    -- Metadata
    thumbnail_url VARCHAR(500),
    preview_url VARCHAR(500),
    description TEXT,
    features TEXT[],
    
    -- Availability
    is_free BOOLEAN DEFAULT TRUE,
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Usage stats
    usage_count INTEGER DEFAULT 0,
    rating DECIMAL(3,2),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI template generation history
CREATE TABLE IF NOT EXISTS ai_template_generations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Input
    source_url VARCHAR(1000) NOT NULL,
    source_screenshot VARCHAR(500),
    prompt TEXT,
    
    -- Generated content
    generated_content JSONB,
    generated_styles JSONB,
    
    -- Result
    landing_page_id UUID REFERENCES landing_pages(id),
    status VARCHAR(50) NOT NULL, -- pending, processing, completed, failed
    error_message TEXT,
    
    -- AI metadata
    ai_model VARCHAR(100),
    tokens_used INTEGER,
    processing_time_ms INTEGER,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Landing page analytics events
CREATE TABLE IF NOT EXISTS landing_page_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    landing_page_id UUID REFERENCES landing_pages(id) ON DELETE CASCADE,
    
    event_type VARCHAR(50) NOT NULL, -- view, click, submit, conversion
    event_data JSONB DEFAULT '{}',
    
    -- Visitor info
    session_id VARCHAR(100),
    visitor_id VARCHAR(100),
    ip_address INET,
    user_agent TEXT,
    
    -- Context
    element_id VARCHAR(100),
    element_type VARCHAR(100),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_landing_pages_organization_id ON landing_pages(organization_id);
CREATE INDEX idx_landing_pages_slug ON landing_pages(slug);
CREATE INDEX idx_landing_pages_status ON landing_pages(status);
CREATE INDEX idx_landing_page_submissions_page_id ON landing_page_submissions(landing_page_id);
CREATE INDEX idx_landing_page_events_page_id ON landing_page_events(landing_page_id);
CREATE INDEX idx_landing_page_events_created_at ON landing_page_events(created_at);

-- Create unique constraint for slug per organization
CREATE UNIQUE INDEX idx_landing_pages_org_slug ON landing_pages(organization_id, slug);

-- RLS Policies
ALTER TABLE landing_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE landing_page_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE landing_page_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE landing_page_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE landing_page_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_template_generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE landing_page_events ENABLE ROW LEVEL SECURITY;

-- Landing pages policies
CREATE POLICY "Users can view their organization's landing pages" ON landing_pages
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM user_organizations 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create landing pages for their organization" ON landing_pages
    FOR INSERT WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM user_organizations 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their organization's landing pages" ON landing_pages
    FOR UPDATE USING (
        organization_id IN (
            SELECT organization_id FROM user_organizations 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete their organization's landing pages" ON landing_pages
    FOR DELETE USING (
        organization_id IN (
            SELECT organization_id FROM user_organizations 
            WHERE user_id = auth.uid()
        )
    );

-- Public access for published pages (for viewing)
CREATE POLICY "Anyone can view published landing pages" ON landing_pages
    FOR SELECT USING (status = 'published');

-- Similar policies for other tables...
CREATE POLICY "Users can manage their organization's components" ON landing_page_components
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM user_organizations 
            WHERE user_id = auth.uid()
        ) OR is_global = TRUE
    );

CREATE POLICY "Users can view templates" ON landing_page_templates
    FOR SELECT USING (is_active = TRUE);

-- Function to track page views
CREATE OR REPLACE FUNCTION track_landing_page_view(
    p_landing_page_id UUID,
    p_session_id VARCHAR,
    p_visitor_id VARCHAR,
    p_ip_address INET,
    p_user_agent TEXT
)
RETURNS VOID AS $$
BEGIN
    -- Insert view event
    INSERT INTO landing_page_events (
        landing_page_id,
        event_type,
        session_id,
        visitor_id,
        ip_address,
        user_agent
    ) VALUES (
        p_landing_page_id,
        'view',
        p_session_id,
        p_visitor_id,
        p_ip_address,
        p_user_agent
    );
    
    -- Update view count
    UPDATE landing_pages 
    SET views_count = views_count + 1 
    WHERE id = p_landing_page_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to track form submission
CREATE OR REPLACE FUNCTION track_form_submission(
    p_landing_page_id UUID,
    p_form_id UUID
)
RETURNS VOID AS $$
BEGIN
    -- Update submission count on form
    UPDATE landing_page_forms 
    SET submissions_count = submissions_count + 1 
    WHERE id = p_form_id;
    
    -- Update conversion count on page
    UPDATE landing_pages 
    SET conversions_count = conversions_count + 1 
    WHERE id = p_landing_page_id;
    
    -- Update conversion rate
    UPDATE landing_pages 
    SET conversion_rate = CASE 
        WHEN views_count > 0 THEN (conversions_count::DECIMAL / views_count * 100)
        ELSE 0 
    END
    WHERE id = p_landing_page_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
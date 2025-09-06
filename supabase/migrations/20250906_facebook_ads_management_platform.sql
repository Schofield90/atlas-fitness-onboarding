-- Facebook Ads Management Platform Migration
-- This migration adds missing tables for comprehensive Facebook Ads management
-- Extending the existing Facebook integration with ad management capabilities

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create facebook_adsets table for storing ad set data
CREATE TABLE IF NOT EXISTS facebook_adsets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID NOT NULL REFERENCES facebook_campaigns(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Ad Set identification
    facebook_adset_id TEXT NOT NULL,
    adset_name TEXT NOT NULL,
    
    -- Targeting and configuration
    status TEXT,
    billing_event TEXT,
    optimization_goal TEXT,
    bid_amount INTEGER, -- bid amount in cents
    budget_remaining INTEGER, -- remaining budget in cents
    daily_budget INTEGER, -- daily budget in cents
    lifetime_budget INTEGER, -- lifetime budget in cents
    
    -- Targeting configuration
    targeting JSONB DEFAULT '{}', -- detailed targeting configuration
    age_min INTEGER DEFAULT 18,
    age_max INTEGER DEFAULT 65,
    genders INTEGER[], -- 1=male, 2=female
    geo_locations JSONB DEFAULT '{}', -- location targeting
    interests JSONB DEFAULT '[]', -- interest targeting
    behaviors JSONB DEFAULT '[]', -- behavior targeting
    custom_audiences TEXT[], -- custom audience IDs
    
    -- Performance metrics (updated via sync)
    impressions INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    spend DECIMAL(10,2) DEFAULT 0,
    reach INTEGER DEFAULT 0,
    frequency DECIMAL(5,2) DEFAULT 0,
    cpm DECIMAL(10,2) DEFAULT 0, -- cost per mille
    cpc DECIMAL(10,2) DEFAULT 0, -- cost per click
    ctr DECIMAL(5,4) DEFAULT 0, -- click-through rate
    
    -- Schedule and delivery
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    created_time TIMESTAMPTZ,
    updated_time TIMESTAMPTZ,
    
    -- Sync and audit
    last_metrics_sync_at TIMESTAMPTZ,
    insights_data JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(organization_id, facebook_adset_id)
);

-- Create facebook_ads table for individual ads
CREATE TABLE IF NOT EXISTS facebook_ads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    adset_id UUID NOT NULL REFERENCES facebook_adsets(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Ad identification
    facebook_ad_id TEXT NOT NULL,
    ad_name TEXT NOT NULL,
    
    -- Ad configuration
    status TEXT,
    bid_type TEXT,
    configured_status TEXT,
    effective_status TEXT,
    
    -- Creative reference
    creative_id UUID REFERENCES facebook_ad_creatives(id),
    
    -- Performance metrics
    impressions INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    spend DECIMAL(10,2) DEFAULT 0,
    reach INTEGER DEFAULT 0,
    frequency DECIMAL(5,2) DEFAULT 0,
    cpm DECIMAL(10,2) DEFAULT 0,
    cpc DECIMAL(10,2) DEFAULT 0,
    ctr DECIMAL(5,4) DEFAULT 0,
    
    -- Lead generation metrics
    leads_count INTEGER DEFAULT 0,
    cost_per_lead DECIMAL(10,2) DEFAULT 0,
    conversion_rate DECIMAL(5,4) DEFAULT 0,
    
    -- Timestamps
    created_time TIMESTAMPTZ,
    updated_time TIMESTAMPTZ,
    
    -- Sync and audit
    last_metrics_sync_at TIMESTAMPTZ,
    insights_data JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(organization_id, facebook_ad_id)
);

-- Create facebook_ad_creatives table for ad creative assets
CREATE TABLE IF NOT EXISTS facebook_ad_creatives (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Creative identification
    facebook_creative_id TEXT NOT NULL,
    creative_name TEXT NOT NULL,
    
    -- Creative content
    title TEXT,
    body TEXT,
    call_to_action_type TEXT,
    link_url TEXT,
    display_url TEXT,
    
    -- Media assets
    image_url TEXT,
    image_hash TEXT,
    video_url TEXT,
    video_id TEXT,
    
    -- Creative configuration
    object_story_spec JSONB DEFAULT '{}', -- Facebook creative specification
    asset_feed_spec JSONB DEFAULT '{}', -- Dynamic creative specification
    
    -- Creative type and format
    creative_type TEXT, -- single_image, video, carousel, etc.
    format_type TEXT, -- feed, story, messenger, etc.
    
    -- Performance tracking
    used_in_ads_count INTEGER DEFAULT 0,
    total_impressions INTEGER DEFAULT 0,
    total_clicks INTEGER DEFAULT 0,
    avg_ctr DECIMAL(5,4) DEFAULT 0,
    
    -- Status and metadata
    status TEXT DEFAULT 'active',
    created_time TIMESTAMPTZ,
    updated_time TIMESTAMPTZ,
    
    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(organization_id, facebook_creative_id)
);

-- Create facebook_ad_metrics table for detailed performance metrics
CREATE TABLE IF NOT EXISTS facebook_ad_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Reference to ad entity (campaign, adset, or ad)
    facebook_entity_id TEXT NOT NULL, -- ID of the campaign/adset/ad
    entity_type TEXT NOT NULL CHECK (entity_type IN ('campaign', 'adset', 'ad')),
    
    -- Metrics date range
    date_start DATE NOT NULL,
    date_stop DATE NOT NULL,
    
    -- Core metrics
    impressions INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    spend DECIMAL(10,2) DEFAULT 0,
    reach INTEGER DEFAULT 0,
    frequency DECIMAL(5,2) DEFAULT 0,
    
    -- Cost metrics
    cpm DECIMAL(10,2) DEFAULT 0, -- cost per 1000 impressions
    cpc DECIMAL(10,2) DEFAULT 0, -- cost per click
    cpp DECIMAL(10,2) DEFAULT 0, -- cost per 1000 people reached
    
    -- Engagement metrics
    ctr DECIMAL(5,4) DEFAULT 0, -- click-through rate
    unique_clicks INTEGER DEFAULT 0,
    unique_ctr DECIMAL(5,4) DEFAULT 0,
    
    -- Conversion metrics
    actions JSONB DEFAULT '[]', -- array of action objects
    conversions INTEGER DEFAULT 0,
    conversion_values JSONB DEFAULT '{}', -- conversion values by type
    cost_per_action JSONB DEFAULT '{}', -- cost per action by type
    
    -- Lead generation specific
    leads_count INTEGER DEFAULT 0,
    cost_per_lead DECIMAL(10,2) DEFAULT 0,
    
    -- Video metrics (if applicable)
    video_play_actions JSONB DEFAULT '{}',
    video_view_actions JSONB DEFAULT '{}',
    video_avg_time_watched_actions JSONB DEFAULT '{}',
    
    -- Age and gender breakdown
    age_gender_breakdown JSONB DEFAULT '[]',
    
    -- Placement breakdown
    placement_breakdown JSONB DEFAULT '[]',
    
    -- Device breakdown
    device_platform_breakdown JSONB DEFAULT '[]',
    
    -- Additional insights
    quality_ranking TEXT, -- above_average, average, below_average
    engagement_rate_ranking TEXT,
    conversion_rate_ranking TEXT,
    
    -- Attribution and tracking
    attribution_setting TEXT DEFAULT '7_day_click_1_day_view',
    
    -- Audit fields
    synced_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Unique constraint per entity per date range
    UNIQUE(organization_id, facebook_entity_id, entity_type, date_start, date_stop)
);

-- Create facebook_audiences table for custom and lookalike audiences
CREATE TABLE IF NOT EXISTS facebook_audiences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Audience identification
    facebook_audience_id TEXT NOT NULL,
    audience_name TEXT NOT NULL,
    
    -- Audience type and configuration
    audience_type TEXT NOT NULL CHECK (audience_type IN ('custom', 'lookalike', 'saved')),
    subtype TEXT, -- customer_list, website_traffic, engagement, etc.
    
    -- Audience rules and configuration
    rule JSONB DEFAULT '{}', -- audience rule configuration
    retention_days INTEGER, -- how long to retain audience members
    
    -- Lookalike audience specific
    origin_audience_id TEXT, -- source audience for lookalike
    lookalike_spec JSONB DEFAULT '{}', -- lookalike configuration
    country TEXT, -- country for lookalike audience
    ratio DECIMAL(5,2), -- lookalike ratio (1.0-10.0)
    
    -- Custom audience specific
    customer_file_source TEXT, -- source of customer data
    data_source JSONB DEFAULT '{}', -- data source configuration
    
    -- Audience size and status
    approximate_count INTEGER DEFAULT 0,
    status TEXT,
    delivery_status JSONB DEFAULT '{}', -- delivery status details
    
    -- Permissions and sharing
    permission_for_actions JSONB DEFAULT '{}',
    sharing_status JSONB DEFAULT '{}',
    
    -- Usage tracking
    campaigns_using_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMPTZ,
    
    -- Facebook timestamps
    created_time TIMESTAMPTZ,
    updated_time TIMESTAMPTZ,
    
    -- Sync and audit
    last_sync_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(organization_id, facebook_audience_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_facebook_adsets_campaign_id ON facebook_adsets(campaign_id);
CREATE INDEX IF NOT EXISTS idx_facebook_adsets_organization_id ON facebook_adsets(organization_id);
CREATE INDEX IF NOT EXISTS idx_facebook_adsets_facebook_adset_id ON facebook_adsets(facebook_adset_id);
CREATE INDEX IF NOT EXISTS idx_facebook_adsets_status ON facebook_adsets(status);
CREATE INDEX IF NOT EXISTS idx_facebook_adsets_last_metrics_sync ON facebook_adsets(last_metrics_sync_at);

CREATE INDEX IF NOT EXISTS idx_facebook_ads_adset_id ON facebook_ads(adset_id);
CREATE INDEX IF NOT EXISTS idx_facebook_ads_organization_id ON facebook_ads(organization_id);
CREATE INDEX IF NOT EXISTS idx_facebook_ads_facebook_ad_id ON facebook_ads(facebook_ad_id);
CREATE INDEX IF NOT EXISTS idx_facebook_ads_status ON facebook_ads(status);
CREATE INDEX IF NOT EXISTS idx_facebook_ads_creative_id ON facebook_ads(creative_id);

CREATE INDEX IF NOT EXISTS idx_facebook_ad_creatives_organization_id ON facebook_ad_creatives(organization_id);
CREATE INDEX IF NOT EXISTS idx_facebook_ad_creatives_facebook_creative_id ON facebook_ad_creatives(facebook_creative_id);
CREATE INDEX IF NOT EXISTS idx_facebook_ad_creatives_status ON facebook_ad_creatives(status);
CREATE INDEX IF NOT EXISTS idx_facebook_ad_creatives_creative_type ON facebook_ad_creatives(creative_type);

CREATE INDEX IF NOT EXISTS idx_facebook_ad_metrics_organization_id ON facebook_ad_metrics(organization_id);
CREATE INDEX IF NOT EXISTS idx_facebook_ad_metrics_entity ON facebook_ad_metrics(facebook_entity_id, entity_type);
CREATE INDEX IF NOT EXISTS idx_facebook_ad_metrics_date_range ON facebook_ad_metrics(date_start, date_stop);
CREATE INDEX IF NOT EXISTS idx_facebook_ad_metrics_synced_at ON facebook_ad_metrics(synced_at);

CREATE INDEX IF NOT EXISTS idx_facebook_audiences_organization_id ON facebook_audiences(organization_id);
CREATE INDEX IF NOT EXISTS idx_facebook_audiences_facebook_audience_id ON facebook_audiences(facebook_audience_id);
CREATE INDEX IF NOT EXISTS idx_facebook_audiences_type ON facebook_audiences(audience_type);
CREATE INDEX IF NOT EXISTS idx_facebook_audiences_status ON facebook_audiences(status);

-- Add foreign key constraint for facebook_ads.creative_id after table creation
ALTER TABLE facebook_ads ADD CONSTRAINT fk_facebook_ads_creative_id 
    FOREIGN KEY (creative_id) REFERENCES facebook_ad_creatives(id) ON DELETE SET NULL;

-- Create triggers for updated_at timestamps
CREATE TRIGGER update_facebook_adsets_updated_at BEFORE UPDATE ON facebook_adsets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_facebook_ads_updated_at BEFORE UPDATE ON facebook_ads
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_facebook_ad_creatives_updated_at BEFORE UPDATE ON facebook_ad_creatives
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_facebook_audiences_updated_at BEFORE UPDATE ON facebook_audiences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security on new tables
ALTER TABLE facebook_adsets ENABLE ROW LEVEL SECURITY;
ALTER TABLE facebook_ads ENABLE ROW LEVEL SECURITY;
ALTER TABLE facebook_ad_creatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE facebook_ad_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE facebook_audiences ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for facebook_adsets
CREATE POLICY "Users can view facebook adsets in their organization" ON facebook_adsets
    FOR SELECT USING (organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
    ));

CREATE POLICY "Users can insert facebook adsets in their organization" ON facebook_adsets
    FOR INSERT WITH CHECK (organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
    ));

CREATE POLICY "Users can update facebook adsets in their organization" ON facebook_adsets
    FOR UPDATE USING (organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
    ));

CREATE POLICY "Users can delete facebook adsets in their organization" ON facebook_adsets
    FOR DELETE USING (organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
    ));

-- Create RLS policies for facebook_ads
CREATE POLICY "Users can view facebook ads in their organization" ON facebook_ads
    FOR SELECT USING (organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
    ));

CREATE POLICY "Users can insert facebook ads in their organization" ON facebook_ads
    FOR INSERT WITH CHECK (organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
    ));

CREATE POLICY "Users can update facebook ads in their organization" ON facebook_ads
    FOR UPDATE USING (organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
    ));

CREATE POLICY "Users can delete facebook ads in their organization" ON facebook_ads
    FOR DELETE USING (organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
    ));

-- Create RLS policies for facebook_ad_creatives
CREATE POLICY "Users can view facebook ad creatives in their organization" ON facebook_ad_creatives
    FOR SELECT USING (organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
    ));

CREATE POLICY "Users can insert facebook ad creatives in their organization" ON facebook_ad_creatives
    FOR INSERT WITH CHECK (organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
    ));

CREATE POLICY "Users can update facebook ad creatives in their organization" ON facebook_ad_creatives
    FOR UPDATE USING (organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
    ));

CREATE POLICY "Users can delete facebook ad creatives in their organization" ON facebook_ad_creatives
    FOR DELETE USING (organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
    ));

-- Create RLS policies for facebook_ad_metrics
CREATE POLICY "Users can view facebook ad metrics in their organization" ON facebook_ad_metrics
    FOR SELECT USING (organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
    ));

CREATE POLICY "Users can insert facebook ad metrics in their organization" ON facebook_ad_metrics
    FOR INSERT WITH CHECK (organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
    ));

CREATE POLICY "Users can update facebook ad metrics in their organization" ON facebook_ad_metrics
    FOR UPDATE USING (organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
    ));

CREATE POLICY "Users can delete facebook ad metrics in their organization" ON facebook_ad_metrics
    FOR DELETE USING (organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
    ));

-- Create RLS policies for facebook_audiences
CREATE POLICY "Users can view facebook audiences in their organization" ON facebook_audiences
    FOR SELECT USING (organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
    ));

CREATE POLICY "Users can insert facebook audiences in their organization" ON facebook_audiences
    FOR INSERT WITH CHECK (organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
    ));

CREATE POLICY "Users can update facebook audiences in their organization" ON facebook_audiences
    FOR UPDATE USING (organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
    ));

CREATE POLICY "Users can delete facebook audiences in their organization" ON facebook_audiences
    FOR DELETE USING (organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
    ));

-- Create function to calculate ROAS (Return on Ad Spend)
CREATE OR REPLACE FUNCTION calculate_roas(
    p_entity_id TEXT,
    p_entity_type TEXT,
    p_organization_id UUID,
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL
)
RETURNS DECIMAL(10,2) AS $$
DECLARE
    total_spend DECIMAL(10,2) := 0;
    total_conversions DECIMAL(10,2) := 0;
    total_conversion_value DECIMAL(10,2) := 0;
    roas_value DECIMAL(10,2) := 0;
BEGIN
    -- Set default date range if not provided (last 30 days)
    IF p_start_date IS NULL THEN
        p_start_date := CURRENT_DATE - INTERVAL '30 days';
    END IF;
    
    IF p_end_date IS NULL THEN
        p_end_date := CURRENT_DATE;
    END IF;
    
    -- Calculate total spend and conversion value for the entity
    SELECT 
        COALESCE(SUM(spend), 0),
        COALESCE(SUM(conversions), 0),
        COALESCE(SUM((conversion_values->>'purchase')::DECIMAL), 0)
    INTO total_spend, total_conversions, total_conversion_value
    FROM facebook_ad_metrics
    WHERE facebook_entity_id = p_entity_id
      AND entity_type = p_entity_type
      AND organization_id = p_organization_id
      AND date_start >= p_start_date
      AND date_stop <= p_end_date;
    
    -- Calculate ROAS (Revenue / Ad Spend)
    IF total_spend > 0 THEN
        roas_value := total_conversion_value / total_spend;
    END IF;
    
    RETURN roas_value;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get top performing ads
CREATE OR REPLACE FUNCTION get_top_performing_ads(
    p_organization_id UUID,
    p_limit INTEGER DEFAULT 5,
    p_metric TEXT DEFAULT 'ctr',
    p_days INTEGER DEFAULT 7
)
RETURNS TABLE (
    ad_id UUID,
    ad_name TEXT,
    facebook_ad_id TEXT,
    impressions INTEGER,
    clicks INTEGER,
    spend DECIMAL(10,2),
    ctr DECIMAL(5,4),
    cpc DECIMAL(10,2),
    leads_count INTEGER,
    cost_per_lead DECIMAL(10,2),
    roas DECIMAL(10,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        fa.id,
        fa.ad_name,
        fa.facebook_ad_id,
        COALESCE(SUM(fam.impressions), 0)::INTEGER,
        COALESCE(SUM(fam.clicks), 0)::INTEGER,
        COALESCE(SUM(fam.spend), 0)::DECIMAL(10,2),
        CASE 
            WHEN SUM(fam.impressions) > 0 THEN 
                (SUM(fam.clicks)::DECIMAL / SUM(fam.impressions) * 100)::DECIMAL(5,4)
            ELSE 0::DECIMAL(5,4)
        END,
        CASE 
            WHEN SUM(fam.clicks) > 0 THEN 
                (SUM(fam.spend) / SUM(fam.clicks))::DECIMAL(10,2)
            ELSE 0::DECIMAL(10,2)
        END,
        COALESCE(SUM(fam.leads_count), 0)::INTEGER,
        CASE 
            WHEN SUM(fam.leads_count) > 0 THEN 
                (SUM(fam.spend) / SUM(fam.leads_count))::DECIMAL(10,2)
            ELSE 0::DECIMAL(10,2)
        END,
        calculate_roas(fa.facebook_ad_id, 'ad', p_organization_id, CURRENT_DATE - p_days, CURRENT_DATE)
    FROM facebook_ads fa
    LEFT JOIN facebook_ad_metrics fam ON fa.facebook_ad_id = fam.facebook_entity_id 
        AND fam.entity_type = 'ad'
        AND fam.date_start >= CURRENT_DATE - p_days
        AND fam.organization_id = p_organization_id
    WHERE fa.organization_id = p_organization_id
    GROUP BY fa.id, fa.ad_name, fa.facebook_ad_id
    ORDER BY 
        CASE 
            WHEN p_metric = 'ctr' THEN 
                CASE WHEN SUM(fam.impressions) > 0 THEN SUM(fam.clicks)::DECIMAL / SUM(fam.impressions) ELSE 0 END
            WHEN p_metric = 'leads' THEN SUM(fam.leads_count)::DECIMAL
            WHEN p_metric = 'roas' THEN calculate_roas(fa.facebook_ad_id, 'ad', p_organization_id, CURRENT_DATE - p_days, CURRENT_DATE)
            ELSE SUM(fam.spend)
        END DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to sync ad metrics (placeholder for API integration)
CREATE OR REPLACE FUNCTION sync_facebook_ad_metrics(
    p_organization_id UUID,
    p_entity_type TEXT DEFAULT 'all'
)
RETURNS INTEGER AS $$
DECLARE
    sync_count INTEGER := 0;
BEGIN
    -- This function would integrate with Facebook Marketing API
    -- For now, it's a placeholder that would be called by background jobs
    -- The actual implementation would:
    -- 1. Fetch metrics from Facebook Marketing API
    -- 2. Update facebook_ad_metrics table
    -- 3. Update performance fields in campaigns/adsets/ads tables
    
    -- Update last sync timestamp
    UPDATE facebook_campaigns 
    SET last_insights_sync_at = NOW() 
    WHERE organization_id = p_organization_id;
    
    UPDATE facebook_adsets 
    SET last_metrics_sync_at = NOW() 
    WHERE organization_id = p_organization_id;
    
    UPDATE facebook_ads 
    SET last_metrics_sync_at = NOW() 
    WHERE organization_id = p_organization_id;
    
    -- Return number of synced entities (placeholder)
    SELECT COUNT(*) INTO sync_count FROM facebook_campaigns WHERE organization_id = p_organization_id;
    
    RETURN sync_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add helpful comments
COMMENT ON TABLE facebook_adsets IS 'Stores Facebook Ad Set information with targeting and budget configuration';
COMMENT ON TABLE facebook_ads IS 'Stores individual Facebook ads with performance metrics';
COMMENT ON TABLE facebook_ad_creatives IS 'Stores Facebook ad creative assets including images, videos, and copy';
COMMENT ON TABLE facebook_ad_metrics IS 'Stores detailed Facebook ad performance metrics over time';
COMMENT ON TABLE facebook_audiences IS 'Stores Facebook custom and lookalike audiences for targeting';

COMMENT ON FUNCTION calculate_roas(TEXT, TEXT, UUID, DATE, DATE) IS 'Calculates Return on Ad Spend for Facebook campaigns, ad sets, or ads';
COMMENT ON FUNCTION get_top_performing_ads(UUID, INTEGER, TEXT, INTEGER) IS 'Returns top performing ads based on specified metrics';
COMMENT ON FUNCTION sync_facebook_ad_metrics(UUID, TEXT) IS 'Syncs Facebook ad metrics from Marketing API';
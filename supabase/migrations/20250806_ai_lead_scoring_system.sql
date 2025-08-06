-- AI Lead Scoring System Migration
-- This migration adds comprehensive lead scoring tables and functions

-- Create lead_scoring_factors table to track scoring components
CREATE TABLE IF NOT EXISTS lead_scoring_factors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    
    -- Source quality score (0-20)
    source_quality_score INTEGER DEFAULT 0 CHECK (source_quality_score >= 0 AND source_quality_score <= 20),
    
    -- Engagement score (0-25)
    engagement_score INTEGER DEFAULT 0 CHECK (engagement_score >= 0 AND engagement_score <= 25),
    
    -- Behavioral score (0-20)
    behavioral_score INTEGER DEFAULT 0 CHECK (behavioral_score >= 0 AND behavioral_score <= 20),
    
    -- Communication patterns score (0-15)
    communication_score INTEGER DEFAULT 0 CHECK (communication_score >= 0 AND communication_score <= 15),
    
    -- Lead completeness score (0-10)
    completeness_score INTEGER DEFAULT 0 CHECK (completeness_score >= 0 AND completeness_score <= 10),
    
    -- Time decay factor (0-10)
    time_decay_score INTEGER DEFAULT 10 CHECK (time_decay_score >= 0 AND time_decay_score <= 10),
    
    -- AI analysis score from conversation analysis (0-20) 
    ai_analysis_score INTEGER DEFAULT 0 CHECK (ai_analysis_score >= 0 AND ai_analysis_score <= 20),
    
    -- Total calculated score
    total_score INTEGER DEFAULT 0 CHECK (total_score >= 0 AND total_score <= 100),
    
    -- Metadata for storing detailed analysis
    scoring_metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(organization_id, lead_id)
);

-- Create lead_activities table to track granular lead activities for scoring
CREATE TABLE IF NOT EXISTS lead_activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    
    activity_type TEXT NOT NULL CHECK (activity_type IN (
        'email_open', 'email_click', 'form_submission', 'website_visit', 
        'page_view', 'download', 'video_watch', 'call_answer', 'call_missed',
        'sms_reply', 'whatsapp_reply', 'booking_attempt', 'social_engagement'
    )),
    
    activity_value DECIMAL(10,2) DEFAULT 1.0, -- Weight/value of the activity
    activity_metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create lead_ai_insights table to store AI-generated insights
CREATE TABLE IF NOT EXISTS lead_ai_insights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    
    insight_type TEXT NOT NULL CHECK (insight_type IN (
        'buying_signals', 'sentiment_analysis', 'engagement_prediction', 
        'conversion_likelihood', 'best_contact_time', 'interests', 'objections'
    )),
    
    confidence_score DECIMAL(3,2) DEFAULT 0.0 CHECK (confidence_score >= 0.0 AND confidence_score <= 1.0),
    insight_data JSONB NOT NULL,
    ai_model_version TEXT DEFAULT 'gpt-4',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ -- For insights that become stale
);

-- Create lead_score_history table to track score changes over time
CREATE TABLE IF NOT EXISTS lead_score_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    
    previous_score INTEGER DEFAULT 0,
    new_score INTEGER DEFAULT 0,
    score_change INTEGER DEFAULT 0,
    change_reason TEXT,
    triggered_by TEXT, -- 'activity', 'ai_analysis', 'manual', 'time_decay'
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_lead_scoring_factors_organization_id ON lead_scoring_factors(organization_id);
CREATE INDEX IF NOT EXISTS idx_lead_scoring_factors_lead_id ON lead_scoring_factors(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_scoring_factors_total_score ON lead_scoring_factors(total_score DESC);

CREATE INDEX IF NOT EXISTS idx_lead_activities_organization_id ON lead_activities(organization_id);
CREATE INDEX IF NOT EXISTS idx_lead_activities_lead_id ON lead_activities(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_activities_type ON lead_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_lead_activities_created_at ON lead_activities(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_lead_ai_insights_organization_id ON lead_ai_insights(organization_id);
CREATE INDEX IF NOT EXISTS idx_lead_ai_insights_lead_id ON lead_ai_insights(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_ai_insights_type ON lead_ai_insights(insight_type);

CREATE INDEX IF NOT EXISTS idx_lead_score_history_organization_id ON lead_score_history(organization_id);
CREATE INDEX IF NOT EXISTS idx_lead_score_history_lead_id ON lead_score_history(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_score_history_created_at ON lead_score_history(created_at DESC);

-- Enable Row Level Security
ALTER TABLE lead_scoring_factors ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_ai_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_score_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view lead scoring factors in their organization" ON lead_scoring_factors
    FOR SELECT USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can manage lead scoring factors in their organization" ON lead_scoring_factors
    FOR ALL USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can view lead activities in their organization" ON lead_activities
    FOR SELECT USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can manage lead activities in their organization" ON lead_activities
    FOR ALL USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can view lead AI insights in their organization" ON lead_ai_insights
    FOR SELECT USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can manage lead AI insights in their organization" ON lead_ai_insights
    FOR ALL USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can view lead score history in their organization" ON lead_score_history
    FOR SELECT USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can create lead score history in their organization" ON lead_score_history
    FOR INSERT WITH CHECK (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

-- Create updated_at triggers
CREATE TRIGGER update_lead_scoring_factors_updated_at BEFORE UPDATE ON lead_scoring_factors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enhanced lead scoring function that uses multiple factors
CREATE OR REPLACE FUNCTION calculate_enhanced_lead_score(lead_id UUID)
RETURNS INTEGER AS $$
DECLARE
    score_record RECORD;
    source_score INTEGER := 0;
    engagement_score INTEGER := 0;
    behavioral_score INTEGER := 0;
    communication_score INTEGER := 0;
    completeness_score INTEGER := 0;
    time_decay_score INTEGER := 10;
    ai_score INTEGER := 0;
    total_score INTEGER := 0;
    
    lead_data RECORD;
    interaction_count INTEGER;
    activity_count INTEGER;
    days_since_creation INTEGER;
    avg_response_time DECIMAL;
BEGIN
    -- Get lead data
    SELECT * INTO lead_data FROM leads WHERE id = lead_id;
    
    IF NOT FOUND THEN
        RETURN 0;
    END IF;
    
    -- 1. Source Quality Score (0-20)
    CASE lead_data.source
        WHEN 'referral' THEN source_score := 20;
        WHEN 'website' THEN source_score := 15;
        WHEN 'facebook' THEN source_score := 12;
        WHEN 'instagram' THEN source_score := 12;
        WHEN 'google' THEN source_score := 10;
        WHEN 'cold_call' THEN source_score := 5;
        ELSE source_score := 8;
    END CASE;
    
    -- 2. Engagement Score based on interactions (0-25)
    SELECT COUNT(*) INTO interaction_count 
    FROM interactions 
    WHERE interactions.lead_id = lead_id;
    
    engagement_score := LEAST(interaction_count * 3, 25);
    
    -- 3. Behavioral Score based on activities (0-20)
    SELECT COUNT(*) INTO activity_count
    FROM lead_activities
    WHERE lead_activities.lead_id = lead_id;
    
    behavioral_score := LEAST(activity_count * 2, 20);
    
    -- 4. Communication Score based on response patterns (0-15)
    SELECT AVG(EXTRACT(EPOCH FROM (created_at - LAG(created_at) OVER (ORDER BY created_at))) / 3600) 
    INTO avg_response_time
    FROM interactions 
    WHERE interactions.lead_id = lead_id AND direction = 'inbound'
    AND created_at > NOW() - INTERVAL '30 days';
    
    IF avg_response_time IS NOT NULL THEN
        IF avg_response_time <= 1 THEN communication_score := 15;  -- Within 1 hour
        ELSIF avg_response_time <= 4 THEN communication_score := 12; -- Within 4 hours
        ELSIF avg_response_time <= 24 THEN communication_score := 8; -- Within 24 hours
        ELSE communication_score := 4;
        END IF;
    ELSE
        communication_score := 0;
    END IF;
    
    -- 5. Completeness Score (0-10)
    completeness_score := 0;
    IF lead_data.name IS NOT NULL AND length(lead_data.name) > 0 THEN completeness_score := completeness_score + 2; END IF;
    IF lead_data.email IS NOT NULL AND length(lead_data.email) > 0 THEN completeness_score := completeness_score + 2; END IF;
    IF lead_data.phone IS NOT NULL AND length(lead_data.phone) > 0 THEN completeness_score := completeness_score + 2; END IF;
    IF lead_data.metadata IS NOT NULL AND jsonb_array_length(jsonb_object_keys(lead_data.metadata)) > 2 THEN completeness_score := completeness_score + 4; END IF;
    
    -- 6. Time Decay Score (0-10) - leads get colder over time
    SELECT EXTRACT(DAY FROM NOW() - created_at) INTO days_since_creation
    FROM leads WHERE id = lead_id;
    
    IF days_since_creation <= 1 THEN time_decay_score := 10;
    ELSIF days_since_creation <= 3 THEN time_decay_score := 8;
    ELSIF days_since_creation <= 7 THEN time_decay_score := 6;
    ELSIF days_since_creation <= 14 THEN time_decay_score := 4;
    ELSIF days_since_creation <= 30 THEN time_decay_score := 2;
    ELSE time_decay_score := 1;
    END IF;
    
    -- 7. Get AI Analysis Score if available (0-20)
    SELECT ai_analysis_score INTO ai_score
    FROM lead_scoring_factors
    WHERE lead_scoring_factors.lead_id = lead_id
    ORDER BY updated_at DESC
    LIMIT 1;
    
    ai_score := COALESCE(ai_score, 0);
    
    -- Calculate total score
    total_score := source_score + engagement_score + behavioral_score + communication_score + completeness_score + time_decay_score + ai_score;
    total_score := GREATEST(0, LEAST(100, total_score));
    
    -- Insert or update lead_scoring_factors
    INSERT INTO lead_scoring_factors (
        organization_id, lead_id, source_quality_score, engagement_score, 
        behavioral_score, communication_score, completeness_score, 
        time_decay_score, ai_analysis_score, total_score
    ) 
    VALUES (
        lead_data.organization_id, lead_id, source_score, engagement_score,
        behavioral_score, communication_score, completeness_score,
        time_decay_score, ai_score, total_score
    )
    ON CONFLICT (organization_id, lead_id) 
    DO UPDATE SET
        source_quality_score = EXCLUDED.source_quality_score,
        engagement_score = EXCLUDED.engagement_score,
        behavioral_score = EXCLUDED.behavioral_score,
        communication_score = EXCLUDED.communication_score,
        completeness_score = EXCLUDED.completeness_score,
        time_decay_score = EXCLUDED.time_decay_score,
        total_score = EXCLUDED.total_score,
        updated_at = NOW();
    
    RETURN total_score;
END;
$$ LANGUAGE plpgsql;

-- Function to update lead score and create history entry
CREATE OR REPLACE FUNCTION update_lead_score_with_history(lead_id UUID, triggered_by TEXT DEFAULT 'manual', change_reason TEXT DEFAULT NULL)
RETURNS INTEGER AS $$
DECLARE
    old_score INTEGER;
    new_score INTEGER;
    lead_org_id UUID;
BEGIN
    -- Get current score and organization
    SELECT lead_score, organization_id INTO old_score, lead_org_id
    FROM leads WHERE id = lead_id;
    
    -- Calculate new score
    new_score := calculate_enhanced_lead_score(lead_id);
    
    -- Update lead score
    UPDATE leads 
    SET lead_score = new_score, updated_at = NOW()
    WHERE id = lead_id;
    
    -- Create history entry if score changed
    IF old_score != new_score THEN
        INSERT INTO lead_score_history (
            organization_id, lead_id, previous_score, new_score, 
            score_change, triggered_by, change_reason
        ) VALUES (
            lead_org_id, lead_id, old_score, new_score,
            new_score - old_score, triggered_by, change_reason
        );
    END IF;
    
    RETURN new_score;
END;
$$ LANGUAGE plpgsql;

-- Enhanced trigger function to update lead score when activities occur
CREATE OR REPLACE FUNCTION update_lead_score_on_activity()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Update score when new activity is added
        PERFORM update_lead_score_with_history(NEW.lead_id, 'activity', 'New activity: ' || NEW.activity_type);
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' AND TG_TABLE_NAME = 'interactions' AND NEW.lead_id IS NOT NULL THEN
        -- Update score when new interaction is added
        PERFORM update_lead_score_with_history(NEW.lead_id, 'activity', 'New interaction: ' || NEW.type);
        RETURN NEW;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER update_lead_score_on_lead_activity
    AFTER INSERT ON lead_activities
    FOR EACH ROW
    EXECUTE FUNCTION update_lead_score_on_activity();

-- Replace the existing interaction trigger
DROP TRIGGER IF EXISTS update_lead_score_on_interaction ON interactions;
CREATE TRIGGER update_lead_score_on_interaction
    AFTER INSERT ON interactions
    FOR EACH ROW
    EXECUTE FUNCTION update_lead_score_on_activity();

-- Function to classify lead temperature based on score
CREATE OR REPLACE FUNCTION get_lead_temperature(score INTEGER)
RETURNS TEXT AS $$
BEGIN
    IF score >= 80 THEN RETURN 'hot';
    ELSIF score >= 60 THEN RETURN 'warm';
    ELSIF score >= 40 THEN RETURN 'lukewarm';
    ELSE RETURN 'cold';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to get lead scoring breakdown for a lead
CREATE OR REPLACE FUNCTION get_lead_scoring_breakdown(lead_id UUID)
RETURNS TABLE (
    factor_name TEXT,
    score INTEGER,
    max_score INTEGER,
    percentage DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        unnest(ARRAY['Source Quality', 'Engagement', 'Behavior', 'Communication', 'Completeness', 'Recency', 'AI Analysis']) as factor_name,
        unnest(ARRAY[lsf.source_quality_score, lsf.engagement_score, lsf.behavioral_score, lsf.communication_score, lsf.completeness_score, lsf.time_decay_score, lsf.ai_analysis_score]) as score,
        unnest(ARRAY[20, 25, 20, 15, 10, 10, 20]) as max_score,
        ROUND(
            unnest(ARRAY[lsf.source_quality_score, lsf.engagement_score, lsf.behavioral_score, lsf.communication_score, lsf.completeness_score, lsf.time_decay_score, lsf.ai_analysis_score])::DECIMAL 
            / unnest(ARRAY[20, 25, 20, 15, 10, 10, 20])::DECIMAL * 100, 2
        ) as percentage
    FROM lead_scoring_factors lsf
    WHERE lsf.lead_id = get_lead_scoring_breakdown.lead_id;
END;
$$ LANGUAGE plpgsql;

-- Function to update all lead scores for an organization
CREATE OR REPLACE FUNCTION refresh_organization_lead_scores(org_id UUID)
RETURNS INTEGER AS $$
DECLARE
    lead_record RECORD;
    updated_count INTEGER := 0;
BEGIN
    FOR lead_record IN 
        SELECT id FROM leads WHERE organization_id = org_id
    LOOP
        PERFORM update_lead_score_with_history(lead_record.id, 'bulk_refresh', 'Organization score refresh');
        updated_count := updated_count + 1;
    END LOOP;
    
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- Create a view for lead scoring dashboard
CREATE OR REPLACE VIEW lead_scoring_dashboard AS
SELECT 
    l.id,
    l.organization_id,
    l.name,
    l.email,
    l.phone,
    l.source,
    l.status,
    l.lead_score,
    get_lead_temperature(l.lead_score) as temperature,
    lsf.source_quality_score,
    lsf.engagement_score,
    lsf.behavioral_score,
    lsf.communication_score,
    lsf.completeness_score,
    lsf.time_decay_score,
    lsf.ai_analysis_score,
    lsf.total_score,
    l.created_at,
    l.updated_at,
    lsf.updated_at as score_updated_at
FROM leads l
LEFT JOIN lead_scoring_factors lsf ON l.id = lsf.lead_id;
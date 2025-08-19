-- Migration: Enhanced Settings System for Atlas Fitness CRM
-- Created: 2025-08-17
-- Description: Adds comprehensive settings tables for gym-specific CRM features

-- ============================================
-- 1. PHONE SETTINGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS phone_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    primary_number TEXT,
    display_name TEXT DEFAULT 'Atlas Fitness',
    voicemail_enabled BOOLEAN DEFAULT true,
    voicemail_greeting TEXT,
    voicemail_transcription BOOLEAN DEFAULT true,
    business_hours_only BOOLEAN DEFAULT true,
    after_hours_message TEXT,
    call_recording BOOLEAN DEFAULT false,
    call_forwarding BOOLEAN DEFAULT false,
    forward_to_number TEXT,
    text_enabled BOOLEAN DEFAULT true,
    auto_reply_enabled BOOLEAN DEFAULT true,
    auto_reply_message TEXT,
    missed_call_text BOOLEAN DEFAULT true,
    missed_call_message TEXT,
    call_tracking BOOLEAN DEFAULT true,
    whisper_message TEXT,
    ring_duration INTEGER DEFAULT 20,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id)
);

-- ============================================
-- 2. LEAD SCORING SETTINGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS lead_scoring_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    scoring_enabled BOOLEAN DEFAULT true,
    auto_assign_enabled BOOLEAN DEFAULT true,
    auto_assign_threshold INTEGER DEFAULT 50,
    notification_threshold INTEGER DEFAULT 75,
    decay_enabled BOOLEAN DEFAULT true,
    decay_days INTEGER DEFAULT 30,
    decay_percentage INTEGER DEFAULT 10,
    rules JSONB DEFAULT '[]'::jsonb,
    thresholds JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id)
);

-- ============================================
-- 3. CALENDAR SETTINGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS calendar_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    slot_duration INTEGER DEFAULT 60,
    buffer_time INTEGER DEFAULT 15,
    advance_booking_days INTEGER DEFAULT 30,
    min_notice_hours INTEGER DEFAULT 24,
    max_bookings_per_day INTEGER,
    timezone TEXT DEFAULT 'Europe/London',
    working_hours JSONB DEFAULT '{
        "monday": {"enabled": true, "start": "09:00", "end": "18:00"},
        "tuesday": {"enabled": true, "start": "09:00", "end": "18:00"},
        "wednesday": {"enabled": true, "start": "09:00", "end": "18:00"},
        "thursday": {"enabled": true, "start": "09:00", "end": "18:00"},
        "friday": {"enabled": true, "start": "09:00", "end": "18:00"},
        "saturday": {"enabled": true, "start": "09:00", "end": "14:00"},
        "sunday": {"enabled": false, "start": "10:00", "end": "14:00"}
    }'::jsonb,
    google_calendar_connected BOOLEAN DEFAULT false,
    google_calendar_id TEXT,
    sync_enabled BOOLEAN DEFAULT false,
    booking_confirmation_required BOOLEAN DEFAULT false,
    allow_cancellations BOOLEAN DEFAULT true,
    cancellation_notice_hours INTEGER DEFAULT 24,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id)
);

-- ============================================
-- 4. PIPELINES TABLE (Enhanced)
-- ============================================
CREATE TABLE IF NOT EXISTS pipelines (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    type TEXT DEFAULT 'sales' CHECK (type IN ('sales', 'membership', 'custom')),
    stages JSONB DEFAULT '[]'::jsonb,
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for organization lookups
CREATE INDEX IF NOT EXISTS idx_pipelines_organization ON pipelines(organization_id);

-- ============================================
-- 5. CUSTOM FIELDS TABLE (Enhanced)
-- ============================================
CREATE TABLE IF NOT EXISTS custom_fields (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    field_name TEXT NOT NULL,
    field_label TEXT NOT NULL,
    field_type TEXT NOT NULL CHECK (field_type IN (
        'text', 'number', 'email', 'phone', 'date', 
        'select', 'multiselect', 'boolean', 'textarea'
    )),
    entity_type TEXT NOT NULL CHECK (entity_type IN ('lead', 'client', 'booking')),
    options TEXT[],
    validation_rules JSONB,
    is_required BOOLEAN DEFAULT false,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    placeholder TEXT,
    help_text TEXT,
    group_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, entity_type, field_name)
);

-- Create index for custom fields lookups
CREATE INDEX IF NOT EXISTS idx_custom_fields_org_entity ON custom_fields(organization_id, entity_type);

-- ============================================
-- 6. EMAIL TEMPLATES TABLE (Enhanced)
-- ============================================
CREATE TABLE IF NOT EXISTS email_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    subject TEXT,
    template_type TEXT CHECK (template_type IN (
        'appointment_confirmation', 'appointment_reminder', 
        'welcome', 'follow_up', 'cancellation', 'custom'
    )),
    html_content TEXT,
    text_content TEXT,
    sms_content TEXT,
    available_variables TEXT[],
    is_active BOOLEAN DEFAULT true,
    is_system BOOLEAN DEFAULT false,
    category TEXT DEFAULT 'email' CHECK (category IN ('email', 'sms', 'both')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for template lookups
CREATE INDEX IF NOT EXISTS idx_email_templates_org ON email_templates(organization_id);

-- ============================================
-- 7. STAFF INVITATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS staff_invitations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    phone TEXT,
    role TEXT DEFAULT 'coach' CHECK (role IN ('admin', 'coach')),
    invited_by UUID REFERENCES users(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
    invitation_token TEXT UNIQUE DEFAULT gen_random_uuid()::text,
    expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days',
    accepted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for invitation lookups
CREATE INDEX IF NOT EXISTS idx_staff_invitations_org ON staff_invitations(organization_id);
CREATE INDEX IF NOT EXISTS idx_staff_invitations_token ON staff_invitations(invitation_token);

-- ============================================
-- 8. ORGANIZATION MEMBERS TABLE (Enhanced)
-- ============================================
-- Add availability column if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'organization_members' 
                   AND column_name = 'availability') THEN
        ALTER TABLE organization_members 
        ADD COLUMN availability JSONB DEFAULT '{
            "monday": {"start": "09:00", "end": "17:00", "available": true},
            "tuesday": {"start": "09:00", "end": "17:00", "available": true},
            "wednesday": {"start": "09:00", "end": "17:00", "available": true},
            "thursday": {"start": "09:00", "end": "17:00", "available": true},
            "friday": {"start": "09:00", "end": "17:00", "available": true},
            "saturday": {"start": "09:00", "end": "13:00", "available": true},
            "sunday": {"start": "09:00", "end": "13:00", "available": false}
        }'::jsonb;
    END IF;
END $$;

-- ============================================
-- 9. LEAD SCORING HISTORY TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS lead_scoring_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    score INTEGER NOT NULL,
    previous_score INTEGER,
    rule_triggered TEXT,
    points_added INTEGER,
    threshold_reached TEXT,
    auto_assigned_to UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for scoring history
CREATE INDEX IF NOT EXISTS idx_lead_scoring_history_lead ON lead_scoring_history(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_scoring_history_org ON lead_scoring_history(organization_id);

-- ============================================
-- 10. BUSINESS SETTINGS TABLE (Enhanced)
-- ============================================
-- Add new columns if they don't exist
DO $$ 
BEGIN 
    -- Add logo_url column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'business_settings' 
                   AND column_name = 'logo_url') THEN
        ALTER TABLE business_settings ADD COLUMN logo_url TEXT;
    END IF;
    
    -- Add legal_name column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'business_settings' 
                   AND column_name = 'legal_name') THEN
        ALTER TABLE business_settings ADD COLUMN legal_name TEXT;
    END IF;
    
    -- Add vat_number column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'business_settings' 
                   AND column_name = 'vat_number') THEN
        ALTER TABLE business_settings ADD COLUMN vat_number TEXT;
    END IF;
    
    -- Add registration_number column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'business_settings' 
                   AND column_name = 'registration_number') THEN
        ALTER TABLE business_settings ADD COLUMN registration_number TEXT;
    END IF;
    
    -- Add timezone column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'business_settings' 
                   AND column_name = 'timezone') THEN
        ALTER TABLE business_settings ADD COLUMN timezone TEXT DEFAULT 'Europe/London';
    END IF;
    
    -- Add currency column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'business_settings' 
                   AND column_name = 'currency') THEN
        ALTER TABLE business_settings ADD COLUMN currency TEXT DEFAULT 'GBP';
    END IF;
    
    -- Add date_format column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'business_settings' 
                   AND column_name = 'date_format') THEN
        ALTER TABLE business_settings ADD COLUMN date_format TEXT DEFAULT 'DD/MM/YYYY';
    END IF;
END $$;

-- ============================================
-- 11. RLS POLICIES
-- ============================================

-- Phone Settings RLS
ALTER TABLE phone_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their organization's phone settings"
    ON phone_settings FOR SELECT
    USING (organization_id IN (
        SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can update their organization's phone settings"
    ON phone_settings FOR UPDATE
    USING (organization_id IN (
        SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can insert phone settings for their organization"
    ON phone_settings FOR INSERT
    WITH CHECK (organization_id IN (
        SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
    ));

-- Lead Scoring Settings RLS
ALTER TABLE lead_scoring_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their organization's lead scoring settings"
    ON lead_scoring_settings FOR SELECT
    USING (organization_id IN (
        SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can update their organization's lead scoring settings"
    ON lead_scoring_settings FOR UPDATE
    USING (organization_id IN (
        SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can insert lead scoring settings for their organization"
    ON lead_scoring_settings FOR INSERT
    WITH CHECK (organization_id IN (
        SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
    ));

-- Calendar Settings RLS
ALTER TABLE calendar_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their organization's calendar settings"
    ON calendar_settings FOR SELECT
    USING (organization_id IN (
        SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can update their organization's calendar settings"
    ON calendar_settings FOR UPDATE
    USING (organization_id IN (
        SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can insert calendar settings for their organization"
    ON calendar_settings FOR INSERT
    WITH CHECK (organization_id IN (
        SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
    ));

-- Pipelines RLS
ALTER TABLE pipelines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their organization's pipelines"
    ON pipelines FOR SELECT
    USING (organization_id IN (
        SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can manage their organization's pipelines"
    ON pipelines FOR ALL
    USING (organization_id IN (
        SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
    ));

-- Custom Fields RLS
ALTER TABLE custom_fields ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their organization's custom fields"
    ON custom_fields FOR SELECT
    USING (organization_id IN (
        SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can manage their organization's custom fields"
    ON custom_fields FOR ALL
    USING (organization_id IN (
        SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
    ));

-- Email Templates RLS
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their organization's email templates"
    ON email_templates FOR SELECT
    USING (organization_id IN (
        SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can manage their organization's email templates"
    ON email_templates FOR ALL
    USING (organization_id IN (
        SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
    ));

-- Staff Invitations RLS
ALTER TABLE staff_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their organization's staff invitations"
    ON staff_invitations FOR SELECT
    USING (organization_id IN (
        SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
    ));

CREATE POLICY "Admins can manage staff invitations"
    ON staff_invitations FOR ALL
    USING (
        organization_id IN (
            SELECT organization_id 
            FROM user_organizations 
            WHERE user_id = auth.uid() 
            AND role IN ('owner', 'admin')
        )
    );

-- Lead Scoring History RLS
ALTER TABLE lead_scoring_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their organization's lead scoring history"
    ON lead_scoring_history FOR SELECT
    USING (organization_id IN (
        SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
    ));

CREATE POLICY "System can insert lead scoring history"
    ON lead_scoring_history FOR INSERT
    WITH CHECK (organization_id IN (
        SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
    ));

-- ============================================
-- 12. FUNCTIONS FOR AUTOMATED SCORING
-- ============================================

-- Function to calculate lead score
CREATE OR REPLACE FUNCTION calculate_lead_score(p_lead_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_score INTEGER := 0;
    v_org_id UUID;
    v_settings RECORD;
    v_rule JSONB;
BEGIN
    -- Get organization ID from lead
    SELECT organization_id INTO v_org_id
    FROM leads WHERE id = p_lead_id;
    
    -- Get scoring settings
    SELECT * INTO v_settings
    FROM lead_scoring_settings
    WHERE organization_id = v_org_id
    AND scoring_enabled = true;
    
    IF v_settings IS NULL THEN
        RETURN 0;
    END IF;
    
    -- Calculate score based on rules
    FOR v_rule IN SELECT * FROM jsonb_array_elements(v_settings.rules)
    LOOP
        IF (v_rule->>'is_active')::boolean THEN
            -- Add points based on rule conditions
            -- This is simplified - in production you'd evaluate actual conditions
            v_score := v_score + (v_rule->>'points')::integer;
        END IF;
    END LOOP;
    
    RETURN v_score;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 13. TRIGGERS FOR UPDATED_AT
-- ============================================

-- Create updated_at trigger function if not exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to new tables
CREATE TRIGGER update_phone_settings_updated_at 
    BEFORE UPDATE ON phone_settings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lead_scoring_settings_updated_at 
    BEFORE UPDATE ON lead_scoring_settings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_calendar_settings_updated_at 
    BEFORE UPDATE ON calendar_settings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pipelines_updated_at 
    BEFORE UPDATE ON pipelines 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_custom_fields_updated_at 
    BEFORE UPDATE ON custom_fields 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_templates_updated_at 
    BEFORE UPDATE ON email_templates 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_staff_invitations_updated_at 
    BEFORE UPDATE ON staff_invitations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 14. STORAGE BUCKET FOR BUSINESS ASSETS
-- ============================================

-- Create storage bucket for business assets (logos, etc.)
INSERT INTO storage.buckets (id, name, public)
VALUES ('business-assets', 'business-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for business-assets bucket
CREATE POLICY "Users can upload to their organization's folder"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'business-assets' AND
        auth.uid() IN (
            SELECT user_id FROM user_organizations 
            WHERE organization_id::text = (string_to_array(name, '/'))[1]
        )
    );

CREATE POLICY "Users can view their organization's assets"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'business-assets' AND
        auth.uid() IN (
            SELECT user_id FROM user_organizations 
            WHERE organization_id::text = (string_to_array(name, '/'))[1]
        )
    );

CREATE POLICY "Users can update their organization's assets"
    ON storage.objects FOR UPDATE
    USING (
        bucket_id = 'business-assets' AND
        auth.uid() IN (
            SELECT user_id FROM user_organizations 
            WHERE organization_id::text = (string_to_array(name, '/'))[1]
        )
    );

CREATE POLICY "Users can delete their organization's assets"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'business-assets' AND
        auth.uid() IN (
            SELECT user_id FROM user_organizations 
            WHERE organization_id::text = (string_to_array(name, '/'))[1]
        )
    );

-- ============================================
-- 15. INDEXES FOR PERFORMANCE
-- ============================================

-- Additional indexes for performance
CREATE INDEX IF NOT EXISTS idx_phone_settings_org ON phone_settings(organization_id);
CREATE INDEX IF NOT EXISTS idx_lead_scoring_settings_org ON lead_scoring_settings(organization_id);
CREATE INDEX IF NOT EXISTS idx_calendar_settings_org ON calendar_settings(organization_id);
CREATE INDEX IF NOT EXISTS idx_staff_invitations_status ON staff_invitations(status);
CREATE INDEX IF NOT EXISTS idx_staff_invitations_expires ON staff_invitations(expires_at);
CREATE INDEX IF NOT EXISTS idx_lead_scoring_history_created ON lead_scoring_history(created_at DESC);

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
-- This migration adds comprehensive settings management for:
-- - Phone system configuration
-- - Lead scoring with gym-specific rules
-- - Calendar and booking settings
-- - Pipeline management
-- - Custom fields
-- - Email/SMS templates
-- - Staff management with invitations
-- All with proper RLS policies and performance indexes
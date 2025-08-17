-- Comprehensive feature implementation migrations
-- Block 2: Recurring Classes and Waitlists

-- Add recurrence rules to class_sessions
ALTER TABLE class_sessions ADD COLUMN IF NOT EXISTS recurrence_rule TEXT;
ALTER TABLE class_sessions ADD COLUMN IF NOT EXISTS recurrence_end_date TIMESTAMPTZ;
ALTER TABLE class_sessions ADD COLUMN IF NOT EXISTS parent_session_id UUID REFERENCES class_sessions(id);
ALTER TABLE class_sessions ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT false;
ALTER TABLE class_sessions ADD COLUMN IF NOT EXISTS occurrence_date DATE;

-- Create waitlist table
CREATE TABLE IF NOT EXISTS class_waitlists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    class_session_id UUID NOT NULL REFERENCES class_sessions(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    position INTEGER NOT NULL,
    added_at TIMESTAMPTZ DEFAULT NOW(),
    notified_at TIMESTAMPTZ,
    status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'promoted', 'expired', 'cancelled')),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(class_session_id, customer_id),
    UNIQUE(class_session_id, position)
);

-- Add instructor assignments
CREATE TABLE IF NOT EXISTS instructor_availability (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_available BOOLEAN DEFAULT true,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE class_sessions ADD COLUMN IF NOT EXISTS instructor_id UUID REFERENCES staff(id);
ALTER TABLE class_sessions ADD COLUMN IF NOT EXISTS room_id UUID;

-- Block 3: Enhanced Customer Management

-- Add customer profile enhancements
ALTER TABLE leads ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS emergency_contact_name TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS medical_conditions TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS allergies TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS profile_photo_url TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS preferred_contact_method TEXT CHECK (preferred_contact_method IN ('email', 'sms', 'whatsapp', 'phone', 'none'));
ALTER TABLE leads ADD COLUMN IF NOT EXISTS communication_preferences JSONB DEFAULT '{}';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS last_visit_date TIMESTAMPTZ;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS total_visits INTEGER DEFAULT 0;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS churn_risk_score DECIMAL(3,2) CHECK (churn_risk_score >= 0 AND churn_risk_score <= 1);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS churn_risk_factors JSONB DEFAULT '{}';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS lifetime_value DECIMAL(10,2) DEFAULT 0;

-- Membership plans enhancements
CREATE TABLE IF NOT EXISTS membership_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    price_pennies INTEGER NOT NULL DEFAULT 0,
    billing_period TEXT NOT NULL CHECK (billing_period IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'one_time')),
    contract_length_months INTEGER,
    class_limit INTEGER, -- NULL for unlimited
    features JSONB DEFAULT '{}',
    signup_fee_pennies INTEGER DEFAULT 0,
    cancellation_fee_pennies INTEGER DEFAULT 0,
    cancellation_notice_days INTEGER DEFAULT 30,
    is_active BOOLEAN DEFAULT true,
    eligible_class_types UUID[] DEFAULT '{}',
    add_ons JSONB DEFAULT '[]',
    trial_days INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, name)
);

-- Customer memberships enhancements
ALTER TABLE customer_memberships ADD COLUMN IF NOT EXISTS membership_plan_id UUID REFERENCES membership_plans(id);
ALTER TABLE customer_memberships ADD COLUMN IF NOT EXISTS contract_end_date DATE;
ALTER TABLE customer_memberships ADD COLUMN IF NOT EXISTS auto_renew BOOLEAN DEFAULT true;
ALTER TABLE customer_memberships ADD COLUMN IF NOT EXISTS cancellation_date TIMESTAMPTZ;
ALTER TABLE customer_memberships ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
ALTER TABLE customer_memberships ADD COLUMN IF NOT EXISTS usage_this_period INTEGER DEFAULT 0;
ALTER TABLE customer_memberships ADD COLUMN IF NOT EXISTS last_usage_reset TIMESTAMPTZ DEFAULT NOW();

-- Family memberships
CREATE TABLE IF NOT EXISTS family_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    primary_member_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    membership_id UUID REFERENCES customer_memberships(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS family_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_group_id UUID NOT NULL REFERENCES family_groups(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    relationship TEXT,
    can_book BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(family_group_id, member_id)
);

-- Customer activity feed
CREATE TABLE IF NOT EXISTS customer_activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    activity_type TEXT NOT NULL,
    activity_data JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE
);

-- Waivers and forms
CREATE TABLE IF NOT EXISTS waivers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    version INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    required_for TEXT[] DEFAULT '{}', -- ['membership', 'class', 'trial']
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customer_waivers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    waiver_id UUID NOT NULL REFERENCES waivers(id) ON DELETE CASCADE,
    signed_at TIMESTAMPTZ DEFAULT NOW(),
    signature_data TEXT,
    ip_address INET,
    UNIQUE(customer_id, waiver_id)
);

-- Block 4: Staff Management and Payroll

-- Enhance staff table
ALTER TABLE staff ADD COLUMN IF NOT EXISTS hourly_rate DECIMAL(10,2);
ALTER TABLE staff ADD COLUMN IF NOT EXISTS employment_type TEXT CHECK (employment_type IN ('full_time', 'part_time', 'contractor', 'volunteer'));
ALTER TABLE staff ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS hire_date DATE;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS termination_date DATE;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS emergency_contact JSONB DEFAULT '{}';
ALTER TABLE staff ADD COLUMN IF NOT EXISTS bank_details JSONB; -- Encrypted
ALTER TABLE staff ADD COLUMN IF NOT EXISTS tax_information JSONB; -- Encrypted
ALTER TABLE staff ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{}';

-- Time tracking
CREATE TABLE IF NOT EXISTS timesheets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    clock_in TIMESTAMPTZ NOT NULL,
    clock_out TIMESTAMPTZ,
    break_minutes INTEGER DEFAULT 0,
    total_hours DECIMAL(5,2),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'paid')),
    approved_by UUID REFERENCES staff(id),
    approved_at TIMESTAMPTZ,
    notes TEXT,
    location TEXT,
    clock_method TEXT CHECK (clock_method IN ('web', 'mobile', 'biometric', 'manual')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Time off requests
CREATE TABLE IF NOT EXISTS time_off_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    type TEXT CHECK (type IN ('vacation', 'sick', 'personal', 'unpaid', 'other')),
    reason TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
    approved_by UUID REFERENCES staff(id),
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payroll batches
CREATE TABLE IF NOT EXISTS payroll_batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'processing', 'approved', 'paid', 'cancelled')),
    total_gross DECIMAL(10,2) DEFAULT 0,
    total_deductions DECIMAL(10,2) DEFAULT 0,
    total_net DECIMAL(10,2) DEFAULT 0,
    processed_by UUID REFERENCES staff(id),
    processed_at TIMESTAMPTZ,
    xero_sync_status TEXT,
    xero_sync_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payroll_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    batch_id UUID NOT NULL REFERENCES payroll_batches(id) ON DELETE CASCADE,
    staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    hours_worked DECIMAL(5,2) NOT NULL,
    hourly_rate DECIMAL(10,2) NOT NULL,
    gross_pay DECIMAL(10,2) NOT NULL,
    deductions JSONB DEFAULT '{}',
    net_pay DECIMAL(10,2) NOT NULL,
    bonuses DECIMAL(10,2) DEFAULT 0,
    overtime_hours DECIMAL(5,2) DEFAULT 0,
    overtime_pay DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Block 5: AI and Automation

-- AI insights
CREATE TABLE IF NOT EXISTS ai_insights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    insight_type TEXT NOT NULL,
    entity_type TEXT,
    entity_id UUID,
    insights JSONB NOT NULL,
    confidence_score DECIMAL(3,2),
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enhanced workflows
ALTER TABLE automations ADD COLUMN IF NOT EXISTS trigger_conditions JSONB DEFAULT '{}';
ALTER TABLE automations ADD COLUMN IF NOT EXISTS actions JSONB DEFAULT '[]';
ALTER TABLE automations ADD COLUMN IF NOT EXISTS template_id UUID;
ALTER TABLE automations ADD COLUMN IF NOT EXISTS last_triggered_at TIMESTAMPTZ;
ALTER TABLE automations ADD COLUMN IF NOT EXISTS total_executions INTEGER DEFAULT 0;
ALTER TABLE automations ADD COLUMN IF NOT EXISTS success_count INTEGER DEFAULT 0;
ALTER TABLE automations ADD COLUMN IF NOT EXISTS failure_count INTEGER DEFAULT 0;

-- Workflow templates
CREATE TABLE IF NOT EXISTS workflow_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    trigger_type TEXT NOT NULL,
    trigger_conditions JSONB DEFAULT '{}',
    actions JSONB DEFAULT '[]',
    is_public BOOLEAN DEFAULT false,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chatbot knowledge base
CREATE TABLE IF NOT EXISTS chatbot_knowledge (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    keywords TEXT[] DEFAULT '{}',
    embedding VECTOR(1536), -- For semantic search
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chatbot conversations
CREATE TABLE IF NOT EXISTS chatbot_conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES leads(id),
    channel TEXT CHECK (channel IN ('web', 'sms', 'whatsapp', 'facebook')),
    messages JSONB DEFAULT '[]',
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'escalated', 'abandoned')),
    satisfaction_score INTEGER CHECK (satisfaction_score >= 1 AND satisfaction_score <= 5),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Block 6: Communications and Templates

-- Message templates
CREATE TABLE IF NOT EXISTS message_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT CHECK (type IN ('email', 'sms', 'whatsapp', 'push')),
    event TEXT, -- booking_confirmation, payment_reminder, etc.
    subject TEXT,
    content TEXT NOT NULL,
    variables TEXT[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    send_time_optimization BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, name, type)
);

-- Communication logs
CREATE TABLE IF NOT EXISTS communication_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES leads(id),
    template_id UUID REFERENCES message_templates(id),
    channel TEXT NOT NULL,
    status TEXT CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'bounced', 'opened', 'clicked')),
    message_data JSONB DEFAULT '{}',
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    opened_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Integration configurations
CREATE TABLE IF NOT EXISTS integration_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    integration_type TEXT NOT NULL,
    config_data JSONB DEFAULT '{}', -- Encrypted
    is_active BOOLEAN DEFAULT true,
    last_sync_at TIMESTAMPTZ,
    sync_status TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, integration_type)
);

-- Block 7: SOPs and Training

-- SOPs
CREATE TABLE IF NOT EXISTS sops (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT,
    version INTEGER DEFAULT 1,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'approved', 'retired')),
    author_id UUID REFERENCES staff(id),
    approved_by UUID REFERENCES staff(id),
    approved_at TIMESTAMPTZ,
    attachments JSONB DEFAULT '[]',
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- SOP versions
CREATE TABLE IF NOT EXISTS sop_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sop_id UUID NOT NULL REFERENCES sops(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    content TEXT NOT NULL,
    change_log TEXT,
    author_id UUID REFERENCES staff(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(sop_id, version)
);

-- Training assignments
CREATE TABLE IF NOT EXISTS training_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    sop_id UUID REFERENCES sops(id),
    training_module_id UUID,
    assigned_by UUID REFERENCES staff(id),
    due_date DATE,
    completed_at TIMESTAMPTZ,
    score DECIMAL(5,2),
    attempts INTEGER DEFAULT 0,
    status TEXT DEFAULT 'assigned' CHECK (status IN ('assigned', 'in_progress', 'completed', 'overdue')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Training modules
CREATE TABLE IF NOT EXISTS training_modules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    sop_ids UUID[] DEFAULT '{}',
    quiz_data JSONB DEFAULT '{}',
    passing_score DECIMAL(5,2) DEFAULT 80,
    is_mandatory BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_class_waitlists_session ON class_waitlists(class_session_id);
CREATE INDEX IF NOT EXISTS idx_class_waitlists_customer ON class_waitlists(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_activities_customer ON customer_activities(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_activities_created ON customer_activities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_timesheets_staff ON timesheets(staff_id);
CREATE INDEX IF NOT EXISTS idx_timesheets_period ON timesheets(clock_in, clock_out);
CREATE INDEX IF NOT EXISTS idx_ai_insights_entity ON ai_insights(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_communication_logs_customer ON communication_logs(customer_id);
CREATE INDEX IF NOT EXISTS idx_sops_category ON sops(organization_id, category);
CREATE INDEX IF NOT EXISTS idx_training_assignments_staff ON training_assignments(staff_id, status);

-- Enable RLS on new tables
ALTER TABLE class_waitlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE instructor_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE membership_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE waivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_waivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE timesheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_off_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE chatbot_knowledge ENABLE ROW LEVEL SECURITY;
ALTER TABLE chatbot_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE communication_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sops ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_modules ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for organization isolation
DO $$ 
DECLARE
    t text;
    tables text[] := ARRAY[
        'class_waitlists', 'instructor_availability', 'membership_plans',
        'family_groups', 'customer_activities', 'waivers', 'timesheets',
        'time_off_requests', 'payroll_batches', 'ai_insights',
        'chatbot_knowledge', 'chatbot_conversations', 'message_templates',
        'communication_logs', 'integration_configs', 'sops', 'training_modules'
    ];
BEGIN
    FOREACH t IN ARRAY tables
    LOOP
        EXECUTE format('
            CREATE POLICY IF NOT EXISTS %I_org_isolation ON %I
            FOR ALL USING (organization_id IN (
                SELECT organization_id FROM organization_members 
                WHERE user_id = auth.uid() AND is_active = true
            ));
        ', t, t);
    END LOOP;
END $$;
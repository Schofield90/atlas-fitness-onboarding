# Database Schema Context

## Overview

PostgreSQL database hosted on Supabase with Row Level Security (RLS) for multi-tenant isolation. All tables follow consistent patterns for audit trails and organization isolation.

## Core Tables

### organizations

```sql
CREATE TABLE organizations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  settings JSONB DEFAULT '{}',
  subscription_status TEXT DEFAULT 'trial',
  subscription_tier TEXT DEFAULT 'starter',
  trial_ends_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_organizations_slug ON organizations(slug);
CREATE INDEX idx_organizations_subscription_status ON organizations(subscription_status);
```

### auth_users

```sql
CREATE TABLE auth_users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  auth_id UUID UNIQUE NOT NULL, -- Supabase auth.users.id
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_auth_users_auth_id ON auth_users(auth_id);
CREATE INDEX idx_auth_users_organization_id ON auth_users(organization_id);
CREATE INDEX idx_auth_users_email ON auth_users(email);
```

### client_invitations

```sql
CREATE TABLE client_invitations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Client info
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,

  -- Invitation details
  invitation_token TEXT UNIQUE NOT NULL,
  is_claimed BOOLEAN DEFAULT false,
  claimed_at TIMESTAMP WITH TIME ZONE,

  -- Metadata
  invited_by UUID REFERENCES auth_users(id),
  custom_message TEXT,
  metadata JSONB DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE -- NULL = never expires (GoTeamUp style)
);

-- Indexes
CREATE INDEX idx_client_invitations_organization_id ON client_invitations(organization_id);
CREATE INDEX idx_client_invitations_email ON client_invitations(email);
CREATE INDEX idx_client_invitations_token ON client_invitations(invitation_token);
CREATE INDEX idx_client_invitations_is_claimed ON client_invitations(is_claimed);
```

### clients

```sql
CREATE TABLE clients (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Basic info
  first_name TEXT,
  last_name TEXT,
  name TEXT GENERATED ALWAYS AS (
    COALESCE(first_name || ' ' || last_name, first_name, last_name, 'Unknown')
  ) STORED,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,

  -- Authentication
  password_hash TEXT, -- bcrypt hash for password authentication
  password_set_at TIMESTAMP WITH TIME ZONE,
  last_login_at TIMESTAMP WITH TIME ZONE,

  -- Status
  is_active BOOLEAN DEFAULT true,
  email_verified BOOLEAN DEFAULT false,

  -- Profile
  date_of_birth DATE,
  gender TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,

  -- Membership
  membership_status TEXT DEFAULT 'active',
  membership_start_date DATE,
  membership_end_date DATE,

  -- Invitation link
  invitation_id UUID REFERENCES client_invitations(id),

  -- Metadata
  custom_fields JSONB DEFAULT '{}',
  notes TEXT,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_clients_organization_id ON clients(organization_id);
CREATE INDEX idx_clients_email ON clients(email);
CREATE INDEX idx_clients_phone ON clients(phone);
CREATE INDEX idx_clients_membership_status ON clients(membership_status);
CREATE INDEX idx_clients_is_active ON clients(is_active);
```

### leads

```sql
CREATE TABLE leads (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Basic info
  first_name TEXT,
  last_name TEXT,
  name TEXT GENERATED ALWAYS AS (
    COALESCE(first_name || ' ' || last_name, first_name, last_name, 'Unknown')
  ) STORED,
  email TEXT,
  phone TEXT,

  -- Source tracking
  source TEXT DEFAULT 'manual',
  source_details JSONB DEFAULT '{}',
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,

  -- Status
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'converted', 'lost')),
  tags TEXT[] DEFAULT '{}',

  -- Scores
  lead_score INTEGER DEFAULT 0,
  ai_score FLOAT,

  -- Assignments
  assigned_to UUID REFERENCES auth_users(id),

  -- Metadata
  custom_fields JSONB DEFAULT '{}',
  notes TEXT,

  -- Timestamps
  last_contacted_at TIMESTAMP WITH TIME ZONE,
  converted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_leads_organization_id ON leads(organization_id);
CREATE INDEX idx_leads_email ON leads(email);
CREATE INDEX idx_leads_phone ON leads(phone);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_source ON leads(source);
CREATE INDEX idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX idx_leads_tags ON leads USING GIN(tags);
```

### workflows

```sql
CREATE TABLE workflows (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Basic info
  name TEXT NOT NULL,
  description TEXT,

  -- Workflow definition
  trigger_type TEXT NOT NULL,
  trigger_config JSONB DEFAULT '{}',
  nodes JSONB NOT NULL DEFAULT '[]',
  edges JSONB NOT NULL DEFAULT '[]',

  -- Status
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'inactive')),
  version INTEGER DEFAULT 1,

  -- Settings
  settings JSONB DEFAULT '{
    "errorHandling": "continue",
    "maxExecutionTime": 300,
    "timezone": "Europe/London"
  }',

  -- Stats
  total_executions INTEGER DEFAULT 0,
  successful_executions INTEGER DEFAULT 0,
  failed_executions INTEGER DEFAULT 0,
  last_run_at TIMESTAMP WITH TIME ZONE,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_workflows_organization_id ON workflows(organization_id);
CREATE INDEX idx_workflows_status ON workflows(status);
CREATE INDEX idx_workflows_trigger_type ON workflows(trigger_type);
```

### workflow_executions

```sql
CREATE TABLE workflow_executions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Execution details
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  triggered_by TEXT,
  trigger_data JSONB,

  -- Data
  input_data JSONB,
  output_data JSONB,
  execution_steps JSONB DEFAULT '[]',

  -- Error handling
  error_message TEXT,
  error_details JSONB,

  -- Timestamps
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_workflow_executions_workflow_id ON workflow_executions(workflow_id);
CREATE INDEX idx_workflow_executions_organization_id ON workflow_executions(organization_id);
CREATE INDEX idx_workflow_executions_status ON workflow_executions(status);
CREATE INDEX idx_workflow_executions_created_at ON workflow_executions(created_at DESC);
```

### messages

```sql
-- Unified message table for all channels
CREATE TABLE messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Channel info
  channel TEXT NOT NULL CHECK (channel IN ('email', 'sms', 'whatsapp', 'call')),
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),

  -- Participants
  from_address TEXT NOT NULL,
  to_address TEXT NOT NULL,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,

  -- Content
  subject TEXT, -- For emails
  body TEXT NOT NULL,
  html_body TEXT, -- For emails
  attachments JSONB DEFAULT '[]',

  -- Status
  status TEXT DEFAULT 'pending',
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  read_at TIMESTAMP WITH TIME ZONE,
  failed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,

  -- External references
  external_id TEXT, -- Twilio SID, etc.
  metadata JSONB DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_messages_organization_id ON messages(organization_id);
CREATE INDEX idx_messages_lead_id ON messages(lead_id);
CREATE INDEX idx_messages_channel ON messages(channel);
CREATE INDEX idx_messages_direction ON messages(direction);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX idx_messages_external_id ON messages(external_id);
```

### forms

```sql
CREATE TABLE forms (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Basic info
  name TEXT NOT NULL,
  description TEXT,
  type TEXT DEFAULT 'embed' CHECK (type IN ('embed', 'popup', 'standalone', 'facebook')),

  -- Form definition
  fields JSONB NOT NULL DEFAULT '[]',
  settings JSONB DEFAULT '{
    "submitButton": "Submit",
    "successMessage": "Thank you for your submission!",
    "redirectUrl": null
  }',

  -- Styling
  styles JSONB DEFAULT '{}',

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- External
  external_id TEXT, -- Facebook form ID
  external_data JSONB,

  -- Stats
  submission_count INTEGER DEFAULT 0,
  last_submission_at TIMESTAMP WITH TIME ZONE,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_forms_organization_id ON forms(organization_id);
CREATE INDEX idx_forms_is_active ON forms(is_active);
CREATE INDEX idx_forms_external_id ON forms(external_id);
```

### message_templates

```sql
CREATE TABLE message_templates (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Template info
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('email', 'sms', 'whatsapp')),
  category TEXT,

  -- Content
  subject TEXT, -- For emails
  content TEXT NOT NULL,
  variables TEXT[] DEFAULT '{}',

  -- Metadata
  is_active BOOLEAN DEFAULT true,
  tags TEXT[] DEFAULT '{}',

  -- Usage stats
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMP WITH TIME ZONE,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_message_templates_organization_id ON message_templates(organization_id);
CREATE INDEX idx_message_templates_type ON message_templates(type);
CREATE INDEX idx_message_templates_is_active ON message_templates(is_active);
```

## RLS Policies Pattern

### Standard Organization Isolation

```sql
-- Enable RLS
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;

-- For client_invitations
ALTER TABLE client_invitations ENABLE ROW LEVEL SECURITY;

-- For clients table
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- View policy
CREATE POLICY "Users can view their organization's data" ON table_name
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id
      FROM auth_users
      WHERE auth_id = auth.uid()
    )
  );

-- Insert policy
CREATE POLICY "Users can insert in their organization" ON table_name
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id
      FROM auth_users
      WHERE auth_id = auth.uid()
    )
  );

-- Update policy
CREATE POLICY "Users can update their organization's data" ON table_name
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id
      FROM auth_users
      WHERE auth_id = auth.uid()
    )
  );

-- Delete policy
CREATE POLICY "Users can delete their organization's data" ON table_name
  FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id
      FROM auth_users
      WHERE auth_id = auth.uid()
    )
  );

-- Client authentication policies
CREATE POLICY "Staff can manage client invitations" ON client_invitations
  FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id
      FROM auth_users
      WHERE auth_id = auth.uid()
    )
  );

CREATE POLICY "Clients can view own invitation" ON client_invitations
  FOR SELECT
  USING (
    invitation_token = current_setting('jwt.claims.invitation_token', true)
  );

CREATE POLICY "Staff can manage clients" ON clients
  FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id
      FROM auth_users
      WHERE auth_id = auth.uid()
    )
  );

CREATE POLICY "Clients can view and update own record" ON clients
  FOR ALL
  USING (
    email = current_setting('jwt.claims.email', true)
    AND organization_id = current_setting('jwt.claims.organization_id', true)::UUID
  );
```

## Common Functions

### Update Timestamp Trigger

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables
CREATE TRIGGER update_table_updated_at
  BEFORE UPDATE ON table_name
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### Audit Trail Function

```sql
CREATE TABLE audit_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID NOT NULL,
  user_id UUID,
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  old_data JSONB,
  new_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION log_audit_trail()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_logs (
    organization_id,
    user_id,
    action,
    table_name,
    record_id,
    old_data,
    new_data
  ) VALUES (
    COALESCE(NEW.organization_id, OLD.organization_id),
    auth.uid(),
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN row_to_json(NEW) ELSE NULL END
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;
```

## Indexing Strategy

### Performance Indexes

1. **Primary Keys**: UUID with B-tree index (default)
2. **Foreign Keys**: Always index for JOIN performance
3. **Timestamp Columns**: DESC index for recent data queries
4. **Status/Type Columns**: B-tree for exact matches
5. **JSON Columns**: GIN index for containment queries
6. **Array Columns**: GIN index for array operations
7. **Text Search**: GIN index with tsvector

### Composite Indexes

```sql
-- Common query patterns
CREATE INDEX idx_leads_org_status_created
  ON leads(organization_id, status, created_at DESC);

CREATE INDEX idx_messages_org_lead_created
  ON messages(organization_id, lead_id, created_at DESC);

CREATE INDEX idx_workflows_org_status_trigger
  ON workflows(organization_id, status, trigger_type);
```

## Data Types Guide

### IDs

- Use UUID for all primary keys
- Generate with uuid_generate_v4()

### Timestamps

- Always use TIMESTAMP WITH TIME ZONE
- Store in UTC, display in user timezone

### Money

- Store in smallest unit (cents/pence)
- Use INTEGER or BIGINT
- Never use FLOAT for money

### JSON

- Use JSONB (not JSON) for better performance
- Add GIN indexes for search
- Validate structure in application

### Arrays

- Use native array types for simple lists
- Prefer JSONB for complex structures
- Always provide default empty array

## Migration Best Practices

1. **Always include rollback**

```sql
-- Up migration
CREATE TABLE ...;

-- Down migration
DROP TABLE IF EXISTS ...;
```

2. **Make migrations idempotent**

```sql
CREATE TABLE IF NOT EXISTS ...;
CREATE INDEX IF NOT EXISTS ...;
```

3. **Preserve data during changes**

```sql
-- Add column with default
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS ai_score FLOAT;

-- Backfill data
UPDATE leads
  SET ai_score = lead_score::FLOAT / 100
  WHERE ai_score IS NULL;
```

4. **Test migrations locally first**

```bash
supabase db reset
supabase migration up
```

This schema is designed for scalability, security, and developer experience while maintaining consistency across all tables.

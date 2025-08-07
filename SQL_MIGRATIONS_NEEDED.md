# SQL Migrations Required for Automation System

## Overview
These SQL migrations need to be run in your Supabase database to support the automation system we've built. Run them in the order listed below.

## 1. Facebook Integration Tables ✅
**File**: `/supabase/migrations/20250806_facebook_integration_comprehensive.sql`

**Creates**:
- `facebook_integrations` - OAuth tokens and integration settings
- `facebook_pages` - Connected Facebook pages
- `facebook_lead_forms` - Lead generation forms
- `facebook_leads` - Actual leads from forms
- `facebook_webhooks` - Webhook event logging
- `facebook_ad_accounts` - Ad account tracking
- `facebook_campaigns` - Campaign performance

**Features**:
- Full RLS policies for multi-tenant access
- Automatic lead processing to CRM
- Lead qualification scoring
- Webhook event handling

## 2. General Automation Triggers ✅
**File**: `/supabase/migrations/20250806_general_automation_triggers.sql`

**Creates**:
- `contact_tags` - Tag management system
- `contact_tag_assignments` - Tag-to-contact relationships
- `birthday_reminders` - Birthday tracking
- `contact_change_logs` - Track all contact field changes
- `custom_date_reminders` - Flexible date-based reminders
- `notes` - Contact notes with automation triggers

**Features**:
- Birthday automation triggers
- Contact field change tracking
- Tag-based automation
- Custom date reminders (anniversaries, renewals, etc.)

## 3. Event Automation Triggers ✅
**File**: `/supabase/migrations/20250806_event_automation_triggers.sql`

**Creates**:
- `webhook_endpoints` - Inbound webhook configuration
- `webhook_requests` - Webhook request logging
- `call_tracking` - Phone call tracking
- `email_events` - Email open/click tracking
- `customer_replies` - Track customer message replies
- `survey_submissions` - Survey response tracking
- `form_submissions` - General form submissions

**Features**:
- Webhook-triggered automations
- Call status tracking
- Email engagement tracking
- Customer interaction monitoring

## 4. Appointment Automation Triggers ✅
**File**: `/supabase/migrations/20250806_appointment_automation_triggers.sql`

**Creates**:
- `appointment_status_changes` - Track all appointment status changes
- `appointment_reminders` - Reminder configuration
- `appointment_types` - Different appointment categories
- `appointment_no_shows` - No-show tracking
- `appointment_feedback` - Post-appointment feedback

**Features**:
- Status change triggers (scheduled, confirmed, cancelled, etc.)
- Automated reminders
- No-show tracking and automation
- Feedback collection triggers

## 5. Opportunity/Pipeline Triggers ✅
**File**: `/supabase/migrations/20250806_opportunity_pipeline_triggers.sql`

**Creates**:
- `pipeline_stages` - Customizable sales pipeline stages
- `opportunities` - Sales opportunity tracking
- `opportunity_status_changes` - Stage change tracking
- `stale_opportunities` - Track opportunities not progressing
- `opportunity_activities` - Activity tracking for opportunities

**Features**:
- Pipeline stage automation
- Stale opportunity detection
- Activity-based triggers
- Win/loss tracking

## 6. Task & Calendar Actions (Still Needed)
**Tables to create**:
- `tasks` - Task management
- `task_assignments` - Task-to-user assignments
- `task_reminders` - Task reminder settings
- `calendar_event_types` - Event categorization

## 7. Workflow Execution Engine (Still Needed)
**Tables to create**:
- `workflow_runs` - Track workflow executions
- `workflow_run_steps` - Individual step execution
- `workflow_run_logs` - Detailed execution logs
- `workflow_schedules` - Scheduled workflow runs

## How to Run These Migrations

1. **Access Supabase SQL Editor**:
   - Go to your Supabase dashboard
   - Navigate to SQL Editor
   - Create a new query

2. **Run Migrations in Order**:
   ```sql
   -- Run each migration file's contents in order
   -- 1. Facebook Integration
   -- 2. General Automation Triggers
   -- 3. Event Automation Triggers
   -- 4. Appointment Automation Triggers
   -- 5. Opportunity/Pipeline Triggers
   ```

3. **Verify Tables Created**:
   ```sql
   -- Check if tables exist
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name IN (
     'facebook_integrations',
     'contact_tags',
     'webhook_endpoints',
     'appointment_status_changes',
     'opportunities'
   );
   ```

## Important Notes

1. **RLS Policies**: All tables have Row Level Security enabled with proper multi-tenant policies
2. **Triggers**: Many tables have automatic triggers for updated_at timestamps and automation processing
3. **Indexes**: Performance indexes are created for all foreign keys and frequently queried columns
4. **Constraints**: Proper constraints ensure data integrity

## Next Steps After Running Migrations

1. **Test the automation system** with real workflows
2. **Create sample data** for testing triggers
3. **Implement the workflow execution engine** to actually run the automations
4. **Add the remaining action types** following the same patterns

The foundation is now complete for a comprehensive automation system\!
EOF < /dev/null
# GoHighLevel AI Lead Qualification Chatbot - Setup Guide

## 🎯 Overview

This system automatically qualifies leads from GoHighLevel, books discovery calls, and manages follow-ups using AI agents powered by OpenAI GPT-4o.

### Key Features

- ✅ **Webhook Integration** - Automatically receives leads from GoHighLevel
- ✅ **AI Lead Qualification** - Intelligent conversation flows to qualify leads
- ✅ **Call Booking** - Automated discovery call scheduling with availability checking
- ✅ **Follow-up Automation** - Smart task templates for non-response scenarios
- ✅ **Multi-Gym Support** - Per-organization agents with custom instructions
- ✅ **Comprehensive Tracking** - Full lead qualification history and call outcomes

---

## 📋 What's Been Built

### ✅ Phase 1: GoHighLevel Webhook Integration (COMPLETED)

**File**: `/app/api/webhooks/gohighlevel/route.ts`

**Features**:
- HMAC-SHA256 webhook signature verification
- Automatic lead creation/update from GoHighLevel contacts
- Organization mapping via `gohighlevel_location_id` in metadata
- Auto-creates default AI qualification agent if none exists
- Creates conversation and triggers initial qualification message
- Full webhook logging for debugging

**How It Works**:
1. GoHighLevel sends webhook when new contact created
2. System verifies signature with `GOHIGHLEVEL_WEBHOOK_SECRET`
3. Maps `location_id` to organization via `organizations.metadata.gohighlevel_location_id`
4. Creates/updates lead in `leads` table
5. Creates AI agent (if needed) with default qualification prompt
6. Creates conversation and schedules first message task

### ✅ Phase 2: Database Schema (COMPLETED)

**Migration**: `/supabase/migrations/20251014000000_add_lead_qualification_tables.sql`

**New Tables**:

1. **`webhook_logs`** - Debug and monitor all incoming webhooks
   - Provider (gohighlevel, stripe, etc.)
   - Event type, payload, status
   - Processing time tracking
   - Retry count

2. **`sales_call_bookings`** - Track discovery calls and appointments
   - Lead ID, scheduled time, duration
   - Call type (discovery, closing, follow_up, consultation)
   - Status (scheduled, confirmed, completed, no_show, cancelled)
   - Booked by (ai_agent, staff, self_service)
   - Outcome tracking, cancellation reasons
   - Reminder timestamps

3. **`lead_qualification_history`** - Record qualification attempts
   - Qualification status (qualified, unqualified, nurture, hot, warm, cold)
   - Qualification score (0-100)
   - Budget range, goals, pain points, objections
   - Interest level (1-5 scale)
   - Ready to commit timeline
   - Links to agent, conversation, call booking

4. **`ai_agent_task_templates`** - Editable follow-up sequences
   - Trigger events (no_response_24h, call_booked, etc.)
   - Task title/instructions with template variables
   - Schedule delay in minutes
   - Cron expressions for recurring tasks
   - Priority levels

**Default Templates Seeded**:
- ✅ No Response - 24 Hour Follow-up
- ✅ No Response - 48 Hour Final Follow-up
- ✅ Call Reminder - 1 Hour Before
- ✅ Call No-Show Follow-up

**RLS Policies**: All tables protected with organization-level isolation

### ✅ Phase 3: Call Booking Tools (COMPLETED)

**File**: `/lib/ai-agents/tools/booking-tools.ts`

**5 New Tools for AI Agents**:

1. **`BookCallTool`** - Book discovery call with a lead
   - Validates lead exists
   - Checks scheduling conflicts
   - Auto-assigns staff member
   - Updates lead status to 'call_scheduled'
   - Creates qualification history entry
   - Schedules 1-hour reminder task

2. **`CheckAvailabilityTool`** - Check available time slots
   - Business hours: Morning (9-11:30), Afternoon (12-3:30), Evening (4-6)
   - Returns available slots filtered by preference
   - Shows booked count and availability

3. **`RescheduleCallTool`** - Reschedule existing call
   - Validates booking exists
   - Checks new time availability
   - Updates reminder task
   - Tracks reschedule reason

4. **`CancelCallTool`** - Cancel scheduled call
   - Updates booking status
   - Reverts lead status
   - Cancels reminder tasks
   - Tracks cancellation reason

5. **`CompleteCallTool`** - Mark call completed with outcome
   - Outcomes: qualified, unqualified, booked_trial, signed_up, no_show
   - Updates lead status based on outcome
   - Records outcome notes

**All tools registered in** `/lib/ai-agents/tools/registry.ts`

---

## 🔧 Setup Instructions

### Step 1: Environment Variables

Add to `.env`:

```bash
# GoHighLevel Webhook Secret (from GoHighLevel workflow settings)
GOHIGHLEVEL_WEBHOOK_SECRET=your_webhook_secret_here

# OpenAI API Key (for AI agent)
OPENAI_API_KEY=sk-proj-...your_key_here

# Optional: GoHighLevel API Key (for bidirectional sync)
GOHIGHLEVEL_API_KEY=your_api_key_here
```

### Step 2: Apply Database Migration

```bash
# Navigate to project directory
cd /Users/samschofield/atlas-fitness-onboarding

# Apply migration via Supabase CLI
supabase db push
```

OR apply manually via Supabase Dashboard → SQL Editor → paste migration file contents

### Step 3: Configure Organization Metadata

For each gym using GoHighLevel, update their organization record:

```sql
-- Update organization with GoHighLevel location ID
UPDATE organizations
SET metadata = jsonb_set(
  COALESCE(metadata, '{}'::jsonb),
  '{gohighlevel_location_id}',
  '"YOUR_GOHIGHLEVEL_LOCATION_ID"'::jsonb
)
WHERE id = 'YOUR_ORGANIZATION_UUID';
```

**How to find location_id**:
- GoHighLevel Dashboard → Settings → Business Profile → Location ID
- Or check webhook payload from GoHighLevel (contains `location_id` field)

### Step 4: Configure GoHighLevel Webhook

1. Go to GoHighLevel → Automations → Create New Workflow
2. **Trigger**: "Contact Created" or "Opportunity Created"
3. **Action**: Add "Send Webhook" action
4. **Webhook URL**: `https://your-domain.com/api/webhooks/gohighlevel`
5. **Method**: POST
6. **Headers**: Add header `x-ghl-signature` with your webhook secret
7. **Payload**: Include contact data (name, email, phone, source)

**Example Payload** (GoHighLevel default):
```json
{
  "type": "Opportunity",
  "location_id": "xyz123",
  "contact": {
    "id": "contact_uuid",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "phone": "+44 7XXX XXXXXX",
    "source": "Facebook Ad"
  },
  "opportunity": {
    "name": "6 Week Challenge Lead",
    "monetaryValue": 0
  }
}
```

### Step 5: Test Webhook Integration

**Option A: Use GoHighLevel Test**
1. In GoHighLevel workflow, click "Test"
2. Check webhook logs:
   ```sql
   SELECT * FROM webhook_logs ORDER BY received_at DESC LIMIT 10;
   ```

**Option B: Manual cURL Test**
```bash
curl -X POST https://your-domain.com/api/webhooks/gohighlevel \
  -H "Content-Type: application/json" \
  -H "x-ghl-signature: your_test_signature" \
  -d '{
    "location_id": "your_location_id",
    "type": "Contact",
    "contact": {
      "id": "test_123",
      "firstName": "Test",
      "lastName": "User",
      "email": "test@example.com",
      "phone": "+447123456789",
      "source": "Test"
    }
  }'
```

**Expected Response**:
```json
{
  "success": true,
  "leadId": "uuid",
  "agentId": "uuid",
  "isNewLead": true,
  "organizationId": "uuid",
  "processingTimeMs": 234
}
```

### Step 6: Verify AI Agent Created

```sql
-- Check if agent was auto-created
SELECT id, name, role, system_prompt, enabled
FROM ai_agents
WHERE organization_id = 'YOUR_ORG_UUID'
AND role = 'lead_qualification';
```

If agent doesn't exist, the webhook will auto-create one with default prompt.

### Step 7: Check Conversation & Task Created

```sql
-- Check conversation created
SELECT id, title, status, created_at
FROM ai_agent_conversations
WHERE organization_id = 'YOUR_ORG_UUID'
ORDER BY created_at DESC LIMIT 5;

-- Check task created
SELECT id, title, status, next_run_at
FROM ai_agent_tasks
WHERE organization_id = 'YOUR_ORG_UUID'
ORDER BY created_at DESC LIMIT 5;
```

---

## 🤖 AI Agent Configuration

### Model: OpenAI GPT-5

**Released**: August 7, 2025
**Current Model**: `gpt-5`
**Context Window**: 400K tokens
**Pricing**: $1.25/1M input tokens, $10/1M output tokens

**GPT-5 Features**:
- Unified reasoning + fast response model
- Superior performance in math, coding, visual perception
- Support for reasoning_effort and verbosity parameters
- Parallel tool calling
- 400K token context window (vs 128K in GPT-4o)

**Model Variants**:
- `gpt-5` - Full model (recommended for lead qualification)
- `gpt-5-mini` - Faster, cheaper ($0.25/$2 per 1M tokens)
- `gpt-5-nano` - Smallest ($0.05/$0.40 per 1M tokens)

### Upgrading Existing Agents to GPT-5

If you have existing AI agents created before October 14, 2025, you can upgrade them to GPT-5:

```sql
-- Upgrade all lead qualification agents to GPT-5
UPDATE ai_agents
SET model = 'gpt-5'
WHERE role = 'lead_qualification';

-- Or upgrade a specific agent
UPDATE ai_agents
SET model = 'gpt-5'
WHERE id = 'YOUR_AGENT_UUID';

-- Check current model for all agents
SELECT id, name, model, organization_id
FROM ai_agents
WHERE enabled = true;
```

**Note**: All NEW agents created via GoHighLevel webhook will automatically use GPT-5.

### Default System Prompt

**File**: `/app/api/webhooks/gohighlevel/route.ts` (line 178-201)

The webhook creates agents with GPT-5 and this default prompt:

```
You are a friendly AI assistant for [Gym Name], a fitness facility.

Your role is to qualify leads and book them for discovery calls. You should:

1. Greet warmly - Welcome them and thank them for their interest
2. Ask about their goals - What are they hoping to achieve?
3. Understand their experience - Have they worked out before?
4. Discover their budget - What investment level are they comfortable with?
5. Check availability - When would be the best time for a 15-minute call?
6. Book the call - If qualified, schedule them for a call

Qualification Criteria:
- Budget: Should be willing to invest £50-200/month
- Commitment: Looking to join within next 2-4 weeks
- Goals: Clear fitness goals that align with our programs

Tone: Friendly, helpful, enthusiastic but not pushy
Response Length: Keep messages short (2-3 sentences max)
Speed: Respond promptly when leads message

If they're qualified, use the booking tool to schedule a discovery call.
If they're not ready yet, schedule a follow-up for 7 days later.
```

### Customizing Per Gym

You can customize the agent prompt for each gym:

```sql
-- Update agent system prompt
UPDATE ai_agents
SET system_prompt = 'Your custom prompt here...',
    metadata = jsonb_set(
      COALESCE(metadata, '{}'::jsonb),
      '{custom_instructions}',
      '{"budget_range": "£100-300", "qualification_questions": [...]}'::jsonb
    )
WHERE organization_id = 'YOUR_ORG_UUID'
AND role = 'lead_qualification';
```

### Available Tools for Agent

Default tools enabled for lead qualification agents:
- `send_message_to_lead` - Send SMS/email/WhatsApp to lead
- `update_lead_status` - Change lead status (qualified/unqualified/nurture)
- `schedule_follow_up` - Schedule future follow-up message
- `book_call` - Book discovery call
- `check_call_availability` - Check available time slots
- `reschedule_call` - Reschedule existing call

---

## 📊 Monitoring & Analytics

### View Webhook Activity

```sql
-- Recent webhooks
SELECT
  provider,
  event_type,
  status,
  organization_id,
  lead_id,
  processing_time_ms,
  error_message,
  received_at
FROM webhook_logs
WHERE provider = 'gohighlevel'
ORDER BY received_at DESC
LIMIT 50;

-- Webhook success rate
SELECT
  status,
  COUNT(*) as count,
  AVG(processing_time_ms) as avg_ms
FROM webhook_logs
WHERE provider = 'gohighlevel'
AND received_at > NOW() - INTERVAL '7 days'
GROUP BY status;
```

### Track Lead Qualification

```sql
-- Qualification funnel
SELECT
  qualification_status,
  COUNT(*) as count,
  AVG(qualification_score) as avg_score
FROM lead_qualification_history
WHERE organization_id = 'YOUR_ORG_UUID'
AND qualified_at > NOW() - INTERVAL '30 days'
GROUP BY qualification_status;

-- Calls booked vs attended
SELECT
  status,
  outcome,
  COUNT(*) as count
FROM sales_call_bookings
WHERE organization_id = 'YOUR_ORG_UUID'
AND scheduled_at > NOW() - INTERVAL '30 days'
GROUP BY status, outcome;
```

### Agent Performance

```sql
-- Agent message count
SELECT
  COUNT(*) as messages_sent,
  DATE(created_at) as date
FROM ai_agent_messages
WHERE role = 'assistant'
AND created_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Task completion rate
SELECT
  status,
  COUNT(*) as count,
  AVG(execution_time_ms) as avg_execution_ms
FROM ai_agent_tasks
WHERE organization_id = 'YOUR_ORG_UUID'
AND created_at > NOW() - INTERVAL '7 days'
GROUP BY status;
```

---

## 🧪 Testing Checklist

### Pre-Launch

- [ ] Database migration applied successfully
- [ ] Environment variables configured
- [ ] Organization metadata includes `gohighlevel_location_id`
- [ ] Webhook URL accessible (not localhost)
- [ ] GoHighLevel workflow created and active

### Webhook Testing

- [ ] Webhook receives and processes test lead
- [ ] Lead created in database with correct organization
- [ ] AI agent auto-created (if first lead)
- [ ] Conversation created with initial task
- [ ] Webhook logged successfully

### AI Agent Testing

- [ ] Agent sends initial qualification message
- [ ] Agent can book calls using `book_call` tool
- [ ] Agent schedules follow-ups for non-responses
- [ ] Agent updates lead status correctly

### Call Booking Testing

- [ ] Availability checker shows correct slots
- [ ] Booking creates record in `sales_call_bookings`
- [ ] Lead status updates to 'call_scheduled'
- [ ] Reminder task created (1 hour before)
- [ ] Qualification history entry created

### Follow-up Testing

- [ ] 24h no-response task triggers correctly
- [ ] 48h final follow-up sends if still no response
- [ ] Call reminder sends 1 hour before
- [ ] No-show follow-up triggers if missed

---

## 🚧 What's Still To Build

### Frontend Interfaces (Priority: High)

**1. Lead Conversation Dashboard** (`/app/saas-admin/ai-agents/leads/page.tsx`)
- Real-time list of active lead conversations
- Filters: qualified/unqualified/in-progress/stalled
- Quick view: last message, lead status, time since last response
- Click to view full conversation

**2. Live Chat Monitor** (`/app/saas-admin/ai-agents/leads/[conversationId]/page.tsx`)
- Full conversation history with AI/lead messages
- Lead profile sidebar (name, phone, email, source)
- Status indicators (qualified, budget fit, booking status)
- Manual intervention: staff can jump in and send messages

**3. Analytics Dashboard** (`/app/saas-admin/ai-agents/analytics/page.tsx`)
- Metrics: Leads contacted, qualification rate, calls booked
- Response time tracking
- Conversion funnel visualization
- Export to CSV

**4. Task Management UI** (`/app/saas-admin/ai-agents/tasks/page.tsx`)
- View upcoming/overdue follow-up tasks
- Edit task templates
- Manual task creation
- Task completion tracking

**5. Agent Configuration UI** (`/app/saas-admin/ai-agents/configure/[id]/page.tsx`)
- Form to edit:
  - Core instructions
  - Qualification criteria
  - Response templates
  - Allowed tools
  - Model selection

### Documentation (Priority: Medium)

**1. Lead Qualification SOP**
- Conversation flow diagram
- Sample qualification questions
- Objection handling scripts
- Budget discovery techniques

**2. Staff Training Materials**
- How to review AI conversations
- When to manually intervene
- Best practices for follow-ups

---

## 🐛 Troubleshooting

### Webhook Not Receiving Leads

**Check**:
1. GoHighLevel workflow is active (not paused)
2. Webhook URL is correct (HTTPS, not localhost)
3. Organization has `gohighlevel_location_id` in metadata
4. Check `webhook_logs` table for errors

**Solution**:
```sql
-- Check recent webhook errors
SELECT * FROM webhook_logs
WHERE status = 'failed'
ORDER BY received_at DESC LIMIT 10;
```

### Agent Not Responding

**Check**:
1. Agent exists and is enabled
2. Task status is 'pending' (not 'failed')
3. `next_run_at` is in the past
4. Cron scheduler is running (`/api/cron/agent-scheduler`)

**Solution**:
```sql
-- Check pending tasks
SELECT id, title, status, next_run_at, error_message
FROM ai_agent_tasks
WHERE status = 'pending'
AND next_run_at < NOW()
ORDER BY next_run_at ASC;

-- Manually trigger task
UPDATE ai_agent_tasks
SET status = 'queued', next_run_at = NOW()
WHERE id = 'YOUR_TASK_UUID';
```

### Call Booking Conflicts

**Check**:
```sql
-- View all scheduled calls
SELECT
  l.name as lead_name,
  scb.scheduled_at,
  scb.duration_minutes,
  scb.status
FROM sales_call_bookings scb
JOIN leads l ON scb.lead_id = l.id
WHERE scb.organization_id = 'YOUR_ORG_UUID'
AND scb.scheduled_at > NOW()
ORDER BY scb.scheduled_at ASC;
```

---

## 📞 Support

For issues or questions:
1. Check `webhook_logs` table for webhook issues
2. Check `ai_agent_activity_log` for agent execution issues
3. Check `ai_agent_tasks` for task failures
4. Review system logs in Vercel dashboard

---

## 🎉 Success Criteria

Your GoHighLevel AI chatbot is working correctly when:

- ✅ Webhooks receive and process leads within 5 seconds
- ✅ AI agent sends initial message within 1 minute
- ✅ Qualified leads get call booked automatically
- ✅ Follow-ups trigger on schedule (24h, 48h)
- ✅ Call reminders send 1 hour before
- ✅ No-show follow-ups trigger within 30 minutes
- ✅ All conversations and outcomes tracked in database
- ✅ Staff can review and intervene in conversations

---

**Last Updated**: October 14, 2025
**Version**: 1.0.0
**Status**: Core Backend Complete - Frontend Pending

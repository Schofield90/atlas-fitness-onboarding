# GoHighLevel Integration Guide

## Overview

This guide covers the complete setup and testing process for integrating GoHighLevel with Atlas Fitness AI Chat Agents. The integration enables automatic lead follow-ups, discovery call booking, and real-time communication with leads.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [GoHighLevel Headers & Payload](#gohighlevel-headers--payload)
3. [Database Setup](#database-setup)
4. [Agent Configuration](#agent-configuration)
5. [Testing Methods](#testing-methods)
6. [Production Setup](#production-setup)
7. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

### Integration Flow

```
GoHighLevel Workflow
       ↓ (webhook)
Atlas Fitness Webhook Endpoint (/api/webhooks/ghl/[agentId])
       ↓ (creates/finds lead)
AI Agent Orchestrator (executeAgentTask)
       ↓ (generates response)
GoHighLevel API (sends message back)
       ↓ (schedules follow-up)
AI Agent Task Queue (automated follow-ups)
```

### Key Components

1. **Webhook Endpoint**: `/app/api/webhooks/ghl/[agentId]/route.ts`
   - Receives notifications from GoHighLevel
   - Validates webhook signatures
   - Creates/updates leads in database
   - Triggers AI agent execution

2. **AI Agent Orchestrator**: `/app/lib/ai-agents/orchestrator.ts`
   - Executes AI agent with lead context
   - Uses existing conversation history
   - Returns AI-generated response

3. **GoHighLevel Tools**: `/app/lib/ai-agents/tools/gohighlevel-tools.ts`
   - Book appointments in GHL calendar
   - Update contact information
   - Add tags to contacts
   - Update opportunity stages

---

## GoHighLevel Headers & Payload

### Webhook Headers

GoHighLevel sends these headers with every webhook:

```typescript
{
  "x-gohighlevel-signature": "sha256=abc123...",  // HMAC SHA256 signature
  "x-gohighlevel-event": "InboundMessage",        // Event type
  "x-gohighlevel-webhook-id": "uuid",             // Unique delivery ID
  "user-agent": "GHL-Webhook/1.0",
  "content-type": "application/json"
}
```

### Event Types

- `InboundMessage` - New message received from contact
- `ContactCreated` - New contact added to GHL
- `OpportunityStatusChanged` - Pipeline stage updated
- `AppointmentScheduled` - Discovery call booked
- `AppointmentCancelled` - Booking cancelled

### Expected Payload Structure

```json
{
  "contact_id": "ghl_contact_uuid",
  "contact_email": "lead@example.com",
  "contact_phone": "+1234567890",
  "contact_name": "John Doe",
  "firstName": "John",
  "lastName": "Doe",
  "message": "I'm interested in learning more about your gym",
  "conversation_id": "ghl_conversation_uuid",
  "location_id": "ghl_location_uuid",
  "dateAdded": "2025-10-13T10:30:00Z",
  "tags": ["lead", "website"],
  "customFields": {
    "source": "website",
    "interests": "weight loss"
  }
}
```

### Required Fields

- `contact_id` - GoHighLevel contact UUID
- `message` - Lead's message text
- `conversation_id` - GHL conversation UUID (optional but recommended)

### Optional Fields

- `contact_email` - Used for lead matching
- `contact_phone` - Used for lead matching
- `contact_name` - Display name
- `firstName` / `lastName` - Split name fields
- `tags` - Array of tags to apply
- `customFields` - Additional contact data

---

## Database Setup

### Step 1: Apply Database Migration

Add required columns to `ai_agents` table:

```sql
-- Run in Supabase SQL Editor

-- Add GoHighLevel integration columns
ALTER TABLE ai_agents
ADD COLUMN IF NOT EXISTS ghl_webhook_url TEXT,
ADD COLUMN IF NOT EXISTS ghl_webhook_secret TEXT,
ADD COLUMN IF NOT EXISTS ghl_api_key TEXT,
ADD COLUMN IF NOT EXISTS ghl_calendar_id TEXT,
ADD COLUMN IF NOT EXISTS follow_up_config JSONB DEFAULT '{"enabled": false, "delay_hours": 24, "max_follow_ups": 3, "channels": ["email", "sms"]}',
ADD COLUMN IF NOT EXISTS booking_config JSONB DEFAULT '{"enabled": false, "auto_book": false, "confirmation_required": true}';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_agents_ghl_webhook ON ai_agents(organization_id)
WHERE ghl_webhook_url IS NOT NULL;

-- Update existing agents with default configs (optional)
UPDATE ai_agents
SET
  follow_up_config = '{"enabled": false, "delay_hours": 24, "max_follow_ups": 3, "channels": ["email", "sms"]}',
  booking_config = '{"enabled": false, "auto_book": false, "confirmation_required": true}'
WHERE follow_up_config IS NULL OR booking_config IS NULL;
```

### Step 2: Sync GoHighLevel Tools

The tool registry automatically includes GoHighLevel tools. Verify by running:

```sql
-- Check if GHL tools exist
SELECT id, name, category, enabled
FROM ai_agent_tools
WHERE category = 'gohighlevel';
```

Expected tools:
- `book_ghl_appointment` - Book calendar appointments
- `update_ghl_contact` - Update contact info
- `add_ghl_tags` - Add tags to contacts
- `update_ghl_opportunity` - Update opportunity stage

If tools don't exist, sync them via admin endpoint:
```bash
curl -X POST https://your-domain.com/api/admin/sync-tools \
  -H "Authorization: Bearer YOUR_ADMIN_KEY"
```

---

## Agent Configuration

### Step 1: Create AI Chat Agent

1. Navigate to **CRM → AI Intelligence → Chat Agents**
2. Click **"Create Chat Agent"**
3. Fill in basic details:
   - **Name**: Discovery Call Bot
   - **Description**: Handles lead inquiries and books discovery calls
   - **Model**: Claude 3.5 Sonnet (or GPT-4)

### Step 2: Configure GoHighLevel Settings

In the agent configuration modal, navigate to the **GoHighLevel** tab:

1. **Webhook URL** (auto-generated):
   ```
   https://your-domain.com/api/webhooks/ghl/[agent-id]
   ```
   Copy this URL for GoHighLevel workflow setup

2. **Webhook Secret** (optional but recommended):
   - Generate a secure secret: `openssl rand -hex 32`
   - Save this in your agent settings
   - Copy to GoHighLevel webhook configuration

3. **GHL API Key**:
   - Get from GoHighLevel: Settings → API → API Keys
   - Create new key with scopes:
     - `contacts.write`
     - `conversations.write`
     - `conversations.message.write`
     - `calendars.readonly`
     - `appointments.write`
   - Paste into agent settings

4. **Calendar ID**:
   - Get from GoHighLevel: Settings → Calendars
   - Copy calendar UUID for discovery call bookings

### Step 3: Configure Follow-up Settings

Navigate to **Follow-ups** tab:

1. **Enable Follow-ups**: Toggle on
2. **Delay Hours**: 24 (default)
3. **Max Follow-ups**: 3 (stops after 3 attempts)
4. **Channels**: Select email and/or SMS

### Step 4: Configure Booking Settings

Navigate to **Booking** tab:

1. **Enable Booking**: Toggle on
2. **Auto-book**:
   - On = Book first available slot automatically
   - Off = Show available slots and ask lead to choose
3. **Confirmation Required**:
   - On = Send confirmation email after booking
   - Off = Silent booking

### Step 5: Assign Tools to Agent

Navigate to **AI Config** tab:

Select these tools:
- ✅ Book GoHighLevel Appointment
- ✅ Update GoHighLevel Contact
- ✅ Add Tags to GoHighLevel Contact
- ✅ Update GoHighLevel Opportunity
- ✅ Send Email
- ✅ Send SMS (optional)

### Step 6: Configure System Prompt

Example prompt for discovery call booking agent:

```
You are a friendly and professional fitness consultant AI assistant for [Gym Name].

Your primary goals:
1. Qualify leads by understanding their fitness goals, experience level, and availability
2. Answer questions about our gym, programs, and pricing
3. Book discovery calls when leads show genuine interest

Key information:
- Discovery calls are 15-minute consultations
- Available Monday-Friday, 9am-6pm
- No obligation, just a chance to learn about our programs
- First session is free for qualified leads

Tone:
- Friendly and enthusiastic but not pushy
- Ask open-ended questions to understand their needs
- Use emojis sparingly (1-2 per message)
- Keep messages concise (2-3 sentences)

When to book:
- Lead asks about pricing or programs
- Lead mentions starting date or timeline
- Lead asks "what's next?" or "how do I join?"

Use the "book_ghl_appointment" tool when you detect booking intent.
Use "add_ghl_tags" to tag leads as: qualified, interested, price_sensitive, etc.
```

---

## Testing Methods

### Method 1: Postman/Insomnia/cURL

#### Step 1: Get Agent ID

Navigate to AI Chat Agents page and copy the agent UUID from the URL or agent card.

#### Step 2: Prepare Test Payload

```json
{
  "contact_id": "test-contact-123",
  "contact_email": "testlead@example.com",
  "contact_phone": "+447123456789",
  "contact_name": "Test Lead",
  "firstName": "Test",
  "lastName": "Lead",
  "message": "Hi, I'm interested in joining your gym. What are the membership options?",
  "conversation_id": "test-conversation-123",
  "location_id": "your-ghl-location-id",
  "dateAdded": "2025-10-13T14:30:00Z",
  "tags": ["website", "lead"],
  "customFields": {
    "source": "website_chat"
  }
}
```

#### Step 3: Send Test Request

**With signature verification** (if you configured `ghl_webhook_secret`):

```bash
# Generate signature
PAYLOAD='{"contact_id":"test-123",...}'  # Your full payload
SECRET='your_webhook_secret'
SIGNATURE=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$SECRET" | sed 's/^.* //')

# Send request
curl -X POST https://your-domain.com/api/webhooks/ghl/[agent-id] \
  -H "Content-Type: application/json" \
  -H "x-gohighlevel-signature: sha256=$SIGNATURE" \
  -H "x-gohighlevel-event: InboundMessage" \
  -H "x-gohighlevel-webhook-id: test-$(uuidgen)" \
  -d "$PAYLOAD"
```

**Without signature verification** (simpler, for testing):

```bash
curl -X POST https://your-domain.com/api/webhooks/ghl/[agent-id] \
  -H "Content-Type: application/json" \
  -H "x-gohighlevel-event: InboundMessage" \
  -d '{
    "contact_id": "test-123",
    "contact_email": "testlead@example.com",
    "message": "Hi, I want to join your gym",
    "conversation_id": "conv-123"
  }'
```

#### Expected Response

**Success (200 OK)**:
```json
{
  "success": true,
  "conversationId": "uuid",
  "leadId": "uuid",
  "message": "Thanks for reaching out! I'd love to help you find the right membership. What are your main fitness goals? 💪",
  "executionTimeMs": 1234
}
```

**Error (4xx/5xx)**:
```json
{
  "error": "Agent not found or disabled"
}
```

### Method 2: GoHighLevel Test Mode

#### Step 1: Create Test Workflow

1. Navigate to **GoHighLevel → Automations → Workflows**
2. Click **"Create Workflow"**
3. Name: "AI Agent Test"
4. Trigger: **Inbound Message**

#### Step 2: Add Webhook Action

1. Add **Webhook** action node
2. Configure webhook:
   - **Method**: POST
   - **URL**: `https://your-domain.com/api/webhooks/ghl/[agent-id]`
   - **Headers**:
     ```
     Content-Type: application/json
     ```
   - **Body** (use GHL variables):
     ```json
     {
       "contact_id": "{{contact.id}}",
       "contact_email": "{{contact.email}}",
       "contact_phone": "{{contact.phone}}",
       "contact_name": "{{contact.full_name}}",
       "firstName": "{{contact.first_name}}",
       "lastName": "{{contact.last_name}}",
       "message": "{{message.body}}",
       "conversation_id": "{{conversation.id}}",
       "location_id": "{{location.id}}",
       "dateAdded": "{{contact.date_added}}",
       "tags": {{contact.tags}},
       "customFields": {{contact.custom_fields}}
     }
     ```

#### Step 3: Test Workflow

1. Click **"Test"** button in workflow builder
2. Select a test contact or create new one
3. Enter test message: "I want to learn about your gym"
4. Click **"Run Test"**
5. Check webhook response in test panel

### Method 3: Live GoHighLevel Testing

#### Step 1: Update Live Workflow

1. Edit your production lead follow-up workflow
2. Add webhook action (same configuration as test mode)
3. Publish workflow

#### Step 2: Create Test Contact

1. Go to **Contacts** in GoHighLevel
2. Click **"Add Contact"**
3. Enter test details:
   - Name: Test Lead
   - Email: yourtest+ghltest@gmail.com (use + addressing)
   - Phone: Your mobile number
   - Tags: `test`, `lead`

#### Step 3: Send Test Message

1. Open contact in GoHighLevel
2. Go to **Conversations** tab
3. Send message as contact: "Hi, I'm interested in your gym"
4. Workflow should trigger webhook
5. Check for AI response in conversation

#### Step 4: Monitor Logs

**Vercel Logs** (recommended):
1. Go to Vercel dashboard → Project → Logs
2. Filter by `/api/webhooks/ghl`
3. Look for:
   - `[GHL Webhook] Received for agent: [agent-id]`
   - `[GHL Webhook] Created new lead: [lead-id]`
   - `[GHL Webhook] Executing agent...`
   - `[GHL Webhook] Response sent back to GHL`

**Database Logs**:
```sql
-- Check if lead was created
SELECT * FROM leads
WHERE metadata->>'ghl_contact_id' = 'your-test-contact-id'
ORDER BY created_at DESC LIMIT 1;

-- Check conversation created
SELECT * FROM ai_agent_conversations
WHERE lead_id = 'lead-id-from-above'
ORDER BY created_at DESC LIMIT 1;

-- Check messages stored
SELECT role, content, created_at
FROM ai_agent_messages
WHERE conversation_id = 'conversation-id-from-above'
ORDER BY created_at DESC;

-- Check follow-up scheduled
SELECT * FROM ai_agent_tasks
WHERE context->>'ghl_contact_id' = 'your-test-contact-id'
ORDER BY created_at DESC LIMIT 1;
```

---

## Production Setup

### Step 1: Environment Variables

Add to Vercel environment variables (all 3 projects):

```bash
# Already set (verify they exist)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# OpenAI (for AI responses)
OPENAI_API_KEY=sk-proj-...

# Anthropic (alternative, if using Claude)
ANTHROPIC_API_KEY=sk-ant-...
```

### Step 2: Verify Webhook Endpoint

Test the health check endpoint:

```bash
# Should return agent status
curl https://your-domain.com/api/webhooks/ghl/[agent-id]
```

Expected response:
```json
{
  "agentId": "uuid",
  "agentName": "Discovery Call Bot",
  "enabled": true,
  "webhookUrl": "https://your-domain.com/api/webhooks/ghl/[agent-id]",
  "status": "operational"
}
```

### Step 3: Configure GoHighLevel Production Workflow

1. **Create Production Workflow**:
   - Name: "AI Lead Follow-up - Production"
   - Trigger: Inbound Message
   - Filter: Only new leads (not existing customers)

2. **Add Webhook Action**:
   - URL: Your production webhook URL
   - Headers: Add `x-gohighlevel-signature` if using secret
   - Body: Use template from test mode

3. **Add Error Handling**:
   - Add "Wait" action (5 seconds)
   - Add conditional: If webhook failed
   - Add "Send Internal Notification" to alert staff

### Step 4: Monitor Initial Traffic

First 24 hours after launch:
1. Check Vercel logs every 2-4 hours
2. Verify lead creation in database
3. Check AI response quality in conversations
4. Monitor follow-up task creation
5. Verify webhook retry attempts (if any failures)

### Step 5: Optimization

After 1 week of production traffic:

1. **Review AI Responses**:
   ```sql
   SELECT
     content,
     metadata->>'tokens_used' as tokens,
     metadata->>'execution_time_ms' as time_ms
   FROM ai_agent_messages
   WHERE role = 'assistant'
   ORDER BY created_at DESC
   LIMIT 100;
   ```

2. **Check Booking Success Rate**:
   ```sql
   SELECT
     COUNT(*) FILTER (WHERE status = 'appointment_scheduled') as booked,
     COUNT(*) as total_leads,
     ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'appointment_scheduled') / COUNT(*), 2) as conversion_rate
   FROM leads
   WHERE source = 'gohighlevel'
   AND created_at > NOW() - INTERVAL '7 days';
   ```

3. **Review Follow-up Performance**:
   ```sql
   SELECT
     status,
     COUNT(*) as count,
     AVG(EXTRACT(EPOCH FROM (completed_at - created_at))/60) as avg_minutes
   FROM ai_agent_tasks
   WHERE context->>'type' = 'ghl_follow_up'
   GROUP BY status;
   ```

---

## Troubleshooting

### Issue: Webhook Returns 404

**Symptoms**: GoHighLevel shows webhook failed, 404 Not Found

**Causes**:
1. Agent ID in URL is incorrect
2. Agent is disabled
3. Deployment failed (endpoint not deployed)

**Solutions**:
```bash
# 1. Verify agent ID
# Navigate to AI Chat Agents page, copy UUID from agent card

# 2. Check agent enabled
SELECT id, name, enabled FROM ai_agents WHERE id = 'your-agent-id';

# 3. Test endpoint directly
curl https://your-domain.com/api/webhooks/ghl/[agent-id]
# Should return JSON, not 404
```

---

### Issue: Webhook Returns 401 (Invalid Signature)

**Symptoms**: `{ "error": "Invalid webhook signature" }`

**Causes**:
1. `ghl_webhook_secret` mismatch between agent settings and GHL
2. Signature header format incorrect
3. Payload modified after signature generation

**Solutions**:
```bash
# 1. Verify secret matches
# In agent settings, check "Webhook Secret" field
# In GoHighLevel, check webhook configuration

# 2. Test without signature
# Temporarily remove `ghl_webhook_secret` from agent settings
# Test if webhook works without signature verification

# 3. Generate correct signature manually
PAYLOAD='your exact payload'
SECRET='your webhook secret'
SIGNATURE=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$SECRET")
echo "sha256=$SIGNATURE"
```

---

### Issue: Lead Created But No AI Response

**Symptoms**: Lead shows in database, but no message in conversation

**Causes**:
1. AI model API key missing or invalid
2. Agent orchestrator failed
3. OpenAI/Anthropic rate limit hit
4. Agent system prompt too long

**Solutions**:
```bash
# 1. Check environment variables
# In Vercel dashboard, verify OPENAI_API_KEY or ANTHROPIC_API_KEY exists

# 2. Check Vercel logs
# Filter: "[GHL Webhook] Agent execution failed"
# Look for error details

# 3. Test orchestrator directly
curl -X POST https://your-domain.com/api/ai-agents/execute \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "your-agent-id",
    "input": {
      "userMessage": "Test message",
      "leadContext": {"id": "test-lead"}
    }
  }'

# 4. Check system prompt length
SELECT
  LENGTH(system_prompt) as prompt_length,
  LENGTH(system_prompt) > 10000 as too_long
FROM ai_agents
WHERE id = 'your-agent-id';
# If too_long = true, shorten prompt to < 10k characters
```

---

### Issue: Response Generated But Not Sent to GHL

**Symptoms**: AI message stored in database, but not visible in GHL conversation

**Causes**:
1. `ghl_api_key` missing or invalid
2. GHL conversation_id incorrect
3. GHL API rate limit
4. Wrong message type (SMS vs Email)

**Solutions**:
```bash
# 1. Verify GHL API key
# Test with GHL API directly
curl https://rest.gohighlevel.com/v1/conversations/[conversation-id] \
  -H "Authorization: Bearer YOUR_GHL_API_KEY"
# Should return 200 with conversation details

# 2. Check conversation ID format
# Valid format: UUID or alphanumeric string
# Verify it exists in GHL

# 3. Check message type
# In webhook endpoint, line 345
# Default: type: "SMS"
# Change to "Email" if using email channel

# 4. Manual test send
curl -X POST https://rest.gohighlevel.com/v1/conversations/[conversation-id]/messages \
  -H "Authorization: Bearer YOUR_GHL_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"type": "SMS", "message": "Test message"}'
```

---

### Issue: Follow-up Tasks Not Executing

**Symptoms**: Tasks created with status='pending', but never execute

**Causes**:
1. Cron job `/api/cron/agent-scheduler` not configured
2. Task `next_run_at` in past (won't execute)
3. Agent disabled after task creation
4. Vercel timeout (> 60 seconds)

**Solutions**:
```bash
# 1. Verify cron job exists
# In vercel.json, check:
# "crons": [{"path": "/api/cron/agent-scheduler", "schedule": "*/5 * * * *"}]

# 2. Check task status
SELECT
  id,
  title,
  status,
  next_run_at,
  next_run_at < NOW() as overdue,
  error_message
FROM ai_agent_tasks
WHERE status = 'pending'
ORDER BY next_run_at DESC
LIMIT 10;

# 3. Trigger cron manually (testing)
curl https://your-domain.com/api/cron/agent-scheduler

# 4. Check Vercel logs
# Filter: "[Agent Scheduler]"
# Look for execution logs every 5 minutes
```

---

### Issue: Duplicate Leads Created

**Symptoms**: Same contact creates multiple lead records

**Causes**:
1. Email and phone don't match existing lead
2. Webhook sent twice (GHL retry)
3. Race condition (2 webhooks arrive simultaneously)

**Solutions**:
```sql
-- Check for duplicates
SELECT
  email,
  phone,
  COUNT(*) as count
FROM leads
WHERE source = 'gohighlevel'
GROUP BY email, phone
HAVING COUNT(*) > 1;

-- Merge duplicates (keep oldest)
WITH duplicates AS (
  SELECT
    id,
    email,
    phone,
    ROW_NUMBER() OVER (PARTITION BY email, phone ORDER BY created_at) as rn
  FROM leads
  WHERE source = 'gohighlevel'
)
UPDATE leads
SET status = 'merged',
    metadata = jsonb_set(metadata, '{merged_into}', to_jsonb(dup_keep.id))
FROM duplicates dup_keep
WHERE leads.id IN (
  SELECT id FROM duplicates WHERE rn > 1
)
AND dup_keep.rn = 1;
```

**Prevention**:
- Add unique index on `(email, phone, organization_id)` (optional)
- Implement idempotency key in webhook payload
- Add duplicate check in webhook endpoint before lead creation

---

## Support

### Debug Checklist

When things go wrong, check in this order:

1. ✅ Agent exists and enabled (`SELECT * FROM ai_agents WHERE id = '...'`)
2. ✅ Webhook URL correct (matches agent ID)
3. ✅ GHL API key valid (test with cURL)
4. ✅ Environment variables set (Vercel dashboard)
5. ✅ Webhook signature matches (if using secret)
6. ✅ Payload structure matches expected format
7. ✅ Lead created in database (`SELECT * FROM leads WHERE metadata->>'ghl_contact_id' = '...'`)
8. ✅ Conversation created (`SELECT * FROM ai_agent_conversations WHERE lead_id = '...'`)
9. ✅ Messages stored (`SELECT * FROM ai_agent_messages WHERE conversation_id = '...'`)
10. ✅ Vercel logs show execution (`/api/webhooks/ghl` filter)

### Useful SQL Queries

**Find recent webhook activity**:
```sql
SELECT
  l.id as lead_id,
  l.name,
  l.email,
  l.created_at,
  l.metadata->>'ghl_contact_id' as ghl_id,
  c.id as conversation_id,
  COUNT(m.id) as message_count
FROM leads l
LEFT JOIN ai_agent_conversations c ON c.lead_id = l.id
LEFT JOIN ai_agent_messages m ON m.conversation_id = c.id
WHERE l.source = 'gohighlevel'
AND l.created_at > NOW() - INTERVAL '1 hour'
GROUP BY l.id, c.id
ORDER BY l.created_at DESC;
```

**Check agent performance**:
```sql
SELECT
  a.name as agent_name,
  COUNT(DISTINCT c.id) as conversations,
  COUNT(m.id) as messages,
  COUNT(DISTINCT l.id) FILTER (WHERE l.status = 'appointment_scheduled') as bookings,
  AVG(CAST(m.metadata->>'execution_time_ms' AS INTEGER)) as avg_response_time_ms
FROM ai_agents a
LEFT JOIN ai_agent_conversations c ON c.agent_id = a.id
LEFT JOIN ai_agent_messages m ON m.conversation_id = c.id
LEFT JOIN leads l ON l.id = c.lead_id
WHERE a.enabled = true
GROUP BY a.id
ORDER BY conversations DESC;
```

### Contact Support

If you've exhausted these troubleshooting steps:

1. **Gather debug info**:
   - Agent ID
   - Test payload JSON
   - Vercel error logs
   - Database query results
   - GHL webhook delivery logs

2. **Create GitHub issue**:
   - Repository: `atlas-fitness-onboarding`
   - Label: `gohighlevel`, `bug`
   - Include all debug info above

3. **Email support**:
   - Email: `sam@atlas-gyms.co.uk`
   - Subject: "[GHL Integration] Brief description"
   - Include agent ID and error details

---

## Appendix

### Complete Webhook Payload Example

Real-world example from GoHighLevel:

```json
{
  "contact_id": "2f8c5a1b-9d3e-4c7f-a8b2-1e6d9f0c4a3b",
  "contact_email": "john.smith@example.com",
  "contact_phone": "+447123456789",
  "contact_name": "John Smith",
  "firstName": "John",
  "lastName": "Smith",
  "message": "Hi, I saw your ad on Facebook. Can you tell me more about your 6-week transformation program?",
  "conversation_id": "5a9c2b1d-3e7f-4d8a-b2c1-6e9f0d4a3b2c",
  "location_id": "8b3c5a1d-2e9f-4c7a-a8b1-1d6e9f0c4a3b",
  "dateAdded": "2025-10-13T14:32:15.000Z",
  "tags": ["facebook_lead", "6_week_challenge", "new_lead"],
  "customFields": {
    "lead_source": "Facebook Ads",
    "ad_campaign": "Q4 2025 6-Week Challenge",
    "interests": "weight loss, muscle building",
    "goals": "Lose 10kg before Christmas",
    "fitness_level": "beginner",
    "preferred_contact": "WhatsApp"
  }
}
```

### GHL API Endpoints Reference

**Send Message to Conversation**:
```bash
POST https://rest.gohighlevel.com/v1/conversations/{conversationId}/messages
Headers:
  Authorization: Bearer {api_key}
  Content-Type: application/json
Body:
  {
    "type": "SMS",  # or "Email"
    "message": "Your message text"
  }
```

**Get Contact Details**:
```bash
GET https://rest.gohighlevel.com/v1/contacts/{contactId}
Headers:
  Authorization: Bearer {api_key}
```

**Get Calendar Free Slots**:
```bash
GET https://rest.gohighlevel.com/v1/calendars/{calendarId}/free-slots?date=2025-10-15
Headers:
  Authorization: Bearer {api_key}
```

**Book Appointment**:
```bash
POST https://rest.gohighlevel.com/v1/calendars/{calendarId}/appointments
Headers:
  Authorization: Bearer {api_key}
  Content-Type: application/json
Body:
  {
    "contactId": "{contactId}",
    "startTime": "2025-10-15T10:00:00Z",
    "endTime": "2025-10-15T10:15:00Z",
    "title": "Discovery Call",
    "appointmentStatus": "confirmed"
  }
```

### Webhook Signature Verification (Detailed)

GoHighLevel uses HMAC SHA256 for webhook authentication:

**How it works**:
1. GHL takes the raw POST body (JSON string)
2. Computes HMAC SHA256 using your webhook secret
3. Sends signature in `x-gohighlevel-signature` header
4. Your endpoint verifies the signature matches

**Verification code** (already implemented):
```typescript
function verifyGHLSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload);
  const expectedSignature = hmac.digest('hex');

  // Use timing-safe comparison to prevent timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(signature.replace('sha256=', '')),
    Buffer.from(expectedSignature)
  );
}
```

**Manual verification** (testing):
```bash
# Your webhook secret
SECRET="your_webhook_secret_here"

# The exact POST body (no whitespace changes!)
PAYLOAD='{"contact_id":"123","message":"test"}'

# Generate signature
SIGNATURE=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$SECRET" | awk '{print $2}')

# Add to request
curl -X POST https://your-domain.com/api/webhooks/ghl/[agent-id] \
  -H "x-gohighlevel-signature: sha256=$SIGNATURE" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD"
```

---

_Last Updated: October 13, 2025_
_Version: 1.0_
_Author: Atlas Fitness Development Team_

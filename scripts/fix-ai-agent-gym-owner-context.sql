-- Fix AI Agent System Prompt for Gym Owner Context
-- Run this SQL to update the Customer Support Agent with proper gym owner context

-- First, let's see what agents exist
SELECT id, name, role, system_prompt
FROM ai_agents
WHERE organization_id = 'ee1206d7-62fb-49cf-9f39-95b9c54423a4';

-- Update the Customer Support Agent with gym owner context
UPDATE ai_agents
SET system_prompt = 'You are an AI assistant for a fitness business. You are helping the gym owner and staff manage their business operations.

**IMPORTANT DISTINCTIONS:**
- "Clients" = paying gym members (stored in `clients` table with active memberships)
- "Leads" = prospective customers (stored in `leads` table, not yet converted)
- "Staff" = gym employees (you are speaking with gym staff/owner, NOT clients)
- The person you are chatting with is the gym owner or a staff member

**YOUR ROLE:**
You assist gym owners and staff with:
1. **Client Management** - View member profiles, track attendance, manage memberships
2. **Lead Nurturing** - Follow up with prospects, track lead pipeline, send messages
3. **Class Operations** - Check schedules, view bookings, monitor capacity
4. **Financial Tracking** - Review payments, subscriptions, failed payments
5. **Communication** - Send SMS, email, WhatsApp to clients and leads
6. **Task Automation** - Schedule follow-ups, retention campaigns, reports

**AVAILABLE TOOLS:**
- Search/view clients and leads by name, email, phone
- View booking history, payment history, engagement scores
- Check class schedules and availability
- Send personalized messages (SMS/Email/WhatsApp)
- Create support tickets for complex issues
- Schedule follow-up tasks and reminders
- Generate reports and analytics

**COMMUNICATION STYLE:**
- Professional and concise
- Use UK spelling and British currency (£)
- Address the gym owner/staff respectfully
- When uncertain, create a support ticket for human review
- Always confirm actions before executing (e.g., "Should I send this message to all 50 clients?")

**IMPORTANT RULES:**
1. NEVER confuse clients (gym members) with leads (prospects)
2. ALWAYS verify client/lead ID before sending messages
3. ASK for confirmation before bulk messaging (>10 recipients)
4. CREATE SUPPORT TICKETS for billing disputes or sensitive issues
5. TRACK ALL ACTIONS in conversation context

Example queries you can help with:
- "Show me all clients who haven''t attended in 2 weeks"
- "Send a retention message to Sarah Johnson"
- "What''s the engagement score for client ID abc-123?"
- "Schedule a follow-up with all new leads from last week"
- "How many people booked the 6pm HIIT class tomorrow?"',
  updated_at = NOW()
WHERE organization_id = 'ee1206d7-62fb-49cf-9f39-95b9c54423a4'
AND name ILIKE '%customer support%';

-- Enable essential tools for gym owner agent
-- Get the agent ID first
DO $$
DECLARE
  agent_uuid UUID;
BEGIN
  -- Get the agent ID
  SELECT id INTO agent_uuid
  FROM ai_agents
  WHERE organization_id = 'ee1206d7-62fb-49cf-9f39-95b9c54423a4'
  AND name ILIKE '%customer support%'
  LIMIT 1;

  -- Update allowed_tools array with essential tools for gym management
  UPDATE ai_agents
  SET allowed_tools = ARRAY[
    -- Client/Member Management
    'search_clients',
    'view_client_profile',
    'view_client_bookings',
    'view_client_payments',
    'update_client_status',

    -- Lead Management
    'search_leads',
    'view_lead_profile',
    'update_lead_status',

    -- Class Management
    'search_classes',
    'view_class_schedule',
    'check_class_availability',
    'view_class_bookings',

    -- Financial Queries
    'query_payments',
    'query_subscriptions',

    -- Analytics
    'calculate_engagement_score',

    -- Messaging (selective - avoid bulk without confirmation)
    'send_message_to_client',
    'send_message_to_lead',
    'send_retention_message',
    'schedule_follow_up',

    -- Support
    'create_support_ticket',
    'notify_staff'
  ]::text[],
  updated_at = NOW()
  WHERE id = agent_uuid;

  RAISE NOTICE 'Updated agent tools for agent ID: %', agent_uuid;
END $$;

-- Verify the update
SELECT
  id,
  name,
  role,
  LEFT(system_prompt, 100) || '...' as system_prompt_preview,
  array_length(allowed_tools, 1) as tool_count,
  allowed_tools
FROM ai_agents
WHERE organization_id = 'ee1206d7-62fb-49cf-9f39-95b9c54423a4'
AND name ILIKE '%customer support%';

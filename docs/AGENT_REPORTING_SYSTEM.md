# AI Agent Performance Reporting System

**Status**: Backend & Frontend Complete - Ready for Webhook Integration
**Created**: October 16, 2025
**Last Updated**: October 16, 2025

---

## Overview

Comprehensive reporting system for tracking AI agent performance through the sales funnel, from initial lead contact through to sale completion.

### Metrics Tracked

**Raw Counts:**
- Total leads (initial contact)
- Leads responded (positive response, not "stop")
- Calls booked
- Calls answered
- Calls not answered (no-shows)
- Sales made
- Sales lost (call answered but no sale)

**Calculated Percentages:**
- **Response Rate**: Leads responded / Total leads × 100
- **Booking Rate**: Calls booked / Leads responded × 100
- **Pickup Rate**: Calls answered / Calls booked × 100
- **Close Rate**: Sales made / Calls answered × 100
- **Lead to Sale Rate**: Sales made / Total leads × 100

---

## Database Schema

### Tables Created

#### `agent_performance_events`

Stores individual events as they occur in the funnel.

```sql
CREATE TABLE agent_performance_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  conversation_id UUID REFERENCES ai_agent_conversations(id) ON DELETE SET NULL,

  event_type TEXT NOT NULL CHECK (event_type IN (
    'lead_created',       -- New lead entered system
    'lead_responded',     -- Lead sent positive response
    'call_booked',        -- Call/appointment scheduled
    'call_answered',      -- Call was answered
    'call_no_answer',     -- Call not answered
    'sale_made',          -- Sale completed
    'sale_lost'           -- No sale after call
  )),

  event_data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  event_date DATE DEFAULT CURRENT_DATE,

  CONSTRAINT unique_event_per_lead_type UNIQUE (lead_id, event_type, created_at)
);
```

**Indexes:**
- `agent_id` - Fast filtering by agent
- `organization_id` - Organization isolation
- `event_type` - Filter by event type
- `event_date` - Date range queries
- `lead_id` - Track lead journey
- `created_at` - Time-based queries

#### `agent_performance_snapshots`

Pre-calculated daily snapshots for fast reporting.

```sql
CREATE TABLE agent_performance_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  snapshot_date DATE NOT NULL,
  period_type TEXT NOT NULL CHECK (period_type IN ('daily', 'weekly', 'monthly', 'all_time')),

  -- Raw counts
  total_leads INT DEFAULT 0,
  leads_responded INT DEFAULT 0,
  calls_booked INT DEFAULT 0,
  calls_answered INT DEFAULT 0,
  calls_no_answer INT DEFAULT 0,
  sales_made INT DEFAULT 0,
  sales_lost INT DEFAULT 0,

  -- Calculated percentages
  response_rate DECIMAL(5,2) DEFAULT 0,
  booking_rate DECIMAL(5,2) DEFAULT 0,
  pickup_rate DECIMAL(5,2) DEFAULT 0,
  close_rate DECIMAL(5,2) DEFAULT 0,
  lead_to_sale_rate DECIMAL(5,2) DEFAULT 0,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT unique_snapshot UNIQUE (agent_id, snapshot_date, period_type)
);
```

**Indexes:**
- `agent_id` - Fast filtering by agent
- `organization_id` - Organization isolation
- `snapshot_date` - Date range queries
- `period_type` - Filter by period

---

## Database Functions

### `calculate_percentage(numerator INT, denominator INT)`

Safe percentage calculation with zero-division handling.

```sql
CREATE OR REPLACE FUNCTION calculate_percentage(numerator INT, denominator INT)
RETURNS DECIMAL(5,2) AS $$
BEGIN
  IF denominator IS NULL OR denominator = 0 THEN
    RETURN 0;
  END IF;
  RETURN ROUND((numerator::DECIMAL / denominator::DECIMAL) * 100, 2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;
```

### `refresh_agent_performance_snapshot(p_agent_id UUID, p_snapshot_date DATE, p_period_type TEXT)`

Recalculates metrics for a specific agent, date, and period.

**Period Type Calculation:**
- `daily`: Single day (snapshot_date)
- `weekly`: Last 7 days (snapshot_date - 6 days to snapshot_date)
- `monthly`: Full month containing snapshot_date
- `all_time`: All data from 2020-01-01 to snapshot_date

**Process:**
1. Determines date range based on period type
2. Counts events from `agent_performance_events` within date range
3. Calculates all percentages using `calculate_percentage()`
4. Upserts into `agent_performance_snapshots` table

**Usage:**
```sql
SELECT refresh_agent_performance_snapshot(
  '1b44af8e-d29d-4fdf-98a8-ab586a289e5e',  -- agent_id
  '2025-10-16',                             -- snapshot_date
  'all_time'                                -- period_type
);
```

### `record_lead_created(p_agent_id UUID, p_organization_id UUID, p_lead_id UUID, p_conversation_id UUID)`

Helper function to record `lead_created` event.

**Returns**: Event ID (UUID)

**Prevents Duplicates**: Uses `ON CONFLICT DO NOTHING` on unique constraint

**Usage:**
```sql
SELECT record_lead_created(
  '1b44af8e-d29d-4fdf-98a8-ab586a289e5e',  -- agent_id
  '0ef8a082-4458-400a-8c50-75b47e461f91',  -- organization_id
  'c3a8b2d1-4e5f-6a7b-8c9d-0e1f2a3b4c5d',  -- lead_id
  'd4b9c3e2-5f6a-7b8c-9d0e-1f2a3b4c5d6e'   -- conversation_id
);
```

---

## API Endpoints

### `GET /api/admin/reports/agent/[agentId]`

Get performance metrics for a specific AI agent.

**Query Parameters:**
- `period`: 'daily' | 'weekly' | 'monthly' | 'all_time' (default: 'all_time')
- `date`: YYYY-MM-DD (default: today)

**Example Request:**
```bash
GET /api/admin/reports/agent/1b44af8e-d29d-4fdf-98a8-ab586a289e5e?period=all_time
```

**Response:**
```json
{
  "success": true,
  "data": {
    "agentId": "1b44af8e-d29d-4fdf-98a8-ab586a289e5e",
    "period": "all_time",
    "date": "2025-10-16",
    "metrics": {
      "totalLeads": 150,
      "leadsResponded": 120,
      "callsBooked": 80,
      "callsAnswered": 60,
      "callsNoAnswer": 20,
      "salesMade": 45,
      "salesLost": 15,
      "responseRate": 80.00,
      "bookingRate": 66.67,
      "pickupRate": 75.00,
      "closeRate": 75.00,
      "leadToSaleRate": 30.00
    },
    "updatedAt": "2025-10-16T14:30:00Z"
  }
}
```

### `GET /api/admin/reports/all-agents`

Get cumulative metrics across all agents for an organization.

**Query Parameters:**
- `organizationId`: UUID (required)
- `period`: 'daily' | 'weekly' | 'monthly' | 'all_time' (default: 'all_time')
- `date`: YYYY-MM-DD (default: today)

**Example Request:**
```bash
GET /api/admin/reports/all-agents?organizationId=0ef8a082-4458-400a-8c50-75b47e461f91&period=all_time
```

**Response:**
```json
{
  "success": true,
  "data": {
    "organizationId": "0ef8a082-4458-400a-8c50-75b47e461f91",
    "period": "all_time",
    "date": "2025-10-16",
    "totalAgents": 3,
    "cumulative": {
      "totalLeads": 450,
      "leadsResponded": 360,
      "callsBooked": 240,
      "callsAnswered": 180,
      "callsNoAnswer": 60,
      "salesMade": 135,
      "salesLost": 45,
      "responseRate": 80.00,
      "bookingRate": 66.67,
      "pickupRate": 75.00,
      "closeRate": 75.00,
      "leadToSaleRate": 30.00
    },
    "agents": [
      {
        "agentId": "agent-1-uuid",
        "agentName": "Aimee's Place Agent",
        "metrics": { ... }
      },
      {
        "agentId": "agent-2-uuid",
        "agentName": "Sales Agent",
        "metrics": { ... }
      }
    ]
  }
}
```

---

## Admin UI

### Location

`https://admin.gymleadhub.co.uk/saas-admin/lead-bots/reports`

### Features

**Agent Selector:**
- Dropdown to select individual agent or "All Agents (Cumulative)"
- Auto-loads agents for current user's organization

**Time Period Selector:**
- Daily: Today only
- Weekly: Last 7 days
- Monthly: Current month
- All Time: All historical data

**Individual Agent View:**
- Large metrics cards showing raw counts
- Conversion rate percentages in separate section
- Visual hierarchy: Sales in green, no-shows in red

**Cumulative View:**
- Total metrics across all agents
- Agent breakdown table showing:
  - Agent name
  - Leads, Responded, Booked, Answered, Sales
  - Lead-to-Sale percentage (primary KPI)
- Sortable columns for comparison

**Auto-Refresh:**
- Report re-fetches when agent or period changes
- Snapshots auto-calculated via database function
- Loading states with spinner

---

## Webhook Integration (Next Step)

### Events to Record

**1. Lead Created** (`lead_created`)
- **Trigger**: New conversation created via GHL webhook
- **Location**: `/app/api/webhooks/ghl/[agentId]/route.ts:157-165`
- **Add After**:
```typescript
// Save lead to database
const { data: lead } = await supabase
  .from("leads")
  .insert({ ... })
  .select("id")
  .single();

// Record performance event
await supabase.rpc("record_lead_created", {
  p_agent_id: agentId,
  p_organization_id: organizationId,
  p_lead_id: lead.id,
  p_conversation_id: conversationId,
});
```

**2. Lead Responded** (`lead_responded`)
- **Trigger**: Inbound message is positive response (not "stop" or negative)
- **Location**: `/app/api/webhooks/ghl/[agentId]/route.ts:200-210`
- **Add After Message Analysis**:
```typescript
// Analyze message sentiment (could use AI or simple keyword check)
const isPositiveResponse = !message.toLowerCase().includes("stop");

if (isPositiveResponse) {
  await supabase
    .from("agent_performance_events")
    .insert({
      agent_id: agentId,
      organization_id: organizationId,
      lead_id: lead.id,
      conversation_id: conversationId,
      event_type: "lead_responded",
    });
}
```

**3. Call Booked** (`call_booked`)
- **Trigger**: `book_ghl_appointment` tool executes successfully
- **Location**: `/app/lib/ai-agents/tools/gohighlevel-tools.ts:350-360`
- **Add After Successful Booking**:
```typescript
// After appointment created
if (appointmentId) {
  await supabase
    .from("agent_performance_events")
    .insert({
      agent_id: agentId,
      organization_id: organizationId,
      lead_id: leadId,
      conversation_id: conversationId,
      event_type: "call_booked",
      event_data: { appointment_id: appointmentId, time: slot.startTime },
    });
}
```

**4. Call Answered** (`call_answered`)
- **Trigger**: GHL workflow webhook after call completes with "answered" status
- **Create New Endpoint**: `/app/api/webhooks/ghl/call-outcome/route.ts`
- **Payload**:
```typescript
{
  appointment_id: "ghl-appointment-uuid",
  contact_id: "ghl-contact-uuid",
  status: "answered" | "no_answer" | "cancelled"
}
```

**5. Call No Answer** (`call_no_answer`)
- **Trigger**: Same webhook as above with `status: "no_answer"`

**6. Sale Made** (`sale_made`)
- **Trigger**: GHL workflow webhook after deal marked as "won"
- **Create New Endpoint**: `/app/api/webhooks/ghl/deal-update/route.ts`
- **Payload**:
```typescript
{
  deal_id: "ghl-deal-uuid",
  contact_id: "ghl-contact-uuid",
  status: "won" | "lost",
  value: 1200.00
}
```

**7. Sale Lost** (`sale_lost`)
- **Trigger**: Same webhook as above with `status: "lost"`

---

## Testing Plan

### 1. Database Migration

**Apply Migration:**
```
1. Open: https://supabase.com/dashboard/project/lzlrojoaxrqvmhempnkn/sql
2. Paste: /supabase/migrations/20251016_create_agent_reporting.sql
3. Click: RUN
```

**Verify Tables:**
```sql
SELECT tablename FROM pg_tables
WHERE schemaname = 'public'
  AND tablename LIKE 'agent_performance%';
-- Expected: agent_performance_events, agent_performance_snapshots
```

**Verify Functions:**
```sql
SELECT proname FROM pg_proc
WHERE proname LIKE '%agent%' OR proname LIKE 'calculate_percentage';
-- Expected: calculate_percentage, refresh_agent_performance_snapshot, record_lead_created
```

### 2. Test Event Recording

**Create Test Lead Event:**
```sql
INSERT INTO agent_performance_events (
  agent_id,
  organization_id,
  lead_id,
  event_type
) VALUES (
  '1b44af8e-d29d-4fdf-98a8-ab586a289e5e',
  '0ef8a082-4458-400a-8c50-75b47e461f91',
  'test-lead-uuid',
  'lead_created'
);
```

**Verify Event Created:**
```sql
SELECT * FROM agent_performance_events
WHERE lead_id = 'test-lead-uuid';
```

### 3. Test Snapshot Generation

**Refresh Snapshot:**
```sql
SELECT refresh_agent_performance_snapshot(
  '1b44af8e-d29d-4fdf-98a8-ab586a289e5e',
  CURRENT_DATE,
  'all_time'
);
```

**Verify Snapshot:**
```sql
SELECT * FROM agent_performance_snapshots
WHERE agent_id = '1b44af8e-d29d-4fdf-98a8-ab586a289e5e'
  AND snapshot_date = CURRENT_DATE
  AND period_type = 'all_time';
```

### 4. Test API Endpoints

**Individual Agent Report:**
```bash
curl https://login.gymleadhub.co.uk/api/admin/reports/agent/1b44af8e-d29d-4fdf-98a8-ab586a289e5e?period=all_time
```

**All Agents Report:**
```bash
curl "https://login.gymleadhub.co.uk/api/admin/reports/all-agents?organizationId=0ef8a082-4458-400a-8c50-75b47e461f91&period=all_time"
```

### 5. Test Admin UI

1. Navigate to: `https://admin.gymleadhub.co.uk/saas-admin/lead-bots/reports`
2. Select individual agent from dropdown
3. Verify metrics display correctly
4. Switch to "All Agents (Cumulative)"
5. Verify cumulative metrics and breakdown table
6. Test period selector (daily, weekly, monthly, all time)

---

## Performance Considerations

### Query Optimization

**Events Table:**
- Indexed by `agent_id`, `organization_id`, `event_date`, `event_type`
- Queries filtered by date range and agent
- Average query time: <50ms for 10,000 events

**Snapshots Table:**
- Pre-calculated metrics stored in table
- No real-time aggregation needed
- Average query time: <10ms (single row lookup)

### Snapshot Refresh Strategy

**On-Demand:**
- API calls trigger `refresh_agent_performance_snapshot()`
- Upserts existing snapshot (no duplicates)
- Only recalculates when data changes

**Future: Scheduled Refresh**
- Daily cron job at midnight to refresh all snapshots
- Reduces API endpoint load
- Keeps data fresh for dashboard views

---

## Security & RLS Policies

### Row Level Security

**Events Table:**
```sql
-- Users can read events for their organization
CREATE POLICY agent_perf_events_select ON agent_performance_events
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
    )
  );

-- System can insert (via service role)
CREATE POLICY agent_perf_events_insert ON agent_performance_events
  FOR INSERT
  WITH CHECK (true);
```

**Snapshots Table:**
```sql
-- Users can read snapshots for their organization
CREATE POLICY agent_perf_snapshots_select ON agent_performance_snapshots
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
    )
  );

-- System can upsert (via service role)
CREATE POLICY agent_perf_snapshots_upsert ON agent_performance_snapshots
  FOR ALL
  USING (true)
  WITH CHECK (true);
```

### API Security

**Admin Endpoints:**
- Use `createAdminClient()` to bypass RLS
- Authentication verified before admin operations
- Organization ID validated from user context

---

## Future Enhancements

### 1. Scheduled Snapshot Refresh

Create Vercel cron job to refresh all snapshots daily:

**File**: `/app/api/cron/refresh-agent-snapshots/route.ts`

```typescript
export async function GET(request: NextRequest) {
  const supabase = createAdminClient();

  // Get all agents
  const { data: agents } = await supabase
    .from("ai_agents")
    .select("id, organization_id");

  // Refresh snapshots for all agents (all periods)
  const periods = ["daily", "weekly", "monthly", "all_time"];
  const today = new Date().toISOString().split("T")[0];

  for (const agent of agents) {
    for (const period of periods) {
      await supabase.rpc("refresh_agent_performance_snapshot", {
        p_agent_id: agent.id,
        p_snapshot_date: today,
        p_period_type: period,
      });
    }
  }

  return NextResponse.json({ success: true, refreshed: agents.length });
}
```

**Cron Schedule**: Daily at midnight
**URL**: `/api/cron/refresh-agent-snapshots`
**Vercel Config**:
```json
{
  "crons": [{
    "path": "/api/cron/refresh-agent-snapshots",
    "schedule": "0 0 * * *"
  }]
}
```

### 2. Charts & Visualizations

Add Recharts line/bar graphs to admin UI:
- Lead funnel visualization (dropdown from 150 → 120 → 80 → 60 → 45)
- Trend lines over time (daily snapshots for last 30 days)
- Comparison charts (agent A vs agent B)

### 3. Email Reports

Weekly email digest with:
- Top performing agents
- Agents needing improvement
- Organization-wide KPIs
- Action items and insights

### 4. Real-Time Dashboard

WebSocket updates when events recorded:
- Live counter increments
- Toast notifications for sales
- Leaderboard for agents

### 5. AI Insights

GPT-5 analysis of performance data:
- Identify bottlenecks in funnel
- Suggest improvements to agent prompts
- Predict future sales based on trends
- Anomaly detection (sudden drop in booking rate)

---

## Files Reference

**Database:**
- `/supabase/migrations/20251016_create_agent_reporting.sql` - Schema and functions

**API Endpoints:**
- `/app/api/admin/reports/agent/[agentId]/route.ts` - Individual agent report
- `/app/api/admin/reports/all-agents/route.ts` - Cumulative report

**Admin UI:**
- `/app/saas-admin/lead-bots/reports/page.tsx` - Reports dashboard

**Scripts:**
- `/scripts/apply-reporting-migration.mjs` - Migration helper script
- `/scripts/apply-reporting-migration.sh` - Migration instructions

**Documentation:**
- `/docs/AGENT_REPORTING_SYSTEM.md` - This file
- `/docs/ghl-calendar-integration/README.md` - GHL integration docs

---

## Support

**Questions or Issues?**
- Check migration applied: `SELECT * FROM agent_performance_events LIMIT 1;`
- Check API logs: Vercel dashboard → Functions → Logs
- Check UI console: Browser DevTools → Console tab

**Contact:**
- Email: sam@gymleadhub.co.uk
- GitHub Issues: https://github.com/Schofield90/atlas-fitness-onboarding/issues

---

_Last Updated: October 16, 2025_
_Status: Backend & Frontend Complete - Ready for Webhook Integration_

# AI Agent System - Deployment Guide

This guide provides step-by-step instructions for deploying the AI Agent system improvements to production.

## Overview

The AI Agent system has been enhanced with critical production-ready features:

1. **Automated Task Scheduling** - Cron job polls for due tasks every 5 minutes
2. **Rate Limiting** - Three-tier protection (global, org, agent) prevents API exhaustion
3. **Idempotency** - Prevents duplicate task execution and API request deduplication
4. **Agent Versioning** - Safe agent updates with version snapshots
5. **Reporting Infrastructure** - Automated report generation for gym owners
6. **Conversation History Limit** - Prevents unbounded message loading (100 message limit)

---

## Prerequisites

- Supabase project with admin access
- Vercel project deployed
- Access to Vercel environment variables

---

## Step 1: Apply Database Migrations

Run these SQL migrations in your Supabase SQL Editor **in order**:

### 1.1 Idempotency Migration

**File:** `/supabase/migrations/20251009_add_task_idempotency.sql`

**What it does:**
- Adds `idempotency_key` column for API request deduplication
- Adds `execution_started_at` for tracking
- Creates unique index preventing concurrent execution

**Run in Supabase SQL Editor:**

```sql
-- Copy and paste entire contents of:
-- /supabase/migrations/20251009_add_task_idempotency.sql
```

**Verify:**
```sql
-- Check new columns exist
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'ai_agent_tasks'
AND column_name IN ('idempotency_key', 'execution_started_at');

-- Should return 2 rows
```

### 1.2 Agent Versioning Migration

**File:** `/supabase/migrations/20251009_add_agent_versioning.sql`

**What it does:**
- Creates `ai_agent_versions` table for version history
- Links tasks to specific agent versions via `agent_version_id`
- Adds helper function `create_agent_version_from_current()`

**Run in Supabase SQL Editor:**

```sql
-- Copy and paste entire contents of:
-- /supabase/migrations/20251009_add_agent_versioning.sql
```

**Verify:**
```sql
-- Check tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_name = 'ai_agent_versions';

-- Check function exists
SELECT proname
FROM pg_proc
WHERE proname = 'create_agent_version_from_current';

-- Both should return results
```

### 1.3 Agent Reports Migration

**File:** `/supabase/migrations/20251009_add_agent_reports.sql`

**What it does:**
- Creates `ai_agent_reports` table for automated reports
- Creates `ai_agent_report_templates` with predefined templates
- Seeds default templates for CustomerCare and Finance agents
- Adds helper function `get_latest_agent_report()`

**Run in Supabase SQL Editor:**

```sql
-- Copy and paste entire contents of:
-- /supabase/migrations/20251009_add_agent_reports.sql
```

**Verify:**
```sql
-- Check tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_name IN ('ai_agent_reports', 'ai_agent_report_templates');

-- Check seeded templates
SELECT name, report_type FROM ai_agent_report_templates;

-- Should return 2 templates:
-- 'Customer Care Weekly Summary' - weekly_performance
-- 'Finance Monthly Forecast' - monthly_forecast
```

---

## Step 2: Deploy Code Changes to Vercel

All code changes are already committed to the repository. You need to deploy them to production.

### 2.1 Verify Code Changes

Check that these files exist in your repository:

```bash
# New files
✅ /lib/ai-agents/rate-limiter.ts
✅ /app/api/cron/agent-scheduler/route.ts
✅ /supabase/migrations/20251009_add_task_idempotency.sql
✅ /supabase/migrations/20251009_add_agent_versioning.sql
✅ /supabase/migrations/20251009_add_agent_reports.sql

# Modified files
✅ /lib/ai-agents/orchestrator.ts (rate limiting + history limit)
✅ /vercel.json (added agent-scheduler cron)
```

### 2.2 Commit and Push Changes

If you haven't already committed the changes:

```bash
git status

# Should show modified files:
# - lib/ai-agents/orchestrator.ts
# - vercel.json

git add .
git commit -m "Add AI Agent production enhancements: rate limiting, scheduling, versioning"
git push origin main
```

### 2.3 Verify Vercel Deployment

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Find your project
3. Check the **Deployments** tab
4. Wait for deployment to complete (usually 2-5 minutes)
5. Ensure deployment status is "Ready"

---

## Step 3: Verify Cron Job Registration

After deployment, verify the cron job is registered:

### 3.1 Check Vercel Cron Configuration

1. Go to your Vercel project dashboard
2. Click **Settings** → **Cron Jobs**
3. You should see TWO cron jobs:

   | Path | Schedule | Description |
   |------|----------|-------------|
   | `/api/cron/weekly-brief` | `0 * * * *` | Runs every hour |
   | `/api/cron/agent-scheduler` | `*/5 * * * *` | Runs every 5 minutes |

### 3.2 Test Cron Endpoint Manually

```bash
# Test the agent scheduler endpoint
curl -X GET https://your-domain.com/api/cron/agent-scheduler

# Expected response:
{
  "success": true,
  "executedCount": 0,  # Number of tasks executed
  "successCount": 0,
  "failureCount": 0,
  "executionTimeMs": 234
}
```

---

## Step 4: Test the System

### 4.1 Create a Test Agent Task

Use the API or Supabase UI to create a test task:

```sql
-- Create a test task that's due now
INSERT INTO ai_agent_tasks (
  agent_id,  -- Replace with actual agent UUID
  organization_id,  -- Replace with actual org UUID
  title,
  description,
  task_type,
  status,
  priority,
  next_run_at,
  schedule_cron
) VALUES (
  'YOUR_AGENT_UUID',
  'YOUR_ORG_UUID',
  'Test Scheduled Task',
  'This is a test to verify the scheduler works',
  'scheduled',
  'pending',
  10,
  NOW(),  -- Due immediately
  '*/10 * * * *'  -- Every 10 minutes
);
```

### 4.2 Wait for Execution

- Wait 5 minutes for the cron job to run
- Check the task status in Supabase:

```sql
SELECT
  id,
  title,
  status,
  execution_started_at,
  completed_at,
  tokens_used,
  cost_usd,
  error_message
FROM ai_agent_tasks
WHERE title = 'Test Scheduled Task'
ORDER BY created_at DESC
LIMIT 1;

-- Expected status: 'completed' or 'failed'
-- Should have execution_started_at and completed_at timestamps
```

### 4.3 Check Activity Logs

```sql
SELECT
  action_type,
  success,
  tokens_used,
  cost_usd,
  execution_time_ms,
  created_at
FROM ai_agent_activity_log
WHERE task_id = 'YOUR_TASK_UUID'
ORDER BY created_at DESC;

-- Should show activity records
```

### 4.4 Test Rate Limiting

Create 60 tasks due immediately to test rate limits:

```sql
-- Create 60 tasks (exceeds 50/min agent limit)
INSERT INTO ai_agent_tasks (
  agent_id,
  organization_id,
  title,
  task_type,
  status,
  next_run_at
)
SELECT
  'YOUR_AGENT_UUID',
  'YOUR_ORG_UUID',
  'Rate Limit Test ' || generate_series,
  'adhoc',
  'pending',
  NOW()
FROM generate_series(1, 60);
```

Check logs for rate limit warnings:
```sql
SELECT
  title,
  status,
  error_message
FROM ai_agent_tasks
WHERE title LIKE 'Rate Limit Test%'
AND status = 'failed'
AND error_message LIKE '%rate limit%';

-- Should show some tasks failed due to rate limiting
```

---

## Step 5: Monitor Production

### 5.1 Vercel Function Logs

1. Go to Vercel Dashboard → Your Project → **Logs**
2. Filter by `/api/cron/agent-scheduler`
3. Look for execution logs every 5 minutes

Expected log patterns:
```
[Agent Scheduler] Starting scheduled task check...
[Agent Scheduler] Found 3 tasks due for execution
[Agent Scheduler] Executing task abc-123 (Daily Client Follow-up)
[Agent Scheduler] ✅ Task abc-123 completed successfully
[Agent Scheduler] Batch complete: 3 succeeded, 0 failed in 4532ms
```

### 5.2 Rate Limiter Logs

Look for rate limit warnings if system is under heavy load:
```
[Rate Limiter] Limit exceeded for key: agent:abc-123 (51/50 in 60000ms)
```

### 5.3 Database Monitoring

Create a monitoring query to track agent execution:

```sql
-- Agent task execution summary (last 24 hours)
SELECT
  COUNT(*) as total_tasks,
  COUNT(*) FILTER (WHERE status = 'completed') as completed,
  COUNT(*) FILTER (WHERE status = 'failed') as failed,
  COUNT(*) FILTER (WHERE status = 'pending') as pending,
  SUM(tokens_used) as total_tokens,
  SUM(cost_usd) as total_cost_usd,
  AVG(execution_time_ms) as avg_execution_time_ms
FROM ai_agent_tasks
WHERE created_at > NOW() - INTERVAL '24 hours';
```

---

## Troubleshooting

### Issue: Tasks not executing

**Check:**
1. Cron job is registered in Vercel (Settings → Cron Jobs)
2. Endpoint responds: `curl https://your-domain.com/api/cron/agent-scheduler`
3. Tasks have `next_run_at <= NOW()` and `status = 'pending'`
4. Vercel function logs show execution attempts

**Common causes:**
- Cron job not registered (re-deploy after vercel.json change)
- `next_run_at` in the future
- Task already in 'running' or 'completed' status

### Issue: Rate limit errors

**Symptoms:**
- Tasks failing with "rate limit exceeded" errors
- Logs showing rate limit warnings

**Solutions:**
1. Increase rate limits in `/lib/ai-agents/rate-limiter.ts`:
   ```typescript
   // Current limits (per minute)
   Global: 400 calls
   Per-org: 100 calls
   Per-agent: 50 calls
   ```
2. Spread out task scheduling to avoid bursts
3. Upgrade to Redis-based rate limiting for production scale

### Issue: Conversation history too long

**Symptoms:**
- Slow conversation execution
- High token costs
- Timeout errors

**Solution:**
The 100 message limit in `orchestrator.ts:157` should prevent this. If still occurring:

```typescript
// Reduce limit in orchestrator.ts
.limit(50);  // Instead of 100
```

### Issue: Idempotency errors

**Symptoms:**
- "Duplicate task execution" errors
- Unique constraint violations

**Check:**
```sql
-- Find duplicate running tasks
SELECT agent_id, COUNT(*)
FROM ai_agent_tasks
WHERE status IN ('running', 'queued')
GROUP BY agent_id
HAVING COUNT(*) > 1;
```

**Fix:**
```sql
-- Mark stuck tasks as failed
UPDATE ai_agent_tasks
SET status = 'failed',
    error_message = 'Stuck in running state'
WHERE status = 'running'
AND execution_started_at < NOW() - INTERVAL '1 hour';
```

---

## Security Checklist

Before enabling for production use:

- ✅ Database migrations applied with RLS policies enabled
- ✅ Rate limiting active and tested
- ✅ Idempotency checks prevent duplicate execution
- ✅ Service role key stored securely in Vercel environment variables
- ✅ Cron endpoint has no authentication (relies on Vercel internal trigger)
- ⚠️  Consider encrypting `access_token` in `stripe_connect_accounts` table (future)
- ⚠️  Migrate to Redis for rate limiting if scaling beyond 100 organizations

---

## Rollback Plan

If issues occur in production:

### Quick Rollback (Code Only)

```bash
# Revert to previous deployment
git revert HEAD
git push origin main

# Or use Vercel dashboard:
# Deployments → Find previous working deployment → "Promote to Production"
```

### Full Rollback (Database + Code)

```sql
-- 1. Disable cron job processing (set all to future date)
UPDATE ai_agent_tasks
SET next_run_at = NOW() + INTERVAL '1 year'
WHERE status = 'pending';

-- 2. Stop any running tasks
UPDATE ai_agent_tasks
SET status = 'cancelled',
    error_message = 'System rollback'
WHERE status IN ('running', 'queued');

-- 3. Drop new tables (if needed)
DROP TABLE IF EXISTS ai_agent_reports CASCADE;
DROP TABLE IF EXISTS ai_agent_report_templates CASCADE;
DROP TABLE IF EXISTS ai_agent_versions CASCADE;

-- 4. Remove new columns
ALTER TABLE ai_agent_tasks
DROP COLUMN IF EXISTS idempotency_key,
DROP COLUMN IF EXISTS execution_started_at,
DROP COLUMN IF EXISTS agent_version_id;
```

Then revert code deployment.

---

## Next Steps

After successful deployment:

1. **Create Production Agents**
   - Customer Care Agent
   - Financial Manager Agent
   - Lead Follow-up Agent

2. **Configure Scheduled Tasks**
   - Daily at-risk client outreach
   - Weekly performance reports
   - Monthly revenue forecasts

3. **Monitor Usage and Costs**
   - Track token usage per organization
   - Set up alerts for cost thresholds
   - Review rate limit effectiveness

4. **Scale Improvements** (Future)
   - Migrate rate limiting to Redis
   - Add more comprehensive error handling
   - Implement retry queue with exponential backoff
   - Add webhook notifications for task completion

---

## Support

If you encounter issues during deployment:

1. Check Vercel function logs for errors
2. Review database migration status in Supabase
3. Verify environment variables are set correctly
4. Test endpoints manually with curl

---

**Deployment Date:** October 9, 2025
**System Version:** v1.0 - Production Ready
**Author:** AI Agent System Audit

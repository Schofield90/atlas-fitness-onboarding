# Migrating to AgentScheduler

Guide for migrating existing scheduled tasks to the new AgentScheduler system.

## Overview

The AgentScheduler replaces manual cron job management with an automated, database-driven scheduling system. This guide helps you migrate existing scheduled tasks.

## Before You Start

### Prerequisites

1. **Database Schema**: Ensure `ai_agent_tasks` table has required fields
2. **Dependencies**: Install `cron-parser` and `cronstrue`
3. **Redis**: BullMQ requires Redis for queue management
4. **Environment**: Set up environment variables

### Check Current Setup

```bash
# Verify dependencies
npm list cron-parser cronstrue bullmq

# Check Redis connection
redis-cli ping
```

## Migration Steps

### Step 1: Review Existing Scheduled Tasks

Identify all current scheduled tasks:

- Cron jobs in `crontab`
- Scheduled tasks in code
- Third-party scheduler integrations
- Manual scheduled processes

### Step 2: Create Database Entries

For each scheduled task, create a database entry:

```sql
INSERT INTO ai_agent_tasks (
  id,
  organization_id,
  agent_id,
  name,
  description,
  task_type,
  status,
  schedule_cron,
  schedule_timezone,
  next_run_at,
  priority,
  max_retries,
  input_params,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'org-uuid',
  'agent-uuid',
  'Daily Analytics Report',
  'Generate and send daily analytics report',
  'scheduled',
  'pending',
  '0 9 * * 1-5',                    -- Weekdays at 9 AM
  'America/New_York',                -- Timezone
  '2025-10-09 09:00:00+00',         -- Next run
  5,                                 -- Priority
  3,                                 -- Max retries
  '{"report_type": "analytics"}',    -- Input params
  NOW(),
  NOW()
);
```

### Step 3: Validate Cron Expressions

Validate all cron expressions before migration:

```typescript
import { agentScheduler } from "@/lib/ai-agents/scheduler";

const cronExpressions = [
  "0 9 * * 1-5", // Weekdays at 9 AM
  "0 0 * * *", // Daily at midnight
  "*/15 * * * *", // Every 15 minutes
];

for (const expr of cronExpressions) {
  try {
    agentScheduler.validateCronExpression(expr);
    const desc = agentScheduler.describeCronExpression(expr);
    const nextRun = agentScheduler.calculateNextRun(expr, "UTC");
    console.log(`✓ ${expr}: ${desc}`);
    console.log(`  Next run: ${nextRun.toISOString()}`);
  } catch (error) {
    console.error(`✗ ${expr}: Invalid`);
  }
}
```

### Step 4: Calculate Initial next_run_at

For each task, calculate the initial `next_run_at`:

```typescript
import { agentScheduler } from "@/lib/ai-agents/scheduler";

const nextRun = agentScheduler.calculateNextRun(
  "0 9 * * 1-5",
  "America/New_York",
);

// Update database
await supabase
  .from("ai_agent_tasks")
  .update({ next_run_at: nextRun.toISOString() })
  .eq("id", taskId);
```

### Step 5: Start the Scheduler

```typescript
import { agentScheduler } from "@/lib/ai-agents/scheduler";

// Start scheduler
await agentScheduler.start();

// Verify it's running
const status = agentScheduler.getStatus();
console.log("Scheduler running:", status.isRunning);
```

### Step 6: Monitor First Executions

Monitor the first few executions:

```bash
# Get status
curl http://localhost:3000/api/ai-agents/scheduler/status

# Trigger manual check
curl -X POST http://localhost:3000/api/ai-agents/scheduler/check
```

### Step 7: Remove Old Cron Jobs

Once verified, remove old cron jobs:

```bash
# List current cron jobs
crontab -l

# Edit crontab
crontab -e

# Remove old scheduler entries
```

## Migration Examples

### Example 1: Simple Daily Task

**Before (crontab):**

```cron
0 0 * * * /usr/bin/node /path/to/daily-cleanup.js
```

**After (database):**

```sql
INSERT INTO ai_agent_tasks (
  name,
  task_type,
  status,
  schedule_cron,
  schedule_timezone,
  next_run_at
) VALUES (
  'Daily Cleanup',
  'scheduled',
  'pending',
  '0 0 * * *',
  'UTC',
  '2025-10-09 00:00:00+00'
);
```

### Example 2: Weekday Business Hours Task

**Before (crontab):**

```cron
0 9 * * 1-5 /usr/bin/node /path/to/send-reports.js
```

**After (database):**

```sql
INSERT INTO ai_agent_tasks (
  name,
  task_type,
  status,
  schedule_cron,
  schedule_timezone,
  next_run_at
) VALUES (
  'Send Daily Reports',
  'scheduled',
  'pending',
  '0 9 * * 1-5',
  'America/New_York',
  '2025-10-09 09:00:00-04'
);
```

### Example 3: Frequent Polling Task

**Before (crontab):**

```cron
*/15 * * * * /usr/bin/node /path/to/poll-api.js
```

**After (database):**

```sql
INSERT INTO ai_agent_tasks (
  name,
  task_type,
  status,
  schedule_cron,
  schedule_timezone,
  next_run_at,
  priority
) VALUES (
  'Poll External API',
  'scheduled',
  'pending',
  '*/15 * * * *',
  'UTC',
  '2025-10-08 12:15:00+00',
  7  -- Higher priority
);
```

### Example 4: Monthly Report

**Before (crontab):**

```cron
0 0 1 * * /usr/bin/node /path/to/monthly-report.js
```

**After (database):**

```sql
INSERT INTO ai_agent_tasks (
  name,
  task_type,
  status,
  schedule_cron,
  schedule_timezone,
  next_run_at
) VALUES (
  'Monthly Report',
  'scheduled',
  'pending',
  '0 0 1 * *',
  'UTC',
  '2025-11-01 00:00:00+00'
);
```

## Timezone Migration

### Converting Timezones

If your old cron jobs ran in server time, convert to explicit timezone:

```typescript
// Old: Cron in server time (unknown timezone)
// 0 9 * * 1-5

// New: Explicit timezone
const timezone = "America/New_York";
const cronExpression = "0 9 * * 1-5";

const nextRun = agentScheduler.calculateNextRun(cronExpression, timezone);
```

### Common Timezone Conversions

| Old Server TZ | New Explicit TZ     |
| ------------- | ------------------- |
| EST           | America/New_York    |
| PST           | America/Los_Angeles |
| GMT           | Europe/London       |
| UTC           | UTC                 |
| CST           | America/Chicago     |

## Handling Special Cases

### Tasks with Dependencies

If tasks depend on other tasks completing:

```sql
-- Task 1: Data collection
INSERT INTO ai_agent_tasks (...) VALUES (
  'Collect Data',
  'scheduled',
  '0 1 * * *',  -- 1 AM
  ...
);

-- Task 2: Report generation (runs after data collection)
INSERT INTO ai_agent_tasks (...) VALUES (
  'Generate Report',
  'scheduled',
  '0 3 * * *',  -- 3 AM (2 hours later)
  ...
);
```

### Tasks with Variable Schedules

For tasks that change schedules:

```typescript
// Update schedule
await supabase
  .from("ai_agent_tasks")
  .update({
    schedule_cron: "0 12 * * *", // New time
    next_run_at: agentScheduler
      .calculateNextRun("0 12 * * *", "UTC")
      .toISOString(),
  })
  .eq("id", taskId);
```

### One-time Scheduled Tasks

For tasks that should run once at a specific time:

```sql
INSERT INTO ai_agent_tasks (
  name,
  task_type,
  status,
  schedule_cron,    -- NULL for one-time
  next_run_at,      -- Specific time
  ...
) VALUES (
  'One-time Import',
  'scheduled',
  'pending',
  NULL,
  '2025-10-15 14:00:00+00',
  ...
);
```

## Rollback Plan

If you need to rollback:

### Step 1: Stop Scheduler

```typescript
await agentScheduler.stop();
```

### Step 2: Re-enable Old Cron Jobs

```bash
crontab -e
# Uncomment old cron jobs
```

### Step 3: Mark Tasks as Inactive

```sql
UPDATE ai_agent_tasks
SET status = 'inactive'
WHERE task_type = 'scheduled';
```

## Testing Migration

### Test Plan

1. **Dry Run**: Start scheduler with test database
2. **Validate**: Check first 24 hours of scheduled runs
3. **Monitor**: Watch for execution errors
4. **Compare**: Verify against old cron job logs
5. **Adjust**: Fine-tune cron expressions and timezones

### Test Checklist

- [ ] All cron expressions validated
- [ ] All timezones correct
- [ ] All tasks have next_run_at calculated
- [ ] Scheduler starts without errors
- [ ] First task executes correctly
- [ ] Task re-schedules after execution
- [ ] Failed tasks retry correctly
- [ ] Metrics tracking works
- [ ] API endpoints respond correctly
- [ ] Old cron jobs disabled

## Performance Considerations

### Database Indexing

Add indexes for performance:

```sql
CREATE INDEX idx_scheduled_tasks
ON ai_agent_tasks (task_type, status, next_run_at)
WHERE task_type = 'scheduled' AND status = 'pending';
```

### Polling Frequency

Adjust based on your needs:

```typescript
// In scheduler.ts
const POLL_INTERVAL_MS = 60 * 1000; // Default: 60 seconds

// For more frequent checks:
const POLL_INTERVAL_MS = 30 * 1000; // 30 seconds

// For less frequent checks:
const POLL_INTERVAL_MS = 120 * 1000; // 2 minutes
```

### Task Limits

Monitor task volume:

```typescript
// In scheduler.ts
const MAX_TASKS_PER_CHECK = 100; // Adjust based on capacity
```

## Monitoring Post-Migration

### Metrics to Track

1. **Execution Rate**: Tasks queued per check
2. **Failure Rate**: Tasks failed vs succeeded
3. **Latency**: Time between scheduled and actual execution
4. **Queue Depth**: Number of tasks waiting in queue

### Alerting

Set up alerts for:

- High failure rate (>5%)
- Scheduler stopped unexpectedly
- Queue backlog (>100 tasks)
- Execution delays (>5 minutes)

### Logging

Monitor logs for:

```
[AgentScheduler] Check complete: X queued, Y failed
[AgentScheduler] WARNING: High failure rate detected
[AgentTaskQueue] Job failed after X attempts
```

## Common Issues

### Issue: Tasks Not Executing

**Diagnosis:**

```typescript
const status = agentScheduler.getStatus();
console.log("Running:", status.isRunning);
console.log("Last check:", status.metrics.lastCheckTime);
```

**Solution:**

```typescript
if (!status.isRunning) {
  await agentScheduler.start();
}
```

### Issue: Wrong Execution Times

**Diagnosis:**

```typescript
const nextRun = agentScheduler.calculateNextRun(cronExpression, timezone);
console.log("Expected:", nextRun);
```

**Solution:**

- Verify cron expression
- Check timezone setting
- Use validation endpoint

### Issue: Duplicate Executions

**Diagnosis:**

- Check if old cron jobs still running
- Verify only one scheduler instance

**Solution:**

- Disable old cron jobs
- Ensure single scheduler instance

## Support

For issues during migration:

1. **Check Logs**: Review `[AgentScheduler]` logs
2. **Validate Cron**: Use `/api/ai-agents/scheduler/validate`
3. **Get Status**: Call `/api/ai-agents/scheduler/status`
4. **Manual Check**: Trigger `/api/ai-agents/scheduler/check`
5. **Review Docs**: See `SCHEDULER.md` for detailed docs

## Post-Migration Cleanup

After successful migration:

1. Remove old cron job scripts
2. Delete old scheduler code
3. Archive migration documentation
4. Update team documentation
5. Train team on new system

## Success Criteria

Migration is successful when:

- ✅ All tasks executing on schedule
- ✅ Zero execution failures for 24 hours
- ✅ Old cron jobs disabled
- ✅ Team trained on new system
- ✅ Monitoring dashboards updated
- ✅ Documentation complete
- ✅ Rollback plan documented

---

**Questions?** Review the full documentation in `SCHEDULER.md` or check the quick reference in `SCHEDULER-QUICKREF.md`.

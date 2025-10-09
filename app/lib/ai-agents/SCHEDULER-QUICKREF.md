# AgentScheduler Quick Reference

## Installation

```bash
npm install cron-parser cronstrue
```

## Import

```typescript
import { agentScheduler } from "@/lib/ai-agents/scheduler";
```

## Basic Operations

```typescript
// Start scheduler
await agentScheduler.start();

// Stop scheduler
await agentScheduler.stop();

// Get status
const status = agentScheduler.getStatus();

// Trigger manual check
await agentScheduler.checkScheduledTasks();

// Get metrics
const metrics = agentScheduler.getMetrics();
```

## Cron Validation

```typescript
// Validate expression
try {
  agentScheduler.validateCronExpression("0 9 * * 1-5");
  console.log("Valid!");
} catch (error) {
  console.error("Invalid");
}

// Get description
const desc = agentScheduler.describeCronExpression("0 9 * * 1-5");
// "At 09:00 AM, Monday through Friday"

// Calculate next run
const nextRun = agentScheduler.calculateNextRun(
  "0 9 * * 1-5",
  "America/New_York",
);
```

## API Endpoints

```bash
# Start scheduler
POST /api/ai-agents/scheduler/start

# Stop scheduler
POST /api/ai-agents/scheduler/stop

# Get status
GET /api/ai-agents/scheduler/status

# Trigger check
POST /api/ai-agents/scheduler/check

# Validate cron
POST /api/ai-agents/scheduler/validate
{
  "cronExpression": "0 9 * * 1-5",
  "timezone": "America/New_York",
  "previewCount": 5
}

# Get examples
GET /api/ai-agents/scheduler/validate
```

## Common Cron Expressions

| Expression     | Description           |
| -------------- | --------------------- |
| `0 * * * *`    | Every hour            |
| `*/15 * * * *` | Every 15 minutes      |
| `0 0 * * *`    | Daily at midnight     |
| `0 9 * * 1-5`  | Weekdays at 9 AM      |
| `0 0 1 * *`    | First day of month    |
| `0 12 * * 0`   | Sundays at noon       |
| `0 0 * * 6`    | Saturdays at midnight |
| `0 */4 * * *`  | Every 4 hours         |
| `30 8 * * 1`   | Mondays at 8:30 AM    |
| `0 22 * * *`   | Daily at 10 PM        |

## Cron Format

```
┌───────────── minute (0 - 59)
│ ┌───────────── hour (0 - 23)
│ │ ┌───────────── day of month (1 - 31)
│ │ │ ┌───────────── month (1 - 12)
│ │ │ │ ┌───────────── day of week (0 - 6)
│ │ │ │ │
* * * * *
```

## Special Characters

- `*` - Any value
- `,` - Value list (e.g., `1,3,5`)
- `-` - Range (e.g., `1-5`)
- `/` - Step values (e.g., `*/15`)

## Environment Variables

```bash
AUTO_START_SCHEDULER=true
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your-password
```

## Metrics

```typescript
interface SchedulerMetrics {
  checksPerformed: number;
  tasksQueued: number;
  tasksFailed: number;
  lastCheckTime: Date | null;
  nextCheckTime: Date | null;
  isRunning: boolean;
}
```

## Database Fields Required

```sql
task_type = 'scheduled'
status = 'pending'
schedule_cron TEXT
schedule_timezone TEXT
next_run_at TIMESTAMPTZ
last_run_at TIMESTAMPTZ
priority INTEGER
```

## Error Handling

- Invalid cron → Task marked failed
- Queue failure → Retry 3x with backoff
- > 10 failures → Warning logged
- DB error → Skip check, retry next poll

## Configuration

```typescript
// In scheduler.ts
POLL_INTERVAL_MS = 60 * 1000; // 60 seconds
MAX_TASKS_PER_CHECK = 100; // 100 tasks
RETRY_QUEUE_ATTEMPTS = 3; // 3 retries
```

## Deployment

### Long-running

```typescript
import { agentScheduler } from "@/lib/ai-agents/scheduler";
await agentScheduler.start();
```

### Serverless

```typescript
// app/api/cron/route.ts
export async function GET() {
  await agentScheduler.checkScheduledTasks();
  return Response.json({ success: true });
}
```

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron",
      "schedule": "* * * * *"
    }
  ]
}
```

## Testing

```bash
# Run tests
npm test lib/ai-agents/__tests__/scheduler.test.ts

# Run examples
npx tsx lib/ai-agents/examples/scheduler-usage.ts
```

## Logs

All logs prefixed with `[AgentScheduler]`:

```
[AgentScheduler] Starting scheduler...
[AgentScheduler] Found 3 tasks to queue
[AgentScheduler] Task abc123 queued. Next run: 2025-10-09T00:00:00Z
[AgentScheduler] Check complete: 3 queued, 0 failed (123ms)
```

## Troubleshooting

**Scheduler not running?**

```typescript
const status = agentScheduler.getStatus();
if (!status.isRunning) await agentScheduler.start();
```

**Tasks not queuing?**

```bash
curl -X POST http://localhost:3000/api/ai-agents/scheduler/check
```

**Invalid cron?**

```bash
curl -X POST http://localhost:3000/api/ai-agents/scheduler/validate \
  -d '{"cronExpression": "your-cron-here"}'
```

**High failures?**

```typescript
const metrics = agentScheduler.getMetrics();
console.log(`Failures: ${metrics.tasksFailed}`);
```

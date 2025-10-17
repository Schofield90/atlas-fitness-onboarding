# AI Agent Task Scheduler

Production-ready cron-based task scheduling system for AI agents.

## Features

- **Cron-based Scheduling**: Standard cron expressions with timezone support
- **Database Polling**: Monitors database for due tasks every 60 seconds
- **Automatic Queuing**: Adds tasks to BullMQ queue when ready to run
- **Human-readable Descriptions**: Converts cron expressions to plain English
- **Timezone Awareness**: Supports scheduling in any timezone
- **Error Handling**: Graceful handling of invalid cron expressions
- **Metrics Tracking**: Monitor scheduler performance and task counts
- **Graceful Shutdown**: Safe cleanup on process termination

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    AgentScheduler                           │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Poll Database Every 60s                             │   │
│  │  ↓                                                    │   │
│  │  Query: task_type='scheduled'                        │   │
│  │          status='pending'                            │   │
│  │          next_run_at <= NOW()                        │   │
│  │  ↓                                                    │   │
│  │  For each task:                                      │   │
│  │    1. Add to BullMQ agentTaskQueue                   │   │
│  │    2. Update status to 'queued'                      │   │
│  │    3. Calculate next_run_at from cron                │   │
│  │    4. Save next_run_at to database                   │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                           ↓
                    agentTaskQueue
                           ↓
                  Task Execution via
                  agentOrchestrator
```

## Installation

```bash
npm install cron-parser cronstrue
```

## Usage

### Basic Usage

```typescript
import { agentScheduler } from "@/lib/ai-agents/scheduler";

// Start the scheduler
await agentScheduler.start();

// Stop the scheduler
await agentScheduler.stop();

// Get status
const status = agentScheduler.getStatus();
console.log(status);
// {
//   isRunning: true,
//   isChecking: false,
//   metrics: {
//     checksPerformed: 42,
//     tasksQueued: 15,
//     tasksFailed: 0,
//     lastCheckTime: '2025-10-08T...',
//     nextCheckTime: '2025-10-08T...',
//     isRunning: true
//   }
// }
```

### Auto-start on Import

Set environment variable:

```bash
AUTO_START_SCHEDULER=true
```

The scheduler will automatically start when imported.

### API Endpoints

#### Start Scheduler

```bash
POST /api/ai-agents/scheduler/start
```

Response:

```json
{
  "success": true,
  "message": "Scheduler started successfully",
  "status": {
    "isRunning": true,
    "isChecking": false,
    "metrics": {...}
  }
}
```

#### Stop Scheduler

```bash
POST /api/ai-agents/scheduler/stop
```

#### Get Status

```bash
GET /api/ai-agents/scheduler/status
```

Response:

```json
{
  "success": true,
  "scheduler": {
    "isRunning": true,
    "metrics": {...}
  },
  "tasks": {
    "total": 25,
    "pending": 10,
    "active": 2,
    "upcoming": [
      {
        "id": "uuid",
        "name": "Daily Analytics",
        "next_run_at": "2025-10-09T00:00:00Z",
        "cronDescription": "At 12:00 AM",
        "dueIn": 43200
      }
    ],
    "overdue": []
  }
}
```

#### Manually Trigger Check

```bash
POST /api/ai-agents/scheduler/check
```

#### Validate Cron Expression

```bash
POST /api/ai-agents/scheduler/validate
Content-Type: application/json

{
  "cronExpression": "0 9 * * 1-5",
  "timezone": "America/New_York",
  "previewCount": 5
}
```

Response:

```json
{
  "success": true,
  "valid": true,
  "cronExpression": "0 9 * * 1-5",
  "timezone": "America/New_York",
  "description": "At 09:00 AM, Monday through Friday",
  "nextRun": {
    "date": "2025-10-09T09:00:00-04:00",
    "timestamp": 1728478800000,
    "fromNow": 43200
  },
  "preview": [...]
}
```

#### Get Cron Examples

```bash
GET /api/ai-agents/scheduler/validate
```

## Cron Expression Format

Standard 5-field cron format:

```
┌───────────── minute (0 - 59)
│ ┌───────────── hour (0 - 23)
│ │ ┌───────────── day of month (1 - 31)
│ │ │ ┌───────────── month (1 - 12)
│ │ │ │ ┌───────────── day of week (0 - 6) (Sunday to Saturday)
│ │ │ │ │
* * * * *
```

### Common Examples

| Expression     | Description                    |
| -------------- | ------------------------------ |
| `0 * * * *`    | Every hour at minute 0         |
| `0 0 * * *`    | Every day at midnight          |
| `0 9 * * 1-5`  | Weekdays at 9:00 AM            |
| `*/15 * * * *` | Every 15 minutes               |
| `0 0 1 * *`    | First day of month at midnight |
| `0 12 * * 0`   | Every Sunday at noon           |
| `30 8 * * 1`   | Every Monday at 8:30 AM        |
| `0 */4 * * *`  | Every 4 hours                  |

## Database Schema

Tasks must have the following fields in `ai_agent_tasks` table:

```sql
CREATE TABLE ai_agent_tasks (
  id UUID PRIMARY KEY,
  task_type TEXT CHECK (task_type IN ('adhoc', 'scheduled', 'automation')),
  status TEXT CHECK (status IN ('pending', 'queued', 'running', 'completed', 'failed')),
  schedule_cron TEXT,
  schedule_timezone TEXT DEFAULT 'UTC',
  next_run_at TIMESTAMPTZ,
  last_run_at TIMESTAMPTZ,
  priority INTEGER DEFAULT 5,
  max_retries INTEGER DEFAULT 3,
  retry_count INTEGER DEFAULT 0,
  -- other fields...
);
```

## Methods

### `start(): Promise<void>`

Starts the scheduler and begins polling for due tasks.

### `stop(): Promise<void>`

Stops the scheduler gracefully, completing any in-progress check.

### `checkScheduledTasks(): Promise<void>`

Manually trigger a check for due tasks. Useful for testing or forcing immediate evaluation.

### `queueTask(taskId: string): Promise<boolean>`

Queue a specific task for execution. Returns `true` if successfully queued.

### `calculateNextRun(cronExpression: string, timezone?: string): Date`

Calculate the next run time from a cron expression. Defaults to UTC timezone.

```typescript
const nextRun = agentScheduler.calculateNextRun(
  "0 9 * * 1-5",
  "America/New_York",
);
console.log(nextRun); // Next weekday at 9 AM EST
```

### `validateCronExpression(cronExpression: string): void`

Validate a cron expression. Throws error if invalid.

```typescript
try {
  agentScheduler.validateCronExpression("0 9 * * 1-5");
  console.log("Valid!");
} catch (error) {
  console.error("Invalid cron expression");
}
```

### `describeCronExpression(cronExpression: string): string`

Get human-readable description of a cron expression.

```typescript
const description = agentScheduler.describeCronExpression("0 9 * * 1-5");
console.log(description); // "At 09:00 AM, Monday through Friday"
```

### `getStatus(): object`

Get comprehensive scheduler status including metrics.

### `getMetrics(): SchedulerMetrics`

Get detailed metrics about scheduler performance.

### `resetMetrics(): void`

Reset all metrics to zero (useful for testing).

## Configuration

### Environment Variables

```bash
# Auto-start scheduler on import
AUTO_START_SCHEDULER=true

# Redis connection (required for BullMQ)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your-password

# Queue configuration
QUEUE_CONCURRENCY=5
```

### Polling Interval

Default: 60 seconds

To change, modify `POLL_INTERVAL_MS` in `scheduler.ts`:

```typescript
const POLL_INTERVAL_MS = 30 * 1000; // 30 seconds
```

### Max Tasks Per Check

Default: 100 tasks

To change, modify `MAX_TASKS_PER_CHECK` in `scheduler.ts`:

```typescript
const MAX_TASKS_PER_CHECK = 50;
```

## Error Handling

### Invalid Cron Expressions

Tasks with invalid cron expressions are:

1. Logged as errors
2. Skipped from execution
3. Marked as `status='failed'` in database
4. Include error message in `error_message` field

### Failed Queue Additions

If a task fails to queue:

1. Retried up to 3 times with exponential backoff
2. Logged as error if all retries fail
3. Counted in `tasksFailed` metric
4. Scheduler continues with next task

### High Failure Rate

If more than 10 tasks fail cumulatively, a warning is logged:

```
[AgentScheduler] WARNING: High failure rate detected (15 total failures)
```

## Monitoring

### Metrics

Track scheduler performance:

```typescript
const metrics = agentScheduler.getMetrics();
console.log({
  checksPerformed: metrics.checksPerformed,
  tasksQueued: metrics.tasksQueued,
  tasksFailed: metrics.tasksFailed,
  successRate:
    (metrics.tasksQueued / (metrics.tasksQueued + metrics.tasksFailed)) * 100,
});
```

### Logging

All scheduler events are logged with `[AgentScheduler]` prefix:

```
[AgentScheduler] Starting scheduler...
[AgentScheduler] Scheduler started (polling every 60s)
[AgentScheduler] Checking for due scheduled tasks...
[AgentScheduler] Found 3 tasks to queue
[AgentScheduler] Task abc123 queued. Next run: 2025-10-09T00:00:00Z
[AgentScheduler] Check complete: 3 queued, 0 failed (123ms)
```

## Integration with Task Queue

The scheduler uses `agentTaskQueue` from `./task-queue.ts`:

```typescript
import { agentTaskQueue } from "./task-queue";

// Queue task
await agentTaskQueue.addTask(taskId, priority);
```

Tasks are executed by `agentOrchestrator` via the BullMQ worker.

## Graceful Shutdown

The scheduler handles process termination signals:

```typescript
process.on("SIGTERM", () => {
  await agentScheduler.stop();
  process.exit(0);
});
```

Shutdown process:

1. Stop accepting new checks
2. Complete current check if in progress
3. Clear polling interval
4. Exit cleanly

## Testing

Run tests:

```bash
npm test lib/ai-agents/__tests__/scheduler.test.ts
```

Test coverage:

- Lifecycle management (start/stop)
- Cron validation
- Next run calculation
- Timezone handling
- Metrics tracking
- Error handling
- Integration with cron-parser

## Production Deployment

### Vercel / Serverless

For serverless platforms, use API endpoints:

```typescript
// app/api/cron/route.ts
export async function GET() {
  await agentScheduler.checkScheduledTasks();
  return Response.json({ success: true });
}
```

Configure Vercel cron:

```json
{
  "crons": [
    {
      "path": "/api/cron",
      "schedule": "* * * * *"
    }
  ]
}
```

### Long-running Process

For traditional servers, start scheduler in background:

```typescript
// server.ts
import { agentScheduler } from "@/lib/ai-agents/scheduler";

async function main() {
  await agentScheduler.start();
  // ... rest of server setup
}

main();
```

## Troubleshooting

### Scheduler Not Polling

Check that scheduler is running:

```typescript
const status = agentScheduler.getStatus();
if (!status.isRunning) {
  await agentScheduler.start();
}
```

### Tasks Not Being Queued

1. Verify task has correct fields:
   - `task_type = 'scheduled'`
   - `status = 'pending'`
   - `next_run_at <= NOW()`

2. Check scheduler logs for errors

3. Manually trigger check:
   ```bash
   POST /api/ai-agents/scheduler/check
   ```

### Incorrect Next Run Times

1. Verify timezone is valid
2. Check cron expression is correct
3. Use validation endpoint to preview:
   ```bash
   POST /api/ai-agents/scheduler/validate
   ```

### High Failure Rate

1. Check database connection
2. Verify Redis is running (for BullMQ)
3. Review task configurations
4. Check logs for specific errors

## License

MIT

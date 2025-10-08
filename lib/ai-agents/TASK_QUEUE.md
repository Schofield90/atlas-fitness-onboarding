# AI Agent Task Queue System

Production-ready BullMQ-based task queue for background AI agent execution with scheduling, retry logic, and monitoring.

## Architecture

```
┌─────────────┐
│   Supabase  │  ← Tasks stored in ai_agent_tasks table
│  Database   │
└──────┬──────┘
       │
       ├─→ Task created with status='pending'
       │
┌──────▼──────────┐
│  AgentTaskQueue │  ← Queue manager
│   (task-queue)  │
└──────┬──────────┘
       │
       ├─→ Add to BullMQ queue (Redis)
       │   Update status='queued'
       │
┌──────▼──────────┐
│   BullMQ Worker │  ← Processes jobs concurrently
│                 │
└──────┬──────────┘
       │
       ├─→ Update status='running'
       │
┌──────▼──────────┐
│  AgentOrchestrator │  ← Executes AI agent
│   (orchestrator)    │
└──────┬──────────┘
       │
       ├─→ Call OpenAI/Anthropic API
       │   Execute tools if needed
       │
┌──────▼──────────┐
│    Database     │  ← Update result
│   & Logs        │   status='completed' or 'failed'
└─────────────────┘
```

## Features

### ✅ Background Task Execution

- Asynchronous task processing
- Concurrent execution with configurable workers
- Priority-based job ordering
- Delayed task execution

### ✅ Scheduling System

- Cron-based recurring tasks
- Automatic re-queuing on schedule
- Timezone support
- Next run time calculation

### ✅ Retry & Error Handling

- Exponential backoff retry strategy
- Configurable max retries per task
- Dead letter queue for failed jobs
- Detailed error logging

### ✅ Monitoring & Observability

- Real-time queue statistics
- Job lifecycle event logging
- Stalled job detection
- Performance metrics

### ✅ Graceful Shutdown

- SIGTERM/SIGINT signal handling
- Wait for active jobs to complete
- Clean Redis connection closure

## Installation

```bash
# Dependencies already installed
npm install bullmq ioredis node-cron
```

## Environment Variables

```bash
# Redis connection (required)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password  # Optional

# Queue configuration (optional)
QUEUE_CONCURRENCY=5  # Number of concurrent workers
```

## Usage

### 1. Import the Queue

```typescript
import { agentTaskQueue } from "@/lib/ai-agents/task-queue";
```

### 2. Add an Ad-Hoc Task

```typescript
// Create task in database
const { data: task } = await supabase
  .from("ai_agent_tasks")
  .insert({
    agent_id: "uuid-of-agent",
    organization_id: "uuid-of-org",
    title: "Generate financial report",
    description: "Analyze revenue for last week",
    task_type: "adhoc",
    context: { report_type: "weekly" },
    status: "pending",
    priority: 5,
  })
  .select()
  .single();

// Add to queue
await agentTaskQueue.addTask(
  task.id,
  5, // priority (0-10, higher = more urgent)
  0, // delay in ms (0 = immediate)
);
```

### 3. Schedule Recurring Task

```typescript
// Create scheduled task
const { data: task } = await supabase
  .from("ai_agent_tasks")
  .insert({
    agent_id: "uuid-of-agent",
    organization_id: "uuid-of-org",
    title: "Monday morning report",
    task_type: "scheduled",
    status: "pending",
    priority: 7,
    schedule_timezone: "America/New_York",
  })
  .select()
  .single();

// Schedule with cron expression
await agentTaskQueue.addScheduledTask(
  task.id,
  "0 9 * * 1", // Every Monday at 9:00 AM
);
```

### 4. Monitor Queue

```typescript
const stats = await agentTaskQueue.getQueueStats();

console.log("Queue Status:");
console.log(`- Waiting: ${stats.waiting}`);
console.log(`- Active: ${stats.active}`);
console.log(`- Completed: ${stats.completed}`);
console.log(`- Failed: ${stats.failed}`);
console.log(`- Delayed: ${stats.delayed}`);
console.log(`- Paused: ${stats.paused}`);
```

### 5. Pause/Resume Queue

```typescript
// Pause for maintenance
await agentTaskQueue.pauseQueue();

// Resume after maintenance
await agentTaskQueue.resumeQueue();
```

## Cron Expression Reference

| Expression     | Description                    |
| -------------- | ------------------------------ |
| `* * * * *`    | Every minute                   |
| `0 * * * *`    | Every hour                     |
| `0 9 * * *`    | Every day at 9:00 AM           |
| `0 9 * * 1`    | Every Monday at 9:00 AM        |
| `0 0 1 * *`    | First day of month at midnight |
| `0 17 * * 1-5` | Every weekday at 5:00 PM       |
| `*/15 * * * *` | Every 15 minutes               |
| `0 0 * * 0`    | Every Sunday at midnight       |

Format: `minute hour day month weekday`

- minute: 0-59
- hour: 0-23
- day: 1-31
- month: 1-12
- weekday: 0-6 (0=Sunday)

## Task Lifecycle

```
pending → queued → running → completed
                          ↘ failed (retry) → failed (max retries)
```

1. **pending**: Task created, not yet queued
2. **queued**: Added to Redis queue, waiting for worker
3. **running**: Worker processing task
4. **completed**: Task finished successfully
5. **failed**: Task failed (will retry if retries remaining)

## Configuration

### Queue Options

Configured in `task-queue.ts`:

```typescript
{
  attempts: 3,                    // Max retry attempts
  backoff: {
    type: 'exponential',          // Retry delay strategy
    delay: 2000                   // Initial delay (2 seconds)
  },
  removeOnComplete: {
    age: 86400,                   // Keep 24 hours
    count: 1000                   // Keep last 1000
  },
  removeOnFail: {
    age: 604800,                  // Keep 7 days
    count: 5000                   // Keep last 5000
  }
}
```

### Worker Options

```typescript
{
  concurrency: 5,                 // Process 5 jobs simultaneously
  limiter: {
    max: 100,                     // Max 100 jobs
    duration: 60000               // Per minute
  }
}
```

## Event Logging

The queue logs the following events:

### ✅ Completed Jobs

```
[AgentTaskQueue] ✓ Job task-uuid completed
```

### ❌ Failed Jobs

```
[AgentTaskQueue] ✗ Job task-uuid failed: Error message
[AgentTaskQueue] ⚠ Job task-uuid moved to dead letter queue after 3 attempts
```

### ⚠️ Stalled Jobs

```
[AgentTaskQueue] ⚠ Job task-uuid stalled - worker may have crashed
```

### ℹ️ Queue Operations

```
[AgentTaskQueue] Task task-uuid added to queue (priority: 5, delay: 0ms)
[AgentTaskQueue] Queue paused
[AgentTaskQueue] Queue resumed
```

## Error Handling

### Retry Strategy

Tasks are retried with exponential backoff:

- Attempt 1: Immediate
- Attempt 2: 2 seconds delay
- Attempt 3: 4 seconds delay
- Max: 3 attempts (configurable per task)

### Dead Letter Queue

After max retries, failed jobs are:

1. Moved to failed queue
2. Logged with full error details
3. Retained for 7 days
4. Accessible for manual inspection

### Monitoring Failures

```typescript
// Get failed jobs
const job = await agentTaskQueue.getJob("task-uuid");

if (job?.failedReason) {
  console.error("Job failed:", job.failedReason);
  console.error("Stack trace:", job.stacktrace);
}

// Retry failed job manually
await agentTaskQueue.retryJob("task-uuid");
```

## Best Practices

### 1. Set Appropriate Priorities

- **9-10**: Critical (payment failures, security alerts)
- **7-8**: High (member retention, time-sensitive reports)
- **5-6**: Medium (scheduled reports, daily tasks)
- **3-4**: Low (bulk operations, cleanup)
- **1-2**: Background (analytics, non-urgent)

### 2. Use Delays for Rate Limiting

```typescript
// Avoid API rate limits - spread tasks over time
for (let i = 0; i < members.length; i++) {
  await agentTaskQueue.addTask(
    taskId,
    5,
    i * 1000, // 1 second between each task
  );
}
```

### 3. Monitor Queue Health

```typescript
// Check queue health periodically
setInterval(async () => {
  const stats = await agentTaskQueue.getQueueStats();

  // Alert if too many failures
  if (stats.failed > 100) {
    console.error("High failure rate detected!");
    // Send alert to ops team
  }

  // Alert if queue is backed up
  if (stats.waiting > 1000) {
    console.warn("Queue backlog detected!");
    // Consider scaling workers
  }
}, 60000); // Every minute
```

### 4. Graceful Shutdown

The queue automatically handles shutdown signals:

```bash
# In production
kill -SIGTERM <process-id>

# Locally (Ctrl+C)
# Queue will finish active jobs before exiting
```

## Troubleshooting

### Queue Not Processing Tasks

1. Check Redis connection:

   ```bash
   redis-cli ping
   ```

2. Verify environment variables:

   ```bash
   echo $REDIS_HOST
   echo $REDIS_PORT
   ```

3. Check worker status:
   ```typescript
   const stats = await agentTaskQueue.getQueueStats();
   console.log(stats);
   ```

### Tasks Failing Repeatedly

1. Check task error logs:

   ```typescript
   const job = await agentTaskQueue.getJob(taskId);
   console.log(job?.failedReason);
   ```

2. Verify agent configuration:
   - Check API keys (OpenAI, Anthropic)
   - Verify agent exists in database
   - Check allowed_tools permissions

3. Review task context:
   - Ensure required fields are present
   - Validate data types
   - Check for circular references in JSON

### High Memory Usage

1. Clean up old jobs:

   ```typescript
   await agentTaskQueue.cleanupJobs();
   ```

2. Reduce retention periods in queue config
3. Increase concurrency if tasks are piling up

## Production Deployment

### Docker Compose

```yaml
services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data

  app:
    build: .
    environment:
      - REDIS_HOST=redis
      - REDIS_PORT=6379
      - QUEUE_CONCURRENCY=10
    depends_on:
      - redis

volumes:
  redis-data:
```

### Environment Setup

```bash
# Production
export REDIS_HOST=your-redis-cluster.cache.amazonaws.com
export REDIS_PORT=6379
export REDIS_PASSWORD=your-secure-password
export QUEUE_CONCURRENCY=20

# Development
export REDIS_HOST=localhost
export REDIS_PORT=6379
export QUEUE_CONCURRENCY=5
```

### Monitoring with Redis

```bash
# Monitor queue activity
redis-cli MONITOR

# Check queue size
redis-cli LLEN bull:ai-agent-tasks:wait

# View job data
redis-cli GET bull:ai-agent-tasks:task-uuid
```

## API Reference

### AgentTaskQueue

#### `addTask(taskId, priority, delay)`

Add task to queue for immediate or delayed execution.

**Parameters:**

- `taskId` (string): UUID of task from database
- `priority` (number): 0-10, higher = more urgent
- `delay` (number): Delay in milliseconds

**Returns:** Promise<Job>

#### `addScheduledTask(taskId, cronExpression)`

Schedule recurring task with cron expression.

**Parameters:**

- `taskId` (string): UUID of task from database
- `cronExpression` (string): Cron format schedule

**Returns:** Promise<void>

#### `getQueueStats()`

Get current queue statistics.

**Returns:** Promise<QueueStats>

#### `pauseQueue()`

Stop processing new jobs (active jobs continue).

**Returns:** Promise<void>

#### `resumeQueue()`

Resume processing jobs.

**Returns:** Promise<void>

#### `getJob(jobId)`

Get job details by ID.

**Returns:** Promise<Job | undefined>

#### `removeJob(jobId)`

Remove job from queue.

**Returns:** Promise<void>

#### `retryJob(jobId)`

Retry failed job.

**Returns:** Promise<void>

#### `cleanupJobs()`

Remove old completed and failed jobs.

**Returns:** Promise<void>

## License

MIT

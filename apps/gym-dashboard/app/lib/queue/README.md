# Enhanced BullMQ Queue System for Atlas Fitness CRM

A comprehensive, production-ready queue system built on BullMQ with Redis, designed specifically for the Atlas Fitness CRM workflow automation platform.

## Features

### Core Capabilities
- 🚀 **High-Performance Processing** - Optimized for high-throughput workflow execution
- 🔄 **Auto-Retry Logic** - Intelligent retry mechanisms with exponential backoff
- 🏥 **Health Monitoring** - Comprehensive system health checks and alerts
- 📊 **Analytics & Metrics** - Real-time performance tracking and reporting
- 🛡️ **Error Handling** - Robust error handling with escalation and dead letter queues
- 🔧 **Graceful Shutdown** - Clean shutdown procedures for safe deployments
- 📱 **Multi-Channel Communications** - Email, SMS, and WhatsApp processing
- 🔍 **Monitoring Dashboard** - Built-in queue monitoring and management

### Queue Types
1. **Workflow Triggers** - Process workflow trigger events
2. **Workflow Actions** - Execute workflow nodes and actions
3. **Scheduled Tasks** - Handle delayed and scheduled executions
4. **Communications** - Email, SMS, and WhatsApp messaging
5. **Analytics** - Performance tracking and reporting
6. **System Health** - Health checks and system monitoring
7. **Error Handling** - Retry logic and error escalation

## Installation & Setup

### Prerequisites
- Node.js 18+ 
- Redis 6+
- Supabase (PostgreSQL database)
- Environment variables configured

### Environment Variables

```bash
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password
REDIS_DB=0
REDIS_TLS=false
REDIS_USERNAME=default

# Redis Cluster (optional)
REDIS_CLUSTER_NODES=host1:port1,host2:port2,host3:port3

# Queue Configuration
QUEUE_PREFIX=dev  # or 'prod' for production
NODE_ENV=development

# Database
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Communication Services
SENDGRID_API_KEY=your_sendgrid_key
RESEND_API_KEY=your_resend_key
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_PHONE_NUMBER=your_twilio_phone

# System Configuration
DEFAULT_FROM_EMAIL=noreply@yourdomain.com
ADMIN_EMAIL=admin@yourdomain.com
```

### Basic Setup

```typescript
import { initializeQueueSystem, shutdownQueueSystem } from '@/app/lib/queue';

// Initialize the complete queue system
await initializeQueueSystem();

// Your application code here...

// Graceful shutdown
process.on('SIGTERM', async () => {
  await shutdownQueueSystem();
  process.exit(0);
});
```

## Usage Examples

### Triggering Workflows

```typescript
import { QueueUtils } from '@/app/lib/queue';

// Trigger a workflow
const job = await QueueUtils.triggerWorkflow(
  'org_123',
  'lead_created',
  {
    lead: {
      id: 'lead_456',
      email: 'john@example.com',
      name: 'John Doe'
    }
  },
  {
    priority: 1, // High priority
    metadata: { source: 'api' }
  }
);

console.log('Workflow triggered:', job.id);
```

### Sending Communications

```typescript
// Send email
await QueueUtils.sendEmail(
  'org_123',
  {
    to: 'customer@example.com',
    subject: 'Welcome to Atlas Fitness!',
    template: 'welcome_email',
    templateData: {
      firstName: 'John',
      gymName: 'Atlas Fitness Downtown'
    }
  },
  {
    priority: 2,
    trackingId: 'welcome_campaign_001'
  }
);

// Send SMS
await QueueUtils.sendSMS(
  'org_123',
  {
    to: '+1234567890',
    message: 'Your workout session starts in 30 minutes!'
  },
  {
    priority: 1 // High priority for time-sensitive messages
  }
);

// Bulk communications
await QueueUtils.scheduleBulkCommunication(
  'org_123',
  'email',
  [
    { to: 'member1@example.com', personalizedData: { name: 'Alice' } },
    { to: 'member2@example.com', personalizedData: { name: 'Bob' } }
  ],
  {
    subject: 'Hello {{name}}!',
    templateName: 'monthly_newsletter'
  },
  {
    batchSize: 25,
    delayBetweenBatches: 2000 // 2 seconds
  }
);
```

### Scheduling Tasks

```typescript
// Schedule workflow execution
await QueueUtils.scheduleWorkflowExecution(
  'workflow_789',
  'org_123',
  { reminder: 'class_tomorrow' },
  24 * 60 * 60 * 1000, // 24 hours from now
  {
    priority: 3,
    context: { reminderType: 'class' }
  }
);

// Create recurring job
await QueueUtils.createCronJob(
  QUEUE_NAMES.WORKFLOW_CLEANUP,
  JOB_TYPES.CLEANUP_OLD_EXECUTIONS,
  '0 2 * * *', // Daily at 2 AM
  { retentionDays: 30 },
  { jobId: 'daily_cleanup' }
);
```

### Analytics & Monitoring

```typescript
// Track custom analytics
await QueueUtils.trackAnalytics(
  'org_123',
  'workflow_completed',
  {
    workflowId: 'workflow_789',
    duration: 5420,
    nodesExecuted: 8,
    success: true
  },
  {
    type: 'workflow',
    userId: 'user_456'
  }
);

// Generate reports
await QueueUtils.generateReport(
  'org_123',
  'workflow_performance',
  {
    start: '2024-01-01T00:00:00Z',
    end: '2024-01-31T23:59:59Z'
  },
  {
    recipients: ['admin@yourdomain.com'],
    format: 'pdf'
  }
);

// Get system health
const systemHealth = await QueueUtils.getSystemHealth();
console.log('System Status:', systemHealth);
```

### Error Handling

```typescript
// Report errors for centralized handling
await QueueUtils.reportError(
  'org_123',
  'job_failure',
  'email-processor',
  'send_email',
  'SMTP connection timeout',
  {
    jobId: 'job_123',
    recipient: 'user@example.com'
  },
  'high'
);

// Manually retry failed job
await QueueUtils.retryFailedJob(
  'failed_job_456',
  'org_123',
  {
    priority: 1,
    delay: 5000 // Retry after 5 seconds
  }
);
```

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Enhanced Queue System                    │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────┐    │
│  │   Redis     │  │    Queue     │  │    Workers      │    │
│  │ Connection  │──│   Manager    │──│    Manager      │    │
│  │   Manager   │  │              │  │                 │    │
│  └─────────────┘  └──────────────┘  └─────────────────┘    │
├─────────────────────────────────────────────────────────────┤
│                        Processors                           │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────┐    │
│  │  Workflow   │  │ Communication│  │   Analytics     │    │
│  │ Execution   │  │   Processor  │  │   Processor     │    │
│  │ Processor   │  │              │  │                 │    │
│  └─────────────┘  └──────────────┘  └─────────────────┘    │
│                                                             │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────┐    │
│  │   Retry     │  │    Health    │  │   Utilities     │    │
│  │ Processor   │  │   Monitor    │  │   & Helpers     │    │
│  │             │  │              │  │                 │    │
│  └─────────────┘  └──────────────┘  └─────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### Queue Flow

```
Trigger Event → Workflow Queue → Action Queues → Communication Queues
      ↓               ↓               ↓                    ↓
 Trigger         Workflow        Node/Action          Email/SMS
Processor       Processor        Processor           Processor
      ↓               ↓               ↓                    ↓
Analytics ← Analytics ← Analytics ← Analytics ← Analytics Queue
```

### Error Handling Flow

```
Job Failure → Retry Logic → Max Retries? → Dead Letter Queue
     ↓              ↓             ↓              ↓
Error Logger → Retry Queue → Error Queue → Alert System
     ↓              ↓             ↓              ↓
 Database    → Exponential → Escalation → Notifications
              Backoff      Handler      (Email/SMS/Webhook)
```

## Configuration

### Queue Priorities

```typescript
export const JOB_PRIORITIES = {
  CRITICAL: 1,    // System critical operations
  HIGH: 2,        // User-facing operations
  NORMAL: 3,      // Standard workflows
  LOW: 4,         // Analytics, reporting
  BACKGROUND: 5,  // Cleanup, maintenance
};
```

### Retry Strategies

```typescript
export const RETRY_STRATEGIES = {
  send_email: {
    attempts: 5,
    backoff: { type: 'exponential', delay: 2000 }
  },
  send_sms: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 }
  },
  execute_workflow: {
    attempts: 5,
    backoff: { type: 'exponential', delay: 3000 }
  }
};
```

### Health Thresholds

```typescript
export const HEALTH_THRESHOLDS = {
  QUEUE_SIZE_WARNING: 1000,
  QUEUE_SIZE_CRITICAL: 5000,
  FAILED_JOBS_WARNING: 50,
  FAILED_JOBS_CRITICAL: 200,
  STALLED_JOBS_WARNING: 10,
  STALLED_JOBS_CRITICAL: 50,
};
```

## Monitoring

### Health Checks

The system performs regular health checks on:
- Redis connectivity and performance
- Database connectivity and query performance  
- Queue sizes and job statuses
- Worker processes and memory usage
- System resources (CPU, memory, disk)

### Metrics Collection

- **Job Metrics**: Success/failure rates, processing times, queue depths
- **Performance Metrics**: Response times, throughput, error rates
- **System Metrics**: Memory usage, CPU utilization, connection health
- **Business Metrics**: Workflow completion rates, communication delivery rates

### Alerts

The system generates alerts for:
- Queue size thresholds exceeded
- High error rates
- System resource exhaustion
- Connection failures
- Performance degradation

## Best Practices

### Job Design
- Keep job data minimal and serializable
- Use idempotent operations where possible
- Implement proper timeout handling
- Add correlation IDs for tracking

### Error Handling
- Use structured error messages
- Include context for debugging
- Implement circuit breakers for external services
- Set up appropriate retry policies

### Performance
- Use bulk operations for multiple similar jobs
- Implement proper concurrency limits
- Monitor and tune worker concurrency
- Use appropriate job priorities

### Security
- Validate all job data
- Implement proper authentication for queue operations
- Use encrypted connections (Redis TLS)
- Sanitize data before processing

## Deployment

### Production Checklist

- [ ] Redis configured with persistence and high availability
- [ ] Environment variables properly set
- [ ] Health check endpoints configured
- [ ] Monitoring and alerting set up
- [ ] Log aggregation configured
- [ ] Backup strategies in place
- [ ] Performance baselines established
- [ ] Security review completed

### Scaling Considerations

- **Horizontal Scaling**: Add more worker processes across multiple servers
- **Vertical Scaling**: Increase Redis memory and worker concurrency
- **Queue Partitioning**: Use different Redis instances for different queue types
- **Geographic Distribution**: Deploy workers closer to data sources

### Monitoring in Production

- Set up dashboards for key metrics
- Configure alerts for critical thresholds
- Implement log aggregation and analysis
- Monitor Redis performance and memory usage
- Track job processing latencies and error rates

## Troubleshooting

### Common Issues

1. **High Queue Depths**
   - Increase worker concurrency
   - Check for stuck jobs
   - Verify Redis performance
   - Review job complexity

2. **Connection Failures**
   - Check Redis server status
   - Verify network connectivity
   - Review connection pool settings
   - Check authentication credentials

3. **Memory Issues**
   - Monitor Redis memory usage
   - Clean up old completed jobs
   - Adjust job retention policies
   - Check for memory leaks in processors

4. **Performance Issues**
   - Profile job processing times
   - Review database query performance
   - Check external service latencies
   - Optimize job data structures

### Debug Mode

Enable debug logging by setting:

```bash
DEBUG=queue:*
LOG_LEVEL=debug
```

### Emergency Procedures

```typescript
import { emergencyRecovery, shutdownQueueSystem } from '@/app/lib/queue';

// Emergency recovery
await emergencyRecovery();

// Emergency shutdown
await shutdownQueueSystem();
```

## API Reference

### QueueUtils Methods

See the [QueueUtils documentation](./utils/queue-utils.ts) for complete API reference.

### Event Handlers

```typescript
// Worker events
worker.on('completed', (job, result) => {});
worker.on('failed', (job, err) => {});
worker.on('stalled', (jobId) => {});

// Queue events
queue.on('error', (error) => {});
queue.on('waiting', (job) => {});
queue.on('active', (job) => {});
```

## Contributing

1. Follow TypeScript strict mode
2. Add comprehensive error handling
3. Include unit tests for processors
4. Update documentation for new features
5. Follow the existing code patterns
6. Add monitoring for new job types

## License

This queue system is part of the Atlas Fitness CRM platform and is proprietary software.
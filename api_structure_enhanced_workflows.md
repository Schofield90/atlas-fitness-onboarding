# Enhanced Workflow System API Structure

## Overview

This document defines the comprehensive API structure for the enhanced workflow automation system in Atlas Fitness CRM. The API supports workflow creation, execution, monitoring, and management with advanced features like templates, analytics, and webhook management.

## Base URL Structure

```
/api/v2/workflows/          # Enhanced workflow management
/api/v2/templates/          # Workflow templates
/api/v2/triggers/           # Trigger management
/api/v2/actions/            # Action definitions
/api/v2/analytics/          # Workflow analytics
/api/v2/webhooks/          # Webhook management
/api/v2/queue/             # Execution queue management
```

## Core Workflow Management APIs

### 1. Workflows CRUD

#### GET /api/v2/workflows
Get all workflows for the organization

```typescript
interface WorkflowListParams {
  status?: 'draft' | 'active' | 'paused' | 'archived';
  category?: string;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: 'name' | 'created_at' | 'last_run_at' | 'usage_count';
  sortOrder?: 'asc' | 'desc';
  tags?: string[];
}

interface WorkflowListResponse {
  workflows: WorkflowSummary[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  filters: {
    categories: string[];
    tags: string[];
    statuses: WorkflowStatus[];
  };
}
```

#### POST /api/v2/workflows
Create a new workflow

```typescript
interface CreateWorkflowRequest {
  name: string;
  description?: string;
  category?: string;
  templateId?: string;
  workflowData: WorkflowData;
  triggerType: string;
  triggerConfig: Record<string, any>;
  settings: WorkflowSettings;
  tags?: string[];
  status?: 'draft' | 'active';
}

interface CreateWorkflowResponse {
  workflow: Workflow;
  validationResults: ValidationResult[];
  estimatedPerformance: PerformanceEstimate;
}
```

#### GET /api/v2/workflows/{id}
Get specific workflow details

```typescript
interface WorkflowDetailsResponse {
  workflow: Workflow;
  triggers: WorkflowTrigger[];
  variables: WorkflowVariable[];
  analytics: WorkflowAnalyticsSummary;
  recentExecutions: ExecutionSummary[];
  performance: PerformanceMetrics;
}
```

#### PUT /api/v2/workflows/{id}
Update workflow

```typescript
interface UpdateWorkflowRequest {
  name?: string;
  description?: string;
  workflowData?: WorkflowData;
  triggerConfig?: Record<string, any>;
  settings?: WorkflowSettings;
  status?: WorkflowStatus;
  tags?: string[];
}

interface UpdateWorkflowResponse {
  workflow: Workflow;
  validationResults: ValidationResult[];
  migrationWarnings?: string[];
}
```

#### DELETE /api/v2/workflows/{id}
Delete workflow (soft delete with archive)

```typescript
interface DeleteWorkflowResponse {
  success: boolean;
  archivedWorkflow: ArchivedWorkflow;
  affectedExecutions: number;
}
```

### 2. Workflow Execution

#### POST /api/v2/workflows/{id}/execute
Execute workflow manually

```typescript
interface ExecuteWorkflowRequest {
  inputData?: Record<string, any>;
  triggerData?: Record<string, any>;
  priority?: number; // 1-10
  scheduledAt?: string; // ISO datetime
  context?: ExecutionContext;
  testMode?: boolean;
}

interface ExecuteWorkflowResponse {
  executionId: string;
  status: 'queued' | 'started';
  estimatedDuration: number; // milliseconds
  queuePosition?: number;
}
```

#### GET /api/v2/workflows/{id}/executions
Get execution history

```typescript
interface ExecutionHistoryParams {
  status?: ExecutionStatus;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

interface ExecutionHistoryResponse {
  executions: WorkflowExecution[];
  analytics: {
    totalExecutions: number;
    successRate: number;
    avgExecutionTime: number;
    failureReasons: FailureReason[];
  };
  pagination: PaginationInfo;
}
```

#### GET /api/v2/workflows/{id}/executions/{executionId}
Get detailed execution information

```typescript
interface ExecutionDetailsResponse {
  execution: WorkflowExecution;
  steps: ExecutionStep[];
  timeline: ExecutionTimeline[];
  performance: ExecutionPerformance;
  logs: ExecutionLog[];
  debugInfo?: DebugInfo;
}
```

### 3. Workflow Validation & Testing

#### POST /api/v2/workflows/{id}/validate
Validate workflow configuration

```typescript
interface ValidateWorkflowRequest {
  workflowData?: WorkflowData;
  testData?: Record<string, any>;
}

interface ValidateWorkflowResponse {
  isValid: boolean;
  warnings: ValidationWarning[];
  errors: ValidationError[];
  suggestions: OptimizationSuggestion[];
  estimatedPerformance: PerformanceEstimate;
}
```

#### POST /api/v2/workflows/{id}/test
Test workflow execution

```typescript
interface TestWorkflowRequest {
  testData: Record<string, any>;
  stepByStep?: boolean;
  mockExternalServices?: boolean;
}

interface TestWorkflowResponse {
  testExecutionId: string;
  results: TestExecutionResult[];
  performance: TestPerformanceMetrics;
  logs: TestExecutionLog[];
}
```

## Template Management APIs

### 1. Template Operations

#### GET /api/v2/templates
Get available templates

```typescript
interface TemplateListParams {
  category?: string;
  isPublic?: boolean;
  featured?: boolean;
  search?: string;
  tags?: string[];
  sortBy?: 'name' | 'usage_count' | 'rating' | 'created_at';
}

interface TemplateListResponse {
  templates: WorkflowTemplate[];
  categories: TemplateCategory[];
  featuredTemplates: WorkflowTemplate[];
  pagination: PaginationInfo;
}
```

#### POST /api/v2/templates
Create template from workflow

```typescript
interface CreateTemplateRequest {
  workflowId?: string;
  name: string;
  description: string;
  category: string;
  workflowData?: WorkflowData;
  previewImage?: string;
  isPublic?: boolean;
  tags?: string[];
  requiredVariables?: TemplateVariable[];
}

interface CreateTemplateResponse {
  template: WorkflowTemplate;
  validationResults: ValidationResult[];
}
```

#### POST /api/v2/templates/{id}/instantiate
Create workflow from template

```typescript
interface InstantiateTemplateRequest {
  name: string;
  description?: string;
  variableValues: Record<string, any>;
  customizations?: TemplateCustomization[];
}

interface InstantiateTemplateResponse {
  workflow: Workflow;
  appliedCustomizations: AppliedCustomization[];
  warnings?: string[];
}
```

## Trigger Management APIs

### 1. Trigger Definitions

#### GET /api/v2/triggers/definitions
Get available trigger types

```typescript
interface TriggerDefinitionsResponse {
  triggers: TriggerDefinition[];
  categories: TriggerCategory[];
  customTriggers: CustomTriggerDefinition[];
}
```

#### GET /api/v2/triggers/{workflowId}
Get triggers for specific workflow

```typescript
interface WorkflowTriggersResponse {
  triggers: WorkflowTrigger[];
  webhookEndpoints: WebhookEndpoint[];
  scheduledTriggers: ScheduledTrigger[];
}
```

#### POST /api/v2/triggers/{workflowId}
Create new trigger

```typescript
interface CreateTriggerRequest {
  triggerType: string;
  triggerName: string;
  config: Record<string, any>;
  scheduleType?: 'immediate' | 'scheduled' | 'recurring' | 'cron';
  cronExpression?: string;
  webhookConfig?: WebhookConfig;
}

interface CreateTriggerResponse {
  trigger: WorkflowTrigger;
  webhookEndpoint?: string;
  validationResults: ValidationResult[];
}
```

### 2. Webhook Management

#### GET /api/v2/webhooks
Get all webhook endpoints

```typescript
interface WebhookListResponse {
  webhooks: WorkflowWebhook[];
  statistics: WebhookStatistics;
}
```

#### POST /api/v2/webhooks
Create webhook endpoint

```typescript
interface CreateWebhookRequest {
  name: string;
  workflowId?: string;
  allowedOrigins?: string[];
  rateLimit?: number;
  transformPayload?: PayloadTransform;
  filterConditions?: FilterCondition[];
}

interface CreateWebhookResponse {
  webhook: WorkflowWebhook;
  endpointUrl: string;
  secretKey: string;
  testInstructions: WebhookTestInfo;
}
```

#### POST /api/v2/webhooks/{endpointId}/test
Test webhook endpoint

```typescript
interface TestWebhookRequest {
  payload: Record<string, any>;
  headers?: Record<string, string>;
}

interface TestWebhookResponse {
  success: boolean;
  processedPayload: Record<string, any>;
  triggeredWorkflows: string[];
  logs: WebhookLog[];
}
```

## Action Management APIs

### 1. Action Definitions

#### GET /api/v2/actions/definitions
Get available action types

```typescript
interface ActionDefinitionsResponse {
  actions: ActionDefinition[];
  categories: ActionCategory[];
  customActions: CustomActionDefinition[];
  integrations: IntegrationDefinition[];
}
```

#### POST /api/v2/actions/test/{actionType}
Test action execution

```typescript
interface TestActionRequest {
  config: Record<string, any>;
  inputData: Record<string, any>;
  mockMode?: boolean;
}

interface TestActionResponse {
  success: boolean;
  output: Record<string, any>;
  logs: ActionLog[];
  performance: ActionPerformance;
}
```

## Analytics APIs

### 1. Workflow Analytics

#### GET /api/v2/analytics/workflows/{id}
Get workflow analytics

```typescript
interface WorkflowAnalyticsParams {
  startDate: string;
  endDate: string;
  granularity?: 'hour' | 'day' | 'week' | 'month';
  metrics?: string[];
}

interface WorkflowAnalyticsResponse {
  overview: AnalyticsOverview;
  timeSeries: TimeSeriesData[];
  performance: PerformanceAnalytics;
  errors: ErrorAnalytics;
  trends: TrendAnalysis;
}
```

#### GET /api/v2/analytics/organization
Get organization-wide analytics

```typescript
interface OrganizationAnalyticsResponse {
  summary: OrganizationAnalyticsSummary;
  topWorkflows: TopWorkflowMetrics[];
  systemHealth: SystemHealthMetrics;
  usage: UsageMetrics;
  recommendations: OptimizationRecommendation[];
}
```

### 2. Performance Monitoring

#### GET /api/v2/analytics/performance
Get system performance metrics

```typescript
interface PerformanceMetricsResponse {
  executionQueue: QueueMetrics;
  systemLoad: SystemLoadMetrics;
  databasePerformance: DatabaseMetrics;
  externalServices: ExternalServiceMetrics[];
  alerts: PerformanceAlert[];
}
```

## Queue Management APIs

### 1. Execution Queue

#### GET /api/v2/queue/status
Get queue status

```typescript
interface QueueStatusResponse {
  totalJobs: number;
  processingJobs: number;
  queuedJobs: number;
  failedJobs: number;
  workers: WorkerStatus[];
  estimatedWaitTime: number;
}
```

#### GET /api/v2/queue/jobs
Get queued jobs

```typescript
interface QueueJobsParams {
  status?: 'queued' | 'processing' | 'completed' | 'failed';
  priority?: number;
  workflowId?: string;
  page?: number;
  limit?: number;
}

interface QueueJobsResponse {
  jobs: QueueJob[];
  statistics: QueueStatistics;
  pagination: PaginationInfo;
}
```

#### POST /api/v2/queue/jobs/{jobId}/retry
Retry failed job

```typescript
interface RetryJobRequest {
  resetRetryCount?: boolean;
  newPriority?: number;
}

interface RetryJobResponse {
  success: boolean;
  newJobId: string;
  estimatedStartTime: string;
}
```

## Configuration APIs

### 1. System Configuration

#### GET /api/v2/config/triggers
Get trigger configuration options

```typescript
interface TriggerConfigResponse {
  availableTriggers: TriggerDefinition[];
  leadSources: LeadSource[];
  formsList: FormDefinition[];
  tagsList: TagDefinition[];
  customFields: CustomField[];
}
```

#### GET /api/v2/config/actions
Get action configuration options

```typescript
interface ActionConfigResponse {
  availableActions: ActionDefinition[];
  emailTemplates: EmailTemplate[];
  smsTemplates: SmsTemplate[];
  integrations: Integration[];
  customActions: CustomAction[];
}
```

### 2. Variables Management

#### GET /api/v2/workflows/{id}/variables
Get workflow variables

```typescript
interface WorkflowVariablesResponse {
  variables: WorkflowVariable[];
  globalVariables: GlobalVariable[];
  systemVariables: SystemVariable[];
  availableDataSources: DataSource[];
}
```

#### POST /api/v2/workflows/{id}/variables
Create/update workflow variable

```typescript
interface CreateVariableRequest {
  name: string;
  dataType: DataType;
  defaultValue?: any;
  description?: string;
  scope: 'workflow' | 'global' | 'execution';
  isSecret?: boolean;
  validationRules?: ValidationRule[];
}

interface CreateVariableResponse {
  variable: WorkflowVariable;
  conflicts: VariableConflict[];
}
```

## Error Handling

All APIs return consistent error responses:

```typescript
interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, any>;
    timestamp: string;
    requestId: string;
  };
  validation?: ValidationError[];
}

// Common error codes
const ErrorCodes = {
  WORKFLOW_NOT_FOUND: 'WORKFLOW_NOT_FOUND',
  INVALID_WORKFLOW_DATA: 'INVALID_WORKFLOW_DATA',
  EXECUTION_FAILED: 'EXECUTION_FAILED',
  TEMPLATE_NOT_FOUND: 'TEMPLATE_NOT_FOUND',
  WEBHOOK_INVALID: 'WEBHOOK_INVALID',
  QUEUE_FULL: 'QUEUE_FULL',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS'
} as const;
```

## Authentication & Authorization

All endpoints require authentication and organization-level authorization:

```typescript
// Headers required
{
  'Authorization': 'Bearer <jwt_token>',
  'X-Organization-ID': '<organization_uuid>',
  'Content-Type': 'application/json'
}

// Rate limiting
{
  'X-RateLimit-Limit': '1000',
  'X-RateLimit-Remaining': '999',
  'X-RateLimit-Reset': '1640995200'
}
```

## Webhook Endpoints

### Incoming Webhooks

#### POST /api/v2/webhooks/receive/{endpointId}
Receive external webhook

```typescript
interface WebhookReceiveRequest {
  // Flexible payload structure
  [key: string]: any;
}

interface WebhookReceiveResponse {
  success: boolean;
  workflowsTriggered: string[];
  processingTime: number;
}
```

### Outgoing Webhooks

#### POST /api/v2/webhooks/send
Send webhook (action execution)

```typescript
interface SendWebhookRequest {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  payload?: Record<string, any>;
  timeout?: number;
  retryConfig?: RetryConfig;
}

interface SendWebhookResponse {
  success: boolean;
  responseStatus: number;
  responseBody: any;
  timing: WebhookTiming;
}
```

## Real-time Features

### Server-Sent Events (SSE)

#### GET /api/v2/workflows/{id}/stream
Stream workflow execution updates

```typescript
// Event types
interface WorkflowEventStream {
  execution_started: ExecutionStartedEvent;
  step_completed: StepCompletedEvent;
  execution_completed: ExecutionCompletedEvent;
  execution_failed: ExecutionFailedEvent;
  workflow_updated: WorkflowUpdatedEvent;
}

// Usage
const eventSource = new EventSource('/api/v2/workflows/123/stream');
eventSource.addEventListener('step_completed', (event) => {
  const data: StepCompletedEvent = JSON.parse(event.data);
  // Update UI with step completion
});
```

## API Versioning

- **Version Strategy**: URL-based versioning (`/api/v2/`)
- **Backward Compatibility**: v1 endpoints remain available
- **Migration Path**: Gradual migration with feature flags
- **Documentation**: Version-specific OpenAPI specs

## Security Considerations

1. **Rate Limiting**: Implemented per organization and endpoint
2. **Input Validation**: Comprehensive validation on all inputs
3. **Output Sanitization**: Sensitive data filtering
4. **Audit Logging**: Complete API access logging
5. **Webhook Verification**: Signature verification for incoming webhooks
6. **Data Encryption**: Sensitive workflow data encrypted at rest

## Performance Optimization

1. **Caching**: Redis caching for frequent queries
2. **Pagination**: Consistent pagination across all list endpoints
3. **Compression**: Gzip compression for large responses
4. **Connection Pooling**: Optimized database connections
5. **Async Processing**: Background job processing for heavy operations

This comprehensive API structure provides a robust foundation for the enhanced workflow automation system while maintaining scalability, security, and ease of use.
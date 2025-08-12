// ========================================
// ENHANCED WORKFLOW AUTOMATION SYSTEM
// TypeScript Interfaces and Data Models
// ========================================

// Base Types
export type UUID = string;
export type ISO8601DateTime = string;
export type JSONValue = string | number | boolean | null | JSONObject | JSONArray;
export type JSONObject = { [key: string]: JSONValue };
export type JSONArray = JSONValue[];

// ========================================
// CORE WORKFLOW TYPES
// ========================================

export interface Workflow {
  id: UUID;
  organizationId: UUID;
  name: string;
  description?: string;
  status: WorkflowStatus;
  version: number;
  category: string;
  
  // Core workflow data
  workflowData: WorkflowData;
  
  // Configuration
  triggerType: string;
  triggerConfig: Record<string, JSONValue>;
  settings: WorkflowSettings;
  
  // Template information
  templateId?: UUID;
  isTemplate: boolean;
  templateName?: string;
  templateDescription?: string;
  
  // Metadata
  tags: string[];
  isPublic: boolean;
  usageCount: number;
  
  // Performance metrics
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  avgExecutionTimeMs: number;
  errorRate: number;
  performanceScore: number;
  lastRunAt?: ISO8601DateTime;
  
  // Audit fields
  createdBy?: UUID;
  updatedBy?: UUID;
  createdAt: ISO8601DateTime;
  updatedAt: ISO8601DateTime;
}

export type WorkflowStatus = 'draft' | 'active' | 'paused' | 'archived';

export interface WorkflowData {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  variables: WorkflowVariable[];
  viewport?: ViewportState;
  metadata?: WorkflowMetadata;
}

export interface WorkflowMetadata {
  version: string;
  schemaVersion: string;
  migrationInfo?: MigrationInfo;
  customProperties?: Record<string, JSONValue>;
}

export interface ViewportState {
  x: number;
  y: number;
  zoom: number;
}

export interface MigrationInfo {
  fromVersion: string;
  toVersion: string;
  migratedAt: ISO8601DateTime;
  warnings: string[];
}

// ========================================
// WORKFLOW NODE TYPES
// ========================================

export type NodeType = 
  // Basic node types
  | 'trigger' 
  | 'action' 
  | 'condition' 
  | 'wait' 
  | 'loop' 
  | 'transform' 
  | 'filter'
  // Enhanced node types
  | 'ai_trigger' 
  | 'smart_condition' 
  | 'ai_action' 
  | 'enrichment_action'
  | 'multi_channel_action'
  | 'ai_decision'
  | 'dynamic_wait'
  | 'ai_optimizer'
  | 'data_transformer'
  | 'loop_controller'
  | 'parallel_processor'
  | 'merge_controller'
  | 'sub_workflow'
  | 'webhook_advanced'
  | 'api_advanced';

export interface WorkflowNode {
  id: string;
  type: NodeType;
  position: NodePosition;
  data: NodeData;
  
  // Visual properties
  width?: number;
  height?: number;
  selected?: boolean;
  dragging?: boolean;
  
  // Connection properties
  sourcePosition?: HandlePosition;
  targetPosition?: HandlePosition;
  
  // State
  isValid?: boolean;
  isExecuting?: boolean;
  lastExecuted?: ISO8601DateTime;
  executionCount?: number;
}

export interface NodePosition {
  x: number;
  y: number;
}

export type HandlePosition = 'top' | 'right' | 'bottom' | 'left';

export interface NodeData {
  label: string;
  description?: string;
  icon?: string;
  color?: string;
  
  // Core configuration
  actionType?: string;
  config: NodeConfig;
  
  // Schema definitions
  inputs?: NodeInput[];
  outputs?: NodeOutput[];
  
  // Validation state
  errors?: NodeError[];
  warnings?: NodeWarning[];
  isValid?: boolean;
  
  // Execution metadata
  executionStats?: NodeExecutionStats;
}

export interface NodeConfig {
  [key: string]: JSONValue;
  
  // Common properties
  enabled?: boolean;
  timeout?: number;
  retryCount?: number;
  retryDelay?: number;
  
  // Conditional properties
  conditions?: ConditionGroup;
  
  // Variable mapping
  inputMapping?: Record<string, string>;
  outputMapping?: Record<string, string>;
}

export interface NodeInput {
  id: string;
  name: string;
  type: DataType;
  required?: boolean;
  defaultValue?: JSONValue;
  description?: string;
  validation?: ValidationRule[];
}

export interface NodeOutput {
  id: string;
  name: string;
  type: DataType;
  description?: string;
  schema?: JSONSchema;
}

export type DataType = 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object' | 'any' | 'uuid' | 'email' | 'phone' | 'url';

export interface NodeError {
  code: string;
  message: string;
  field?: string;
  severity: 'error' | 'warning' | 'info';
}

export interface NodeWarning {
  code: string;
  message: string;
  suggestion?: string;
}

export interface NodeExecutionStats {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  avgExecutionTimeMs: number;
  lastExecutedAt?: ISO8601DateTime;
  commonErrors?: ErrorFrequency[];
}

export interface ErrorFrequency {
  error: string;
  count: number;
  lastOccurred: ISO8601DateTime;
}

// ========================================
// WORKFLOW EDGE TYPES
// ========================================

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  
  // Edge properties
  type?: EdgeType;
  animated?: boolean;
  style?: EdgeStyle;
  label?: string;
  
  // Conditional edge properties
  condition?: EdgeCondition;
  weight?: number; // For weighted routing
  
  // Execution tracking
  executionCount?: number;
  lastUsed?: ISO8601DateTime;
}

export type EdgeType = 'default' | 'straight' | 'step' | 'smoothstep' | 'conditional' | 'weighted';

export interface EdgeStyle {
  stroke?: string;
  strokeWidth?: number;
  strokeDasharray?: string;
}

export interface EdgeCondition {
  field: string;
  operator: ComparisonOperator;
  value: JSONValue;
}

// ========================================
// CONDITION SYSTEM
// ========================================

export interface ConditionGroup {
  operator: ConditionOperator;
  conditions: (Condition | ConditionGroup)[];
}

export type ConditionOperator = 'AND' | 'OR' | 'NOT';

export interface Condition {
  id?: string;
  field: string;
  operator: ComparisonOperator;
  value: JSONValue;
  dataType?: DataType;
  
  // Advanced options
  isNegated?: boolean;
  caseSensitive?: boolean;
  customFunction?: string;
}

export type ComparisonOperator = 
  | 'equals'
  | 'not_equals'
  | 'greater_than'
  | 'greater_than_or_equal'
  | 'less_than'
  | 'less_than_or_equal'
  | 'contains'
  | 'not_contains'
  | 'starts_with'
  | 'ends_with'
  | 'in'
  | 'not_in'
  | 'is_empty'
  | 'is_not_empty'
  | 'between'
  | 'before'
  | 'after'
  | 'days_ago_less_than'
  | 'days_ago_greater_than'
  | 'regex'
  | 'custom';

// ========================================
// EXECUTION TYPES
// ========================================

export interface WorkflowExecution {
  id: UUID;
  workflowId: UUID;
  organizationId: UUID;
  
  // Execution state
  status: ExecutionStatus;
  priority: number;
  
  // Execution data
  triggerData?: Record<string, JSONValue>;
  inputData?: Record<string, JSONValue>;
  outputData?: Record<string, JSONValue>;
  context: ExecutionContext;
  
  // Error handling
  errorMessage?: string;
  errorCode?: string;
  errorDetails?: Record<string, JSONValue>;
  retryCount: number;
  maxRetries: number;
  
  // Timing
  startedAt: ISO8601DateTime;
  completedAt?: ISO8601DateTime;
  executionTimeMs?: number;
  
  // Metadata
  triggeredBy: string;
  executionEnvironment: ExecutionEnvironment;
  
  // Timestamps
  createdAt: ISO8601DateTime;
  updatedAt: ISO8601DateTime;
}

export type ExecutionStatus = 'pending' | 'queued' | 'running' | 'completed' | 'failed' | 'cancelled' | 'timeout';

export interface ExecutionContext {
  variables: Record<string, JSONValue>;
  currentNodeId?: string;
  executionPath: string[];
  loopIterations?: Record<string, number>;
  
  // Advanced context
  userContext?: UserContext;
  systemContext?: SystemContext;
  customContext?: Record<string, JSONValue>;
}

export interface UserContext {
  userId?: UUID;
  organizationId: UUID;
  permissions: string[];
  timezone: string;
  locale: string;
}

export interface SystemContext {
  workflowVersion: number;
  executionEngine: string;
  apiVersion: string;
  environment: string;
  serverId: string;
}

export interface ExecutionEnvironment {
  engine: string;
  version: string;
  nodeVersion: string;
  platform: string;
  memory: number;
  cpu: number;
}

export interface ExecutionStep {
  id: UUID;
  executionId: UUID;
  nodeId: string;
  nodeType: NodeType;
  actionType?: string;
  
  // Step state
  status: ExecutionStepStatus;
  inputData?: Record<string, JSONValue>;
  outputData?: Record<string, JSONValue>;
  
  // Error handling
  error?: string;
  errorCode?: string;
  retryCount: number;
  maxRetries: number;
  
  // Timing
  startedAt?: ISO8601DateTime;
  completedAt?: ISO8601DateTime;
  executionTimeMs?: number;
  
  // Context snapshots
  contextSnapshot?: Record<string, JSONValue>;
  variablesSnapshot?: Record<string, JSONValue>;
  
  // Timestamps
  createdAt: ISO8601DateTime;
  updatedAt: ISO8601DateTime;
}

export type ExecutionStepStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped' | 'cancelled';

// ========================================
// TRIGGER SYSTEM
// ========================================

export interface WorkflowTrigger {
  id: UUID;
  organizationId: UUID;
  workflowId: UUID;
  
  // Trigger configuration
  triggerType: string;
  triggerName: string;
  triggerConfig: Record<string, JSONValue>;
  
  // Scheduling
  scheduleType?: ScheduleType;
  cronExpression?: string;
  timezone: string;
  nextRunAt?: ISO8601DateTime;
  lastRunAt?: ISO8601DateTime;
  
  // Webhook configuration
  webhookEndpoint?: string;
  webhookSecret?: string;
  webhookHeaders?: Record<string, string>;
  
  // State and metrics
  isActive: boolean;
  triggerCount: number;
  successCount: number;
  failureCount: number;
  lastTriggeredAt?: ISO8601DateTime;
  
  // Timestamps
  createdAt: ISO8601DateTime;
  updatedAt: ISO8601DateTime;
}

export type ScheduleType = 'immediate' | 'scheduled' | 'recurring' | 'cron';

export interface TriggerDefinition {
  id: string;
  category: TriggerCategory;
  name: string;
  description: string;
  icon: string;
  
  // Schema definitions
  configSchema: JSONSchema;
  outputSchema: JSONSchema;
  
  // Capabilities
  isActive: boolean;
  supportsScheduling: boolean;
  supportsWebhook: boolean;
  
  // Implementation
  handlerFunction?: string;
  webhookEndpointTemplate?: string;
  version: string;
  
  // Metadata
  isPremium?: boolean;
  requiredPermissions?: string[];
  tags?: string[];
}

export type TriggerCategory = 'lead' | 'client' | 'communication' | 'calendar' | 'schedule' | 'webhook' | 'ai' | 'integration' | 'custom';

// ========================================
// ACTION SYSTEM
// ========================================

export interface ActionDefinition {
  id: string;
  category: ActionCategory;
  name: string;
  description: string;
  icon: string;
  
  // Schema definitions
  inputSchema: JSONSchema;
  outputSchema: JSONSchema;
  configSchema?: JSONSchema;
  
  // Properties
  isPremium: boolean;
  isActive: boolean;
  requiresAuth: boolean;
  
  // Implementation details
  handlerFunction?: string;
  externalServiceUrl?: string;
  timeoutSeconds: number;
  maxRetries: number;
  version: string;
  
  // Metadata
  tags?: string[];
  requiredPermissions?: string[];
  supportedPlatforms?: string[];
}

export type ActionCategory = 'communication' | 'crm' | 'tasks' | 'calendar' | 'ai' | 'data' | 'integration' | 'control' | 'custom';

// ========================================
// TEMPLATE SYSTEM
// ========================================

export interface WorkflowTemplate {
  id: UUID;
  organizationId?: UUID; // null for public templates
  name: string;
  description: string;
  category: TemplateCategory;
  icon?: string;
  previewImage?: string;
  
  // Template data
  workflowData: WorkflowData;
  defaultSettings: WorkflowSettings;
  requiredVariables: TemplateVariable[];
  
  // Metadata
  isPublic: boolean;
  isFeatured: boolean;
  usageCount: number;
  rating: number;
  tags: string[];
  
  // Versioning
  version: string;
  compatibleVersions: string[];
  
  // Access control
  createdBy?: UUID;
  updatedBy?: UUID;
  
  // Timestamps
  createdAt: ISO8601DateTime;
  updatedAt: ISO8601DateTime;
}

export type TemplateCategory = 'lead_nurture' | 'client_onboarding' | 'retention' | 'sales' | 'marketing' | 'operations' | 'fitness' | 'custom';

export interface TemplateVariable {
  name: string;
  type: DataType;
  description: string;
  required: boolean;
  defaultValue?: JSONValue;
  validationRules?: ValidationRule[];
  category?: string;
}

export interface TemplateCustomization {
  variableName: string;
  customValue: JSONValue;
  nodeId?: string;
  field?: string;
}

export interface AppliedCustomization {
  customization: TemplateCustomization;
  applied: boolean;
  error?: string;
}

// ========================================
// VARIABLE SYSTEM
// ========================================

export interface WorkflowVariable {
  id: UUID;
  organizationId: UUID;
  workflowId?: UUID;
  
  // Variable definition
  name: string;
  dataType: DataType;
  defaultValue?: JSONValue;
  currentValue?: JSONValue;
  
  // Metadata
  description?: string;
  scope: VariableScope;
  isSecret: boolean;
  isRequired: boolean;
  
  // Validation
  validationRules?: ValidationRule[];
  
  // Timestamps
  createdAt: ISO8601DateTime;
  updatedAt: ISO8601DateTime;
}

export type VariableScope = 'global' | 'workflow' | 'execution';

export interface ValidationRule {
  type: ValidationType;
  value?: JSONValue;
  message?: string;
  customFunction?: string;
}

export type ValidationType = 'required' | 'min' | 'max' | 'pattern' | 'format' | 'enum' | 'custom';

// ========================================
// WEBHOOK SYSTEM
// ========================================

export interface WorkflowWebhook {
  id: UUID;
  organizationId: UUID;
  workflowId?: UUID;
  
  // Configuration
  name: string;
  endpointId: string;
  secretKey: string;
  
  // Security
  allowedOrigins: string[];
  verifySignature: boolean;
  rateLimit: number; // requests per minute
  
  // Processing
  transformPayload?: PayloadTransform;
  filterConditions?: FilterCondition[];
  
  // State and metrics
  isActive: boolean;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  lastTriggeredAt?: ISO8601DateTime;
  
  // Timestamps
  createdAt: ISO8601DateTime;
  updatedAt: ISO8601DateTime;
}

export interface PayloadTransform {
  script: string;
  language: 'javascript' | 'jsonpath';
  timeout: number;
}

export interface FilterCondition {
  field: string;
  operator: ComparisonOperator;
  value: JSONValue;
}

// ========================================
// ANALYTICS TYPES
// ========================================

export interface WorkflowAnalytics {
  id: UUID;
  organizationId: UUID;
  workflowId: UUID;
  
  // Time period
  date: string; // ISO date
  hour?: number;
  
  // Execution metrics
  executionsCount: number;
  successfulCount: number;
  failedCount: number;
  cancelledCount: number;
  
  // Performance metrics
  totalExecutionTimeMs: number;
  avgExecutionTimeMs: number;
  minExecutionTimeMs: number;
  maxExecutionTimeMs: number;
  
  // Resource usage
  totalNodesExecuted: number;
  totalActionsPerformed: number;
  totalConditionsEvaluated: number;
  
  // Error analysis
  errorCategories: Record<string, number>;
  mostCommonErrors: ErrorSummary[];
  
  // User engagement
  uniqueTriggers: number;
  uniqueUsersAffected: number;
  
  // Timestamps
  createdAt: ISO8601DateTime;
  updatedAt: ISO8601DateTime;
}

export interface ErrorSummary {
  error: string;
  count: number;
  percentage: number;
  firstOccurred: ISO8601DateTime;
  lastOccurred: ISO8601DateTime;
}

export interface PerformanceMetrics {
  executionTime: TimeMetric;
  throughput: ThroughputMetric;
  errorRate: ErrorRateMetric;
  resourceUsage: ResourceMetric;
}

export interface TimeMetric {
  avg: number;
  min: number;
  max: number;
  p50: number;
  p95: number;
  p99: number;
}

export interface ThroughputMetric {
  executionsPerHour: number;
  executionsPerDay: number;
  peakExecutionsPerHour: number;
  trend: 'increasing' | 'decreasing' | 'stable';
}

export interface ErrorRateMetric {
  rate: number;
  trend: 'improving' | 'degrading' | 'stable';
  mostCommonErrors: string[];
}

export interface ResourceMetric {
  memoryUsage: number;
  cpuUsage: number;
  databaseConnections: number;
  externalApiCalls: number;
}

// ========================================
// QUEUE SYSTEM
// ========================================

export interface WorkflowExecutionQueue {
  id: UUID;
  organizationId: UUID;
  workflowId: UUID;
  
  // Queue metadata
  priority: number; // 1-10 scale
  status: QueueStatus;
  
  // Execution data
  triggerData: Record<string, JSONValue>;
  contextData: Record<string, JSONValue>;
  inputVariables: Record<string, JSONValue>;
  
  // Scheduling
  scheduledAt: ISO8601DateTime;
  startedAt?: ISO8601DateTime;
  completedAt?: ISO8601DateTime;
  
  // Error handling
  errorMessage?: string;
  retryCount: number;
  maxRetries: number;
  nextRetryAt?: ISO8601DateTime;
  
  // Worker assignment
  workerId?: string;
  lockedAt?: ISO8601DateTime;
  lockExpiresAt?: ISO8601DateTime;
  
  // Timestamps
  createdAt: ISO8601DateTime;
  updatedAt: ISO8601DateTime;
}

export type QueueStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';

export interface QueueMetrics {
  totalJobs: number;
  queuedJobs: number;
  processingJobs: number;
  completedJobs: number;
  failedJobs: number;
  averageWaitTime: number;
  averageProcessingTime: number;
  throughputPerHour: number;
}

export interface WorkerStatus {
  workerId: string;
  status: 'active' | 'idle' | 'busy' | 'error';
  currentJob?: UUID;
  jobsProcessed: number;
  uptime: number;
  memoryUsage: number;
  cpuUsage: number;
}

// ========================================
// SETTINGS AND CONFIGURATION
// ========================================

export interface WorkflowSettings {
  // Error handling
  errorHandling: 'continue' | 'stop' | 'retry';
  maxExecutionTime: number; // seconds
  globalTimeout: number; // seconds
  
  // Retry configuration
  defaultRetries: number;
  retryDelay: number; // seconds
  retryBackoff: 'linear' | 'exponential';
  
  // Execution environment
  timezone: string;
  locale: string;
  
  // Notifications
  notifications: NotificationSettings;
  
  // Performance
  concurrency: number;
  priority: number;
  
  // Security
  sensitiveDataHandling: SensitiveDataSettings;
  
  // Debugging
  enableDebugMode: boolean;
  logLevel: LogLevel;
  
  // Custom settings
  customSettings?: Record<string, JSONValue>;
}

export interface NotificationSettings {
  onError: boolean;
  onComplete: boolean;
  onTimeout: boolean;
  notifyEmails: string[];
  webhookUrl?: string;
  slackChannel?: string;
}

export interface SensitiveDataSettings {
  maskSensitiveFields: boolean;
  sensitiveFieldPatterns: string[];
  encryptVariables: boolean;
  auditDataAccess: boolean;
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

// ========================================
// VALIDATION AND ERROR TYPES
// ========================================

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  suggestions: ValidationSuggestion[];
}

export interface ValidationError {
  code: string;
  message: string;
  field?: string;
  nodeId?: string;
  severity: 'error' | 'critical';
}

export interface ValidationWarning {
  code: string;
  message: string;
  field?: string;
  nodeId?: string;
  suggestion?: string;
}

export interface ValidationSuggestion {
  type: 'optimization' | 'best_practice' | 'feature';
  message: string;
  action?: SuggestionAction;
}

export interface SuggestionAction {
  type: string;
  parameters: Record<string, JSONValue>;
  automated: boolean;
}

// ========================================
// JSON SCHEMA TYPES
// ========================================

export interface JSONSchema {
  type: 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null';
  properties?: Record<string, JSONSchemaProperty>;
  items?: JSONSchemaProperty | JSONSchemaProperty[];
  required?: string[];
  default?: JSONValue;
  
  // Validation
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  format?: string;
  enum?: JSONValue[];
  
  // Metadata
  title?: string;
  description?: string;
  examples?: JSONValue[];
  
  // Composition
  allOf?: JSONSchema[];
  anyOf?: JSONSchema[];
  oneOf?: JSONSchema[];
  not?: JSONSchema;
}

export interface JSONSchemaProperty extends JSONSchema {
  // Additional property-specific fields can be added here
}

// ========================================
// API RESPONSE TYPES
// ========================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
  metadata?: ResponseMetadata;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, JSONValue>;
  timestamp: ISO8601DateTime;
  requestId: string;
  stack?: string; // Only in development
}

export interface ResponseMetadata {
  requestId: string;
  timestamp: ISO8601DateTime;
  executionTime: number;
  apiVersion: string;
  rateLimit?: RateLimitInfo;
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetAt: ISO8601DateTime;
}

export interface PaginationInfo {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: PaginationInfo;
}

// ========================================
// EVENT SYSTEM TYPES
// ========================================

export interface WorkflowEvent {
  id: UUID;
  type: WorkflowEventType;
  workflowId: UUID;
  executionId?: UUID;
  organizationId: UUID;
  
  // Event data
  data: Record<string, JSONValue>;
  metadata: EventMetadata;
  
  // Timing
  timestamp: ISO8601DateTime;
  processedAt?: ISO8601DateTime;
}

export type WorkflowEventType = 
  | 'workflow_created'
  | 'workflow_updated'
  | 'workflow_deleted'
  | 'execution_started'
  | 'execution_completed'
  | 'execution_failed'
  | 'step_started'
  | 'step_completed'
  | 'step_failed'
  | 'trigger_activated'
  | 'webhook_received';

export interface EventMetadata {
  source: string;
  version: string;
  userId?: UUID;
  sessionId?: string;
  userAgent?: string;
  ipAddress?: string;
}

// ========================================
// UTILITY TYPES
// ========================================

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type OptionalFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// ========================================
// BRAND TYPES (for type safety)
// ========================================

export type WorkflowId = UUID & { readonly __brand: 'WorkflowId' };
export type ExecutionId = UUID & { readonly __brand: 'ExecutionId' };
export type TemplateId = UUID & { readonly __brand: 'TemplateId' };
export type OrganizationId = UUID & { readonly __brand: 'OrganizationId' };

// Type guards for brand types
export const isWorkflowId = (id: UUID): id is WorkflowId => true;
export const isExecutionId = (id: UUID): id is ExecutionId => true;
export const isTemplateId = (id: UUID): id is TemplateId => true;
export const isOrganizationId = (id: UUID): id is OrganizationId => true;

// ========================================
// CONSTANTS AND ENUMS
// ========================================

export const WorkflowStatusEnum = {
  DRAFT: 'draft',
  ACTIVE: 'active',
  PAUSED: 'paused',
  ARCHIVED: 'archived'
} as const;

export const ExecutionStatusEnum = {
  PENDING: 'pending',
  QUEUED: 'queued',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  TIMEOUT: 'timeout'
} as const;

export const NodeTypeEnum = {
  TRIGGER: 'trigger',
  ACTION: 'action',
  CONDITION: 'condition',
  WAIT: 'wait',
  LOOP: 'loop',
  TRANSFORM: 'transform',
  FILTER: 'filter',
  AI_TRIGGER: 'ai_trigger',
  SMART_CONDITION: 'smart_condition',
  AI_ACTION: 'ai_action',
  ENRICHMENT_ACTION: 'enrichment_action',
  MULTI_CHANNEL_ACTION: 'multi_channel_action',
  AI_DECISION: 'ai_decision',
  DYNAMIC_WAIT: 'dynamic_wait',
  AI_OPTIMIZER: 'ai_optimizer',
  DATA_TRANSFORMER: 'data_transformer',
  LOOP_CONTROLLER: 'loop_controller',
  PARALLEL_PROCESSOR: 'parallel_processor',
  MERGE_CONTROLLER: 'merge_controller',
  SUB_WORKFLOW: 'sub_workflow',
  WEBHOOK_ADVANCED: 'webhook_advanced',
  API_ADVANCED: 'api_advanced'
} as const;

export const DataTypeEnum = {
  STRING: 'string',
  NUMBER: 'number',
  BOOLEAN: 'boolean',
  DATE: 'date',
  ARRAY: 'array',
  OBJECT: 'object',
  ANY: 'any',
  UUID: 'uuid',
  EMAIL: 'email',
  PHONE: 'phone',
  URL: 'url'
} as const;

// Export all types for easy importing
export default {
  // Core types
  Workflow,
  WorkflowData,
  WorkflowNode,
  WorkflowEdge,
  WorkflowExecution,
  ExecutionStep,
  WorkflowTrigger,
  WorkflowTemplate,
  WorkflowVariable,
  WorkflowWebhook,
  WorkflowAnalytics,
  
  // Enums
  WorkflowStatusEnum,
  ExecutionStatusEnum,
  NodeTypeEnum,
  DataTypeEnum,
  
  // Brand types
  WorkflowId,
  ExecutionId,
  TemplateId,
  OrganizationId,
  
  // Utility types
  DeepPartial,
  RequiredFields,
  OptionalFields
};
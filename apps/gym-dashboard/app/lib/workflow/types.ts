// Enhanced Workflow System Types

export interface EnhancedWorkflow {
  id: string;
  organization_id: string;
  name: string;
  description?: string;
  template_id?: string;
  trigger_type: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  variables?: WorkflowVariable[];
  workflow_variables?: WorkflowVariable[];
  workflow_steps?: WorkflowStep[];
  version: number;
  is_active: boolean;
  is_template: boolean;
  template_category?: string;
  settings: WorkflowSettings;
  created_at: string;
  updated_at: string;
}

export interface WorkflowNode {
  id: string;
  type: NodeType;
  position: { x: number; y: number };
  data: NodeData;
}

export type NodeType = 
  | 'trigger' 
  | 'action' 
  | 'condition' 
  | 'delay' 
  | 'loop' 
  | 'webhook'
  | 'ai'
  | 'switch'
  | 'merge'
  | 'note';

export interface NodeData {
  label: string;
  description?: string;
  actionType?: string;
  conditions?: Condition[];
  logicOperator?: 'AND' | 'OR';
  delay?: DelayConfig;
  loop?: LoopConfig;
  webhook?: WebhookConfig;
  ai?: AIConfig;
  priority?: number;
  async?: boolean;
  continueOnError?: boolean;
  retryConfig?: RetryConfig;
  _retryCount?: number;
  [key: string]: any;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  data?: {
    branch?: string;
    condition?: Condition;
  };
}

export interface WorkflowVariable {
  id: string;
  workflow_id: string;
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'date';
  default_value: any;
  description?: string;
  is_required: boolean;
  is_sensitive: boolean;
}

export interface WorkflowStep {
  id: string;
  workflow_id: string;
  node_id: string;
  type: string;
  config: Record<string, any>;
  position: number;
}

export interface Condition {
  field: string;
  operator: ConditionOperator;
  value: any;
  type?: 'static' | 'dynamic' | 'variable';
}

export type ConditionOperator = 
  | 'equals' 
  | 'not_equals' 
  | 'contains' 
  | 'not_contains'
  | 'greater_than' 
  | 'less_than' 
  | 'greater_than_or_equal'
  | 'less_than_or_equal'
  | 'in' 
  | 'not_in' 
  | 'exists' 
  | 'not_exists'
  | 'matches_regex'
  | 'starts_with'
  | 'ends_with';

export interface DelayConfig {
  type: 'fixed' | 'dynamic' | 'schedule';
  value?: number;
  unit?: 'seconds' | 'minutes' | 'hours' | 'days';
  baseValue?: number;
  scheduledTime?: string;
  timezone?: string;
  businessHours?: boolean;
}

export interface LoopConfig {
  source: 'array' | 'range' | 'query';
  arrayPath?: string;
  start?: string | number;
  end?: string | number;
  query?: string;
  maxIterations?: number;
  breakCondition?: Condition;
  bodyNodes?: string[];
}

export interface WebhookConfig {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  payload?: any;
  auth?: {
    type: 'none' | 'bearer' | 'basic' | 'api_key';
    token?: string;
    username?: string;
    password?: string;
    apiKey?: string;
  };
  timeout?: number;
  successCondition?: Condition;
}

export interface AIConfig {
  model: 'gpt-4' | 'gpt-3.5-turbo' | 'claude-3' | 'claude-2';
  prompt: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  responseFormat?: 'text' | 'json';
  extractFields?: string[];
}

export interface RetryConfig {
  enabled: boolean;
  maxAttempts: number;
  backoffType: 'linear' | 'exponential' | 'fixed';
  backoffBase: number;
  retryOn?: string[]; // Error types to retry on
}

export interface WorkflowSettings {
  timeout?: number;
  maxExecutions?: number;
  concurrency?: number;
  errorHandling?: 'stop' | 'continue' | 'rollback';
  notifications?: NotificationSettings;
  logging?: LoggingSettings;
}

export interface NotificationSettings {
  onSuccess?: boolean;
  onFailure?: boolean;
  onWarning?: boolean;
  channels?: ('email' | 'sms' | 'webhook')[];
  recipients?: string[];
}

export interface LoggingSettings {
  level: 'debug' | 'info' | 'warn' | 'error';
  retention?: number; // days
  includePayloads?: boolean;
}

// Execution Types
export interface WorkflowExecution {
  id: string;
  workflow_id: string;
  organization_id: string;
  status: ExecutionStatus;
  triggered_by: string;
  trigger_data: any;
  input_data: any;
  output_data?: any;
  started_at: string;
  completed_at?: string;
  duration_ms?: number;
  nodes_executed?: number;
  error_count?: number;
  retry_count?: number;
  error_message?: string;
  execution_steps?: ExecutionStep[];
}

export type ExecutionStatus = 
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'paused'
  | 'skipped';

export interface ExecutionStep {
  nodeId: string;
  nodeType: string;
  status: ExecutionStatus;
  timestamp: string;
  duration?: number;
  output?: any;
  error?: string;
}

export interface ExecutionContext {
  workflowId: string;
  organizationId: string;
  executionId: string;
  startedAt: string;
  trigger?: any;
  variables: Record<string, any>;
  [key: string]: any; // Node outputs and custom data
}

export interface NodeExecutionResult {
  success: boolean;
  output?: any;
  error?: string;
  nextNodes?: string[];
  shouldContinue?: boolean;
}

// Action Types
export interface ActionDefinition {
  id: string;
  name: string;
  description: string;
  category: string;
  icon?: string;
  configSchema: any; // JSON Schema
  handler: string;
  isAsync?: boolean;
  requiredPermissions?: string[];
}

export interface ActionConfig {
  actionId: string;
  parameters: Record<string, any>;
}

// Trigger Types
export interface TriggerDefinition {
  id: string;
  name: string;
  description: string;
  category: string;
  icon?: string;
  configSchema: any; // JSON Schema
  eventTypes: string[];
  conditions?: Condition[];
}

export interface TriggerConfig {
  triggerId: string;
  eventType: string;
  conditions?: Condition[];
  schedule?: string; // Cron expression
}

// Analytics Types
export interface WorkflowAnalytics {
  id: string;
  workflow_id: string;
  organization_id: string;
  period_start: string;
  period_end: string;
  total_executions: number;
  successful_executions: number;
  failed_executions: number;
  average_duration_ms: number;
  median_duration_ms: number;
  p95_duration_ms: number;
  total_nodes_executed: number;
  error_rate: number;
  retry_rate: number;
  top_errors: ErrorSummary[];
  node_performance: NodePerformance[];
}

export interface ErrorSummary {
  error_type: string;
  error_message: string;
  count: number;
  last_occurred: string;
  affected_nodes: string[];
}

export interface NodePerformance {
  node_id: string;
  node_type: string;
  executions: number;
  success_rate: number;
  average_duration_ms: number;
  error_count: number;
}

// Queue Types
export interface QueuedExecution {
  id: string;
  workflow_id: string;
  organization_id: string;
  priority: number;
  scheduled_for?: string;
  retry_count: number;
  max_retries: number;
  trigger_data: any;
  context?: any;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
  updated_at: string;
}

// Template Types
export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  icon?: string;
  preview_image?: string;
  workflow_definition: Partial<EnhancedWorkflow>;
  variables: TemplateVariable[];
  requirements?: string[];
  installation_count: number;
  rating?: number;
  author?: string;
  is_featured: boolean;
  is_certified: boolean;
  created_at: string;
  updated_at: string;
}

export interface TemplateVariable {
  name: string;
  label: string;
  type: string;
  default_value?: any;
  required: boolean;
  description?: string;
  validation?: any;
}
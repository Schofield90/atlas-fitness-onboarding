// Types for the Atlas Fitness Automation Engine

export interface AutomationWorkflow {
  id: string;
  organization_id: string;
  name: string;
  description?: string;
  trigger_type: 'lead_created' | 'lead_status_changed' | 'client_joined' | 'membership_expired' | 'payment_failed' | 'date_based' | 'manual';
  trigger_config: Record<string, unknown>;
  steps: WorkflowStep[];
  is_active: boolean;
  triggered_count: number;
  completed_count: number;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface WorkflowStep {
  id: string;
  type: 'trigger' | 'action' | 'condition' | 'delay' | 'merge' | 'split';
  name: string;
  description?: string;
  config: Record<string, unknown>;
  position: {
    x: number;
    y: number;
  };
  size?: {
    width: number;
    height: number;
  };
}

export interface AutomationTrigger {
  id: string;
  workflow_id: string;
  type: 'webhook' | 'schedule' | 'event' | 'database_change' | 'manual';
  name: string;
  description?: string;
  
  // Webhook Configuration
  webhook_url?: string;
  webhook_secret?: string;
  
  // Schedule Configuration
  schedule_type?: 'cron' | 'interval' | 'once';
  cron_expression?: string;
  interval_minutes?: number;
  scheduled_at?: string;
  
  // Event Configuration
  event_type?: string;
  event_filters?: Record<string, unknown>;
  
  // Database Change Configuration
  table_name?: string;
  operation?: 'INSERT' | 'UPDATE' | 'DELETE';
  conditions?: Record<string, unknown>;
  
  is_active: boolean;
  last_triggered?: string;
  created_at: string;
  updated_at: string;
}

export interface AutomationAction {
  id: string;
  organization_id: string;
  name: string;
  description?: string;
  type: 'email' | 'sms' | 'whatsapp' | 'webhook' | 'database' | 'delay' | 'condition' | 'ai_task' | 'notification';
  config: Record<string, unknown>;
  input_schema: Record<string, unknown>;
  output_schema: Record<string, unknown>;
  category?: string;
  tags?: string[];
  usage_count: number;
  is_active: boolean;
  is_built_in: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface WorkflowNode {
  id: string;
  workflow_id: string;
  node_id: string;
  type: 'trigger' | 'action' | 'condition' | 'delay' | 'merge' | 'split';
  name: string;
  description?: string;
  position_x: number;
  position_y: number;
  width?: number;
  height?: number;
  config: Record<string, unknown>;
  action_id?: string;
  timeout_seconds?: number;
  retry_count?: number;
  retry_delay_seconds?: number;
  condition_logic?: 'AND' | 'OR' | 'NOT';
  conditions?: unknown[];
  created_at: string;
  updated_at: string;
}

export interface WorkflowEdge {
  id: string;
  workflow_id: string;
  edge_id: string;
  source_node_id: string;
  target_node_id: string;
  source_handle?: string;
  target_handle?: string;
  condition_type: 'always' | 'success' | 'failure' | 'conditional';
  condition_config?: Record<string, unknown>;
  animated?: boolean;
  style?: Record<string, unknown>;
  created_at: string;
}

export interface AutomationExecution {
  id: string;
  workflow_id: string;
  lead_id?: string;
  client_id?: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  current_step: number;
  context: Record<string, unknown>;
  error_message?: string;
  started_at: string;
  completed_at?: string;
  metadata?: Record<string, unknown>;
}

export interface AutomationExecutionLog {
  id: string;
  execution_id: string;
  level: 'debug' | 'info' | 'warning' | 'error';
  message: string;
  node_id?: string;
  step_number?: number;
  data?: Record<string, unknown>;
  duration_ms?: number;
  created_at: string;
}

export interface AutomationSchedule {
  id: string;
  trigger_id: string;
  cron_expression: string;
  timezone?: string;
  last_run?: string;
  next_run?: string;
  is_active: boolean;
  consecutive_failures: number;
  max_failures: number;
  last_error?: string;
  created_at: string;
  updated_at: string;
}

export interface CommunicationChannel {
  id: string;
  organization_id: string;
  name: string;
  type: 'email' | 'sms' | 'whatsapp' | 'telegram' | 'slack' | 'webhook';
  config: Record<string, unknown>;
  api_key?: string;
  api_secret?: string;
  webhook_url?: string;
  is_active: boolean;
  is_verified: boolean;
  messages_sent: number;
  last_used?: string;
  created_at: string;
  updated_at: string;
}

export interface MessageQueue {
  id: string;
  organization_id: string;
  channel_id?: string;
  recipient_type: 'lead' | 'client' | 'user' | 'external';
  recipient_id?: string;
  recipient_email?: string;
  recipient_phone?: string;
  message_type: 'email' | 'sms' | 'whatsapp' | 'push' | 'webhook';
  subject?: string;
  content: string;
  priority: number;
  scheduled_for: string;
  max_retries: number;
  retry_delay_seconds: number;
  status: 'pending' | 'processing' | 'sent' | 'delivered' | 'failed' | 'cancelled';
  attempts: number;
  last_attempt?: string;
  sent_at?: string;
  delivered_at?: string;
  failed_at?: string;
  error_message?: string;
  execution_id?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface AutomationVariable {
  id: string;
  scope: 'global' | 'organization' | 'workflow' | 'execution';
  organization_id?: string;
  workflow_id?: string;
  execution_id?: string;
  name: string;
  value: unknown;
  data_type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  is_encrypted: boolean;
  is_readonly: boolean;
  created_at: string;
  updated_at: string;
}

// React Flow Types
export interface FlowNode extends WorkflowNode {
  data: {
    label: string;
    description?: string;
    config: Record<string, unknown>;
    action?: AutomationAction;
    isValid?: boolean;
    errors?: string[];
  };
  position: {
    x: number;
    y: number;
  };
  selected?: boolean;
  dragging?: boolean;
}

export interface FlowEdge extends WorkflowEdge {
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  label?: string;
  animated?: boolean;
  style?: Record<string, unknown>;
  markerEnd?: {
    type: string;
    color?: string;
  };
}

// Workflow Builder Types
export interface WorkflowBuilderState {
  nodes: FlowNode[];
  edges: FlowEdge[];
  selectedNodeId?: string;
  selectedEdgeId?: string;
  isModified: boolean;
  isValid: boolean;
  errors: string[];
}

export interface NodeTemplate {
  id: string;
  type: FlowNode['type'];
  name: string;
  description: string;
  category: string;
  icon?: string;
  config: Record<string, unknown>;
  inputs: Array<{
    id: string;
    type: string;
    label: string;
    required: boolean;
  }>;
  outputs: Array<{
    id: string;
    type: string;
    label: string;
  }>;
}

// Execution Context Types
export interface ExecutionContext {
  execution_id: string;
  workflow_id: string;
  organization_id: string;
  trigger_data: Record<string, unknown>;
  variables: Record<string, unknown>;
  current_node?: string;
  step_number: number;
  started_at: string;
  timeout_at?: string;
}

export interface ExecutionResult {
  success: boolean;
  data?: unknown;
  error?: string;
  next_nodes?: string[];
  variables?: Record<string, unknown>;
  duration_ms?: number;
}

// API Response Types
export interface WorkflowResponse {
  workflow: AutomationWorkflow;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  triggers: AutomationTrigger[];
}

export interface ExecutionResponse {
  execution: AutomationExecution;
  logs: AutomationExecutionLog[];
}

// Filter and Query Types
export interface WorkflowFilters {
  status?: 'active' | 'inactive';
  trigger_type?: AutomationWorkflow['trigger_type'];
  created_by?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface ExecutionFilters {
  workflow_id?: string;
  status?: AutomationExecution['status'];
  date_from?: string;
  date_to?: string;
  page?: number;
  limit?: number;
}

// Validation Types
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  node_id?: string;
  edge_id?: string;
  type: 'error' | 'warning';
  message: string;
  field?: string;
}

export interface ValidationWarning {
  node_id?: string;
  edge_id?: string;
  message: string;
  suggestion?: string;
}

// Types are already exported as interfaces above
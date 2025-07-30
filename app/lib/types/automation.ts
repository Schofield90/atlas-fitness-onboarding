// Automation System Types and Interfaces

// Use local type definitions to avoid SSR issues
import type { Node, Edge, Connection, NodeProps } from './reactflow-types'

// Workflow Types
export interface Workflow {
  id: string
  organizationId: string
  name: string
  description?: string
  status: 'draft' | 'active' | 'paused' | 'archived'
  version: number
  workflowData: WorkflowData
  triggerType: string
  triggerConfig?: Record<string, any>
  settings: WorkflowSettings
  stats: WorkflowStats
  createdBy?: string
  templateId?: string
  createdAt: string
  updatedAt: string
}

export interface WorkflowData {
  nodes: WorkflowNode[]
  edges: Edge[]
  variables: WorkflowVariable[]
  viewport?: { x: number; y: number; zoom: number }
}

export interface WorkflowSettings {
  errorHandling: 'continue' | 'stop'
  maxExecutionTime: number // seconds
  timezone: string
  notifications: {
    onError: boolean
    onComplete: boolean
    notifyEmails?: string[]
  }
}

export interface WorkflowStats {
  totalExecutions: number
  successfulExecutions: number
  failedExecutions: number
  avgExecutionTime: number
  lastExecutedAt?: string
}

// Node Types
export type NodeType = 'trigger' | 'action' | 'condition' | 'wait' | 'loop' | 'transform' | 'filter'

export interface WorkflowNode extends Node {
  type: NodeType
  data: NodeData
}

export interface NodeData {
  label: string
  icon?: string
  actionType?: string
  config: Record<string, any>
  inputs?: NodeInput[]
  outputs?: NodeOutput[]
  description?: string
  error?: string
  isValid?: boolean
}

export interface NodeInput {
  id: string
  name: string
  type: DataType
  required?: boolean
  defaultValue?: any
  description?: string
}

export interface NodeOutput {
  id: string
  name: string
  type: DataType
  description?: string
}

export type DataType = 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object' | 'any'

// Trigger Types
export interface TriggerDefinition {
  id: string
  category: TriggerCategory
  name: string
  description: string
  icon: string
  configSchema: JsonSchema
  outputSchema: JsonSchema
  isActive: boolean
}

export type TriggerCategory = 'lead' | 'client' | 'communication' | 'calendar' | 'schedule' | 'webhook' | 'ai' | 'integration'

export interface TriggerConfig {
  [key: string]: any
}

// Action Types
export interface ActionDefinition {
  id: string
  category: ActionCategory
  name: string
  description: string
  icon: string
  inputSchema: JsonSchema
  outputSchema: JsonSchema
  configSchema?: JsonSchema
  isPremium: boolean
  isActive: boolean
}

export type ActionCategory = 'communication' | 'crm' | 'tasks' | 'calendar' | 'ai' | 'data' | 'integration' | 'control'

// Condition Types
export interface Condition {
  field: string
  operator: ComparisonOperator
  value: any
  dataType?: 'string' | 'number' | 'boolean' | 'date' | 'array'
}

// Condition operator types for logical groups
export type ConditionOperator = 'AND' | 'OR' | 'NOT'

// Comparison operator types for individual conditions
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

export interface ConditionGroup {
  operator: ConditionOperator
  conditions: (Condition | ConditionGroup)[]
}

// Execution Types
export interface WorkflowExecution {
  id: string
  workflowId: string
  organizationId: string
  status: ExecutionStatus
  triggerData?: Record<string, any>
  context: ExecutionContext
  startedAt: string
  completedAt?: string
  error?: string
  executionTimeMs?: number
}

export type ExecutionStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'

export interface ExecutionContext {
  variables: Record<string, any>
  currentNodeId?: string
  executionPath: string[]
  loopIterations?: Record<string, number>
}

export interface ExecutionStep {
  id: string
  executionId: string
  nodeId: string
  nodeType: NodeType
  actionType?: string
  status: ExecutionStatus | 'skipped'
  inputData?: Record<string, any>
  outputData?: Record<string, any>
  error?: string
  startedAt?: string
  completedAt?: string
  executionTimeMs?: number
}

// Variable Types
export interface WorkflowVariable {
  id: string
  name: string
  type: DataType
  value?: any
  description?: string
  scope: 'workflow' | 'global'
  isSecret?: boolean
}

// Template Types
export interface WorkflowTemplate {
  id: string
  organizationId?: string
  name: string
  description: string
  category: TemplateCategory
  icon?: string
  workflowData: WorkflowData
  previewImage?: string
  isPublic: boolean
  usageCount: number
  createdBy?: string
  tags?: string[]
}

export type TemplateCategory = 'lead_nurture' | 'client_onboarding' | 'retention' | 'sales' | 'marketing' | 'operations' | 'custom'

// Webhook Types
export interface WebhookTrigger {
  id: string
  organizationId: string
  workflowId?: string
  name: string
  endpointId: string
  secret: string
  isActive: boolean
  requestCount: number
  lastTriggeredAt?: string
}

// Schedule Types
export interface ScheduleTrigger {
  id: string
  workflowId: string
  scheduleType: 'once' | 'recurring' | 'cron'
  scheduleConfig: ScheduleConfig
  timezone: string
  nextRunAt?: string
  lastRunAt?: string
  isActive: boolean
}

export interface ScheduleConfig {
  cronExpression?: string
  interval?: {
    value: number
    unit: 'minutes' | 'hours' | 'days' | 'weeks' | 'months'
  }
  startDate?: string
  endDate?: string
  runAt?: string // For 'once' type
}

// Analytics Types
export interface WorkflowAnalytics {
  workflowId: string
  date: string
  executionsCount: number
  successCount: number
  failureCount: number
  avgExecutionTimeMs: number
  totalExecutionTimeMs: number
  uniqueTriggers: number
}

// Code Snippet Types
export interface CodeSnippet {
  id: string
  organizationId: string
  name: string
  description?: string
  code: string
  language: 'javascript' | 'python'
  inputVariables?: Variable[]
  outputVariables?: Variable[]
  isShared: boolean
  createdBy?: string
}

export interface Variable {
  name: string
  type: DataType
  description?: string
  required?: boolean
  defaultValue?: any
}

// JSON Schema Type (simplified)
export interface JsonSchema {
  type: 'object' | 'array' | 'string' | 'number' | 'boolean'
  properties?: Record<string, JsonSchemaProperty>
  items?: JsonSchemaProperty
  required?: string[]
  default?: any
}

export interface JsonSchemaProperty {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array'
  description?: string
  default?: any
  enum?: any[]
  minimum?: number
  maximum?: number
  pattern?: string
  properties?: Record<string, JsonSchemaProperty>
  items?: JsonSchemaProperty
}

// React Flow Custom Node Props
export interface CustomNodeProps extends NodeProps {
  data: NodeData
  isConnectable: boolean
  selected: boolean
}

// Builder Types
export interface BuilderState {
  workflow: Workflow
  selectedNode?: string
  selectedEdge?: string
  isTestMode: boolean
  testData?: Record<string, any>
  executionHistory: ExecutionStep[]
  errors: Record<string, string>
  isDirty: boolean
}

export interface NodePaletteItem {
  type: NodeType
  actionType?: string
  category: string
  name: string
  description: string
  icon: string
  defaultConfig?: Record<string, any>
}

// Event Types for Real-time Updates
export interface WorkflowEvent {
  type: 'execution_started' | 'execution_completed' | 'execution_failed' | 'step_completed' | 'step_failed'
  workflowId: string
  executionId: string
  data: any
  timestamp: string
}

// Error Types
export interface WorkflowError {
  code: string
  message: string
  nodeId?: string
  details?: Record<string, any>
}
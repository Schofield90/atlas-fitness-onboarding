// Enhanced Automation System Types - Surpassing N8N and GoHighLevel
// This extends the base automation types with advanced features and AI capabilities

import type { Node, Edge, Connection, NodeProps } from './reactflow-types'
import type { WorkflowNode, NodeData, DataType, Condition, ConditionGroup } from './automation'

// ============================================================================
// ENHANCED NODE SYSTEM
// ============================================================================

export type AdvancedNodeType = 
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
  | 'api_advanced'

export interface AdvancedWorkflowNode extends WorkflowNode {
  type: AdvancedNodeType
  data: AdvancedNodeData
  aiConfig?: AINodeConfiguration
  optimizationHints?: OptimizationHint[]
  executionMetrics?: NodeExecutionMetrics
}

export interface AdvancedNodeData extends NodeData {
  // Enhanced configuration with deep settings
  advancedConfig: DeepNodeConfiguration
  
  // AI-powered features
  aiAssistance: AIAssistanceConfig
  
  // Field mappings and transformations
  fieldMappings: FieldMapping[]
  dataTransformations: DataTransformation[]
  
  // Validation and error handling
  validationRules: ValidationRule[]
  errorHandling: ErrorHandlingConfig
  
  // Performance and optimization
  performanceConfig: PerformanceConfig
  
  // UI configuration for the node panel
  uiConfig: NodeUIConfig
}

// ============================================================================
// DEEP CONFIGURATION SYSTEM
// ============================================================================

export interface DeepNodeConfiguration {
  // Core functionality settings
  primary: PrimaryConfiguration
  
  // Advanced behavioral settings
  advanced: AdvancedConfiguration
  
  // AI and machine learning settings
  intelligence: IntelligenceConfiguration
  
  // Integration and connectivity settings
  integration: IntegrationConfiguration
  
  // Custom code and scripting
  customization: CustomizationConfiguration
}

export interface PrimaryConfiguration {
  [key: string]: any
  // Node-specific primary settings will be defined per node type
}

export interface AdvancedConfiguration {
  // Rate limiting and throttling
  rateLimiting?: {
    enabled: boolean
    requestsPerMinute: number
    burstLimit: number
    backoffStrategy: 'exponential' | 'linear' | 'fixed'
  }
  
  // Retry configuration
  retryConfig?: {
    maxAttempts: number
    backoffMultiplier: number
    retryableStatusCodes: number[]
    customRetryLogic?: string
  }
  
  // Conditional execution
  executionConditions?: SmartCondition[]
  
  // Dynamic configuration updates
  dynamicConfig?: {
    enabled: boolean
    configSource: 'api' | 'database' | 'user_input'
    updateFrequency: number
  }
}

export interface IntelligenceConfiguration {
  // AI model selection
  aiModel?: {
    provider: 'openai' | 'anthropic' | 'local'
    model: string
    temperature: number
    maxTokens: number
  }
  
  // Machine learning features
  mlFeatures?: {
    predictiveAnalytics: boolean
    personalizedContent: boolean
    behaviorPrediction: boolean
    contentOptimization: boolean
  }
  
  // Learning and adaptation
  learningConfig?: {
    enabled: boolean
    learningRate: number
    adaptationFrequency: 'real_time' | 'hourly' | 'daily'
    feedbackSources: string[]
  }
}

export interface IntegrationConfiguration {
  // External service connections
  services?: ServiceConnection[]
  
  // Webhooks configuration
  webhooks?: WebhookConfiguration[]
  
  // API configurations
  apis?: APIConfiguration[]
  
  // Database connections
  databases?: DatabaseConnection[]
}

export interface CustomizationConfiguration {
  // Custom JavaScript/Python code
  customCode?: {
    language: 'javascript' | 'python'
    code: string
    variables: CustomVariable[]
  }
  
  // Custom UI components
  customUI?: {
    enabled: boolean
    componentCode: string
    styleOverrides: Record<string, string>
  }
  
  // Plugin integrations
  plugins?: PluginConfiguration[]
}

// ============================================================================
// AI ASSISTANCE SYSTEM
// ============================================================================

export interface AIAssistanceConfig {
  // Content generation assistance
  contentGeneration: {
    enabled: boolean
    provider: 'openai' | 'anthropic'
    templates: ContentTemplate[]
    personalization: PersonalizationConfig
  }
  
  // Configuration suggestions
  configSuggestions: {
    enabled: boolean
    suggestionTypes: SuggestionType[]
    learningFromHistory: boolean
  }
  
  // Performance optimization
  performanceOptimization: {
    enabled: boolean
    autoOptimize: boolean
    optimizationMetrics: OptimizationMetric[]
  }
  
  // Error prediction and prevention
  errorPrevention: {
    enabled: boolean
    predictiveAnalysis: boolean
    autoCorrection: boolean
  }
}

export interface ContentTemplate {
  id: string
  name: string
  category: string
  template: string
  variables: TemplateVariable[]
  aiPrompt: string
  personalizationRules: PersonalizationRule[]
}

export interface PersonalizationConfig {
  enabled: boolean
  dataPoints: string[]
  personalizationLevel: 'basic' | 'advanced' | 'deep'
  realTimeUpdates: boolean
}

export type SuggestionType = 
  | 'configuration_optimization'
  | 'condition_improvement'
  | 'action_enhancement'
  | 'workflow_structure'
  | 'performance_tuning'

export type OptimizationMetric = 
  | 'execution_time'
  | 'success_rate'
  | 'resource_usage'
  | 'user_engagement'
  | 'conversion_rate'

// ============================================================================
// SMART CONDITIONS SYSTEM
// ============================================================================

export interface SmartCondition extends Condition {
  // AI-powered condition evaluation
  aiEvaluation?: {
    enabled: boolean
    model: string
    prompt: string
    confidenceThreshold: number
  }
  
  // Dynamic condition updates
  dynamicUpdates?: {
    enabled: boolean
    updateSource: 'user_behavior' | 'performance_data' | 'external_api'
    updateFrequency: number
  }
  
  // Multi-dimensional conditions
  dimensions?: ConditionDimension[]
  
  // Time-based conditions
  temporalConditions?: TemporalCondition[]
}

export interface ConditionDimension {
  name: string
  field: string
  operator: string
  value: any
  weight: number
  influence: 'positive' | 'negative' | 'neutral'
}

export interface TemporalCondition {
  type: 'absolute' | 'relative' | 'recurring'
  timeExpression: string
  timezone: string
  businessHours?: BusinessHours
}

export interface BusinessHours {
  monday: TimeRange
  tuesday: TimeRange
  wednesday: TimeRange
  thursday: TimeRange
  friday: TimeRange
  saturday: TimeRange
  sunday: TimeRange
  holidays: string[]
}

export interface TimeRange {
  start: string // HH:MM format
  end: string   // HH:MM format
}

// ============================================================================
// FIELD MAPPING AND TRANSFORMATION
// ============================================================================

export interface FieldMapping {
  id: string
  sourceField: string
  targetField: string
  transformation?: DataTransformation
  conditionalMapping?: ConditionalMapping[]
  validation?: FieldValidation
}

export interface DataTransformation {
  type: TransformationType
  config: TransformationConfig
  customCode?: string
  aiTransformation?: AITransformationConfig
}

export type TransformationType = 
  | 'format'
  | 'calculate'
  | 'lookup'
  | 'aggregate'
  | 'filter'
  | 'merge'
  | 'split'
  | 'custom'
  | 'ai_transform'

export interface TransformationConfig {
  [key: string]: any
}

export interface AITransformationConfig {
  model: string
  prompt: string
  examples: TransformationExample[]
  outputFormat: 'text' | 'json' | 'structured'
}

export interface TransformationExample {
  input: any
  output: any
  description: string
}

export interface ConditionalMapping {
  condition: SmartCondition
  mapping: FieldMapping
  priority: number
}

export interface FieldValidation {
  required?: boolean
  type?: DataType
  pattern?: string
  min?: number
  max?: number
  customValidator?: string
}

// ============================================================================
// ERROR HANDLING AND RECOVERY
// ============================================================================

export interface ErrorHandlingConfig {
  strategy: ErrorHandlingStrategy
  retryConfig: RetryConfiguration
  fallbackActions: FallbackAction[]
  alerting: AlertingConfig
  logging: LoggingConfig
}

export type ErrorHandlingStrategy = 
  | 'fail_fast'
  | 'continue_on_error'
  | 'retry_then_fail'
  | 'fallback_action'
  | 'custom_handler'

export interface RetryConfiguration {
  maxAttempts: number
  delay: number
  backoffStrategy: 'fixed' | 'exponential' | 'linear'
  retryableErrors: string[]
  customRetryLogic?: string
}

export interface FallbackAction {
  id: string
  type: AdvancedNodeType
  config: DeepNodeConfiguration
  conditions: SmartCondition[]
}

export interface AlertingConfig {
  enabled: boolean
  channels: AlertChannel[]
  severity: 'low' | 'medium' | 'high' | 'critical'
  customMessage?: string
}

export interface AlertChannel {
  type: 'email' | 'sms' | 'slack' | 'webhook'
  config: Record<string, any>
}

export interface LoggingConfig {
  level: 'debug' | 'info' | 'warn' | 'error'
  destinations: LogDestination[]
  structuredLogging: boolean
  sensitiveDataHandling: 'mask' | 'remove' | 'encrypt'
}

export interface LogDestination {
  type: 'console' | 'file' | 'database' | 'external_service'
  config: Record<string, any>
}

// ============================================================================
// PERFORMANCE AND OPTIMIZATION
// ============================================================================

export interface PerformanceConfig {
  caching: CachingConfig
  parallelization: ParallelizationConfig
  resourceLimits: ResourceLimits
  monitoring: MonitoringConfig
}

export interface CachingConfig {
  enabled: boolean
  strategy: 'memory' | 'redis' | 'database'
  ttl: number
  keyStrategy: 'automatic' | 'custom'
  customKeyGenerator?: string
}

export interface ParallelizationConfig {
  enabled: boolean
  maxConcurrency: number
  batchSize: number
  queueingStrategy: 'fifo' | 'priority' | 'round_robin'
}

export interface ResourceLimits {
  maxMemoryMB: number
  maxExecutionTimeMs: number
  maxRetries: number
  rateLimitPerMinute: number
}

export interface MonitoringConfig {
  metricsCollection: boolean
  performanceTracking: boolean
  errorTracking: boolean
  customMetrics: CustomMetric[]
}

export interface CustomMetric {
  name: string
  type: 'counter' | 'gauge' | 'histogram'
  description: string
  labels: string[]
}

// ============================================================================
// UI CONFIGURATION
// ============================================================================

export interface NodeUIConfig {
  // Panel configuration
  configPanel: ConfigPanelConfig
  
  // Visual appearance
  appearance: NodeAppearanceConfig
  
  // Interactive elements
  interactions: InteractionConfig
  
  // Help and documentation
  documentation: DocumentationConfig
}

export interface ConfigPanelConfig {
  sections: ConfigSection[]
  layout: 'tabs' | 'accordion' | 'single_page'
  searchable: boolean
  collapsible: boolean
}

export interface ConfigSection {
  id: string
  title: string
  description?: string
  fields: ConfigField[]
  conditionalDisplay?: SmartCondition
}

export interface ConfigField {
  id: string
  type: FieldType
  label: string
  description?: string
  placeholder?: string
  defaultValue?: any
  validation?: FieldValidation
  dependencies?: FieldDependency[]
  aiAssistance?: FieldAIAssistance
}

export type FieldType = 
  | 'text'
  | 'textarea'
  | 'number'
  | 'boolean'
  | 'select'
  | 'multi_select'
  | 'date'
  | 'datetime'
  | 'color'
  | 'file'
  | 'json'
  | 'code'
  | 'email_selector'
  | 'ai_content_generator'
  | 'smart_form'
  | 'dynamic_list'
  | 'condition_builder'

export interface FieldDependency {
  field: string
  condition: SmartCondition
  action: 'show' | 'hide' | 'enable' | 'disable' | 'require'
}

export interface FieldAIAssistance {
  enabled: boolean
  type: 'content_generation' | 'auto_complete' | 'suggestions' | 'validation'
  prompt?: string
  examples?: any[]
}

export interface NodeAppearanceConfig {
  color: string
  icon: string
  size: 'small' | 'medium' | 'large'
  customCSS?: string
}

export interface InteractionConfig {
  clickable: boolean
  draggable: boolean
  resizable: boolean
  customHandlers: CustomHandler[]
}

export interface CustomHandler {
  event: string
  handler: string
}

export interface DocumentationConfig {
  enabled: boolean
  helpText: string
  examples: ConfigurationExample[]
  videoTutorials: string[]
  externalLinks: DocumentationLink[]
}

export interface ConfigurationExample {
  title: string
  description: string
  config: Record<string, any>
}

export interface DocumentationLink {
  title: string
  url: string
  type: 'documentation' | 'tutorial' | 'api_reference'
}

// ============================================================================
// EXECUTION METRICS AND ANALYTICS
// ============================================================================

export interface NodeExecutionMetrics {
  executionCount: number
  avgExecutionTime: number
  successRate: number
  errorRate: number
  lastExecutionTime?: string
  performanceScore: number
  optimizationSuggestions: OptimizationSuggestion[]
}

export interface OptimizationSuggestion {
  type: 'performance' | 'reliability' | 'cost' | 'user_experience'
  severity: 'low' | 'medium' | 'high'
  description: string
  implementation: string
  estimatedImpact: ImpactEstimate
}

export interface ImpactEstimate {
  performanceImprovement?: number
  costSaving?: number
  reliabilityIncrease?: number
  implementationEffort: 'low' | 'medium' | 'high'
}

// ============================================================================
// SUB-AGENT SYSTEM
// ============================================================================

export interface SubAgentSystem {
  agents: SubAgent[]
  orchestrationConfig: OrchestrationConfig
  communicationProtocol: CommunicationProtocol
}

export interface SubAgent {
  id: string
  name: string
  type: SubAgentType
  capabilities: AgentCapability[]
  config: SubAgentConfig
  status: AgentStatus
}

export type SubAgentType = 
  | 'data_enrichment'
  | 'lead_scoring'
  | 'content_optimization'
  | 'performance_monitor'
  | 'error_recovery'
  | 'trend_analysis'

export type AgentCapability = 
  | 'data_collection'
  | 'data_analysis'
  | 'prediction'
  | 'optimization'
  | 'monitoring'
  | 'alerting'

export interface SubAgentConfig {
  priority: number
  resources: ResourceAllocation
  schedule: AgentSchedule
  triggers: AgentTrigger[]
}

export interface ResourceAllocation {
  memoryLimitMB: number
  cpuTimeMs: number
  networkRequests: number
}

export interface AgentSchedule {
  frequency: number
  unit: 'seconds' | 'minutes' | 'hours' | 'days'
  conditions: SmartCondition[]
}

export interface AgentTrigger {
  event: string
  condition?: SmartCondition
  priority: number
}

export type AgentStatus = 'idle' | 'active' | 'busy' | 'error' | 'disabled'

export interface OrchestrationConfig {
  coordinationStrategy: 'centralized' | 'distributed' | 'hierarchical'
  conflictResolution: 'priority' | 'consensus' | 'override'
  resourceSharing: boolean
}

export interface CommunicationProtocol {
  messageFormat: 'json' | 'protobuf' | 'custom'
  encryption: boolean
  acknowledgement: boolean
  retryPolicy: RetryConfiguration
}

// ============================================================================
// VALIDATION RULES
// ============================================================================

export interface ValidationRule {
  id: string
  field: string
  type: ValidationType
  config: ValidationConfig
  errorMessage: string
  severity: 'warning' | 'error' | 'blocking'
}

export type ValidationType = 
  | 'required'
  | 'format'
  | 'range'
  | 'custom'
  | 'dependency'
  | 'ai_validation'

export interface ValidationConfig {
  [key: string]: any
}

// ============================================================================
// HELPER TYPES
// ============================================================================

export interface CustomVariable {
  name: string
  type: DataType
  description: string
  defaultValue?: any
}

export interface TemplateVariable {
  name: string
  type: DataType
  description: string
  required: boolean
  defaultValue?: any
}

export interface PersonalizationRule {
  condition: SmartCondition
  transformation: DataTransformation
}

export interface ServiceConnection {
  id: string
  type: string
  config: Record<string, any>
  authentication: AuthenticationConfig
}

export interface AuthenticationConfig {
  type: 'api_key' | 'oauth' | 'basic' | 'bearer' | 'custom'
  credentials: Record<string, any>
}

export interface WebhookConfiguration {
  url: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  headers: Record<string, string>
  authentication?: AuthenticationConfig
}

export interface APIConfiguration {
  baseUrl: string
  endpoints: APIEndpoint[]
  authentication?: AuthenticationConfig
  rateLimiting?: RateLimitConfig
}

export interface APIEndpoint {
  path: string
  method: string
  description: string
  parameters: APIParameter[]
}

export interface APIParameter {
  name: string
  type: string
  required: boolean
  description: string
}

export interface RateLimitConfig {
  requestsPerMinute: number
  burstLimit: number
  backoffStrategy: 'exponential' | 'linear' | 'fixed'
}

export interface DatabaseConnection {
  type: 'postgres' | 'mysql' | 'mongodb' | 'redis'
  connectionString: string
  poolSize: number
  timeout: number
}

export interface PluginConfiguration {
  name: string
  version: string
  config: Record<string, any>
  enabled: boolean
}

export interface AINodeConfiguration {
  modelProvider: 'openai' | 'anthropic' | 'local'
  modelName: string
  parameters: AIModelParameters
  prompts: AIPromptConfiguration
}

export interface AIModelParameters {
  temperature: number
  maxTokens: number
  topP: number
  frequencyPenalty: number
  presencePenalty: number
}

export interface AIPromptConfiguration {
  systemPrompt: string
  userPromptTemplate: string
  variables: TemplateVariable[]
  examples: PromptExample[]
}

export interface PromptExample {
  input: Record<string, any>
  output: string
  description: string
}

export interface OptimizationHint {
  type: 'performance' | 'cost' | 'reliability' | 'user_experience'
  description: string
  implementation: string
  priority: number
}

// ============================================================================
// WORKFLOW ENHANCEMENTS
// ============================================================================

export interface AdvancedWorkflow {
  // Base workflow properties
  id: string
  organizationId: string
  name: string
  description?: string
  
  // Enhanced workflow data
  nodes: AdvancedWorkflowNode[]
  edges: Edge[]
  
  // AI and optimization features
  aiOptimization: WorkflowAIConfig
  subAgents: SubAgentSystem
  
  // Advanced analytics
  analytics: WorkflowAnalyticsConfig
  
  // Performance monitoring
  monitoring: WorkflowMonitoringConfig
  
  // Version control and deployment
  versioning: VersionControlConfig
}

export interface WorkflowAIConfig {
  enabled: boolean
  optimizationGoals: OptimizationGoal[]
  learningConfig: WorkflowLearningConfig
  predictiveAnalytics: boolean
}

export interface OptimizationGoal {
  metric: OptimizationMetric
  target: number
  weight: number
}

export interface WorkflowLearningConfig {
  enabled: boolean
  learningRate: number
  dataRetention: number
  feedbackSources: string[]
}

export interface WorkflowAnalyticsConfig {
  enabled: boolean
  metricsToTrack: string[]
  reportingFrequency: 'real_time' | 'hourly' | 'daily' | 'weekly'
  dashboards: AnalyticsDashboard[]
}

export interface AnalyticsDashboard {
  id: string
  name: string
  widgets: DashboardWidget[]
}

export interface DashboardWidget {
  type: 'chart' | 'metric' | 'table' | 'heatmap'
  config: Record<string, any>
}

export interface WorkflowMonitoringConfig {
  enabled: boolean
  alerts: MonitoringAlert[]
  healthChecks: HealthCheck[]
}

export interface MonitoringAlert {
  condition: SmartCondition
  severity: 'low' | 'medium' | 'high' | 'critical'
  channels: AlertChannel[]
}

export interface HealthCheck {
  name: string
  type: 'endpoint' | 'database' | 'custom'
  config: Record<string, any>
  frequency: number
}

export interface VersionControlConfig {
  enabled: boolean
  autoVersioning: boolean
  approvalRequired: boolean
  rollbackEnabled: boolean
}
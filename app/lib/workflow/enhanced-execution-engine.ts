import { EventEmitter } from 'events';
import { createAdminClient } from '@/app/lib/supabase/admin';
import { queueManager } from '../queue/queue-manager';
import { QUEUE_NAMES, JOB_TYPES } from '../queue/config';
import { 
  EnhancedWorkflow, 
  WorkflowNode, 
  WorkflowExecution,
  ExecutionContext,
  NodeExecutionResult,
  WorkflowVariable
} from './types';

export class EnhancedWorkflowExecutor extends EventEmitter {
  private supabase = createAdminClient();
  private executionId: string;
  private workflowId: string;
  private organizationId: string;
  private context: ExecutionContext;
  private variables: Map<string, any> = new Map();
  private executionStats = {
    startTime: Date.now(),
    nodesExecuted: 0,
    errors: 0,
    retries: 0
  };

  constructor(
    workflowId: string, 
    organizationId: string, 
    executionId: string,
    initialContext: Record<string, any> = {}
  ) {
    super();
    this.workflowId = workflowId;
    this.organizationId = organizationId;
    this.executionId = executionId;
    this.context = {
      ...initialContext,
      workflowId,
      organizationId,
      executionId,
      startedAt: new Date().toISOString(),
      variables: {}
    };
  }

  async execute(triggerData: any): Promise<void> {
    try {
      this.emit('execution:start', { executionId: this.executionId });
      
      // Load workflow definition
      const workflow = await this.loadWorkflow();
      
      // Initialize variables
      await this.initializeVariables(workflow);
      
      // Update context with trigger data
      this.context = {
        ...this.context,
        trigger: triggerData,
        variables: Object.fromEntries(this.variables)
      };
      
      // Find and execute trigger node
      const triggerNode = workflow.nodes.find(n => n.type === 'trigger');
      if (!triggerNode) {
        throw new Error('No trigger node found in workflow');
      }
      
      // Validate trigger conditions
      const triggerValid = await this.evaluateTriggerConditions(triggerNode, triggerData);
      if (!triggerValid) {
        await this.completeExecution('skipped', 'Trigger conditions not met');
        return;
      }
      
      // Execute workflow starting from trigger
      await this.executeNode(triggerNode, workflow);
      
      // Complete execution
      await this.completeExecution('completed');
      
    } catch (error) {
      console.error('Workflow execution error:', error);
      this.emit('execution:error', { executionId: this.executionId, error });
      await this.completeExecution('failed', error.message);
      throw error;
    }
  }

  private async loadWorkflow(): Promise<EnhancedWorkflow> {
    const { data: workflow, error } = await this.supabase
      .from('workflows')
      .select(`
        *,
        workflow_variables(*),
        workflow_steps(*)
      `)
      .eq('id', this.workflowId)
      .single();
    
    if (error || !workflow) {
      throw new Error('Failed to load workflow');
    }
    
    return workflow;
  }

  private async initializeVariables(workflow: EnhancedWorkflow): Promise<void> {
    if (workflow.workflow_variables) {
      for (const variable of workflow.workflow_variables) {
        this.variables.set(variable.name, variable.default_value);
      }
    }
  }

  private async evaluateTriggerConditions(
    node: WorkflowNode, 
    triggerData: any
  ): Promise<boolean> {
    if (!node.data?.conditions?.length) {
      return true;
    }
    
    // Evaluate all conditions
    for (const condition of node.data.conditions) {
      const result = await this.evaluateCondition(condition, {
        ...this.context,
        trigger: triggerData
      });
      
      if (!result) {
        return false;
      }
    }
    
    return true;
  }

  private async executeNode(
    node: WorkflowNode, 
    workflow: EnhancedWorkflow
  ): Promise<void> {
    try {
      this.emit('node:start', { nodeId: node.id, nodeType: node.type });
      
      // Record node execution start
      await this.recordNodeExecution(node.id, 'started');
      
      let result: NodeExecutionResult;
      
      switch (node.type) {
        case 'trigger':
          result = { success: true, output: this.context.trigger };
          break;
          
        case 'action':
          result = await this.executeAction(node);
          break;
          
        case 'condition':
          result = await this.executeCondition(node);
          break;
          
        case 'delay':
          result = await this.executeDelay(node);
          break;
          
        case 'loop':
          result = await this.executeLoop(node, workflow);
          break;
          
        case 'webhook':
          result = await this.executeWebhook(node);
          break;
          
        default:
          throw new Error(`Unknown node type: ${node.type}`);
      }
      
      // Update context with node output
      if (result.output) {
        this.context[`node_${node.id}_output`] = result.output;
      }
      
      // Record success
      await this.recordNodeExecution(node.id, 'completed', result.output);
      this.executionStats.nodesExecuted++;
      
      // Execute next nodes based on result
      const nextNodes = await this.getNextNodes(node, workflow, result);
      
      // Queue next nodes for execution
      for (const nextNode of nextNodes) {
        if (node.data?.async) {
          // Queue for async execution
          await this.queueNodeExecution(nextNode, workflow);
        } else {
          // Execute synchronously
          await this.executeNode(nextNode, workflow);
        }
      }
      
      this.emit('node:complete', { 
        nodeId: node.id, 
        result,
        duration: Date.now() - this.executionStats.startTime 
      });
      
    } catch (error) {
      console.error(`Error executing node ${node.id}:`, error);
      this.executionStats.errors++;
      
      // Handle retry logic
      if (node.data?.retryConfig?.enabled) {
        const shouldRetry = await this.handleNodeRetry(node, error);
        if (shouldRetry) {
          return; // Retry will handle continuation
        }
      }
      
      // Record failure
      await this.recordNodeExecution(node.id, 'failed', null, error.message);
      
      // Check if workflow should continue on error
      if (!node.data?.continueOnError) {
        throw error;
      }
      
      this.emit('node:error', { nodeId: node.id, error });
    }
  }

  private async executeAction(node: WorkflowNode): Promise<NodeExecutionResult> {
    const actionType = node.data?.actionType;
    
    if (!actionType) {
      throw new Error('Action type not specified');
    }
    
    // Queue action for execution
    const job = await queueManager.addJob(
      QUEUE_NAMES.WORKFLOW_ACTIONS,
      JOB_TYPES.EXECUTE_ACTION,
      {
        nodeId: node.id,
        actionType,
        config: node.data,
        context: this.context,
        organizationId: this.organizationId,
        executionId: this.executionId
      },
      {
        priority: node.data?.priority || 5,
        attempts: node.data?.retryConfig?.maxAttempts || 3
      }
    );
    
    // Wait for action completion if synchronous
    if (!node.data?.async) {
      const result = await job.waitUntilFinished(queueManager.events);
      return result;
    }
    
    return { success: true, output: { jobId: job.id } };
  }

  private async executeCondition(node: WorkflowNode): Promise<NodeExecutionResult> {
    const conditions = node.data?.conditions || [];
    const logicOperator = node.data?.logicOperator || 'AND';
    
    let results: boolean[] = [];
    
    for (const condition of conditions) {
      const result = await this.evaluateCondition(condition, this.context);
      results.push(result);
    }
    
    const finalResult = logicOperator === 'AND' 
      ? results.every(r => r) 
      : results.some(r => r);
    
    return {
      success: true,
      output: {
        result: finalResult,
        evaluations: results,
        branch: finalResult ? 'true' : 'false'
      }
    };
  }

  private async executeDelay(node: WorkflowNode): Promise<NodeExecutionResult> {
    const delayConfig = node.data?.delay;
    
    if (!delayConfig) {
      throw new Error('Delay configuration not specified');
    }
    
    let delayMs: number;
    
    switch (delayConfig.type) {
      case 'fixed':
        delayMs = this.parseDelayValue(delayConfig.value, delayConfig.unit);
        break;
        
      case 'dynamic':
        delayMs = await this.calculateDynamicDelay(delayConfig, this.context);
        break;
        
      case 'schedule':
        delayMs = await this.calculateScheduledDelay(delayConfig);
        break;
        
      default:
        throw new Error(`Unknown delay type: ${delayConfig.type}`);
    }
    
    // Queue delayed execution
    const job = await queueManager.addJob(
      QUEUE_NAMES.WORKFLOW_EXECUTION,
      JOB_TYPES.RESUME_WORKFLOW,
      {
        workflowId: this.workflowId,
        executionId: this.executionId,
        nodeId: node.id,
        organizationId: this.organizationId,
        context: this.context
      },
      {
        delay: delayMs,
        priority: 1
      }
    );
    
    return {
      success: true,
      output: {
        delayMs,
        resumeAt: new Date(Date.now() + delayMs).toISOString(),
        jobId: job.id
      }
    };
  }

  private async executeLoop(
    node: WorkflowNode, 
    workflow: EnhancedWorkflow
  ): Promise<NodeExecutionResult> {
    const loopConfig = node.data?.loop;
    
    if (!loopConfig) {
      throw new Error('Loop configuration not specified');
    }
    
    const items = await this.resolveLoopItems(loopConfig, this.context);
    const results = [];
    
    for (let i = 0; i < items.length; i++) {
      const loopContext = {
        ...this.context,
        loop: {
          index: i,
          item: items[i],
          total: items.length,
          isFirst: i === 0,
          isLast: i === items.length - 1
        }
      };
      
      // Execute loop body nodes
      const bodyNodes = await this.getLoopBodyNodes(node, workflow);
      
      for (const bodyNode of bodyNodes) {
        const result = await this.executeNodeWithContext(bodyNode, workflow, loopContext);
        results.push(result);
      }
      
      // Check break condition
      if (loopConfig.breakCondition) {
        const shouldBreak = await this.evaluateCondition(
          loopConfig.breakCondition, 
          loopContext
        );
        if (shouldBreak) break;
      }
    }
    
    return {
      success: true,
      output: {
        iterations: results.length,
        results
      }
    };
  }

  private async executeWebhook(node: WorkflowNode): Promise<NodeExecutionResult> {
    const webhookConfig = node.data?.webhook;
    
    if (!webhookConfig) {
      throw new Error('Webhook configuration not specified');
    }
    
    // Interpolate URL and payload
    const url = this.interpolateVariables(webhookConfig.url, this.context);
    const headers = this.interpolateObject(webhookConfig.headers || {}, this.context);
    const payload = this.interpolateObject(webhookConfig.payload || {}, this.context);
    
    // Add authentication if configured
    if (webhookConfig.auth) {
      headers['Authorization'] = await this.getWebhookAuth(webhookConfig.auth);
    }
    
    try {
      const response = await fetch(url, {
        method: webhookConfig.method || 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        body: JSON.stringify(payload)
      });
      
      const responseData = await response.json().catch(() => null);
      
      if (!response.ok) {
        throw new Error(`Webhook failed: ${response.status} ${response.statusText}`);
      }
      
      return {
        success: true,
        output: {
          status: response.status,
          data: responseData
        }
      };
      
    } catch (error) {
      throw new Error(`Webhook execution failed: ${error.message}`);
    }
  }

  private async evaluateCondition(
    condition: any, 
    context: any
  ): Promise<boolean> {
    const { field, operator, value } = condition;
    
    // Get field value from context
    const fieldValue = this.getNestedValue(context, field);
    const compareValue = this.interpolateVariables(value, context);
    
    switch (operator) {
      case 'equals':
        return fieldValue === compareValue;
      case 'not_equals':
        return fieldValue !== compareValue;
      case 'contains':
        return String(fieldValue).includes(String(compareValue));
      case 'not_contains':
        return !String(fieldValue).includes(String(compareValue));
      case 'greater_than':
        return Number(fieldValue) > Number(compareValue);
      case 'less_than':
        return Number(fieldValue) < Number(compareValue);
      case 'in':
        return Array.isArray(compareValue) && compareValue.includes(fieldValue);
      case 'not_in':
        return Array.isArray(compareValue) && !compareValue.includes(fieldValue);
      case 'exists':
        return fieldValue !== undefined && fieldValue !== null;
      case 'not_exists':
        return fieldValue === undefined || fieldValue === null;
      default:
        return false;
    }
  }

  private interpolateVariables(template: string, context: any): any {
    if (typeof template !== 'string') return template;
    
    return template.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
      const value = this.getNestedValue(context, path.trim());
      return value !== undefined ? value : match;
    });
  }

  private interpolateObject(obj: any, context: any): any {
    if (typeof obj === 'string') {
      return this.interpolateVariables(obj, context);
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.interpolateObject(item, context));
    }
    
    if (obj && typeof obj === 'object') {
      const result: any = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = this.interpolateObject(value, context);
      }
      return result;
    }
    
    return obj;
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private async getNextNodes(
    currentNode: WorkflowNode,
    workflow: EnhancedWorkflow,
    result: NodeExecutionResult
  ): Promise<WorkflowNode[]> {
    const edges = workflow.edges || [];
    let targetEdges = edges.filter(e => e.source === currentNode.id);
    
    // Filter edges based on condition results
    if (currentNode.type === 'condition' && result.output?.branch) {
      targetEdges = targetEdges.filter(e => 
        e.data?.branch === result.output.branch || !e.data?.branch
      );
    }
    
    const nextNodeIds = targetEdges.map(e => e.target);
    const nextNodes = workflow.nodes.filter(n => nextNodeIds.includes(n.id));
    
    return nextNodes;
  }

  private parseDelayValue(value: number, unit: string): number {
    const multipliers: Record<string, number> = {
      seconds: 1000,
      minutes: 60 * 1000,
      hours: 60 * 60 * 1000,
      days: 24 * 60 * 60 * 1000
    };
    
    return value * (multipliers[unit] || 1000);
  }

  private async calculateDynamicDelay(config: any, context: any): Promise<number> {
    // Implement dynamic delay calculation based on context
    const baseDelay = this.parseDelayValue(config.baseValue, config.unit);
    
    // Add logic for dynamic adjustments based on context
    // For example, business hours, user engagement, etc.
    
    return baseDelay;
  }

  private async calculateScheduledDelay(config: any): Promise<number> {
    // Implement scheduled delay calculation
    // Parse cron expression or specific time
    const targetTime = new Date(config.scheduledTime);
    const now = new Date();
    
    return Math.max(0, targetTime.getTime() - now.getTime());
  }

  private async resolveLoopItems(config: any, context: any): Promise<any[]> {
    if (config.source === 'array') {
      const arrayPath = config.arrayPath;
      const items = this.getNestedValue(context, arrayPath);
      return Array.isArray(items) ? items : [];
    }
    
    if (config.source === 'range') {
      const start = Number(this.interpolateVariables(config.start, context));
      const end = Number(this.interpolateVariables(config.end, context));
      return Array.from({ length: end - start + 1 }, (_, i) => start + i);
    }
    
    return [];
  }

  private async getLoopBodyNodes(
    loopNode: WorkflowNode,
    workflow: EnhancedWorkflow
  ): Promise<WorkflowNode[]> {
    // Find nodes that are marked as part of the loop body
    const loopBodyNodeIds = loopNode.data?.bodyNodes || [];
    return workflow.nodes.filter(n => loopBodyNodeIds.includes(n.id));
  }

  private async executeNodeWithContext(
    node: WorkflowNode,
    workflow: EnhancedWorkflow,
    context: ExecutionContext
  ): Promise<NodeExecutionResult> {
    const originalContext = this.context;
    this.context = context;
    
    try {
      const result = await this.executeNode(node, workflow);
      return result;
    } finally {
      this.context = originalContext;
    }
  }

  private async getWebhookAuth(authConfig: any): Promise<string> {
    switch (authConfig.type) {
      case 'bearer':
        return `Bearer ${authConfig.token}`;
      case 'basic':
        const credentials = btoa(`${authConfig.username}:${authConfig.password}`);
        return `Basic ${credentials}`;
      case 'api_key':
        return authConfig.apiKey;
      default:
        return '';
    }
  }

  private async queueNodeExecution(
    node: WorkflowNode,
    workflow: EnhancedWorkflow
  ): Promise<void> {
    await queueManager.addJob(
      QUEUE_NAMES.WORKFLOW_EXECUTION,
      JOB_TYPES.EXECUTE_NODE,
      {
        nodeId: node.id,
        node,
        workflowId: this.workflowId,
        executionId: this.executionId,
        organizationId: this.organizationId,
        context: this.context,
        workflow
      },
      {
        priority: node.data?.priority || 5
      }
    );
  }

  private async handleNodeRetry(
    node: WorkflowNode,
    error: Error
  ): Promise<boolean> {
    const retryConfig = node.data?.retryConfig;
    const currentAttempt = (node.data?._retryCount || 0) + 1;
    
    if (currentAttempt >= (retryConfig.maxAttempts || 3)) {
      return false;
    }
    
    this.executionStats.retries++;
    
    // Calculate backoff delay
    const backoffMs = this.calculateBackoff(
      currentAttempt,
      retryConfig.backoffType || 'exponential',
      retryConfig.backoffBase || 1000
    );
    
    // Update node with retry count
    node.data._retryCount = currentAttempt;
    
    // Queue retry
    await queueManager.addJob(
      QUEUE_NAMES.WORKFLOW_EXECUTION,
      JOB_TYPES.RETRY_NODE,
      {
        node,
        workflowId: this.workflowId,
        executionId: this.executionId,
        organizationId: this.organizationId,
        context: this.context,
        attempt: currentAttempt,
        error: error.message
      },
      {
        delay: backoffMs,
        priority: 1
      }
    );
    
    return true;
  }

  private calculateBackoff(
    attempt: number,
    type: string,
    base: number
  ): number {
    switch (type) {
      case 'linear':
        return attempt * base;
      case 'exponential':
        return Math.pow(2, attempt - 1) * base;
      default:
        return base;
    }
  }

  private async recordNodeExecution(
    nodeId: string,
    status: string,
    output?: any,
    error?: string
  ): Promise<void> {
    await this.supabase
      .from('workflow_execution_logs')
      .insert({
        execution_id: this.executionId,
        node_id: nodeId,
        status,
        output,
        error_message: error,
        timestamp: new Date().toISOString()
      });
  }

  private async completeExecution(
    status: string,
    errorMessage?: string
  ): Promise<void> {
    const duration = Date.now() - this.executionStats.startTime;
    
    await this.supabase
      .from('workflow_executions')
      .update({
        status,
        completed_at: new Date().toISOString(),
        duration_ms: duration,
        nodes_executed: this.executionStats.nodesExecuted,
        error_count: this.executionStats.errors,
        retry_count: this.executionStats.retries,
        error_message: errorMessage,
        output_data: this.context
      })
      .eq('id', this.executionId);
    
    // Track analytics
    await queueManager.addJob(
      QUEUE_NAMES.WORKFLOW_ANALYTICS,
      JOB_TYPES.TRACK_EXECUTION,
      {
        event: 'workflow_completed',
        workflowId: this.workflowId,
        executionId: this.executionId,
        organizationId: this.organizationId,
        status,
        duration,
        stats: this.executionStats
      }
    );
    
    this.emit('execution:complete', {
      executionId: this.executionId,
      status,
      duration,
      stats: this.executionStats
    });
  }
}
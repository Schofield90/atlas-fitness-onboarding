import { Job } from 'bullmq';
import { createAdminClient } from '@/app/lib/supabase/admin';
import { enhancedQueueManager } from '../enhanced-queue-manager';
import { QUEUE_NAMES, JOB_TYPES, JOB_PRIORITIES } from '../enhanced-config';

interface WorkflowExecutionJobData {
  workflowId: string;
  organizationId: string;
  triggerData: any;
  context: {
    triggerType: string;
    triggeredAt: string;
    executionId?: string;
    parentExecutionId?: string;
    [key: string]: any;
  };
  variables?: Record<string, any>;
  settings?: {
    timeout?: number;
    maxRetries?: number;
    priority?: number;
  };
}

interface WorkflowNode {
  id: string;
  type: string;
  data: any;
  position: { x: number; y: number };
  connections?: {
    source: string;
    target: string;
    condition?: any;
  }[];
}

interface WorkflowDefinition {
  id: string;
  name: string;
  description?: string;
  nodes: WorkflowNode[];
  settings: {
    timeout?: number;
    maxConcurrentExecutions?: number;
    retryPolicy?: {
      maxRetries: number;
      backoffStrategy: 'fixed' | 'exponential';
      baseDelay: number;
    };
  };
}

interface ExecutionContext {
  workflowId: string;
  executionId: string;
  organizationId: string;
  variables: Record<string, any>;
  triggerData: any;
  startedAt: Date;
  currentNodeId?: string;
  parentExecutionId?: string;
  metadata: Record<string, any>;
}

export class WorkflowExecutionProcessor {
  private supabase = createAdminClient();

  async processWorkflowExecution(job: Job<WorkflowExecutionJobData>) {
    const { workflowId, organizationId, triggerData, context, variables = {}, settings } = job.data;
    
    console.log(`🚀 Processing workflow execution: ${workflowId} for org ${organizationId}`);
    
    const executionId = context.executionId || `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      // Create execution record
      await this.createExecutionRecord(executionId, workflowId, organizationId, context);
      
      // Get workflow definition
      const workflow = await this.getWorkflowDefinition(workflowId, organizationId);
      if (!workflow) {
        throw new Error(`Workflow ${workflowId} not found`);
      }

      // Initialize execution context
      const executionContext: ExecutionContext = {
        workflowId,
        executionId,
        organizationId,
        variables: { ...variables, ...this.extractTriggerVariables(triggerData) },
        triggerData,
        startedAt: new Date(),
        parentExecutionId: context.parentExecutionId,
        metadata: { ...context, jobId: job.id },
      };

      // Start workflow execution
      const result = await this.executeWorkflow(workflow, executionContext);
      
      // Update execution record with completion
      await this.updateExecutionRecord(executionId, 'completed', result);
      
      // Track analytics
      await this.trackWorkflowExecution(executionId, 'completed', {
        duration: Date.now() - executionContext.startedAt.getTime(),
        nodesExecuted: result.nodesExecuted || 0,
        variables: executionContext.variables,
      });

      console.log(`✅ Workflow execution completed: ${executionId}`);
      
      return {
        executionId,
        status: 'completed',
        result: result.finalResult,
        nodesExecuted: result.nodesExecuted,
        duration: Date.now() - executionContext.startedAt.getTime(),
      };

    } catch (error) {
      console.error(`❌ Workflow execution failed: ${executionId}`, error);
      
      // Update execution record with failure
      await this.updateExecutionRecord(executionId, 'failed', { 
        error: error.message,
        stack: error.stack 
      });
      
      // Track failure analytics
      await this.trackWorkflowExecution(executionId, 'failed', {
        error: error.message,
        duration: Date.now() - new Date(context.triggeredAt).getTime(),
      });
      
      throw error;
    }
  }

  private async createExecutionRecord(
    executionId: string, 
    workflowId: string, 
    organizationId: string, 
    context: any
  ) {
    const { error } = await this.supabase
      .from('workflow_executions')
      .insert({
        id: executionId,
        workflow_id: workflowId,
        organization_id: organizationId,
        status: 'running',
        trigger_data: context,
        started_at: new Date().toISOString(),
        parent_execution_id: context.parentExecutionId,
      });

    if (error) {
      throw new Error(`Failed to create execution record: ${error.message}`);
    }
  }

  private async updateExecutionRecord(
    executionId: string, 
    status: 'completed' | 'failed' | 'cancelled',
    result: any
  ) {
    const updateData: any = {
      status,
      completed_at: new Date().toISOString(),
    };

    if (status === 'completed') {
      updateData.result = result;
    } else if (status === 'failed') {
      updateData.error = result;
    }

    const { error } = await this.supabase
      .from('workflow_executions')
      .update(updateData)
      .eq('id', executionId);

    if (error) {
      console.error(`Failed to update execution record: ${error.message}`);
    }
  }

  private async getWorkflowDefinition(workflowId: string, organizationId: string): Promise<WorkflowDefinition | null> {
    const { data: workflow, error } = await this.supabase
      .from('workflows')
      .select('*')
      .eq('id', workflowId)
      .eq('organization_id', organizationId)
      .single();

    if (error) {
      throw new Error(`Failed to fetch workflow: ${error.message}`);
    }

    if (!workflow) {
      return null;
    }

    return {
      id: workflow.id,
      name: workflow.name,
      description: workflow.description,
      nodes: workflow.definition?.nodes || [],
      settings: workflow.settings || {},
    };
  }

  private extractTriggerVariables(triggerData: any): Record<string, any> {
    const variables: Record<string, any> = {};
    
    if (triggerData) {
      // Extract common variables from trigger data
      if (triggerData.lead) {
        variables.leadId = triggerData.lead.id;
        variables.leadEmail = triggerData.lead.email;
        variables.leadName = triggerData.lead.name;
        variables.leadPhone = triggerData.lead.phone;
        variables.leadScore = triggerData.lead.score;
      }
      
      if (triggerData.contact) {
        variables.contactId = triggerData.contact.id;
        variables.contactEmail = triggerData.contact.email;
        variables.contactName = triggerData.contact.name;
      }
      
      if (triggerData.booking) {
        variables.bookingId = triggerData.booking.id;
        variables.bookingDate = triggerData.booking.date;
        variables.bookingType = triggerData.booking.type;
      }
      
      // Add timestamp variables
      variables.currentDate = new Date().toISOString().split('T')[0];
      variables.currentTime = new Date().toISOString();
      variables.currentTimestamp = Date.now();
    }
    
    return variables;
  }

  private async executeWorkflow(
    workflow: WorkflowDefinition, 
    context: ExecutionContext
  ): Promise<{ finalResult: any; nodesExecuted: number }> {
    console.log(`🏃 Starting workflow execution: ${workflow.name}`);
    
    const executedNodes = new Set<string>();
    let currentNodes = this.findStartNodes(workflow.nodes);
    let finalResult: any = null;
    
    // Set execution timeout
    const timeout = workflow.settings.timeout || 300000; // 5 minutes default
    const startTime = Date.now();
    
    while (currentNodes.length > 0 && Date.now() - startTime < timeout) {
      const nextNodes: string[] = [];
      
      for (const nodeId of currentNodes) {
        if (executedNodes.has(nodeId)) continue;
        
        const node = workflow.nodes.find(n => n.id === nodeId);
        if (!node) {
          console.warn(`⚠️  Node ${nodeId} not found in workflow`);
          continue;
        }
        
        try {
          console.log(`🔧 Executing node: ${node.id} (${node.type})`);
          
          // Update current node in context
          context.currentNodeId = node.id;
          
          // Execute node
          const nodeResult = await this.executeNode(node, context);
          executedNodes.add(node.id);
          
          // Update variables with node result
          if (nodeResult && typeof nodeResult === 'object' && nodeResult.variables) {
            Object.assign(context.variables, nodeResult.variables);
          }
          
          // Store final result from end nodes
          if (node.type === 'end' || this.isEndNode(node, workflow.nodes)) {
            finalResult = nodeResult;
          }
          
          // Find next nodes to execute
          const connectedNodes = this.findConnectedNodes(node, workflow.nodes, nodeResult, context);
          nextNodes.push(...connectedNodes);
          
        } catch (error) {
          console.error(`❌ Node execution failed: ${node.id}`, error);
          
          // Handle error based on node configuration
          if (node.data?.onError === 'stop') {
            throw error;
          } else if (node.data?.onError === 'continue') {
            // Continue to next nodes
            const connectedNodes = this.findConnectedNodes(node, workflow.nodes, { error: error.message }, context);
            nextNodes.push(...connectedNodes);
          } else {
            // Default: stop execution
            throw error;
          }
        }
      }
      
      currentNodes = [...new Set(nextNodes)]; // Remove duplicates
    }
    
    if (Date.now() - startTime >= timeout) {
      throw new Error(`Workflow execution timed out after ${timeout}ms`);
    }
    
    return {
      finalResult: finalResult || { status: 'completed' },
      nodesExecuted: executedNodes.size,
    };
  }

  private findStartNodes(nodes: WorkflowNode[]): string[] {
    return nodes
      .filter(node => node.type === 'trigger' || this.isStartNode(node, nodes))
      .map(node => node.id);
  }

  private isStartNode(node: WorkflowNode, nodes: WorkflowNode[]): boolean {
    // A node is a start node if no other node connects to it
    return !nodes.some(n => 
      n.connections?.some(conn => conn.target === node.id)
    );
  }

  private isEndNode(node: WorkflowNode, nodes: WorkflowNode[]): boolean {
    // A node is an end node if it doesn't connect to any other node
    return !node.connections || node.connections.length === 0;
  }

  private findConnectedNodes(
    currentNode: WorkflowNode, 
    allNodes: WorkflowNode[], 
    nodeResult: any,
    context: ExecutionContext
  ): string[] {
    if (!currentNode.connections) return [];
    
    const connectedNodes: string[] = [];
    
    for (const connection of currentNode.connections) {
      // Check if connection condition is met
      if (this.evaluateCondition(connection.condition, nodeResult, context)) {
        connectedNodes.push(connection.target);
      }
    }
    
    return connectedNodes;
  }

  private evaluateCondition(condition: any, nodeResult: any, context: ExecutionContext): boolean {
    if (!condition) return true; // No condition means always connect
    
    try {
      // Simple condition evaluation (can be enhanced with a proper expression evaluator)
      switch (condition.type) {
        case 'equals':
          return this.getValue(condition.left, nodeResult, context) === condition.right;
        case 'not_equals':
          return this.getValue(condition.left, nodeResult, context) !== condition.right;
        case 'greater_than':
          return Number(this.getValue(condition.left, nodeResult, context)) > Number(condition.right);
        case 'less_than':
          return Number(this.getValue(condition.left, nodeResult, context)) < Number(condition.right);
        case 'contains':
          return String(this.getValue(condition.left, nodeResult, context)).includes(condition.right);
        case 'success':
          return !nodeResult?.error;
        case 'error':
          return !!nodeResult?.error;
        default:
          console.warn(`Unknown condition type: ${condition.type}`);
          return true;
      }
    } catch (error) {
      console.error('Condition evaluation error:', error);
      return false;
    }
  }

  private getValue(path: string, nodeResult: any, context: ExecutionContext): any {
    if (path.startsWith('result.')) {
      return this.getNestedValue(nodeResult, path.substring(7));
    } else if (path.startsWith('variables.')) {
      return this.getNestedValue(context.variables, path.substring(10));
    } else if (path.startsWith('trigger.')) {
      return this.getNestedValue(context.triggerData, path.substring(8));
    }
    return path; // Return as literal value
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private async executeNode(node: WorkflowNode, context: ExecutionContext): Promise<any> {
    // Queue the node execution to the appropriate processor
    switch (node.type) {
      case 'action':
        return this.queueActionNode(node, context);
      case 'condition':
        return this.executeConditionNode(node, context);
      case 'delay':
        return this.queueDelayNode(node, context);
      case 'branch':
        return this.executeBranchNode(node, context);
      case 'end':
        return this.executeEndNode(node, context);
      default:
        console.warn(`Unknown node type: ${node.type}`);
        return { status: 'skipped' };
    }
  }

  private async queueActionNode(node: WorkflowNode, context: ExecutionContext): Promise<any> {
    // Queue action execution to action processor
    const job = await enhancedQueueManager.addJob(
      QUEUE_NAMES.WORKFLOW_ACTIONS,
      JOB_TYPES.EXECUTE_NODE,
      {
        nodeId: node.id,
        nodeType: node.type,
        nodeData: node.data,
        executionContext: {
          executionId: context.executionId,
          workflowId: context.workflowId,
          organizationId: context.organizationId,
          variables: context.variables,
          triggerData: context.triggerData,
        },
      },
      {
        priority: JOB_PRIORITIES.HIGH,
      }
    );
    
    // For synchronous execution, wait for the job to complete
    // In a production system, you might want to make this asynchronous
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Node execution timeout: ${node.id}`));
      }, 30000); // 30 second timeout
      
      job.waitUntilFinished(enhancedQueueManager.getQueue(QUEUE_NAMES.WORKFLOW_ACTIONS).events)
        .then((result) => {
          clearTimeout(timeout);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timeout);
          reject(error);
        });
    });
  }

  private async executeConditionNode(node: WorkflowNode, context: ExecutionContext): Promise<any> {
    const condition = node.data?.condition;
    const result = this.evaluateCondition(condition, {}, context);
    
    return {
      conditionMet: result,
      path: result ? 'true' : 'false',
    };
  }

  private async queueDelayNode(node: WorkflowNode, context: ExecutionContext): Promise<any> {
    const delay = node.data?.delay || 0; // Delay in milliseconds
    
    if (delay > 0) {
      // Queue a delayed job
      await enhancedQueueManager.addJob(
        QUEUE_NAMES.WORKFLOW_WAIT,
        JOB_TYPES.WAIT_DELAY,
        {
          executionId: context.executionId,
          nodeId: node.id,
          originalContext: context,
        },
        {
          delay,
          priority: JOB_PRIORITIES.LOW,
        }
      );
    }
    
    return { delayed: delay };
  }

  private async executeBranchNode(node: WorkflowNode, context: ExecutionContext): Promise<any> {
    // Branch nodes can create parallel execution paths
    const branches = node.data?.branches || [];
    const results: any[] = [];
    
    for (const branch of branches) {
      if (this.evaluateCondition(branch.condition, {}, context)) {
        // Queue branch execution
        const branchJob = await enhancedQueueManager.addJob(
          QUEUE_NAMES.WORKFLOW_ACTIONS,
          JOB_TYPES.EXECUTE_BRANCH,
          {
            branchId: branch.id,
            branchData: branch,
            executionContext: context,
          },
          {
            priority: JOB_PRIORITIES.NORMAL,
          }
        );
        
        results.push({ branchId: branch.id, jobId: branchJob.id });
      }
    }
    
    return { branches: results };
  }

  private async executeEndNode(node: WorkflowNode, context: ExecutionContext): Promise<any> {
    return {
      status: 'completed',
      executionId: context.executionId,
      variables: context.variables,
      endedAt: new Date().toISOString(),
    };
  }

  private async trackWorkflowExecution(
    executionId: string, 
    status: 'completed' | 'failed',
    metadata: any
  ) {
    try {
      await enhancedQueueManager.addJob(
        QUEUE_NAMES.WORKFLOW_ANALYTICS,
        JOB_TYPES.TRACK_EXECUTION,
        {
          event: 'workflow_execution',
          executionId,
          status,
          metadata,
          timestamp: new Date().toISOString(),
        },
        {
          priority: JOB_PRIORITIES.LOW,
        }
      );
    } catch (error) {
      console.error('Failed to track workflow execution:', error);
    }
  }
}

// Create and export processor instance
export const workflowExecutionProcessor = new WorkflowExecutionProcessor();

// Export the main processing function for the job queue
export async function processWorkflowExecution(job: Job<WorkflowExecutionJobData>) {
  return workflowExecutionProcessor.processWorkflowExecution(job);
}
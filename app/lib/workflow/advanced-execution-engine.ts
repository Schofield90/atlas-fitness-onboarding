import { createAdminClient } from '@/app/lib/supabase/admin';
import { sendEmail } from '@/app/lib/email';
import { sendSMS } from '@/app/lib/sms';
import { sendWhatsApp } from '@/app/lib/whatsapp';

export interface AdvancedWorkflowNode {
  id: string;
  type: 'trigger' | 'action' | 'condition' | 'loop' | 'parallel' | 'merge' | 'delay';
  data: any;
  position: { x: number; y: number };
}

export interface AdvancedWorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

export interface AdvancedWorkflowExecution {
  workflowId: string;
  organizationId: string;
  triggerData: any;
  context: Record<string, any>;
  parallelContexts?: Map<string, any>;
  loopStates?: Map<string, { iteration: number; maxIterations: number }>;
}

export interface ExecutionBranch {
  id: string;
  nodeId: string;
  context: any;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt?: Date;
  completedAt?: Date;
}

export class AdvancedWorkflowExecutionEngine {
  private supabase: any;
  private executionId: string | null = null;
  private steps: any[] = [];
  private activeBranches: Map<string, ExecutionBranch> = new Map();
  private completedBranches: Map<string, ExecutionBranch> = new Map();
  private nodeResults: Map<string, any> = new Map();

  constructor() {
    // Will be initialized when needed
  }

  async initialize() {
    this.supabase = await createAdminClient();
  }

  async executeWorkflow(execution: AdvancedWorkflowExecution) {
    if (!this.supabase) {
      await this.initialize();
    }

    try {
      // Get workflow details
      const { data: workflow, error: workflowError } = await this.supabase
        .from('workflows')
        .select('*')
        .eq('id', execution.workflowId)
        .eq('organization_id', execution.organizationId)
        .single();

      if (workflowError || !workflow) {
        throw new Error('Workflow not found');
      }

      if (workflow.status !== 'active') {
        console.log(`Workflow ${workflow.name} is not active`);
        return;
      }

      // Create execution record
      const { data: executionRecord, error: execError } = await this.supabase
        .from('workflow_executions')
        .insert({
          workflow_id: execution.workflowId,
          organization_id: execution.organizationId,
          status: 'running',
          triggered_by: execution.triggerData.type || 'manual',
          trigger_data: execution.triggerData,
          input_data: execution.context
        })
        .select()
        .single();

      if (execError || !executionRecord) {
        throw new Error('Failed to create execution record');
      }

      this.executionId = executionRecord.id;

      // Parse workflow nodes and edges
      const nodes: AdvancedWorkflowNode[] = workflow.nodes || [];
      const edges: AdvancedWorkflowEdge[] = workflow.edges || [];

      // Find trigger node
      const triggerNode = nodes.find(n => n.type === 'trigger');
      if (!triggerNode) {
        throw new Error('No trigger node found');
      }

      // Initialize execution context
      const initialContext = { 
        ...execution.context, 
        ...execution.triggerData,
        _executionId: this.executionId,
        _workflowId: execution.workflowId
      };

      // Start execution from trigger node
      await this.executeAdvancedWorkflow(triggerNode, nodes, edges, initialContext);

      // Update execution as completed
      await this.completeExecution('completed', initialContext);

      // Update workflow stats
      await this.updateWorkflowStats(execution.workflowId, true);

    } catch (error) {
      console.error('Advanced workflow execution error:', error);
      await this.completeExecution('failed', {}, error.message);
      await this.updateWorkflowStats(execution.workflowId, false);
      throw error;
    }
  }

  private async executeAdvancedWorkflow(
    startNode: AdvancedWorkflowNode, 
    nodes: AdvancedWorkflowNode[], 
    edges: AdvancedWorkflowEdge[], 
    context: any
  ) {
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    const edgeMap = new Map<string, AdvancedWorkflowEdge[]>();
    
    // Build edge map for efficient lookups
    edges.forEach(edge => {
      if (!edgeMap.has(edge.source)) {
        edgeMap.set(edge.source, []);
      }
      edgeMap.get(edge.source)!.push(edge);
    });

    // Execute starting from the trigger
    await this.executeNode(startNode, nodeMap, edgeMap, context);
  }

  private async executeNode(
    node: AdvancedWorkflowNode,
    nodeMap: Map<string, AdvancedWorkflowNode>,
    edgeMap: Map<string, AdvancedWorkflowEdge[]>,
    context: any
  ): Promise<any> {
    console.log(`🎬 Executing node: ${node.data.label} (${node.type})`);

    try {
      let result: any;
      
      switch (node.type) {
        case 'trigger':
          result = await this.executeTriggerNode(node, context);
          break;
        case 'action':
          result = await this.executeActionNode(node, context);
          break;
        case 'condition':
          result = await this.executeConditionNode(node, context);
          break;
        case 'loop':
          result = await this.executeLoopNode(node, nodeMap, edgeMap, context);
          break;
        case 'parallel':
          result = await this.executeParallelNode(node, nodeMap, edgeMap, context);
          break;
        case 'merge':
          result = await this.executeMergeNode(node, context);
          break;
        case 'delay':
          result = await this.executeDelayNode(node, context);
          break;
        default:
          console.warn(`Unknown node type: ${node.type}`);
          result = context;
      }

      // Store node result for later reference
      this.nodeResults.set(node.id, result);

      // Log step execution
      this.steps.push({
        nodeId: node.id,
        nodeType: node.type,
        nodeLabel: node.data.label,
        status: 'completed',
        timestamp: new Date().toISOString(),
        result
      });

      // Continue to next nodes based on node type and result
      await this.continueExecution(node, result, nodeMap, edgeMap);

      return result;

    } catch (error) {
      console.error(`Node execution failed: ${node.data.label}`, error);
      
      this.steps.push({
        nodeId: node.id,
        nodeType: node.type,
        nodeLabel: node.data.label,
        status: 'failed',
        error: error.message,
        timestamp: new Date().toISOString()
      });

      throw error;
    }
  }

  private async continueExecution(
    node: AdvancedWorkflowNode,
    result: any,
    nodeMap: Map<string, AdvancedWorkflowNode>,
    edgeMap: Map<string, AdvancedWorkflowEdge[]>
  ) {
    const outgoingEdges = edgeMap.get(node.id) || [];
    
    if (node.type === 'condition') {
      // For condition nodes, choose path based on result
      const branchTaken = result.conditionMet ? 'true' : 'false';
      const nextEdge = outgoingEdges.find(e => e.sourceHandle === branchTaken);
      
      if (nextEdge) {
        const nextNode = nodeMap.get(nextEdge.target);
        if (nextNode) {
          await this.executeNode(nextNode, nodeMap, edgeMap, result.context);
        }
      }
    } else if (node.type === 'parallel') {
      // Parallel execution is handled within the parallel node execution
      return;
    } else if (node.type === 'loop') {
      // Loop execution is handled within the loop node execution
      return;
    } else {
      // For regular nodes, continue to all connected nodes
      for (const edge of outgoingEdges) {
        const nextNode = nodeMap.get(edge.target);
        if (nextNode) {
          await this.executeNode(nextNode, nodeMap, edgeMap, result);
        }
      }
    }
  }

  private async executeTriggerNode(node: AdvancedWorkflowNode, context: any) {
    console.log('📍 Executing trigger node');
    return context;
  }

  private async executeActionNode(node: AdvancedWorkflowNode, context: any) {
    const { label, config } = node.data;
    
    switch (label) {
      case 'Send Email':
        await this.executeSendEmailAdvanced(config, context);
        break;
      case 'Send SMS':
        await this.executeSendSMSAdvanced(config, context);
        break;
      case 'Send WhatsApp':
        await this.executeSendWhatsAppAdvanced(config, context);
        break;
      case 'Add/Remove Tags':
        await this.executeTagManagement(config, context);
        break;
      case 'Update Lead Score':
        await this.executeLeadScoreUpdate(config, context);
        break;
      case 'Create Task':
        await this.executeCreateTask(config, context);
        break;
      default:
        console.warn(`Unknown action type: ${label}`);
    }
    
    return {
      ...context,
      [`action_${node.id}_completed`]: true,
      [`action_${node.id}_timestamp`]: new Date().toISOString()
    };
  }

  private async executeConditionNode(node: AdvancedWorkflowNode, context: any) {
    const { config } = node.data;
    let conditionMet = false;

    switch (config.conditionType) {
      case 'lead_score':
        conditionMet = await this.evaluateLeadScoreCondition(config, context);
        break;
      case 'tags':
        conditionMet = await this.evaluateTagCondition(config, context);
        break;
      case 'time_based':
        conditionMet = await this.evaluateTimeBasedCondition(config, context);
        break;
      case 'field_comparison':
        conditionMet = await this.evaluateFieldComparisonCondition(config, context);
        break;
      case 'activity':
        conditionMet = await this.evaluateActivityCondition(config, context);
        break;
      case 'multi_condition':
        conditionMet = await this.evaluateMultiCondition(config, context);
        break;
      default:
        console.warn(`Unknown condition type: ${config.conditionType}`);
    }

    console.log(`🤔 Condition result: ${conditionMet ? 'TRUE' : 'FALSE'}`);

    return {
      context: {
        ...context,
        [`condition_${node.id}`]: conditionMet,
        [`condition_${node.id}_metadata`]: {
          conditionType: config.conditionType,
          result: conditionMet,
          evaluatedAt: new Date().toISOString()
        }
      },
      conditionMet
    };
  }

  private async executeLoopNode(
    node: AdvancedWorkflowNode, 
    nodeMap: Map<string, AdvancedWorkflowNode>,
    edgeMap: Map<string, AdvancedWorkflowEdge[]>,
    context: any
  ) {
    const { config } = node.data;
    const maxIterations = config.maxIterations || 10;
    let iteration = 0;
    let currentContext = context;

    console.log(`🔄 Starting loop: max ${maxIterations} iterations`);

    while (iteration < maxIterations) {
      iteration++;
      console.log(`🔄 Loop iteration ${iteration}/${maxIterations}`);

      // Check break condition if defined
      if (config.breakCondition) {
        const breakConditionMet = await this.evaluateBreakCondition(config.breakCondition, currentContext);
        if (breakConditionMet) {
          console.log('🛑 Break condition met, exiting loop');
          break;
        }
      }

      // Execute loop body
      const loopBodyEdges = edgeMap.get(node.id)?.filter(e => e.sourceHandle === 'loop-body') || [];
      for (const edge of loopBodyEdges) {
        const bodyNode = nodeMap.get(edge.target);
        if (bodyNode) {
          currentContext = await this.executeNode(bodyNode, nodeMap, edgeMap, currentContext);
        }
      }

      // Add small delay to prevent runaway loops
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Continue with next nodes after loop completion
    const continueEdges = edgeMap.get(node.id)?.filter(e => e.sourceHandle === 'continue') || [];
    for (const edge of continueEdges) {
      const nextNode = nodeMap.get(edge.target);
      if (nextNode) {
        await this.executeNode(nextNode, nodeMap, edgeMap, currentContext);
      }
    }

    return {
      ...currentContext,
      [`loop_${node.id}_iterations`]: iteration,
      [`loop_${node.id}_completed`]: true
    };
  }

  private async executeParallelNode(
    node: AdvancedWorkflowNode,
    nodeMap: Map<string, AdvancedWorkflowNode>,
    edgeMap: Map<string, AdvancedWorkflowEdge[]>,
    context: any
  ) {
    const { config } = node.data;
    const branches = config.branches || 2;
    const waitForAll = config.waitForAll !== false;

    console.log(`⚡ Starting parallel execution: ${branches} branches, wait for ${waitForAll ? 'all' : 'first'}`);

    const branchEdges = edgeMap.get(node.id)?.filter(e => e.sourceHandle?.startsWith('branch-')) || [];
    const branchPromises: Promise<any>[] = [];

    // Execute each branch in parallel
    for (let i = 0; i < Math.min(branches, branchEdges.length); i++) {
      const edge = branchEdges[i];
      const branchNode = nodeMap.get(edge.target);
      
      if (branchNode) {
        const branchPromise = this.executeNode(branchNode, nodeMap, edgeMap, { ...context });
        branchPromises.push(branchPromise);
      }
    }

    let results: any[];
    
    if (waitForAll) {
      // Wait for all branches to complete
      results = await Promise.all(branchPromises);
      console.log(`⚡ All ${results.length} branches completed`);
    } else {
      // Wait for first branch to complete
      const firstResult = await Promise.race(branchPromises);
      results = [firstResult];
      console.log('⚡ First branch completed, continuing execution');
    }

    // Merge results from all branches
    const mergedContext = this.mergeBranchResults(context, results);

    return {
      ...mergedContext,
      [`parallel_${node.id}_branches`]: results.length,
      [`parallel_${node.id}_completed`]: true
    };
  }

  private async executeMergeNode(node: AdvancedWorkflowNode, context: any) {
    const { config } = node.data;
    
    console.log(`🔗 Executing merge node: ${config.strategy}`);
    
    // In a real implementation, this would wait for multiple inputs
    // For now, we'll just pass through the context
    return {
      ...context,
      [`merge_${node.id}_completed`]: true,
      [`merge_${node.id}_strategy`]: config.strategy
    };
  }

  private async executeDelayNode(node: AdvancedWorkflowNode, context: any) {
    const { config } = node.data;
    let delayMs = this.calculateDelay(config.baseDelay);
    
    // Apply conditional delays
    if (config.conditions && config.conditions.length > 0) {
      for (const condition of config.conditions) {
        if (await this.evaluateDelayCondition(condition.condition, context)) {
          delayMs = this.applyDelayModifier(delayMs, condition.delayModifier);
        }
      }
    }

    console.log(`⏸️ Delaying execution for ${delayMs}ms`);
    
    // Cap delay for safety (max 5 minutes in production)
    const maxDelay = 5 * 60 * 1000;
    delayMs = Math.min(delayMs, maxDelay);
    
    await new Promise(resolve => setTimeout(resolve, delayMs));
    
    return {
      ...context,
      [`delay_${node.id}_duration`]: delayMs,
      [`delay_${node.id}_completed`]: true
    };
  }

  // Condition evaluation methods
  private async evaluateLeadScoreCondition(config: any, context: any): Promise<boolean> {
    const leadScore = context.lead?.score || context.score || 0;
    
    switch (config.operator) {
      case 'greater_than':
        return leadScore > (config.value || 0);
      case 'less_than':
        return leadScore < (config.value || 0);
      case 'equals':
        return leadScore === (config.value || 0);
      case 'between':
        return leadScore >= (config.minValue || 0) && leadScore <= (config.maxValue || 100);
      case 'greater_than_or_equal':
        return leadScore >= (config.value || 0);
      case 'less_than_or_equal':
        return leadScore <= (config.value || 0);
      default:
        return false;
    }
  }

  private async evaluateTagCondition(config: any, context: any): Promise<boolean> {
    const leadTags = context.lead?.tags || context.tags || [];
    const targetTags = config.tags || [];
    
    switch (config.operator) {
      case 'has_tag':
        return targetTags.some((tag: string) => leadTags.includes(tag));
      case 'not_has_tag':
        return !targetTags.some((tag: string) => leadTags.includes(tag));
      case 'has_any':
        return targetTags.some((tag: string) => leadTags.includes(tag));
      case 'has_all':
        return targetTags.every((tag: string) => leadTags.includes(tag));
      default:
        return false;
    }
  }

  private async evaluateTimeBasedCondition(config: any, context: any): Promise<boolean> {
    const now = new Date();
    
    switch (config.timeType) {
      case 'business_hours':
        const hour = now.getHours();
        const startHour = parseInt(config.startTime?.split(':')[0] || '9');
        const endHour = parseInt(config.endTime?.split(':')[0] || '17');
        return hour >= startHour && hour <= endHour;
        
      case 'specific_days':
        const dayOfWeek = now.getDay(); // 0 = Sunday
        const workDays = config.workDays || [1, 2, 3, 4, 5]; // Mon-Fri by default
        return workDays.includes(dayOfWeek);
        
      case 'date_range':
        if (config.startDate && config.endDate) {
          const start = new Date(config.startDate);
          const end = new Date(config.endDate);
          return now >= start && now <= end;
        }
        return true;
        
      default:
        return true;
    }
  }

  private async evaluateFieldComparisonCondition(config: any, context: any): Promise<boolean> {
    const lead = context.lead || context;
    const fieldValue = lead[config.field];
    const targetValue = config.value;
    
    switch (config.operator) {
      case 'equals':
        return fieldValue === targetValue;
      case 'not_equals':
        return fieldValue !== targetValue;
      case 'contains':
        return fieldValue && fieldValue.toString().includes(targetValue);
      case 'not_contains':
        return !fieldValue || !fieldValue.toString().includes(targetValue);
      case 'starts_with':
        return fieldValue && fieldValue.toString().startsWith(targetValue);
      case 'ends_with':
        return fieldValue && fieldValue.toString().endsWith(targetValue);
      case 'is_empty':
        return !fieldValue || fieldValue === '' || fieldValue === null;
      case 'is_not_empty':
        return fieldValue && fieldValue !== '' && fieldValue !== null;
      default:
        return false;
    }
  }

  private async evaluateActivityCondition(config: any, context: any): Promise<boolean> {
    // This would typically query the database for activity records
    // For now, we'll simulate based on context
    const activityType = config.activityType;
    const timeframe = config.timeframe;
    const operator = config.operator;
    
    // Simulate activity check
    console.log(`🎯 Checking ${activityType} activity within ${timeframe.value} ${timeframe.unit}`);
    
    // In a real implementation, this would query activity logs
    return Math.random() > 0.5; // Simulate 50% chance of activity
  }

  private async evaluateMultiCondition(config: any, context: any): Promise<boolean> {
    const conditions = config.conditions || [];
    const logic = config.logic || 'AND';
    
    const results = await Promise.all(
      conditions.map((condition: any) => this.evaluateSingleCondition(condition, context))
    );
    
    if (logic === 'AND') {
      return results.every(result => result);
    } else if (logic === 'OR') {
      return results.some(result => result);
    }
    
    return false;
  }

  private async evaluateSingleCondition(condition: any, context: any): Promise<boolean> {
    // Recursively evaluate individual conditions
    switch (condition.type) {
      case 'lead_score':
        return this.evaluateLeadScoreCondition(condition, context);
      case 'tags':
        return this.evaluateTagCondition(condition, context);
      case 'field_comparison':
        return this.evaluateFieldComparisonCondition(condition, context);
      default:
        return false;
    }
  }

  // Helper methods
  private mergeBranchResults(baseContext: any, branchResults: any[]): any {
    const merged = { ...baseContext };
    
    branchResults.forEach((result, index) => {
      if (result && typeof result === 'object') {
        Object.keys(result).forEach(key => {
          if (key.startsWith('action_') || key.startsWith('condition_')) {
            merged[`branch_${index}_${key}`] = result[key];
          }
        });
      }
    });
    
    return merged;
  }

  private calculateDelay(baseDelay: { value: number; unit: string }): number {
    const { value, unit } = baseDelay;
    
    switch (unit) {
      case 'seconds':
        return value * 1000;
      case 'minutes':
        return value * 60 * 1000;
      case 'hours':
        return value * 60 * 60 * 1000;
      case 'days':
        return value * 24 * 60 * 60 * 1000;
      default:
        return value * 1000;
    }
  }

  private applyDelayModifier(baseDelay: number, modifier: any): number {
    switch (modifier.operation) {
      case 'add':
        return baseDelay + this.calculateDelay({ value: modifier.value, unit: modifier.unit || 'seconds' });
      case 'multiply':
        return baseDelay * modifier.value;
      case 'set':
        return this.calculateDelay({ value: modifier.value, unit: modifier.unit || 'seconds' });
      default:
        return baseDelay;
    }
  }

  private async evaluateBreakCondition(condition: any, context: any): Promise<boolean> {
    return this.evaluateFieldComparisonCondition(condition, context);
  }

  private async evaluateDelayCondition(condition: any, context: any): Promise<boolean> {
    return this.evaluateFieldComparisonCondition(condition, context);
  }

  // Enhanced action execution methods
  private async executeSendEmailAdvanced(config: any, context: any) {
    const lead = context.lead || context;
    const recipientEmail = config.recipient || lead.email;
    
    if (!recipientEmail) {
      throw new Error('No email address found for recipient');
    }

    let emailContent = '';
    
    if (config.templateId) {
      const { data: template } = await this.supabase
        .from('message_templates')
        .select('*')
        .eq('id', config.templateId)
        .single();
        
      if (template) {
        emailContent = this.replaceVariablesAdvanced(template.content, context);
      }
    } else if (config.customMessage) {
      emailContent = this.replaceVariablesAdvanced(config.customMessage, context);
    }

    await sendEmail({
      to: recipientEmail,
      subject: this.replaceVariablesAdvanced(config.subject || 'Message from Atlas Fitness', context),
      html: emailContent,
      organizationId: context._organizationId,
      metadata: {
        workflowId: context._workflowId,
        executionId: context._executionId,
        templateId: config.templateId
      }
    });
    
    console.log(`📧 Email sent to ${recipientEmail}`);
  }

  private async executeSendSMSAdvanced(config: any, context: any) {
    const lead = context.lead || context;
    const recipientPhone = config.recipient || lead.phone;
    
    if (!recipientPhone) {
      throw new Error('No phone number found for recipient');
    }

    const smsContent = this.replaceVariablesAdvanced(config.message, context);
    
    await sendSMS({
      to: recipientPhone,
      body: smsContent,
      organizationId: context._organizationId
    });
    
    console.log(`📱 SMS sent to ${recipientPhone}`);
  }

  private async executeSendWhatsAppAdvanced(config: any, context: any) {
    const lead = context.lead || context;
    const recipientPhone = config.recipient || lead.phone;
    
    if (!recipientPhone) {
      throw new Error('No phone number found for recipient');
    }

    const whatsappContent = this.replaceVariablesAdvanced(config.message, context);
    
    await sendWhatsApp({
      to: recipientPhone,
      body: whatsappContent,
      organizationId: context._organizationId
    });
    
    console.log(`💬 WhatsApp sent to ${recipientPhone}`);
  }

  private async executeTagManagement(config: any, context: any) {
    const lead = context.lead || context;
    
    if (!lead.id) {
      throw new Error('No lead ID found for tag management');
    }

    const { data: currentLead } = await this.supabase
      .from('leads')
      .select('tags')
      .eq('id', lead.id)
      .single();

    const currentTags = currentLead?.tags || [];
    const targetTags = config.tags || [];
    let updatedTags = [...currentTags];

    if (config.action === 'add') {
      targetTags.forEach((tag: string) => {
        if (!updatedTags.includes(tag)) {
          updatedTags.push(tag);
        }
      });
    } else if (config.action === 'remove') {
      updatedTags = updatedTags.filter(tag => !targetTags.includes(tag));
    }

    await this.supabase
      .from('leads')
      .update({ 
        tags: updatedTags,
        updated_at: new Date().toISOString()
      })
      .eq('id', lead.id);
      
    console.log(`🏷️ Tags ${config.action}ed for lead ${lead.id}`);
  }

  private async executeLeadScoreUpdate(config: any, context: any) {
    const lead = context.lead || context;
    
    if (!lead.id) {
      throw new Error('No lead ID found for score update');
    }

    const { data: currentLead } = await this.supabase
      .from('leads')
      .select('score')
      .eq('id', lead.id)
      .single();

    const currentScore = currentLead?.score || 0;
    let newScore = currentScore;

    switch (config.operation) {
      case 'add':
        newScore = currentScore + (config.value || 0);
        break;
      case 'subtract':
        newScore = currentScore - (config.value || 0);
        break;
      case 'set':
        newScore = config.value || 0;
        break;
    }

    // Ensure score stays within bounds (0-100)
    newScore = Math.max(0, Math.min(100, newScore));

    await this.supabase
      .from('leads')
      .update({ 
        score: newScore,
        updated_at: new Date().toISOString()
      })
      .eq('id', lead.id);
      
    console.log(`📊 Lead score updated from ${currentScore} to ${newScore}`);
  }

  private async executeCreateTask(config: any, context: any) {
    const lead = context.lead || context;
    
    const taskData = {
      title: config.title || 'Follow-up Task',
      description: config.description || '',
      lead_id: lead.id,
      organization_id: context._organizationId,
      status: 'pending',
      priority: config.priority || 'normal',
      due_date: config.dueDate || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      created_at: new Date().toISOString()
    };

    const { data: task } = await this.supabase
      .from('tasks')
      .insert(taskData)
      .select()
      .single();
      
    console.log(`✅ Task created: ${task?.title}`);
  }

  private replaceVariablesAdvanced(template: string, context: any): string {
    const lead = context.lead || context;
    const organization = context.organization || {};
    const workflow = context.workflow || {};
    
    try {
      return template
        // Lead variables
        .replace(/{{name}}/g, lead.name || 'there')
        .replace(/{{email}}/g, lead.email || '')
        .replace(/{{phone}}/g, lead.phone || '')
        .replace(/{{firstName}}/g, (lead.name || '').split(' ')[0] || 'there')
        .replace(/{{lastName}}/g, (lead.name || '').split(' ').slice(1).join(' ') || '')
        .replace(/{{source}}/g, lead.source || 'unknown')
        .replace(/{{score}}/g, lead.score?.toString() || '0')
        // Organization variables
        .replace(/{{organizationName}}/g, organization.name || 'Atlas Fitness')
        .replace(/{{organizationPhone}}/g, organization.phone || '')
        .replace(/{{organizationEmail}}/g, organization.email || '')
        // Workflow variables
        .replace(/{{workflowName}}/g, workflow.name || 'Workflow')
        // Date/time variables
        .replace(/{{currentDate}}/g, new Date().toLocaleDateString())
        .replace(/{{currentTime}}/g, new Date().toLocaleTimeString())
        .replace(/{{currentDateTime}}/g, new Date().toLocaleString())
        // Custom context variables
        .replace(/{{([^}]+)}}/g, (match, key) => {
          const value = this.getNestedValue(context, key.trim());
          return value !== undefined ? String(value) : match;
        });
    } catch (error) {
      console.error('Variable replacement failed:', error);
      return template;
    }
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  private async completeExecution(status: 'completed' | 'failed', outputData: any, errorMessage?: string) {
    if (!this.executionId || !this.supabase) return;
    
    await this.supabase
      .from('workflow_executions')
      .update({
        status,
        completed_at: new Date().toISOString(),
        output_data: outputData,
        error_message: errorMessage,
        execution_steps: this.steps
      })
      .eq('id', this.executionId);
  }

  private async updateWorkflowStats(workflowId: string, success: boolean) {
    if (!this.supabase) return;
    
    try {
      const updates: any = {
        total_executions: this.supabase.raw('total_executions + 1'),
        last_run_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      if (success) {
        updates.successful_executions = this.supabase.raw('successful_executions + 1');
      } else {
        updates.failed_executions = this.supabase.raw('failed_executions + 1');
        updates.last_failure_at = new Date().toISOString();
      }
      
      await this.supabase
        .from('workflows')
        .update(updates)
        .eq('id', workflowId);
        
    } catch (statsError) {
      console.error('Failed to update workflow stats:', statsError);
    }
  }

  // Static factory methods
  static createAdvanced(): AdvancedWorkflowExecutionEngine {
    return new AdvancedWorkflowExecutionEngine();
  }
}
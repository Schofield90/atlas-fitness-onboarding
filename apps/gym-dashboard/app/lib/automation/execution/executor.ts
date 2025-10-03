// Workflow Executor

import { createClient } from '@/app/lib/supabase/server'
import { ActionFactory } from '../actions'
import { evaluateCondition } from '../conditions'
import { scheduleDelayedAction } from './queue'
import type {
  Workflow,
  WorkflowNode,
  ExecutionContext,
  ExecutionStep,
  ExecutionStatus,
  NodeType,
} from '@/app/lib/types/automation'

export class WorkflowExecutor {
  private workflow: Workflow
  private executionId: string
  private context: ExecutionContext
  private nodes: Map<string, WorkflowNode>
  private edges: Map<string, string[]>
  private executedNodes: Set<string>
  
  constructor(workflow: Workflow, executionId: string) {
    this.workflow = workflow
    this.executionId = executionId
    this.context = {
      variables: {},
      currentNodeId: null,
      executionPath: [executionId],
      loopIterations: {},
    }
    this.nodes = new Map()
    this.edges = new Map()
    this.executedNodes = new Set()
    
    this.initializeGraph()
  }
  
  // Initialize workflow graph
  private initializeGraph() {
    // Build node map
    this.workflow.workflowData.nodes.forEach(node => {
      this.nodes.set(node.id, node)
    })
    
    // Build edge map (node -> connected nodes)
    this.workflow.workflowData.edges.forEach(edge => {
      if (!this.edges.has(edge.source)) {
        this.edges.set(edge.source, [])
      }
      this.edges.get(edge.source)!.push(edge.target)
    })
  }
  
  // Execute workflow
  async execute(triggerData: Record<string, any>): Promise<any> {
    // Initialize context with trigger data
    this.context.variables = {
      trigger: triggerData,
      workflow: {
        id: this.workflow.id,
        name: this.workflow.name,
      },
      execution: {
        id: this.executionId,
        startedAt: new Date().toISOString(),
      },
    }
    
    // Find trigger node
    const triggerNode = Array.from(this.nodes.values()).find(
      node => node.type === 'trigger'
    )
    
    if (!triggerNode) {
      throw new Error('No trigger node found in workflow')
    }
    
    // Start execution from trigger
    await this.executeNode(triggerNode.id)
    
    // Return execution result
    return {
      executionId: this.executionId,
      status: 'completed',
      variables: this.context.variables,
      executionPath: this.context.executionPath,
      startedAt: this.context.variables.execution.startedAt,
      completedAt: new Date().toISOString(),
    }
  }
  
  // Execute a single node
  private async executeNode(nodeId: string): Promise<void> {
    // Check if already executed (prevent loops except for loop nodes)
    const node = this.nodes.get(nodeId)
    if (!node) {
      throw new Error(`Node not found: ${nodeId}`)
    }
    
    if (this.executedNodes.has(nodeId) && node.type !== 'loop') {
      return
    }
    
    this.executedNodes.add(nodeId)
    this.context.currentNodeId = nodeId
    this.context.executionPath.push(nodeId)
    
    // Create execution step record
    const stepId = await this.createExecutionStep(node, 'running')
    
    try {
      // Execute based on node type
      let output: any = {}
      
      switch (node.type) {
        case 'trigger':
          output = await this.executeTrigger(node)
          break
        case 'action':
          output = await this.executeAction(node)
          break
        case 'condition':
          output = await this.executeCondition(node)
          break
        case 'wait':
          output = await this.executeWait(node)
          break
        case 'loop':
          output = await this.executeLoop(node)
          break
        case 'transform':
          output = await this.executeTransform(node)
          break
        case 'filter':
          output = await this.executeFilter(node)
          break
        default:
          throw new Error(`Unknown node type: ${node.type}`)
      }
      
      // Update step with output
      await this.updateExecutionStep(stepId, 'completed', output)
      
      // Continue to next nodes (except for special cases)
      if (node.type !== 'condition' && node.type !== 'loop' && node.type !== 'wait') {
        await this.executeNextNodes(nodeId)
      }
      
    } catch (error) {
      // Update step with error
      await this.updateExecutionStep(stepId, 'failed', null, error.message)
      
      // Handle error based on workflow settings
      if (this.workflow.settings.errorHandling === 'stop') {
        throw error
      } else {
        console.error(`Node ${nodeId} failed:`, error)
        // Continue to next nodes even on error
        await this.executeNextNodes(nodeId)
      }
    }
  }
  
  // Execute trigger node
  private async executeTrigger(node: WorkflowNode): Promise<any> {
    // Trigger already fired, just pass through the data
    return this.context.variables.trigger
  }
  
  // Execute action node
  private async executeAction(node: WorkflowNode): Promise<any> {
    const actionType = node.data.actionType
    if (!actionType) {
      throw new Error('Action type not specified')
    }
    
    const action = ActionFactory.create(actionType, node.data.config, this.context)
    
    // Validate action
    const isValid = await action.validate()
    if (!isValid) {
      throw new Error('Action validation failed')
    }
    
    // Execute action
    const output = await action.execute(this.context.variables)
    
    // Store output in variables
    if (node.data.config.outputVariable) {
      this.context.variables[node.data.config.outputVariable] = output
    }
    
    return output
  }
  
  // Execute condition node
  private async executeCondition(node: WorkflowNode): Promise<any> {
    const conditions = node.data.config.conditions || []
    const operator = node.data.config.operator || 'AND'
    
    // Evaluate conditions
    const result = await evaluateCondition({
      operator,
      conditions,
    }, this.context.variables)
    
    // Store result
    const output = {
      result,
      branch: result ? 'true' : 'false',
    }
    
    // Execute appropriate branch
    const branchEdges = this.workflow.workflowData.edges.filter(
      edge => edge.source === node.id && edge.sourceHandle === output.branch
    )
    
    for (const edge of branchEdges) {
      await this.executeNode(edge.target)
    }
    
    return output
  }
  
  // Execute wait node
  private async executeWait(node: WorkflowNode): Promise<any> {
    const duration = node.data.config.duration || 1
    const unit = node.data.config.unit || 'seconds'
    
    let delayMs = 0
    switch (unit) {
      case 'seconds': delayMs = duration * 1000; break
      case 'minutes': delayMs = duration * 60 * 1000; break
      case 'hours': delayMs = duration * 60 * 60 * 1000; break
      case 'days': delayMs = duration * 24 * 60 * 60 * 1000; break
    }
    
    // For short waits (< 10 seconds), wait inline
    if (delayMs < 10000) {
      await new Promise(resolve => setTimeout(resolve, delayMs))
      await this.executeNextNodes(node.id)
    } else {
      // For longer waits, schedule a delayed job
      await scheduleDelayedAction(
        this.executionId,
        node.id,
        delayMs,
        { context: this.context }
      )
    }
    
    return {
      waited: true,
      duration,
      unit,
      delayMs,
      resumeAt: new Date(Date.now() + delayMs).toISOString(),
    }
  }
  
  // Execute loop node
  private async executeLoop(node: WorkflowNode): Promise<any> {
    const items = this.resolveVariable(node.data.config.items) || []
    const maxIterations = node.data.config.maxIterations || 100
    const loopVariable = node.data.config.loopVariable || 'item'
    const indexVariable = node.data.config.indexVariable || 'index'
    
    // Initialize loop counter
    const loopId = `${node.id}-${Date.now()}`
    this.context.loopIterations[loopId] = 0
    
    const results = []
    
    // Execute loop body for each item
    for (let i = 0; i < Math.min(items.length, maxIterations); i++) {
      // Set loop variables
      this.context.variables[loopVariable] = items[i]
      this.context.variables[indexVariable] = i
      this.context.loopIterations[loopId] = i + 1
      
      // Execute loop body (right handle)
      const loopEdges = this.workflow.workflowData.edges.filter(
        edge => edge.source === node.id && edge.sourceHandle === 'loop'
      )
      
      for (const edge of loopEdges) {
        await this.executeNode(edge.target)
      }
      
      results.push(this.context.variables[loopVariable])
    }
    
    // Clean up loop variables
    delete this.context.variables[loopVariable]
    delete this.context.variables[indexVariable]
    delete this.context.loopIterations[loopId]
    
    // Continue to done branch
    const doneEdges = this.workflow.workflowData.edges.filter(
      edge => edge.source === node.id && edge.sourceHandle === 'done'
    )
    
    for (const edge of doneEdges) {
      await this.executeNode(edge.target)
    }
    
    return {
      iterations: results.length,
      results,
    }
  }
  
  // Execute transform node
  private async executeTransform(node: WorkflowNode): Promise<any> {
    const code = node.data.config.code
    const input = this.resolveVariable(node.data.config.input) || this.context.variables
    
    if (!code) {
      throw new Error('Transform code not provided')
    }
    
    try {
      // Create safe execution context
      const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor
      const transform = new AsyncFunction('data', 'variables', 'console', code)
      
      // Safe console for logging
      const safeConsole = {
        log: (...args: any[]) => console.log('[Transform]', ...args),
        error: (...args: any[]) => console.error('[Transform]', ...args),
      }
      
      const output = await transform(input, this.context.variables, safeConsole)
      
      // Store output
      if (node.data.config.outputVariable) {
        this.context.variables[node.data.config.outputVariable] = output
      }
      
      return { output }
    } catch (error) {
      throw new Error(`Transform error: ${error.message}`)
    }
  }
  
  // Execute filter node
  private async executeFilter(node: WorkflowNode): Promise<any> {
    const items = this.resolveVariable(node.data.config.items) || []
    const conditions = node.data.config.conditions || []
    const operator = node.data.config.operator || 'AND'
    
    const filtered = []
    
    for (const item of items) {
      // Temporarily set item as variable for condition evaluation
      const tempVars = { ...this.context.variables, _item: item }
      
      const matches = await evaluateCondition({
        operator,
        conditions: conditions.map((c: any) => ({
          ...c,
          field: c.field.replace('item.', '_item.'),
        })),
      }, tempVars)
      
      if (matches) {
        filtered.push(item)
      }
    }
    
    // Store output
    if (node.data.config.outputVariable) {
      this.context.variables[node.data.config.outputVariable] = filtered
    }
    
    return {
      original: items.length,
      filtered: filtered.length,
      items: filtered,
    }
  }
  
  // Execute next nodes
  private async executeNextNodes(nodeId: string): Promise<void> {
    const nextNodes = this.edges.get(nodeId) || []
    
    // Execute all connected nodes
    for (const nextNodeId of nextNodes) {
      await this.executeNode(nextNodeId)
    }
  }
  
  // Resolve variable value
  private resolveVariable(value: any): any {
    if (typeof value === 'string' && value.startsWith('{{') && value.endsWith('}}')) {
      const path = value.slice(2, -2).trim()
      return this.getVariableValue(path)
    }
    return value
  }
  
  // Get variable value by path
  private getVariableValue(path: string): any {
    const parts = path.split('.')
    let value: any = this.context.variables
    
    for (const part of parts) {
      if (value && typeof value === 'object') {
        value = value[part]
      } else {
        return undefined
      }
    }
    
    return value
  }
  
  // Create execution step record
  private async createExecutionStep(
    node: WorkflowNode,
    status: ExecutionStatus
  ): Promise<string> {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('workflow_execution_steps')
      .insert({
        execution_id: this.executionId,
        node_id: node.id,
        node_type: node.type,
        action_type: node.data.actionType,
        status,
        input_data: this.context.variables,
        started_at: new Date().toISOString(),
      })
      .select('id')
      .single()
    
    if (error || !data) {
      console.error('Failed to create execution step:', error)
      return `temp-${node.id}-${Date.now()}`
    }
    
    return data.id
  }
  
  // Update execution step
  private async updateExecutionStep(
    stepId: string,
    status: ExecutionStatus,
    output?: any,
    error?: string
  ): Promise<void> {
    if (stepId.startsWith('temp-')) return
    
    const supabase = await createClient()
    
    const completedAt = new Date()
    const startedAt = new Date(Date.now() - 1000) // Approximate
    
    await supabase
      .from('workflow_execution_steps')
      .update({
        status,
        output_data: output,
        error,
        completed_at: completedAt.toISOString(),
        execution_time_ms: completedAt.getTime() - startedAt.getTime(),
      })
      .eq('id', stepId)
  }
  
  // Resume execution from a specific node
  static async resume(
    executionId: string,
    nodeId: string,
    resumeData: Record<string, any>
  ): Promise<WorkflowExecutor> {
    const supabase = await createClient()
    
    // Get execution details
    const { data: execution, error } = await supabase
      .from('workflow_executions')
      .select('*, workflows(*)')
      .eq('id', executionId)
      .single()
    
    if (error || !execution) {
      throw new Error('Execution not found')
    }
    
    // Create executor
    const executor = new WorkflowExecutor(execution.workflows, executionId)
    
    // Restore context
    executor.context = resumeData.context || execution.context
    
    // Continue execution from the specified node
    await executor.executeNextNodes(nodeId)
    
    return executor
  }
  
  // Continue execution
  async continue(): Promise<any> {
    return {
      executionId: this.executionId,
      status: 'completed',
      variables: this.context.variables,
      executionPath: this.context.executionPath,
    }
  }
}
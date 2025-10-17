'use client'

import { useState, useEffect } from 'react'
import { Play, Pause, Square, RotateCcw, Eye, EyeOff, ChevronRight, ChevronDown } from 'lucide-react'

interface WorkflowTesterProps {
  workflow: {
    nodes: any[]
    edges: any[]
    metadata: any
  }
  onClose: () => void
  onHighlightPath: (path: string[]) => void
}

interface TestExecution {
  id: string
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed'
  startedAt: Date
  completedAt?: Date
  steps: TestStep[]
  currentStepIndex: number
  testData: any
  executionPath: string[]
  branchDecisions: Record<string, any>
}

interface TestStep {
  nodeId: string
  nodeType: string
  nodeLabel: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped'
  startedAt?: Date
  completedAt?: Date
  input?: any
  output?: any
  error?: string
  branchTaken?: string
  executionTime?: number
}

export function WorkflowTester({ workflow, onClose, onHighlightPath }: WorkflowTesterProps) {
  const [testData, setTestData] = useState('{\n  "lead": {\n    "id": "test-123",\n    "name": "John Doe",\n    "email": "john@example.com",\n    "phone": "+1234567890",\n    "score": 75,\n    "tags": ["hot-lead", "website"],\n    "source": "website"\n  }\n}')
  const [execution, setExecution] = useState<TestExecution | null>(null)
  const [isStepMode, setIsStepMode] = useState(true)
  const [autoAdvance, setAutoAdvance] = useState(false)
  const [stepDelay, setStepDelay] = useState(1000)
  const [selectedStep, setSelectedStep] = useState<string | null>(null)
  const [showBranchPreview, setShowBranchPreview] = useState(true)

  // Test execution functions
  const startTest = async () => {
    try {
      const parsedTestData = JSON.parse(testData)
      
      const newExecution: TestExecution = {
        id: `test-${Date.now()}`,
        status: 'running',
        startedAt: new Date(),
        steps: [],
        currentStepIndex: 0,
        testData: parsedTestData,
        executionPath: [],
        branchDecisions: {}
      }

      // Build execution plan
      const executionPlan = buildExecutionPlan(workflow.nodes, workflow.edges)
      newExecution.steps = executionPlan.map(nodeId => {
        const node = workflow.nodes.find(n => n.id === nodeId)
        return {
          nodeId,
          nodeType: node?.type || 'unknown',
          nodeLabel: node?.data?.label || 'Unknown',
          status: 'pending'
        }
      })

      setExecution(newExecution)
      
      if (!isStepMode) {
        // Run all steps automatically
        await runFullExecution(newExecution)
      }
    } catch (error) {
      console.error('Failed to start test:', error)
      // Handle error
    }
  }

  const buildExecutionPlan = (nodes: any[], edges: any[]): string[] => {
    // Find trigger node
    const triggerNode = nodes.find(n => n.type === 'trigger')
    if (!triggerNode) return []

    const plan: string[] = []
    const visited = new Set<string>()
    
    const traverse = (nodeId: string, branchContext?: any) => {
      if (visited.has(nodeId)) return
      visited.add(nodeId)
      
      const node = nodes.find(n => n.id === nodeId)
      if (!node) return
      
      plan.push(nodeId)
      
      // Find next nodes
      const outgoingEdges = edges.filter(e => e.source === nodeId)
      
      if (node.type === 'condition') {
        // Simulate branch decision for planning
        const branchTaken = simulateBranchDecision(node, branchContext)
        const nextEdge = outgoingEdges.find(e => e.sourceHandle === branchTaken)
        if (nextEdge) {
          traverse(nextEdge.target, { ...branchContext, [`condition_${nodeId}`]: branchTaken === 'true' })
        }
      } else if (node.type === 'parallel') {
        // Add all parallel branches
        outgoingEdges.forEach(edge => {
          if (edge.sourceHandle?.startsWith('branch-')) {
            traverse(edge.target, branchContext)
          }
        })
      } else {
        // Regular flow
        outgoingEdges.forEach(edge => {
          traverse(edge.target, branchContext)
        })
      }
    }
    
    traverse(triggerNode.id)
    return plan
  }

  const simulateBranchDecision = (conditionNode: any, context: any) => {
    // Simulate condition evaluation for test planning
    const config = conditionNode.data.config
    
    switch (config.conditionType) {
      case 'lead_score':
        const score = context?.lead?.score || 50
        switch (config.operator) {
          case 'greater_than':
            return score > (config.value || 0) ? 'true' : 'false'
          case 'less_than':
            return score < (config.value || 0) ? 'true' : 'false'
          default:
            return 'true'
        }
      case 'tags':
        const leadTags = context?.lead?.tags || []
        return leadTags.some((tag: string) => (config.tags || []).includes(tag)) ? 'true' : 'false'
      default:
        return Math.random() > 0.5 ? 'true' : 'false'
    }
  }

  const runFullExecution = async (execution: TestExecution) => {
    const updatedExecution = { ...execution }
    
    for (let i = 0; i < execution.steps.length; i++) {
      updatedExecution.currentStepIndex = i
      await executeStep(updatedExecution, i)
      setExecution({ ...updatedExecution })
      
      // Highlight current path
      const currentPath = updatedExecution.steps
        .slice(0, i + 1)
        .map(step => step.nodeId)
      onHighlightPath(currentPath)
      
      if (!autoAdvance) {
        await new Promise(resolve => setTimeout(resolve, stepDelay))
      }
    }
    
    updatedExecution.status = 'completed'
    updatedExecution.completedAt = new Date()
    setExecution(updatedExecution)
  }

  const executeStep = async (execution: TestExecution, stepIndex: number) => {
    const step = execution.steps[stepIndex]
    const node = workflow.nodes.find(n => n.id === step.nodeId)
    
    step.status = 'running'
    step.startedAt = new Date()
    
    try {
      // Simulate step execution
      await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 800))
      
      const result = simulateNodeExecution(node, execution.testData, execution.branchDecisions)
      
      step.status = result.success ? 'completed' : 'failed'
      step.output = result.output
      step.error = result.error
      step.branchTaken = result.branchTaken
      step.completedAt = new Date()
      step.executionTime = step.completedAt.getTime() - (step.startedAt?.getTime() || 0)
      
      if (result.branchTaken) {
        execution.branchDecisions[step.nodeId] = result.branchTaken
      }
      
    } catch (error) {
      step.status = 'failed'
      step.error = error.message
      step.completedAt = new Date()
    }
  }

  const simulateNodeExecution = (node: any, testData: any, branchDecisions: Record<string, any>) => {
    switch (node?.type) {
      case 'trigger':
        return {
          success: true,
          output: testData,
          branchTaken: null
        }
        
      case 'condition':
        const branchTaken = simulateBranchDecision(node, testData)
        return {
          success: true,
          output: { conditionResult: branchTaken === 'true', branch: branchTaken },
          branchTaken
        }
        
      case 'action':
        // Simulate random success/failure for actions
        const success = Math.random() > 0.1
        return {
          success,
          output: success ? { actionCompleted: true, actionType: node.data.label } : null,
          error: success ? null : 'Simulated action failure',
          branchTaken: null
        }
        
      case 'loop':
        return {
          success: true,
          output: { loopIteration: 1, maxIterations: node.data.config.maxIterations },
          branchTaken: 'loop-body' // Always take loop body in simulation
        }
        
      case 'parallel':
        return {
          success: true,
          output: { parallelBranches: node.data.config.branches },
          branchTaken: 'branch-0' // Take first branch in simulation
        }
        
      default:
        return {
          success: true,
          output: { processed: true },
          branchTaken: null
        }
    }
  }

  const nextStep = async () => {
    if (!execution || execution.status !== 'running') return
    
    const nextIndex = execution.currentStepIndex + 1
    if (nextIndex >= execution.steps.length) {
      setExecution({
        ...execution,
        status: 'completed',
        completedAt: new Date()
      })
      return
    }
    
    await executeStep(execution, nextIndex)
    setExecution({
      ...execution,
      currentStepIndex: nextIndex
    })
    
    // Update highlighted path
    const currentPath = execution.steps
      .slice(0, nextIndex + 1)
      .map(step => step.nodeId)
    onHighlightPath(currentPath)
  }

  const pauseTest = () => {
    if (execution) {
      setExecution({
        ...execution,
        status: 'paused'
      })
    }
  }

  const resetTest = () => {
    setExecution(null)
    onHighlightPath([])
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'text-yellow-400'
      case 'completed': return 'text-green-400'
      case 'failed': return 'text-red-400'
      case 'paused': return 'text-blue-400'
      default: return 'text-gray-400'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running': return '🔄'
      case 'completed': return '✅'
      case 'failed': return '❌'
      case 'paused': return '⏸️'
      default: return '⚪'
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-6 border-b border-gray-700">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-white">Workflow Tester</h2>
            <p className="text-gray-400 mt-1">Test your workflow with sample data and preview execution paths</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <span className="text-2xl">×</span>
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Test Configuration */}
        <div className="w-1/3 border-r border-gray-700 p-6 overflow-y-auto">
          <div className="space-y-6">
            {/* Test Data */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Test Data (JSON)</label>
              <textarea
                value={testData}
                onChange={(e) => setTestData(e.target.value)}
                className="w-full h-48 bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm font-mono resize-none focus:outline-none focus:border-purple-500"
                placeholder="Enter test data..."
              />
            </div>

            {/* Test Options */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-300">Step-by-step mode</label>
                <input
                  type="checkbox"
                  checked={isStepMode}
                  onChange={(e) => setIsStepMode(e.target.checked)}
                  className="rounded bg-gray-700 border-gray-600 text-purple-500"
                />
              </div>

              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-300">Auto-advance</label>
                <input
                  type="checkbox"
                  checked={autoAdvance}
                  onChange={(e) => setAutoAdvance(e.target.checked)}
                  className="rounded bg-gray-700 border-gray-600 text-purple-500"
                />
              </div>

              {autoAdvance && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Step delay (ms): {stepDelay}
                  </label>
                  <input
                    type="range"
                    min="100"
                    max="5000"
                    value={stepDelay}
                    onChange={(e) => setStepDelay(parseInt(e.target.value))}
                    className="w-full"
                  />
                </div>
              )}

              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-300">Show branch preview</label>
                <input
                  type="checkbox"
                  checked={showBranchPreview}
                  onChange={(e) => setShowBranchPreview(e.target.checked)}
                  className="rounded bg-gray-700 border-gray-600 text-purple-500"
                />
              </div>
            </div>

            {/* Control Buttons */}
            <div className="space-y-2">
              {!execution && (
                <button
                  onClick={startTest}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                >
                  <Play className="w-4 h-4" />
                  Start Test
                </button>
              )}
              
              {execution && execution.status === 'running' && isStepMode && (
                <div className="space-y-2">
                  <button
                    onClick={nextStep}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                    Next Step
                  </button>
                  <button
                    onClick={pauseTest}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors"
                  >
                    <Pause className="w-4 h-4" />
                    Pause
                  </button>
                </div>
              )}
              
              {execution && (
                <button
                  onClick={resetTest}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  Reset
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Execution Results */}
        <div className="flex-1 p-6 overflow-y-auto">
          {!execution ? (
            <div className="flex items-center justify-center h-full text-gray-400">
              <div className="text-center">
                <Play className="w-12 h-12 mx-auto mb-4" />
                <p>Click "Start Test" to begin workflow execution</p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Execution Summary */}
              <div className="bg-gray-700 rounded-lg p-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-medium text-white">Execution Summary</h3>
                  <span className={`text-sm font-medium ${getStatusColor(execution.status)}`}>
                    {getStatusIcon(execution.status)} {execution.status.toUpperCase()}
                  </span>
                </div>
                
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <div className="text-gray-400">Steps</div>
                    <div className="text-white font-mono">
                      {execution.currentStepIndex + 1} / {execution.steps.length}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-400">Duration</div>
                    <div className="text-white font-mono">
                      {execution.completedAt 
                        ? Math.round((execution.completedAt.getTime() - execution.startedAt.getTime()) / 1000) + 's'
                        : Math.round((Date.now() - execution.startedAt.getTime()) / 1000) + 's'
                      }
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-400">Success Rate</div>
                    <div className="text-white font-mono">
                      {Math.round((execution.steps.filter(s => s.status === 'completed').length / Math.max(execution.steps.filter(s => s.status !== 'pending').length, 1)) * 100)}%
                    </div>
                  </div>
                </div>
              </div>

              {/* Execution Steps */}
              <div className="space-y-2">
                <h3 className="font-medium text-white">Execution Steps</h3>
                {execution.steps.map((step, index) => (
                  <div
                    key={index}
                    className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                      selectedStep === step.nodeId 
                        ? 'border-purple-500 bg-purple-900/20' 
                        : index === execution.currentStepIndex
                        ? 'border-blue-500 bg-blue-900/20'
                        : 'border-gray-600 hover:border-gray-500'
                    }`}
                    onClick={() => setSelectedStep(selectedStep === step.nodeId ? null : step.nodeId)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="text-lg">{getStatusIcon(step.status)}</div>
                        <div>
                          <div className="font-medium text-sm text-white">
                            {step.nodeLabel}
                          </div>
                          <div className="text-xs text-gray-400">
                            {step.nodeType} • Step {index + 1}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {step.executionTime && (
                          <span className="text-xs text-gray-400">
                            {step.executionTime}ms
                          </span>
                        )}
                        {step.branchTaken && (
                          <span className="text-xs px-2 py-1 bg-purple-600 text-white rounded">
                            {step.branchTaken === 'true' ? 'YES' : step.branchTaken === 'false' ? 'NO' : step.branchTaken}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {selectedStep === step.nodeId && (
                      <div className="mt-3 pt-3 border-t border-gray-600 space-y-2">
                        {step.input && (
                          <div>
                            <div className="text-xs text-gray-400 mb-1">Input:</div>
                            <pre className="text-xs bg-gray-800 p-2 rounded overflow-auto">
                              {JSON.stringify(step.input, null, 2)}
                            </pre>
                          </div>
                        )}
                        {step.output && (
                          <div>
                            <div className="text-xs text-gray-400 mb-1">Output:</div>
                            <pre className="text-xs bg-gray-800 p-2 rounded overflow-auto">
                              {JSON.stringify(step.output, null, 2)}
                            </pre>
                          </div>
                        )}
                        {step.error && (
                          <div>
                            <div className="text-xs text-red-400 mb-1">Error:</div>
                            <div className="text-xs text-red-300 bg-red-900/20 p-2 rounded">
                              {step.error}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
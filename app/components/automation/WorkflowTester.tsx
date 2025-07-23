'use client'

import { useState } from 'react'
import { Play, Bug, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import type { Workflow, WorkflowExecution } from '@/app/lib/types/automation'

interface WorkflowTesterProps {
  workflow: Workflow
}

interface TestResult {
  executionId: string
  status: 'running' | 'completed' | 'failed'
  startedAt: Date
  completedAt?: Date
  steps: TestStep[]
  output?: any
  error?: string
}

interface TestStep {
  nodeId: string
  nodeType: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped'
  startedAt?: Date
  completedAt?: Date
  input?: any
  output?: any
  error?: string
  executionTime?: number
}

export default function WorkflowTester({ workflow }: WorkflowTesterProps) {
  const [testData, setTestData] = useState('{}')
  const [testResult, setTestResult] = useState<TestResult | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [selectedStep, setSelectedStep] = useState<string | null>(null)

  const runTest = async () => {
    setIsRunning(true)
    setTestResult(null)

    try {
      const triggerData = JSON.parse(testData)
      
      // Mock test execution - in real implementation this would call the execution engine
      const mockExecution = await simulateExecution(workflow, triggerData)
      setTestResult(mockExecution)
    } catch (error) {
      setTestResult({
        executionId: `test-${Date.now()}`,
        status: 'failed',
        startedAt: new Date(),
        completedAt: new Date(),
        steps: [],
        error: error.message
      })
    } finally {
      setIsRunning(false)
    }
  }

  const simulateExecution = async (workflow: Workflow, triggerData: any): Promise<TestResult> => {
    const executionId = `test-${Date.now()}`
    const startedAt = new Date()
    const steps: TestStep[] = []

    // Find trigger node
    const triggerNode = workflow.workflowData.nodes.find(n => n.type === 'trigger')
    if (!triggerNode) {
      throw new Error('No trigger node found')
    }

    // Simulate execution steps
    const nodeMap = new Map(workflow.workflowData.nodes.map(n => [n.id, n]))
    const edgeMap = new Map<string, string[]>()
    
    workflow.workflowData.edges.forEach(edge => {
      if (!edgeMap.has(edge.source)) {
        edgeMap.set(edge.source, [])
      }
      edgeMap.get(edge.source)!.push(edge.target)
    })

    // Execute nodes starting from trigger
    const executedNodes = new Set<string>()
    const executeNode = async (nodeId: string): Promise<void> => {
      const node = nodeMap.get(nodeId)
      if (!node || executedNodes.has(nodeId)) return

      executedNodes.add(nodeId)
      const stepStartTime = new Date()
      
      const step: TestStep = {
        nodeId,
        nodeType: node.type,
        status: 'running',
        startedAt: stepStartTime,
        input: triggerData
      }
      steps.push(step)

      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500))

      // Simulate step results based on node type
      const stepResult = simulateNodeExecution(node, triggerData)
      const completedAt = new Date()
      
      Object.assign(step, {
        status: stepResult.success ? 'completed' : 'failed',
        completedAt,
        output: stepResult.output,
        error: stepResult.error,
        executionTime: completedAt.getTime() - stepStartTime.getTime()
      })

      if (stepResult.success) {
        // Execute connected nodes
        const nextNodes = edgeMap.get(nodeId) || []
        for (const nextNodeId of nextNodes) {
          await executeNode(nextNodeId)
        }
      }
    }

    await executeNode(triggerNode.id)

    const completedAt = new Date()
    const hasErrors = steps.some(s => s.status === 'failed')

    return {
      executionId,
      status: hasErrors ? 'failed' : 'completed',
      startedAt,
      completedAt,
      steps,
      output: {
        totalSteps: steps.length,
        successfulSteps: steps.filter(s => s.status === 'completed').length,
        failedSteps: steps.filter(s => s.status === 'failed').length,
        totalTime: completedAt.getTime() - startedAt.getTime()
      }
    }
  }

  const simulateNodeExecution = (node: any, data: any) => {
    // Simulate different node behaviors
    switch (node.type) {
      case 'trigger':
        return { success: true, output: data }
      
      case 'action':
        // Random chance of action failing for demo
        const success = Math.random() > 0.1
        return {
          success,
          output: success ? { result: 'Action completed', actionType: node.data.actionType } : null,
          error: success ? null : 'Action failed: Network timeout'
        }
      
      case 'condition':
        // Random condition result
        const conditionResult = Math.random() > 0.5
        return {
          success: true,
          output: { result: conditionResult, branch: conditionResult ? 'true' : 'false' }
        }
      
      case 'wait':
        return {
          success: true,
          output: { waited: true, duration: node.data.config?.duration || 1 }
        }
      
      default:
        return { success: true, output: { processed: true } }
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running': return <Clock className="h-4 w-4 text-blue-400 animate-spin" />
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-400" />
      case 'failed': return <XCircle className="h-4 w-4 text-red-400" />
      default: return <AlertCircle className="h-4 w-4 text-gray-400" />
    }
  }

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(1)}s`
  }

  return (
    <div className="space-y-6">
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium flex items-center gap-2">
            <Bug className="h-5 w-5 text-purple-400" />
            Workflow Tester
          </h3>
          <button
            onClick={runTest}
            disabled={isRunning}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded transition-colors"
          >
            <Play className="h-4 w-4" />
            {isRunning ? 'Running...' : 'Run Test'}
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Test Data (JSON)</label>
            <textarea
              value={testData}
              onChange={(e) => setTestData(e.target.value)}
              placeholder="Enter trigger data as JSON..."
              className="w-full h-32 bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm font-mono resize-none"
            />
          </div>
        </div>
      </div>

      {testResult && (
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium">Test Results</h3>
            <div className="flex items-center gap-2">
              {getStatusIcon(testResult.status)}
              <span className={`text-sm font-medium ${
                testResult.status === 'completed' ? 'text-green-400' : 
                testResult.status === 'failed' ? 'text-red-400' : 
                'text-blue-400'
              }`}>
                {testResult.status.toUpperCase()}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Summary */}
            <div className="space-y-3">
              <div className="bg-gray-700 rounded-lg p-4">
                <h4 className="font-medium mb-2">Execution Summary</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Execution ID:</span>
                    <span className="font-mono text-xs">{testResult.executionId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Duration:</span>
                    <span>{formatDuration(
                      (testResult.completedAt?.getTime() || Date.now()) - testResult.startedAt.getTime()
                    )}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Steps:</span>
                    <span>{testResult.steps.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Success Rate:</span>
                    <span>{testResult.steps.length > 0 ? 
                      Math.round((testResult.steps.filter(s => s.status === 'completed').length / testResult.steps.length) * 100)
                      : 0}%</span>
                  </div>
                </div>
              </div>

              {testResult.error && (
                <div className="bg-red-900/20 border border-red-800 rounded-lg p-4">
                  <h4 className="font-medium text-red-400 mb-2">Error</h4>
                  <p className="text-sm text-red-300">{testResult.error}</p>
                </div>
              )}

              {testResult.output && (
                <div className="bg-gray-700 rounded-lg p-4">
                  <h4 className="font-medium mb-2">Output</h4>
                  <pre className="text-xs overflow-auto bg-gray-800 p-2 rounded">
                    {JSON.stringify(testResult.output, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            {/* Steps */}
            <div className="space-y-3">
              <h4 className="font-medium">Execution Steps</h4>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {testResult.steps.map((step, index) => (
                  <div
                    key={index}
                    className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                      selectedStep === step.nodeId 
                        ? 'border-blue-500 bg-blue-900/20' 
                        : 'border-gray-600 hover:border-gray-500'
                    }`}
                    onClick={() => setSelectedStep(selectedStep === step.nodeId ? null : step.nodeId)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(step.status)}
                        <span className="font-medium text-sm">{step.nodeType}</span>
                        <span className="text-xs text-gray-400">#{index + 1}</span>
                      </div>
                      {step.executionTime && (
                        <span className="text-xs text-gray-400">
                          {formatDuration(step.executionTime)}
                        </span>
                      )}
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
          </div>
        </div>
      )}
    </div>
  )
}
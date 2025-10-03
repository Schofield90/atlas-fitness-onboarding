'use client'

import React, { useMemo } from 'react'
import { AlertTriangle, CheckCircle, XCircle, Info, AlertCircle, Zap, GitBranch } from 'lucide-react'
import { WorkflowNode } from '@/app/lib/types/automation'
import { Edge } from 'reactflow'

interface ValidationError {
  type: 'error' | 'warning' | 'info'
  severity: 'high' | 'medium' | 'low'
  code: string
  message: string
  nodeId?: string
  edgeId?: string
  suggestion?: string
  autoFix?: () => void
}

interface WorkflowValidationResult {
  isValid: boolean
  errors: ValidationError[]
  warnings: ValidationError[]
  suggestions: ValidationError[]
  score: number
  maxScore: number
}

interface WorkflowValidatorProps {
  nodes: WorkflowNode[]
  edges: Edge[]
  onNodeSelect?: (nodeId: string) => void
  onAutoFix?: (fixes: Array<() => void>) => void
  className?: string
}

export function useWorkflowValidation(nodes: WorkflowNode[], edges: Edge[]): WorkflowValidationResult {
  return useMemo(() => {
    const errors: ValidationError[] = []
    const warnings: ValidationError[] = []
    const suggestions: ValidationError[] = []

    // 1. Check for trigger nodes
    const triggerNodes = nodes.filter(node => node.type === 'trigger')
    if (triggerNodes.length === 0) {
      errors.push({
        type: 'error',
        severity: 'high',
        code: 'NO_TRIGGER',
        message: 'Workflow must have at least one trigger node',
        suggestion: 'Add a trigger node to start your workflow'
      })
    } else if (triggerNodes.length > 1) {
      warnings.push({
        type: 'warning',
        severity: 'medium',
        code: 'MULTIPLE_TRIGGERS',
        message: 'Multiple trigger nodes detected',
        suggestion: 'Consider using a single trigger with conditions instead'
      })
    }

    // 2. Check for disconnected nodes
    nodes.forEach(node => {
      const hasIncomingEdge = edges.some(edge => edge.target === node.id)
      const hasOutgoingEdge = edges.some(edge => edge.source === node.id)

      // Trigger nodes don't need incoming edges
      if (node.type !== 'trigger' && !hasIncomingEdge) {
        errors.push({
          type: 'error',
          severity: 'high',
          code: 'DISCONNECTED_NODE',
          message: 'Node is not connected to the workflow',
          nodeId: node.id,
          suggestion: 'Connect this node to the workflow flow'
        })
      }

      // End nodes (like actions) don't necessarily need outgoing edges
      const isEndNode = ['action'].includes(node.type)
      if (!isEndNode && !hasOutgoingEdge && node.type !== 'merge') {
        warnings.push({
          type: 'warning',
          severity: 'medium',
          code: 'NO_OUTGOING_CONNECTION',
          message: 'Node has no outgoing connections',
          nodeId: node.id,
          suggestion: 'Consider adding a next step to continue the workflow'
        })
      }
    })

    // 3. Check node configurations
    nodes.forEach(node => {
      const config = node.data.config || {}

      // Check trigger configurations
      if (node.type === 'trigger') {
        const subtype = config.subtype || 'lead_trigger'
        
        switch (subtype) {
          case 'webhook_received':
            if (!config.webhookUrl) {
              errors.push({
                type: 'error',
                severity: 'high',
                code: 'MISSING_WEBHOOK_URL',
                message: 'Webhook trigger requires a URL',
                nodeId: node.id,
                suggestion: 'Configure the webhook URL in node settings'
              })
            }
            break
          case 'contact_tagged':
            if (!config.tagId) {
              errors.push({
                type: 'error',
                severity: 'high',
                code: 'MISSING_TAG_CONFIG',
                message: 'Tag trigger requires a tag selection',
                nodeId: node.id,
                suggestion: 'Select which tag should trigger this workflow'
              })
            }
            break
        }
      }

      // Check action configurations
      if (node.type === 'action') {
        const actionType = node.data.actionType

        switch (actionType) {
          case 'send_email':
            if (config.mode === 'template' && !config.templateId) {
              errors.push({
                type: 'error',
                severity: 'high',
                code: 'MISSING_EMAIL_TEMPLATE',
                message: 'Email action requires a template selection',
                nodeId: node.id,
                suggestion: 'Select an email template or switch to custom mode'
              })
            }
            if (config.mode === 'custom') {
              if (!config.subject) {
                errors.push({
                  type: 'error',
                  severity: 'high',
                  code: 'MISSING_EMAIL_SUBJECT',
                  message: 'Custom email requires a subject',
                  nodeId: node.id
                })
              }
              if (!config.body) {
                errors.push({
                  type: 'error',
                  severity: 'high',
                  code: 'MISSING_EMAIL_BODY',
                  message: 'Custom email requires a body',
                  nodeId: node.id
                })
              }
            }
            break

          case 'send_sms':
            if (!config.message) {
              errors.push({
                type: 'error',
                severity: 'high',
                code: 'MISSING_SMS_MESSAGE',
                message: 'SMS action requires a message',
                nodeId: node.id,
                suggestion: 'Enter the SMS message content'
              })
            } else if (config.message.length > 160) {
              warnings.push({
                type: 'warning',
                severity: 'medium',
                code: 'SMS_TOO_LONG',
                message: 'SMS message exceeds 160 characters',
                nodeId: node.id,
                suggestion: 'Consider shortening the message to avoid multiple SMS charges'
              })
            }
            break

          case 'send_whatsapp':
            if (config.mode === 'template' && !config.templateId) {
              errors.push({
                type: 'error',
                severity: 'high',
                code: 'MISSING_WHATSAPP_TEMPLATE',
                message: 'WhatsApp template mode requires template selection',
                nodeId: node.id
              })
            }
            if (config.mode === 'freeform' && !config.message) {
              errors.push({
                type: 'error',
                severity: 'high',
                code: 'MISSING_WHATSAPP_MESSAGE',
                message: 'WhatsApp message is required',
                nodeId: node.id
              })
            }
            break

          case 'create_task':
            if (!config.taskTitle) {
              errors.push({
                type: 'error',
                severity: 'high',
                code: 'MISSING_TASK_TITLE',
                message: 'Task creation requires a title',
                nodeId: node.id
              })
            }
            break
        }
      }

      // Check condition configurations
      if (node.type === 'condition') {
        if (!config.conditionType) {
          errors.push({
            type: 'error',
            severity: 'high',
            code: 'MISSING_CONDITION_TYPE',
            message: 'Condition node requires a condition type',
            nodeId: node.id
          })
        }
        
        if (config.conditionType === 'field_comparison') {
          if (!config.field || !config.operator || config.value === undefined) {
            errors.push({
              type: 'error',
              severity: 'high',
              code: 'INCOMPLETE_CONDITION',
              message: 'Field comparison requires field, operator, and value',
              nodeId: node.id
            })
          }
        }

        // Check if condition has both true and false paths
        const trueEdge = edges.find(edge => edge.source === node.id && edge.sourceHandle === 'true')
        const falseEdge = edges.find(edge => edge.source === node.id && edge.sourceHandle === 'false')
        
        if (!trueEdge) {
          warnings.push({
            type: 'warning',
            severity: 'medium',
            code: 'MISSING_TRUE_PATH',
            message: 'Condition has no "true" path',
            nodeId: node.id,
            suggestion: 'Connect the "Yes" output to define what happens when condition is true'
          })
        }
        
        if (!falseEdge) {
          warnings.push({
            type: 'warning',
            severity: 'medium',
            code: 'MISSING_FALSE_PATH',
            message: 'Condition has no "false" path',
            nodeId: node.id,
            suggestion: 'Connect the "No" output to define what happens when condition is false'
          })
        }
      }

      // Check wait/delay configurations
      if (node.type === 'wait') {
        if (!config.waitType) {
          errors.push({
            type: 'error',
            severity: 'high',
            code: 'MISSING_WAIT_TYPE',
            message: 'Wait node requires a wait type',
            nodeId: node.id
          })
        }
        
        if (config.waitType === 'duration' && !config.duration) {
          errors.push({
            type: 'error',
            severity: 'high',
            code: 'MISSING_WAIT_DURATION',
            message: 'Duration wait requires a time period',
            nodeId: node.id
          })
        }
      }

      // Check loop configurations
      if (node.type === 'loop') {
        if (!config.loopType) {
          errors.push({
            type: 'error',
            severity: 'high',
            code: 'MISSING_LOOP_TYPE',
            message: 'Loop node requires a loop type',
            nodeId: node.id
          })
        }
        
        if (config.loopType === 'count' && !config.maxIterations) {
          errors.push({
            type: 'error',
            severity: 'high',
            code: 'MISSING_LOOP_COUNT',
            message: 'Count loop requires maximum iterations',
            nodeId: node.id
          })
        }

        // Check for infinite loop potential
        if (config.loopType === 'while' && !config.breakCondition) {
          warnings.push({
            type: 'warning',
            severity: 'high',
            code: 'POTENTIAL_INFINITE_LOOP',
            message: 'Loop without break condition may run infinitely',
            nodeId: node.id,
            suggestion: 'Add a break condition to prevent infinite loops'
          })
        }
      }

      // Check parallel configurations
      if (node.type === 'parallel') {
        const branches = config.branches || 2
        if (branches < 2) {
          errors.push({
            type: 'error',
            severity: 'medium',
            code: 'INSUFFICIENT_PARALLEL_BRANCHES',
            message: 'Parallel node needs at least 2 branches',
            nodeId: node.id
          })
        }

        // Check if all branches are connected
        for (let i = 0; i < branches; i++) {
          const branchEdge = edges.find(edge => 
            edge.source === node.id && edge.sourceHandle === `branch-${i}`
          )
          if (!branchEdge) {
            warnings.push({
              type: 'warning',
              severity: 'medium',
              code: 'UNCONNECTED_PARALLEL_BRANCH',
              message: `Parallel branch ${i + 1} is not connected`,
              nodeId: node.id,
              suggestion: `Connect branch ${i + 1} to complete the parallel execution`
            })
          }
        }
      }
    })

    // 4. Check for workflow patterns and best practices
    
    // Check for direct trigger-to-action without delay
    triggerNodes.forEach(triggerNode => {
      const directActions = edges
        .filter(edge => edge.source === triggerNode.id)
        .map(edge => nodes.find(node => node.id === edge.target))
        .filter(node => node?.type === 'action' && node.data.actionType?.startsWith('send_'))

      if (directActions.length > 0) {
        suggestions.push({
          type: 'info',
          severity: 'low',
          code: 'IMMEDIATE_COMMUNICATION',
          message: 'Immediate communication after trigger',
          nodeId: triggerNode.id,
          suggestion: 'Consider adding a small delay to avoid appearing robotic'
        })
      }
    })

    // Check for long sequences without conditions
    const actionSequences = findLongActionSequences(nodes, edges)
    actionSequences.forEach(sequence => {
      if (sequence.length > 3) {
        suggestions.push({
          type: 'info',
          severity: 'low',
          code: 'LONG_ACTION_SEQUENCE',
          message: `Long sequence of ${sequence.length} actions without conditions`,
          suggestion: 'Consider adding conditions to personalize the workflow'
        })
      }
    })

    // Check for missing error handling
    const actionNodes = nodes.filter(node => node.type === 'action')
    if (actionNodes.length > 2 && !nodes.some(node => node.type === 'condition')) {
      suggestions.push({
        type: 'info',
        severity: 'low',
        code: 'NO_ERROR_HANDLING',
        message: 'Workflow lacks conditional logic for error handling',
        suggestion: 'Add conditions to handle different scenarios and errors'
      })
    }

    // 5. Calculate workflow score
    const totalChecks = 10
    let passedChecks = totalChecks
    
    errors.forEach(error => {
      if (error.severity === 'high') passedChecks -= 2
      else if (error.severity === 'medium') passedChecks -= 1
      else passedChecks -= 0.5
    })

    warnings.forEach(warning => {
      if (warning.severity === 'high') passedChecks -= 1
      else if (warning.severity === 'medium') passedChecks -= 0.5
      else passedChecks -= 0.25
    })

    const score = Math.max(0, Math.round((passedChecks / totalChecks) * 100))

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions,
      score,
      maxScore: 100
    }
  }, [nodes, edges])
}

function findLongActionSequences(nodes: WorkflowNode[], edges: Edge[]): string[][] {
  const sequences: string[][] = []
  const visited = new Set<string>()

  nodes.forEach(node => {
    if (visited.has(node.id) || node.type !== 'action') return

    const sequence: string[] = []
    let currentNode = node

    while (currentNode && currentNode.type === 'action' && !visited.has(currentNode.id)) {
      sequence.push(currentNode.id)
      visited.add(currentNode.id)

      // Find next action node
      const nextEdge = edges.find(edge => edge.source === currentNode.id)
      if (nextEdge) {
        const nextNode = nodes.find(n => n.id === nextEdge.target)
        if (nextNode && nextNode.type === 'action') {
          currentNode = nextNode
        } else {
          break
        }
      } else {
        break
      }
    }

    if (sequence.length > 1) {
      sequences.push(sequence)
    }
  })

  return sequences
}

export default function WorkflowValidator({ 
  nodes, 
  edges, 
  onNodeSelect, 
  onAutoFix,
  className = '' 
}: WorkflowValidatorProps) {
  const validation = useWorkflowValidation(nodes, edges)
  const { isValid, errors, warnings, suggestions, score } = validation

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600'
    if (score >= 70) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getScoreBgColor = (score: number) => {
    if (score >= 90) return 'bg-green-100 border-green-200'
    if (score >= 70) return 'bg-yellow-100 border-yellow-200'
    return 'bg-red-100 border-red-200'
  }

  const allIssues = [...errors, ...warnings, ...suggestions]

  if (allIssues.length === 0 && isValid) {
    return (
      <div className={`p-4 bg-green-50 border border-green-200 rounded-lg ${className}`}>
        <div className="flex items-center">
          <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
          <div>
            <h3 className="font-medium text-green-800">Workflow is Valid</h3>
            <p className="text-sm text-green-700">
              Your workflow configuration is complete and ready to run.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`border border-gray-200 rounded-lg bg-white ${className}`}>
      {/* Header */}
      <div className={`p-4 border-b border-gray-200 ${getScoreBgColor(score)}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            {isValid ? (
              <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
            )}
            <div>
              <h3 className="font-medium text-gray-900">
                Workflow Validation
              </h3>
              <p className="text-sm text-gray-600">
                {errors.length} errors, {warnings.length} warnings, {suggestions.length} suggestions
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className={`text-lg font-bold ${getScoreColor(score)}`}>
              {score}/100
            </div>
            <div className="text-xs text-gray-500">Quality Score</div>
          </div>
        </div>
      </div>

      {/* Issues List */}
      <div className="max-h-64 overflow-y-auto">
        {allIssues.map((issue, index) => {
          const IconComponent = issue.type === 'error' ? XCircle : 
                               issue.type === 'warning' ? AlertTriangle : Info
          
          const colorClass = issue.type === 'error' ? 'text-red-600' :
                            issue.type === 'warning' ? 'text-yellow-600' : 'text-blue-600'
          
          const bgClass = issue.type === 'error' ? 'hover:bg-red-50' :
                         issue.type === 'warning' ? 'hover:bg-yellow-50' : 'hover:bg-blue-50'

          return (
            <div
              key={`${issue.code}-${index}`}
              className={`p-4 border-b border-gray-100 last:border-b-0 ${bgClass} cursor-pointer`}
              onClick={() => issue.nodeId && onNodeSelect?.(issue.nodeId)}
            >
              <div className="flex items-start">
                <IconComponent className={`w-4 h-4 mt-0.5 mr-3 ${colorClass} flex-shrink-0`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900">
                      {issue.message}
                    </p>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      issue.severity === 'high' ? 'bg-red-100 text-red-700' :
                      issue.severity === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {issue.severity}
                    </span>
                  </div>
                  
                  {issue.suggestion && (
                    <p className="text-xs text-gray-500 mt-1">
                      💡 {issue.suggestion}
                    </p>
                  )}
                  
                  <div className="flex items-center justify-between mt-2">
                    <div className="text-xs text-gray-400">
                      Code: {issue.code}
                      {issue.nodeId && (
                        <span className="ml-2">
                          Node: {nodes.find(n => n.id === issue.nodeId)?.data.label}
                        </span>
                      )}
                    </div>
                    
                    {issue.autoFix && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          issue.autoFix!()
                        }}
                        className="text-xs text-blue-600 hover:text-blue-700"
                      >
                        Auto Fix
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer with auto-fix options */}
      {allIssues.some(issue => issue.autoFix) && (
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={() => {
              const fixes = allIssues.filter(issue => issue.autoFix).map(issue => issue.autoFix!)
              onAutoFix?.(fixes)
            }}
            className="text-sm text-blue-600 hover:text-blue-700 flex items-center"
          >
            <Zap className="w-4 h-4 mr-1" />
            Auto-fix all fixable issues
          </button>
        </div>
      )}
    </div>
  )
}
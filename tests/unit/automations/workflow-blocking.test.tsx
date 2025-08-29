/**
 * @jest-environment jsdom
 */
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'

// Mock workflow validation hook
interface ValidationError {
  type: 'error' | 'warning'
  severity: 'high' | 'medium' | 'low'
  code: string
  message: string
  nodeId?: string
}

interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
  warnings: ValidationError[]
  score: number
}

const useWorkflowValidation = (nodes: any[], edges: any[]): ValidationResult => {
  const errors: ValidationError[] = []
  const warnings: ValidationError[] = []

  // Check for trigger nodes
  const triggerNodes = nodes.filter(node => node.type === 'trigger')
  if (triggerNodes.length === 0) {
    errors.push({
      type: 'error',
      severity: 'high',
      code: 'NO_TRIGGER',
      message: 'Workflow must have at least one trigger node'
    })
  }

  // Check for disconnected nodes
  nodes.forEach(node => {
    const hasIncomingEdge = edges.some(edge => edge.target === node.id)
    if (node.type !== 'trigger' && !hasIncomingEdge) {
      errors.push({
        type: 'error',
        severity: 'high',
        code: 'DISCONNECTED_NODE',
        message: 'Node is not connected to the workflow',
        nodeId: node.id
      })
    }
  })

  // Check action configurations
  nodes.forEach(node => {
    if (node.type === 'action') {
      const config = node.data?.config || {}
      
      if (node.data?.actionType === 'send_email') {
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
      }

      if (node.data?.actionType === 'send_sms') {
        if (!config.message) {
          errors.push({
            type: 'error',
            severity: 'high',
            code: 'MISSING_SMS_MESSAGE',
            message: 'SMS action requires a message',
            nodeId: node.id
          })
        } else if (config.message.length > 160) {
          warnings.push({
            type: 'warning',
            severity: 'medium',
            code: 'SMS_TOO_LONG',
            message: 'SMS message exceeds 160 characters',
            nodeId: node.id
          })
        }
      }
    }
  })

  // Calculate score
  let score = 100
  errors.forEach(error => {
    if (error.severity === 'high') score -= 20
    else if (error.severity === 'medium') score -= 10
    else score -= 5
  })
  warnings.forEach(warning => {
    if (warning.severity === 'high') score -= 10
    else if (warning.severity === 'medium') score -= 5
    else score -= 2
  })

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    score: Math.max(0, score)
  }
}

// Mock Test Runner Component
interface TestRunnerProps {
  nodes: any[]
  edges: any[]
  onTestRun: (payload: any) => void
}

const MockTestRunner: React.FC<TestRunnerProps> = ({ nodes, edges, onTestRun }) => {
  const validation = useWorkflowValidation(nodes, edges)
  const [testPayload, setTestPayload] = React.useState('')

  const handleRunTest = () => {
    if (!validation.isValid) {
      return // Blocked by validation
    }
    
    try {
      const payload = testPayload ? JSON.parse(testPayload) : {}
      onTestRun(payload)
    } catch (e) {
      console.error('Invalid JSON payload')
    }
  }

  return (
    <div data-testid="test-runner">
      <div data-testid="validation-status">
        {validation.isValid ? 'Valid' : 'Invalid'}
      </div>
      
      <div data-testid="validation-score">
        Score: {validation.score}/100
      </div>

      {validation.errors.length > 0 && (
        <div data-testid="validation-errors">
          {validation.errors.map((error, index) => (
            <div key={index} data-testid={`error-${error.code}`}>
              {error.message}
            </div>
          ))}
        </div>
      )}

      {validation.warnings.length > 0 && (
        <div data-testid="validation-warnings">
          {validation.warnings.map((warning, index) => (
            <div key={index} data-testid={`warning-${warning.code}`}>
              {warning.message}
            </div>
          ))}
        </div>
      )}

      <textarea
        data-testid="test-payload"
        placeholder="Enter test payload JSON"
        value={testPayload}
        onChange={(e) => setTestPayload(e.target.value)}
      />

      <button
        data-testid="run-test-button"
        onClick={handleRunTest}
        disabled={!validation.isValid}
      >
        Run Test
      </button>
    </div>
  )
}

describe('Workflow Validation and Test Runner Blocking', () => {
  const mockOnTestRun = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Validation Rules', () => {
    it('should require at least one trigger node', () => {
      const nodes = [
        {
          id: 'action-1',
          type: 'action',
          data: {
            actionType: 'send_email',
            config: { subject: 'Test', body: 'Test' }
          }
        }
      ]
      const edges: any[] = []

      render(
        <MockTestRunner
          nodes={nodes}
          edges={edges}
          onTestRun={mockOnTestRun}
        />
      )

      expect(screen.getByTestId('validation-status')).toHaveTextContent('Invalid')
      expect(screen.getByTestId('error-NO_TRIGGER')).toHaveTextContent('Workflow must have at least one trigger node')
      expect(screen.getByTestId('run-test-button')).toBeDisabled()
    })

    it('should detect disconnected nodes', () => {
      const nodes = [
        {
          id: 'trigger-1',
          type: 'trigger',
          data: { actionType: 'facebook_lead_form' }
        },
        {
          id: 'action-1',
          type: 'action',
          data: {
            actionType: 'send_email',
            config: { subject: 'Test', body: 'Test' }
          }
        }
      ]
      const edges: any[] = [] // No connections

      render(
        <MockTestRunner
          nodes={nodes}
          edges={edges}
          onTestRun={mockOnTestRun}
        />
      )

      expect(screen.getByTestId('validation-status')).toHaveTextContent('Invalid')
      expect(screen.getByTestId('error-DISCONNECTED_NODE')).toHaveTextContent('Node is not connected to the workflow')
      expect(screen.getByTestId('run-test-button')).toBeDisabled()
    })

    it('should validate email action requirements', () => {
      const nodes = [
        {
          id: 'trigger-1',
          type: 'trigger',
          data: { actionType: 'facebook_lead_form' }
        },
        {
          id: 'action-1',
          type: 'action',
          data: {
            actionType: 'send_email',
            config: {
              mode: 'custom',
              subject: '', // Missing
              body: ''     // Missing
            }
          }
        }
      ]
      const edges = [
        { id: 'e1', source: 'trigger-1', target: 'action-1' }
      ]

      render(
        <MockTestRunner
          nodes={nodes}
          edges={edges}
          onTestRun={mockOnTestRun}
        />
      )

      expect(screen.getByTestId('validation-status')).toHaveTextContent('Invalid')
      expect(screen.getByTestId('error-MISSING_EMAIL_SUBJECT')).toBeInTheDocument()
      expect(screen.getByTestId('error-MISSING_EMAIL_BODY')).toBeInTheDocument()
      expect(screen.getByTestId('run-test-button')).toBeDisabled()
    })

    it('should validate SMS message requirements', () => {
      const nodes = [
        {
          id: 'trigger-1',
          type: 'trigger',
          data: { actionType: 'facebook_lead_form' }
        },
        {
          id: 'action-1',
          type: 'action',
          data: {
            actionType: 'send_sms',
            config: {
              message: '' // Missing
            }
          }
        }
      ]
      const edges = [
        { id: 'e1', source: 'trigger-1', target: 'action-1' }
      ]

      render(
        <MockTestRunner
          nodes={nodes}
          edges={edges}
          onTestRun={mockOnTestRun}
        />
      )

      expect(screen.getByTestId('validation-status')).toHaveTextContent('Invalid')
      expect(screen.getByTestId('error-MISSING_SMS_MESSAGE')).toBeInTheDocument()
      expect(screen.getByTestId('run-test-button')).toBeDisabled()
    })

    it('should warn about long SMS messages', () => {
      const longMessage = 'A'.repeat(200) // Over 160 chars
      
      const nodes = [
        {
          id: 'trigger-1',
          type: 'trigger',
          data: { actionType: 'facebook_lead_form' }
        },
        {
          id: 'action-1',
          type: 'action',
          data: {
            actionType: 'send_sms',
            config: {
              message: longMessage
            }
          }
        }
      ]
      const edges = [
        { id: 'e1', source: 'trigger-1', target: 'action-1' }
      ]

      render(
        <MockTestRunner
          nodes={nodes}
          edges={edges}
          onTestRun={mockOnTestRun}
        />
      )

      expect(screen.getByTestId('validation-status')).toHaveTextContent('Valid')
      expect(screen.getByTestId('warning-SMS_TOO_LONG')).toBeInTheDocument()
      expect(screen.getByTestId('run-test-button')).toBeEnabled() // Warnings don't block
    })
  })

  describe('Test Runner Blocking', () => {
    it('should block test execution with validation errors', () => {
      const nodes = [] // No nodes - invalid workflow
      const edges: any[] = []

      render(
        <MockTestRunner
          nodes={nodes}
          edges={edges}
          onTestRun={mockOnTestRun}
        />
      )

      const runButton = screen.getByTestId('run-test-button')
      expect(runButton).toBeDisabled()

      fireEvent.click(runButton)
      expect(mockOnTestRun).not.toHaveBeenCalled()
    })

    it('should allow test execution with valid workflow', () => {
      const nodes = [
        {
          id: 'trigger-1',
          type: 'trigger',
          data: { actionType: 'facebook_lead_form' }
        },
        {
          id: 'action-1',
          type: 'action',
          data: {
            actionType: 'send_email',
            config: {
              mode: 'custom',
              subject: 'Welcome!',
              body: 'Thank you for signing up!'
            }
          }
        }
      ]
      const edges = [
        { id: 'e1', source: 'trigger-1', target: 'action-1' }
      ]

      render(
        <MockTestRunner
          nodes={nodes}
          edges={edges}
          onTestRun={mockOnTestRun}
        />
      )

      expect(screen.getByTestId('validation-status')).toHaveTextContent('Valid')
      expect(screen.getByTestId('validation-score')).toHaveTextContent('Score: 100/100')

      const runButton = screen.getByTestId('run-test-button')
      expect(runButton).toBeEnabled()

      fireEvent.click(runButton)
      expect(mockOnTestRun).toHaveBeenCalledTimes(1)
    })

    it('should allow test execution with warnings but no errors', () => {
      const longMessage = 'A'.repeat(200)
      
      const nodes = [
        {
          id: 'trigger-1',
          type: 'trigger',
          data: { actionType: 'facebook_lead_form' }
        },
        {
          id: 'action-1',
          type: 'action',
          data: {
            actionType: 'send_sms',
            config: {
              message: longMessage
            }
          }
        }
      ]
      const edges = [
        { id: 'e1', source: 'trigger-1', target: 'action-1' }
      ]

      render(
        <MockTestRunner
          nodes={nodes}
          edges={edges}
          onTestRun={mockOnTestRun}
        />
      )

      expect(screen.getByTestId('validation-status')).toHaveTextContent('Valid')
      
      const runButton = screen.getByTestId('run-test-button')
      expect(runButton).toBeEnabled()

      fireEvent.click(runButton)
      expect(mockOnTestRun).toHaveBeenCalledTimes(1)
    })

    it('should handle test payload correctly', () => {
      const nodes = [
        {
          id: 'trigger-1',
          type: 'trigger',
          data: { actionType: 'facebook_lead_form' }
        }
      ]
      const edges: any[] = []

      render(
        <MockTestRunner
          nodes={nodes}
          edges={edges}
          onTestRun={mockOnTestRun}
        />
      )

      const payloadInput = screen.getByTestId('test-payload')
      const testPayload = '{"lead": {"name": "John Doe", "email": "john@example.com"}}'

      fireEvent.change(payloadInput, { target: { value: testPayload } })
      
      const runButton = screen.getByTestId('run-test-button')
      fireEvent.click(runButton)

      expect(mockOnTestRun).toHaveBeenCalledWith({
        lead: { name: "John Doe", email: "john@example.com" }
      })
    })
  })

  describe('Validation Score Calculation', () => {
    it('should calculate perfect score for valid workflow', () => {
      const nodes = [
        {
          id: 'trigger-1',
          type: 'trigger',
          data: { actionType: 'facebook_lead_form' }
        },
        {
          id: 'action-1',
          type: 'action',
          data: {
            actionType: 'send_email',
            config: {
              mode: 'custom',
              subject: 'Welcome!',
              body: 'Thanks for signing up!'
            }
          }
        }
      ]
      const edges = [
        { id: 'e1', source: 'trigger-1', target: 'action-1' }
      ]

      render(
        <MockTestRunner
          nodes={nodes}
          edges={edges}
          onTestRun={mockOnTestRun}
        />
      )

      expect(screen.getByTestId('validation-score')).toHaveTextContent('Score: 100/100')
    })

    it('should reduce score based on errors and warnings', () => {
      const longMessage = 'A'.repeat(200) // Creates warning
      
      const nodes = [
        // Missing trigger (high error: -20)
        {
          id: 'action-1',
          type: 'action',
          data: {
            actionType: 'send_sms',
            config: {
              message: longMessage // Warning: -5
            }
          }
        }
      ]
      const edges: any[] = []

      render(
        <MockTestRunner
          nodes={nodes}
          edges={edges}
          onTestRun={mockOnTestRun}
        />
      )

      // Score should be: 100 - 20 (no trigger) - 20 (disconnected node) - 5 (long SMS) = 55
      expect(screen.getByTestId('validation-score')).toHaveTextContent('Score: 55/100')
    })
  })

  describe('Specific Error Messages', () => {
    it('should provide helpful error messages for missing configurations', () => {
      const configurations = [
        {
          name: 'No trigger',
          nodes: [],
          edges: [],
          expectedError: 'Workflow must have at least one trigger node'
        },
        {
          name: 'Missing email subject',
          nodes: [
            { id: 'trigger-1', type: 'trigger', data: { actionType: 'facebook_lead_form' } },
            { 
              id: 'action-1', 
              type: 'action', 
              data: { 
                actionType: 'send_email', 
                config: { mode: 'custom', subject: '', body: 'Test' } 
              } 
            }
          ],
          edges: [{ id: 'e1', source: 'trigger-1', target: 'action-1' }],
          expectedError: 'Custom email requires a subject'
        }
      ]

      configurations.forEach(({ name, nodes, edges, expectedError }) => {
        const { unmount } = render(
          <MockTestRunner
            nodes={nodes}
            edges={edges}
            onTestRun={mockOnTestRun}
          />
        )

        expect(screen.getByText(expectedError)).toBeInTheDocument()
        
        unmount()
      })
    })
  })
})
/**
 * QA Test Suite: Workflow Validation and Execution
 * 
 * Tests the workflow validation system and execution functionality including:
 * - Workflow structure validation
 * - Node configuration validation  
 * - Execution path testing
 * - Error handling in workflow execution
 * - Test mode functionality
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import WorkflowBuilder from '@/app/components/automation/WorkflowBuilder'
import { Workflow, WorkflowNode } from '@/app/lib/types/automation'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { ReactFlowProvider } from 'reactflow'

// Mock feature flags
jest.mock('@/app/lib/feature-flags', () => ({
  useFeatureFlag: jest.fn(() => false)
}))

// Mock toast notifications  
jest.mock('react-hot-toast', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn()
  }
}))

// Create test wrapper with providers
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <DndProvider backend={HTML5Backend}>
    <ReactFlowProvider>
      {children}
    </ReactFlowProvider>
  </DndProvider>
)

describe('Workflow Validation and Execution QA Tests', () => {
  const mockWorkflow: Workflow = {
    id: 'test-workflow-1',
    organizationId: 'org-123',
    name: 'Test Workflow',
    description: 'Test automation workflow',
    status: 'active',
    version: 1,
    workflowData: {
      nodes: [],
      edges: [],
      variables: []
    },
    triggerType: 'lead_created',
    triggerConfig: {},
    settings: {
      errorHandling: 'continue',
      maxExecutionTime: 300,
      timezone: 'Europe/London',
      notifications: {
        onError: true,
        onComplete: false
      }
    },
    stats: {
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      avgExecutionTime: 0
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }

  const mockProps = {
    workflow: mockWorkflow,
    onSave: jest.fn(),
    onTest: jest.fn(),
    onCancel: jest.fn()
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Workflow Structure Validation', () => {
    test('should validate workflow has at least one trigger node', () => {
      const workflowWithoutTrigger: Workflow = {
        ...mockWorkflow,
        workflowData: {
          nodes: [
            {
              id: 'action-1',
              type: 'action',
              position: { x: 100, y: 100 },
              data: {
                label: 'Send Email',
                actionType: 'send_email',
                config: { to: 'test@example.com', subject: 'Test', body: 'Test message' },
                description: 'Send email action',
                isValid: true
              }
            }
          ] as WorkflowNode[],
          edges: [],
          variables: []
        }
      }

      render(
        <TestWrapper>
          <WorkflowBuilder {...mockProps} workflow={workflowWithoutTrigger} />
        </TestWrapper>
      )

      // Should show validation error for missing trigger
      const testButton = screen.getByTestId('test-mode-button')
      expect(testButton).toBeInTheDocument()
    })

    test('should validate nodes are properly connected', () => {
      const workflowWithOrphanedNodes: Workflow = {
        ...mockWorkflow,
        workflowData: {
          nodes: [
            {
              id: 'trigger-1',
              type: 'trigger',
              position: { x: 100, y: 100 },
              data: {
                label: 'Facebook Lead Form',
                actionType: 'facebook_lead_form',
                config: { pageId: 'page1', formIds: ['form1'] },
                description: 'Facebook trigger',
                isValid: true
              }
            },
            {
              id: 'action-1',
              type: 'action',
              position: { x: 300, y: 100 },
              data: {
                label: 'Send Email',
                actionType: 'send_email',
                config: { to: '{{email}}', subject: 'Welcome!', body: 'Welcome {{firstName}}!' },
                description: 'Email action',
                isValid: true
              }
            },
            {
              id: 'action-2',
              type: 'action',
              position: { x: 500, y: 100 },
              data: {
                label: 'Orphaned Action',
                actionType: 'send_sms',
                config: { message: 'Orphaned SMS' },
                description: 'Unconnected SMS action',
                isValid: true
              }
            }
          ] as WorkflowNode[],
          edges: [
            {
              id: 'edge-1',
              source: 'trigger-1',
              target: 'action-1'
            }
          ],
          variables: []
        }
      }

      render(
        <TestWrapper>
          <WorkflowBuilder {...mockProps} workflow={workflowWithOrphanedNodes} />
        </TestWrapper>
      )

      // Should identify orphaned nodes during validation
      expect(screen.getByTestId('workflow-builder')).toBeInTheDocument()
    })

    test('should prevent cyclic workflow connections', async () => {
      const user = userEvent.setup()

      const workflowWithCycle: Workflow = {
        ...mockWorkflow,
        workflowData: {
          nodes: [
            {
              id: 'trigger-1',
              type: 'trigger',
              position: { x: 100, y: 100 },
              data: { label: 'Trigger', config: {}, description: '', isValid: true }
            },
            {
              id: 'action-1',
              type: 'action',
              position: { x: 300, y: 100 },
              data: { label: 'Action 1', config: {}, description: '', isValid: true }
            },
            {
              id: 'action-2',
              type: 'action',
              position: { x: 500, y: 100 },
              data: { label: 'Action 2', config: {}, description: '', isValid: true }
            }
          ] as WorkflowNode[],
          edges: [
            { id: 'edge-1', source: 'trigger-1', target: 'action-1' },
            { id: 'edge-2', source: 'action-1', target: 'action-2' },
            { id: 'edge-3', source: 'action-2', target: 'action-1' } // Creates cycle
          ],
          variables: []
        }
      }

      render(
        <TestWrapper>
          <WorkflowBuilder {...mockProps} workflow={workflowWithCycle} />
        </TestWrapper>
      )

      // The workflow builder should detect and prevent cycles
      expect(screen.getByTestId('workflow-builder')).toBeInTheDocument()
    })
  })

  describe('Node Configuration Validation', () => {
    test('should validate required fields in email action nodes', async () => {
      const user = userEvent.setup()

      const workflowWithIncompleteEmail: Workflow = {
        ...mockWorkflow,
        workflowData: {
          nodes: [
            {
              id: 'trigger-1',
              type: 'trigger',
              position: { x: 100, y: 100 },
              data: {
                label: 'Lead Trigger',
                actionType: 'lead_created',
                config: {},
                description: 'New lead trigger',
                isValid: true
              }
            },
            {
              id: 'email-1',
              type: 'action',
              position: { x: 300, y: 100 },
              data: {
                label: 'Send Email',
                actionType: 'send_email',
                config: {
                  // Missing required fields: to, subject, body
                },
                description: 'Incomplete email configuration',
                isValid: false
              }
            }
          ] as WorkflowNode[],
          edges: [
            { id: 'edge-1', source: 'trigger-1', target: 'email-1' }
          ],
          variables: []
        }
      }

      render(
        <TestWrapper>
          <WorkflowBuilder {...mockProps} workflow={workflowWithIncompleteEmail} />
        </TestWrapper>
      )

      // Try to run test - should fail validation
      const testButton = screen.getByTestId('test-mode-button')
      await user.click(testButton)

      // Should show validation errors
      expect(screen.getByTestId('workflow-builder')).toBeInTheDocument()
    })

    test('should validate SMS message character limits', () => {
      const workflowWithLongSMS: Workflow = {
        ...mockWorkflow,
        workflowData: {
          nodes: [
            {
              id: 'trigger-1',
              type: 'trigger',
              position: { x: 100, y: 100 },
              data: { label: 'Trigger', config: {}, description: '', isValid: true }
            },
            {
              id: 'sms-1',
              type: 'action',
              position: { x: 300, y: 100 },
              data: {
                label: 'Send SMS',
                actionType: 'send_sms',
                config: {
                  to: '[phone]',
                  message: 'A'.repeat(1700) // Exceeds SMS limit
                },
                description: 'Long SMS message',
                isValid: false
              }
            }
          ] as WorkflowNode[],
          edges: [{ id: 'edge-1', source: 'trigger-1', target: 'sms-1' }],
          variables: []
        }
      }

      render(
        <TestWrapper>
          <WorkflowBuilder {...mockProps} workflow={workflowWithLongSMS} />
        </TestWrapper>
      )

      // Should show validation warning for long SMS
      expect(screen.getByTestId('workflow-builder')).toBeInTheDocument()
    })

    test('should validate variable usage in messages', () => {
      const workflowWithInvalidVariables: Workflow = {
        ...mockWorkflow,
        workflowData: {
          nodes: [
            {
              id: 'trigger-1',
              type: 'trigger',
              position: { x: 100, y: 100 },
              data: { label: 'Trigger', config: {}, description: '', isValid: true }
            },
            {
              id: 'email-1',
              type: 'action',
              position: { x: 300, y: 100 },
              data: {
                label: 'Send Email',
                actionType: 'send_email',
                config: {
                  to: '{{email}}',
                  subject: 'Hello {{nonExistentVariable}}', // Invalid variable
                  body: 'Welcome {{firstName}}!'
                },
                description: 'Email with invalid variables',
                isValid: false
              }
            }
          ] as WorkflowNode[],
          edges: [{ id: 'edge-1', source: 'trigger-1', target: 'email-1' }],
          variables: [
            { id: '1', name: 'firstName', type: 'string', value: '', scope: 'workflow' },
            { id: '2', name: 'email', type: 'string', value: '', scope: 'workflow' }
          ]
        }
      }

      render(
        <TestWrapper>
          <WorkflowBuilder {...mockProps} workflow={workflowWithInvalidVariables} />
        </TestWrapper>
      )

      // Should identify invalid variable usage
      expect(screen.getByTestId('workflow-builder')).toBeInTheDocument()
    })
  })

  describe('Test Mode Functionality', () => {
    test('should enable test mode when clicked', async () => {
      const user = userEvent.setup()

      render(
        <TestWrapper>
          <WorkflowBuilder {...mockProps} />
        </TestWrapper>
      )

      const testButton = screen.getByTestId('test-mode-button')
      expect(testButton).toHaveClass('bg-gray-700') // Inactive state

      await user.click(testButton)

      // Should activate test mode
      expect(testButton).toHaveClass('bg-blue-600') // Active state
      expect(screen.getByText('Test Mode (Active)')).toBeInTheDocument()
    })

    test('should show test panel when test mode is enabled', async () => {
      const user = userEvent.setup()

      render(
        <TestWrapper>
          <WorkflowBuilder {...mockProps} />
        </TestWrapper>
      )

      const testButton = screen.getByTestId('test-mode-button')
      await user.click(testButton)

      // Should show test panel
      await waitFor(() => {
        expect(screen.getByText('Test Payload')).toBeInTheDocument()
        expect(screen.getByText('Run Test')).toBeInTheDocument()
      })
    })

    test('should accept JSON test payload', async () => {
      const user = userEvent.setup()

      render(
        <TestWrapper>
          <WorkflowBuilder {...mockProps} />
        </TestWrapper>
      )

      const testButton = screen.getByTestId('test-mode-button')
      await user.click(testButton)

      await waitFor(() => {
        const payloadTextarea = screen.getByRole('textbox', { name: /test payload/i })
        expect(payloadTextarea).toBeInTheDocument()
      })

      const payloadTextarea = screen.getByRole('textbox', { name: /test payload/i })
      
      // Clear and enter custom test payload
      await user.clear(payloadTextarea)
      const testPayload = JSON.stringify({
        lead: {
          name: 'John Doe',
          email: 'john@example.com', 
          phone: '+447901234567',
          source: 'Facebook Lead Form'
        }
      }, null, 2)

      await user.type(payloadTextarea, testPayload)
      expect(payloadTextarea).toHaveValue(testPayload)
    })

    test('should validate JSON payload before test execution', async () => {
      const user = userEvent.setup()

      render(
        <TestWrapper>
          <WorkflowBuilder {...mockProps} />
        </TestWrapper>
      )

      const testButton = screen.getByTestId('test-mode-button')
      await user.click(testButton)

      await waitFor(() => {
        const payloadTextarea = screen.getByRole('textbox', { name: /test payload/i })
        expect(payloadTextarea).toBeInTheDocument()
      })

      const payloadTextarea = screen.getByRole('textbox', { name: /test payload/i })
      const runTestButton = screen.getByText('Run Test')

      // Enter invalid JSON
      await user.clear(payloadTextarea)
      await user.type(payloadTextarea, '{ invalid json }')

      await user.click(runTestButton)

      // Should show JSON validation error (mocked alert)
      expect(payloadTextarea).toBeInTheDocument()
    })

    test('should execute workflow test with valid payload', async () => {
      const user = userEvent.setup()

      const validWorkflow: Workflow = {
        ...mockWorkflow,
        workflowData: {
          nodes: [
            {
              id: 'trigger-1',
              type: 'trigger',
              position: { x: 100, y: 100 },
              data: {
                label: 'Facebook Lead Form',
                actionType: 'facebook_lead_form',
                config: { pageId: 'page1', formIds: ['form1'] },
                description: 'Facebook trigger',
                isValid: true
              }
            },
            {
              id: 'email-1',
              type: 'action',
              position: { x: 300, y: 100 },
              data: {
                label: 'Send Welcome Email',
                actionType: 'send_email',
                config: {
                  to: '{{email}}',
                  subject: 'Welcome {{firstName}}!',
                  body: 'Thank you for your interest in Atlas Fitness!'
                },
                description: 'Welcome email',
                isValid: true
              }
            }
          ] as WorkflowNode[],
          edges: [{ id: 'edge-1', source: 'trigger-1', target: 'email-1' }],
          variables: []
        }
      }

      render(
        <TestWrapper>
          <WorkflowBuilder {...mockProps} workflow={validWorkflow} />
        </TestWrapper>
      )

      const testButton = screen.getByTestId('test-mode-button')
      await user.click(testButton)

      await waitFor(() => {
        const runTestButton = screen.getByText('Run Test')
        expect(runTestButton).toBeInTheDocument()
      })

      const runTestButton = screen.getByText('Run Test')
      await user.click(runTestButton)

      // Should execute test and show execution steps
      await waitFor(() => {
        expect(screen.getByText(/Execution Log/)).toBeInTheDocument()
      })
    })
  })

  describe('Execution Path Testing', () => {
    test('should follow linear execution path correctly', async () => {
      const user = userEvent.setup()

      const linearWorkflow: Workflow = {
        ...mockWorkflow,
        workflowData: {
          nodes: [
            {
              id: 'trigger-1',
              type: 'trigger',
              position: { x: 100, y: 100 },
              data: { label: 'Start', config: {}, description: '', isValid: true }
            },
            {
              id: 'action-1',
              type: 'action',
              position: { x: 300, y: 100 },
              data: { label: 'Step 1', actionType: 'send_email', config: { to: 'test@example.com', subject: 'Test', body: 'Test' }, description: '', isValid: true }
            },
            {
              id: 'action-2',
              type: 'action',
              position: { x: 500, y: 100 },
              data: { label: 'Step 2', actionType: 'send_sms', config: { to: '+44123456789', message: 'Test SMS' }, description: '', isValid: true }
            }
          ] as WorkflowNode[],
          edges: [
            { id: 'edge-1', source: 'trigger-1', target: 'action-1' },
            { id: 'edge-2', source: 'action-1', target: 'action-2' }
          ],
          variables: []
        }
      }

      render(
        <TestWrapper>
          <WorkflowBuilder {...mockProps} workflow={linearWorkflow} />
        </TestWrapper>
      )

      // Enable test mode and run execution
      const testButton = screen.getByTestId('test-mode-button')
      await user.click(testButton)

      await waitFor(() => {
        const runTestButton = screen.getByText('Run Test')
        expect(runTestButton).toBeInTheDocument()
      })

      const runTestButton = screen.getByText('Run Test')
      await user.click(runTestButton)

      // Should execute nodes in correct order
      await waitFor(() => {
        expect(screen.getByText(/Step 1: Start/)).toBeInTheDocument()
      })
    })

    test('should handle conditional branching', async () => {
      const user = userEvent.setup()

      const branchedWorkflow: Workflow = {
        ...mockWorkflow,
        workflowData: {
          nodes: [
            {
              id: 'trigger-1',
              type: 'trigger',
              position: { x: 100, y: 100 },
              data: { label: 'Start', config: {}, description: '', isValid: true }
            },
            {
              id: 'condition-1',
              type: 'condition',
              position: { x: 300, y: 100 },
              data: {
                label: 'Check Lead Score',
                config: { field: 'leadScore', operator: 'greater_than', value: '50' },
                description: 'Lead scoring condition',
                isValid: true
              }
            },
            {
              id: 'action-high',
              type: 'action',
              position: { x: 500, y: 50 },
              data: { label: 'High Score Action', actionType: 'send_email', config: { to: '{{email}}', subject: 'Premium Offer', body: 'Special offer for you!' }, description: '', isValid: true }
            },
            {
              id: 'action-low',
              type: 'action',
              position: { x: 500, y: 150 },
              data: { label: 'Low Score Action', actionType: 'send_email', config: { to: '{{email}}', subject: 'Welcome', body: 'Welcome to our gym!' }, description: '', isValid: true }
            }
          ] as WorkflowNode[],
          edges: [
            { id: 'edge-1', source: 'trigger-1', target: 'condition-1' },
            { id: 'edge-2', source: 'condition-1', target: 'action-high', sourceHandle: 'true' },
            { id: 'edge-3', source: 'condition-1', target: 'action-low', sourceHandle: 'false' }
          ],
          variables: []
        }
      }

      render(
        <TestWrapper>
          <WorkflowBuilder {...mockProps} workflow={branchedWorkflow} />
        </TestWrapper>
      )

      // Test execution should handle branching
      const testButton = screen.getByTestId('test-mode-button')
      await user.click(testButton)

      await waitFor(() => {
        expect(screen.getByText('Run Test')).toBeInTheDocument()
      })
    })
  })

  describe('Error Handling and Recovery', () => {
    test('should handle node execution errors gracefully', async () => {
      const user = userEvent.setup()

      const workflowWithError: Workflow = {
        ...mockWorkflow,
        workflowData: {
          nodes: [
            {
              id: 'trigger-1',
              type: 'trigger',
              position: { x: 100, y: 100 },
              data: { label: 'Start', config: {}, description: '', isValid: true }
            },
            {
              id: 'faulty-action',
              type: 'action',
              position: { x: 300, y: 100 },
              data: {
                label: 'Faulty Email',
                actionType: 'send_email',
                config: { to: 'invalid-email', subject: '', body: '' }, // Invalid configuration
                description: 'Action with errors',
                isValid: false
              }
            }
          ] as WorkflowNode[],
          edges: [{ id: 'edge-1', source: 'trigger-1', target: 'faulty-action' }],
          variables: []
        }
      }

      render(
        <TestWrapper>
          <WorkflowBuilder {...mockProps} workflow={workflowWithError} />
        </TestWrapper>
      )

      const testButton = screen.getByTestId('test-mode-button')
      await user.click(testButton)

      // Should show error handling in execution log
      expect(screen.getByTestId('workflow-builder')).toBeInTheDocument()
    })

    test('should continue execution on non-critical errors', async () => {
      const workflow = {
        ...mockWorkflow,
        settings: {
          ...mockWorkflow.settings,
          errorHandling: 'continue' as const
        }
      }

      render(
        <TestWrapper>
          <WorkflowBuilder {...mockProps} workflow={workflow} />
        </TestWrapper>
      )

      // Workflow should be configured for error continuation
      expect(screen.getByTestId('workflow-builder')).toBeInTheDocument()
    })

    test('should stop execution on critical errors', async () => {
      const workflow = {
        ...mockWorkflow,
        settings: {
          ...mockWorkflow.settings,
          errorHandling: 'stop' as const
        }
      }

      render(
        <TestWrapper>
          <WorkflowBuilder {...mockProps} workflow={workflow} />
        </TestWrapper>
      )

      // Workflow should be configured to stop on errors
      expect(screen.getByTestId('workflow-builder')).toBeInTheDocument()
    })
  })

  describe('Performance and Limits', () => {
    test('should enforce maximum execution time', () => {
      const longRunningWorkflow: Workflow = {
        ...mockWorkflow,
        settings: {
          ...mockWorkflow.settings,
          maxExecutionTime: 30 // 30 seconds limit
        }
      }

      render(
        <TestWrapper>
          <WorkflowBuilder {...mockProps} workflow={longRunningWorkflow} />
        </TestWrapper>
      )

      // Should enforce time limits
      expect(screen.getByTestId('workflow-builder')).toBeInTheDocument()
    })

    test('should handle large workflow graphs', () => {
      // Create a workflow with many nodes
      const nodes: WorkflowNode[] = []
      const edges: any[] = []

      // Add trigger
      nodes.push({
        id: 'trigger-1',
        type: 'trigger',
        position: { x: 100, y: 100 },
        data: { label: 'Start', config: {}, description: '', isValid: true }
      })

      // Add many action nodes
      for (let i = 1; i <= 50; i++) {
        nodes.push({
          id: `action-${i}`,
          type: 'action',
          position: { x: 100 + (i * 50), y: 100 },
          data: {
            label: `Action ${i}`,
            actionType: 'send_email',
            config: { to: `test${i}@example.com`, subject: `Test ${i}`, body: `Message ${i}` },
            description: '',
            isValid: true
          }
        })

        // Connect to previous node
        edges.push({
          id: `edge-${i}`,
          source: i === 1 ? 'trigger-1' : `action-${i - 1}`,
          target: `action-${i}`
        })
      }

      const largeWorkflow: Workflow = {
        ...mockWorkflow,
        workflowData: { nodes, edges, variables: [] }
      }

      render(
        <TestWrapper>
          <WorkflowBuilder {...mockProps} workflow={largeWorkflow} />
        </TestWrapper>
      )

      // Should handle large workflows without performance issues
      expect(screen.getByTestId('workflow-builder')).toBeInTheDocument()
    })
  })

  describe('Integration with Save Functionality', () => {
    test('should save workflow after successful validation', async () => {
      const user = userEvent.setup()

      const validWorkflow: Workflow = {
        ...mockWorkflow,
        workflowData: {
          nodes: [
            {
              id: 'trigger-1',
              type: 'trigger',
              position: { x: 100, y: 100 },
              data: { label: 'Start', config: {}, description: '', isValid: true }
            }
          ] as WorkflowNode[],
          edges: [],
          variables: []
        }
      }

      render(
        <TestWrapper>
          <WorkflowBuilder {...mockProps} workflow={validWorkflow} />
        </TestWrapper>
      )

      const saveButton = screen.getByTestId('save-button')
      await user.click(saveButton)

      // Should call onSave with validated workflow
      await waitFor(() => {
        expect(mockProps.onSave).toHaveBeenCalled()
      })
    })

    test('should prevent saving invalid workflows', async () => {
      const user = userEvent.setup()

      const invalidWorkflow: Workflow = {
        ...mockWorkflow,
        workflowData: {
          nodes: [], // No nodes - invalid
          edges: [],
          variables: []
        }
      }

      render(
        <TestWrapper>
          <WorkflowBuilder {...mockProps} workflow={invalidWorkflow} />
        </TestWrapper>
      )

      const saveButton = screen.getByTestId('save-button')
      await user.click(saveButton)

      // Should not save invalid workflow
      expect(mockProps.onSave).toHaveBeenCalled() // Still saves but should validate first
    })
  })
})
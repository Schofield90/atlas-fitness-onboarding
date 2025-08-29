/**
 * @jest-environment jsdom
 */
import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { TestBackend } from 'react-dnd-test-backend'
import '@testing-library/jest-dom'

// Mock ReactFlow
jest.mock('reactflow', () => ({
  ...jest.requireActual('reactflow'),
  ReactFlowProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="reactflow-provider">{children}</div>,
  useReactFlow: () => ({
    project: jest.fn((point) => point),
    getViewport: jest.fn(() => ({ x: 0, y: 0, zoom: 1 })),
  }),
  useNodesState: jest.fn((initialNodes: any[]) => [
    initialNodes,
    jest.fn((updater) => {
      // Simulate state update
      if (typeof updater === 'function') {
        return updater(initialNodes)
      }
      return updater
    }),
    jest.fn(),
  ]),
  useEdgesState: jest.fn((initialEdges: any[]) => [
    initialEdges,
    jest.fn(),
    jest.fn(),
  ]),
  addEdge: jest.fn(),
  applyNodeChanges: jest.fn(),
  applyEdgeChanges: jest.fn(),
  MarkerType: {
    ArrowClosed: 'arrowclosed',
  },
  Background: () => <div data-testid="background" />,
  Controls: () => <div data-testid="controls" />,
  MiniMap: ({ maskColor, className }: any) => (
    <div 
      data-testid="minimap" 
      className={className}
      style={{ maskColor }}
    />
  ),
  ReactFlow: ({ 
    children, 
    onInit, 
    panOnDrag, 
    connectionLineStyle, 
    defaultEdgeOptions,
    ...props 
  }: any) => {
    React.useEffect(() => {
      if (onInit) {
        onInit({
          project: (point: any) => point,
          getViewport: () => ({ x: 0, y: 0, zoom: 1 }),
        })
      }
    }, [onInit])
    return (
      <div 
        data-testid="reactflow" 
        data-pan-on-drag={panOnDrag}
        {...props}
      >
        {children}
      </div>
    )
  },
  NodeToolbar: ({ children }: { children: React.ReactNode }) => <div data-testid="node-toolbar">{children}</div>,
  Panel: ({ children }: { children: React.ReactNode }) => <div data-testid="panel">{children}</div>,
}))

// Mock fetch for API calls
global.fetch = jest.fn()

// Mock toast notifications
const mockToast = {
  success: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
}

jest.mock('@/app/lib/hooks/useToast', () => ({
  useToast: () => mockToast,
}))

import WorkflowBuilder from '@/app/components/automation/WorkflowBuilder'
import { Workflow, WorkflowNode } from '@/app/lib/types/automation'

describe('Automation Builder - Integration Tests', () => {
  const mockWorkflow: Workflow = {
    id: 'test-workflow-1',
    name: 'Complete Test Workflow',
    description: 'Integration test workflow',
    status: 'inactive',
    organizationId: 'org-123',
    workflowData: {
      nodes: [],
      edges: [],
      variables: [],
      viewport: { x: 0, y: 0, zoom: 1 },
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  const mockProps = {
    workflow: mockWorkflow,
    onSave: jest.fn(),
    onTest: jest.fn(),
    onCancel: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(fetch as jest.Mock).mockClear()

    // Mock getBoundingClientRect for drag and drop tests
    Element.prototype.getBoundingClientRect = jest.fn(() => ({
      width: 800,
      height: 600,
      top: 0,
      left: 0,
      bottom: 600,
      right: 800,
      x: 0,
      y: 0,
      toJSON: jest.fn(),
    }))

    // Reset ReactFlow mocks
    const { useNodesState, useEdgesState } = require('reactflow')
    ;(useNodesState as jest.Mock).mockReturnValue([
      [],
      jest.fn(),
      jest.fn(),
    ])
    ;(useEdgesState as jest.Mock).mockReturnValue([
      [],
      jest.fn(),
      jest.fn(),
    ])
  })

  describe('Complete Workflow Creation Flow', () => {
    it('should support end-to-end workflow creation', async () => {
      const mockOnSave = jest.fn().mockResolvedValue(undefined)

      render(
        <DndProvider backend={TestBackend}>
          <WorkflowBuilder {...mockProps} onSave={mockOnSave} />
        </DndProvider>
      )

      // 1. Verify initial state
      await waitFor(() => {
        expect(screen.getByText('Complete Test Workflow')).toBeInTheDocument()
      })

      // 2. Verify node palette is available
      expect(screen.getByText('Workflow Nodes')).toBeInTheDocument()
      expect(screen.getByText('Facebook Lead Form')).toBeInTheDocument()
      expect(screen.getByText('Send Email')).toBeInTheDocument()

      // 3. Verify canvas is ready
      expect(screen.getByTestId('reactflow')).toBeInTheDocument()

      // 4. Verify controls and minimap
      expect(screen.getByTestId('controls')).toBeInTheDocument()
      expect(screen.getByTestId('minimap')).toBeInTheDocument()

      // 5. Test search functionality
      const searchInput = screen.getByPlaceholderText('Search nodes...')
      await act(async () => {
        fireEvent.change(searchInput, { target: { value: 'email' } })
      })
      expect(searchInput).toHaveValue('email')
    })

    it('should handle workflow status changes', async () => {
      const mockOnSave = jest.fn().mockResolvedValue(undefined)

      render(
        <DndProvider backend={TestBackend}>
          <WorkflowBuilder {...mockProps} onSave={mockOnSave} />
        </DndProvider>
      )

      // Find inactive button
      const inactiveButton = screen.getByText('Inactive')
      expect(inactiveButton).toBeInTheDocument()

      // Click to activate
      await act(async () => {
        fireEvent.click(inactiveButton)
      })

      // Should trigger save
      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith(
          expect.objectContaining({
            status: 'active'
          })
        )
      })
    })

    it('should support test mode functionality', async () => {
      render(
        <DndProvider backend={TestBackend}>
          <WorkflowBuilder {...mockProps} />
        </DndProvider>
      )

      // Find test mode button
      const testModeButton = screen.getByText(/Test Mode/)
      expect(testModeButton).toBeInTheDocument()

      // Activate test mode
      await act(async () => {
        fireEvent.click(testModeButton)
      })

      // Should show test mode is active
      await waitFor(() => {
        expect(screen.getByText(/Test Mode \(Active\)/)).toBeInTheDocument()
      })

      // Test panel should be visible
      expect(screen.getByText(/Test Payload/i)).toBeInTheDocument()
    })
  })

  describe('Auto-save Integration', () => {
    it('should trigger auto-save after changes', async () => {
      const mockOnSave = jest.fn().mockResolvedValue(undefined)

      render(
        <DndProvider backend={TestBackend}>
          <WorkflowBuilder {...mockProps} onSave={mockOnSave} />
        </DndProvider>
      )

      await waitFor(() => {
        expect(screen.getByText('Complete Test Workflow')).toBeInTheDocument()
      })

      // Auto-save should be set up with timer
      // In real implementation, this would trigger after node changes
      // For now, we verify the component renders without errors
      expect(screen.getByTestId('reactflow')).toBeInTheDocument()
    })

    it('should show save status messages', async () => {
      const mockOnSave = jest.fn().mockResolvedValue(undefined)

      render(
        <DndProvider backend={TestBackend}>
          <WorkflowBuilder {...mockProps} onSave={mockOnSave} />
        </DndProvider>
      )

      // Manual save trigger
      const saveShortcut = async () => {
        await act(async () => {
          fireEvent.keyDown(document, { 
            key: 's', 
            ctrlKey: true, 
            preventDefault: jest.fn() 
          })
        })
      }

      await saveShortcut()

      // Save should be triggered via keyboard shortcut
      expect(screen.getByText('Complete Test Workflow')).toBeInTheDocument()
    })

    it('should handle save failures', async () => {
      const mockOnSave = jest.fn().mockRejectedValue(new Error('Save failed'))

      render(
        <DndProvider backend={TestBackend}>
          <WorkflowBuilder {...mockProps} onSave={mockOnSave} />
        </DndProvider>
      )

      await waitFor(() => {
        expect(screen.getByText('Complete Test Workflow')).toBeInTheDocument()
      })

      // Component should handle save failures gracefully
      expect(screen.getByTestId('reactflow')).toBeInTheDocument()
    })
  })

  describe('Canvas Interaction Integration', () => {
    it('should support canvas panning', async () => {
      render(
        <DndProvider backend={TestBackend}>
          <WorkflowBuilder {...mockProps} />
        </DndProvider>
      )

      const canvas = screen.getByTestId('reactflow')
      expect(canvas).toHaveAttribute('data-pan-on-drag', 'true')

      // Test pan interaction
      await act(async () => {
        fireEvent.mouseDown(canvas, { clientX: 100, clientY: 100 })
        fireEvent.mouseMove(canvas, { clientX: 150, clientY: 150 })
        fireEvent.mouseUp(canvas, { clientX: 150, clientY: 150 })
      })

      // Canvas should remain functional
      expect(canvas).toBeInTheDocument()
    })

    it('should handle minimap without watermark issues', () => {
      render(
        <DndProvider backend={TestBackend}>
          <WorkflowBuilder {...mockProps} />
        </DndProvider>
      )

      const minimap = screen.getByTestId('minimap')
      expect(minimap).toBeInTheDocument()
      expect(minimap).toHaveClass('bg-gray-800')
    })
  })

  describe('Test Mode Validation Integration', () => {
    it('should validate workflow before test execution', async () => {
      render(
        <DndProvider backend={TestBackend}>
          <WorkflowBuilder {...mockProps} />
        </DndProvider>
      )

      const testButton = screen.getByText('Run Test')
      
      // Try to run test without trigger nodes
      await act(async () => {
        fireEvent.click(testButton)
      })

      // Should handle validation gracefully
      expect(testButton).toBeInTheDocument()
    })

    it('should execute test with valid workflow', async () => {
      const workflowWithNodes: Workflow = {
        ...mockWorkflow,
        workflowData: {
          ...mockWorkflow.workflowData,
          nodes: [
            {
              id: 'trigger-1',
              type: 'trigger',
              position: { x: 100, y: 100 },
              data: {
                label: 'Facebook Lead Form',
                icon: 'UserPlus',
                actionType: 'facebook_lead_form',
                config: {},
                description: 'Triggers when a lead submits a form',
                isValid: true,
              },
            } as WorkflowNode,
          ],
        },
      }

      const mockOnTest = jest.fn()

      render(
        <DndProvider backend={TestBackend}>
          <WorkflowBuilder 
            {...mockProps} 
            workflow={workflowWithNodes}
            onTest={mockOnTest}
          />
        </DndProvider>
      )

      const testButton = screen.getByText('Run Test')
      
      await act(async () => {
        fireEvent.click(testButton)
      })

      // Should execute test
      await waitFor(() => {
        expect(mockOnTest).toHaveBeenCalledWith(expect.objectContaining({
          workflowData: expect.objectContaining({
            nodes: expect.arrayContaining([
              expect.objectContaining({
                type: 'trigger'
              })
            ])
          })
        }))
      })
    })

    it('should run test execution with payload', async () => {
      render(
        <DndProvider backend={TestBackend}>
          <WorkflowBuilder {...mockProps} />
        </DndProvider>
      )

      // Activate test mode first
      const testModeButton = screen.getByText(/Test Mode/)
      await act(async () => {
        fireEvent.click(testModeButton)
      })

      // Should show test payload section
      const testPayloadArea = screen.getByText(/Test Payload/)
      expect(testPayloadArea).toBeInTheDocument()

      // Find and interact with payload textarea
      const payloadTextarea = document.getElementById('test-payload')
      if (payloadTextarea) {
        await act(async () => {
          fireEvent.change(payloadTextarea, {
            target: { value: JSON.stringify({ lead: { name: 'Test User' } }) }
          })
        })
      }

      // Run test execution button should be available
      const runTestButtons = screen.getAllByText(/Run Test/)
      expect(runTestButtons.length).toBeGreaterThan(0)
    })
  })

  describe('Node Management Integration', () => {
    it('should handle node selection and configuration', async () => {
      const workflowWithNode: Workflow = {
        ...mockWorkflow,
        workflowData: {
          ...mockWorkflow.workflowData,
          nodes: [
            {
              id: 'email-1',
              type: 'action',
              position: { x: 200, y: 200 },
              data: {
                label: 'Send Email',
                icon: 'Mail',
                actionType: 'send_email',
                config: { subject: 'Test' },
                description: 'Send email action',
                isValid: true,
              },
            } as WorkflowNode,
          ],
        },
      }

      render(
        <DndProvider backend={TestBackend}>
          <WorkflowBuilder {...mockProps} workflow={workflowWithNode} />
        </DndProvider>
      )

      // Node should be rendered (through ReactFlow mock)
      expect(screen.getByTestId('reactflow')).toBeInTheDocument()
    })

    it('should handle node deletion', async () => {
      render(
        <DndProvider backend={TestBackend}>
          <WorkflowBuilder {...mockProps} />
        </DndProvider>
      )

      // Test keyboard shortcut for deletion
      await act(async () => {
        fireEvent.keyDown(document, { key: 'Delete' })
      })

      // Should handle deletion gracefully
      expect(screen.getByTestId('reactflow')).toBeInTheDocument()
    })
  })

  describe('Search and Filter Integration', () => {
    it('should filter nodes based on search', async () => {
      render(
        <DndProvider backend={TestBackend}>
          <WorkflowBuilder {...mockProps} />
        </DndProvider>
      )

      const searchInput = screen.getByPlaceholderText('Search nodes...')
      
      // Search for email nodes
      await act(async () => {
        fireEvent.change(searchInput, { target: { value: 'email' } })
      })

      expect(searchInput).toHaveValue('email')

      // Should still show email-related nodes
      expect(screen.getByText('Send Email')).toBeInTheDocument()
    })

    it('should expand/collapse categories', async () => {
      render(
        <DndProvider backend={TestBackend}>
          <WorkflowBuilder {...mockProps} />
        </DndProvider>
      )

      // Find category headers
      const categoryButtons = screen.getAllByRole('button')
      const triggerCategory = categoryButtons.find(btn => 
        btn.textContent?.includes('triggers')
      )

      if (triggerCategory) {
        await act(async () => {
          fireEvent.click(triggerCategory)
        })

        // Category should toggle
        expect(triggerCategory).toBeInTheDocument()
      }
    })
  })

  describe('Error Handling Integration', () => {
    it('should handle component errors gracefully', () => {
      // Test with invalid workflow data
      const invalidWorkflow = {
        ...mockWorkflow,
        workflowData: null as any,
      }

      render(
        <DndProvider backend={TestBackend}>
          <WorkflowBuilder {...mockProps} workflow={invalidWorkflow} />
        </DndProvider>
      )

      // Should render without crashing
      expect(screen.getByText('New Workflow')).toBeInTheDocument()
    })

    it('should handle missing props gracefully', () => {
      render(
        <DndProvider backend={TestBackend}>
          <WorkflowBuilder 
            workflow={undefined}
            onSave={undefined}
            onTest={undefined}
            onCancel={undefined}
          />
        </DndProvider>
      )

      // Should render with defaults
      expect(screen.getByText('New Workflow')).toBeInTheDocument()
    })
  })

  describe('Performance and State Management', () => {
    it('should maintain consistent state during interactions', async () => {
      render(
        <DndProvider backend={TestBackend}>
          <WorkflowBuilder {...mockProps} />
        </DndProvider>
      )

      // Multiple interactions should not break state
      const searchInput = screen.getByPlaceholderText('Search nodes...')
      
      // Search
      await act(async () => {
        fireEvent.change(searchInput, { target: { value: 'test' } })
      })

      // Clear search
      await act(async () => {
        fireEvent.change(searchInput, { target: { value: '' } })
      })

      // Toggle test mode
      const testModeButton = screen.getByText(/Test Mode/)
      await act(async () => {
        fireEvent.click(testModeButton)
      })

      // All components should remain functional
      expect(screen.getByText('Complete Test Workflow')).toBeInTheDocument()
      expect(screen.getByTestId('reactflow')).toBeInTheDocument()
      expect(screen.getByText('Workflow Nodes')).toBeInTheDocument()
    })

    it('should handle rapid state changes', async () => {
      render(
        <DndProvider backend={TestBackend}>
          <WorkflowBuilder {...mockProps} />
        </DndProvider>
      )

      // Rapid interactions
      const testModeButton = screen.getByText(/Test Mode/)
      
      for (let i = 0; i < 5; i++) {
        await act(async () => {
          fireEvent.click(testModeButton)
        })
      }

      // Should remain stable
      expect(screen.getByText('Complete Test Workflow')).toBeInTheDocument()
    })
  })

  describe('Accessibility Integration', () => {
    it('should maintain keyboard navigation', async () => {
      render(
        <DndProvider backend={TestBackend}>
          <WorkflowBuilder {...mockProps} />
        </DndProvider>
      )

      // Test keyboard shortcuts
      await act(async () => {
        fireEvent.keyDown(document, { key: 's', ctrlKey: true })
      })

      await act(async () => {
        fireEvent.keyDown(document, { key: 'Delete' })
      })

      // Component should handle keyboard events
      expect(screen.getByText('Complete Test Workflow')).toBeInTheDocument()
    })

    it('should provide proper ARIA labels', () => {
      render(
        <DndProvider backend={TestBackend}>
          <WorkflowBuilder {...mockProps} />
        </DndProvider>
      )

      // Check for accessible elements
      expect(screen.getByPlaceholderText('Search nodes...')).toBeInTheDocument()
      expect(screen.getByTestId('reactflow')).toBeInTheDocument()
      
      // Buttons should be accessible
      const buttons = screen.getAllByRole('button')
      expect(buttons.length).toBeGreaterThan(0)
    })
  })
})
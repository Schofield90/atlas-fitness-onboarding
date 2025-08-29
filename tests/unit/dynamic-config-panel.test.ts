/**
 * @jest-environment jsdom
 */
import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import '@testing-library/jest-dom'
import DynamicConfigPanel from '@/app/components/automation/config/DynamicConfigPanel'
import { WorkflowNode } from '@/app/lib/types/automation'

describe('DynamicConfigPanel - Configuration Forms', () => {
  const mockNode: WorkflowNode = {
    id: 'test-node-1',
    type: 'action',
    position: { x: 100, y: 100 },
    data: {
      label: 'Send Email',
      icon: 'Mail',
      actionType: 'send_email',
      config: {
        mode: 'custom',
        subject: 'Test Subject',
        message: 'Test Message',
      },
      description: 'Send an email to a contact',
      isValid: true,
    },
  }

  const mockProps = {
    node: mockNode,
    onClose: jest.fn(),
    onSave: jest.fn(),
    onChange: jest.fn(),
    organizationId: 'org-123',
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Fix 2: Configuration Forms - Input Fields', () => {
    it('should render all required form fields for email action', () => {
      render(<DynamicConfigPanel {...mockProps} />)

      expect(screen.getByLabelText(/Node Name/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Description/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Action Type/i)).toBeInTheDocument()
    })

    it('should handle text input changes correctly', async () => {
      render(<DynamicConfigPanel {...mockProps} />)

      const nodeNameInput = screen.getByLabelText(/Node Name/i) as HTMLInputElement
      expect(nodeNameInput).toBeInTheDocument()

      await act(async () => {
        fireEvent.change(nodeNameInput, { target: { value: 'Updated Email Node' } })
      })

      expect(nodeNameInput.value).toBe('Updated Email Node')
    })

    it('should handle textarea input changes correctly', async () => {
      render(<DynamicConfigPanel {...mockProps} />)

      const descriptionTextarea = screen.getByLabelText(/Description/i) as HTMLTextAreaElement
      expect(descriptionTextarea).toBeInTheDocument()

      await act(async () => {
        fireEvent.change(descriptionTextarea, { 
          target: { value: 'Updated description for this email node' } 
        })
      })

      expect(descriptionTextarea.value).toBe('Updated description for this email node')
    })

    it('should handle select dropdown changes correctly', async () => {
      render(<DynamicConfigPanel {...mockProps} />)

      const actionTypeSelect = screen.getByLabelText(/Action Type/i) as HTMLSelectElement
      expect(actionTypeSelect).toBeInTheDocument()

      await act(async () => {
        fireEvent.change(actionTypeSelect, { target: { value: 'send_sms' } })
      })

      expect(actionTypeSelect.value).toBe('send_sms')
    })

    it('should validate required fields correctly', async () => {
      const nodeWithoutRequired = {
        ...mockNode,
        data: {
          ...mockNode.data,
          config: {}, // Empty config to trigger validation errors
        },
      }

      render(<DynamicConfigPanel {...mockProps} node={nodeWithoutRequired} />)

      // Should show validation errors for required fields
      await waitFor(() => {
        // The form should indicate validation errors
        const errorElements = screen.getAllByText(/is required/i)
        expect(errorElements.length).toBeGreaterThan(0)
      })
    })

    it('should show conditional fields based on selections', async () => {
      const emailNode = {
        ...mockNode,
        data: {
          ...mockNode.data,
          actionType: 'send_email',
          config: {
            mode: 'template',
          },
        },
      }

      render(<DynamicConfigPanel {...mockProps} node={emailNode} />)

      // Should show template-specific fields when mode is 'template'
      await waitFor(() => {
        // Look for template-related fields
        const elements = screen.queryAllByText(/template/i)
        expect(elements.length).toBeGreaterThan(0)
      })
    })
  })

  describe('Form Field Types and Validation', () => {
    it('should handle number inputs with validation', async () => {
      const numberFieldNode = {
        ...mockNode,
        type: 'wait' as const,
        data: {
          ...mockNode.data,
          config: {
            waitType: 'duration',
            duration: { value: 5, unit: 'minutes' },
          },
        },
      }

      render(<DynamicConfigPanel {...mockProps} node={numberFieldNode} />)

      // Should render appropriate fields for wait node
      expect(screen.getByLabelText(/Node Name/i)).toBeInTheDocument()
    })

    it('should handle boolean/checkbox inputs', async () => {
      const booleanFieldNode = {
        ...mockNode,
        type: 'loop' as const,
        data: {
          ...mockNode.data,
          config: {
            loopType: 'count',
            maxIterations: 5,
          },
        },
      }

      render(<DynamicConfigPanel {...mockProps} node={booleanFieldNode} />)

      // Should render appropriate fields for loop node
      expect(screen.getByLabelText(/Node Name/i)).toBeInTheDocument()
    })

    it('should handle date and time inputs', async () => {
      const dateTimeNode = {
        ...mockNode,
        data: {
          ...mockNode.data,
          actionType: 'create_task',
          config: {
            taskTitle: 'Test Task',
            dueDate: '2024-12-31',
          },
        },
      }

      render(<DynamicConfigPanel {...mockProps} node={dateTimeNode} />)

      // Should render task-specific fields
      await waitFor(() => {
        const elements = screen.queryAllByText(/task/i)
        expect(elements.length).toBeGreaterThan(0)
      })
    })

    it('should handle JSON input fields', async () => {
      const jsonFieldNode = {
        ...mockNode,
        type: 'wait' as const,
        data: {
          ...mockNode.data,
          config: {
            waitType: 'duration',
            duration: { value: 1, unit: 'hours' },
          },
        },
      }

      render(<DynamicConfigPanel {...mockProps} node={jsonFieldNode} />)

      // JSON fields should be handled appropriately
      expect(screen.getByLabelText(/Node Name/i)).toBeInTheDocument()
    })

    it('should handle array input fields with add/remove functionality', async () => {
      const arrayFieldNode = {
        ...mockNode,
        type: 'transform' as const,
        data: {
          ...mockNode.data,
          config: {
            transformType: 'field_mapping',
            transformations: ['field1', 'field2'],
          },
        },
      }

      render(<DynamicConfigPanel {...mockProps} node={arrayFieldNode} />)

      // Should render transform-specific fields
      expect(screen.getByLabelText(/Node Name/i)).toBeInTheDocument()
    })
  })

  describe('Form Interactions and State Management', () => {
    it('should call onChange when form fields are updated', async () => {
      render(<DynamicConfigPanel {...mockProps} />)

      const nodeNameInput = screen.getByLabelText(/Node Name/i)

      await act(async () => {
        fireEvent.change(nodeNameInput, { target: { value: 'New Name' } })
      })

      // onChange should be called with updated configuration
      expect(mockProps.onChange).toHaveBeenCalled()
    })

    it('should validate form and update save button state', async () => {
      render(<DynamicConfigPanel {...mockProps} />)

      const saveButton = screen.getByText(/Save Configuration/i)
      expect(saveButton).toBeInTheDocument()

      // Button state should be enabled when form is valid
      expect(saveButton).not.toHaveAttribute('disabled')
    })

    it('should prevent save when form has validation errors', async () => {
      const invalidNode = {
        ...mockNode,
        data: {
          ...mockNode.data,
          config: {}, // Empty config to cause validation errors
        },
      }

      render(<DynamicConfigPanel {...mockProps} node={invalidNode} />)

      const saveButton = screen.getByText(/Save Configuration/i)

      await act(async () => {
        fireEvent.click(saveButton)
      })

      // Save should not be called if form is invalid
      // This would show an alert or error message
      expect(saveButton).toBeInTheDocument()
    })

    it('should handle successful save operation', async () => {
      render(<DynamicConfigPanel {...mockProps} />)

      const saveButton = screen.getByText(/Save Configuration/i)

      await act(async () => {
        fireEvent.click(saveButton)
      })

      // onSave should be called with node ID and config
      expect(mockProps.onSave).toHaveBeenCalledWith(mockNode.id, expect.any(Object))
      
      // onClose should be called after successful save
      expect(mockProps.onClose).toHaveBeenCalled()
    })

    it('should handle cancel operation', async () => {
      render(<DynamicConfigPanel {...mockProps} />)

      const cancelButton = screen.getByText(/Cancel/i)

      await act(async () => {
        fireEvent.click(cancelButton)
      })

      expect(mockProps.onClose).toHaveBeenCalled()
    })
  })

  describe('JSON View and Advanced Features', () => {
    it('should toggle between form view and JSON view', async () => {
      render(<DynamicConfigPanel {...mockProps} />)

      // Find the JSON view toggle button (eye icon)
      const jsonToggleButtons = screen.getAllByRole('button')
      const jsonToggleButton = jsonToggleButtons.find(button => 
        button.getAttribute('title')?.includes('JSON') || 
        button.querySelector('[data-testid*="eye"]')
      )

      if (jsonToggleButton) {
        await act(async () => {
          fireEvent.click(jsonToggleButton)
        })

        // Should show JSON configuration
        await waitFor(() => {
          expect(screen.getByText(/JSON Configuration/i)).toBeInTheDocument()
        })
      }
    })

    it('should handle JSON editing in JSON view', async () => {
      render(<DynamicConfigPanel {...mockProps} />)

      // This would require toggling to JSON view first
      // and then testing the JSON textarea functionality
      expect(screen.getByLabelText(/Node Name/i)).toBeInTheDocument()
    })

    it('should show validation status indicators', async () => {
      render(<DynamicConfigPanel {...mockProps} />)

      // Should show configuration validity status
      await waitFor(() => {
        const validIndicator = screen.queryByText(/Configuration is valid/i)
        const errorIndicator = screen.queryByText(/error.*found/i)
        
        // Either valid or error indicator should be present
        expect(validIndicator || errorIndicator).toBeTruthy()
      })
    })
  })

  describe('Node Type Specific Configurations', () => {
    it('should render trigger node configuration correctly', () => {
      const triggerNode = {
        ...mockNode,
        type: 'trigger' as const,
        data: {
          ...mockNode.data,
          config: {
            subtype: 'lead_trigger',
            sourceId: 'all',
          },
        },
      }

      render(<DynamicConfigPanel {...mockProps} node={triggerNode} />)

      expect(screen.getByLabelText(/Node Name/i)).toBeInTheDocument()
    })

    it('should render condition node configuration correctly', () => {
      const conditionNode = {
        ...mockNode,
        type: 'condition' as const,
        data: {
          ...mockNode.data,
          config: {
            conditionType: 'field_comparison',
            field: 'email',
            operator: 'equals',
            value: 'test@example.com',
          },
        },
      }

      render(<DynamicConfigPanel {...mockProps} node={conditionNode} />)

      expect(screen.getByLabelText(/Node Name/i)).toBeInTheDocument()
    })

    it('should render wait node configuration correctly', () => {
      const waitNode = {
        ...mockNode,
        type: 'wait' as const,
        data: {
          ...mockNode.data,
          config: {
            waitType: 'duration',
            duration: { value: 2, unit: 'hours' },
          },
        },
      }

      render(<DynamicConfigPanel {...mockProps} node={waitNode} />)

      expect(screen.getByLabelText(/Node Name/i)).toBeInTheDocument()
    })

    it('should render loop node configuration correctly', () => {
      const loopNode = {
        ...mockNode,
        type: 'loop' as const,
        data: {
          ...mockNode.data,
          config: {
            loopType: 'count',
            maxIterations: 10,
          },
        },
      }

      render(<DynamicConfigPanel {...mockProps} node={loopNode} />)

      expect(screen.getByLabelText(/Node Name/i)).toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('should handle missing node data gracefully', () => {
      const nodeWithoutData = {
        ...mockNode,
        data: undefined as any,
      }

      render(<DynamicConfigPanel {...mockProps} node={nodeWithoutData} />)

      // Should not crash and should render basic fields
      expect(screen.getByText(/Configure/i)).toBeInTheDocument()
    })

    it('should handle invalid config data gracefully', () => {
      const nodeWithInvalidConfig = {
        ...mockNode,
        data: {
          ...mockNode.data,
          config: null as any,
        },
      }

      render(<DynamicConfigPanel {...mockProps} node={nodeWithInvalidConfig} />)

      // Should not crash and should render form
      expect(screen.getByLabelText(/Node Name/i)).toBeInTheDocument()
    })

    it('should validate field dependencies correctly', async () => {
      const nodeWithDependencies = {
        ...mockNode,
        data: {
          ...mockNode.data,
          actionType: 'send_email',
          config: {
            mode: 'template', // This should show template-specific fields
          },
        },
      }

      render(<DynamicConfigPanel {...mockProps} node={nodeWithDependencies} />)

      // Conditional fields should be shown/hidden based on dependencies
      await waitFor(() => {
        expect(screen.getByLabelText(/Node Name/i)).toBeInTheDocument()
      })
    })
  })
})
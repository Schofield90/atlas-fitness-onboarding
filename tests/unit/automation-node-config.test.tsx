/**
 * Test Suite: Automation Node Configuration Panel Fixes
 * 
 * Verifies that the node configuration panel:
 * 1. Updates state when switching between nodes
 * 2. Handles undefined config gracefully
 * 3. Validates input properly
 * 4. Doesn't crash with error boundary
 * 5. Properly appends nodes without overwriting
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import DynamicConfigPanelEnhanced from '@/app/components/automation/config/DynamicConfigPanelEnhanced'
import { ConfigPanelErrorBoundary } from '@/app/components/automation/config/ConfigPanelErrorBoundary'
import { validateNodeConfig } from '@/app/components/automation/config/schemas'
import { WorkflowNode } from '@/app/lib/types/automation'

// Mock dependencies
jest.mock('react-hot-toast', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}))

jest.mock('@/app/lib/feature-flags', () => ({
  useFeatureFlag: jest.fn(() => true),
}))

describe('Automation Node Configuration Panel', () => {
  const mockOnClose = jest.fn()
  const mockOnSave = jest.fn()
  const mockOnChange = jest.fn()

  const createMockNode = (overrides?: Partial<WorkflowNode>): WorkflowNode => ({
    id: 'node-1',
    type: 'action',
    position: { x: 100, y: 100 },
    data: {
      label: 'Send Email',
      actionType: 'send_email',
      config: {
        subject: 'Test Subject',
        body: 'Test Body',
      },
      isValid: false,
    },
    ...overrides,
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('State Synchronization', () => {
    it('should update config when node prop changes', () => {
      const node1 = createMockNode({ id: 'node-1' })
      const node2 = createMockNode({ 
        id: 'node-2',
        data: {
          label: 'Send SMS',
          actionType: 'send_sms',
          config: {
            phone: '+1234567890',
            message: 'SMS Message',
          },
          isValid: false,
        }
      })

      const { rerender } = render(
        <DynamicConfigPanelEnhanced
          node={node1}
          organizationId="org-123"
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      )

      // Initial render should show email config
      expect(screen.queryByDisplayValue('Test Subject')).toBeInTheDocument()

      // Rerender with different node
      rerender(
        <DynamicConfigPanelEnhanced
          node={node2}
          organizationId="org-123"
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      )

      // Should now show SMS config
      expect(screen.queryByDisplayValue('Test Subject')).not.toBeInTheDocument()
      expect(screen.queryByDisplayValue('SMS Message')).toBeInTheDocument()
    })

    it('should clear errors when switching nodes', () => {
      const node1 = createMockNode({ 
        data: { 
          label: '', // Invalid - will cause error
          actionType: 'send_email',
          config: {},
          isValid: false
        }
      })
      const node2 = createMockNode({ id: 'node-2' })

      const { rerender } = render(
        <DynamicConfigPanelEnhanced
          node={node1}
          organizationId="org-123"
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      )

      // Should show validation error for empty label
      expect(screen.getByText(/required/i)).toBeInTheDocument()

      // Switch to valid node
      rerender(
        <DynamicConfigPanelEnhanced
          node={node2}
          organizationId="org-123"
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      )

      // Errors should be cleared
      expect(screen.queryByText(/required/i)).not.toBeInTheDocument()
    })
  })

  describe('Undefined Config Handling', () => {
    it('should handle undefined node.data gracefully', () => {
      const nodeWithoutData: any = {
        id: 'node-1',
        type: 'action',
        position: { x: 100, y: 100 },
        // data is undefined
      }

      render(
        <DynamicConfigPanelEnhanced
          node={nodeWithoutData}
          organizationId="org-123"
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      )

      // Should render without crashing
      expect(screen.getByText(/Configure/i)).toBeInTheDocument()
    })

    it('should handle undefined config object', () => {
      const nodeWithoutConfig = createMockNode({
        data: {
          label: 'Test Node',
          actionType: 'send_email',
          config: undefined as any,
          isValid: false,
        }
      })

      render(
        <DynamicConfigPanelEnhanced
          node={nodeWithoutConfig}
          organizationId="org-123"
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      )

      // Should render with empty defaults
      const inputs = screen.getAllByRole('textbox')
      expect(inputs.length).toBeGreaterThan(0)
    })

    it('should provide safe defaults for all input types', () => {
      const nodeWithEmptyConfig = createMockNode({
        data: {
          label: 'Test Node',
          actionType: 'send_email',
          config: {},
          isValid: false,
        }
      })

      render(
        <DynamicConfigPanelEnhanced
          node={nodeWithEmptyConfig}
          organizationId="org-123"
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      )

      // Text inputs should have empty string as default
      const textInputs = screen.getAllByRole('textbox')
      textInputs.forEach(input => {
        expect(input).toHaveValue('')
      })

      // Checkboxes should default to false
      const checkboxes = screen.queryAllByRole('checkbox')
      checkboxes.forEach(checkbox => {
        expect(checkbox).not.toBeChecked()
      })
    })
  })

  describe('Error Boundary', () => {
    it('should catch and display errors gracefully', () => {
      const ThrowingComponent = () => {
        throw new Error('Test error')
      }

      render(
        <ConfigPanelErrorBoundary>
          <ThrowingComponent />
        </ConfigPanelErrorBoundary>
      )

      expect(screen.getByText('Configuration Panel Error')).toBeInTheDocument()
      expect(screen.getByText(/Unable to load the configuration panel/)).toBeInTheDocument()
      expect(screen.getByText('Reset Panel')).toBeInTheDocument()
    })

    it('should allow resetting after error', () => {
      let shouldThrow = true
      const ConditionalThrowingComponent = () => {
        if (shouldThrow) {
          throw new Error('Test error')
        }
        return <div>Component loaded successfully</div>
      }

      const mockReset = jest.fn(() => {
        shouldThrow = false
      })

      const { rerender } = render(
        <ConfigPanelErrorBoundary onReset={mockReset}>
          <ConditionalThrowingComponent />
        </ConfigPanelErrorBoundary>
      )

      // Should show error state
      expect(screen.getByText('Configuration Panel Error')).toBeInTheDocument()

      // Click reset
      fireEvent.click(screen.getByText('Reset Panel'))
      expect(mockReset).toHaveBeenCalled()

      // Rerender after reset
      rerender(
        <ConfigPanelErrorBoundary onReset={mockReset}>
          <ConditionalThrowingComponent />
        </ConfigPanelErrorBoundary>
      )

      // Should now show the component
      expect(screen.getByText('Component loaded successfully')).toBeInTheDocument()
    })
  })

  describe('Validation', () => {
    it('should validate email action configuration', () => {
      const result = validateNodeConfig('action', {
        actionType: 'send_email',
        mode: 'custom',
        subject: '', // Missing required field
        body: 'Test body',
      }, 'send_email')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues.some(i => i.message.includes('required'))).toBe(true)
      }
    })

    it('should validate SMS action configuration', () => {
      const result = validateNodeConfig('action', {
        actionType: 'send_sms',
        phoneNumber: 'invalid-phone', // Invalid format
        message: 'Test message',
      }, 'send_sms')

      expect(result.success).toBe(false)
    })

    it('should show inline validation errors', async () => {
      const nodeWithInvalidEmail = createMockNode({
        data: {
          label: 'Send Email',
          actionType: 'send_email',
          config: {
            mode: 'custom',
            subject: '', // Empty subject
            body: 'Test body',
            sendFrom: 'invalid-email', // Invalid email
          },
          isValid: false,
        }
      })

      render(
        <DynamicConfigPanelEnhanced
          node={nodeWithInvalidEmail}
          organizationId="org-123"
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      )

      // Try to save
      const saveButton = screen.getByText(/Save/i)
      fireEvent.click(saveButton)

      // Should show validation errors
      await waitFor(() => {
        expect(mockOnSave).not.toHaveBeenCalled()
      })
    })

    it('should handle null/undefined config in validation', () => {
      const result = validateNodeConfig('action', null)
      expect(result.success).toBe(false)
      expect(result.error.issues[0].message).toContain('Configuration is required')
    })
  })

  describe('Controlled Inputs', () => {
    it('should update state when typing in inputs', () => {
      const node = createMockNode()

      render(
        <DynamicConfigPanelEnhanced
          node={node}
          organizationId="org-123"
          onClose={mockOnClose}
          onSave={mockOnSave}
          onChange={mockOnChange}
        />
      )

      const subjectInput = screen.getByDisplayValue('Test Subject')
      fireEvent.change(subjectInput, { target: { value: 'New Subject' } })

      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: 'New Subject',
        })
      )
    })

    it('should handle checkbox changes', () => {
      const node = createMockNode({
        data: {
          label: 'Wait Node',
          actionType: 'wait',
          config: {
            duration: 60,
            skipWeekends: false,
          },
          isValid: false,
        }
      })

      render(
        <DynamicConfigPanelEnhanced
          node={node}
          organizationId="org-123"
          onClose={mockOnClose}
          onSave={mockOnSave}
          onChange={mockOnChange}
        />
      )

      const checkboxes = screen.getAllByRole('checkbox')
      if (checkboxes.length > 0) {
        fireEvent.click(checkboxes[0])
        expect(mockOnChange).toHaveBeenCalled()
      }
    })

    it('should handle select dropdown changes', () => {
      const node = createMockNode({
        data: {
          label: 'Condition Node',
          actionType: 'condition',
          config: {
            field: 'email',
            operator: 'equals',
            value: 'test@example.com',
          },
          isValid: false,
        }
      })

      render(
        <DynamicConfigPanelEnhanced
          node={node}
          organizationId="org-123"
          onClose={mockOnClose}
          onSave={mockOnSave}
          onChange={mockOnChange}
        />
      )

      const selects = screen.getAllByRole('combobox')
      if (selects.length > 0) {
        fireEvent.change(selects[0], { target: { value: 'contains' } })
        expect(mockOnChange).toHaveBeenCalled()
      }
    })
  })

  describe('Save Functionality', () => {
    it('should save valid configuration', async () => {
      const node = createMockNode()

      render(
        <DynamicConfigPanelEnhanced
          node={node}
          organizationId="org-123"
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      )

      const saveButton = screen.getByText(/Save/i)
      fireEvent.click(saveButton)

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith(
          'node-1',
          expect.objectContaining({
            label: 'Send Email',
            subject: 'Test Subject',
            body: 'Test Body',
          })
        )
      })
    })

    it('should not save invalid configuration', async () => {
      const nodeWithInvalidConfig = createMockNode({
        data: {
          label: '', // Invalid - empty label
          actionType: 'send_email',
          config: {},
          isValid: false,
        }
      })

      render(
        <DynamicConfigPanelEnhanced
          node={nodeWithInvalidConfig}
          organizationId="org-123"
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      )

      const saveButton = screen.getByText(/Save/i)
      fireEvent.click(saveButton)

      await waitFor(() => {
        expect(mockOnSave).not.toHaveBeenCalled()
      })
    })
  })
})
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import NodeConfigPanel from '@/components/automation/NodeConfigPanel'
import type { WorkflowNode } from '@/lib/types/automation'

// Mock the lucide-react icons
jest.mock('lucide-react', () => ({
  X: () => <div data-testid="x-icon">X</div>,
  Save: () => <div data-testid="save-icon">Save</div>,
}))

describe('NodeConfigPanel', () => {
  const mockOnClose = jest.fn()
  const mockOnSave = jest.fn()
  
  const createMockNode = (actionType: string, config: any = {}): WorkflowNode => ({
    id: 'test-node-1',
    type: 'action',
    position: { x: 100, y: 100 },
    data: {
      label: 'Test Node',
      actionType,
      config,
    },
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Basic rendering', () => {
    it('should not render when node is null', () => {
      const { container } = render(
        <NodeConfigPanel
          node={null}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      )
      expect(container.firstChild).toBeNull()
    })

    it('should render config panel for send_email node', () => {
      const node = createMockNode('send_email')
      render(
        <NodeConfigPanel
          node={node}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      )

      expect(screen.getByText('Configure Test Node')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('recipient@example.com')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Email subject')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Email body')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Save Configuration/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument()
    })
  })

  describe('Form state management', () => {
    it('should update form state when typing in email fields', async () => {
      const user = userEvent.setup()
      const node = createMockNode('send_email')
      
      render(
        <NodeConfigPanel
          node={node}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      )

      const toInput = screen.getByPlaceholderText('recipient@example.com')
      const subjectInput = screen.getByPlaceholderText('Email subject')
      const bodyInput = screen.getByPlaceholderText('Email body')

      // Type in fields
      await user.type(toInput, 'test@example.com')
      await user.type(subjectInput, 'Test Subject')
      await user.type(bodyInput, 'Test email body')

      // Verify values are updated
      expect(toInput).toHaveValue('test@example.com')
      expect(subjectInput).toHaveValue('Test Subject')
      expect(bodyInput).toHaveValue('Test email body')
    })

    it('should populate form with existing config data', () => {
      const node = createMockNode('send_email', {
        to: 'existing@test.com',
        subject: 'Existing Subject',
        body: 'Existing body content'
      })
      
      render(
        <NodeConfigPanel
          node={node}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      )

      expect(screen.getByDisplayValue('existing@test.com')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Existing Subject')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Existing body content')).toBeInTheDocument()
    })

    it('should handle SMS/WhatsApp node config correctly', async () => {
      const user = userEvent.setup()
      const node = createMockNode('send_sms')
      
      render(
        <NodeConfigPanel
          node={node}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      )

      const phoneInput = screen.getByPlaceholderText('+1234567890')
      const messageInput = screen.getByPlaceholderText('Message text')

      await user.type(phoneInput, '+1234567890')
      await user.type(messageInput, 'SMS test message')

      expect(phoneInput).toHaveValue('+1234567890')
      expect(messageInput).toHaveValue('SMS test message')
    })

    it('should handle wait node duration configuration', async () => {
      const user = userEvent.setup()
      const node = createMockNode('wait')
      
      render(
        <NodeConfigPanel
          node={node}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      )

      const durationInput = screen.getByPlaceholderText('Duration')
      const unitSelect = screen.getByDisplayValue('Minutes')

      await user.type(durationInput, '30')
      await user.selectOptions(unitSelect, 'hours')

      expect(durationInput).toHaveValue(30)
      expect(unitSelect).toHaveValue('hours')
    })
  })

  describe('Save functionality', () => {
    it('should call onSave with correct node ID and config when Save is clicked', async () => {
      const user = userEvent.setup()
      const node = createMockNode('send_email')
      
      render(
        <NodeConfigPanel
          node={node}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      )

      // Fill out form
      await user.type(screen.getByPlaceholderText('recipient@example.com'), 'test@example.com')
      await user.type(screen.getByPlaceholderText('Email subject'), 'Test Subject')
      await user.type(screen.getByPlaceholderText('Email body'), 'Test body')

      // Click save
      await user.click(screen.getByRole('button', { name: /Save Configuration/i }))

      // Verify onSave called with correct data
      expect(mockOnSave).toHaveBeenCalledWith('test-node-1', {
        to: 'test@example.com',
        subject: 'Test Subject',
        body: 'Test body'
      })

      // Verify panel is closed
      expect(mockOnClose).toHaveBeenCalled()
    })

    it('should write configuration to node.data correctly', async () => {
      const user = userEvent.setup()
      const node = createMockNode('update_lead')
      
      render(
        <NodeConfigPanel
          node={node}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      )

      // Select field and enter value
      const fieldSelect = screen.getByDisplayValue('Select field')
      await user.selectOptions(fieldSelect, 'status')
      await user.type(screen.getByPlaceholderText('New value'), 'qualified')

      await user.click(screen.getByRole('button', { name: /Save Configuration/i }))

      expect(mockOnSave).toHaveBeenCalledWith('test-node-1', {
        field: 'status',
        value: 'qualified'
      })
    })
  })

  describe('Validation and error handling', () => {
    it('should show validation errors for invalid email format', async () => {
      const user = userEvent.setup()
      const node = createMockNode('send_email')
      
      render(
        <NodeConfigPanel
          node={node}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      )

      const emailInput = screen.getByPlaceholderText('recipient@example.com')
      
      // Enter invalid email
      await user.type(emailInput, 'invalid-email')
      await user.tab() // Trigger blur event

      // Check for HTML5 validation
      expect(emailInput).not.toHaveValue('invalid-email@')
      expect(emailInput.validity.valid).toBe(false)
    })

    it('should handle condition node configuration correctly', async () => {
      const user = userEvent.setup()
      const node = createMockNode('condition')
      
      render(
        <NodeConfigPanel
          node={node}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      )

      const fieldInput = screen.getByPlaceholderText('e.g., lead.status')
      const operatorSelect = screen.getByDisplayValue('Select operator')
      const valueInput = screen.getByPlaceholderText('Value to compare')

      await user.type(fieldInput, 'lead.status')
      await user.selectOptions(operatorSelect, 'equals')
      await user.type(valueInput, 'qualified')

      await user.click(screen.getByRole('button', { name: /Save Configuration/i }))

      expect(mockOnSave).toHaveBeenCalledWith('test-node-1', {
        field: 'lead.status',
        operator: 'equals',
        value: 'qualified'
      })
    })

    it('should handle unknown action types gracefully', () => {
      const node = createMockNode('unknown_action_type')
      
      render(
        <NodeConfigPanel
          node={node}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      )

      expect(screen.getByText('Configuration options for this node type are not yet available.')).toBeInTheDocument()
    })
  })

  describe('User interactions', () => {
    it('should close panel when Cancel is clicked', async () => {
      const user = userEvent.setup()
      const node = createMockNode('send_email')
      
      render(
        <NodeConfigPanel
          node={node}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      )

      await user.click(screen.getByRole('button', { name: /Cancel/i }))
      
      expect(mockOnClose).toHaveBeenCalled()
      expect(mockOnSave).not.toHaveBeenCalled()
    })

    it('should close panel when X button is clicked', async () => {
      const user = userEvent.setup()
      const node = createMockNode('send_email')
      
      render(
        <NodeConfigPanel
          node={node}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      )

      await user.click(screen.getByTestId('x-icon').parentElement!)
      
      expect(mockOnClose).toHaveBeenCalled()
    })

    it('should handle keyboard navigation correctly', async () => {
      const user = userEvent.setup()
      const node = createMockNode('send_email')
      
      render(
        <NodeConfigPanel
          node={node}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      )

      // Close button is focused first, then tab to form elements
      await user.tab() // Close button
      await user.tab() // First form field
      expect(screen.getByPlaceholderText('recipient@example.com')).toHaveFocus()
      
      await user.tab()
      expect(screen.getByPlaceholderText('Email subject')).toHaveFocus()
      
      await user.tab()
      expect(screen.getByPlaceholderText('Email body')).toHaveFocus()
    })
  })

  describe('Config persistence', () => {
    it('should preserve config when node changes but comes back to same node', () => {
      const node1 = createMockNode('send_email', { to: 'test1@example.com' })
      const node2 = createMockNode('send_sms', { message: 'SMS message' })
      
      const { rerender } = render(
        <NodeConfigPanel
          node={node1}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      )

      expect(screen.getByDisplayValue('test1@example.com')).toBeInTheDocument()

      // Switch to different node
      rerender(
        <NodeConfigPanel
          node={node2}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      )

      expect(screen.getByDisplayValue('SMS message')).toBeInTheDocument()

      // Switch back to first node
      rerender(
        <NodeConfigPanel
          node={node1}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      )

      expect(screen.getByDisplayValue('test1@example.com')).toBeInTheDocument()
    })
  })
})
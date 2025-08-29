/**
 * @jest-environment jsdom
 */
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'

// Mock Config Panel Component for testing
interface ConfigPanelProps {
  nodeType: string
  config: any
  onConfigChange: (config: any) => void
  onSave: () => void
  onCancel: () => void
}

const MockConfigPanel: React.FC<ConfigPanelProps> = ({ 
  nodeType, 
  config, 
  onConfigChange, 
  onSave, 
  onCancel 
}) => {
  const handleInputChange = (field: string, value: any) => {
    onConfigChange({ ...config, [field]: value })
  }

  return (
    <div data-testid="config-panel">
      <h3>Configure {nodeType}</h3>
      
      {nodeType === 'send_email' && (
        <>
          <input
            data-testid="email-to"
            type="email"
            placeholder="recipient@example.com"
            value={config.to || ''}
            onChange={(e) => handleInputChange('to', e.target.value)}
          />
          <input
            data-testid="email-subject"
            type="text"
            placeholder="Email subject"
            value={config.subject || ''}
            onChange={(e) => handleInputChange('subject', e.target.value)}
          />
          <textarea
            data-testid="email-body"
            placeholder="Email body"
            value={config.body || ''}
            onChange={(e) => handleInputChange('body', e.target.value)}
          />
        </>
      )}

      {nodeType === 'send_sms' && (
        <>
          <input
            data-testid="sms-to"
            type="tel"
            placeholder="+1234567890"
            value={config.to || ''}
            onChange={(e) => handleInputChange('to', e.target.value)}
          />
          <textarea
            data-testid="sms-message"
            placeholder="Message text"
            value={config.message || ''}
            onChange={(e) => handleInputChange('message', e.target.value)}
          />
        </>
      )}

      {nodeType === 'condition' && (
        <>
          <input
            data-testid="condition-field"
            type="text"
            placeholder="e.g., lead.status"
            value={config.field || ''}
            onChange={(e) => handleInputChange('field', e.target.value)}
          />
          <select
            data-testid="condition-operator"
            value={config.operator || ''}
            onChange={(e) => handleInputChange('operator', e.target.value)}
          >
            <option value="">Select operator</option>
            <option value="equals">Equals</option>
            <option value="not_equals">Not Equals</option>
            <option value="contains">Contains</option>
          </select>
          <input
            data-testid="condition-value"
            type="text"
            placeholder="Value to compare"
            value={config.value || ''}
            onChange={(e) => handleInputChange('value', e.target.value)}
          />
        </>
      )}

      <button data-testid="save-button" onClick={onSave}>
        Save Configuration
      </button>
      <button data-testid="cancel-button" onClick={onCancel}>
        Cancel
      </button>
    </div>
  )
}

describe('Config Panel - Input Field Functionality', () => {
  const mockOnConfigChange = jest.fn()
  const mockOnSave = jest.fn()
  const mockOnCancel = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Email Configuration', () => {
    it('should render editable email inputs', () => {
      const config = {
        to: 'test@example.com',
        subject: 'Test Subject',
        body: 'Test Body'
      }

      render(
        <MockConfigPanel
          nodeType="send_email"
          config={config}
          onConfigChange={mockOnConfigChange}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      )

      expect(screen.getByDisplayValue('test@example.com')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Test Subject')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Test Body')).toBeInTheDocument()
    })

    it('should update email inputs immediately when changed', () => {
      const config = { to: '', subject: '', body: '' }

      render(
        <MockConfigPanel
          nodeType="send_email"
          config={config}
          onConfigChange={mockOnConfigChange}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      )

      const toInput = screen.getByTestId('email-to')
      const subjectInput = screen.getByTestId('email-subject')
      const bodyTextarea = screen.getByTestId('email-body')

      fireEvent.change(toInput, { target: { value: 'new@example.com' } })
      fireEvent.change(subjectInput, { target: { value: 'New Subject' } })
      fireEvent.change(bodyTextarea, { target: { value: 'New Body' } })

      expect(mockOnConfigChange).toHaveBeenCalledWith({
        to: 'new@example.com',
        subject: '',
        body: ''
      })
      expect(mockOnConfigChange).toHaveBeenCalledWith({
        to: '',
        subject: 'New Subject',
        body: ''
      })
      expect(mockOnConfigChange).toHaveBeenCalledWith({
        to: '',
        subject: '',
        body: 'New Body'
      })
    })

    it('should validate email field type', () => {
      render(
        <MockConfigPanel
          nodeType="send_email"
          config={{}}
          onConfigChange={mockOnConfigChange}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      )

      const emailInput = screen.getByTestId('email-to')
      expect(emailInput).toHaveAttribute('type', 'email')
    })
  })

  describe('SMS Configuration', () => {
    it('should render editable SMS inputs', () => {
      const config = {
        to: '+1234567890',
        message: 'Test SMS message'
      }

      render(
        <MockConfigPanel
          nodeType="send_sms"
          config={config}
          onConfigChange={mockOnConfigChange}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      )

      expect(screen.getByDisplayValue('+1234567890')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Test SMS message')).toBeInTheDocument()
    })

    it('should validate phone field type', () => {
      render(
        <MockConfigPanel
          nodeType="send_sms"
          config={{}}
          onConfigChange={mockOnConfigChange}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      )

      const phoneInput = screen.getByTestId('sms-to')
      expect(phoneInput).toHaveAttribute('type', 'tel')
    })
  })

  describe('Condition Configuration', () => {
    it('should render condition fields with dropdown', () => {
      const config = {
        field: 'lead.status',
        operator: 'equals',
        value: 'new'
      }

      render(
        <MockConfigPanel
          nodeType="condition"
          config={config}
          onConfigChange={mockOnConfigChange}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      )

      expect(screen.getByDisplayValue('lead.status')).toBeInTheDocument()
      expect(screen.getByRole('combobox')).toHaveValue('equals')
      expect(screen.getByDisplayValue('new')).toBeInTheDocument()
    })

    it('should include operator options in dropdown', () => {
      render(
        <MockConfigPanel
          nodeType="condition"
          config={{}}
          onConfigChange={mockOnConfigChange}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      )

      const select = screen.getByTestId('condition-operator')
      expect(select).toContainHTML('<option value="equals">Equals</option>')
      expect(select).toContainHTML('<option value="not_equals">Not Equals</option>')
      expect(select).toContainHTML('<option value="contains">Contains</option>')
    })
  })

  describe('Save and Cancel Functionality', () => {
    it('should call save handler when save button is clicked', () => {
      render(
        <MockConfigPanel
          nodeType="send_email"
          config={{}}
          onConfigChange={mockOnConfigChange}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      )

      const saveButton = screen.getByTestId('save-button')
      fireEvent.click(saveButton)

      expect(mockOnSave).toHaveBeenCalledTimes(1)
    })

    it('should call cancel handler when cancel button is clicked', () => {
      render(
        <MockConfigPanel
          nodeType="send_email"
          config={{}}
          onConfigChange={mockOnConfigChange}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      )

      const cancelButton = screen.getByTestId('cancel-button')
      fireEvent.click(cancelButton)

      expect(mockOnCancel).toHaveBeenCalledTimes(1)
    })

    it('should not save when cancel is clicked', () => {
      render(
        <MockConfigPanel
          nodeType="send_email"
          config={{}}
          onConfigChange={mockOnConfigChange}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      )

      const cancelButton = screen.getByTestId('cancel-button')
      fireEvent.click(cancelButton)

      expect(mockOnSave).not.toHaveBeenCalled()
      expect(mockOnCancel).toHaveBeenCalledTimes(1)
    })
  })

  describe('Configuration Persistence', () => {
    it('should maintain configuration state during updates', () => {
      const initialConfig = { to: 'initial@example.com', subject: 'Initial' }
      
      const { rerender } = render(
        <MockConfigPanel
          nodeType="send_email"
          config={initialConfig}
          onConfigChange={mockOnConfigChange}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      )

      // Update configuration
      const updatedConfig = { to: 'updated@example.com', subject: 'Updated' }
      
      rerender(
        <MockConfigPanel
          nodeType="send_email"
          config={updatedConfig}
          onConfigChange={mockOnConfigChange}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      )

      expect(screen.getByDisplayValue('updated@example.com')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Updated')).toBeInTheDocument()
    })

    it('should handle empty configurations gracefully', () => {
      render(
        <MockConfigPanel
          nodeType="send_email"
          config={{}}
          onConfigChange={mockOnConfigChange}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      )

      const inputs = screen.getAllByRole('textbox')
      inputs.forEach(input => {
        expect(input).toHaveValue('')
      })
    })
  })

  describe('Input Validation and Requirements', () => {
    it('should show required field placeholders', () => {
      render(
        <MockConfigPanel
          nodeType="send_email"
          config={{}}
          onConfigChange={mockOnConfigChange}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      )

      expect(screen.getByPlaceholderText('recipient@example.com')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Email subject')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Email body')).toBeInTheDocument()
    })

    it('should handle different node types appropriately', () => {
      const nodeTypes = ['send_email', 'send_sms', 'condition']
      
      nodeTypes.forEach(nodeType => {
        const { unmount } = render(
          <MockConfigPanel
            nodeType={nodeType}
            config={{}}
            onConfigChange={mockOnConfigChange}
            onSave={mockOnSave}
            onCancel={mockOnCancel}
          />
        )

        expect(screen.getByText(`Configure ${nodeType}`)).toBeInTheDocument()
        
        unmount()
      })
    })
  })
})
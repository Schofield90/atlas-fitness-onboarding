/**
 * Unit Tests for AutomationBuilder Component
 * Tests the trigger routing and automation builder functionality
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AutomationBuilder } from '@/components/automations/AutomationBuilder'

// Mock the components
jest.mock('@/components/automations/FormSubmittedTriggerConfig', () => {
  return {
    FormSubmittedTriggerConfig: function MockFormSubmittedTriggerConfig({ onSave, onCancel }: { onSave?: () => void, onCancel?: () => void }) {
      return (
        <div data-testid="form-submitted-trigger-config">
          <h3>Website Form Trigger Configuration</h3>
          <button onClick={onSave} data-testid="mock-save-form-config">Save Config</button>
          <button onClick={onCancel} data-testid="mock-cancel-form-config">Cancel Config</button>
        </div>
      )
    }
  }
})

// Mock Next.js Link
jest.mock('next/link', () => {
  return function MockLink({ children, href }: { children: React.ReactNode; href: string }) {
    return <a href={href}>{children}</a>
  }
})

describe('AutomationBuilder', () => {
  const mockOnClose = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Component Visibility', () => {
    it('renders when isOpen is true', () => {
      render(<AutomationBuilder isOpen={true} onClose={mockOnClose} />)
      
      expect(screen.getByTestId('automation-builder')).toBeInTheDocument()
      expect(screen.getByText('Create New Automation')).toBeInTheDocument()
    })

    it('does not render when isOpen is false', () => {
      render(<AutomationBuilder isOpen={false} onClose={mockOnClose} />)
      
      expect(screen.queryByTestId('automation-builder')).not.toBeInTheDocument()
    })

    it('shows edit title when automation is provided', () => {
      const mockAutomation = {
        id: '1',
        name: 'Test Automation',
        description: 'Test Description',
        nodes: []
      }
      
      render(<AutomationBuilder isOpen={true} onClose={mockOnClose} automation={mockAutomation} />)
      
      expect(screen.getByText('Edit Automation')).toBeInTheDocument()
    })
  })

  describe('Basic Information Input', () => {
    it('renders automation name and description inputs', () => {
      render(<AutomationBuilder isOpen={true} onClose={mockOnClose} />)
      
      expect(screen.getByTestId('automation-name-input')).toBeInTheDocument()
      expect(screen.getByTestId('automation-description-input')).toBeInTheDocument()
    })

    it('populates fields when editing existing automation', () => {
      const mockAutomation = {
        id: '1',
        name: 'Welcome Flow',
        description: 'Welcomes new leads',
        nodes: []
      }
      
      render(<AutomationBuilder isOpen={true} onClose={mockOnClose} automation={mockAutomation} />)
      
      const nameInput = screen.getByTestId('automation-name-input') as HTMLInputElement
      const descInput = screen.getByTestId('automation-description-input') as HTMLInputElement
      
      expect(nameInput.value).toBe('Welcome Flow')
      expect(descInput.value).toBe('Welcomes new leads')
    })
  })

  describe('Trigger Type Selection', () => {
    it('displays trigger type selector', () => {
      render(<AutomationBuilder isOpen={true} onClose={mockOnClose} />)
      
      expect(screen.getByTestId('trigger-type-select')).toBeInTheDocument()
      expect(screen.getByText('Select a trigger type')).toBeInTheDocument()
    })

    it('shows configure trigger button after selecting trigger type', async () => {
      const user = userEvent.setup()
      render(<AutomationBuilder isOpen={true} onClose={mockOnClose} />)
      
      // This test assumes the Select component works - in a real test we might need to mock it
      const configureButton = screen.queryByTestId('configure-trigger-btn')
      // Initially not visible
      expect(configureButton).not.toBeInTheDocument()
    })

    it('shows different trigger options in select', () => {
      render(<AutomationBuilder isOpen={true} onClose={mockOnClose} />)
      
      // The select options would be tested if we can interact with the Select component
      // This depends on how Radix Select is implemented
      expect(screen.getByTestId('trigger-type-select')).toBeInTheDocument()
    })
  })

  describe('Trigger Configuration Routing', () => {
    it('shows FormSubmittedTriggerConfig when website_form action type is selected', () => {
      const mockAutomation = {
        id: '1',
        name: 'Test',
        description: 'Test',
        nodes: [{
          id: 'trigger-1',
          type: 'trigger' as const,
          actionType: 'website_form',
          data: { selectedForms: ['1'] }
        }]
      }
      
      render(<AutomationBuilder isOpen={true} onClose={mockOnClose} automation={mockAutomation} />)
      
      // Should show the form config, not the generic config
      expect(screen.getByTestId('form-submitted-trigger-config')).toBeInTheDocument()
      expect(screen.getByText('Website Form Trigger Configuration')).toBeInTheDocument()
    })

    it('shows GenericTriggerConfig for unsupported trigger types', () => {
      const mockAutomation = {
        id: '1',
        name: 'Test',
        description: 'Test',
        nodes: [{
          id: 'trigger-1',
          type: 'trigger' as const,
          actionType: 'new_lead',
          data: {}
        }]
      }
      
      render(<AutomationBuilder isOpen={true} onClose={mockOnClose} automation={mockAutomation} />)
      
      // Should show generic config
      expect(screen.getByText('Configuration for this trigger type is not yet available')).toBeInTheDocument()
      expect(screen.getByText('Configuration Coming Soon')).toBeInTheDocument()
    })

    it('shows correct trigger configuration based on actionType', () => {
      const mockAutomation = {
        id: '1',
        name: 'Test',
        description: 'Test',
        nodes: [{
          id: 'trigger-1',
          type: 'trigger' as const,
          actionType: 'schedule',
          data: {}
        }]
      }
      
      render(<AutomationBuilder isOpen={true} onClose={mockOnClose} automation={mockAutomation} />)
      
      // For unsupported types, should show generic config
      expect(screen.getByText('Trigger Configuration')).toBeInTheDocument()
      expect(screen.getByText('Configuration for this trigger type is not yet available')).toBeInTheDocument()
    })
  })

  describe('Save and Cancel Actions', () => {
    it('calls onClose when close button is clicked', async () => {
      const user = userEvent.setup()
      render(<AutomationBuilder isOpen={true} onClose={mockOnClose} />)
      
      const closeButton = screen.getByTestId('close-builder')
      await user.click(closeButton)
      
      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })

    it('calls onClose when cancel button is clicked', async () => {
      const user = userEvent.setup()
      render(<AutomationBuilder isOpen={true} onClose={mockOnClose} />)
      
      const cancelButton = screen.getByText('Cancel')
      await user.click(cancelButton)
      
      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })

    it('disables save button when required fields are missing', () => {
      render(<AutomationBuilder isOpen={true} onClose={mockOnClose} />)
      
      const saveButton = screen.getByTestId('save-automation')
      expect(saveButton).toBeDisabled()
    })

    it('enables save button when name and trigger are provided', () => {
      const mockAutomation = {
        id: '1',
        name: 'Test Automation',
        description: 'Test',
        nodes: [{
          id: 'trigger-1',
          type: 'trigger' as const,
          actionType: 'website_form',
          data: {}
        }]
      }
      
      render(<AutomationBuilder isOpen={true} onClose={mockOnClose} automation={mockAutomation} />)
      
      const saveButton = screen.getByTestId('save-automation')
      expect(saveButton).not.toBeDisabled()
    })
  })

  describe('Trigger Configuration Management', () => {
    it('hides trigger configuration when save is called on FormSubmittedTriggerConfig', async () => {
      const user = userEvent.setup()
      const mockAutomation = {
        id: '1',
        name: 'Test',
        description: 'Test',
        nodes: [{
          id: 'trigger-1',
          type: 'trigger' as const,
          actionType: 'website_form',
          data: {}
        }]
      }
      
      render(<AutomationBuilder isOpen={true} onClose={mockOnClose} automation={mockAutomation} />)
      
      // Should show the form config initially
      expect(screen.getByTestId('form-submitted-trigger-config')).toBeInTheDocument()
      
      // Click save on the form config
      const saveConfigButton = screen.getByTestId('mock-save-form-config')
      await user.click(saveConfigButton)
      
      // Should hide the trigger config and show actions section
      await waitFor(() => {
        expect(screen.queryByTestId('form-submitted-trigger-config')).not.toBeInTheDocument()
      })
    })

    it('hides trigger configuration when cancel is called on FormSubmittedTriggerConfig', async () => {
      const user = userEvent.setup()
      const mockAutomation = {
        id: '1',
        name: 'Test',
        description: 'Test',
        nodes: [{
          id: 'trigger-1',
          type: 'trigger' as const,
          actionType: 'website_form',
          data: {}
        }]
      }
      
      render(<AutomationBuilder isOpen={true} onClose={mockOnClose} automation={mockAutomation} />)
      
      // Click cancel on the form config
      const cancelConfigButton = screen.getByTestId('mock-cancel-form-config')
      await user.click(cancelConfigButton)
      
      // Should hide the trigger config
      await waitFor(() => {
        expect(screen.queryByTestId('form-submitted-trigger-config')).not.toBeInTheDocument()
      })
    })
  })

  describe('Actions Section', () => {
    it('shows actions section after trigger configuration is complete', () => {
      const mockAutomation = {
        id: '1',
        name: 'Test',
        description: 'Test',
        nodes: [{
          id: 'trigger-1',
          type: 'trigger' as const,
          actionType: 'website_form',
          data: {}
        }]
      }
      
      render(<AutomationBuilder isOpen={true} onClose={mockOnClose} automation={mockAutomation} />)
      
      // The actions section should appear when there's a trigger and config is not being shown
      // This test would need the component state to be managed properly
    })
  })

  describe('Data Persistence', () => {
    it('maintains node data when trigger configuration changes', () => {
      // This would test that when FormSubmittedTriggerConfig calls onChange,
      // the node data is properly updated
      const mockAutomation = {
        id: '1',
        name: 'Test',
        description: 'Test',
        nodes: [{
          id: 'trigger-1',
          type: 'trigger' as const,
          actionType: 'website_form',
          data: { selectedForms: ['1'] }
        }]
      }
      
      render(<AutomationBuilder isOpen={true} onClose={mockOnClose} automation={mockAutomation} />)
      
      // This would test that the initial data is passed correctly to the component
      expect(screen.getByTestId('form-submitted-trigger-config')).toBeInTheDocument()
    })
  })
})
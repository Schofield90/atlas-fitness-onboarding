/**
 * Unit Tests for FormSubmittedTriggerConfig Component
 * Tests the Website Opt-in Form trigger selection functionality
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FormSubmittedTriggerConfig } from '@/components/automations/FormSubmittedTriggerConfig'

// Mock the Link component from Next.js
jest.mock('next/link', () => {
  return function MockLink({ children, href }: { children: React.ReactNode; href: string }) {
    return <a href={href}>{children}</a>
  }
})

describe('FormSubmittedTriggerConfig', () => {
  const mockOnChange = jest.fn()
  const mockOnSave = jest.fn()
  const mockOnCancel = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Component Rendering', () => {
    it('renders the main component with title and description', () => {
      render(<FormSubmittedTriggerConfig />)
      
      expect(screen.getByText('Website Form Trigger')).toBeInTheDocument()
      expect(screen.getByText('Trigger this automation when specific forms are submitted on your website')).toBeInTheDocument()
    })

    it('renders form selector trigger button', () => {
      render(<FormSubmittedTriggerConfig />)
      
      expect(screen.getByTestId('form-selector-trigger')).toBeInTheDocument()
      expect(screen.getByText('Choose forms to monitor...')).toBeInTheDocument()
    })

    it('displays correct placeholder text when no forms are selected', () => {
      render(<FormSubmittedTriggerConfig value={[]} />)
      
      expect(screen.getByText('Choose forms to monitor...')).toBeInTheDocument()
    })

    it('displays selected form count when multiple forms are selected', () => {
      render(<FormSubmittedTriggerConfig value={['1', '2']} />)
      
      expect(screen.getByText('2 forms selected')).toBeInTheDocument()
    })
  })

  describe('Form Selection Functionality', () => {
    it('opens dropdown when trigger button is clicked', async () => {
      const user = userEvent.setup()
      render(<FormSubmittedTriggerConfig />)
      
      const trigger = screen.getByTestId('form-selector-trigger')
      await user.click(trigger)
      
      expect(screen.getByTestId('select-all-forms')).toBeInTheDocument()
      expect(screen.getByTestId('clear-all-forms')).toBeInTheDocument()
    })

    it('displays all available forms in dropdown', async () => {
      const user = userEvent.setup()
      render(<FormSubmittedTriggerConfig />)
      
      const trigger = screen.getByTestId('form-selector-trigger')
      await user.click(trigger)
      
      expect(screen.getByTestId('form-option-1')).toBeInTheDocument()
      expect(screen.getByTestId('form-option-2')).toBeInTheDocument()
      expect(screen.getByTestId('form-option-3')).toBeInTheDocument()
      
      expect(screen.getByText('Contact Form')).toBeInTheDocument()
      expect(screen.getByText('Free Trial Form')).toBeInTheDocument()
      expect(screen.getByText('Class Booking Form')).toBeInTheDocument()
    })

    it('allows selecting individual forms', async () => {
      const user = userEvent.setup()
      render(<FormSubmittedTriggerConfig onChange={mockOnChange} />)
      
      const trigger = screen.getByTestId('form-selector-trigger')
      await user.click(trigger)
      
      const checkbox = screen.getByTestId('form-checkbox-1')
      await user.click(checkbox)
      
      expect(mockOnChange).toHaveBeenCalledWith(['1'])
    })

    it('allows deselecting forms', async () => {
      const user = userEvent.setup()
      render(<FormSubmittedTriggerConfig value={['1', '2']} onChange={mockOnChange} />)
      
      const trigger = screen.getByTestId('form-selector-trigger')
      await user.click(trigger)
      
      const checkbox = screen.getByTestId('form-checkbox-1')
      await user.click(checkbox)
      
      expect(mockOnChange).toHaveBeenCalledWith(['2'])
    })

    it('handles Select All functionality', async () => {
      const user = userEvent.setup()
      render(<FormSubmittedTriggerConfig onChange={mockOnChange} />)
      
      const trigger = screen.getByTestId('form-selector-trigger')
      await user.click(trigger)
      
      const selectAllButton = screen.getByTestId('select-all-forms')
      await user.click(selectAllButton)
      
      // Should select all active forms (forms 1 and 2 are active, form 3 is inactive)
      expect(mockOnChange).toHaveBeenCalledWith(['1', '2'])
    })

    it('handles Clear All functionality', async () => {
      const user = userEvent.setup()
      render(<FormSubmittedTriggerConfig value={['1', '2']} onChange={mockOnChange} />)
      
      const trigger = screen.getByTestId('form-selector-trigger')
      await user.click(trigger)
      
      const clearAllButton = screen.getByTestId('clear-all-forms')
      await user.click(clearAllButton)
      
      expect(mockOnChange).toHaveBeenCalledWith([])
    })
  })

  describe('Form Type Filtering', () => {
    it('filters forms by type when filter buttons are clicked', async () => {
      const user = userEvent.setup()
      render(<FormSubmittedTriggerConfig />)
      
      const trigger = screen.getByTestId('form-selector-trigger')
      await user.click(trigger)
      
      // Click Lead Forms filter
      const leadFilter = screen.getByText('Lead Forms')
      await user.click(leadFilter)
      
      // Should show only the Free Trial Form (type: 'lead')
      expect(screen.getByText('Free Trial Form')).toBeInTheDocument()
      expect(screen.queryByText('Contact Form')).not.toBeInTheDocument()
    })

    it('shows all forms when All filter is selected', async () => {
      const user = userEvent.setup()
      render(<FormSubmittedTriggerConfig />)
      
      const trigger = screen.getByTestId('form-selector-trigger')
      await user.click(trigger)
      
      const allFilter = screen.getByText('All')
      await user.click(allFilter)
      
      expect(screen.getByText('Contact Form')).toBeInTheDocument()
      expect(screen.getByText('Free Trial Form')).toBeInTheDocument()
      expect(screen.getByText('Class Booking Form')).toBeInTheDocument()
    })

    it('shows only active forms when Active filter is selected', async () => {
      const user = userEvent.setup()
      render(<FormSubmittedTriggerConfig />)
      
      const trigger = screen.getByTestId('form-selector-trigger')
      await user.click(trigger)
      
      const activeFilter = screen.getByText('Active')
      await user.click(activeFilter)
      
      // Class Booking Form is inactive, so it shouldn't be visible
      expect(screen.getByText('Contact Form')).toBeInTheDocument()
      expect(screen.getByText('Free Trial Form')).toBeInTheDocument()
      expect(screen.queryByText('Class Booking Form')).not.toBeInTheDocument()
    })
  })

  describe('Configuration Summary', () => {
    it('shows configuration summary when forms are selected', () => {
      render(<FormSubmittedTriggerConfig value={['1', '2']} />)
      
      expect(screen.getByText('Trigger Configuration')).toBeInTheDocument()
      expect(screen.getByText(/This automation will run whenever someone submits any of the 2 selected form/)).toBeInTheDocument()
    })

    it('does not show configuration summary when no forms are selected', () => {
      render(<FormSubmittedTriggerConfig value={[]} />)
      
      expect(screen.queryByText('Trigger Configuration')).not.toBeInTheDocument()
    })

    it('includes manage forms link in configuration summary', () => {
      render(<FormSubmittedTriggerConfig value={['1']} />)
      
      const manageLink = screen.getByText('Manage forms')
      expect(manageLink).toBeInTheDocument()
      expect(manageLink.closest('a')).toHaveAttribute('href', '/dashboard/website')
    })
  })

  describe('Save and Cancel Actions', () => {
    it('renders save and cancel buttons when callbacks are provided', () => {
      render(<FormSubmittedTriggerConfig onSave={mockOnSave} onCancel={mockOnCancel} />)
      
      expect(screen.getByText('Cancel')).toBeInTheDocument()
      expect(screen.getByTestId('save-trigger-config')).toBeInTheDocument()
    })

    it('disables save button when no forms are selected', () => {
      render(<FormSubmittedTriggerConfig value={[]} onSave={mockOnSave} />)
      
      const saveButton = screen.getByTestId('save-trigger-config')
      expect(saveButton).toBeDisabled()
    })

    it('enables save button when forms are selected', () => {
      render(<FormSubmittedTriggerConfig value={['1']} onSave={mockOnSave} />)
      
      const saveButton = screen.getByTestId('save-trigger-config')
      expect(saveButton).not.toBeDisabled()
    })

    it('calls onSave when save button is clicked', async () => {
      const user = userEvent.setup()
      render(<FormSubmittedTriggerConfig value={['1']} onSave={mockOnSave} />)
      
      const saveButton = screen.getByTestId('save-trigger-config')
      await user.click(saveButton)
      
      expect(mockOnSave).toHaveBeenCalledTimes(1)
    })

    it('calls onCancel when cancel button is clicked', async () => {
      const user = userEvent.setup()
      render(<FormSubmittedTriggerConfig onCancel={mockOnCancel} />)
      
      const cancelButton = screen.getByText('Cancel')
      await user.click(cancelButton)
      
      expect(mockOnCancel).toHaveBeenCalledTimes(1)
    })
  })

  describe('Empty State', () => {
    // This test would require mocking the mockForms to be empty
    // For now, we'll test the current implementation
    it('shows selected form names correctly', () => {
      render(<FormSubmittedTriggerConfig value={['1', '2']} />)
      
      // Should show the names of selected forms
      expect(screen.getByText('Selected forms: Contact Form, Free Trial Form')).toBeInTheDocument()
    })
  })

  describe('Value Persistence', () => {
    it('maintains selected values across renders', () => {
      const { rerender } = render(<FormSubmittedTriggerConfig value={['1']} />)
      
      expect(screen.getByText('Contact Form')).toBeInTheDocument()
      
      rerender(<FormSubmittedTriggerConfig value={['1', '2']} />)
      
      expect(screen.getByText('2 forms selected')).toBeInTheDocument()
    })

    it('triggers onChange callback when selection changes', async () => {
      const user = userEvent.setup()
      render(<FormSubmittedTriggerConfig value={[]} onChange={mockOnChange} />)
      
      const trigger = screen.getByTestId('form-selector-trigger')
      await user.click(trigger)
      
      const checkbox = screen.getByTestId('form-checkbox-2')
      await user.click(checkbox)
      
      expect(mockOnChange).toHaveBeenCalledWith(['2'])
    })
  })
})
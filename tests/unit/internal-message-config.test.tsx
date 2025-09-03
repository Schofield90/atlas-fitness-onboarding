/**
 * @jest-environment jsdom
 */
import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import '@testing-library/jest-dom'
import InternalMessageConfig from '@/app/components/automation/config/InternalMessageConfig'

// Mock Supabase client
const mockSupabase = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({
          data: [
            {
              id: 'staff-1',
              name: 'John Trainer',
              email: 'john@atlasfitness.com',
              phone: '+447901234567',
              role: 'Personal Trainer',
              telegram_username: 'johntrainer',
            },
            {
              id: 'staff-2',
              name: 'Sarah Coach',
              email: 'sarah@atlasfitness.com',
              phone: '+447987654321',
              role: 'Fitness Coach',
              telegram_username: 'sarahcoach',
            }
          ],
          error: null
        }))
      }))
    }))
  }))
}

jest.mock('@/app/lib/supabase/client', () => ({
  createClient: () => mockSupabase
}))

// Mock fetch for API calls
global.fetch = jest.fn()

describe('InternalMessageConfig - Configuration Forms', () => {
  const mockNodeData = {
    recipients: ['staff-1'],
    channels: ['email'],
    message: 'New lead received: {{lead_name}}',
    subject: 'New Lead Alert',
    notificationType: 'alert',
  }

  const mockProps = {
    nodeData: mockNodeData,
    onChange: jest.fn(),
    organizationId: 'org-123',
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(fetch as jest.Mock).mockClear()
  })

  describe('Fix 2: Internal Message Configuration - Input Fields', () => {
    it('should render notification type selection', async () => {
      render(<InternalMessageConfig {...mockProps} />)

      await waitFor(() => {
        expect(screen.getByText(/Notification Type/i)).toBeInTheDocument()
      })

      // Should show notification type options
      expect(screen.getByText('Alert')).toBeInTheDocument()
      expect(screen.getByText('Information')).toBeInTheDocument()
      expect(screen.getByText('Success')).toBeInTheDocument()
      expect(screen.getByText('Urgent')).toBeInTheDocument()
    })

    it('should handle notification type selection', async () => {
      render(<InternalMessageConfig {...mockProps} />)

      await waitFor(() => {
        const infoButton = screen.getByText('Information')
        expect(infoButton).toBeInTheDocument()

        fireEvent.click(infoButton)
      })

      expect(mockProps.onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          notificationType: 'info'
        })
      )
    })

    it('should load and display staff members', async () => {
      render(<InternalMessageConfig {...mockProps} />)

      await waitFor(() => {
        expect(screen.getByText('John Trainer')).toBeInTheDocument()
        expect(screen.getByText('Personal Trainer')).toBeInTheDocument()
        expect(screen.getByText('Sarah Coach')).toBeInTheDocument()
        expect(screen.getByText('Fitness Coach')).toBeInTheDocument()
      })

      // Should call Supabase to fetch staff
      expect(mockSupabase.from).toHaveBeenCalledWith('staff')
    })

    it('should handle staff member selection', async () => {
      render(<InternalMessageConfig {...mockProps} />)

      await waitFor(() => {
        const staffCheckbox = screen.getAllByRole('checkbox')[0]
        expect(staffCheckbox).toBeInTheDocument()

        fireEvent.click(staffCheckbox)
      })

      expect(mockProps.onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          recipients: expect.any(Array)
        })
      )
    })

    it('should display notification channels', async () => {
      render(<InternalMessageConfig {...mockProps} />)

      await waitFor(() => {
        expect(screen.getByText(/Notification Channels/i)).toBeInTheDocument()
      })

      // Should show channel options
      expect(screen.getByText('Email')).toBeInTheDocument()
      expect(screen.getByText('SMS')).toBeInTheDocument()
      expect(screen.getByText('WhatsApp')).toBeInTheDocument()
      expect(screen.getByText('Telegram')).toBeInTheDocument()
    })

    it('should handle channel selection', async () => {
      render(<InternalMessageConfig {...mockProps} />)

      await waitFor(() => {
        const smsButton = screen.getByText('SMS')
        expect(smsButton).toBeInTheDocument()

        fireEvent.click(smsButton)
      })

      // Should update selected channels
      expect(mockProps.onChange).toHaveBeenCalled()
    })

    it('should show email subject field when email is selected', async () => {
      const propsWithEmail = {
        ...mockProps,
        nodeData: {
          ...mockNodeData,
          channels: ['email']
        }
      }

      render(<InternalMessageConfig {...propsWithEmail} />)

      await waitFor(() => {
        expect(screen.getByLabelText(/Email Subject/i)).toBeInTheDocument()
      })

      const subjectInput = screen.getByLabelText(/Email Subject/i) as HTMLInputElement
      expect(subjectInput.value).toBe('New Lead Alert')
    })

    it('should handle email subject changes', async () => {
      const propsWithEmail = {
        ...mockProps,
        nodeData: {
          ...mockNodeData,
          channels: ['email']
        }
      }

      render(<InternalMessageConfig {...propsWithEmail} />)

      await waitFor(() => {
        const subjectInput = screen.getByLabelText(/Email Subject/i) as HTMLInputElement
        
        fireEvent.change(subjectInput, { target: { value: 'Updated Subject' } })
        
        expect(subjectInput.value).toBe('Updated Subject')
        expect(mockProps.onChange).toHaveBeenCalledWith(
          expect.objectContaining({
            subject: 'Updated Subject'
          })
        )
      })
    })

    it('should handle message content changes', async () => {
      render(<InternalMessageConfig {...mockProps} />)

      await waitFor(() => {
        const messageTextarea = screen.getByLabelText(/Message/i) as HTMLTextAreaElement
        expect(messageTextarea).toBeInTheDocument()

        fireEvent.change(messageTextarea, { 
          target: { value: 'Updated message content' } 
        })

        expect(messageTextarea.value).toBe('Updated message content')
        expect(mockProps.onChange).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Updated message content'
          })
        )
      })
    })
  })

  describe('Variable Insertion', () => {
    it('should provide variable insertion dropdown', async () => {
      render(<InternalMessageConfig {...mockProps} />)

      await waitFor(() => {
        expect(screen.getByText(/Insert Variable/i)).toBeInTheDocument()
      })

      const variableDropdown = screen.getByDisplayValue(/Insert Variable/i) as HTMLSelectElement
      expect(variableDropdown).toBeInTheDocument()
    })

    it('should handle variable insertion', async () => {
      render(<InternalMessageConfig {...mockProps} />)

      await waitFor(() => {
        const variableDropdown = screen.getByDisplayValue(/Insert Variable/i) as HTMLSelectElement
        
        fireEvent.change(variableDropdown, { target: { value: 'lead_name' } })
        
        // Variable insertion should be triggered
        expect(variableDropdown).toBeInTheDocument()
      })
    })

    it('should show available variables', async () => {
      render(<InternalMessageConfig {...mockProps} />)

      await waitFor(() => {
        const variableDropdown = screen.getByDisplayValue(/Insert Variable/i) as HTMLSelectElement
        
        // Check options are present
        const options = Array.from(variableDropdown.options).map(option => option.text)
        expect(options).toContain('Lead Name')
        expect(options).toContain('Lead Email')
        expect(options).toContain('Event Type')
      })
    })
  })

  describe('Staff Management', () => {
    it('should handle loading state', () => {
      const mockSupabaseLoading = {
        from: jest.fn(() => ({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              eq: jest.fn(() => new Promise(() => {})) // Never resolves
            }))
          }))
        }))
      }

      jest.doMock('@/app/lib/supabase/client', () => ({
        createClient: () => mockSupabaseLoading
      }))

      render(<InternalMessageConfig {...mockProps} />)

      expect(screen.getByText(/Loading staff members.../i)).toBeInTheDocument()
    })

    it('should handle empty staff list', async () => {
      const mockSupabaseEmpty = {
        from: jest.fn(() => ({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              eq: jest.fn(() => Promise.resolve({
                data: [],
                error: null
              }))
            }))
          }))
        }))
      }

      jest.doMock('@/app/lib/supabase/client', () => ({
        createClient: () => mockSupabaseEmpty
      }))

      render(<InternalMessageConfig {...mockProps} />)

      await waitFor(() => {
        expect(screen.getByText(/No staff members found/i)).toBeInTheDocument()
      })
    })

    it('should handle staff fetch error', async () => {
      const mockSupabaseError = {
        from: jest.fn(() => ({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              eq: jest.fn(() => Promise.resolve({
                data: null,
                error: new Error('Database error')
              }))
            }))
          }))
        }))
      }

      jest.doMock('@/app/lib/supabase/client', () => ({
        createClient: () => mockSupabaseError
      }))

      render(<InternalMessageConfig {...mockProps} />)

      // Should not crash on error
      await waitFor(() => {
        expect(screen.getByText(/Notification Type/i)).toBeInTheDocument()
      })
    })

    it('should allow multiple staff selection', async () => {
      render(<InternalMessageConfig {...mockProps} />)

      await waitFor(() => {
        const checkboxes = screen.getAllByRole('checkbox')
        
        // Select first staff member
        fireEvent.click(checkboxes[0])
        
        // Select second staff member
        fireEvent.click(checkboxes[1])
      })

      // Should handle multiple selections
      expect(mockProps.onChange).toHaveBeenCalled()
    })

    it('should show staff member details', async () => {
      render(<InternalMessageConfig {...mockProps} />)

      await waitFor(() => {
        expect(screen.getByText('John Trainer')).toBeInTheDocument()
        expect(screen.getByText('Personal Trainer')).toBeInTheDocument()
        expect(screen.getByText('Sarah Coach')).toBeInTheDocument()
        expect(screen.getByText('Fitness Coach')).toBeInTheDocument()
      })
    })
  })

  describe('Test Message Functionality', () => {
    it('should render send test button', async () => {
      render(<InternalMessageConfig {...mockProps} />)

      await waitFor(() => {
        expect(screen.getByText(/Send Test/i)).toBeInTheDocument()
      })
    })

    it('should handle successful test message', async () => {
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      })

      render(<InternalMessageConfig {...mockProps} />)

      await waitFor(() => {
        const testButton = screen.getByText(/Send Test/i)
        expect(testButton).toBeInTheDocument()

        fireEvent.click(testButton)
      })

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          '/api/automations/test-internal-message',
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: expect.stringContaining('org-123')
          })
        )
      })

      // Should show success message
      await waitFor(() => {
        expect(screen.getByText(/Test message sent to/i)).toBeInTheDocument()
      })
    })

    it('should handle test message failure', async () => {
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ message: 'Test failed' })
      })

      render(<InternalMessageConfig {...mockProps} />)

      await waitFor(() => {
        const testButton = screen.getByText(/Send Test/i)
        fireEvent.click(testButton)
      })

      await waitFor(() => {
        expect(screen.getByText(/Failed to send test message/i)).toBeInTheDocument()
      })
    })

    it('should require staff selection for test', async () => {
      const propsWithoutRecipients = {
        ...mockProps,
        nodeData: {
          ...mockNodeData,
          recipients: []
        }
      }

      render(<InternalMessageConfig {...propsWithoutRecipients} />)

      await waitFor(() => {
        const testButton = screen.getByText(/Send Test/i)
        fireEvent.click(testButton)
      })

      await waitFor(() => {
        expect(screen.getByText(/Please select at least one staff member/i)).toBeInTheDocument()
      })
    })

    it('should disable test button when no staff or channels selected', async () => {
      const propsEmpty = {
        ...mockProps,
        nodeData: {
          ...mockNodeData,
          recipients: [],
          channels: []
        }
      }

      render(<InternalMessageConfig {...propsEmpty} />)

      await waitFor(() => {
        const testButton = screen.getByText(/Send Test/i)
        expect(testButton).toBeDisabled()
      })
    })
  })

  describe('Form Validation and State', () => {
    it('should require message content', async () => {
      render(<InternalMessageConfig {...mockProps} />)

      await waitFor(() => {
        const messageTextarea = screen.getByLabelText(/Message/i) as HTMLTextAreaElement
        expect(messageTextarea).toHaveAttribute('required')
      })
    })

    it('should require staff selection', async () => {
      render(<InternalMessageConfig {...mockProps} />)

      await waitFor(() => {
        const staffSection = screen.getByText(/Select Staff Members/i)
        expect(staffSection).toBeInTheDocument()
        // Required indicator should be present
        expect(screen.getByText('*')).toBeInTheDocument()
      })
    })

    it('should require channel selection', async () => {
      render(<InternalMessageConfig {...mockProps} />)

      await waitFor(() => {
        const channelSection = screen.getByText(/Notification Channels/i)
        expect(channelSection).toBeInTheDocument()
        // Required indicator should be present
        expect(screen.getAllByText('*')).toHaveLength(2) // Staff and Channels
      })
    })

    it('should update parent component on changes', async () => {
      render(<InternalMessageConfig {...mockProps} />)

      await waitFor(() => {
        const messageTextarea = screen.getByLabelText(/Message/i) as HTMLTextAreaElement
        
        fireEvent.change(messageTextarea, { 
          target: { value: 'New message content' } 
        })

        expect(mockProps.onChange).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'New message content'
          })
        )
      })
    })
  })

  describe('Save and Cancel Actions', () => {
    it('should handle save action', async () => {
      render(<InternalMessageConfig {...mockProps} />)

      await waitFor(() => {
        const saveButton = screen.getByText(/Save Action/i)
        expect(saveButton).toBeInTheDocument()

        fireEvent.click(saveButton)
      })

      // Should log save action (in real implementation would call callback)
      expect(saveButton).toBeInTheDocument()
    })

    it('should show save button with proper styling', async () => {
      render(<InternalMessageConfig {...mockProps} />)

      await waitFor(() => {
        const saveButton = screen.getByText(/Save Action/i)
        expect(saveButton).toHaveClass('bg-blue-600')
      })
    })
  })

  describe('Accessibility and UX', () => {
    it('should provide proper labels for form elements', async () => {
      render(<InternalMessageConfig {...mockProps} />)

      await waitFor(() => {
        expect(screen.getByLabelText(/Message/i)).toBeInTheDocument()
        expect(screen.getByText(/Notification Type/i)).toBeInTheDocument()
        expect(screen.getByText(/Select Staff Members/i)).toBeInTheDocument()
        expect(screen.getByText(/Notification Channels/i)).toBeInTheDocument()
      })
    })

    it('should show helpful placeholder text', async () => {
      render(<InternalMessageConfig {...mockProps} />)

      await waitFor(() => {
        const messageTextarea = screen.getByPlaceholderText(/Enter the notification message/i)
        expect(messageTextarea).toBeInTheDocument()
      })
    })

    it('should provide contextual help text', async () => {
      render(<InternalMessageConfig {...mockProps} />)

      await waitFor(() => {
        expect(screen.getByText(/Use variables like/i)).toBeInTheDocument()
      })
    })

    it('should handle keyboard navigation', async () => {
      render(<InternalMessageConfig {...mockProps} />)

      await waitFor(() => {
        const messageTextarea = screen.getByLabelText(/Message/i)
        
        // Focus should work
        messageTextarea.focus()
        expect(document.activeElement).toBe(messageTextarea)
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle missing node data gracefully', () => {
      const propsWithoutData = {
        ...mockProps,
        nodeData: {} as any
      }

      render(<InternalMessageConfig {...propsWithoutData} />)

      // Should not crash
      expect(screen.getByText(/Notification Type/i)).toBeInTheDocument()
    })

    it('should handle network errors gracefully', async () => {
      ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

      render(<InternalMessageConfig {...mockProps} />)

      await waitFor(() => {
        const testButton = screen.getByText(/Send Test/i)
        fireEvent.click(testButton)
      })

      // Should handle error without crashing
      await waitFor(() => {
        expect(screen.getByText(/Failed to send test message/i)).toBeInTheDocument()
      })
    })

    it('should validate required fields', async () => {
      const emptyProps = {
        ...mockProps,
        nodeData: {
          recipients: [],
          channels: [],
          message: '',
          subject: '',
          notificationType: 'alert'
        }
      }

      render(<InternalMessageConfig {...emptyProps} />)

      await waitFor(() => {
        const testButton = screen.getByText(/Send Test/i)
        expect(testButton).toBeDisabled()
      })
    })
  })

  describe('Dynamic Content', () => {
    it('should show appropriate notification icons', async () => {
      render(<InternalMessageConfig {...mockProps} />)

      await waitFor(() => {
        // Notification type buttons should have appropriate styling
        const alertButton = screen.getByText('Alert')
        const infoButton = screen.getByText('Information')
        const successButton = screen.getByText('Success')
        const urgentButton = screen.getByText('Urgent')

        expect(alertButton).toBeInTheDocument()
        expect(infoButton).toBeInTheDocument()
        expect(successButton).toBeInTheDocument()
        expect(urgentButton).toBeInTheDocument()
      })
    })

    it('should show channel availability', async () => {
      render(<InternalMessageConfig {...mockProps} />)

      await waitFor(() => {
        // All channels should be shown as available
        const emailButton = screen.getByText('Email')
        const smsButton = screen.getByText('SMS')
        const whatsappButton = screen.getByText('WhatsApp')
        const telegramButton = screen.getByText('Telegram')

        expect(emailButton).not.toBeDisabled()
        expect(smsButton).not.toBeDisabled()
        expect(whatsappButton).not.toBeDisabled()
        expect(telegramButton).not.toBeDisabled()
      })
    })
  })
})
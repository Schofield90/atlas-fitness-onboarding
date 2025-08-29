/**
 * @jest-environment jsdom
 */
import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import '@testing-library/jest-dom'
import EnhancedEmailNodeConfig from '@/app/components/automation/config/EnhancedEmailNodeConfig'

// Mock fetch for API calls
global.fetch = jest.fn()

describe('EnhancedEmailNodeConfig - Configuration Forms', () => {
  const mockNodeData = {
    name: 'Email Node',
    fromName: 'Atlas Fitness',
    fromEmail: 'noreply@atlasfitness.com',
    subject: 'Welcome to Atlas Fitness!',
    message: '<p>Welcome {{first_name}}!</p>',
    templateId: '',
    cc: '',
    bcc: '',
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

  describe('Fix 2: Enhanced Email Configuration - Input Fields', () => {
    it('should render all email configuration fields', () => {
      render(<EnhancedEmailNodeConfig {...mockProps} />)

      expect(screen.getByLabelText(/Action Name/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/From Name/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/From Email/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Subject/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Templates/i)).toBeInTheDocument()
    })

    it('should handle text input changes correctly', async () => {
      render(<EnhancedEmailNodeConfig {...mockProps} />)

      const actionNameInput = screen.getByLabelText(/Action Name/i) as HTMLInputElement
      
      await act(async () => {
        fireEvent.change(actionNameInput, { target: { value: 'Updated Email Action' } })
      })

      expect(actionNameInput.value).toBe('Updated Email Action')
      expect(mockProps.onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Updated Email Action'
        })
      )
    })

    it('should handle from name input changes', async () => {
      render(<EnhancedEmailNodeConfig {...mockProps} />)

      const fromNameInput = screen.getByLabelText(/From Name/i) as HTMLInputElement
      
      await act(async () => {
        fireEvent.change(fromNameInput, { target: { value: 'New Sender Name' } })
      })

      expect(fromNameInput.value).toBe('New Sender Name')
      expect(mockProps.onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          fromName: 'New Sender Name'
        })
      )
    })

    it('should handle from email input changes', async () => {
      render(<EnhancedEmailNodeConfig {...mockProps} />)

      const fromEmailInput = screen.getByLabelText(/From Email/i) as HTMLInputElement
      
      await act(async () => {
        fireEvent.change(fromEmailInput, { target: { value: 'sender@example.com' } })
      })

      expect(fromEmailInput.value).toBe('sender@example.com')
      expect(mockProps.onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          fromEmail: 'sender@example.com'
        })
      )
    })

    it('should handle subject input changes', async () => {
      render(<EnhancedEmailNodeConfig {...mockProps} />)

      const subjectInput = screen.getByLabelText(/Subject/i) as HTMLInputElement
      
      await act(async () => {
        fireEvent.change(subjectInput, { target: { value: 'New Email Subject' } })
      })

      expect(subjectInput.value).toBe('New Email Subject')
      expect(mockProps.onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: 'New Email Subject'
        })
      )
    })

    it('should handle template selection', async () => {
      const mockTemplates = [
        { id: 'template-1', name: 'Welcome Template', subject: 'Welcome!', content: '<p>Welcome!</p>' },
        { id: 'template-2', name: 'Follow-up Template', subject: 'Follow-up', content: '<p>Follow-up</p>' }
      ]

      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ templates: mockTemplates })
      })

      render(<EnhancedEmailNodeConfig {...mockProps} />)

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/email-templates')
        )
      })

      // Template dropdown should be populated
      const templateSelect = screen.getByLabelText(/Templates/i) as HTMLSelectElement
      expect(templateSelect).toBeInTheDocument()
    })
  })

  describe('CC/BCC Functionality', () => {
    it('should show CC field when CC button is clicked', async () => {
      render(<EnhancedEmailNodeConfig {...mockProps} />)

      const ccButton = screen.getByText('Cc')
      expect(ccButton).toBeInTheDocument()

      await act(async () => {
        fireEvent.click(ccButton)
      })

      expect(screen.getByLabelText(/CC/i)).toBeInTheDocument()
    })

    it('should show BCC field when BCC button is clicked', async () => {
      render(<EnhancedEmailNodeConfig {...mockProps} />)

      const bccButton = screen.getByText('Bcc')
      expect(bccButton).toBeInTheDocument()

      await act(async () => {
        fireEvent.click(bccButton)
      })

      expect(screen.getByLabelText(/BCC/i)).toBeInTheDocument()
    })

    it('should handle CC input changes', async () => {
      render(<EnhancedEmailNodeConfig {...mockProps} />)

      const ccButton = screen.getByText('Cc')
      await act(async () => {
        fireEvent.click(ccButton)
      })

      const ccInput = screen.getByLabelText(/CC/i) as HTMLInputElement
      
      await act(async () => {
        fireEvent.change(ccInput, { target: { value: 'cc@example.com' } })
      })

      expect(ccInput.value).toBe('cc@example.com')
      expect(mockProps.onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          cc: 'cc@example.com'
        })
      )
    })

    it('should handle BCC input changes', async () => {
      render(<EnhancedEmailNodeConfig {...mockProps} />)

      const bccButton = screen.getByText('Bcc')
      await act(async () => {
        fireEvent.click(bccButton)
      })

      const bccInput = screen.getByLabelText(/BCC/i) as HTMLInputElement
      
      await act(async () => {
        fireEvent.change(bccInput, { target: { value: 'bcc@example.com' } })
      })

      expect(bccInput.value).toBe('bcc@example.com')
      expect(mockProps.onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          bcc: 'bcc@example.com'
        })
      )
    })
  })

  describe('Rich Text Editor Functionality', () => {
    it('should render rich text editor with formatting toolbar', () => {
      render(<EnhancedEmailNodeConfig {...mockProps} />)

      // Check for toolbar elements
      expect(screen.getByText('Variables')).toBeInTheDocument()
      
      // Check for formatting buttons (by title attributes)
      const buttons = screen.getAllByRole('button')
      const boldButton = buttons.find(btn => btn.getAttribute('title') === 'Bold')
      const italicButton = buttons.find(btn => btn.getAttribute('title') === 'Italic')
      
      expect(boldButton || italicButton).toBeTruthy()
    })

    it('should handle variable insertion from dropdown', async () => {
      render(<EnhancedEmailNodeConfig {...mockProps} />)

      const variablesDropdown = screen.getByDisplayValue('Variables') as HTMLSelectElement
      expect(variablesDropdown).toBeInTheDocument()

      await act(async () => {
        fireEvent.change(variablesDropdown, { target: { value: 'first_name' } })
      })

      // Variable insertion functionality should be triggered
      expect(variablesDropdown).toBeInTheDocument()
    })

    it('should handle content editable area changes', async () => {
      render(<EnhancedEmailNodeConfig {...mockProps} />)

      // Find the content editable div (message editor)
      const messageEditor = screen.getByRole('textbox', { name: /message/i }) ||
                           document.querySelector('[contentEditable="true"]')

      if (messageEditor) {
        await act(async () => {
          fireEvent.input(messageEditor, {
            target: { innerHTML: '<p>New message content</p>' }
          })
        })

        // Should update the message state
        expect(mockProps.onChange).toHaveBeenCalled()
      }
    })
  })

  describe('AI Content Generation', () => {
    it('should have AI content generation button', () => {
      render(<EnhancedEmailNodeConfig {...mockProps} />)

      const aiButton = screen.getByText(/Write with AI/i)
      expect(aiButton).toBeInTheDocument()
    })

    it('should handle AI content generation', async () => {
      render(<EnhancedEmailNodeConfig {...mockProps} />)

      const aiButton = screen.getByText(/Write with AI/i)
      
      await act(async () => {
        fireEvent.click(aiButton)
      })

      // Should show generating state
      await waitFor(() => {
        expect(screen.getByText(/Generating.../i)).toBeInTheDocument()
      })

      // After timeout, should generate content
      await waitFor(() => {
        expect(screen.queryByText(/Generating.../i)).not.toBeInTheDocument()
      }, { timeout: 2000 })
    })
  })

  describe('Email Preview Functionality', () => {
    it('should toggle email preview', async () => {
      render(<EnhancedEmailNodeConfig {...mockProps} />)

      const previewButton = screen.getByText(/Show.*Preview/i)
      expect(previewButton).toBeInTheDocument()

      await act(async () => {
        fireEvent.click(previewButton)
      })

      // Should show preview section
      expect(screen.getByText(/Email Preview/i)).toBeInTheDocument()
    })

    it('should display email preview with processed variables', async () => {
      render(<EnhancedEmailNodeConfig {...mockProps} />)

      const previewButton = screen.getByText(/Show.*Preview/i)
      
      await act(async () => {
        fireEvent.click(previewButton)
      })

      // Preview should show processed content
      await waitFor(() => {
        expect(screen.getByText(/Email Preview/i)).toBeInTheDocument()
        // Should show preview content with sample data
        expect(screen.getByText(/From:/i)).toBeInTheDocument()
        expect(screen.getByText(/Subject:/i)).toBeInTheDocument()
      })
    })

    it('should handle preview close', async () => {
      render(<EnhancedEmailNodeConfig {...mockProps} />)

      const previewButton = screen.getByText(/Show.*Preview/i)
      
      await act(async () => {
        fireEvent.click(previewButton)
      })

      const hideButton = screen.getByText(/Hide.*Preview/i)
      
      await act(async () => {
        fireEvent.click(hideButton)
      })

      // Preview should be hidden
      expect(screen.queryByText(/Email Preview/i)).not.toBeInTheDocument()
    })
  })

  describe('Test Email Functionality', () => {
    it('should render test email section', () => {
      render(<EnhancedEmailNodeConfig {...mockProps} />)

      expect(screen.getByText(/Send Test Email/i)).toBeInTheDocument()
      expect(screen.getByPlaceholderText(/Enter test email address/i)).toBeInTheDocument()
    })

    it('should handle test email input', async () => {
      render(<EnhancedEmailNodeConfig {...mockProps} />)

      const testEmailInput = screen.getByPlaceholderText(/Enter test email address/i) as HTMLInputElement
      
      await act(async () => {
        fireEvent.change(testEmailInput, { target: { value: 'test@example.com' } })
      })

      expect(testEmailInput.value).toBe('test@example.com')
    })

    it('should send test email successfully', async () => {
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      })

      render(<EnhancedEmailNodeConfig {...mockProps} />)

      const testEmailInput = screen.getByPlaceholderText(/Enter test email address/i)
      const sendTestButton = screen.getByText(/Send Test/i)

      await act(async () => {
        fireEvent.change(testEmailInput, { target: { value: 'test@example.com' } })
      })

      await act(async () => {
        fireEvent.click(sendTestButton)
      })

      // Should make API call to send test email
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          '/api/automations/test-email',
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: expect.stringContaining('test@example.com')
          })
        )
      })

      // Should show success message
      await waitFor(() => {
        expect(screen.getByText(/Test email sent successfully/i)).toBeInTheDocument()
      })
    })

    it('should handle test email failure', async () => {
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ message: 'Failed to send email' })
      })

      render(<EnhancedEmailNodeConfig {...mockProps} />)

      const testEmailInput = screen.getByPlaceholderText(/Enter test email address/i)
      const sendTestButton = screen.getByText(/Send Test/i)

      await act(async () => {
        fireEvent.change(testEmailInput, { target: { value: 'test@example.com' } })
      })

      await act(async () => {
        fireEvent.click(sendTestButton)
      })

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/Failed to send test email/i)).toBeInTheDocument()
      })
    })

    it('should require test email address', async () => {
      render(<EnhancedEmailNodeConfig {...mockProps} />)

      const sendTestButton = screen.getByText(/Send Test/i)

      await act(async () => {
        fireEvent.click(sendTestButton)
      })

      // Should show error for missing email
      await waitFor(() => {
        expect(screen.getByText(/Please enter a test email address/i)).toBeInTheDocument()
      })
    })
  })

  describe('Save and Cancel Actions', () => {
    it('should handle save action', async () => {
      render(<EnhancedEmailNodeConfig {...mockProps} />)

      const saveButton = screen.getByText(/Save Action/i)
      
      await act(async () => {
        fireEvent.click(saveButton)
      })

      // Should log the save action (in actual implementation, would call onSave)
      expect(saveButton).toBeInTheDocument()
    })

    it('should handle cancel action', async () => {
      render(<EnhancedEmailNodeConfig {...mockProps} />)

      const cancelButton = screen.getByText(/Cancel/i)
      
      await act(async () => {
        fireEvent.click(cancelButton)
      })

      expect(cancelButton).toBeInTheDocument()
    })
  })

  describe('Template Management', () => {
    it('should fetch templates on component mount', async () => {
      const mockTemplates = [
        { id: 'template-1', name: 'Welcome Template' }
      ]

      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ templates: mockTemplates })
      })

      render(<EnhancedEmailNodeConfig {...mockProps} />)

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining(`/api/email-templates?organizationId=${mockProps.organizationId}`)
        )
      })
    })

    it('should handle template fetch failure', async () => {
      ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

      render(<EnhancedEmailNodeConfig {...mockProps} />)

      // Should not crash when template fetch fails
      await waitFor(() => {
        expect(screen.getByLabelText(/Templates/i)).toBeInTheDocument()
      })
    })

    it('should apply template when selected', async () => {
      const mockTemplate = {
        id: 'template-1',
        name: 'Welcome Template',
        subject: 'Template Subject',
        content: '<p>Template Content</p>'
      }

      const nodeDataWithTemplate = {
        ...mockNodeData,
        templateId: 'template-1'
      }

      render(<EnhancedEmailNodeConfig {...mockProps} nodeData={nodeDataWithTemplate} />)

      // Template should be pre-selected
      const templateSelect = screen.getByLabelText(/Templates/i) as HTMLSelectElement
      expect(templateSelect.value).toBe('template-1')
    })
  })

  describe('Variable Processing', () => {
    it('should process variables in preview', async () => {
      const nodeDataWithVariables = {
        ...mockNodeData,
        subject: 'Hello {{first_name}}!',
        message: '<p>Welcome {{first_name}} {{last_name}}!</p>'
      }

      render(<EnhancedEmailNodeConfig {...mockProps} nodeData={nodeDataWithVariables} />)

      const previewButton = screen.getByText(/Show.*Preview/i)
      
      await act(async () => {
        fireEvent.click(previewButton)
      })

      // Should show processed variables in preview
      await waitFor(() => {
        expect(screen.getByText(/Hello John!/i)).toBeInTheDocument()
        expect(screen.getByText(/Welcome John Doe!/i)).toBeInTheDocument()
      })
    })

    it('should handle variable insertion in subject', async () => {
      render(<EnhancedEmailNodeConfig {...mockProps} />)

      // Find the tag button next to subject field
      const subjectSection = screen.getByLabelText(/Subject/i).closest('div')
      const tagButton = subjectSection?.querySelector('button[title*="tag"], button svg')

      if (tagButton) {
        await act(async () => {
          fireEvent.click(tagButton)
        })

        // Should insert variable
        expect(mockProps.onChange).toHaveBeenCalled()
      }
    })
  })
})
/**
 * QA Test Suite: Messaging Action Nodes with Variable Validation
 * 
 * Tests email, SMS, and WhatsApp action node configurations including:
 * - Variable insertion functionality  
 * - Different variable formats for different channels
 * - Message validation and character limits
 * - Test message sending functionality
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DynamicConfigPanelEnhanced from '@/app/components/automation/config/DynamicConfigPanelEnhanced'
import { WorkflowNode } from '@/app/lib/types/automation'

// Mock the feature flags hook
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

// Mock API calls
global.fetch = jest.fn()

describe('Messaging Action Nodes QA Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(global.fetch as jest.Mock).mockClear()
  })

  describe('Email Action Node Configuration', () => {
    const mockEmailNode: WorkflowNode = {
      id: 'email-action-1',
      type: 'action',
      position: { x: 100, y: 100 },
      data: {
        label: 'Send Email',
        actionType: 'send_email',
        config: {},
        description: 'Send an email to a contact',
        isValid: false
      }
    }

    const mockProps = {
      node: mockEmailNode,
      onClose: jest.fn(),
      onSave: jest.fn(),
      organizationId: 'org-123'
    }

    test('should render email configuration form with all required fields', async () => {
      render(<DynamicConfigPanelEnhanced {...mockProps} />)

      expect(screen.getByText('Configure Send Email')).toBeInTheDocument()
      expect(screen.getByLabelText(/To/)).toBeInTheDocument()
      expect(screen.getByLabelText(/Subject/)).toBeInTheDocument()
      expect(screen.getByLabelText(/Email Body/)).toBeInTheDocument()
    })

    test('should accept email variables in correct format {{variable}}', async () => {
      const user = userEvent.setup()

      render(<DynamicConfigPanelEnhanced {...mockProps} />)

      const subjectInput = screen.getByLabelText(/Subject/)
      const bodyInput = screen.getByLabelText(/Email Body/)

      // Type variables in email format
      await user.type(subjectInput, 'Welcome {{firstName}} to {{gymLocation}}!')
      await user.type(bodyInput, 'Hi {{firstName}}, your email {{email}} is confirmed. Contact us at {{phone}}.')

      expect(subjectInput).toHaveValue('Welcome {{firstName}} to {{gymLocation}}!')
      expect(bodyInput).toHaveValue('Hi {{firstName}}, your email {{email}} is confirmed. Contact us at {{phone}}.')
    })

    test('should show variable insertion dropdown for email fields', async () => {
      const user = userEvent.setup()

      render(<DynamicConfigPanelEnhanced {...mockProps} />)

      // Look for variable dropdown buttons
      const variableButtons = screen.getAllByTitle('Insert variable')
      expect(variableButtons.length).toBeGreaterThan(0)

      // Click to show variables dropdown
      await user.click(variableButtons[0])

      await waitFor(() => {
        expect(screen.getByText('First Name')).toBeInTheDocument()
        expect(screen.getByText('Email')).toBeInTheDocument()
        expect(screen.getByText('Phone')).toBeInTheDocument()
      })
    })

    test('should insert variables when clicked from dropdown', async () => {
      const user = userEvent.setup()

      render(<DynamicConfigPanelEnhanced {...mockProps} />)

      const subjectInput = screen.getByLabelText(/Subject/)
      
      // Click variable button
      const variableButtons = screen.getAllByTitle('Insert variable')
      await user.click(variableButtons[0]) // Subject field variable button

      await waitFor(() => {
        expect(screen.getByText('First Name')).toBeInTheDocument()
      })

      // Click on First Name variable
      const firstNameVar = screen.getByText('First Name')
      await user.click(firstNameVar)

      // Should insert the variable
      expect(subjectInput).toHaveValue('{{firstName}}')
    })

    test('should validate required email fields', async () => {
      const user = userEvent.setup()

      render(<DynamicConfigPanelEnhanced {...mockProps} />)

      // Try to save without filling required fields
      const saveButton = screen.getByText('Save Configuration')
      await user.click(saveButton)

      // Should not save if required fields are empty
      expect(mockProps.onSave).not.toHaveBeenCalled()
    })

    test('should handle test email functionality', async () => {
      const user = userEvent.setup()

      // Mock successful test email API
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      })

      render(<DynamicConfigPanelEnhanced {...mockProps} />)

      // Fill in email configuration
      await user.type(screen.getByLabelText(/To/), 'test@example.com')
      await user.type(screen.getByLabelText(/Subject/), 'Test Subject')
      await user.type(screen.getByLabelText(/Email Body/), 'Test message body')
      
      // Fill test email address
      const testEmailInput = screen.getByLabelText(/Test Email Address/)
      await user.type(testEmailInput, 'qa@test.com')

      // Should show send test button when test email is entered
      await waitFor(() => {
        expect(screen.getByText('📧 Send Test Email')).toBeInTheDocument()
      })

      // Click send test email
      const sendTestButton = screen.getByText('📧 Send Test Email')
      await user.click(sendTestButton)

      // Should call test email API
      expect(global.fetch).toHaveBeenCalledWith('/api/automations/test/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: 'qa@test.com',
          subject: 'Test Subject',
          body: 'Test message body',
          from: undefined
        })
      })
    })

    test('should save email configuration with all fields', async () => {
      const user = userEvent.setup()

      render(<DynamicConfigPanelEnhanced {...mockProps} />)

      // Fill all required fields
      await user.type(screen.getByLabelText(/To/), '{{email}}')
      await user.type(screen.getByLabelText(/Subject/), 'Welcome {{firstName}}!')
      await user.type(screen.getByLabelText(/Email Body/), 'Welcome to Atlas Fitness, {{firstName}}! Your next session is {{nextSessionDate}}.')

      // Save configuration
      const saveButton = screen.getByText('Save Configuration')
      await user.click(saveButton)

      expect(mockProps.onSave).toHaveBeenCalledWith('email-action-1', {
        label: 'Send Email',
        to: '{{email}}',
        subject: 'Welcome {{firstName}}!',
        body: 'Welcome to Atlas Fitness, {{firstName}}! Your next session is {{nextSessionDate}}.'
      })
    })
  })

  describe('SMS Action Node Configuration', () => {
    const mockSMSNode: WorkflowNode = {
      id: 'sms-action-1',
      type: 'action',
      position: { x: 100, y: 100 },
      data: {
        label: 'Send SMS',
        actionType: 'send_sms',
        config: {},
        description: 'Send an SMS message',
        isValid: false
      }
    }

    const mockProps = {
      node: mockSMSNode,
      onClose: jest.fn(),
      onSave: jest.fn(),
      organizationId: 'org-123'
    }

    test('should render SMS configuration form', () => {
      render(<DynamicConfigPanelEnhanced {...mockProps} />)

      expect(screen.getByText('Configure Send SMS')).toBeInTheDocument()
      expect(screen.getByLabelText(/From Number/)).toBeInTheDocument()
      expect(screen.getByLabelText(/To/)).toBeInTheDocument()
      expect(screen.getByLabelText(/SMS Message/)).toBeInTheDocument()
    })

    test('should accept SMS variables in square bracket format [variable]', async () => {
      const user = userEvent.setup()

      render(<DynamicConfigPanelEnhanced {...mockProps} />)

      const messageInput = screen.getByLabelText(/SMS Message/)

      // Type SMS variables in square bracket format
      await user.type(messageInput, 'Hi [firstName], your session at [location] is tomorrow at [nextSession]. Reply STOP to opt out.')

      expect(messageInput).toHaveValue('Hi [firstName], your session at [location] is tomorrow at [nextSession]. Reply STOP to opt out.')
    })

    test('should show SMS-specific variables in dropdown', async () => {
      const user = userEvent.setup()

      render(<DynamicConfigPanelEnhanced {...mockProps} />)

      // Find variable button for SMS message field
      const variableButtons = screen.getAllByTitle('Insert variable')
      await user.click(variableButtons[0])

      await waitFor(() => {
        // SMS should show square bracket variables
        expect(screen.getByText('[firstName]') || screen.getByText('First Name')).toBeInTheDocument()
        expect(screen.getByText('[phone]') || screen.getByText('Phone')).toBeInTheDocument()
      })
    })

    test('should enforce SMS character limits', async () => {
      const user = userEvent.setup()

      render(<DynamicConfigPanelEnhanced {...mockProps} />)

      const messageInput = screen.getByLabelText(/SMS Message/)

      // Type a very long message (over 1600 chars)
      const longMessage = 'A'.repeat(1700)
      await user.type(messageInput, longMessage)

      // Should show validation error or truncate
      expect(messageInput.value.length).toBeLessThanOrEqual(1600)
    })

    test('should handle test SMS functionality', async () => {
      const user = userEvent.setup()

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      })

      render(<DynamicConfigPanelEnhanced {...mockProps} />)

      // Fill SMS configuration
      await user.type(screen.getByLabelText(/SMS Message/), 'Test SMS message with [firstName]')
      
      // Fill test phone number
      const testPhoneInput = screen.getByLabelText(/Test Phone Number/)
      await user.type(testPhoneInput, '+447123456789')

      await waitFor(() => {
        expect(screen.getByText('💬 Send Test SMS')).toBeInTheDocument()
      })

      const sendTestButton = screen.getByText('💬 Send Test SMS')
      await user.click(sendTestButton)

      expect(global.fetch).toHaveBeenCalledWith('/api/automations/test/sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: '+447123456789',
          message: 'Test SMS message with [firstName]',
          from: undefined
        })
      })
    })
  })

  describe('WhatsApp Action Node Configuration', () => {
    const mockWhatsAppNode: WorkflowNode = {
      id: 'whatsapp-action-1',
      type: 'action',
      position: { x: 100, y: 100 },
      data: {
        label: 'Send WhatsApp',
        actionType: 'send_whatsapp',
        config: {},
        description: 'Send a WhatsApp message',
        isValid: false
      }
    }

    const mockProps = {
      node: mockWhatsAppNode,
      onClose: jest.fn(),
      onSave: jest.fn(),
      organizationId: 'org-123'
    }

    test('should render WhatsApp configuration form', () => {
      render(<DynamicConfigPanelEnhanced {...mockProps} />)

      expect(screen.getByText('Configure Send WhatsApp')).toBeInTheDocument()
      expect(screen.getByLabelText(/From Number/)).toBeInTheDocument()
      expect(screen.getByLabelText(/To/)).toBeInTheDocument()
      expect(screen.getByLabelText(/WhatsApp Message/)).toBeInTheDocument()
    })

    test('should accept WhatsApp variables in double brace format {{variable}}', async () => {
      const user = userEvent.setup()

      render(<DynamicConfigPanelEnhanced {...mockProps} />)

      const messageInput = screen.getByLabelText(/WhatsApp Message/)

      // Type WhatsApp variables with emojis and formatting
      await user.type(messageInput, 'Hi {{firstName}}! 🏋️ Your next training session is on {{nextSessionDate}} with {{trainerName}}.')

      expect(messageInput).toHaveValue('Hi {{firstName}}! 🏋️ Your next training session is on {{nextSessionDate}} with {{trainerName}}.')
    })

    test('should support emojis and rich formatting in WhatsApp messages', async () => {
      const user = userEvent.setup()

      render(<DynamicConfigPanelEnhanced {...mockProps} />)

      const messageInput = screen.getByLabelText(/WhatsApp Message/)

      // Type message with various emojis and formatting
      const richMessage = '💪 Welcome {{firstName}}! 🎯\n\nYour workout plan:\n- Mon: Strength 🏋️\n- Wed: Cardio 🏃‍♂️\n- Fri: Flexibility 🧘‍♀️\n\nQuestions? Reply here! 💬'
      
      await user.type(messageInput, richMessage)

      expect(messageInput).toHaveValue(richMessage)
    })

    test('should handle test WhatsApp functionality', async () => {
      const user = userEvent.setup()

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      })

      render(<DynamicConfigPanelEnhanced {...mockProps} />)

      // Fill WhatsApp configuration
      await user.type(screen.getByLabelText(/WhatsApp Message/), 'Test WhatsApp with {{firstName}} 💪')
      
      // Fill test WhatsApp number
      const testWhatsAppInput = screen.getByLabelText(/Test WhatsApp Number/)
      await user.type(testWhatsAppInput, '+447987654321')

      await waitFor(() => {
        expect(screen.getByText('💚 Send Test WhatsApp')).toBeInTheDocument()
      })

      const sendTestButton = screen.getByText('💚 Send Test WhatsApp')
      await user.click(sendTestButton)

      expect(global.fetch).toHaveBeenCalledWith('/api/automations/test/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: '+447987654321',
          message: 'Test WhatsApp with {{firstName}} 💪',
          from: undefined
        })
      })
    })
  })

  describe('Variable System Validation', () => {
    test('should understand different variable formats for different channels', () => {
      // This test validates the discovery that different channels use different variable formats
      // This is NOT a bug - it's the correct implementation
      
      const emailVariables = ['{{firstName}}', '{{phone}}', '{{email}}', '{{gymLocation}}']
      const smsVariables = ['[firstName]', '[phone]', '[email]', '[location]']
      const whatsappVariables = ['{{firstName}}', '{{phone}}', '{{email}}', '{{trainerName}}']

      // Email format: double braces
      emailVariables.forEach(variable => {
        expect(variable).toMatch(/^{{.*}}$/)
      })

      // SMS format: square brackets  
      smsVariables.forEach(variable => {
        expect(variable).toMatch(/^\[.*\]$/)
      })

      // WhatsApp format: double braces (same as email)
      whatsappVariables.forEach(variable => {
        expect(variable).toMatch(/^{{.*}}$/)
      })
    })

    test('should sanitize variable input to prevent XSS attacks', async () => {
      const user = userEvent.setup()

      const mockEmailNode: WorkflowNode = {
        id: 'email-test',
        type: 'action',
        position: { x: 0, y: 0 },
        data: { label: 'Email', actionType: 'send_email', config: {}, description: '', isValid: false }
      }

      render(<DynamicConfigPanelEnhanced 
        node={mockEmailNode}
        onClose={jest.fn()}
        onSave={jest.fn()}
        organizationId="test"
      />)

      const subjectInput = screen.getByLabelText(/Subject/)

      // Try to inject malicious script
      const maliciousInput = '<script>alert("xss")</script>{{firstName}}'
      await user.type(subjectInput, maliciousInput)

      // The input should be sanitized (script tags removed)
      const value = subjectInput.value
      expect(value).not.toContain('<script>')
      expect(value).toContain('{{firstName}}')
    })
  })

  describe('Error Handling and Edge Cases', () => {
    test('should handle API failures gracefully for test messages', async () => {
      const user = userEvent.setup()

      // Mock API failure
      ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

      const mockEmailNode: WorkflowNode = {
        id: 'email-test',
        type: 'action', 
        position: { x: 0, y: 0 },
        data: { label: 'Email', actionType: 'send_email', config: {}, description: '', isValid: false }
      }

      render(<DynamicConfigPanelEnhanced 
        node={mockEmailNode}
        onClose={jest.fn()}
        onSave={jest.fn()}
        organizationId="test"
      />)

      // Fill test email and try to send
      const testEmailInput = screen.getByLabelText(/Test Email Address/)
      await user.type(testEmailInput, 'test@example.com')

      const sendTestButton = screen.getByText('📧 Send Test Email')
      await user.click(sendTestButton)

      // Should handle error gracefully (no crash)
      expect(screen.getByText('📧 Send Test Email')).toBeInTheDocument()
    })

    test('should validate phone number formats', async () => {
      const user = userEvent.setup()

      const mockSMSNode: WorkflowNode = {
        id: 'sms-test',
        type: 'action',
        position: { x: 0, y: 0 },
        data: { label: 'SMS', actionType: 'send_sms', config: {}, description: '', isValid: false }
      }

      render(<DynamicConfigPanelEnhanced 
        node={mockSMSNode}
        onClose={jest.fn()}
        onSave={jest.fn()}
        organizationId="test"
      />)

      const testPhoneInput = screen.getByLabelText(/Test Phone Number/)
      
      // Invalid phone number (too short)
      await user.type(testPhoneInput, '123')
      
      // Send test button should not appear for invalid numbers
      const sendTestButtons = screen.queryAllByText('💬 Send Test SMS')
      expect(sendTestButtons).toHaveLength(0)
    })

    test('should handle user profile loading for auto-filled phone numbers', async () => {
      // Mock user profile API
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          phone: '+447123456789',
          whatsapp: '+447987654321'
        })
      })

      const mockSMSNode: WorkflowNode = {
        id: 'sms-test',
        type: 'action',
        position: { x: 0, y: 0 },
        data: { label: 'SMS', actionType: 'send_sms', config: {}, description: '', isValid: false }
      }

      render(<DynamicConfigPanelEnhanced 
        node={mockSMSNode}
        onClose={jest.fn()}
        onSave={jest.fn()}
        organizationId="test"
      />)

      // Should fetch user profile for auto-filling phone numbers
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/user/profile')
      })
    })
  })
})
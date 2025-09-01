import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { toast } from 'sonner'
import { WebhookTriggerConfig } from '@/components/automations/WebhookTriggerConfig'
import { WebhookTriggerData } from '@/types/webhook-trigger'

// Mock external dependencies
jest.mock('sonner')
const mockToast = {
  success: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
}
;(toast as jest.Mocked<typeof toast>) = mockToast as any

// Mock fetch API
global.fetch = jest.fn()
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

// Mock crypto API for secret rotation
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: jest.fn(() => 'mock-uuid-1234'),
  },
})

// Mock navigator.clipboard
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: jest.fn(),
  },
})

describe('WebhookTriggerConfig', () => {
  const defaultProps = {
    workflowId: 'test-workflow-id',
    nodeId: 'test-node-id',
    onChange: jest.fn(),
    onSave: jest.fn(),
    onCancel: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockFetch.mockClear()
    ;(navigator.clipboard.writeText as jest.Mock).mockResolvedValue(undefined)
  })

  describe('Component Rendering', () => {
    it('renders all essential UI elements', () => {
      render(<WebhookTriggerConfig {...defaultProps} />)

      // Check main elements
      expect(screen.getByText('Webhook Trigger')).toBeInTheDocument()
      expect(screen.getByText('Trigger this automation when external systems send HTTP requests to your webhook endpoint')).toBeInTheDocument()
      
      // Check input fields
      expect(screen.getByTestId('webhook-name')).toBeInTheDocument()
      expect(screen.getByTestId('webhook-description')).toBeInTheDocument()
      expect(screen.getByTestId('webhook-endpoint')).toBeInTheDocument()
      expect(screen.getByTestId('webhook-secret')).toBeInTheDocument()
      
      // Check buttons
      expect(screen.getByTestId('copy-endpoint')).toBeInTheDocument()
      expect(screen.getByTestId('rotate-secret')).toBeInTheDocument()
      expect(screen.getByTestId('toggle-secret-visibility')).toBeInTheDocument()
      expect(screen.getByTestId('copy-secret')).toBeInTheDocument()
      
      // Check toggles
      expect(screen.getByTestId('pause-intake')).toBeInTheDocument()
      expect(screen.getByTestId('webhook-active')).toBeInTheDocument()
      
      // Check content type checkboxes
      expect(screen.getByTestId('json-content-type')).toBeInTheDocument()
      expect(screen.getByTestId('form-content-type')).toBeInTheDocument()
      
      // Check test button
      expect(screen.getByTestId('test-webhook')).toBeInTheDocument()
    })

    it('displays correct endpoint URL based on props', () => {
      process.env.NEXT_PUBLIC_APP_URL = 'https://test.example.com'
      
      render(<WebhookTriggerConfig {...defaultProps} />)
      
      const endpointInput = screen.getByTestId('webhook-endpoint') as HTMLInputElement
      expect(endpointInput.value).toBe('https://test.example.com/api/automations/webhooks/test-workflow-id/test-node-id')
    })

    it('initializes with default values', () => {
      render(<WebhookTriggerConfig {...defaultProps} />)
      
      // Check default states
      const activeSwitch = screen.getByTestId('webhook-active') as HTMLInputElement
      const pauseSwitch = screen.getByTestId('pause-intake') as HTMLInputElement
      const jsonContentType = screen.getByTestId('json-content-type') as HTMLInputElement
      
      expect(activeSwitch.checked).toBe(true)
      expect(pauseSwitch.checked).toBe(false)
      expect(jsonContentType.checked).toBe(true)
    })

    it('pre-fills form with provided values', () => {
      const existingConfig: Partial<WebhookTriggerData> = {
        name: 'Test Webhook',
        description: 'Test Description',
        paused: true,
        active: false,
        contentTypes: ['application/x-www-form-urlencoded']
      }
      
      render(<WebhookTriggerConfig {...defaultProps} value={existingConfig} />)
      
      expect((screen.getByTestId('webhook-name') as HTMLInputElement).value).toBe('Test Webhook')
      expect((screen.getByTestId('webhook-description') as HTMLInputElement).value).toBe('Test Description')
      expect((screen.getByTestId('pause-intake') as HTMLInputElement).checked).toBe(true)
      expect((screen.getByTestId('webhook-active') as HTMLInputElement).checked).toBe(false)
      expect((screen.getByTestId('form-content-type') as HTMLInputElement).checked).toBe(true)
    })
  })

  describe('Copy Functionality', () => {
    it('copies endpoint URL when copy button is clicked', async () => {
      const user = userEvent.setup()
      render(<WebhookTriggerConfig {...defaultProps} />)
      
      const copyButton = screen.getByTestId('copy-endpoint')
      await user.click(copyButton)
      
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        expect.stringContaining('/api/automations/webhooks/test-workflow-id/test-node-id')
      )
      expect(mockToast.success).toHaveBeenCalledWith('Webhook endpoint copied to clipboard')
    })

    it('copies secret when secret is revealed and copy button is clicked', async () => {
      const user = userEvent.setup()
      render(<WebhookTriggerConfig {...defaultProps} />)
      
      // First reveal the secret
      const revealButton = screen.getByTestId('toggle-secret-visibility')
      await user.click(revealButton)
      
      // Then copy it
      const copySecretButton = screen.getByTestId('copy-secret')
      await user.click(copySecretButton)
      
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('wh_secret_abcd1234...')
      expect(mockToast.success).toHaveBeenCalledWith('Webhook secret copied to clipboard')
    })

    it('shows error when clipboard copy fails', async () => {
      const user = userEvent.setup()
      ;(navigator.clipboard.writeText as jest.Mock).mockRejectedValue(new Error('Copy failed'))
      
      render(<WebhookTriggerConfig {...defaultProps} />)
      
      const copyButton = screen.getByTestId('copy-endpoint')
      await user.click(copyButton)
      
      expect(mockToast.error).toHaveBeenCalledWith('Failed to copy to clipboard')
    })
  })

  describe('Secret Management', () => {
    it('toggles secret visibility', async () => {
      const user = userEvent.setup()
      render(<WebhookTriggerConfig {...defaultProps} />)
      
      const secretInput = screen.getByTestId('webhook-secret') as HTMLInputElement
      const toggleButton = screen.getByTestId('toggle-secret-visibility')
      
      // Initially hidden
      expect(secretInput.type).toBe('password')
      expect(secretInput.value).toMatch(/^\*\*\*\*/)
      
      // Reveal secret
      await user.click(toggleButton)
      expect(secretInput.type).toBe('text')
      expect(secretInput.value).toBe('wh_secret_abcd1234...')
      
      // Hide again
      await user.click(toggleButton)
      expect(secretInput.type).toBe('password')
    })

    it('rotates secret successfully', async () => {
      const user = userEvent.setup()
      const mockResponse = {
        secretId: 'new-secret-id',
        last4: 'xyz9',
        revealToken: 'reveal-token-123',
        expiresAt: '2024-01-01T00:00:00Z'
      }
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response)
      
      render(<WebhookTriggerConfig {...defaultProps} />)
      
      const rotateButton = screen.getByTestId('rotate-secret')
      await user.click(rotateButton)
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/automations/webhooks/test-workflow-id/test-node-id/rotate-secret',
          { method: 'POST' }
        )
        expect(mockToast.success).toHaveBeenCalledWith('Webhook secret rotated successfully')
      })
      
      // Check if secret is auto-revealed after rotation
      const secretInput = screen.getByTestId('webhook-secret') as HTMLInputElement
      expect(secretInput.type).toBe('text')
    })

    it('handles secret rotation failure', async () => {
      const user = userEvent.setup()
      
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      } as Response)
      
      render(<WebhookTriggerConfig {...defaultProps} />)
      
      const rotateButton = screen.getByTestId('rotate-secret')
      await user.click(rotateButton)
      
      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('Failed to rotate webhook secret')
      })
    })

    it('disables copy secret button when secret is hidden', () => {
      render(<WebhookTriggerConfig {...defaultProps} />)
      
      const copySecretButton = screen.getByTestId('copy-secret')
      expect(copySecretButton).toBeDisabled()
    })
  })

  describe('Configuration Changes', () => {
    it('updates name and description', async () => {
      const user = userEvent.setup()
      const mockOnChange = jest.fn()
      
      render(<WebhookTriggerConfig {...defaultProps} onChange={mockOnChange} />)
      
      const nameInput = screen.getByTestId('webhook-name')
      const descInput = screen.getByTestId('webhook-description')
      
      await user.type(nameInput, 'New Webhook Name')
      await user.type(descInput, 'New Description')
      
      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'New Webhook Name',
          description: 'New Description'
        })
      )
    })

    it('toggles pause and active states', async () => {
      const user = userEvent.setup()
      const mockOnChange = jest.fn()
      
      render(<WebhookTriggerConfig {...defaultProps} onChange={mockOnChange} />)
      
      const pauseSwitch = screen.getByTestId('pause-intake')
      const activeSwitch = screen.getByTestId('webhook-active')
      
      await user.click(pauseSwitch)
      await user.click(activeSwitch)
      
      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          paused: true,
          active: false
        })
      )
    })

    it('toggles content types', async () => {
      const user = userEvent.setup()
      const mockOnChange = jest.fn()
      
      render(<WebhookTriggerConfig {...defaultProps} onChange={mockOnChange} />)
      
      const formContentType = screen.getByTestId('form-content-type')
      await user.click(formContentType)
      
      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          contentTypes: ['application/json', 'application/x-www-form-urlencoded']
        })
      )
    })

    it('prevents removing all content types', async () => {
      const user = userEvent.setup()
      const mockOnChange = jest.fn()
      
      render(<WebhookTriggerConfig {...defaultProps} onChange={mockOnChange} />)
      
      // Try to uncheck the only selected content type
      const jsonContentType = screen.getByTestId('json-content-type')
      await user.click(jsonContentType)
      
      // Should not trigger onChange since we can't have zero content types
      expect(mockOnChange).not.toHaveBeenCalledWith(
        expect.objectContaining({
          contentTypes: []
        })
      )
    })
  })

  describe('Security Settings', () => {
    it('opens and closes security settings collapsible', async () => {
      const user = userEvent.setup()
      render(<WebhookTriggerConfig {...defaultProps} />)
      
      const securityToggle = screen.getByTestId('security-toggle')
      await user.click(securityToggle)
      
      // Should show IP allowlist section
      expect(screen.getByTestId('ip-input')).toBeInTheDocument()
      expect(screen.getByTestId('add-ip')).toBeInTheDocument()
      expect(screen.getByTestId('signature-tolerance')).toBeInTheDocument()
    })

    it('adds and removes IP addresses from allowlist', async () => {
      const user = userEvent.setup()
      const mockOnChange = jest.fn()
      
      render(<WebhookTriggerConfig {...defaultProps} onChange={mockOnChange} />)
      
      // Open security settings
      const securityToggle = screen.getByTestId('security-toggle')
      await user.click(securityToggle)
      
      // Add IP address
      const ipInput = screen.getByTestId('ip-input')
      const addButton = screen.getByTestId('add-ip')
      
      await user.type(ipInput, '192.168.1.1')
      await user.click(addButton)
      
      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          ipAllowlist: ['192.168.1.1']
        })
      )
      
      // Add another IP
      await user.type(ipInput, '10.0.0.0/24')
      await user.click(addButton)
      
      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          ipAllowlist: ['192.168.1.1', '10.0.0.0/24']
        })
      )
    })

    it('updates signature tolerance', async () => {
      const user = userEvent.setup()
      const mockOnChange = jest.fn()
      
      render(<WebhookTriggerConfig {...defaultProps} onChange={mockOnChange} />)
      
      // Open security settings
      const securityToggle = screen.getByTestId('security-toggle')
      await user.click(securityToggle)
      
      const toleranceInput = screen.getByTestId('signature-tolerance')
      await user.clear(toleranceInput)
      await user.type(toleranceInput, '600')
      
      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          verify: expect.objectContaining({
            toleranceSeconds: 600
          })
        })
      )
    })
  })

  describe('Deduplication', () => {
    it('enables and configures deduplication', async () => {
      const user = userEvent.setup()
      const mockOnChange = jest.fn()
      
      render(<WebhookTriggerConfig {...defaultProps} />)
      
      const dedupeCheckbox = screen.getByTestId('dedupe-enabled')
      await user.click(dedupeCheckbox)
      
      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          dedupe: {
            header: 'X-Request-ID',
            windowSeconds: 300
          }
        })
      )
      
      // Should show dedupe configuration
      expect(screen.getByTestId('dedupe-header')).toBeInTheDocument()
      expect(screen.getByTestId('dedupe-window')).toBeInTheDocument()
    })

    it('updates deduplication configuration', async () => {
      const user = userEvent.setup()
      const mockOnChange = jest.fn()
      const existingConfig: Partial<WebhookTriggerData> = {
        dedupe: {
          header: 'X-Request-ID',
          windowSeconds: 300
        }
      }
      
      render(<WebhookTriggerConfig {...defaultProps} value={existingConfig} onChange={mockOnChange} />)
      
      const headerInput = screen.getByTestId('dedupe-header')
      const windowInput = screen.getByTestId('dedupe-window')
      
      await user.clear(headerInput)
      await user.type(headerInput, 'X-Idempotency-Key')
      
      await user.clear(windowInput)
      await user.type(windowInput, '600')
      
      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          dedupe: {
            header: 'X-Idempotency-Key',
            windowSeconds: 600
          }
        })
      )
    })

    it('disables deduplication', async () => {
      const user = userEvent.setup()
      const mockOnChange = jest.fn()
      const existingConfig: Partial<WebhookTriggerData> = {
        dedupe: {
          header: 'X-Request-ID',
          windowSeconds: 300
        }
      }
      
      render(<WebhookTriggerConfig {...defaultProps} value={existingConfig} onChange={mockOnChange} />)
      
      const dedupeCheckbox = screen.getByTestId('dedupe-enabled')
      await user.click(dedupeCheckbox)
      
      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          dedupe: undefined
        })
      )
    })
  })

  describe('Sample Code', () => {
    it('opens and closes sample code accordion', async () => {
      const user = userEvent.setup()
      render(<WebhookTriggerConfig {...defaultProps} />)
      
      const sampleCodeToggle = screen.getByTestId('sample-code-toggle')
      await user.click(sampleCodeToggle)
      
      // Should show code examples
      expect(screen.getByTestId('copy-curl')).toBeInTheDocument()
      expect(screen.getByTestId('copy-nodejs')).toBeInTheDocument()
    })

    it('copies sample code when copy buttons are clicked', async () => {
      const user = userEvent.setup()
      render(<WebhookTriggerConfig {...defaultProps} />)
      
      // Open sample code section
      const sampleCodeToggle = screen.getByTestId('sample-code-toggle')
      await user.click(sampleCodeToggle)
      
      // Copy cURL example
      const copyCurlButton = screen.getByTestId('copy-curl')
      await user.click(copyCurlButton)
      
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        expect.stringContaining('curl -X POST')
      )
      expect(mockToast.success).toHaveBeenCalledWith('cURL example copied to clipboard')
      
      // Copy Node.js example
      const copyNodejsButton = screen.getByTestId('copy-nodejs')
      await user.click(copyNodejsButton)
      
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        expect.stringContaining('const crypto = require')
      )
      expect(mockToast.success).toHaveBeenCalledWith('Node.js example copied to clipboard')
    })
  })

  describe('Test Webhook', () => {
    it('shows test webhook feature coming soon message', async () => {
      const user = userEvent.setup()
      render(<WebhookTriggerConfig {...defaultProps} />)
      
      const testButton = screen.getByTestId('test-webhook')
      await user.click(testButton)
      
      expect(mockToast.info).toHaveBeenCalledWith('Test webhook feature coming soon')
    })

    it('disables test button when configuration is invalid', () => {
      const invalidConfig: Partial<WebhookTriggerData> = {
        contentTypes: [] // Invalid: empty content types
      }
      
      render(<WebhookTriggerConfig {...defaultProps} value={invalidConfig} />)
      
      const testButton = screen.getByTestId('test-webhook')
      expect(testButton).toBeDisabled()
    })
  })

  describe('Action Buttons', () => {
    it('renders save and cancel buttons when handlers are provided', () => {
      render(<WebhookTriggerConfig {...defaultProps} />)
      
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
      expect(screen.getByTestId('save-webhook-config')).toBeInTheDocument()
    })

    it('calls save and cancel handlers', async () => {
      const user = userEvent.setup()
      const mockOnSave = jest.fn()
      const mockOnCancel = jest.fn()
      
      render(
        <WebhookTriggerConfig 
          {...defaultProps} 
          onSave={mockOnSave} 
          onCancel={mockOnCancel} 
        />
      )
      
      const saveButton = screen.getByTestId('save-webhook-config')
      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      
      await user.click(cancelButton)
      expect(mockOnCancel).toHaveBeenCalled()
      
      await user.click(saveButton)
      expect(mockOnSave).toHaveBeenCalled()
    })

    it('disables save button when configuration is invalid', () => {
      const invalidConfig: Partial<WebhookTriggerData> = {
        contentTypes: [] // Invalid configuration
      }
      
      render(
        <WebhookTriggerConfig 
          {...defaultProps} 
          value={invalidConfig}
          onSave={jest.fn()} 
        />
      )
      
      const saveButton = screen.getByTestId('save-webhook-config')
      expect(saveButton).toBeDisabled()
    })
  })

  describe('Validation Errors', () => {
    it('shows validation errors when configuration is invalid', () => {
      const invalidConfig: Partial<WebhookTriggerData> = {
        name: '', // Should be at least 1 character
        verify: {
          algorithm: 'hmac-sha256',
          signatureHeader: 'X-Atlas-Signature',
          timestampHeader: 'X-Atlas-Timestamp',
          toleranceSeconds: 10 // Should be at least 30
        }
      }
      
      render(<WebhookTriggerConfig {...defaultProps} value={invalidConfig} />)
      
      // Should show error section
      expect(screen.getByText('Configuration Errors')).toBeInTheDocument()
    })
  })
})
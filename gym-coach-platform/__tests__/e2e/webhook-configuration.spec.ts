import { test, expect } from '@playwright/test'
import { createHmac } from 'crypto'

test.describe('Webhook Trigger Configuration', () => {
  let workflowId: string
  let nodeId: string
  
  test.beforeEach(async ({ page }) => {
    // Mock authentication and navigate to automations builder
    await page.goto('/dashboard/automations')
    
    // Create a new automation workflow for testing
    await page.click('[data-testid="create-automation"]')
    await page.fill('[data-testid="workflow-name"]', 'Test Webhook Automation')
    await page.click('[data-testid="save-workflow"]')
    
    // Extract workflow ID from URL or page data
    workflowId = 'test-workflow-' + Date.now()
    nodeId = 'webhook-node-' + Date.now()
    
    // Navigate to webhook trigger configuration
    await page.click('[data-testid="add-trigger"]')
    await page.click('[data-testid="webhook-trigger"]')
  })

  test.describe('Initial Configuration', () => {
    test('displays webhook configuration interface', async ({ page }) => {
      // Verify main UI elements are present
      await expect(page.getByTestId('webhook-name')).toBeVisible()
      await expect(page.getByTestId('webhook-description')).toBeVisible()
      await expect(page.getByTestId('webhook-endpoint')).toBeVisible()
      await expect(page.getByTestId('webhook-secret')).toBeVisible()
      
      // Verify action buttons
      await expect(page.getByTestId('copy-endpoint')).toBeVisible()
      await expect(page.getByTestId('rotate-secret')).toBeVisible()
      await expect(page.getByTestId('toggle-secret-visibility')).toBeVisible()
      
      // Verify toggles
      await expect(page.getByTestId('pause-intake')).toBeVisible()
      await expect(page.getByTestId('webhook-active')).toBeVisible()
      
      // Verify content type options
      await expect(page.getByTestId('json-content-type')).toBeVisible()
      await expect(page.getByTestId('form-content-type')).toBeVisible()
    })

    test('shows correct endpoint URL format', async ({ page }) => {
      const endpointInput = page.getByTestId('webhook-endpoint')
      const endpointValue = await endpointInput.inputValue()
      
      expect(endpointValue).toMatch(/^https?:\/\/.*\/api\/automations\/webhooks\/.*\/.*$/)
      expect(endpointValue).toContain('/api/automations/webhooks/')
    })

    test('initializes with default settings', async ({ page }) => {
      // Verify default toggle states
      await expect(page.getByTestId('webhook-active')).toBeChecked()
      await expect(page.getByTestId('pause-intake')).not.toBeChecked()
      
      // Verify default content type selection
      await expect(page.getByTestId('json-content-type')).toBeChecked()
      await expect(page.getByTestId('form-content-type')).not.toBeChecked()
      
      // Verify secret is initially masked
      const secretInput = page.getByTestId('webhook-secret')
      const secretValue = await secretInput.inputValue()
      expect(secretValue).toMatch(/^\*\*\*\*/)
    })
  })

  test.describe('Basic Configuration', () => {
    test('allows updating name and description', async ({ page }) => {
      await page.fill('[data-testid="webhook-name"]', 'User Signup Webhook')
      await page.fill('[data-testid="webhook-description"]', 'Processes user signup events from external systems')
      
      // Verify values are updated
      await expect(page.getByTestId('webhook-name')).toHaveValue('User Signup Webhook')
      await expect(page.getByTestId('webhook-description')).toHaveValue('Processes user signup events from external systems')
    })

    test('toggles webhook states correctly', async ({ page }) => {
      // Toggle pause state
      await page.click('[data-testid="pause-intake"]')
      await expect(page.getByTestId('pause-intake')).toBeChecked()
      
      // Toggle active state
      await page.click('[data-testid="webhook-active"]')
      await expect(page.getByTestId('webhook-active')).not.toBeChecked()
      
      // Toggle back
      await page.click('[data-testid="pause-intake"]')
      await page.click('[data-testid="webhook-active"]')
      await expect(page.getByTestId('pause-intake')).not.toBeChecked()
      await expect(page.getByTestId('webhook-active')).toBeChecked()
    })

    test('manages content types selection', async ({ page }) => {
      // Initially only JSON should be selected
      await expect(page.getByTestId('json-content-type')).toBeChecked()
      await expect(page.getByTestId('form-content-type')).not.toBeChecked()
      
      // Add form data content type
      await page.click('[data-testid="form-content-type"]')
      await expect(page.getByTestId('form-content-type')).toBeChecked()
      
      // Both should now be selected
      await expect(page.getByTestId('json-content-type')).toBeChecked()
      await expect(page.getByTestId('form-content-type')).toBeChecked()
      
      // Try to uncheck JSON (should not be possible - at least one must remain)
      await page.click('[data-testid="json-content-type"]')
      await expect(page.getByTestId('json-content-type')).toBeChecked() // Should still be checked
    })
  })

  test.describe('Copy Functionality', () => {
    test('copies endpoint URL to clipboard', async ({ page, context }) => {
      // Grant clipboard permissions
      await context.grantPermissions(['clipboard-write', 'clipboard-read'])
      
      await page.click('[data-testid="copy-endpoint"]')
      
      // Verify success notification
      await expect(page.getByText('Webhook endpoint copied to clipboard')).toBeVisible()
      
      // Verify clipboard content
      const clipboardContent = await page.evaluate(() => navigator.clipboard.readText())
      expect(clipboardContent).toContain('/api/automations/webhooks/')
    })

    test('copies webhook secret when revealed', async ({ page, context }) => {
      await context.grantPermissions(['clipboard-write', 'clipboard-read'])
      
      // First reveal the secret
      await page.click('[data-testid="toggle-secret-visibility"]')
      
      // Then copy it
      await page.click('[data-testid="copy-secret"]')
      
      // Verify success notification
      await expect(page.getByText('Webhook secret copied to clipboard')).toBeVisible()
      
      // Verify clipboard content starts with webhook secret prefix
      const clipboardContent = await page.evaluate(() => navigator.clipboard.readText())
      expect(clipboardContent).toMatch(/^wh_/)
    })

    test('disables copy secret button when secret is hidden', async ({ page }) => {
      // Secret should be hidden by default
      const copySecretButton = page.getByTestId('copy-secret')
      await expect(copySecretButton).toBeDisabled()
      
      // Reveal secret
      await page.click('[data-testid="toggle-secret-visibility"]')
      await expect(copySecretButton).not.toBeDisabled()
      
      // Hide again
      await page.click('[data-testid="toggle-secret-visibility"]')
      await expect(copySecretButton).toBeDisabled()
    })
  })

  test.describe('Secret Management', () => {
    test('toggles secret visibility', async ({ page }) => {
      const secretInput = page.getByTestId('webhook-secret')
      
      // Initially hidden
      const hiddenValue = await secretInput.inputValue()
      expect(hiddenValue).toMatch(/^\*\*\*\*/)
      
      // Reveal secret
      await page.click('[data-testid="toggle-secret-visibility"]')
      const revealedValue = await secretInput.inputValue()
      expect(revealedValue).toMatch(/^wh_/)
      
      // Hide again
      await page.click('[data-testid="toggle-secret-visibility"]')
      const hiddenAgainValue = await secretInput.inputValue()
      expect(hiddenAgainValue).toMatch(/^\*\*\*\*/)
    })

    test('rotates webhook secret successfully', async ({ page }) => {
      // Mock the rotate secret API call
      await page.route('**/rotate-secret', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            secretId: 'new-secret-id',
            last4: 'xyz9',
            revealToken: 'reveal-token-123',
            expiresAt: new Date(Date.now() + 300000).toISOString()
          })
        })
      })
      
      // Get initial secret last4
      const initialSecretValue = await page.getByTestId('webhook-secret').inputValue()
      
      // Rotate secret
      await page.click('[data-testid="rotate-secret"]')
      
      // Verify success notification
      await expect(page.getByText('Webhook secret rotated successfully')).toBeVisible()
      
      // Verify secret is auto-revealed after rotation
      const newSecretValue = await page.getByTestId('webhook-secret').inputValue()
      expect(newSecretValue).toMatch(/^wh_/)
      expect(newSecretValue).not.toBe(initialSecretValue)
    })

    test('handles secret rotation failure', async ({ page }) => {
      // Mock failed rotate secret API call
      await page.route('**/rotate-secret', async route => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Internal server error'
          })
        })
      })
      
      await page.click('[data-testid="rotate-secret"]')
      
      // Verify error notification
      await expect(page.getByText('Failed to rotate webhook secret')).toBeVisible()
    })

    test('shows loading state during secret rotation', async ({ page }) => {
      // Slow down the API call to test loading state
      await page.route('**/rotate-secret', async route => {
        await new Promise(resolve => setTimeout(resolve, 1000)) // 1 second delay
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            secretId: 'new-secret-id',
            last4: 'xyz9'
          })
        })
      })
      
      const rotateButton = page.getByTestId('rotate-secret')
      await rotateButton.click()
      
      // Verify loading state (disabled button)
      await expect(rotateButton).toBeDisabled()
      
      // Wait for completion
      await expect(page.getByText('Webhook secret rotated successfully')).toBeVisible()
      await expect(rotateButton).not.toBeDisabled()
    })
  })

  test.describe('Security Settings', () => {
    test('opens and configures IP allowlist', async ({ page }) => {
      // Open security settings
      await page.click('[data-testid="security-toggle"]')
      
      // Verify security settings are visible
      await expect(page.getByTestId('ip-input')).toBeVisible()
      await expect(page.getByTestId('add-ip')).toBeVisible()
      
      // Add IP addresses
      await page.fill('[data-testid="ip-input"]', '192.168.1.100')
      await page.click('[data-testid="add-ip"]')
      
      // Verify IP was added
      await expect(page.getByText('192.168.1.100')).toBeVisible()
      
      // Add CIDR range
      await page.fill('[data-testid="ip-input"]', '10.0.0.0/24')
      await page.click('[data-testid="add-ip"]')
      
      // Verify CIDR range was added
      await expect(page.getByText('10.0.0.0/24')).toBeVisible()
    })

    test('removes IP addresses from allowlist', async ({ page }) => {
      // Open security settings and add IPs
      await page.click('[data-testid="security-toggle"]')
      await page.fill('[data-testid="ip-input"]', '192.168.1.100')
      await page.click('[data-testid="add-ip"]')
      await page.fill('[data-testid="ip-input"]', '192.168.1.101')
      await page.click('[data-testid="add-ip"]')
      
      // Verify both IPs are present
      await expect(page.getByText('192.168.1.100')).toBeVisible()
      await expect(page.getByText('192.168.1.101')).toBeVisible()
      
      // Remove first IP
      await page.click('[data-testid="remove-ip-0"]')
      
      // Verify first IP is removed, second remains
      await expect(page.getByText('192.168.1.100')).not.toBeVisible()
      await expect(page.getByText('192.168.1.101')).toBeVisible()
    })

    test('configures signature tolerance', async ({ page }) => {
      await page.click('[data-testid="security-toggle"]')
      
      const toleranceInput = page.getByTestId('signature-tolerance')
      
      // Verify default value
      await expect(toleranceInput).toHaveValue('300')
      
      // Update tolerance
      await toleranceInput.fill('600')
      await expect(toleranceInput).toHaveValue('600')
    })
  })

  test.describe('Deduplication Settings', () => {
    test('enables and configures deduplication', async ({ page }) => {
      // Enable deduplication
      await page.click('[data-testid="dedupe-enabled"]')
      
      // Verify configuration options appear
      await expect(page.getByTestId('dedupe-header')).toBeVisible()
      await expect(page.getByTestId('dedupe-window')).toBeVisible()
      
      // Verify default values
      await expect(page.getByTestId('dedupe-header')).toHaveValue('X-Request-ID')
      await expect(page.getByTestId('dedupe-window')).toHaveValue('300')
      
      // Update configuration
      await page.fill('[data-testid="dedupe-header"]', 'X-Idempotency-Key')
      await page.fill('[data-testid="dedupe-window"]', '600')
      
      // Verify updated values
      await expect(page.getByTestId('dedupe-header')).toHaveValue('X-Idempotency-Key')
      await expect(page.getByTestId('dedupe-window')).toHaveValue('600')
    })

    test('disables deduplication and hides configuration', async ({ page }) => {
      // Enable first
      await page.click('[data-testid="dedupe-enabled"]')
      await expect(page.getByTestId('dedupe-header')).toBeVisible()
      
      // Disable
      await page.click('[data-testid="dedupe-enabled"]')
      await expect(page.getByTestId('dedupe-header')).not.toBeVisible()
    })
  })

  test.describe('Sample Code', () => {
    test('displays and copies sample cURL command', async ({ page, context }) => {
      await context.grantPermissions(['clipboard-write', 'clipboard-read'])
      
      // Open sample code section
      await page.click('[data-testid="sample-code-toggle"]')
      
      // Verify code examples are visible
      await expect(page.getByTestId('copy-curl')).toBeVisible()
      await expect(page.getByTestId('copy-nodejs')).toBeVisible()
      
      // Copy cURL example
      await page.click('[data-testid="copy-curl"]')
      await expect(page.getByText('cURL example copied to clipboard')).toBeVisible()
      
      // Verify clipboard content
      const clipboardContent = await page.evaluate(() => navigator.clipboard.readText())
      expect(clipboardContent).toContain('curl -X POST')
      expect(clipboardContent).toContain('X-Atlas-Signature')
      expect(clipboardContent).toContain('X-Atlas-Timestamp')
    })

    test('displays and copies sample Node.js code', async ({ page, context }) => {
      await context.grantPermissions(['clipboard-write', 'clipboard-read'])
      
      await page.click('[data-testid="sample-code-toggle"]')
      await page.click('[data-testid="copy-nodejs"]')
      
      await expect(page.getByText('Node.js example copied to clipboard')).toBeVisible()
      
      const clipboardContent = await page.evaluate(() => navigator.clipboard.readText())
      expect(clipboardContent).toContain('const crypto = require')
      expect(clipboardContent).toContain('createHmac')
      expect(clipboardContent).toContain('fetch(')
    })
  })

  test.describe('Configuration Persistence', () => {
    test('saves and reloads webhook configuration', async ({ page }) => {
      // Configure webhook
      await page.fill('[data-testid="webhook-name"]', 'Persistent Webhook')
      await page.fill('[data-testid="webhook-description"]', 'Test persistence')
      await page.click('[data-testid="form-content-type"]') // Add form content type
      await page.click('[data-testid="pause-intake"]') // Pause webhook
      
      // Enable deduplication
      await page.click('[data-testid="dedupe-enabled"]')
      await page.fill('[data-testid="dedupe-header"]', 'X-Custom-ID')
      
      // Add IP allowlist
      await page.click('[data-testid="security-toggle"]')
      await page.fill('[data-testid="ip-input"]', '203.0.113.42')
      await page.click('[data-testid="add-ip"]')
      
      // Save configuration
      await page.click('[data-testid="save-webhook-config"]')
      await expect(page.getByText('Configuration saved successfully')).toBeVisible()
      
      // Reload page
      await page.reload()
      
      // Verify configuration persisted
      await expect(page.getByTestId('webhook-name')).toHaveValue('Persistent Webhook')
      await expect(page.getByTestId('webhook-description')).toHaveValue('Test persistence')
      await expect(page.getByTestId('form-content-type')).toBeChecked()
      await expect(page.getByTestId('pause-intake')).toBeChecked()
      await expect(page.getByTestId('dedupe-enabled')).toBeChecked()
      await expect(page.getByTestId('dedupe-header')).toHaveValue('X-Custom-ID')
      
      // Check IP allowlist
      await page.click('[data-testid="security-toggle"]')
      await expect(page.getByText('203.0.113.42')).toBeVisible()
    })

    test('validates configuration before saving', async ({ page }) => {
      // Try to save with invalid configuration (empty content types)
      await page.click('[data-testid="json-content-type"]') // Remove the only content type
      
      // Save button should be disabled
      await expect(page.getByTestId('save-webhook-config')).toBeDisabled()
      
      // Re-enable a content type
      await page.click('[data-testid="json-content-type"]')
      await expect(page.getByTestId('save-webhook-config')).not.toBeDisabled()
    })
  })

  test.describe('Test Functionality', () => {
    test('shows test webhook placeholder', async ({ page }) => {
      await page.click('[data-testid="test-webhook"]')
      await expect(page.getByText('Test webhook feature coming soon')).toBeVisible()
    })

    test('disables test button with invalid configuration', async ({ page }) => {
      // Make configuration invalid
      await page.click('[data-testid="json-content-type"]') // Remove content type
      
      // Test button should be disabled
      await expect(page.getByTestId('test-webhook')).toBeDisabled()
    })
  })

  test.describe('Action Buttons', () => {
    test('handles cancel action', async ({ page }) => {
      // Make some changes
      await page.fill('[data-testid="webhook-name"]', 'Cancelled Webhook')
      
      // Cancel
      await page.click('text=Cancel')
      
      // Should navigate away or reset form
      // Implementation depends on your specific navigation logic
    })

    test('saves configuration successfully', async ({ page }) => {
      // Mock the save API call
      await page.route('**/webhook-config', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true })
        })
      })
      
      await page.fill('[data-testid="webhook-name"]', 'Saved Webhook')
      await page.click('[data-testid="save-webhook-config"]')
      
      await expect(page.getByText(/saved|success/i)).toBeVisible()
    })
  })
})
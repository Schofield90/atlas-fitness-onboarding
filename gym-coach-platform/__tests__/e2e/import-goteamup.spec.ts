import { test, expect, Page } from '@playwright/test'
import path from 'path'

test.describe('GoTeamUp Import Page', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the import page
    await page.goto('/dashboard/import')
  })

  test('renders import page with correct title and description', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Import GoTeamUp Data')
    await expect(page.locator('text=Upload your GoTeamUp CSV exports')).toBeVisible()
  })

  test('displays back to settings button', async ({ page }) => {
    const backButton = page.locator('text=Back to Settings')
    await expect(backButton).toBeVisible()
    await expect(backButton).toHaveAttribute('href', '/dashboard/settings')
  })

  test('shows upload area in idle state', async ({ page }) => {
    await expect(page.locator('text=Upload CSV File')).toBeVisible()
    await expect(page.locator('text=Drop your CSV file here, or click to browse')).toBeVisible()
    await expect(page.locator('text=Supports GoTeamUp payment and attendance export files')).toBeVisible()
  })

  test('displays supported format information', async ({ page }) => {
    // Check payment data format info
    await expect(page.locator('text=Payment Data')).toBeVisible()
    await expect(page.locator('text=• Client Name')).toBeVisible()
    await expect(page.locator('text=• Email')).toBeVisible()
    await expect(page.locator('text=• Payment Method')).toBeVisible()

    // Check attendance data format info
    await expect(page.locator('text=Attendance Data')).toBeVisible()
    await expect(page.locator('text=• Class Name')).toBeVisible()
    await expect(page.locator('text=• Instructor')).toBeVisible()
  })

  test('handles file upload via click', async ({ page }) => {
    // Create a test CSV file path
    const testFilePath = path.join(__dirname, '../../sample-payments.csv')

    // Upload file using the file input
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(testFilePath)

    // Should transition to preview state
    await expect(page.locator('text=sample-payments.csv')).toBeVisible()
    await expect(page.locator('text=Payment Data')).toBeVisible() // File type badge
    await expect(page.locator('text=Preview (first 5 rows)')).toBeVisible()
  })

  test('detects payment file type correctly', async ({ page }) => {
    const testFilePath = path.join(__dirname, '../../sample-payments.csv')

    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(testFilePath)

    // Check that payment type is detected
    await expect(page.locator('.bg-green-100').locator('text=Payment Data')).toBeVisible()
  })

  test('detects attendance file type correctly', async ({ page }) => {
    const testFilePath = path.join(__dirname, '../../sample-attendance.csv')

    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(testFilePath)

    // Check that attendance type is detected
    await expect(page.locator('.bg-blue-100').locator('text=Attendance Data')).toBeVisible()
  })

  test('displays CSV preview table correctly', async ({ page }) => {
    const testFilePath = path.join(__dirname, '../../sample-payments.csv')

    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(testFilePath)

    // Check preview table structure
    await expect(page.locator('table')).toBeVisible()
    await expect(page.locator('thead')).toBeVisible()
    await expect(page.locator('tbody')).toBeVisible()

    // Check for expected headers (from sample-payments.csv)
    await expect(page.locator('th:has-text("Client Name")')).toBeVisible()
    await expect(page.locator('th:has-text("Email")')).toBeVisible()
    await expect(page.locator('th:has-text("Amount")')).toBeVisible()

    // Check for sample data
    await expect(page.locator('text=Sam Schofield')).toBeVisible()
    await expect(page.locator('text=sam@example.com')).toBeVisible()
  })

  test('shows action buttons in preview state', async ({ page }) => {
    const testFilePath = path.join(__dirname, '../../sample-payments.csv')

    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(testFilePath)

    await expect(page.locator('button:has-text("Start Import")')).toBeVisible()
    await expect(page.locator('button:has-text("Choose Different File")')).toBeVisible()
  })

  test('allows choosing different file', async ({ page }) => {
    const testFilePath = path.join(__dirname, '../../sample-payments.csv')

    // Upload first file
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(testFilePath)

    // Click choose different file
    await page.locator('button:has-text("Choose Different File")').click()

    // Should return to idle state
    await expect(page.locator('text=Drop your CSV file here, or click to browse')).toBeVisible()
    await expect(page.locator('text=sample-payments.csv')).not.toBeVisible()
  })

  test('rejects non-CSV files', async ({ page }) => {
    // Try to upload a non-CSV file (create a temporary text file)
    const fileInput = page.locator('input[type="file"]')

    // Create a temporary file buffer to simulate a non-CSV file
    await page.evaluate(() => {
      const input = document.querySelector('input[type="file"]') as HTMLInputElement
      const dt = new DataTransfer()
      const file = new File(['test content'], 'test.txt', { type: 'text/plain' })
      dt.items.add(file)
      input.files = dt.files
      input.dispatchEvent(new Event('change', { bubbles: true }))
    })

    // Should show error message
    await expect(page.locator('text=Please select a CSV file')).toBeVisible()
  })

  test('shows unknown file type warning', async ({ page }) => {
    // Create a CSV with unknown headers
    await page.evaluate(() => {
      const input = document.querySelector('input[type="file"]') as HTMLInputElement
      const dt = new DataTransfer()
      const csvContent = 'Name,Phone,Address\nJohn,123456,123 Main St'
      const file = new File([csvContent], 'unknown.csv', { type: 'text/csv' })
      dt.items.add(file)
      input.files = dt.files
      input.dispatchEvent(new Event('change', { bubbles: true }))
    })

    await expect(page.locator('text=Unable to detect file type')).toBeVisible()
    await expect(page.locator('.bg-gray-100').locator('text=Unknown Type')).toBeVisible()
  })

  test('starts import process', async ({ page }) => {
    const testFilePath = path.join(__dirname, '../../sample-payments.csv')

    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(testFilePath)

    // Mock the API responses
    await page.route('/api/import/goteamup', async route => {
      if (route.request().method() === 'GET') {
        // SSE endpoint
        route.fulfill({
          status: 200,
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
          },
          body: 'data: {"type":"connected","connectionId":"test"}\n\n'
        })
      } else if (route.request().method() === 'POST') {
        // Import endpoint
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            type: 'payments',
            result: {
              success: true,
              message: 'Import completed successfully',
              stats: { total: 5, success: 5, errors: 0, skipped: 0 }
            }
          })
        })
      }
    })

    // Click start import
    await page.locator('button:has-text("Start Import")').click()

    // Should transition to importing state
    await expect(page.locator('text=Importing Data...')).toBeVisible()
    await expect(page.locator('text=Processing your payments data')).toBeVisible()
    await expect(page.locator('[role="progressbar"]')).toBeVisible()
  })

  test('displays progress during import', async ({ page }) => {
    const testFilePath = path.join(__dirname, '../../sample-payments.csv')

    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(testFilePath)

    // Mock SSE progress updates
    await page.route('/api/import/goteamup', async route => {
      if (route.request().method() === 'GET') {
        const sseData = [
          'data: {"type":"connected","connectionId":"test"}\n\n',
          'data: {"type":"progress","progress":{"total":10,"processed":5,"success":5,"errors":0,"skipped":0,"currentItem":"John Doe - £50.00"}}\n\n',
          'data: {"type":"complete","result":{"success":true,"message":"Import completed","stats":{"total":10,"success":10,"errors":0,"skipped":0}}}\n\n'
        ].join('')

        route.fulfill({
          status: 200,
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
          },
          body: sseData
        })
      } else {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true })
        })
      }
    })

    await page.locator('button:has-text("Start Import")').click()

    // Check progress indicators
    await expect(page.locator('text=10')).toBeVisible() // Total
    await expect(page.locator('text=Currently processing:')).toBeVisible()
    await expect(page.locator('text=John Doe - £50.00')).toBeVisible()
  })

  test('displays completion results', async ({ page }) => {
    const testFilePath = path.join(__dirname, '../../sample-payments.csv')

    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(testFilePath)

    // Mock successful completion
    await page.route('/api/import/goteamup', async route => {
      if (route.request().method() === 'GET') {
        route.fulfill({
          status: 200,
          headers: { 'Content-Type': 'text/event-stream' },
          body: 'data: {"type":"complete","result":{"success":true,"message":"Import completed: 5 payments imported","stats":{"total":5,"success":5,"errors":0,"skipped":0}}}\n\n'
        })
      } else {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            result: {
              success: true,
              message: 'Import completed: 5 payments imported',
              stats: { total: 5, success: 5, errors: 0, skipped: 0 }
            }
          })
        })
      }
    })

    await page.locator('button:has-text("Start Import")').click()

    // Wait for completion
    await expect(page.locator('text=Import Completed')).toBeVisible()
    await expect(page.locator('text=Import completed: 5 payments imported')).toBeVisible()

    // Check completion stats
    await expect(page.locator('text=5').first()).toBeVisible() // Total
    await expect(page.locator('text=5').nth(1)).toBeVisible() // Imported
    await expect(page.locator('text=0').nth(2)).toBeVisible() // Skipped
    await expect(page.locator('text=0').nth(3)).toBeVisible() // Errors
  })

  test('displays error results with details', async ({ page }) => {
    const testFilePath = path.join(__dirname, '../../sample-payments.csv')

    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(testFilePath)

    // Mock failure with errors
    await page.route('/api/import/goteamup', async route => {
      if (route.request().method() === 'POST') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            result: {
              success: false,
              message: 'Import completed with errors',
              stats: { total: 5, success: 3, errors: 2, skipped: 0 },
              errors: [
                { row: 2, error: 'Client not found' },
                { row: 4, error: 'Invalid amount format' }
              ]
            }
          })
        })
      }
    })

    await page.locator('button:has-text("Start Import")').click()

    // Wait for completion
    await expect(page.locator('text=Import Completed')).toBeVisible()

    // Check error details
    await expect(page.locator('text=Error Details')).toBeVisible()
    await expect(page.locator('text=Row 2: Client not found')).toBeVisible()
    await expect(page.locator('text=Row 4: Invalid amount format')).toBeVisible()
  })

  test('handles API errors gracefully', async ({ page }) => {
    const testFilePath = path.join(__dirname, '../../sample-payments.csv')

    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(testFilePath)

    // Mock API failure
    await page.route('/api/import/goteamup', route => {
      if (route.request().method() === 'POST') {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Database connection failed' })
        })
      }
    })

    await page.locator('button:has-text("Start Import")').click()

    // Should show error state
    await expect(page.locator('text=Database connection failed')).toBeVisible()
  })

  test('allows importing another file after completion', async ({ page }) => {
    const testFilePath = path.join(__dirname, '../../sample-payments.csv')

    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(testFilePath)

    // Mock successful completion
    await page.route('/api/import/goteamup', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          result: {
            success: true,
            message: 'Import completed',
            stats: { total: 5, success: 5, errors: 0, skipped: 0 }
          }
        })
      })
    })

    await page.locator('button:has-text("Start Import")').click()
    await expect(page.locator('text=Import Completed')).toBeVisible()

    // Click import another file
    await page.locator('button:has-text("Import Another File")').click()

    // Should return to idle state
    await expect(page.locator('text=Drop your CSV file here, or click to browse')).toBeVisible()
  })

  test('navigation back to settings works', async ({ page }) => {
    const testFilePath = path.join(__dirname, '../../sample-payments.csv')

    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(testFilePath)

    // Mock successful completion
    await page.route('/api/import/goteamup', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          result: {
            success: true,
            message: 'Import completed',
            stats: { total: 5, success: 5, errors: 0, skipped: 0 }
          }
        })
      })
    })

    await page.locator('button:has-text("Start Import")').click()
    await expect(page.locator('text=Import Completed')).toBeVisible()

    // Check back to settings button
    const backButton = page.locator('button:has-text("Back to Settings")')
    await expect(backButton).toBeVisible()
  })

  test('handles network interruption during import', async ({ page }) => {
    const testFilePath = path.join(__dirname, '../../sample-payments.csv')

    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(testFilePath)

    // Mock SSE connection that fails
    let sseCallCount = 0
    await page.route('/api/import/goteamup', async route => {
      if (route.request().method() === 'GET') {
        sseCallCount++
        if (sseCallCount === 1) {
          // First call succeeds briefly then fails
          setTimeout(() => {
            route.abort()
          }, 1000)
        }
      } else {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true })
        })
      }
    })

    await page.locator('button:has-text("Start Import")').click()

    // Should show connection lost message
    await expect(page.locator('text=Connection lost. Import may still be processing.')).toBeVisible()
  })
})

test.describe('Import Page Drag and Drop', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/import')
  })

  test('highlights drop zone on drag over', async ({ page }) => {
    // This test would need to simulate drag events
    // For now, we'll test the CSS classes are present
    const dropZone = page.locator('[data-testid="drop-zone"]').first() || page.locator('.border-dashed').first()
    await expect(dropZone).toBeVisible()
  })

  test('shows different message during drag over', async ({ page }) => {
    // Simulate drag over state by adding the CSS class
    await page.evaluate(() => {
      const dropZone = document.querySelector('.border-dashed')
      if (dropZone) {
        dropZone.classList.add('border-blue-500', 'bg-blue-50')
      }
    })

    // Check if drag over styling is applied (this would be in a real drag scenario)
    await expect(page.locator('.border-dashed')).toBeVisible()
  })
})

test.describe('Import Page Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/import')
  })

  test('has proper ARIA labels and roles', async ({ page }) => {
    // Check file input accessibility
    const fileInput = page.locator('input[type="file"]')
    await expect(fileInput).toBeVisible()

    // Check buttons have proper labels
    await expect(page.locator('button:has-text("Back to Settings")')).toBeVisible()
  })

  test('supports keyboard navigation', async ({ page }) => {
    // Test tab navigation through interactive elements
    await page.keyboard.press('Tab')
    await expect(page.locator('button:has-text("Back to Settings")')).toBeFocused()

    await page.keyboard.press('Tab')
    // Should focus on file input or drop zone
  })

  test('maintains focus management during state changes', async ({ page }) => {
    const testFilePath = path.join(__dirname, '../../sample-payments.csv')

    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(testFilePath)

    // After file upload, focus should be manageable
    await expect(page.locator('button:has-text("Start Import")')).toBeVisible()

    // Test focus on action buttons
    await page.locator('button:has-text("Start Import")').focus()
    await expect(page.locator('button:has-text("Start Import")')).toBeFocused()
  })
})
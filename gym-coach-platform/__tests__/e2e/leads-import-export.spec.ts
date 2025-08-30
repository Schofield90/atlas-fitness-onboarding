import { test, expect, Page } from '@playwright/test'
import path from 'path'

// Test data files
const validCSVContent = `Name,Email,Phone,Status,Source,Notes
John Doe,john@test.com,+1234567890,warm,Website,"Interested in personal training"
Jane Smith,jane@test.com,+0987654321,hot,Facebook Ad,"Ready to join this week"
Bob Johnson,bob@test.com,,cold,Referral,"Needs follow up"`

const invalidCSVContent = `Name,Email,Phone,Status
John Doe,invalid-email,123456,invalid-status
,jane@test.com,789012,hot
Missing Name,missing@test.com,456789,warm`

const largeCsvContent = `Name,Email,Phone,Status,Source
${Array.from({ length: 100 }, (_, i) => 
  `User ${i},user${i}@test.com,+${i.toString().padStart(10, '0')},cold,Test Import`
).join('\n')}`

describe('Leads Import/Export E2E Tests', () => {
  let page: Page

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage()
    
    // Mock successful authentication
    await page.route('**/api/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'user-1',
          email: 'test@example.com',
          organization: { id: 'org-1', name: 'Test Gym' }
        })
      })
    })

    await page.goto('http://localhost:3005/dashboard/leads')
    await page.waitForLoadState('networkidle')
  })

  test.describe('Add Lead Functionality (Baseline)', () => {
    test('existing Add Lead button works correctly', async () => {
      // Test that existing Add Lead functionality is preserved
      await expect(page.getByText('Add Lead')).toBeVisible()
      
      await page.click('button:has-text("Add Lead")')
      
      // Should open the lead form modal
      await expect(page.getByText('Add New Lead')).toBeVisible()
      
      // Fill out the form
      await page.fill('input[name="name"]', 'Test User')
      await page.fill('input[name="email"]', 'test@example.com')
      await page.fill('input[name="phone"]', '+1234567890')
      await page.selectOption('select[name="status"]', 'warm')
      await page.fill('input[name="source"]', 'Manual Entry')
      
      // Mock the API response for creating a lead
      await page.route('**/api/leads', async (route) => {
        if (route.request().method() === 'POST') {
          await route.fulfill({
            status: 201,
            contentType: 'application/json',
            body: JSON.stringify({
              id: 'new-lead-id',
              name: 'Test User',
              email: 'test@example.com'
            })
          })
        }
      })
      
      await page.click('button[type="submit"]')
      
      // Should show success message and close modal
      await expect(page.getByText('Lead created successfully')).toBeVisible()
    })
  })

  test.describe('Import CSV Functionality', () => {
    test('opens import modal correctly', async () => {
      await expect(page.getByText('Import CSV')).toBeVisible()
      
      await page.click('button:has-text("Import CSV")')
      
      // Should open import modal
      await expect(page.getByText('Import Leads')).toBeVisible()
      await expect(page.getByText('Upload CSV')).toBeVisible()
      await expect(page.getByText('Download Template')).toBeVisible()
    })

    test('downloads sample template', async () => {
      await page.click('button:has-text("Import CSV")')
      
      // Start waiting for download before clicking
      const downloadPromise = page.waitForEvent('download')
      await page.click('button:has-text("Download Template")')
      
      const download = await downloadPromise
      expect(download.suggestedFilename()).toContain('.csv')
    })

    test('complete import workflow with valid CSV', async () => {
      // Mock API responses for the import process
      await page.route('**/api/leads', async (route) => {
        if (route.request().method() === 'GET') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              leads: [],
              pagination: { page: 1, limit: 10, total: 0, pages: 0 }
            })
          })
        }
      })

      await page.route('**/api/leads/import', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            imported: 3,
            failed: 0,
            errors: [],
            message: 'Successfully imported all 3 leads'
          })
        })
      })

      await page.click('button:has-text("Import CSV")')

      // Create a temporary CSV file
      const csvBuffer = Buffer.from(validCSVContent)
      
      // Upload file
      const fileInput = page.locator('input[type="file"]')
      await fileInput.setInputFiles({
        name: 'test-leads.csv',
        mimeType: 'text/csv',
        buffer: csvBuffer
      })

      // Should advance to mapping step
      await expect(page.getByText('Map Fields')).toBeVisible()
      await expect(page.getByText('Map CSV Columns to Lead Fields')).toBeVisible()

      // Map fields
      await page.selectOption('select:near(:text("Name *"))', 'Name')
      await page.selectOption('select:near(:text("Email *"))', 'Email')
      await page.selectOption('select:near(:text("Phone"))', 'Phone')
      await page.selectOption('select:near(:text("Status"))', 'Status')
      await page.selectOption('select:near(:text("Source"))', 'Source')
      await page.selectOption('select:near(:text("Notes"))', 'Notes')

      await page.click('button:has-text("Next: Preview")')

      // Should advance to preview step
      await expect(page.getByText('Import Summary')).toBeVisible()
      await expect(page.getByText('3')).toBeVisible() // Total rows
      await expect(page.getByText('Valid Leads')).toBeVisible()

      // Complete import
      await page.click('button:has-text("Import")')

      // Should show success message
      await expect(page.getByText('Successfully imported all 3 leads')).toBeVisible()
    })

    test('handles invalid CSV data with validation errors', async () => {
      await page.click('button:has-text("Import CSV")')

      const csvBuffer = Buffer.from(invalidCSVContent)
      
      const fileInput = page.locator('input[type="file"]')
      await fileInput.setInputFiles({
        name: 'invalid-leads.csv',
        mimeType: 'text/csv',
        buffer: csvBuffer
      })

      // Map fields
      await page.selectOption('select:near(:text("Name *"))', 'Name')
      await page.selectOption('select:near(:text("Email *"))', 'Email')
      await page.selectOption('select:near(:text("Phone"))', 'Phone')
      await page.selectOption('select:near(:text("Status"))', 'Status')

      await page.click('button:has-text("Next: Preview")')

      // Should show validation issues
      await expect(page.getByText('Issues Found')).toBeVisible()
      await expect(page.getByText('Invalid Leads')).toBeVisible()
      
      // Should still allow import of valid leads
      const importButton = page.getByRole('button', { name: /Import \d+ Leads/ })
      await expect(importButton).toBeVisible()
    })

    test('shows loading states during import', async () => {
      // Mock slow API response
      await page.route('**/api/leads/import', async (route) => {
        await new Promise(resolve => setTimeout(resolve, 2000)) // 2 second delay
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            imported: 1,
            failed: 0,
            errors: [],
            message: 'Successfully imported 1 lead'
          })
        })
      })

      await page.click('button:has-text("Import CSV")')

      const csvBuffer = Buffer.from('Name,Email\nTest,test@example.com')
      const fileInput = page.locator('input[type="file"]')
      await fileInput.setInputFiles({
        name: 'test.csv',
        mimeType: 'text/csv',
        buffer: csvBuffer
      })

      await page.selectOption('select:near(:text("Name *"))', 'Name')
      await page.selectOption('select:near(:text("Email *"))', 'Email')
      await page.click('button:has-text("Next: Preview")')
      await page.click('button:has-text("Import")')

      // Should show loading state
      await expect(page.getByText('Importing Leads...')).toBeVisible()
      await expect(page.locator('.animate-spin')).toBeVisible()
    })

    test('handles large file imports', async () => {
      await page.route('**/api/leads/import', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            imported: 100,
            failed: 0,
            errors: [],
            message: 'Successfully imported all 100 leads'
          })
        })
      })

      await page.click('button:has-text("Import CSV")')

      const csvBuffer = Buffer.from(largeCsvContent)
      const fileInput = page.locator('input[type="file"]')
      await fileInput.setInputFiles({
        name: 'large-import.csv',
        mimeType: 'text/csv',
        buffer: csvBuffer
      })

      await page.selectOption('select:near(:text("Name *"))', 'Name')
      await page.selectOption('select:near(:text("Email *"))', 'Email')
      await page.click('button:has-text("Next: Preview")')

      // Should show correct counts
      await expect(page.getByText('100')).toBeVisible() // Total rows
      
      await page.click('button:has-text("Import 100 Leads")')
      await expect(page.getByText('Successfully imported all 100 leads')).toBeVisible()
    })
  })

  test.describe('Export CSV Functionality', () => {
    test('export button is visible and functional', async () => {
      await expect(page.getByText('Export CSV')).toBeVisible()
    })

    test('downloads CSV file with current data', async () => {
      // Mock leads data
      await page.route('**/api/leads', async (route) => {
        if (route.request().method() === 'GET') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              leads: [
                { id: '1', name: 'John Doe', email: 'john@test.com', status: 'warm', created_at: '2024-01-15T10:30:00Z' },
                { id: '2', name: 'Jane Smith', email: 'jane@test.com', status: 'hot', created_at: '2024-01-14T09:15:00Z' }
              ],
              pagination: { page: 1, limit: 10, total: 2, pages: 1 }
            })
          })
        }
      })

      // Mock export endpoint
      await page.route('**/api/leads/export**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'text/csv',
          headers: {
            'Content-Disposition': 'attachment; filename="leads-export-2024-01-15.csv"'
          },
          body: 'Name,Email,Status\nJohn Doe,john@test.com,Warm\nJane Smith,jane@test.com,Hot'
        })
      })

      // Start waiting for download before clicking
      const downloadPromise = page.waitForEvent('download')
      await page.click('button:has-text("Export CSV")')
      
      const download = await downloadPromise
      expect(download.suggestedFilename()).toContain('.csv')
    })

    test('export respects current filter settings', async () => {
      // Apply a status filter
      await page.selectOption('select:near(:text("All Status"))', 'warm')
      
      // Mock filtered API response
      await page.route('**/api/leads**', async (route) => {
        const url = new URL(route.request().url())
        if (url.pathname.includes('/export') && url.searchParams.get('status') === 'warm') {
          await route.fulfill({
            status: 200,
            contentType: 'text/csv',
            body: 'Name,Email,Status\nJohn Doe,john@test.com,Warm'
          })
        }
      })

      const downloadPromise = page.waitForEvent('download')
      await page.click('button:has-text("Export CSV")')
      
      const download = await downloadPromise
      expect(download.suggestedFilename()).toContain('.csv')
    })

    test('shows loading state during export', async () => {
      // Mock slow export response
      await page.route('**/api/leads/export**', async (route) => {
        await new Promise(resolve => setTimeout(resolve, 1000))
        await route.fulfill({
          status: 200,
          contentType: 'text/csv',
          body: 'Name,Email\nTest,test@example.com'
        })
      })

      await page.click('button:has-text("Export CSV")')
      
      // Should show loading spinner on button
      await expect(page.locator('button:has-text("Export CSV") .animate-spin')).toBeVisible()
    })

    test('handles export errors gracefully', async () => {
      await page.route('**/api/leads/export**', async (route) => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Export failed' })
        })
      })

      await page.click('button:has-text("Export CSV")')
      
      // Should show error message
      await expect(page.getByText('Export failed')).toBeVisible()
    })
  })

  test.describe('UI/UX and Responsive Design', () => {
    test('buttons are properly positioned and styled', async () => {
      // Check button positioning
      const addLeadBtn = page.getByRole('button', { name: 'Add Lead' })
      const importBtn = page.getByRole('button', { name: 'Import CSV' })
      const exportBtn = page.getByRole('button', { name: 'Export CSV' })

      await expect(addLeadBtn).toBeVisible()
      await expect(importBtn).toBeVisible()
      await expect(exportBtn).toBeVisible()

      // Check styling classes
      await expect(importBtn).toHaveClass(/bg-green-600/)
      await expect(exportBtn).toHaveClass(/bg-orange-600/)
      await expect(addLeadBtn).toHaveClass(/bg-blue-600/)
    })

    test('responsive design on mobile viewport', async () => {
      await page.setViewportSize({ width: 375, height: 667 }) // iPhone SE size

      // Buttons should still be visible but may wrap
      await expect(page.getByText('Add Lead')).toBeVisible()
      await expect(page.getByText('Import CSV')).toBeVisible()
      await expect(page.getByText('Export CSV')).toBeVisible()
      
      // Import modal should be responsive
      await page.click('button:has-text("Import CSV")')
      await expect(page.getByText('Import Leads')).toBeVisible()
      
      // Check modal is properly sized
      const modal = page.locator('[class*="max-w-4xl"]').first()
      await expect(modal).toBeVisible()
    })

    test('keyboard navigation works correctly', async () => {
      // Tab through the buttons
      await page.keyboard.press('Tab')
      await page.keyboard.press('Tab')
      await page.keyboard.press('Tab')
      
      // Should be able to activate import with Enter
      await page.keyboard.press('Enter')
      await expect(page.getByText('Import Leads')).toBeVisible()
      
      // Escape should close modal
      await page.keyboard.press('Escape')
      await expect(page.getByText('Import Leads')).not.toBeVisible()
    })

    test('ARIA labels and accessibility features', async () => {
      await page.click('button:has-text("Import CSV")')
      
      // Check for proper ARIA attributes
      const modal = page.locator('[role="dialog"]').first()
      await expect(modal).toBeVisible()
      
      const closeButton = page.getByRole('button', { name: /close/i }).first()
      await expect(closeButton).toBeVisible()
    })
  })

  test.describe('Error Handling and Edge Cases', () => {
    test('handles network errors during import', async () => {
      await page.route('**/api/leads/import', async (route) => {
        await route.abort('failed')
      })

      await page.click('button:has-text("Import CSV")')
      
      const csvBuffer = Buffer.from('Name,Email\nTest,test@example.com')
      const fileInput = page.locator('input[type="file"]')
      await fileInput.setInputFiles({
        name: 'test.csv',
        mimeType: 'text/csv',
        buffer: csvBuffer
      })

      await page.selectOption('select:near(:text("Name *"))', 'Name')
      await page.selectOption('select:near(:text("Email *"))', 'Email')
      await page.click('button:has-text("Next: Preview")')
      await page.click('button:has-text("Import")')

      // Should show error message
      await expect(page.getByText(/Import failed/)).toBeVisible()
    })

    test('handles unsupported file formats', async () => {
      await page.click('button:has-text("Import CSV")')
      
      // Try to upload a non-CSV file
      const textBuffer = Buffer.from('This is not a CSV file')
      const fileInput = page.locator('input[type="file"]')
      
      await fileInput.setInputFiles({
        name: 'test.txt',
        mimeType: 'text/plain',
        buffer: textBuffer
      })

      // Should show parsing error
      await expect(page.getByText('CSV Parsing Issues')).toBeVisible()
    })

    test('handles modal close behavior correctly', async () => {
      await page.click('button:has-text("Import CSV")')
      await expect(page.getByText('Import Leads')).toBeVisible()
      
      // Close with X button
      await page.click('button[title*="close"], button:has(svg)')
      await expect(page.getByText('Import Leads')).not.toBeVisible()
      
      // Reopen and close with Cancel
      await page.click('button:has-text("Import CSV")')
      await page.click('button:has-text("Cancel")')
      await expect(page.getByText('Import Leads')).not.toBeVisible()
    })
  })

  test.describe('Performance Tests', () => {
    test('UI remains responsive during large imports', async () => {
      // Mock a slow import that updates progress
      let progressCalls = 0
      await page.route('**/api/leads/import', async (route) => {
        progressCalls++
        await new Promise(resolve => setTimeout(resolve, 1000))
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            imported: 1000,
            failed: 0,
            errors: [],
            message: 'Successfully imported 1000 leads'
          })
        })
      })

      await page.click('button:has-text("Import CSV")')
      
      const csvBuffer = Buffer.from(largeCsvContent)
      const fileInput = page.locator('input[type="file"]')
      await fileInput.setInputFiles({
        name: 'large.csv',
        mimeType: 'text/csv',
        buffer: csvBuffer
      })

      await page.selectOption('select:near(:text("Name *"))', 'Name')
      await page.selectOption('select:near(:text("Email *"))', 'Email')
      await page.click('button:has-text("Next: Preview")')
      await page.click('button:has-text("Import")')

      // UI should remain responsive - clicking cancel should still work
      const cancelButton = page.getByRole('button', { name: 'Cancel' })
      await expect(cancelButton).toBeVisible()
      
      // Check that loading animation is smooth
      const spinner = page.locator('.animate-spin')
      await expect(spinner).toBeVisible()
    })
  })
})
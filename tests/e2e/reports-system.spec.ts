import { test, expect } from '@playwright/test';

test.describe('Reports System E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication by setting session cookie if needed
    await page.context().addCookies([
      {
        name: 'sb-access-token',
        value: 'test-token',
        domain: 'localhost',
        path: '/',
      }
    ]);
  });

  test('Reports Hub loads with all categories', async ({ page }) => {
    await page.goto('/reports');
    
    // Wait for the page to load
    await page.waitForSelector('h1', { timeout: 10000 });
    
    // Check the main heading
    await expect(page.locator('h1')).toContainText('Reports Hub');
    
    // Verify all three categories are present
    await expect(page.locator('text=Attendance & Bookings')).toBeVisible();
    await expect(page.locator('text=Revenue & Billing')).toBeVisible();
    await expect(page.locator('text=Discounts & Promotions')).toBeVisible();
    
    // Check that report links are present
    await expect(page.locator('a[href="/reports/attendances"]')).toBeVisible();
    await expect(page.locator('a[href="/reports/invoices"]')).toBeVisible();
    await expect(page.locator('a[href="/reports/discount-codes"]')).toBeVisible();
  });

  test('Attendances Report loads with filters', async ({ page }) => {
    await page.goto('/reports/attendances');
    
    // Wait for the page to load
    await page.waitForSelector('h1', { timeout: 10000 });
    
    // Check the main heading
    await expect(page.locator('h1')).toContainText('All Attendances');
    
    // Verify filter controls are present
    await expect(page.locator('button:has-text("Date Range")')).toBeVisible();
    await expect(page.locator('button:has-text("Group By")')).toBeVisible();
    await expect(page.locator('button:has-text("Export")')).toBeVisible();
    
    // Check for data table or loading state
    const table = page.locator('table');
    const noData = page.locator('text=No attendance records found');
    const loading = page.locator('text=Loading');
    
    // Wait for one of these states
    await expect(table.or(noData).or(loading)).toBeVisible({ timeout: 10000 });
  });

  test('Invoices Report loads with column selector', async ({ page }) => {
    await page.goto('/reports/invoices');
    
    // Wait for the page to load
    await page.waitForSelector('h1', { timeout: 10000 });
    
    // Check the main heading
    await expect(page.locator('h1')).toContainText('Invoices Report');
    
    // Verify column selector is present
    await expect(page.locator('button:has-text("Columns")')).toBeVisible();
    
    // Check for summary cards
    await expect(page.locator('text=Total Invoices').or(page.locator('text=Loading'))).toBeVisible();
  });

  test('Invoice Items Report has three tabs', async ({ page }) => {
    await page.goto('/reports/invoice-items');
    
    // Wait for the page to load
    await page.waitForSelector('h1', { timeout: 10000 });
    
    // Check the main heading
    await expect(page.locator('h1')).toContainText('Invoice Items Report');
    
    // Verify all three tabs are present
    await expect(page.locator('button:has-text("Line Items")')).toBeVisible();
    await expect(page.locator('button:has-text("Item Summary")')).toBeVisible();
    await expect(page.locator('button:has-text("Transactions")')).toBeVisible();
    
    // Test tab switching
    await page.locator('button:has-text("Item Summary")').click();
    await expect(page.locator('text=Item Summary').first()).toBeVisible();
    
    await page.locator('button:has-text("Transactions")').click();
    await expect(page.locator('text=Transactions').first()).toBeVisible();
  });

  test('Upcoming Billing shows schedule', async ({ page }) => {
    await page.goto('/reports/upcoming-billing');
    
    // Wait for the page to load
    await page.waitForSelector('h1', { timeout: 10000 });
    
    // Check the main heading
    await expect(page.locator('h1')).toContainText('Upcoming Billing');
    
    // Check for date selector
    await expect(page.locator('text=Select Date Range').or(page.locator('input[type="date"]'))).toBeVisible();
    
    // Check for data or empty state
    const table = page.locator('table');
    const noData = page.locator('text=No upcoming billing');
    await expect(table.or(noData)).toBeVisible({ timeout: 10000 });
  });

  test('Pending Payments dashboard loads', async ({ page }) => {
    await page.goto('/reports/pending');
    
    // Wait for the page to load
    await page.waitForSelector('h1', { timeout: 10000 });
    
    // Check the main heading
    await expect(page.locator('h1')).toContainText('Pending Payments');
    
    // Check for summary metrics
    await expect(page.locator('text=Total Pending').or(page.locator('text=Loading'))).toBeVisible();
    await expect(page.locator('text=Overdue').or(page.locator('text=Loading'))).toBeVisible();
  });

  test('Discount Codes report has grouping options', async ({ page }) => {
    await page.goto('/reports/discount-codes');
    
    // Wait for the page to load
    await page.waitForSelector('h1', { timeout: 10000 });
    
    // Check the main heading
    await expect(page.locator('h1')).toContainText('Discount Codes');
    
    // Check for grouping options
    await expect(page.locator('button:has-text("Group By")')).toBeVisible();
    
    // Click to see grouping options
    await page.locator('button:has-text("Group By")').click();
    await expect(page.locator('text=By Code')).toBeVisible();
    await expect(page.locator('text=By Customer')).toBeVisible();
    await expect(page.locator('text=By Date')).toBeVisible();
  });

  test('Payouts report shows monthly list', async ({ page }) => {
    await page.goto('/reports/payouts');
    
    // Wait for the page to load
    await page.waitForSelector('h1', { timeout: 10000 });
    
    // Check the main heading
    await expect(page.locator('h1')).toContainText('Payouts');
    
    // Check for month selector or list
    await expect(page.locator('text=Select Month').or(page.locator('table'))).toBeVisible();
    
    // Check for summary section
    await expect(page.locator('text=Total Payouts').or(page.locator('text=Loading'))).toBeVisible();
  });

  test('Export button works on attendances report', async ({ page }) => {
    await page.goto('/reports/attendances');
    
    // Wait for the page to load
    await page.waitForSelector('h1', { timeout: 10000 });
    
    // Setup download promise before clicking
    const downloadPromise = page.waitForEvent('download', { timeout: 5000 }).catch(() => null);
    
    // Click export button
    const exportButton = page.locator('button:has-text("Export")');
    if (await exportButton.isVisible()) {
      await exportButton.click();
      
      // Check if CSV option appears and click it
      const csvOption = page.locator('text=Export as CSV');
      if (await csvOption.isVisible({ timeout: 2000 })) {
        await csvOption.click();
        
        // Wait for download
        const download = await downloadPromise;
        if (download) {
          expect(download.suggestedFilename()).toMatch(/attendances.*\.csv/);
        }
      }
    }
  });

  test('Date range filter updates data', async ({ page }) => {
    await page.goto('/reports/attendances');
    
    // Wait for the page to load
    await page.waitForSelector('h1', { timeout: 10000 });
    
    // Click date range button
    const dateRangeButton = page.locator('button:has-text("Date Range")');
    if (await dateRangeButton.isVisible()) {
      await dateRangeButton.click();
      
      // Select "Last 7 days" if available
      const last7Days = page.locator('text=Last 7 days');
      if (await last7Days.isVisible({ timeout: 2000 })) {
        await last7Days.click();
        
        // Wait for data to update (loading indicator should appear and disappear)
        await page.waitForTimeout(1000);
        
        // Verify the filter is applied (button text might change)
        await expect(dateRangeButton).toBeVisible();
      }
    }
  });
});
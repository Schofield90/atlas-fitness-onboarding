import { test, expect } from '@playwright/test';
import { join } from 'path';

/**
 * E2E Test Suite: GoTeamUp Import Feature
 *
 * Tests the complete import flow for GoTeamUp CSV files including:
 * - Client import (creates new client records)
 * - Membership import (creates plans and assigns to clients)
 * - Duplicate detection (skips existing clients)
 * - Error handling and validation
 *
 * Test Organization: ee1206d7-62fb-49cf-9f39-95b9c54423a4
 * Test Credentials: sam@atlas-gyms.co.uk / @Aa80236661
 */

test.describe('GoTeamUp Import Feature', () => {
  test.beforeEach(async ({ page }) => {
    // Login to the dashboard
    await page.goto('https://login.gymleadhub.co.uk/signin');

    // Fill in credentials
    await page.fill('input[type="email"]', 'sam@atlas-gyms.co.uk');
    await page.fill('input[type="password"]', '@Aa80236661');

    // Click login button
    await page.click('button[type="submit"]');

    // Wait for navigation to dashboard
    await page.waitForURL('**/dashboard**', { timeout: 10000 });

    // Navigate to import page
    await page.goto('https://login.gymleadhub.co.uk/dashboard/import');
    await page.waitForLoadState('networkidle');
  });

  test('should import clients CSV successfully', async ({ page }) => {
    // Create test CSV content
    const clientsCSV = `Full Name,First Name,Last Name,Email,Phone,DOB,Gender,Status
Test User 1,Test,User1,testuser1@playwright.test,07700900001,01/01/1990,male,active
Test User 2,Test,User2,testuser2@playwright.test,07700900002,15/05/1985,female,active
Test User 3,Test,User3,testuser3@playwright.test,07700900003,22/12/1992,male,active`;

    // Create a temporary file
    const testFile = join(__dirname, 'test-clients.csv');
    const fs = require('fs');
    fs.writeFileSync(testFile, clientsCSV);

    // Upload file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testFile);

    // Wait for preview to load
    await expect(page.locator('text=Preview')).toBeVisible();

    // Verify file type is auto-detected as "clients"
    const fileTypeSelect = page.locator('select');
    await expect(fileTypeSelect).toHaveValue('clients');

    // Click import button
    await page.click('button:has-text("Import Data")');

    // Wait for import to complete (max 30 seconds)
    await expect(page.locator('text=Import completed')).toBeVisible({ timeout: 30000 });

    // Verify success message
    const successMessage = page.locator('.bg-green-900');
    await expect(successMessage).toContainText('3');

    // Cleanup
    fs.unlinkSync(testFile);
  });

  test('should import memberships CSV and create plans', async ({ page }) => {
    // Create test CSV content with memberships
    const membershipsCSV = `Email,Active Memberships,Last Payment Amount (GBP),Last Payment Date,Status
testuser1@playwright.test,Full Member,110.00,15/09/2024,active
testuser2@playwright.test,Student Member,95.00,12/09/2024,active
testuser3@playwright.test,Full Member,110.00,10/09/2024,active`;

    // Create a temporary file
    const testFile = join(__dirname, 'test-memberships.csv');
    const fs = require('fs');
    fs.writeFileSync(testFile, membershipsCSV);

    // Upload file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testFile);

    // Wait for preview to load
    await expect(page.locator('text=Preview')).toBeVisible();

    // Verify file type is auto-detected as "memberships"
    const fileTypeSelect = page.locator('select');
    await expect(fileTypeSelect).toHaveValue('memberships');

    // Click import button
    await page.click('button:has-text("Import Data")');

    // Wait for import to complete
    await expect(page.locator('text=membership plans')).toBeVisible({ timeout: 30000 });

    // Verify success stats
    const stats = page.locator('.grid-cols-4');
    await expect(stats).toBeVisible();

    // Cleanup
    fs.unlinkSync(testFile);
  });

  test('should skip duplicate clients', async ({ page }) => {
    // Import the same clients twice
    const clientsCSV = `Full Name,First Name,Last Name,Email,Phone,DOB,Gender,Status
Duplicate User,Duplicate,User,duplicate@playwright.test,07700900099,01/01/1990,male,active`;

    const testFile = join(__dirname, 'test-duplicate.csv');
    const fs = require('fs');
    fs.writeFileSync(testFile, clientsCSV);

    // First import
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testFile);
    await page.click('button:has-text("Import Data")');
    await expect(page.locator('text=Import completed')).toBeVisible({ timeout: 30000 });

    // Record first import success count
    const firstSuccessText = await page.locator('.text-green-400').nth(1).textContent();
    const firstSuccess = parseInt(firstSuccessText || '0');

    // Reload page to clear state
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Second import - should skip duplicates
    await fileInput.setInputFiles(testFile);
    await page.click('button:has-text("Import Data")');
    await expect(page.locator('text=Import completed')).toBeVisible({ timeout: 30000 });

    // Verify skipped count
    const skippedText = await page.locator('.text-yellow-400').nth(1).textContent();
    const skipped = parseInt(skippedText || '0');

    expect(skipped).toBeGreaterThan(0);

    // Cleanup
    fs.unlinkSync(testFile);
  });

  test('should handle invalid CSV gracefully', async ({ page }) => {
    // Create invalid CSV (missing required columns)
    const invalidCSV = `Name,Value
Random,Data
Invalid,Format`;

    const testFile = join(__dirname, 'test-invalid.csv');
    const fs = require('fs');
    fs.writeFileSync(testFile, invalidCSV);

    // Upload file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testFile);

    // Set type to clients
    await page.selectOption('select', 'clients');

    // Click import button
    await page.click('button:has-text("Import Data")');

    // Should show error or skip message
    await expect(page.locator('.bg-red-900, .bg-yellow-900')).toBeVisible({ timeout: 30000 });

    // Cleanup
    fs.unlinkSync(testFile);
  });

  test('should show background processing for large files', async ({ page }) => {
    // Create a CSV with >100 rows to trigger background processing
    const fs = require('fs');
    let largeCSV = 'Full Name,First Name,Last Name,Email,Phone,DOB,Gender,Status\n';

    for (let i = 0; i < 150; i++) {
      largeCSV += `Test User ${i},Test,User${i},testuser${i}@large.test,0770090${i.toString().padStart(4, '0')},01/01/1990,male,active\n`;
    }

    const testFile = join(__dirname, 'test-large.csv');
    fs.writeFileSync(testFile, largeCSV);

    // Upload file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testFile);

    // Wait for large file warning
    await expect(page.locator('text=Large file detected')).toBeVisible();
    await expect(page.locator('text=background')).toBeVisible();

    // Click import button
    await page.click('button:has-text("Import Data")');

    // Should show background processing indicator
    await expect(page.locator('text=Processing in background') || page.locator('.animate-spin')).toBeVisible({ timeout: 10000 });

    // Cleanup
    fs.unlinkSync(testFile);
  });

  test('should display upload history', async ({ page }) => {
    // After any import, history should be visible
    const clientsCSV = `Full Name,First Name,Last Name,Email,Phone,DOB,Gender,Status
History Test,History,Test,history@test.com,07700900000,01/01/1990,male,active`;

    const testFile = join(__dirname, 'test-history.csv');
    const fs = require('fs');
    fs.writeFileSync(testFile, clientsCSV);

    // Import
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testFile);
    await page.click('button:has-text("Import Data")');
    await expect(page.locator('text=Import completed')).toBeVisible({ timeout: 30000 });

    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Verify history section appears
    await expect(page.locator('text=Recent Imports')).toBeVisible();
    await expect(page.locator('text=test-history.csv')).toBeVisible();

    // Cleanup
    fs.unlinkSync(testFile);
  });
});

/**
 * Test Data Cleanup
 *
 * Note: This test suite creates test data in the production database.
 * Test emails use @playwright.test domain for easy identification.
 *
 * To clean up test data, run SQL:
 * DELETE FROM clients WHERE email LIKE '%@playwright.test%';
 * DELETE FROM clients WHERE email LIKE '%@large.test%';
 * DELETE FROM membership_plans WHERE metadata->>'imported_from' = 'goteamup'
 *   AND name LIKE '%Member%';
 */

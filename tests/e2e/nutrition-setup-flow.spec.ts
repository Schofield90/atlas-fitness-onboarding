import { test, expect } from '@playwright/test';

test.describe('Nutrition Setup Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Note: This test requires proper authentication setup
    // In a real test environment, you would need to:
    // 1. Set up test user authentication
    // 2. Ensure test database has proper client/lead relationships
    
    // For now, this is a template for the e2e test structure
  });

  test('should complete nutrition profile setup successfully', async ({ page }) => {
    test.skip(!process.env.E2E_TEST_ENABLED, 'E2E tests require proper auth setup');
    
    // Navigate to nutrition page
    await page.goto('/client/nutrition');
    
    // Wait for nutrition setup form to load
    await expect(page.locator('h2:has-text("Basic Information")')).toBeVisible();
    
    // Fill out Step 1: Basic Information
    await page.fill('input[placeholder="170"]', '180'); // Height in cm
    await page.fill('input[placeholder="70"]', '75');   // Weight in kg
    await page.fill('input[placeholder="30"]', '30');   // Age
    await page.selectOption('select:near(:text("Gender"))', 'male');
    await page.selectOption('select:near(:text("Activity Level"))', 'moderately_active');
    
    await page.click('button:has-text("Next")');
    
    // Step 2: Goals
    await expect(page.locator('h2:has-text("Your Goals")')).toBeVisible();
    await page.selectOption('select:near(:text("Primary Goal"))', 'maintain');
    
    await page.click('button:has-text("Next")');
    
    // Step 3: Macros
    await expect(page.locator('h2:has-text("Macro Breakdown")')).toBeVisible();
    // Accept default macro settings
    
    await page.click('button:has-text("Next")');
    
    // Step 4: Meal Preferences
    await expect(page.locator('h2:has-text("Meal Preferences")')).toBeVisible();
    await page.selectOption('select:near(:text("Meals per Day"))', '3');
    await page.selectOption('select:near(:text("Snacks per Day"))', '2');
    await page.selectOption('select:near(:text("Dietary Type"))', '');
    await page.selectOption('select:near(:text("Cooking Time Preference"))', 'moderate');
    
    await page.click('button:has-text("Next")');
    
    // Step 5: Food Preferences & Allergies
    await expect(page.locator('h2:has-text("Allergies & Preferences")')).toBeVisible();
    
    // Fill in some sample preferences
    await page.fill('input[placeholder="e.g., peanuts, shellfish, dairy"]', 'none');
    await page.fill('input[placeholder="e.g., lactose, gluten"]', 'none');
    await page.fill('input[placeholder="e.g., chicken, rice, broccoli"]', 'chicken, rice, vegetables');
    await page.fill('input[placeholder="e.g., mushrooms, tomatoes"]', 'mushrooms');
    
    // Submit the form
    await page.click('button:has-text("Complete Setup")');
    
    // Wait for success - should either show success message or navigate away
    await expect(page.locator('text=Saving...')).not.toBeVisible({ timeout: 10000 });
    
    // Should either see success state or be redirected to nutrition dashboard
    // This depends on the implementation of onComplete callback
    await page.waitForTimeout(2000); // Allow for navigation/state changes
    
    // Check that we didn't get an error alert
    // In a real test, you'd check for specific success indicators
    const hasErrorAlert = await page.locator('text=Failed to save').isVisible();
    expect(hasErrorAlert).toBeFalsy();
  });

  test('should show proper error message for invalid data', async ({ page }) => {
    test.skip(!process.env.E2E_TEST_ENABLED, 'E2E tests require proper auth setup');
    
    await page.goto('/client/nutrition');
    
    // Try to submit form with missing required data
    await expect(page.locator('h2:has-text("Basic Information")')).toBeVisible();
    
    // Leave some fields empty and try to proceed
    await page.fill('input[placeholder="30"]', '30'); // Only fill age
    
    await page.click('button:has-text("Next")');
    
    // Should not proceed to next step - button should be disabled
    const nextButton = page.locator('button:has-text("Next")');
    await expect(nextButton).toBeDisabled();
  });

  test('should handle lead lookup correctly for clients without lead_id', async ({ page }) => {
    test.skip(!process.env.E2E_TEST_ENABLED, 'E2E tests require proper auth setup');
    
    // This test would verify that the lead lookup logic works
    // It would need to be run with a test client that has no lead_id
    // but has a matching lead record by email
    
    await page.goto('/client/nutrition');
    
    // Complete the entire form
    await page.fill('input[placeholder="170"]', '180');
    await page.fill('input[placeholder="70"]', '75');
    await page.fill('input[placeholder="30"]', '30');
    await page.selectOption('select:near(:text("Gender"))', 'male');
    await page.selectOption('select:near(:text("Activity Level"))', 'moderately_active');
    
    // Go through all steps quickly
    await page.click('button:has-text("Next")');
    await page.click('button:has-text("Next")');
    await page.click('button:has-text("Next")');
    await page.click('button:has-text("Complete Setup")');
    
    // Should succeed even if client.lead_id is null, because the component
    // should find the matching lead by email
    await expect(page.locator('text=Saving...')).not.toBeVisible({ timeout: 10000 });
    
    // Should not show the "No associated lead record found" error
    const hasLeadError = await page.locator('text=No associated lead record found').isVisible();
    expect(hasLeadError).toBeFalsy();
  });
});
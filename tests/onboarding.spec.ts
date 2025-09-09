import { test, expect } from '@playwright/test';

// Test URLs - update these for your environment
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';
const TEST_TOKEN = 'test-token-12345'; // This would be a real token in production tests

test.describe('Onboarding Flows', () => {
  test.describe('Flow A: Gym-initiated (Claim Account)', () => {
    test('should validate token and pre-fill form', async ({ page }) => {
      // Navigate to claim page with token
      await page.goto(`${BASE_URL}/claim-account?token=${TEST_TOKEN}`);

      // Wait for token validation
      await page.waitForSelector('h1:has-text("Claim Your Account")', { timeout: 10000 });

      // Check that email is pre-filled and disabled
      const emailInput = page.locator('input[type="email"][disabled]');
      await expect(emailInput).toBeVisible();
      await expect(emailInput).toBeDisabled();

      // Check that form fields are visible
      await expect(page.locator('input[placeholder="Enter your password"]')).toBeVisible();
      await expect(page.locator('input[placeholder="Confirm your password"]')).toBeVisible();
      await expect(page.locator('input[type="text"]').first()).toBeVisible(); // First name
    });

    test('should show error for invalid token', async ({ page }) => {
      // Navigate with invalid token
      await page.goto(`${BASE_URL}/claim-account?token=invalid-token-xyz`);

      // Should show error message
      await expect(page.locator('text=/invalid|expired/i')).toBeVisible({ timeout: 10000 });
      
      // Should show "Go to Login" button
      await expect(page.locator('button:has-text("Go to Login")')).toBeVisible();
    });

    test('should validate password requirements', async ({ page }) => {
      await page.goto(`${BASE_URL}/claim-account?token=${TEST_TOKEN}`);
      
      // Wait for form to load
      await page.waitForSelector('input[placeholder="Enter your password"]');

      // Type weak password
      await page.fill('input[placeholder="Enter your password"]', 'weak');

      // Check that password requirements show as not met
      await expect(page.locator('text=At least 8 characters')).toHaveClass(/text-gray-500/);
      await expect(page.locator('text=One uppercase letter')).toHaveClass(/text-gray-500/);
      await expect(page.locator('text=One number')).toHaveClass(/text-gray-500/);

      // Type strong password
      await page.fill('input[placeholder="Enter your password"]', 'StrongPass123!');

      // Check that all requirements are met
      await expect(page.locator('text=At least 8 characters')).toHaveClass(/text-green-500/);
      await expect(page.locator('text=One uppercase letter')).toHaveClass(/text-green-500/);
      await expect(page.locator('text=One lowercase letter')).toHaveClass(/text-green-500/);
      await expect(page.locator('text=One number')).toHaveClass(/text-green-500/);
      await expect(page.locator('text=One special character')).toHaveClass(/text-green-500/);
    });

    test('should show already claimed message for used tokens', async ({ page }) => {
      // This would use a token that's already been claimed in test data
      const claimedToken = 'already-claimed-token-123';
      await page.goto(`${BASE_URL}/claim-account?token=${claimedToken}`);

      // Should show already claimed message
      await expect(page.locator('h1:has-text("Account Already Claimed")')).toBeVisible({ 
        timeout: 10000 
      });
      
      // Should show "Go to Login" button
      await expect(page.locator('button:has-text("Go to Login")')).toBeVisible();
    });

    test('should successfully claim account', async ({ page }) => {
      // This test would need proper test data setup
      await page.goto(`${BASE_URL}/claim-account?token=${TEST_TOKEN}`);

      // Wait for form
      await page.waitForSelector('h1:has-text("Claim Your Account")');

      // Fill out the form
      await page.fill('input[placeholder="Enter your password"]', 'TestPass123!');
      await page.fill('input[placeholder="Confirm your password"]', 'TestPass123!');
      await page.fill('input[type="text"]', 'John'); // First name
      await page.fill('input[type="text"]', 'Doe'); // Last name
      
      // Accept terms
      await page.check('input[type="checkbox"]#terms');

      // Submit form
      await page.click('button:has-text("Claim Your Account")');

      // Should show success and redirect (or show success message)
      // In a real test, we'd check for the redirect or success state
      await expect(page).toHaveURL(/\/portal\/login/, { timeout: 10000 });
    });
  });

  test.describe('Flow B: Self-serve (Join)', () => {
    test('should show membership plans', async ({ page }) => {
      await page.goto(`${BASE_URL}/join`);

      // Check that plans are visible
      await expect(page.locator('h1:has-text("Choose Your Membership")')).toBeVisible();
      await expect(page.locator('text=Basic Membership')).toBeVisible();
      await expect(page.locator('text=Premium Membership')).toBeVisible();
      await expect(page.locator('text=Elite Membership')).toBeVisible();
    });

    test('should navigate through steps', async ({ page }) => {
      await page.goto(`${BASE_URL}/join`);

      // Step 1: Select a plan
      await page.click('text=Select Plan >> nth=0');

      // Should move to step 2
      await expect(page.locator('h1:has-text("Create Your Account")')).toBeVisible();

      // Check auth method toggle
      await expect(page.locator('button:has-text("Password")')).toBeVisible();
      await expect(page.locator('button:has-text("Magic Link")')).toBeVisible();

      // Go back to step 1
      await page.click('button:has-text("Back")');
      await expect(page.locator('h1:has-text("Choose Your Membership")')).toBeVisible();
    });

    test('should create account with password', async ({ page }) => {
      await page.goto(`${BASE_URL}/join?plan=basic`);

      // Should start on step 2 with plan pre-selected
      await expect(page.locator('text=Basic Membership')).toBeVisible();

      // Fill out account form
      await page.fill('input[placeholder="your@email.com"]', 'test@example.com');
      await page.fill('input[placeholder="Enter your password"]', 'TestPass123!');
      await page.fill('input[placeholder="Confirm your password"]', 'TestPass123!');
      
      // Fill personal info
      const firstNameInput = page.locator('label:has-text("First Name") + input');
      await firstNameInput.fill('Jane');
      
      const lastNameInput = page.locator('label:has-text("Last Name") + input');
      await lastNameInput.fill('Smith');

      // Accept terms
      await page.check('input[type="checkbox"]#terms');

      // Submit
      await page.click('button:has-text("Create Account & Continue")');

      // Would check for success state or redirect
      // In real tests, this would verify account creation
    });

    test('should send magic link', async ({ page }) => {
      await page.goto(`${BASE_URL}/join?plan=premium`);

      // Switch to magic link auth
      await page.click('button:has-text("Magic Link")');

      // Fill email
      await page.fill('input[placeholder="your@email.com"]', 'magic@example.com');
      
      // Fill required fields
      const firstNameInput = page.locator('label:has-text("First Name") + input');
      await firstNameInput.fill('Magic');
      
      const lastNameInput = page.locator('label:has-text("Last Name") + input');
      await lastNameInput.fill('User');

      // Accept terms
      await page.check('input[type="checkbox"]#terms');

      // Submit
      await page.click('button:has-text("Send Magic Link")');

      // Would check for success message
      // In real tests, this would verify the magic link was sent
    });

    test('should validate required fields', async ({ page }) => {
      await page.goto(`${BASE_URL}/join?plan=basic`);

      // Try to submit without filling required fields
      await page.click('button:has-text("Create Account & Continue")');

      // Browser validation should prevent submission
      // Check that we're still on the same page
      await expect(page.locator('h1:has-text("Create Your Account")')).toBeVisible();

      // Fill email only
      await page.fill('input[placeholder="your@email.com"]', 'partial@example.com');
      
      // Try to submit again
      await page.click('button:has-text("Create Account & Continue")');

      // Should still be on same page (password required)
      await expect(page.locator('h1:has-text("Create Your Account")')).toBeVisible();
    });
  });

  test.describe('Security Tests', () => {
    test('should not expose service role key', async ({ page }) => {
      // Navigate to claim page
      await page.goto(`${BASE_URL}/claim-account?token=${TEST_TOKEN}`);

      // Check that no service role key is exposed in page source
      const content = await page.content();
      expect(content).not.toContain('service_role');
      expect(content).not.toContain('SERVICE_ROLE');
    });

    test('should handle rate limiting gracefully', async ({ page }) => {
      // This would test rate limiting by making multiple rapid requests
      // In production, you'd need to configure this based on your rate limits
      
      const invalidToken = 'rate-limit-test-token';
      
      // Make multiple rapid attempts
      for (let i = 0; i < 5; i++) {
        await page.goto(`${BASE_URL}/claim-account?token=${invalidToken}-${i}`);
        
        // Should handle gracefully (show error, not crash)
        await expect(
          page.locator('text=/invalid|expired|error/i')
        ).toBeVisible({ timeout: 10000 });
      }
    });
  });
});

test.describe('Singleton Supabase Client', () => {
  test('should not show multiple client warning', async ({ page }) => {
    // Listen for console messages
    const consoleMessages: string[] = [];
    page.on('console', msg => consoleMessages.push(msg.text()));

    // Navigate to pages that use Supabase
    await page.goto(`${BASE_URL}/claim-account?token=${TEST_TOKEN}`);
    await page.waitForTimeout(2000); // Wait for any console messages

    // Check that the multiple client warning doesn't appear
    const hasMultipleClientWarning = consoleMessages.some(msg => 
      msg.includes('Multiple GoTrueClient instances')
    );
    
    expect(hasMultipleClientWarning).toBe(false);
  });
});
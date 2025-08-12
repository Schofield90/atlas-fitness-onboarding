import { test, expect, Page } from '@playwright/test';

test.describe('LeadDec Login Page', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    const context = await browser.newContext();
    page = await context.newPage();
    await page.goto('https://login.leaddec.com');
  });

  test('should load login page successfully', async () => {
    await expect(page).toHaveTitle(/Login/);
    await expect(page).toHaveURL('https://login.leaddec.com/');
  });

  test('should have required login form elements', async () => {
    // Check for email input
    const emailInput = page.locator('#email');
    await expect(emailInput).toBeVisible();
    await expect(emailInput).toHaveAttribute('type', 'text');
    await expect(emailInput).toHaveAttribute('placeholder', 'Your email address');

    // Check for password input
    const passwordInput = page.locator('#password');
    await expect(passwordInput).toBeVisible();
    await expect(passwordInput).toHaveAttribute('type', 'password');
    await expect(passwordInput).toHaveAttribute('placeholder', 'The password you picked');

    // Check for sign in button
    const signInButton = page.getByRole('button', { name: 'Sign in' });
    await expect(signInButton).toBeVisible();
  });

  test('should have forgot password link', async () => {
    const forgotPasswordLink = page.getByRole('link', { name: 'Forgot password?' });
    await expect(forgotPasswordLink).toBeVisible();
    await expect(forgotPasswordLink).toHaveAttribute('href', /forgot_password/);
  });

  test('should have footer links', async () => {
    const termsLink = page.getByRole('link', { name: 'Terms and Conditions' });
    await expect(termsLink).toBeVisible();

    const privacyLink = page.getByRole('link', { name: 'Privacy Policy' });
    await expect(privacyLink).toBeVisible();
  });

  test('should validate empty form submission', async () => {
    const signInButton = page.getByRole('button', { name: 'Sign in' });
    await signInButton.click();

    // Wait for any validation messages or behavior
    // This would need to be adjusted based on actual validation behavior
    await page.waitForTimeout(1000);
  });

  test('should allow typing in form fields', async () => {
    const emailInput = page.locator('#email');
    const passwordInput = page.locator('#password');

    await emailInput.fill('test@example.com');
    await expect(emailInput).toHaveValue('test@example.com');

    await passwordInput.fill('testpassword123');
    await expect(passwordInput).toHaveValue('testpassword123');
  });

  test('should navigate to forgot password page', async () => {
    const forgotPasswordLink = page.getByRole('link', { name: 'Forgot password?' });
    await forgotPasswordLink.click();

    await expect(page).toHaveURL(/forgot_password/);
  });

  test('should take full page screenshot', async () => {
    await page.screenshot({ 
      path: 'e2e/screenshots/leaddec-login-fullpage.png',
      fullPage: true 
    });
  });

  test('should be responsive', async () => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.screenshot({ 
      path: 'e2e/screenshots/leaddec-login-mobile.png' 
    });

    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.screenshot({ 
      path: 'e2e/screenshots/leaddec-login-tablet.png' 
    });

    // Test desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.screenshot({ 
      path: 'e2e/screenshots/leaddec-login-desktop.png' 
    });
  });
});

// Additional test for login flow (would need real credentials)
test.describe('Login Flow', () => {
  test.skip('should login with valid credentials', async ({ page }) => {
    await page.goto('https://login.leaddec.com');
    
    await page.locator('#email').fill('valid@email.com');
    await page.locator('#password').fill('validpassword');
    
    await page.getByRole('button', { name: 'Sign in' }).click();
    
    // Wait for navigation or success indicator
    // This would need to be adjusted based on actual behavior
    await page.waitForURL(/dashboard|home/, { timeout: 10000 });
  });
});
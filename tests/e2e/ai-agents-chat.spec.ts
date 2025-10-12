import { test, expect } from '@playwright/test';

test.describe('AI Agents Chat - Message Flow', () => {

  test('should send message and verify it persists', async ({ page }) => {
    console.log('\n=== AI Chat Test Started ===\n');

    // First login
    console.log('Step 1: Login as test user');
    await page.goto('http://localhost:3000/owner-login');
    await page.waitForLoadState('networkidle');

    // Fill login form
    await page.fill('input[type="email"]', 'test2@test.co.uk');
    await page.fill('input[type="password"]', 'Test123');
    await page.click('button[type="submit"]');

    // Wait for redirect
    await page.waitForTimeout(3000);
    console.log('  ✓ Logged in, URL:', page.url());

    // Navigate to chat page
    console.log('\nStep 2: Navigate to chat page');
    await page.goto('http://localhost:3000/org/demo-fitness/ai-agents/chat/00f2d394-28cd-43ee-8db4-8f841c5d4873');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    console.log('  ✓ Current URL:', page.url());

    // Capture console logs
    const logs: string[] = [];
    page.on('console', msg => {
      const text = msg.text();
      logs.push(`[${msg.type()}] ${text}`);
      if (text.includes('[DEBUG]') || text.includes('Error')) {
        console.log(`  Browser: ${text}`);
      }
    });

    // Capture alerts
    let alertText = '';
    page.on('dialog', async dialog => {
      alertText = dialog.message();
      console.log(`  ⚠️  Alert detected: ${alertText}`);
      await dialog.accept();
    });

    // Find input field
    console.log('\nStep 2: Find message input');
    const input = page.locator('textarea, input[placeholder*="message" i], input[placeholder*="type" i]').first();

    try {
      await input.waitFor({ state: 'visible', timeout: 5000 });
      console.log('  ✓ Input field found');
    } catch (e) {
      console.log('  ✗ Input field not found!');
      console.log('  Page HTML:', await page.content());
      throw e;
    }

    // Type message
    console.log('\nStep 3: Type test message');
    const testMessage = `E2E Test ${Date.now()}`;
    await input.fill(testMessage);
    console.log(`  ✓ Typed: "${testMessage}"`);

    // Find send button
    console.log('\nStep 4: Find and click send button');
    const sendBtn = page.locator('button:has-text("Send"), button:has-text("SEND"), button[type="submit"]').first();
    await sendBtn.waitFor({ state: 'visible', timeout: 5000 });
    console.log('  ✓ Send button found');

    await sendBtn.click();
    console.log('  ✓ Clicked send button');

    // Wait for processing
    console.log('\nStep 5: Wait for message to appear');
    await page.waitForTimeout(2000);

    // Check if message is visible
    const messageElement = page.locator(`text="${testMessage}"`).first();
    const messageVisible = await messageElement.isVisible().catch(() => false);

    console.log(`  Message visible: ${messageVisible}`);

    // Wait a bit more for API response
    console.log('\nStep 6: Wait for AI response (10s max)');
    await page.waitForTimeout(10000);

    // Check if message still visible
    const stillVisible = await messageElement.isVisible().catch(() => false);
    console.log(`  Message still visible: ${stillVisible}`);

    // Check for errors in console
    const errorLogs = logs.filter(log =>
      log.includes('Error') ||
      log.includes('Failed') ||
      log.includes('[DEBUG]')
    );

    if (errorLogs.length > 0) {
      console.log('\n=== Console Errors/Debug ===');
      errorLogs.forEach(log => console.log(log));
    }

    // Check if alert was shown
    if (alertText) {
      console.log(`\n=== Alert Message ===`);
      console.log(alertText);
      throw new Error(`Alert shown: ${alertText}`);
    }

    // Final assertions
    console.log('\n=== Test Results ===');
    expect(stillVisible).toBe(true);
    console.log('✓ Message persisted successfully');

    // Take screenshot for verification
    await page.screenshot({ path: 'test-results/ai-chat-final-state.png', fullPage: true });
    console.log('✓ Screenshot saved to test-results/ai-chat-final-state.png');

    console.log('\n=== Test Passed ===\n');
  });
});

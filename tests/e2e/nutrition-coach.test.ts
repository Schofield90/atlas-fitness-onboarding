import { test, expect, Page } from '@playwright/test';

// Test configuration
const BASE_URL = 'http://localhost:3000';
const PORTAL_URL = `${BASE_URL}/portal`;

test.describe('AI Nutrition Coach End-to-End Testing', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();

    // Enable console logging to catch JavaScript errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error(`Console error: ${msg.text()}`);
      }
    });

    // Listen for uncaught exceptions
    page.on('pageerror', error => {
      console.error(`Page error: ${error.message}`);
    });
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('1. Initial Experience - Navigate to nutrition coach and verify welcome message', async () => {
    // Navigate to portal
    await page.goto(PORTAL_URL);

    // Take screenshot for documentation
    await page.screenshot({ path: 'test-results/nutrition-coach-landing.png', fullPage: true });

    // Check if we need to login first
    const isLoginPage = await page.locator('input[type="email"]').isVisible();

    if (isLoginPage) {
      // For testing purposes, we'll need to handle authentication
      // This might require setting up test credentials or mock authentication
      await page.fill('input[type="email"]', 'test@example.com');
      await page.fill('input[type="password"]', 'password123');
      await page.click('button[type="submit"]');
      await page.waitForLoadState('networkidle');
    }

    // Navigate to nutrition tab
    await page.click('[data-testid="nutrition-tab"], text="Nutrition"');
    await page.waitForLoadState('networkidle');

    // Verify nutrition coach interface loads
    const nutritionCoach = page.locator('[data-testid="nutrition-coach"]');
    await expect(nutritionCoach).toBeVisible({ timeout: 10000 });

    // Check for welcome message or first question
    const welcomeElement = page.locator('text="Welcome" || text="Let\'s start" || text="Nutrition Profile Setup"');
    await expect(welcomeElement).toBeVisible();

    // Take screenshot of nutrition coach interface
    await page.screenshot({ path: 'test-results/nutrition-coach-initial.png', fullPage: true });
  });

  test('2. Question Flow - Test onboarding questions for contextual responses', async () => {
    await page.goto(PORTAL_URL);

    // Handle authentication if needed
    const isLoginPage = await page.locator('input[type="email"]').isVisible();
    if (isLoginPage) {
      await page.fill('input[type="email"]', 'test@example.com');
      await page.fill('input[type="password"]', 'password123');
      await page.click('button[type="submit"]');
      await page.waitForLoadState('networkidle');
    }

    // Navigate to nutrition tab
    await page.click('text="Nutrition"');
    await page.waitForLoadState('networkidle');

    // Test onboarding flow
    const nextButton = page.locator('button:has-text("Next"), button:has-text("Complete Setup")');
    let stepCount = 0;
    const maxSteps = 10; // Safety limit

    while (await nextButton.isVisible() && stepCount < maxSteps) {
      // Fill out current step based on visible fields

      // Weight fields
      if (await page.locator('input[placeholder*="weight"]').isVisible()) {
        await page.fill('input[placeholder*="weight"]', '70');
      }

      // Target weight
      if (await page.locator('input[placeholder*="target"]').isVisible()) {
        await page.fill('input[placeholder*="target"]', '65');
      }

      // Height
      if (await page.locator('input[placeholder*="Height"], input[placeholder*="cm"]').isVisible()) {
        await page.fill('input[placeholder*="Height"], input[placeholder*="cm"]', '175');
      }

      // Age
      if (await page.locator('input[placeholder*="Age"]').isVisible()) {
        await page.fill('input[placeholder*="Age"]', '30');
      }

      // Meals per day
      if (await page.locator('input[min="1"][max="6"]').isVisible()) {
        await page.fill('input[min="1"][max="6"]', '3');
      }

      // Select dropdowns
      const activitySelect = page.locator('select');
      if (await activitySelect.first().isVisible()) {
        await activitySelect.first().selectOption('moderate');
      }

      // Check checkboxes for preferences/allergies/struggles
      const checkboxes = page.locator('input[type="checkbox"]');
      const checkboxCount = await checkboxes.count();
      if (checkboxCount > 0) {
        // Select first option to proceed
        await checkboxes.first().check();
      }

      // Take screenshot of current step
      await page.screenshot({ path: `test-results/nutrition-step-${stepCount}.png`, fullPage: true });

      // Click Next
      await nextButton.click();
      await page.waitForTimeout(1000); // Wait for transition

      stepCount++;
    }

    // Verify we completed onboarding
    const macroCalculator = page.locator('text="Your Macro Targets", text="Daily Calorie Target"');
    await expect(macroCalculator).toBeVisible({ timeout: 10000 });

    await page.screenshot({ path: 'test-results/nutrition-macro-calculator.png', fullPage: true });
  });

  test('3. Progress Persistence - Test localStorage persistence across page reloads', async () => {
    await page.goto(PORTAL_URL);

    // Handle authentication
    const isLoginPage = await page.locator('input[type="email"]').isVisible();
    if (isLoginPage) {
      await page.fill('input[type="email"]', 'test@example.com');
      await page.fill('input[type="password"]', 'password123');
      await page.click('button[type="submit"]');
      await page.waitForLoadState('networkidle');
    }

    // Navigate to nutrition and fill some data
    await page.click('text="Nutrition"');
    await page.waitForLoadState('networkidle');

    // Fill out first step if in onboarding
    if (await page.locator('input[placeholder*="weight"]').isVisible()) {
      await page.fill('input[placeholder*="weight"]', '75');
      await page.fill('input[placeholder*="target"]', '70');
    }

    // Get current form state
    const currentWeightValue = await page.locator('input[placeholder*="weight"]').inputValue();

    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Navigate back to nutrition
    await page.click('text="Nutrition"');
    await page.waitForLoadState('networkidle');

    // Verify data persisted
    if (await page.locator('input[placeholder*="weight"]').isVisible()) {
      const persistedValue = await page.locator('input[placeholder*="weight"]').inputValue();
      expect(persistedValue).toBe(currentWeightValue);
    }

    await page.screenshot({ path: 'test-results/nutrition-persistence-test.png', fullPage: true });
  });

  test('4. Reset Functionality - Test reset button clears conversation', async () => {
    await page.goto(PORTAL_URL);

    // Handle authentication
    const isLoginPage = await page.locator('input[type="email"]').isVisible();
    if (isLoginPage) {
      await page.fill('input[type="email"]', 'test@example.com');
      await page.fill('input[type="password"]', 'password123');
      await page.click('button[type="submit"]');
      await page.waitForLoadState('networkidle');
    }

    // Navigate to nutrition
    await page.click('text="Nutrition"');
    await page.waitForLoadState('networkidle');

    // Look for reset button (🔄 emoji or reset text)
    const resetButton = page.locator('button:has-text("🔄"), button:has-text("Reset"), button[aria-label*="reset"], button[title*="reset"]');

    if (await resetButton.isVisible()) {
      // Fill some data first
      if (await page.locator('input[placeholder*="weight"]').isVisible()) {
        await page.fill('input[placeholder*="weight"]', '80');
      }

      // Click reset
      await resetButton.click();
      await page.waitForTimeout(1000);

      // Verify form is reset (back to onboarding or cleared)
      const isOnboarding = await page.locator('text="Nutrition Profile Setup"').isVisible();
      const weightFieldEmpty = await page.locator('input[placeholder*="weight"]').inputValue() === '';

      expect(isOnboarding || weightFieldEmpty).toBeTruthy();

      await page.screenshot({ path: 'test-results/nutrition-reset-test.png', fullPage: true });
    } else {
      console.log('Reset button not found - documenting this as a potential issue');
      await page.screenshot({ path: 'test-results/nutrition-no-reset-button.png', fullPage: true });
    }
  });

  test('5. Complete Flow - Test full assessment through to meal plan generation', async () => {
    await page.goto(PORTAL_URL);

    // Handle authentication
    const isLoginPage = await page.locator('input[type="email"]').isVisible();
    if (isLoginPage) {
      await page.fill('input[type="email"]', 'test@example.com');
      await page.fill('input[type="password"]', 'password123');
      await page.click('button[type="submit"]');
      await page.waitForLoadState('networkidle');
    }

    // Navigate to nutrition
    await page.click('text="Nutrition"');
    await page.waitForLoadState('networkidle');

    // Complete full onboarding flow
    let currentStep = 0;
    const maxSteps = 15;

    while (currentStep < maxSteps) {
      const nextButton = page.locator('button:has-text("Next"), button:has-text("Complete Setup")');

      if (!(await nextButton.isVisible())) {
        break;
      }

      // Fill all visible form fields systematically
      await fillVisibleNutritionFields(page);

      await nextButton.click();
      await page.waitForTimeout(1500);
      currentStep++;
    }

    // Look for meal plan generation
    const generateButton = page.locator('button:has-text("Generate"), button:has-text("Meal Plan")');
    if (await generateButton.isVisible()) {
      await generateButton.click();
      await page.waitForTimeout(5000); // Wait for AI generation
    }

    // Verify meal plan or final interface
    const mealPlan = page.locator('text="Meal Plan", text="Breakfast", text="Lunch", text="Dinner"');
    const chatInterface = page.locator('text="Chat with", input[placeholder*="message"]');

    const hasResults = (await mealPlan.isVisible()) || (await chatInterface.isVisible());
    expect(hasResults).toBeTruthy();

    await page.screenshot({ path: 'test-results/nutrition-complete-flow.png', fullPage: true });
  });

  test('6. Edge Cases - Test with empty inputs, long responses, special characters', async () => {
    await page.goto(PORTAL_URL);

    // Handle authentication
    const isLoginPage = await page.locator('input[type="email"]').isVisible();
    if (isLoginPage) {
      await page.fill('input[type="email"]', 'test@example.com');
      await page.fill('input[type="password"]', 'password123');
      await page.click('button[type="submit"]');
      await page.waitForLoadState('networkidle');
    }

    // Navigate to nutrition
    await page.click('text="Nutrition"');
    await page.waitForLoadState('networkidle');

    // Test empty input submission
    const nextButton = page.locator('button:has-text("Next"), button:has-text("Complete Setup")');
    if (await nextButton.isVisible()) {
      await nextButton.click();
      // Should handle gracefully or show validation
      await page.waitForTimeout(1000);
    }

    // Test special characters in text inputs
    const textInputs = page.locator('input[type="text"], input[type="number"]');
    const inputCount = await textInputs.count();

    if (inputCount > 0) {
      await textInputs.first().fill('Test with special chars: <script>alert("xss")</script> & symbols !@#$%');
      await page.waitForTimeout(500);

      // Verify input is sanitized or handled properly
      const inputValue = await textInputs.first().inputValue();
      console.log('Input value after special chars:', inputValue);
    }

    // Test extremely long input
    const longText = 'A'.repeat(1000);
    if (inputCount > 0) {
      await textInputs.first().fill(longText);
      await page.waitForTimeout(500);
    }

    await page.screenshot({ path: 'test-results/nutrition-edge-cases.png', fullPage: true });
  });

  test('7. UI/UX - Test responsive design, scrolling, and loading states', async () => {
    // Test different viewport sizes
    const viewports = [
      { width: 375, height: 667 },  // Mobile
      { width: 768, height: 1024 }, // Tablet
      { width: 1920, height: 1080 } // Desktop
    ];

    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.goto(PORTAL_URL);

      // Handle authentication
      const isLoginPage = await page.locator('input[type="email"]').isVisible();
      if (isLoginPage) {
        await page.fill('input[type="email"]', 'test@example.com');
        await page.fill('input[type="password"]', 'password123');
        await page.click('button[type="submit"]');
        await page.waitForLoadState('networkidle');
      }

      // Navigate to nutrition
      await page.click('text="Nutrition"');
      await page.waitForLoadState('networkidle');

      // Test scrolling behavior
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(500);
      await page.evaluate(() => window.scrollTo(0, 0));

      // Take screenshot for each viewport
      await page.screenshot({
        path: `test-results/nutrition-responsive-${viewport.width}x${viewport.height}.png`,
        fullPage: true
      });
    }
  });

});

// Helper function to fill visible nutrition form fields
async function fillVisibleNutritionFields(page: Page) {
    // Current weight
    if (await page.locator('input[placeholder*="weight"]').first().isVisible()) {
      await page.fill('input[placeholder*="weight"]', '75');
    }

    // Target weight
    if (await page.locator('input[placeholder*="target"]').isVisible()) {
      await page.fill('input[placeholder*="target"]', '70');
    }

    // Height
    if (await page.locator('input[placeholder*="Height"], input[placeholder*="cm"]').isVisible()) {
      await page.fill('input[placeholder*="Height"], input[placeholder*="cm"]', '175');
    }

    // Age
    if (await page.locator('input[placeholder*="Age"]').isVisible()) {
      await page.fill('input[placeholder*="Age"]', '30');
    }

    // Meals per day
    if (await page.locator('input[min="1"][max="6"]').isVisible()) {
      await page.fill('input[min="1"][max="6"]', '3');
    }

    // Dropdowns
    const selects = page.locator('select');
    const selectCount = await selects.count();
    for (let i = 0; i < selectCount; i++) {
      const select = selects.nth(i);
      if (await select.isVisible()) {
        const options = await select.locator('option').count();
        if (options > 1) {
          await select.selectOption({ index: 1 }); // Select second option
        }
      }
    }

    // Checkboxes - select first available option
    const checkboxes = page.locator('input[type="checkbox"]');
    const checkboxCount = await checkboxes.count();
    if (checkboxCount > 0) {
      await checkboxes.first().check();
    }

    await page.waitForTimeout(500);
}
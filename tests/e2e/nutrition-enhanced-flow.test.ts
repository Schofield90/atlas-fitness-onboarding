/**
 * End-to-End Test Suite for Enhanced AI Nutrition Coaching System
 *
 * Tests complete user flows across all new components:
 * - Navigation to nutrition dashboard
 * - AI Coach interactions
 * - Progress tracking workflows
 * - Behavioral coaching features
 * - Integration between components
 */

import { test, expect, Page } from '@playwright/test';

test.describe('Enhanced AI Nutrition Coaching System E2E Tests', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();

    // Navigate to the nutrition page (assuming authentication is handled)
    await page.goto('http://localhost:3000/client/nutrition');

    // Wait for the page to load
    await page.waitForLoadState('networkidle');
  });

  test.describe('Navigation and Initial Load', () => {
    test('should load nutrition dashboard with all tabs visible', async () => {
      // Check main header
      await expect(page.locator('h1')).toContainText('AI Nutrition Coach');
      await expect(page.locator('text=Your personalized nutrition assistant')).toBeVisible();

      // Check all tabs are present
      await expect(page.locator('text=AI Coach')).toBeVisible();
      await expect(page.locator('text=Meal Plan')).toBeVisible();
      await expect(page.locator('text=Progress')).toBeVisible();
      await expect(page.locator('text=Habits')).toBeVisible();
      await expect(page.locator('text=Track Macros')).toBeVisible();
    });

    test('should display profile summary and quick actions', async () => {
      // Check profile summary card
      await expect(page.locator('text=Your Profile')).toBeVisible();
      await expect(page.locator('text=Daily Calories')).toBeVisible();

      // Check quick actions
      await expect(page.locator('text=Quick Actions')).toBeVisible();
      await expect(page.locator('text=Track Today\'s Macros')).toBeVisible();
      await expect(page.locator('text=View Progress')).toBeVisible();
    });

    test('should handle loading states gracefully', async () => {
      // Reload and check for loading spinner
      await page.reload();

      // Should see loading spinner initially
      const loadingSpinner = page.locator('.animate-spin');
      await expect(loadingSpinner).toBeVisible({ timeout: 1000 });

      // Then content should load
      await expect(page.locator('h1')).toContainText('AI Nutrition Coach', { timeout: 10000 });
    });
  });

  test.describe('AI Coach Functionality', () => {
    test.beforeEach(async () => {
      // Navigate to AI Coach tab
      await page.locator('text=AI Coach').click();
      await page.waitForTimeout(500);
    });

    test('should display coaching phases correctly', async () => {
      // Check all coaching phases are visible
      await expect(page.locator('text=Comprehensive Assessment')).toBeVisible();
      await expect(page.locator('text=Mindset & Behavior')).toBeVisible();
      await expect(page.locator('text=Performance Optimization')).toBeVisible();
    });

    test('should allow phase transitions', async () => {
      // Click on different phases
      await page.locator('text=Mindset & Behavior').click();
      await expect(page.locator('text=Building sustainable habits')).toBeVisible();

      await page.locator('text=Performance Optimization').click();
      await expect(page.locator('text=Fine-tuning for maximum results')).toBeVisible();
    });

    test('should handle chat interactions', async () => {
      // Find the message input
      const messageInput = page.locator('input[placeholder*="Type your response"]');
      await expect(messageInput).toBeVisible();

      // Type a message
      await messageInput.fill('I need help with meal planning for weight loss');

      // Send the message
      await page.locator('button:has-text("Send")').click();

      // Verify message was sent (input should be cleared)
      await expect(messageInput).toHaveValue('');

      // Check that message appears in conversation
      await expect(page.locator('text=I need help with meal planning for weight loss')).toBeVisible();
    });

    test('should support keyboard shortcuts for sending messages', async () => {
      const messageInput = page.locator('input[placeholder*="Type your response"]');

      await messageInput.fill('Testing keyboard shortcut');
      await messageInput.press('Enter');

      await expect(messageInput).toHaveValue('');
      await expect(page.locator('text=Testing keyboard shortcut')).toBeVisible();
    });

    test('should display coach responses with proper formatting', async () => {
      const messageInput = page.locator('input[placeholder*="Type your response"]');

      await messageInput.fill('What should I eat for breakfast?');
      await messageInput.press('Enter');

      // Wait for coach response (this would be mocked in real test)
      await page.waitForTimeout(2000);

      // Check for coach response formatting
      await expect(page.locator('[data-testid="coach-message"]')).toBeVisible();
    });
  });

  test.describe('Progress Tracker Functionality', () => {
    test.beforeEach(async () => {
      await page.locator('text=Progress').click();
      await page.waitForTimeout(500);
    });

    test('should display all progress tabs', async () => {
      await expect(page.locator('text=Overview')).toBeVisible();
      await expect(page.locator('text=Trends')).toBeVisible();
      await expect(page.locator('text=Check-in')).toBeVisible();
      await expect(page.locator('text=Goals')).toBeVisible();
    });

    test('should open daily check-in modal', async () => {
      await page.locator('button:has-text("Daily Check-in")').click();

      await expect(page.locator('text=How are you feeling today?')).toBeVisible();
      await expect(page.locator('label:has-text("Weight")')).toBeVisible();
      await expect(page.locator('label:has-text("Energy Level")')).toBeVisible();
    });

    test('should complete daily check-in form', async () => {
      await page.locator('button:has-text("Daily Check-in")').click();

      // Fill out check-in form
      await page.locator('input[type="number"]:near(label:has-text("Weight"))').fill('75.5');

      // Set energy level slider
      const energySlider = page.locator('input[type="range"]:near(label:has-text("Energy"))');
      await energySlider.fill('8');

      // Add notes
      await page.locator('textarea[placeholder*="notes"]').fill('Feeling great today!');

      // Submit check-in
      await page.locator('button:has-text("Save Check-in")').click();

      // Verify modal closes
      await expect(page.locator('text=How are you feeling today?')).not.toBeVisible();
    });

    test('should display charts in trends tab', async () => {
      await page.locator('text=Trends').click();

      // Check for chart containers (using data-testid)
      await expect(page.locator('[data-testid="weight-chart"]')).toBeVisible();
      await expect(page.locator('[data-testid="energy-chart"]')).toBeVisible();
    });

    test('should manage goals effectively', async () => {
      await page.locator('text=Goals').click();

      await expect(page.locator('button:has-text("Add New Goal")')).toBeVisible();

      // Add a new goal
      await page.locator('button:has-text("Add New Goal")').click();
      await page.locator('input[placeholder*="Goal description"]').fill('Lose 5kg in 3 months');
      await page.locator('button:has-text("Save Goal")').click();

      // Verify goal appears in list
      await expect(page.locator('text=Lose 5kg in 3 months')).toBeVisible();
    });
  });

  test.describe('Behavioral Coach Functionality', () => {
    test.beforeEach(async () => {
      await page.locator('text=Habits').click();
      await page.waitForTimeout(500);
    });

    test('should display all behavioral coach tabs', async () => {
      await expect(page.locator('text=Habits')).toBeVisible();
      await expect(page.locator('text=Goals')).toBeVisible();
      await expect(page.locator('text=Achievements')).toBeVisible();
      await expect(page.locator('text=Tips')).toBeVisible();
    });

    test('should add new habits from presets', async () => {
      await page.locator('button:has-text("Add New Habit")').click();

      await expect(page.locator('text=Choose from presets')).toBeVisible();

      // Select a preset habit
      await page.locator('text=Drink Water Upon Waking').click();
      await page.locator('button:has-text("Add Habit")').click();

      // Verify habit appears in list
      await expect(page.locator('text=Drink Water Upon Waking')).toBeVisible();
    });

    test('should track habit completion', async () => {
      // Assuming a habit exists, click to complete it
      const habitCheckbox = page.locator('input[type="checkbox"]:near(text="Drink Water")').first();
      await habitCheckbox.check();

      // Verify completion is reflected in UI
      await expect(habitCheckbox).toBeChecked();

      // Check for streak update
      await expect(page.locator('text=Current Streak')).toBeVisible();
    });

    test('should display achievements and points', async () => {
      await page.locator('text=Achievements').click();

      await expect(page.locator('text=Your Achievements')).toBeVisible();
      await expect(page.locator('text=Total Points')).toBeVisible();

      // Check for achievement cards
      await expect(page.locator('[data-testid="achievement-card"]')).toBeVisible();
    });

    test('should provide personalized coaching tips', async () => {
      await page.locator('text=Tips').click();

      await expect(page.locator('text=Personalized Tips')).toBeVisible();

      // Check for tip cards with actionable content
      await expect(page.locator('[data-testid="coaching-tip"]')).toBeVisible();
      await expect(page.locator('button:has-text("Try This Tip")')).toBeVisible();
    });
  });

  test.describe('Integration and Cross-Component Functionality', () => {
    test('should maintain state when switching between tabs', async () => {
      // Start in AI Coach, send a message
      await page.locator('text=AI Coach').click();
      const messageInput = page.locator('input[placeholder*="Type your response"]');
      await messageInput.fill('Test message for state persistence');
      await messageInput.press('Enter');

      // Switch to Progress tab
      await page.locator('text=Progress').click();
      await page.waitForTimeout(500);

      // Switch back to AI Coach
      await page.locator('text=AI Coach').click();

      // Verify message is still there
      await expect(page.locator('text=Test message for state persistence')).toBeVisible();
    });

    test('should use quick actions for navigation', async () => {
      // Click "Track Today's Macros" quick action
      await page.locator('text=Track Today\'s Macros').click();

      // Should switch to macros tab
      await expect(page.locator('text=Macro Tracking')).toBeVisible();

      // Click "View Progress" quick action
      await page.locator('text=View Progress').click();

      // Should switch to progress tab
      await expect(page.locator('text=Overview')).toBeVisible();
    });

    test('should handle responsive design correctly', async () => {
      // Test mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });

      // Verify tabs are still accessible (may be in a dropdown or scrollable)
      await expect(page.locator('text=AI Coach')).toBeVisible();

      // Test tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 });

      // Verify layout adjusts appropriately
      await expect(page.locator('text=Your Profile')).toBeVisible();

      // Test desktop viewport
      await page.setViewportSize({ width: 1200, height: 800 });

      // Verify full layout is displayed
      await expect(page.locator('.grid-cols-3')).toBeVisible();
    });

    test('should handle errors gracefully', async () => {
      // Simulate network error by intercepting API calls
      await page.route('**/api/nutrition/**', route => route.abort());

      await page.reload();

      // Should show error state or fallback UI
      await expect(page.locator('text=temporarily unavailable')).toBeVisible();
    });
  });

  test.describe('Accessibility and User Experience', () => {
    test('should be keyboard navigable', async () => {
      // Tab through the interface
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');

      // Verify focus indicators are visible
      const focusedElement = page.locator(':focus');
      await expect(focusedElement).toBeVisible();
    });

    test('should have proper ARIA labels and roles', async () => {
      // Check for proper ARIA attributes
      await expect(page.locator('input[aria-label]')).toBeVisible();
      await expect(page.locator('button[aria-label]')).toBeVisible();

      // Check for role attributes
      await expect(page.locator('[role="tablist"]')).toBeVisible();
      await expect(page.locator('[role="tab"]')).toBeVisible();
    });

    test('should provide clear feedback for user actions', async () => {
      await page.locator('text=Habits').click();
      await page.locator('button:has-text("Add New Habit")').click();

      // Should provide feedback when adding habit
      await page.locator('text=Drink Water Upon Waking').click();
      await page.locator('button:has-text("Add Habit")').click();

      // Look for success message or visual feedback
      await expect(page.locator('text=Habit added successfully')).toBeVisible();
    });

    test('should handle loading states with proper indicators', async () => {
      // Reload page and check for loading states
      await page.reload();

      // Should show loading spinner
      await expect(page.locator('.animate-spin')).toBeVisible();

      // Should transition to loaded state
      await expect(page.locator('h1:has-text("AI Nutrition Coach")')).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Performance and Optimization', () => {
    test('should load all components within acceptable time', async () => {
      const startTime = Date.now();

      await page.goto('http://localhost:3000/client/nutrition');
      await page.waitForLoadState('networkidle');

      const loadTime = Date.now() - startTime;

      // Should load within 5 seconds
      expect(loadTime).toBeLessThan(5000);
    });

    test('should not have console errors', async () => {
      const consoleErrors: string[] = [];

      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });

      await page.reload();
      await page.waitForTimeout(3000);

      // Filter out known acceptable errors (if any)
      const criticalErrors = consoleErrors.filter(error =>
        !error.includes('favicon') &&
        !error.includes('service-worker')
      );

      expect(criticalErrors).toHaveLength(0);
    });

    test('should efficiently render charts only when visible', async () => {
      // Progress tab should not render charts until selected
      await page.locator('text=AI Coach').click();

      // Charts should not be in DOM yet
      await expect(page.locator('[data-testid="line-chart"]')).not.toBeVisible();

      // Switch to Progress > Trends
      await page.locator('text=Progress').click();
      await page.locator('text=Trends').click();

      // Now charts should be rendered
      await expect(page.locator('[data-testid="line-chart"]')).toBeVisible();
    });
  });
});
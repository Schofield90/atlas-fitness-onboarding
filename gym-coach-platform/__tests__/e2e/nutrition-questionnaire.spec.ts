import { test, expect, Page } from '@playwright/test';

test.describe('Nutrition Questionnaire E2E Tests', () => {
  let page: Page;

  // Setup authentication before each test
  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();

    // Navigate to signin
    await page.goto('http://localhost:3003/signin', {
      waitUntil: 'networkidle',
      timeout: 60000
    });

    // Login with test credentials
    await page.fill('input[type="email"]', 'sam@atlas-gyms.co.uk');
    await page.fill('input[type="password"]', '@Aa80236661');
    await page.click('button[type="submit"]:has-text("Log In")');

    // Wait for login to complete
    await page.waitForTimeout(3000);
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('1. Initial Load Test - Verify 5 questions load with 0% accuracy', async () => {
    console.log('Starting Initial Load Test...');

    // Navigate to nutrition questionnaire
    await page.goto('http://localhost:3003/client/nutrition', {
      waitUntil: 'networkidle',
      timeout: 60000
    });

    await page.screenshot({
      path: 'test-results/nutrition-initial-load.png',
      fullPage: true
    });

    // Wait for content to load
    await page.waitForSelector('h1:has-text("Nutrition Assessment")', { timeout: 10000 });

    // Check that initial 5 questions are present
    const ageInput = page.locator('input[id="age"]');
    const weightInput = page.locator('input[id="weight"]');
    const heightInput = page.locator('input[id="height"]');
    const goalSelect = page.locator('select[id="goal"], button:has(span:text-is("Select an option"))').first();
    const activitySelect = page.locator('select[id="activity_level"], button:has(span:text-is("Select an option"))').last();

    await expect(ageInput).toBeVisible();
    await expect(weightInput).toBeVisible();
    await expect(heightInput).toBeVisible();
    await expect(goalSelect).toBeVisible();
    await expect(activitySelect).toBeVisible();

    // Verify accuracy starts at 0%
    const accuracyBadge = page.locator('text=/\\d+% Complete/');
    await expect(accuracyBadge).toBeVisible();

    const accuracyText = await accuracyBadge.textContent();
    const accuracyMatch = accuracyText?.match(/(\d+)% Complete/);
    const accuracyValue = accuracyMatch ? parseInt(accuracyMatch[1]) : -1;

    console.log('Initial accuracy:', accuracyValue + '%');
    expect(accuracyValue).toBe(0);

    // Verify "answered questions" counter shows 0
    const questionsAnswered = page.locator('text=/\\d+ questions answered/');
    await expect(questionsAnswered).toBeVisible();

    const answeredText = await questionsAnswered.textContent();
    const answeredMatch = answeredText?.match(/(\d+) questions answered/);
    const answeredCount = answeredMatch ? parseInt(answeredMatch[1]) : -1;

    console.log('Initial questions answered:', answeredCount);
    expect(answeredCount).toBe(0);

    console.log('✅ Initial Load Test PASSED');
  });

  test('2. Accuracy Calculation Test - Answer 3 basic questions and verify accuracy is 24%', async () => {
    console.log('Starting Accuracy Calculation Test...');

    await page.goto('http://localhost:3003/client/nutrition', {
      waitUntil: 'networkidle',
      timeout: 60000
    });

    await page.waitForSelector('h1:has-text("Nutrition Assessment")', { timeout: 10000 });

    // Fill 3 basic questions: age=30, weight=70, height=175
    await page.fill('input[id="age"]', '30');
    await page.fill('input[id="weight"]', '70');
    await page.fill('input[id="height"]', '175');

    // Wait a moment for state updates
    await page.waitForTimeout(1000);

    await page.screenshot({
      path: 'test-results/nutrition-3-questions-filled.png',
      fullPage: true
    });

    // Check accuracy percentage - should be 24% (3/5 basic * 40% = 24%)
    const accuracyBadge = page.locator('text=/\\d+% Complete/');
    await expect(accuracyBadge).toBeVisible();

    const accuracyText = await accuracyBadge.textContent();
    const accuracyMatch = accuracyText?.match(/(\d+)% Complete/);
    const accuracyValue = accuracyMatch ? parseInt(accuracyMatch[1]) : -1;

    console.log('Accuracy after 3 questions:', accuracyValue + '%');
    expect(accuracyValue).toBe(24);

    // Verify it's NOT 82% (testing against hardcoded value)
    expect(accuracyValue).not.toBe(82);

    // Verify questions answered counter shows 3
    const questionsAnswered = page.locator('text=/\\d+ questions answered/');
    const answeredText = await questionsAnswered.textContent();
    const answeredMatch = answeredText?.match(/(\d+) questions answered/);
    const answeredCount = answeredMatch ? parseInt(answeredMatch[1]) : -1;

    console.log('Questions answered after 3 filled:', answeredCount);
    expect(answeredCount).toBe(3);

    console.log('✅ Accuracy Calculation Test PASSED');
  });

  test('3. Adaptive Questions Test - Complete initial questions and verify new questions are generated', async () => {
    console.log('Starting Adaptive Questions Test...');

    await page.goto('http://localhost:3003/client/nutrition', {
      waitUntil: 'networkidle',
      timeout: 60000
    });

    await page.waitForSelector('h1:has-text("Nutrition Assessment")', { timeout: 10000 });

    // Fill all 5 initial questions
    await page.fill('input[id="age"]', '30');
    await page.fill('input[id="weight"]', '70');
    await page.fill('input[id="height"]', '175');

    // Handle goal select dropdown
    const goalTrigger = page.locator('[id="goal"] + button, button:has(span:text-is("Select an option"))').first();
    await goalTrigger.click();
    await page.waitForTimeout(500);
    await page.locator('text="Weight Loss"').click();

    // Handle activity level select dropdown
    const activityTrigger = page.locator('[id="activity_level"] + button, button:has(span:text-is("Select an option"))').last();
    await activityTrigger.click();
    await page.waitForTimeout(500);
    await page.locator('text="Moderately Active"').click();

    await page.waitForTimeout(1000);

    await page.screenshot({
      path: 'test-results/nutrition-all-5-questions-filled.png',
      fullPage: true
    });

    // Store initial question count
    const initialQuestions = await page.locator('[class*="space-y-2"]:has(label)').count();
    console.log('Initial question count:', initialQuestions);

    // Click "Make Plan More Accurate" button
    const generateButton = page.locator('button:has-text("Make Plan More Accurate")');
    await expect(generateButton).toBeVisible();
    await expect(generateButton).toBeEnabled();

    await generateButton.click();

    // Wait for generation to complete (look for success message or new questions)
    await page.waitForSelector('text=New questions generated!, text=Added', { timeout: 15000 });

    await page.waitForTimeout(2000);

    await page.screenshot({
      path: 'test-results/nutrition-adaptive-questions-generated.png',
      fullPage: true
    });

    // Verify new questions appeared
    const newQuestionCount = await page.locator('[class*="space-y-2"]:has(label)').count();
    console.log('Question count after generation:', newQuestionCount);
    expect(newQuestionCount).toBeGreaterThan(initialQuestions);

    // Verify success message appeared
    const successAlert = page.locator('text=New questions generated!');
    await expect(successAlert).toBeVisible();

    console.log('✅ Adaptive Questions Test PASSED');
  });

  test('4. No Repetition Test - Verify questions never repeat across multiple generations', async () => {
    console.log('Starting No Repetition Test...');

    await page.goto('http://localhost:3003/client/nutrition', {
      waitUntil: 'networkidle',
      timeout: 60000
    });

    await page.waitForSelector('h1:has-text("Nutrition Assessment")', { timeout: 10000 });

    // Complete initial questions
    await page.fill('input[id="age"]', '30');
    await page.fill('input[id="weight"]', '70');
    await page.fill('input[id="height"]', '175');

    const goalTrigger = page.locator('[id="goal"] + button, button:has(span:text-is("Select an option"))').first();
    await goalTrigger.click();
    await page.waitForTimeout(500);
    await page.locator('text="Muscle Gain"').click();

    const activityTrigger = page.locator('[id="activity_level"] + button, button:has(span:text-is("Select an option"))').last();
    await activityTrigger.click();
    await page.waitForTimeout(500);
    await page.locator('text="Very Active"').click();

    await page.waitForTimeout(1000);

    // First generation
    await page.locator('button:has-text("Make Plan More Accurate")').click();
    await page.waitForSelector('text=New questions generated!', { timeout: 15000 });
    await page.waitForTimeout(2000);

    // Collect first set of generated question texts
    const firstGenQuestions = await page.locator('label').allTextContents();
    console.log('First generation questions:', firstGenQuestions.length);

    await page.screenshot({
      path: 'test-results/nutrition-first-generation.png',
      fullPage: true
    });

    // Fill some of the new questions to enable second generation
    const newInputs = page.locator('input, textarea, button:has(span:text-is("Select an option"))').nth(5); // First new question
    if (await newInputs.count() > 0) {
      const inputType = await newInputs.getAttribute('type');
      if (inputType === 'text' || inputType === 'number') {
        await newInputs.fill('Test answer');
      } else if (await newInputs.locator('span:text-is("Select an option")').count() > 0) {
        await newInputs.click();
        await page.waitForTimeout(500);
        const firstOption = page.locator('[role="option"]').first();
        if (await firstOption.count() > 0) {
          await firstOption.click();
        }
      }
    }

    await page.waitForTimeout(1000);

    // Second generation
    const secondGenButton = page.locator('button:has-text("Make Plan More Accurate")');
    if (await secondGenButton.isEnabled()) {
      await secondGenButton.click();
      await page.waitForSelector('text=New questions generated!', { timeout: 15000 });
      await page.waitForTimeout(2000);

      // Collect second set of generated question texts
      const secondGenQuestions = await page.locator('label').allTextContents();
      console.log('Second generation questions:', secondGenQuestions.length);

      await page.screenshot({
        path: 'test-results/nutrition-second-generation.png',
        fullPage: true
      });

      // Verify no overlap between generations (excluding initial 5)
      const firstSetNew = firstGenQuestions.slice(5); // Skip initial 5 questions
      const secondSetNew = secondGenQuestions.slice(firstGenQuestions.length); // Only new questions from second gen

      const hasOverlap = firstSetNew.some(q1 =>
        secondSetNew.some(q2 => q1.trim() === q2.trim())
      );

      console.log('First set new questions:', firstSetNew.length);
      console.log('Second set new questions:', secondSetNew.length);
      console.log('Has overlap:', hasOverlap);

      expect(hasOverlap).toBe(false);
    }

    console.log('✅ No Repetition Test PASSED');
  });

  test('5. Save and Reload Test - Verify data persists across page refreshes', async () => {
    console.log('Starting Save and Reload Test...');

    await page.goto('http://localhost:3003/client/nutrition', {
      waitUntil: 'networkidle',
      timeout: 60000
    });

    await page.waitForSelector('h1:has-text("Nutrition Assessment")', { timeout: 10000 });

    // Fill initial data
    await page.fill('input[id="age"]', '25');
    await page.fill('input[id="weight"]', '65');
    await page.fill('input[id="height"]', '170');

    const goalTrigger = page.locator('[id="goal"] + button, button:has(span:text-is("Select an option"))').first();
    await goalTrigger.click();
    await page.waitForTimeout(500);
    await page.locator('text="Athletic Performance"').click();

    const activityTrigger = page.locator('[id="activity_level"] + button, button:has(span:text-is("Select an option"))').last();
    await activityTrigger.click();
    await page.waitForTimeout(500);
    await page.locator('text="Extremely Active"').click();

    await page.waitForTimeout(1000);

    // Save responses
    await page.locator('button:has-text("Save Responses")').click();
    await page.waitForSelector('text=Responses saved!', { timeout: 10000 });

    // Get accuracy before refresh
    const accuracyBefore = await page.locator('text=/\\d+% Complete/').textContent();

    await page.screenshot({
      path: 'test-results/nutrition-before-refresh.png',
      fullPage: true
    });

    console.log('Accuracy before refresh:', accuracyBefore);

    // Refresh page
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForSelector('h1:has-text("Nutrition Assessment")', { timeout: 10000 });

    await page.waitForTimeout(2000);

    await page.screenshot({
      path: 'test-results/nutrition-after-refresh.png',
      fullPage: true
    });

    // Verify data persisted
    const ageValue = await page.locator('input[id="age"]').inputValue();
    const weightValue = await page.locator('input[id="weight"]').inputValue();
    const heightValue = await page.locator('input[id="height"]').inputValue();

    expect(ageValue).toBe('25');
    expect(weightValue).toBe('65');
    expect(heightValue).toBe('170');

    // Verify accuracy persisted
    const accuracyAfter = await page.locator('text=/\\d+% Complete/').textContent();
    console.log('Accuracy after refresh:', accuracyAfter);
    expect(accuracyAfter).toBe(accuracyBefore);

    // Verify responses summary shows saved data
    const summaryAge = page.locator('text=25').nth(0);
    const summaryWeight = page.locator('text=65').nth(0);
    const summaryHeight = page.locator('text=170').nth(0);

    await expect(summaryAge).toBeVisible();
    await expect(summaryWeight).toBeVisible();
    await expect(summaryHeight).toBeVisible();

    console.log('✅ Save and Reload Test PASSED');
  });

  test('6. Error Handling Test - Verify proper error messages and network failure handling', async () => {
    console.log('Starting Error Handling Test...');

    await page.goto('http://localhost:3003/client/nutrition', {
      waitUntil: 'networkidle',
      timeout: 60000
    });

    await page.waitForSelector('h1:has-text("Nutrition Assessment")', { timeout: 10000 });

    // Test incomplete required fields
    await page.fill('input[id="age"]', '30');
    await page.fill('input[id="weight"]', '70');
    // Leave height, goal, and activity level empty

    // Try to generate questions with incomplete data
    const generateButton = page.locator('button:has-text("Make Plan More Accurate")');
    await expect(generateButton).toBeDisabled();

    // Verify helper text about unanswered questions
    const helperText = page.locator('text=Please answer all required questions');
    await expect(helperText).toBeVisible();

    await page.screenshot({
      path: 'test-results/nutrition-incomplete-fields.png',
      fullPage: true
    });

    // Complete the form properly
    await page.fill('input[id="height"]', '175');

    const goalTrigger = page.locator('[id="goal"] + button, button:has(span:text-is("Select an option"))').first();
    await goalTrigger.click();
    await page.waitForTimeout(500);
    await page.locator('text="Weight Loss"').click();

    const activityTrigger = page.locator('[id="activity_level"] + button, button:has(span:text-is("Select an option"))').last();
    await activityTrigger.click();
    await page.waitForTimeout(500);
    await page.locator('text="Moderately Active"').click();

    await page.waitForTimeout(1000);

    // Verify button is now enabled
    await expect(generateButton).toBeEnabled();

    // Test network failure scenario by intercepting API calls
    await page.route('**/api/client/nutrition/questions', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'Internal server error'
        })
      });
    });

    await generateButton.click();

    // Wait for error message
    await page.waitForSelector('text=Failed to generate new questions', { timeout: 10000 });

    const errorAlert = page.locator('text=Error');
    await expect(errorAlert).toBeVisible();

    const errorDescription = page.locator('text=Failed to generate new questions');
    await expect(errorDescription).toBeVisible();

    await page.screenshot({
      path: 'test-results/nutrition-network-error.png',
      fullPage: true
    });

    console.log('✅ Error Handling Test PASSED');
  });

  test('7. Dynamic Accuracy Calculation Test - Verify accuracy changes correctly as more questions are answered', async () => {
    console.log('Starting Dynamic Accuracy Calculation Test...');

    await page.goto('http://localhost:3003/client/nutrition', {
      waitUntil: 'networkidle',
      timeout: 60000
    });

    await page.waitForSelector('h1:has-text("Nutrition Assessment")', { timeout: 10000 });

    // Test accuracy progression
    const accuracyProgression = [];

    // Initial state - 0%
    let accuracyText = await page.locator('text=/\\d+% Complete/').textContent();
    let accuracy = parseInt(accuracyText?.match(/(\d+)% Complete/)?.[1] || '0');
    accuracyProgression.push({ stage: 'initial', accuracy });
    expect(accuracy).toBe(0);

    // Answer 1 question - should be 8% (1/5 * 40%)
    await page.fill('input[id="age"]', '30');
    await page.waitForTimeout(500);
    accuracyText = await page.locator('text=/\\d+% Complete/').textContent();
    accuracy = parseInt(accuracyText?.match(/(\d+)% Complete/)?.[1] || '0');
    accuracyProgression.push({ stage: '1 question', accuracy });
    expect(accuracy).toBe(8);

    // Answer 2 questions - should be 16% (2/5 * 40%)
    await page.fill('input[id="weight"]', '70');
    await page.waitForTimeout(500);
    accuracyText = await page.locator('text=/\\d+% Complete/').textContent();
    accuracy = parseInt(accuracyText?.match(/(\d+)% Complete/)?.[1] || '0');
    accuracyProgression.push({ stage: '2 questions', accuracy });
    expect(accuracy).toBe(16);

    // Answer 3 questions - should be 24% (3/5 * 40%)
    await page.fill('input[id="height"]', '175');
    await page.waitForTimeout(500);
    accuracyText = await page.locator('text=/\\d+% Complete/').textContent();
    accuracy = parseInt(accuracyText?.match(/(\d+)% Complete/)?.[1] || '0');
    accuracyProgression.push({ stage: '3 questions', accuracy });
    expect(accuracy).toBe(24);

    // Answer 4 questions - should be 32% (4/5 * 40%)
    const goalTrigger = page.locator('[id="goal"] + button, button:has(span:text-is("Select an option"))').first();
    await goalTrigger.click();
    await page.waitForTimeout(500);
    await page.locator('text="Weight Loss"').click();
    await page.waitForTimeout(500);
    accuracyText = await page.locator('text=/\\d+% Complete/').textContent();
    accuracy = parseInt(accuracyText?.match(/(\d+)% Complete/)?.[1] || '0');
    accuracyProgression.push({ stage: '4 questions', accuracy });
    expect(accuracy).toBe(32);

    // Answer 5 questions - should be 40% (5/5 * 40%)
    const activityTrigger = page.locator('[id="activity_level"] + button, button:has(span:text-is("Select an option"))').last();
    await activityTrigger.click();
    await page.waitForTimeout(500);
    await page.locator('text="Moderately Active"').click();
    await page.waitForTimeout(500);
    accuracyText = await page.locator('text=/\\d+% Complete/').textContent();
    accuracy = parseInt(accuracyText?.match(/(\d+)% Complete/)?.[1] || '0');
    accuracyProgression.push({ stage: '5 questions (all basic)', accuracy });
    expect(accuracy).toBe(40);

    await page.screenshot({
      path: 'test-results/nutrition-accuracy-progression.png',
      fullPage: true
    });

    console.log('Accuracy progression:', accuracyProgression);
    console.log('✅ Dynamic Accuracy Calculation Test PASSED');
  });
});
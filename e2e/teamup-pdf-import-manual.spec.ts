import { test, expect } from '@playwright/test';
import path from 'path';

/**
 * TeamUp PDF Import Manual Test
 *
 * This test requires manual intervention at each step to verify the UI.
 * Use --headed mode to see the browser and follow along.
 */

test.describe('TeamUp PDF Import - Manual Verification', () => {
  const TEST_EMAIL = 'sam@atlas-gyms.co.uk';
  const TEST_PASSWORD = '@Aa80236661';
  const PDF_PATH = path.resolve('/Users/samschofield/Downloads/TeamUp.pdf');

  test('complete import flow with screenshots', async ({ page }) => {
    console.log('\n📸 Starting TeamUp PDF Import Test...\n');

    // Step 1: Login
    console.log('Step 1: Navigating to login page...');
    await page.goto('https://login.gymleadhub.co.uk/auth/login');
    await page.screenshot({
      path: 'test-results/teamup-01-login-page.png'
    });

    console.log('Step 2: Filling login credentials...');
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.screenshot({
      path: 'test-results/teamup-02-login-filled.png'
    });

    console.log('Step 3: Submitting login...');
    await page.click('button[type="submit"]');

    // Wait for navigation (more flexible - just wait for URL to change)
    await page.waitForURL((url) => !url.pathname.includes('/auth/login'), {
      timeout: 20000
    });

    // Give it a moment to settle
    await page.waitForTimeout(2000);

    await page.screenshot({
      path: 'test-results/teamup-03-after-login.png',
      fullPage: true
    });

    console.log('Current URL after login:', page.url());

    // Step 2: Navigate to TeamUp import
    console.log('\nStep 4: Navigating to TeamUp import page...');
    await page.goto('https://login.gymleadhub.co.uk/settings/integrations/teamup', {
      waitUntil: 'load',
      timeout: 20000
    });

    // Wait for page to be somewhat ready
    await page.waitForTimeout(2000);

    await page.screenshot({
      path: 'test-results/teamup-04-import-page.png',
      fullPage: true
    });

    // Check what h1 text actually exists
    const h1Elements = await page.locator('h1').all();
    console.log(`\nFound ${h1Elements.length} h1 elements:`);
    for (let i = 0; i < h1Elements.length; i++) {
      const text = await h1Elements[i].textContent();
      console.log(`  H1 ${i + 1}: "${text}"`);
    }

    // Step 3: Upload PDF
    console.log('\nStep 5: Uploading PDF...');
    const fileInput = page.locator('input[type="file"]');
    const fileInputCount = await fileInput.count();
    console.log(`Found ${fileInputCount} file input(s)`);

    if (fileInputCount > 0) {
      await fileInput.setInputFiles(PDF_PATH);
      await page.waitForTimeout(1000); // Wait for file to register
      await page.screenshot({
        path: 'test-results/teamup-05-pdf-uploaded.png',
        fullPage: true
      });
      console.log('✅ PDF uploaded successfully');
    } else {
      console.log('❌ No file input found!');
      return;
    }

    // Step 4: Click Analyze button
    console.log('\nStep 6: Looking for Analyze button...');
    const analyzeButton = page.locator('button').filter({ hasText: /Analyze/i });
    const analyzeButtonCount = await analyzeButton.count();
    console.log(`Found ${analyzeButtonCount} Analyze button(s)`);

    if (analyzeButtonCount > 0) {
      await analyzeButton.first().click();
      console.log('✅ Clicked Analyze button');

      await page.screenshot({
        path: 'test-results/teamup-06-analyzing.png',
        fullPage: true
      });

      // Wait for analysis (max 60 seconds)
      console.log('\nStep 7: Waiting for AI analysis (up to 60 seconds)...');

      try {
        // Wait for either the results table or an error message
        await Promise.race([
          page.waitForSelector('table tbody tr', { timeout: 60000 }),
          page.waitForSelector('text=/error/i', { timeout: 60000 })
        ]);

        await page.screenshot({
          path: 'test-results/teamup-07-analysis-complete.png',
          fullPage: true
        });

        // Count extracted classes
        const classRows = await page.locator('table tbody tr').count();
        console.log(`\n✅ Analysis complete! Extracted ${classRows} classes`);

        // Get the table content to check time slots
        const tableText = await page.locator('table tbody').textContent();
        const has6am = tableText?.includes('06:00');
        const has7am = tableText?.includes('07:00');
        const has6pm = tableText?.includes('18:00');
        const has7pm = tableText?.includes('19:00');

        console.log(`\nTime slot verification:`);
        console.log(`  6:00 AM: ${has6am ? '✅' : '❌'}`);
        console.log(`  7:00 AM: ${has7am ? '✅' : '❌'}`);
        console.log(`  6:00 PM: ${has6pm ? '✅' : '❌'}`);
        console.log(`  7:00 PM: ${has7pm ? '✅' : '❌'}`);

        // Step 5: Import classes
        console.log('\nStep 8: Looking for Import button...');
        const importButton = page.locator('button').filter({ hasText: /Import.*Classes/i });
        const importButtonCount = await importButton.count();
        console.log(`Found ${importButtonCount} Import button(s)`);

        if (importButtonCount > 0) {
          await importButton.first().click();
          console.log('✅ Clicked Import button');

          await page.screenshot({
            path: 'test-results/teamup-08-importing.png',
            fullPage: true
          });

          // Wait for import complete
          console.log('\nStep 9: Waiting for import to complete (up to 60 seconds)...');
          await page.waitForSelector('text=/Import Complete/i', { timeout: 60000 });

          await page.screenshot({
            path: 'test-results/teamup-09-import-complete.png',
            fullPage: true
          });

          // Extract import stats
          const statsText = await page.locator('div:has-text("Import Complete")').locator('..').textContent();
          console.log('\n✅ Import complete!');
          console.log('\nImport Statistics:');
          console.log(statsText);

          // Step 6: Navigate to classes page
          console.log('\nStep 10: Navigating to classes page...');
          const viewClassesButton = page.locator('a:has-text("View Classes")');
          const hasViewButton = await viewClassesButton.count() > 0;

          if (hasViewButton) {
            await viewClassesButton.click();
            await page.waitForLoadState('networkidle');
            await page.screenshot({
              path: 'test-results/teamup-10-classes-page.png',
              fullPage: true
            });
            console.log('✅ Classes page loaded');
            console.log('Final URL:', page.url());
          }
        }
      } catch (error) {
        console.error('❌ Error during analysis or import:', error);
        await page.screenshot({
          path: 'test-results/teamup-ERROR.png',
          fullPage: true
        });
      }
    } else {
      console.log('❌ No Analyze button found!');
    }

    console.log('\n📸 Test complete! Check test-results folder for screenshots.');
  });
});

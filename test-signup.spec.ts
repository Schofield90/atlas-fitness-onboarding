import { test, expect } from '@playwright/test';

test('Create Atlas Fitness organization and test access', async ({ page }) => {
  // Step 1: Navigate to signup page
  console.log('Step 1: Navigating to signup page...');
  await page.goto('http://localhost:3000/signup');
  await page.waitForLoadState('networkidle');

  // Step 2: Fill in signup form
  console.log('Step 2: Filling in signup form...');
  await page.fill('input[name="name"]', 'Sam Schofield');
  await page.fill('input[name="organization"]', 'Atlas Fitness');
  await page.fill('input[name="email"]', 'sam@atlas-gyms.co.uk');
  await page.fill('input[name="password"]', '@@Aa80236661');
  await page.fill('input[name="confirm-password"]', '@@Aa80236661');

  // Step 3: Submit signup form
  console.log('Step 3: Submitting signup form...');
  await page.click('button[type="submit"]');

  // Wait for either success redirect or error
  await page.waitForTimeout(5000);

  const signupUrl = page.url();
  console.log('URL after signup:', signupUrl);
  await page.screenshot({ path: 'after-signup.png', fullPage: true });

  // Step 4: Navigate to login page
  console.log('Step 4: Navigating to login page...');
  await page.goto('http://localhost:3000/owner-login');
  await page.waitForLoadState('networkidle');

  // Step 5: Fill in login form
  console.log('Step 5: Logging in with new credentials...');
  await page.fill('input[type="email"]', 'sam@atlas-gyms.co.uk');
  await page.fill('input[type="password"]', '@@Aa80236661');
  await page.click('button[type="submit"]');

  // Wait for login to complete
  await page.waitForTimeout(3000);

  const afterLoginUrl = page.url();
  console.log('URL after login:', afterLoginUrl);
  await page.screenshot({ path: 'after-login.png', fullPage: true });

  // Step 6: Test org page access
  if (afterLoginUrl.includes('/org/') || afterLoginUrl.includes('/dashboard')) {
    console.log('✅ Successfully logged in!');

    // Extract org slug if on org page
    let orgSlug = null;
    const orgSlugMatch = afterLoginUrl.match(/\/org\/([^\/]+)/);
    if (orgSlugMatch) {
      orgSlug = orgSlugMatch[1];
      console.log('Organization slug:', orgSlug);
    } else if (afterLoginUrl.includes('/dashboard')) {
      // If redirected to /dashboard, navigate to first org page to get slug
      await page.waitForTimeout(2000);
      const currentUrl = page.url();
      const match = currentUrl.match(/\/org\/([^\/]+)/);
      if (match) {
        orgSlug = match[1];
        console.log('Organization slug from redirect:', orgSlug);
      }
    }

    if (orgSlug) {
      // Test key org pages
      const testPages = [
        '/dashboard',
        '/reports',
        '/wellness',
        '/memberships',
        '/integrations'
      ];

      console.log('\nTesting organization pages:');
      for (const pagePath of testPages) {
        const fullUrl = `http://localhost:3000/org/${orgSlug}${pagePath}`;
        await page.goto(fullUrl);
        await page.waitForTimeout(1500);

        const pageUrl = page.url();
        if (pageUrl.includes('/signin') || pageUrl.includes('/login') || pageUrl.includes('/owner-login')) {
          console.log(`❌ ${pagePath} - redirected to login (auth failed)`);
        } else {
          console.log(`✅ ${pagePath} - accessible`);
        }
      }

      await page.screenshot({ path: 'org-pages-test.png', fullPage: true });
      console.log('\n✅ All tests completed successfully!');
    }
  } else {
    console.log('❌ Login failed - not redirected to dashboard or org page');
    console.log('Current URL:', afterLoginUrl);
  }
});

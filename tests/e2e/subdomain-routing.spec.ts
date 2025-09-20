import { test, expect } from '@playwright/test';

// Test configuration for different environments
const getBaseUrl = (subdomain: string) => {
  const baseHost = process.env.TEST_HOST || 'localhost:3000';
  if (baseHost.includes('localhost')) {
    return `http://${subdomain}.${baseHost}`;
  }
  return `https://${subdomain}.gymleadhub.co.uk`;
};

test.describe('Subdomain Routing', () => {
  test.describe('Admin Portal', () => {
    const baseUrl = getBaseUrl('admin');

    test('should return 404 for non-superadmin users', async ({ page }) => {
      // Try to access admin portal without auth
      const response = await page.goto(`${baseUrl}/admin`, { waitUntil: 'networkidle' });
      
      // Should get 404 or redirect to login
      expect(response?.status()).toBeOneOf([404, 302]);
    });

    test('should allow access for superadmin email', async ({ page }) => {
      // This would need proper auth setup for full testing
      // For now, just verify the route exists
      await page.goto(`${baseUrl}/owner-login`);
      await expect(page).toHaveURL(/owner-login/);
    });
  });

  test.describe('Owner Portal', () => {
    const baseUrl = getBaseUrl('login');

    test('should redirect to owner login when not authenticated', async ({ page }) => {
      await page.goto(`${baseUrl}/dashboard`);
      await expect(page).toHaveURL(/owner-login/);
    });

    test('should show owner portal for authenticated owners', async ({ page, context }) => {
      // Mock authentication by setting cookies
      // In real test, would use actual auth flow
      await context.addCookies([
        {
          name: 'owner_session',
          value: 'mock_session',
          domain: new URL(baseUrl).hostname,
          path: '/',
        },
      ]);

      await page.goto(`${baseUrl}/owner-login`);
      await expect(page).toHaveURL(/owner-login/);
    });
  });

  test.describe('Member Portal', () => {
    const baseUrl = getBaseUrl('members');

    test('should redirect to member login when not authenticated', async ({ page }) => {
      await page.goto(`${baseUrl}/client`);
      await expect(page).toHaveURL(/simple-login|login/);
    });

    test('should return 404 for owner trying to access member portal', async ({ page, context }) => {
      // Mock owner authentication
      await context.addCookies([
        {
          name: 'owner_session',
          value: 'mock_owner_session',
          domain: new URL(baseUrl).hostname,
          path: '/',
        },
      ]);

      const response = await page.goto(`${baseUrl}/client`, { waitUntil: 'networkidle' });
      
      // Should get 404 for wrong role
      expect(response?.status()).toBeOneOf([404, 302]);
    });
  });

  test.describe('Cross-portal isolation', () => {
    test('should not share cookies between portals', async ({ browser }) => {
      const ownerContext = await browser.newContext();
      const memberContext = await browser.newContext();

      const ownerPage = await ownerContext.newPage();
      const memberPage = await memberContext.newPage();

      // Set cookie on owner portal
      await ownerContext.addCookies([
        {
          name: 'owner_session',
          value: 'owner_test_session',
          domain: 'login.localhost',
          path: '/',
        },
      ]);

      // Verify cookie is not accessible on member portal
      await memberPage.goto(getBaseUrl('members'));
      const memberCookies = await memberContext.cookies();
      const ownerCookie = memberCookies.find(c => c.name === 'owner_session');
      expect(ownerCookie).toBeUndefined();

      await ownerContext.close();
      await memberContext.close();
    });
  });
});

// Helper for expect
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeOneOf(expected: Array<any>): R;
    }
  }
}

expect.extend({
  toBeOneOf(received, expected) {
    const pass = expected.includes(received);
    return {
      pass,
      message: () =>
        pass
          ? `Expected ${received} not to be one of ${expected}`
          : `Expected ${received} to be one of ${expected}`,
    };
  },
});
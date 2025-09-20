# E2E Authentication Setup Documentation

## Overview

This document explains the E2E authentication harness for Playwright testing across multiple portals (admin, owner, member) using localhost subdomains.

## Prerequisites

### 1. Supabase Configuration

**IMPORTANT**: Your Supabase project must allow user signups.

Check these settings in your Supabase Dashboard:

1. **Authentication → Providers → Email**: Must be enabled
2. **Authentication → Settings**: "Enable signups" must be ON
3. **Authentication → Settings**: Consider disabling "Confirm email" for test environments

### 2. Environment Variables

Required in `.env.local`:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Enable test login (NEVER in production!)
ALLOW_TEST_LOGIN=true
```

## Architecture

### Test Login Endpoint

`/api/test/login` - Protected endpoint that:

1. Only works when `ALLOW_TEST_LOGIN=true` or in development
2. Creates or signs in test users programmatically
3. Sets proper cookies for subdomain authentication
4. Handles organization and client setup automatically

### Cookie Configuration

Cookies are configured differently for development and production:

**Development (localhost)**:

- Domain: `localhost` (no leading dot)
- Works across subdomains: `admin.localhost`, `login.localhost`, `members.localhost`
- HTTP only, not secure

**Production**:

- Domain: `.gymleadhub.co.uk` (with leading dot)
- Works across all subdomains
- HTTP only and secure

### Playwright Configuration

The `playwright.config.ts` defines multiple test projects:

1. **setup**: Runs first, creates auth states
2. **admin**: Tests for admin.localhost with admin auth
3. **owner**: Tests for login.localhost with owner auth
4. **member**: Tests for members.localhost with member auth
5. **chromium**: Default project for non-authenticated tests

## Running E2E Tests

### 1. Start Development Server

```bash
npm run dev
```

### 2. Run Auth Setup

```bash
ALLOW_TEST_LOGIN=true npx playwright test --project=setup
```

### 3. Run Portal-Specific Tests

```bash
# Admin portal tests
ALLOW_TEST_LOGIN=true npx playwright test --project=admin

# Owner portal tests
ALLOW_TEST_LOGIN=true npx playwright test --project=owner

# Member portal tests
ALLOW_TEST_LOGIN=true npx playwright test --project=member
```

### 4. Run All Tests

```bash
ALLOW_TEST_LOGIN=true npx playwright test
```

## Troubleshooting

### "Database error saving new user"

This means Supabase is blocking user creation. Check:

1. **User Signups Disabled**:
   - Go to Supabase Dashboard → Authentication → Settings
   - Enable "Allow new users to sign up"

2. **Email Provider Disabled**:
   - Go to Supabase Dashboard → Authentication → Providers
   - Enable Email provider

3. **Service Role Key Issues**:
   - Verify `SUPABASE_SERVICE_ROLE_KEY` is correct
   - Try regenerating the service role key in Supabase Dashboard

### Manual User Creation

If automated creation fails, create test users manually:

1. Go to Supabase Dashboard → Authentication → Users
2. Create these users with password `TestPassword123!`:
   - `superadmin@test.example.com`
   - `owner@test.example.com`
   - `member@test.example.com`

### Cookie Issues

If authentication isn't persisting across subdomains:

1. **Check browser settings**: Ensure localhost cookies aren't blocked
2. **Clear existing cookies**: Remove all localhost cookies and retry
3. **Verify domain setting**: The cookie domain should be `localhost` for dev

### Test Not Running

If Playwright can't find tests:

1. Ensure test files match the pattern in `playwright.config.ts`
2. Use `.spec.ts` extension for test files
3. Place tests in the `e2e/` directory

## Security Notes

⚠️ **NEVER enable `ALLOW_TEST_LOGIN=true` in production!**

The test login endpoint bypasses normal authentication for testing purposes. It should only be used in:

- Local development environments
- CI/CD test environments
- Never on production servers

## Example Test

```typescript
import { test, expect } from "@playwright/test";

test("dashboard loads for authenticated owner", async ({ page }) => {
  // Auth state is already loaded from setup project
  await page.goto("/dashboard");

  // Verify we're on the dashboard
  await expect(page).toHaveURL(/.*dashboard/);
  await expect(page.locator("h1")).toContainText("Dashboard");
});
```

## Local Development with Subdomains

To test with subdomains locally:

1. **No hosts file changes needed** - Modern browsers support `*.localhost` subdomains
2. Access the app at:
   - Admin: http://admin.localhost:3000
   - Owner: http://login.localhost:3000
   - Members: http://members.localhost:3000

## CI/CD Integration

For GitHub Actions or other CI:

```yaml
- name: Run E2E Tests
  env:
    ALLOW_TEST_LOGIN: true
    NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
    NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
    SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
  run: |
    npm ci
    npx playwright install
    npm run dev &
    sleep 10
    npx playwright test
```

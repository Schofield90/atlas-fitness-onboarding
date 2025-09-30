# Production E2E Test Guide: Member Management

## Overview

This guide documents how to run comprehensive E2E tests for member management functionality on the production environment at **https://login.gymleadhub.co.uk**.

### Context: Bug Fix Verification

We recently fixed "Organization not found" errors caused by 6 API routes querying the wrong database table (`profiles` → `users`). These tests verify the fixes are working correctly in production.

**Fixed Routes:**

- `/api/clients` (GET, POST)
- `/api/clients/[id]` (GET, PUT, DELETE)
- `/api/clients/[id]/assign-waiver` (POST)
- `/api/clients/[id]/send-welcome-email` (POST)
- `/api/client/body-composition` (POST)

---

## Test Coverage

### 1. Authentication Flow

- ✅ Login to https://login.gymleadhub.co.uk/auth/login
- ✅ Verify session is created and cookies are set
- ✅ Verify user is redirected to /dashboard

### 2. Navigate to Members Page

- ✅ Go to https://login.gymleadhub.co.uk/members
- ✅ Verify members list loads without "Organization not found" error
- ✅ Check that member data displays correctly
- ✅ Verify API returns 200 OK

### 3. Member Deletion Test

- ✅ Attempt to delete a test member
- ✅ Verify DELETE /api/clients/[id] returns 200 OK
- ✅ Verify no "Organization not found" error appears
- ✅ Verify member is removed from the list
- ✅ Check that deletion event is logged

### 4. Other Member Operations

- ✅ Test assigning a waiver to a member
- ✅ Test sending welcome email
- ✅ Test body composition features

### 5. Error Scenarios

- ✅ Test deleting as a staff user (should get 403)
- ✅ Test accessing member from different organization (should get 404)
- ✅ Verify proper error handling without "Organization not found"

### 6. API Integration Tests

- ✅ GET /api/clients with valid session (200 OK)
- ✅ GET /api/clients without auth (401 Unauthorized)
- ✅ Verify all fixed routes are accessible

---

## Prerequisites

### 1. Test Credentials

You need valid credentials for production testing. These should be stored in `.env.test.production`:

```bash
# Owner/Admin account
TEST_OWNER_EMAIL=sam@atlas-gyms.co.uk
TEST_OWNER_PASSWORD=atlas2024!

# Staff account (for permission testing)
TEST_STAFF_EMAIL=staff@test.gymleadhub.co.uk
TEST_STAFF_PASSWORD=testpassword123
```

### 2. Environment Setup

Ensure you have:

- Node.js 18+ installed
- Playwright installed: `npm install`
- Production environment is accessible

---

## Running Tests

### Option 1: Run All Production Tests

```bash
npm run test:e2e:production
```

This will:

- Run all member management tests
- Generate HTML report
- Save screenshots on failure
- Create test results JSON/XML

### Option 2: Run Tests in UI Mode (Interactive)

```bash
npm run test:e2e:production:ui
```

This opens Playwright UI where you can:

- Run tests step-by-step
- See live browser actions
- Debug failures interactively

### Option 3: Run Specific Test

```bash
npx playwright test __tests__/e2e/member-management-production.spec.ts --config=playwright-production.config.ts --grep "Authentication Flow"
```

### Option 4: Run with Headed Browser (Visible)

```bash
PLAYWRIGHT_HEADED=true npm run test:e2e:production
```

---

## Test Results

### Where to Find Results

After running tests, check:

1. **Console Output**: Real-time test results with ✅/❌ indicators
2. **HTML Report**: `test-results/production-html-report/index.html`
3. **Screenshots**: `test-results/production-artifacts/` (on failure)
4. **JSON Results**: `test-results/production-results.json`
5. **JUnit XML**: `test-results/production-results.xml` (for CI integration)

### Opening HTML Report

```bash
npx playwright show-report test-results/production-html-report
```

---

## Expected Test Results

### Test 1: Authentication Flow

**Expected:** PASS

- Login should succeed with valid credentials
- Session cookies should be set
- Should redirect to /dashboard

**Failure Indicators:**

- ❌ Login form not loading
- ❌ Invalid credentials rejected
- ❌ No redirect after login

### Test 2: Members Page Load

**Expected:** PASS

- Members page should load without errors
- No "Organization not found" error
- Members list or "no members" message visible

**Failure Indicators:**

- ❌ "Organization not found" error appears
- ❌ 404 or 401 errors
- ❌ API returns non-200 status

### Test 3: Member Deletion

**Expected:** PASS

- Delete button visible for owner/admin
- DELETE API returns 200 OK
- Member removed from list
- Success message or log entry created

**Failure Indicators:**

- ❌ "Organization not found" during deletion
- ❌ API returns 404 or 500
- ❌ Member still visible after deletion

### Test 4: Member Operations

**Expected:** PASS (if features are implemented)

- Assign waiver button visible and functional
- Send welcome email button visible and functional
- Body composition section accessible

**Acceptable:** SKIP (if features not yet implemented)

- ⚠️ Buttons not found (expected if not implemented)

### Test 5: Error Scenarios

**Expected:** PASS

- Staff user cannot delete members (403 Forbidden)
- Invalid member ID returns 404
- No "Organization not found" errors, only proper 403/404

**Failure Indicators:**

- ❌ Staff user can delete members
- ❌ "Organization not found" instead of 403/404

### Test 6: API Integration

**Expected:** PASS

- Authenticated requests return 200 OK
- Unauthenticated requests return 401
- All fixed routes accessible

**Failure Indicators:**

- ❌ Any route returns "Organization not found"
- ❌ 500 errors from API

---

## Troubleshooting

### Test Fails: "Organization not found"

❌ **This means the bug is NOT fixed**

**Action:**

1. Check which API route is returning the error
2. Verify the route queries `users` table, not `profiles`
3. Check `organization_id` is correctly fetched
4. Review the API route implementation

### Test Fails: Login Issues

**Possible Causes:**

- Invalid credentials in `.env.test.production`
- Production environment down
- Network/firewall issues

**Action:**

1. Verify credentials manually in browser
2. Check production site is accessible
3. Review console logs for auth errors

### Test Fails: Timeout Errors

**Possible Causes:**

- Slow network/server response
- Loading states taking too long
- Missing selectors in page

**Action:**

1. Increase timeouts in `playwright-production.config.ts`
2. Check network tab in failed test screenshots
3. Verify page selectors match production UI

### Test Fails: Permission Errors

**Expected for some tests:**

- Staff user should NOT be able to delete (403)
- Cross-org access should fail (404)

**Unexpected:**

- Owner/admin cannot delete members
- API returns 403 for valid operations

---

## Manual Testing Guide

If you don't have test credentials, perform these manual tests:

### Manual Test 1: Login and Navigate

1. Go to https://login.gymleadhub.co.uk/auth/login
2. Login with valid owner/admin credentials
3. Navigate to Members page
4. **✅ PASS:** Members page loads without "Organization not found" error
5. **❌ FAIL:** "Organization not found" error appears

### Manual Test 2: Member Deletion

1. Go to Members page
2. Click delete on a test member
3. Confirm deletion
4. Open browser DevTools → Network tab
5. Check DELETE `/api/clients/[id]` request
6. **✅ PASS:** Returns 200 OK, member removed
7. **❌ FAIL:** Returns "Organization not found" error

### Manual Test 3: Member Operations

1. Try to assign a waiver to a member
2. Try to send a welcome email
3. Check body composition features
4. **✅ PASS:** All operations work without errors
5. **❌ FAIL:** Any "Organization not found" errors

### Manual Test 4: Staff User Permissions

1. Login as a staff user (not owner/admin)
2. Navigate to Members page
3. Try to delete a member
4. **✅ PASS:** Get 403 Forbidden error (or button is hidden)
5. **❌ FAIL:** Able to delete members as staff

---

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Production E2E Tests

on:
  push:
    branches: [main]
  schedule:
    - cron: "0 0 * * *" # Daily at midnight

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run test:e2e:production
        env:
          TEST_OWNER_EMAIL: ${{ secrets.TEST_OWNER_EMAIL }}
          TEST_OWNER_PASSWORD: ${{ secrets.TEST_OWNER_PASSWORD }}
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: test-results/
```

---

## Success Criteria

### All Tests Must Pass ✅

For the bug fix to be considered successful, **ALL** of the following must be true:

1. ✅ No "Organization not found" errors in ANY test
2. ✅ All API routes return correct status codes (200, 403, 404)
3. ✅ Member operations work correctly
4. ✅ Permission checks work as expected
5. ✅ Data is properly scoped to organization

### Acceptable Warnings ⚠️

The following are acceptable and don't indicate bugs:

- ⚠️ Feature not implemented (e.g., body composition form not found)
- ⚠️ Staff user cannot delete (expected behavior)
- ⚠️ Invalid member ID returns 404 (expected behavior)

### Unacceptable Failures ❌

The following indicate the bug is NOT fixed:

- ❌ Any "Organization not found" error
- ❌ API returns 500 Internal Server Error
- ❌ Members page doesn't load
- ❌ Authenticated requests fail with 401/404

---

## Reporting Results

After running tests, provide:

1. **Test Summary**: How many tests passed/failed
2. **Screenshots**: From `test-results/` folder for any failures
3. **Error Logs**: From failed tests showing exact error messages
4. **HTML Report**: Share the generated HTML report
5. **Recommendations**: Any issues found and suggested fixes

### Example Report Format

```markdown
# Production E2E Test Results

## Summary

- Total Tests: 6
- Passed: ✅ 5
- Failed: ❌ 1
- Warnings: ⚠️ 2

## Details

### ✅ PASS: Authentication Flow

- Login successful
- Session cookies set correctly
- Redirected to dashboard

### ✅ PASS: Members Page Load

- No "Organization not found" error
- Members list loaded successfully
- API returned 200 OK

### ❌ FAIL: Member Deletion

- DELETE API returned "Organization not found"
- Member was not deleted
- Screenshot: test-results/deletion-failure.png

### Recommendations

1. Review `/api/clients/[id]` DELETE route
2. Ensure `organization_id` is correctly fetched from `users` table
3. Re-run tests after fix
```

---

## Additional Resources

- **Playwright Docs**: https://playwright.dev
- **Test File**: `__tests__/e2e/member-management-production.spec.ts`
- **Config File**: `playwright-production.config.ts`
- **API Routes**: `app/api/clients/**/*.ts`

---

**Last Updated:** 2025-09-30
**Status:** Ready for execution
**Priority:** High (Bug fix verification)

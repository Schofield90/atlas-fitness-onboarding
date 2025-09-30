# Production E2E Tests - Quick Start

## Overview

Comprehensive E2E tests for member management on **https://login.gymleadhub.co.uk**

**Purpose:** Verify fix for "Organization not found" errors in 6 API routes.

---

## Quick Start (3 Steps)

### 1. Configure Credentials

Edit `.env.test.production`:

```bash
TEST_OWNER_EMAIL=your-email@example.com
TEST_OWNER_PASSWORD=your-password
```

### 2. Install Browsers (First Time Only)

```bash
npx playwright install chromium
```

### 3. Run Tests

```bash
npm run test:e2e:production
```

---

## View Results

**Open HTML Report:**

```bash
npm run test:e2e:production:report
```

**Check Screenshots/Videos (if tests failed):**

```
test-results/production-artifacts/
```

---

## What Gets Tested?

✅ Authentication flow (login, session, cookies)
✅ Members page loads without "Organization not found" error
✅ Member deletion returns 200 OK
✅ Member operations (waiver, email, body composition)
✅ Error scenarios (403, 404)
✅ API integration (all fixed routes)

---

## Expected Result

**All 6 tests should PASS** ✅

If any test fails with "Organization not found", the bug is NOT fixed.

---

## Documentation

- **Complete Guide:** `__tests__/PRODUCTION_TEST_GUIDE.md`
- **Test Results:** `__tests__/TEST_EXECUTION_RESULTS.md`
- **QA Summary:** `__tests__/QA_SUMMARY.md`
- **Test File:** `__tests__/e2e/member-management-production.spec.ts`

---

## Need Help?

1. **Tests failing?** Check `PRODUCTION_TEST_GUIDE.md` → Troubleshooting section
2. **Can't run tests?** Try manual verification steps in `PRODUCTION_TEST_GUIDE.md`
3. **Configuration issues?** Review `playwright-production.config.ts`

---

**Created:** 2025-09-30 | **Status:** Ready for execution

# Security Audit - Hardcoded Credentials Removal

## Critical - Deleted Files (Exposed Passwords)

- ✅ app/quick-login/page.tsx
- ✅ app/test-direct-auth/page.tsx
- ✅ app/test-auth-simple/page.tsx
- ✅ app/test-login-simple/page.tsx
- ✅ app/test-logout/page.tsx
- ✅ app/switch-user/page.tsx
- ✅ app/switch-account/page.tsx
- ✅ app/force-client-login/page.tsx
- ✅ app/test-client-auth/page.tsx

## Production Code - Replace Email Checks with Role Checks

### Admin Pages (Change from email list to role='super_admin')

- app/(admin)/admin/dashboard/page.tsx
- app/(admin)/admin/simple-dashboard/page.tsx
- app/(admin)/admin/landing-pages/page.tsx
- app/(admin)/admin/landing-pages/builder/[id]/page.tsx
- app/saas-admin/page.tsx
- app/saas-admin/billing/page.tsx
- app/saas-admin/plans/page.tsx
- app/saas-admin/tenants/page.tsx
- app/saas-admin/integrations/page.tsx
- app/saas-admin/weekly-brief/page.tsx
- app/saas-admin/weekly-brief/settings/page.tsx
- app/dashboard/page.tsx (already fixed in previous commit)

### Other Production Files

- app/components/InterfaceSwitcher.tsx - Remove hardcoded email
- app/lib/email/send-email.ts - Use env var for from_email
- app/owner-login/emergency-fix.tsx - Remove hardcoded emails

## Test Files - Use Environment Variables

- test-signup.spec.ts - Use process.env.TEST_EMAIL and TEST_PASSWORD
- Fix .gitignore to exclude all test credential files

## API Routes - Emergency/Debug Endpoints

**Should be deleted in production:**

- app/api/auth/custom-signin/route.ts
- app/api/auth/fix-organization/route.ts
- app/api/auth/direct-login/route.ts
- app/api/auth/emergency-fix-406/route.ts
- app/api/debug/\*\* (entire debug folder)

## Next Steps

1. Create middleware to block /api/debug routes in production
2. Add .env.example with TEST_EMAIL and TEST_PASSWORD placeholders
3. Update all tests to use env vars
4. Commit and deploy

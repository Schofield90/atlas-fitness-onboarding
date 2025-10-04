# Path-Based Multi-Tenancy Deployment Checklist

## Pre-Deployment

### 1. Database Migration ✅

- [ ] Run migration: `/supabase/migrations/20251004_prepare_path_based_tenancy.sql`
- [ ] Verify all orgs have slugs: `SELECT COUNT(*) FROM organizations WHERE slug IS NULL;` (should be 0)
- [ ] Verify function exists: `SELECT proname FROM pg_proc WHERE proname = 'verify_org_access_by_slug';`
- [ ] Test function manually:
  ```sql
  SELECT * FROM verify_org_access_by_slug('atlas-fitness-harrogate-fr72ma', '{user_id}');
  ```

### 2. Environment Variables ✅

- [ ] `NEXT_PUBLIC_SUPABASE_URL` - Set in all 3 Vercel projects
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Set in all 3 Vercel projects
- [ ] `SUPABASE_SERVICE_ROLE_KEY` - Set in all 3 Vercel projects (for admin operations)
- [ ] Verify super admin email matches: `sam@gymleadhub.co.uk`

### 3. Code Deployment ✅

- [x] Updated `/middleware.ts` with dual-mode routing
- [ ] Git commit changes
- [ ] Push to GitHub (triggers Vercel deployment)

## Deployment Steps

### Step 1: Deploy to Staging (if available)

```bash
# Push to staging branch
git checkout staging
git merge main
git push origin staging
```

- [ ] Wait for Vercel build to complete
- [ ] Verify middleware logs in Vercel dashboard
- [ ] Test scenarios (see below)

### Step 2: Deploy to Production

```bash
# Push to main branch
git checkout main
git push origin main
```

- [ ] Wait for Vercel build to complete (all 3 projects)
- [ ] Monitor Vercel logs for errors
- [ ] Test production URLs

## Post-Deployment Testing

### Scenario 1: Path-Based Access (NEW)

**Test 1a: Regular user accessing their own org**

```bash
URL: https://login.gymleadhub.co.uk/org/atlas-fitness-harrogate-fr72ma/dashboard
User: samschofield90@hotmail.co.uk
Expected: ✅ Dashboard loads
```

- [ ] Navigate to URL
- [ ] Verify dashboard loads
- [ ] Check browser console for middleware logs
- [ ] Verify headers in Network tab: `x-organization-id`, `x-user-role`, `x-org-slug`

**Test 1b: User trying to access another org**

```bash
URL: https://login.gymleadhub.co.uk/org/gymleadhub-admin/dashboard
User: samschofield90@hotmail.co.uk (not a member)
Expected: ❌ 403 Forbidden or redirect to /dashboard
```

- [ ] Navigate to URL
- [ ] Verify access denied (403 or redirect)
- [ ] Check console logs for "Access denied" message

**Test 1c: Super admin accessing any org**

```bash
URL: https://login.gymleadhub.co.uk/org/atlas-fitness-harrogate-fr72ma/dashboard
User: sam@gymleadhub.co.uk (super admin)
Expected: ✅ Dashboard loads (bypasses access check)
```

- [ ] Login as sam@gymleadhub.co.uk
- [ ] Navigate to any org's dashboard
- [ ] Verify access granted
- [ ] Check logs for "Super admin access granted"

### Scenario 2: Legacy Session-Based Access (BACKWARD COMPATIBILITY)

**Test 2a: Old URL still works**

```bash
URL: https://login.gymleadhub.co.uk/dashboard
User: samschofield90@hotmail.co.uk
Expected: ✅ Dashboard loads (session-based)
```

- [ ] Navigate to old URL
- [ ] Verify dashboard loads
- [ ] Check logs for "Legacy session-based routing"
- [ ] Verify NO `x-org-slug` header (only `x-organization-id` and `x-user-role`)

**Test 2b: Old API routes still work**

```bash
URL: https://login.gymleadhub.co.uk/api/clients
Expected: ✅ Returns client data for user's org
```

- [ ] Make API call from browser console:
  ```javascript
  fetch("/api/clients")
    .then((r) => r.json())
    .then(console.log);
  ```
- [ ] Verify data returned
- [ ] Check response uses session-based org resolution

### Scenario 3: API with Org Slug (NEW)

**Test 3a: API path-based call**

```bash
URL: https://login.gymleadhub.co.uk/api/org/atlas-fitness-harrogate-fr72ma/clients
User: samschofield90@hotmail.co.uk
Expected: ✅ Returns client data for specified org
```

- [ ] Make API call:
  ```javascript
  fetch("/api/org/atlas-fitness-harrogate-fr72ma/clients")
    .then((r) => r.json())
    .then(console.log);
  ```
- [ ] Verify data returned
- [ ] Check headers include `x-org-slug`

**Test 3b: API unauthorized access**

```bash
URL: https://login.gymleadhub.co.uk/api/org/gymleadhub-admin/clients
User: samschofield90@hotmail.co.uk (not authorized)
Expected: ❌ 403 Forbidden
```

- [ ] Make API call
- [ ] Verify 403 response with error message

### Scenario 4: Edge Cases

**Test 4a: Invalid org slug**

```bash
URL: https://login.gymleadhub.co.uk/org/fake-gym-xyz/dashboard
Expected: ❌ 404 or redirect to /dashboard
```

- [ ] Navigate to URL with invalid slug
- [ ] Verify appropriate error handling

**Test 4b: Uppercase slug (should fail)**

```bash
URL: https://login.gymleadhub.co.uk/org/Atlas-Fitness/dashboard
Expected: ❌ Pattern matches but slug extraction fails
```

- [ ] Verify uppercase slugs are rejected

**Test 4c: User with no organization**

```bash
URL: https://login.gymleadhub.co.uk/dashboard
User: New user with no org
Expected: Redirect to /onboarding/create-organization
```

- [ ] Create test user with no org
- [ ] Attempt to access dashboard
- [ ] Verify redirect to onboarding

## Monitoring

### Vercel Logs to Watch

```bash
# In Vercel dashboard, filter for:
[Middleware] Path-based routing detected
[Middleware] Super admin access granted
[Middleware] Access denied to org
[Middleware] Path-based access granted
[Middleware] Legacy session-based routing
```

### Key Metrics

- [ ] Monitor response times (should be < 100ms)
- [ ] Check error rates (should be < 1%)
- [ ] Verify no increase in 500 errors
- [ ] Check database function execution time in Supabase dashboard

## Rollback Plan

If issues occur:

### Option 1: Quick Fix

```typescript
// In middleware.ts, disable path-based routing temporarily
const isPathBasedRoute = false; // orgSlug && (isProtectedPath(pathname) || ...)
```

### Option 2: Full Rollback

```bash
# Revert to previous commit
git revert HEAD
git push origin main

# Or checkout previous working version
git checkout {previous_commit_hash} middleware.ts
git commit -m "Rollback path-based routing"
git push origin main
```

### Option 3: Database Rollback

```sql
-- If needed, drop the function
DROP FUNCTION IF EXISTS verify_org_access_by_slug(TEXT, UUID);
```

## Success Criteria

- [ ] All tests pass in production
- [ ] No increase in error rates
- [ ] Response times remain under 100ms
- [ ] Super admin can access all orgs
- [ ] Regular users can only access their orgs
- [ ] Legacy URLs continue to work
- [ ] New path-based URLs work correctly

## Communication Plan

### Internal Team

- [ ] Notify team of deployment
- [ ] Share testing URLs
- [ ] Request feedback on any issues

### Users (if needed)

- [ ] No user communication needed (backward compatible)
- [ ] Future: Announce new org switcher feature when UI is ready

## Next Steps After Successful Deployment

1. [ ] Update navigation links to use path-based URLs
2. [ ] Build org switcher UI component
3. [ ] Migrate API routes to path-based pattern
4. [ ] Add org slug to analytics events
5. [ ] Update documentation with new URL patterns
6. [ ] Consider deprecating legacy routes (far future)

## Troubleshooting Guide

### Issue: "Organization not found" error

**Solution**: Run database migration

### Issue: Headers not being set

**Solution**: Check middleware matcher config

### Issue: Super admin can't access orgs

**Solution**: Verify email matches `SUPER_ADMIN_EMAIL` constant

### Issue: Legacy routes broken

**Solution**: Check `isLegacyAdminRoute` logic hasn't changed

### Issue: Performance degradation

**Solution**: Check database function execution time, add caching if needed

## Database Health Checks

```sql
-- Check slug uniqueness
SELECT slug, COUNT(*) as count
FROM organizations
GROUP BY slug
HAVING COUNT(*) > 1;
-- Should return 0 rows

-- Check function performance
EXPLAIN ANALYZE
SELECT * FROM verify_org_access_by_slug('atlas-fitness-harrogate-fr72ma', '{user_id}');
-- Should be < 5ms

-- Check indexes
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'organizations' AND indexdef LIKE '%slug%';
-- Should show unique index on slug
```

---

**Deployment Date**: **********\_**********
**Deployed By**: **********\_**********
**Rollback Date** (if needed): **********\_**********
**Status**: ⏳ Pending / ✅ Success / ❌ Rolled Back

---

**Last Updated**: October 4, 2025
**Next Review**: After 7 days of production usage

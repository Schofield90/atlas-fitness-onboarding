# Facebook OAuth Connection Fix - Verification Checklist

## Root Cause Analysis
The Facebook OAuth connection was failing to persist due to:

1. **State Synchronization Issues**: The frontend hook relied on localStorage as primary source, causing inconsistencies with server state
2. **Organization Context Problems**: OAuth callback had fallback logic that could create records in wrong organization context
3. **RLS Policy Restrictions**: Row-level security policies may have prevented proper access to integration records
4. **No Token Refresh**: No mechanism to handle expired Facebook tokens (60-day expiry)

## Implemented Solutions

### 1. Centralized Callback Handler (`app/lib/facebook/callback-handler.ts`)
- ✅ Environment validation with clear error messages
- ✅ OAuth state parameter validation
- ✅ Proper token exchange with error handling
- ✅ Idempotent upsert using UNIQUE(organization_id, facebook_user_id)
- ✅ RLS error detection and reporting

### 2. Status Checker (`app/lib/facebook/status-checker.ts`)
- ✅ Single source of truth for connection status
- ✅ Token expiration checking
- ✅ RLS policy error handling
- ✅ Clear error messages for debugging

### 3. Updated OAuth Callback Route
- ✅ Uses centralized handler
- ✅ Better organization context validation
- ✅ Fallback to user_organizations table
- ✅ Comprehensive error logging

### 4. Frontend Hook Improvements
- ✅ Server-first approach (no localStorage-only mode)
- ✅ Syncs localStorage with server state
- ✅ Proper error handling

## Manual Testing Checklist

### Prerequisites
```bash
# Ensure environment variables are set
FACEBOOK_APP_SECRET=your_app_secret
NEXT_PUBLIC_FACEBOOK_APP_ID=715100284200848  # or your app ID
NEXT_PUBLIC_SITE_URL=http://localhost:3000   # or your URL
```

### Test Flow 1: Fresh Connection
1. [ ] Clear browser localStorage and cookies
2. [ ] Navigate to `/integrations/facebook`
3. [ ] Should show "Not Connected" status
4. [ ] Click "Connect Facebook Account"
5. [ ] Complete OAuth flow on Facebook
6. [ ] Should redirect to `/integrations/facebook/callback?success=true`
7. [ ] Navigate back to `/integrations/facebook`
8. [ ] Should show "Connected" WITHOUT hard reload
9. [ ] Check Network tab: `/api/integrations/facebook/status` returns `connected: true`

### Test Flow 2: Idempotency Check
1. [ ] With connection established, note the Facebook user ID
2. [ ] Click "Disconnect" if available
3. [ ] Click "Connect Facebook Account" again
4. [ ] Complete OAuth with same Facebook account
5. [ ] Check database: Only ONE record should exist for this org/user combination

### Test Flow 3: Error Handling
1. [ ] Temporarily remove `FACEBOOK_APP_SECRET` from env
2. [ ] Try to connect
3. [ ] Should see clear error: "Missing required environment variables: FACEBOOK_APP_SECRET"
4. [ ] Restore env variable

### Test Flow 4: Organization Context
1. [ ] Login as a user with proper organization
2. [ ] Connect Facebook
3. [ ] Check database: Integration should be linked to correct organization_id
4. [ ] Not using fallback organization (63589490-8f55-4157-bd3a-e141594b748e)

### Test Flow 5: Token Expiration
1. [ ] Manually update token_expires_at in database to past date
2. [ ] Refresh `/integrations/facebook`
3. [ ] Should show disconnected or expiration warning
4. [ ] Status endpoint should return `error: "Token expired"`

## Database Verification

### Check Integration Record
```sql
SELECT 
  fi.organization_id,
  fi.facebook_user_id,
  fi.facebook_user_name,
  fi.is_active,
  fi.token_expires_at,
  o.name as org_name
FROM facebook_integrations fi
JOIN organizations o ON fi.organization_id = o.id
WHERE fi.user_id = 'YOUR_USER_ID';
```

### Verify Unique Constraint
```sql
-- This should fail with duplicate key error
INSERT INTO facebook_integrations (
  organization_id, 
  user_id, 
  facebook_user_id, 
  access_token
) VALUES (
  'existing_org_id',
  'existing_user_id', 
  'existing_fb_user_id',
  'new_token'
);
```

### Check RLS Policies
```sql
-- As a different user, this should return no rows
SELECT * FROM facebook_integrations 
WHERE organization_id NOT IN (
  SELECT organization_id FROM user_organizations 
  WHERE user_id = auth.uid()
);
```

## API Testing

### Status Check
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/integrations/facebook/status
```

Expected response:
```json
{
  "connected": true,
  "integration": {
    "facebook_user_id": "123456789",
    "facebook_user_name": "John Doe",
    "token_expires_at": "2024-03-15T..."
  }
}
```

### OAuth Callback (Manual Test)
```bash
# This should redirect properly
curl -I "http://localhost:3000/api/auth/facebook/callback?code=TEST&state=atlas_fitness_oauth"
```

## Automated Test Execution

### Run API Tests
```bash
npm test -- tests/api/bugs/facebook-persist.test.ts
```

### Run Playwright Tests
```bash
npx playwright test tests/ui/flows/facebook-connect.spec.ts
```

## Production Deployment Checklist

1. [ ] Ensure `FACEBOOK_APP_SECRET` is set in production environment
2. [ ] Verify Facebook App is in Live mode (not Development)
3. [ ] Check Valid OAuth Redirect URIs includes production URL
4. [ ] Run database migrations if not already applied
5. [ ] Monitor error logs during first connections
6. [ ] Test with a real Facebook account

## Monitoring

### Key Metrics to Track
- OAuth callback success rate
- Token refresh failures
- RLS policy violations
- Average time from OAuth start to successful connection

### Error Patterns to Watch
- "RLS_DENIED" errors indicate permission issues
- "Invalid OAuth state" may indicate CSRF attempts
- "Token expired" requires user re-authentication

## Rollback Plan

If issues occur after deployment:
1. Revert to previous commit: `git revert 6b21017`
2. Clear affected `facebook_integrations` records if corrupted
3. Notify users to reconnect their Facebook accounts
4. Review error logs for root cause

## Follow-up Improvements

1. **Token Refresh**: Implement automatic token refresh before expiry
2. **Background Sync**: Add job to validate connections periodically  
3. **Better Error UI**: Show specific error messages in UI
4. **Metrics Dashboard**: Track connection success rates
5. **Multi-org Support**: Handle users with multiple organizations better

---

**Last Updated**: 2025-08-20
**Fix Commit**: 6b21017
**Author**: Claude Code + Sam
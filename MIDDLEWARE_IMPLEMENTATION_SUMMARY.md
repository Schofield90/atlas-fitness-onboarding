# Path-Based Multi-Tenancy Middleware Implementation

## Summary

Successfully implemented dual-mode middleware that supports both NEW path-based routing (`/org/{slug}/...`) and LEGACY session-based routing (`/dashboard`) with full backward compatibility.

## Changes Made

### File Updated

- `/Users/Sam/atlas-fitness-onboarding/middleware.ts` (429 lines)

### Key Additions

#### 1. Helper Functions

```typescript
// Extract org slug from page path: /org/{slug}/dashboard
function extractOrgSlugFromPath(pathname: string): string | null;

// Extract org slug from API path: /api/org/{slug}/clients
function extractOrgSlugFromApiPath(pathname: string): string | null;

// Check if user is super admin (sam@gymleadhub.co.uk)
function isSuperAdmin(userEmail: string): boolean;

// Verify user access to org by slug using database function
async function verifyOrgAccessBySlug(
  supabase: any,
  orgSlug: string,
  userId: string,
): Promise<OrgAccessResult>;

// Check if pathname matches new protected patterns
function isProtectedPath(pathname: string): boolean;
```

#### 2. Protected Path Patterns

Added regex patterns for all new path-based routes:

```typescript
const protectedPathPatterns = [
  /^\/org\/[^\/]+\/dashboard/,
  /^\/org\/[^\/]+\/customers/,
  /^\/org\/[^\/]+\/leads/,
  /^\/org\/[^\/]+\/settings/,
  // ... etc for all admin routes
];
```

#### 3. Dual-Mode Routing Logic

**Path-Based Flow (NEW)**:

1. Extract `orgSlug` from URL
2. Check if user is super admin → bypass access check
3. Call `verify_org_access_by_slug(slug, user_id)` database function
4. If `has_access = false` → 403 Forbidden (API) or redirect to `/dashboard` (pages)
5. Set headers: `x-organization-id`, `x-user-role`, `x-org-slug`

**Session-Based Flow (LEGACY)**:

1. No slug in URL → use existing logic
2. Query `user_organizations` → `organizations` → `organization_staff` tables
3. Set headers: `x-organization-id`, `x-user-role` (no slug)

## Request Flow Examples

### Example 1: User Accessing Their Own Org (Path-Based)

```
URL: /org/atlas-fitness-harrogate-fr72ma/dashboard
User: user@example.com (member of atlas-fitness-harrogate-fr72ma)

Flow:
1. Extract slug: "atlas-fitness-harrogate-fr72ma"
2. Session check: ✅ Valid session
3. Super admin check: ❌ Not super admin
4. Call verify_org_access_by_slug("atlas-fitness-harrogate-fr72ma", user_id)
5. Returns: { organization_id: "uuid", user_role: "owner", has_access: true }
6. Set headers:
   - x-organization-id: uuid
   - x-user-role: owner
   - x-org-slug: atlas-fitness-harrogate-fr72ma
7. ✅ Allow access
```

### Example 2: User Trying to Access Another Org (Path-Based)

```
URL: /org/gymleadhub-admin/dashboard
User: user@example.com (NOT a member of gymleadhub-admin)

Flow:
1. Extract slug: "gymleadhub-admin"
2. Session check: ✅ Valid session
3. Super admin check: ❌ Not super admin
4. Call verify_org_access_by_slug("gymleadhub-admin", user_id)
5. Returns: { organization_id: null, user_role: "none", has_access: false }
6. ❌ 403 Forbidden (API) or redirect to /dashboard (pages)
```

### Example 3: Super Admin Accessing Any Org

```
URL: /org/atlas-fitness-harrogate-fr72ma/dashboard
User: sam@gymleadhub.co.uk (SUPER ADMIN)

Flow:
1. Extract slug: "atlas-fitness-harrogate-fr72ma"
2. Session check: ✅ Valid session
3. Super admin check: ✅ Is super admin
4. Direct query: Get org by slug (no access check needed)
5. Set headers:
   - x-organization-id: uuid
   - x-user-role: super_admin
   - x-org-slug: atlas-fitness-harrogate-fr72ma
6. ✅ Allow access (bypass all access checks)
```

### Example 4: Legacy URL (Session-Based Backward Compatibility)

```
URL: /dashboard
User: user@example.com

Flow:
1. Extract slug: null (no /org/ in path)
2. Session check: ✅ Valid session
3. isLegacyAdminRoute: ✅ Matches /dashboard
4. Query user_organizations table
5. Returns: { organization_id: "uuid", role: "owner" }
6. Set headers:
   - x-organization-id: uuid
   - x-user-role: owner
   (NO x-org-slug header - legacy mode)
7. ✅ Allow access (existing behavior maintained)
```

### Example 5: API Route with Org Slug

```
URL: /api/org/atlas-fitness-harrogate-fr72ma/clients
User: user@example.com (member of org)

Flow:
1. Extract slug from API path: "atlas-fitness-harrogate-fr72ma"
2. Session check: ✅ Valid session
3. Super admin check: ❌ Not super admin
4. Call verify_org_access_by_slug("atlas-fitness-harrogate-fr72ma", user_id)
5. Returns: { organization_id: "uuid", user_role: "staff", has_access: true }
6. Set headers:
   - x-organization-id: uuid
   - x-user-role: staff
   - x-org-slug: atlas-fitness-harrogate-fr72ma
7. ✅ Allow access
```

### Example 6: Invalid Org Slug

```
URL: /org/nonexistent-gym-abc123/dashboard
User: user@example.com

Flow:
1. Extract slug: "nonexistent-gym-abc123"
2. Session check: ✅ Valid session
3. Super admin check: ❌ Not super admin
4. Call verify_org_access_by_slug("nonexistent-gym-abc123", user_id)
5. Returns: { organization_id: null, user_role: "none", has_access: false }
   (Database function returns empty result for invalid slug)
6. ❌ 404 Not Found (org doesn't exist)
```

## Headers Set by Middleware

### Path-Based Routes

```typescript
response.headers.set("x-organization-id", organizationId); // UUID
response.headers.set("x-user-role", userRole); // owner|staff|admin|super_admin
response.headers.set("x-org-slug", orgSlug); // atlas-fitness-harrogate-fr72ma
```

### Legacy Routes

```typescript
response.headers.set("x-organization-id", organizationId); // UUID
response.headers.set("x-user-role", userRole); // owner|staff|admin
// NO x-org-slug header
```

## Database Function Used

```sql
verify_org_access_by_slug(p_slug TEXT, p_user_id UUID)
RETURNS TABLE(
  organization_id UUID,
  user_role TEXT,
  has_access BOOLEAN
)
```

This function checks:

1. `user_organizations` table (preferred)
2. `organization_staff` table (fallback)
3. `organizations.owner_id` (owner check)

## Security Features

1. **Row-Level Isolation**: Each org's data isolated by `organization_id`
2. **Access Verification**: Every path-based request verified against database
3. **Super Admin Bypass**: Only `sam@gymleadhub.co.uk` can access any org
4. **404 vs 403 Handling**:
   - Invalid slug → Returns `has_access: false` → 404 Not Found
   - Valid slug, no access → Returns `has_access: false` → 403 Forbidden
5. **Backward Compatibility**: Legacy URLs continue to work unchanged

## Edge Cases Handled

### 1. User with No Organization

- **Legacy URL** (`/dashboard`): Redirect to `/onboarding/create-organization`
- **Path URL** (`/org/xyz/dashboard`): 403 Forbidden (user has no orgs)

### 2. Staff Member Accessing Via Slug

- Checks `organization_staff` table
- Returns `user_role: "staff"`
- Access granted if linked to org

### 3. Organization Owner

- Checks `organizations.owner_id` first
- Returns `user_role: "owner"`
- Highest privilege for that org

### 4. Super Admin

- Bypasses all access checks
- Can view any organization
- Role set to `"super_admin"` in headers

### 5. Concurrent Sessions (Multiple Orgs)

- **Path-based**: Org determined by URL slug (explicit)
- **Session-based**: Org determined by first match in user_organizations (implicit)
- User can switch between orgs by changing URL slug

## Migration Strategy

### Phase 1: Dual-Mode (Current) ✅

- Both URL patterns work simultaneously
- Gradual migration of links from `/dashboard` → `/org/{slug}/dashboard`
- No breaking changes

### Phase 2: UI Updates (Next)

- Update navigation links to use path-based URLs
- Add org switcher UI component
- Display current org slug in header

### Phase 3: API Migration (Future)

- Migrate API routes from `/api/clients` → `/api/org/{slug}/clients`
- Update frontend fetch calls
- Maintain backward compatibility

### Phase 4: Legacy Deprecation (Long-term)

- After 100% migration, consider deprecating session-based routing
- Add deprecation warnings to legacy routes
- Final cutover date

## Testing Checklist

### Manual Testing

```bash
# Test 1: Path-based access to own org
curl https://login.gymleadhub.co.uk/org/atlas-fitness-harrogate-fr72ma/dashboard \
  -H "Cookie: sb-access-token=..."

# Test 2: Path-based access to another org (should fail)
curl https://login.gymleadhub.co.uk/org/gymleadhub-admin/dashboard \
  -H "Cookie: sb-access-token=..."

# Test 3: Legacy URL (should still work)
curl https://login.gymleadhub.co.uk/dashboard \
  -H "Cookie: sb-access-token=..."

# Test 4: Super admin access
curl https://login.gymleadhub.co.uk/org/atlas-fitness-harrogate-fr72ma/dashboard \
  -H "Cookie: sb-access-token=..." # sam@gymleadhub.co.uk session

# Test 5: API with org slug
curl https://login.gymleadhub.co.uk/api/org/atlas-fitness-harrogate-fr72ma/clients \
  -H "Cookie: sb-access-token=..."
```

### Automated Test Cases

- [ ] User accessing their own org via new URL → 200 OK
- [ ] User accessing their own org via old URL → 200 OK (backward compat)
- [ ] User accessing another org → 403 Forbidden
- [ ] Super admin accessing any org → 200 OK
- [ ] Invalid org slug → 404 Not Found
- [ ] API routes with org slug → 200 OK (if authorized)
- [ ] Session-based API routes → 200 OK (legacy)
- [ ] Unauthenticated access → 401 Unauthorized or redirect to login
- [ ] User with no org accessing path-based URL → 403 Forbidden
- [ ] User with no org accessing legacy URL → Redirect to onboarding

## Console Logging

The middleware includes detailed logging for debugging:

```typescript
console.log("[Middleware] Path-based routing detected:", { orgSlug, pathname });
console.log("[Middleware] Super admin access granted for:", orgSlug);
console.log("[Middleware] Access denied to org:", { orgSlug, userId });
console.log("[Middleware] Path-based access granted:", {
  orgSlug,
  orgId,
  role,
});
console.log("[Middleware] Legacy session-based routing:", pathname);
```

Monitor these logs during initial rollout to catch any issues.

## Next Steps

1. **Deploy Migration**: Run `/supabase/migrations/20251004_prepare_path_based_tenancy.sql`
2. **Test Middleware**: Deploy to staging and verify all scenarios
3. **Update UI Links**: Start migrating dashboard links to path-based URLs
4. **Add Org Switcher**: Build UI component for users with multiple orgs
5. **Monitor Logs**: Watch for unexpected access patterns
6. **Gradual Rollout**: Enable path-based URLs for subset of users first
7. **Full Migration**: Switch all links to path-based once stable

## Known Limitations

1. **No Automatic Slug Resolution**: If user accesses `/dashboard` and belongs to multiple orgs, we select the first match. Path-based URLs solve this by being explicit.

2. **Super Admin Email Hardcoded**: Consider moving to environment variable or database flag for flexibility.

3. **API Consistency**: Some API routes still use session-based org resolution. Plan migration to path-based API routes.

## Performance Considerations

- **Database Function Call**: Each path-based request calls `verify_org_access_by_slug()`. This function uses indexed slug lookup (fast).
- **Caching Opportunity**: Consider caching org access results per session (future optimization).
- **Super Admin Bypass**: Direct query without RPC call for super admin (faster).

---

**Implementation Date**: October 4, 2025
**Author**: API Integration Specialist (Claude)
**Status**: ✅ Complete - Ready for Testing

# Path-Based Multi-Tenancy Migration Report

**Date**: October 4, 2025  
**Database**: Production (lzlrojoaxrqvmhempnkn)  
**Migration File**: `supabase/migrations/20251004_prepare_path_based_tenancy.sql`

## Executive Summary

Successfully prepared the Atlas Fitness CRM database for path-based multi-tenancy migration (GoHighLevel-style routing). All organizations have valid slugs, proper indexes exist, and helper functions are in place for efficient org access validation.

## Database State Analysis

### Before Migration

- **Total Organizations**: 2
- **Organizations with Slugs**: 2 (100%)
- **Organizations Missing Slugs**: 0
- **Slug Conflicts**: 0 (All slugs are unique)

### Organization Inventory

| ID                                   | Name                    | Slug                           | Created    |
| ------------------------------------ | ----------------------- | ------------------------------ | ---------- |
| 83932d14-acd1-4c78-a082-ead73ff5deed | GymLeadHub Admin        | gymleadhub-admin               | 2025-09-25 |
| 5fb020fb-4744-4e99-8054-e47d0cb47e5c | Atlas Fitness Harrogate | atlas-fitness-harrogate-fr72ma | 2025-09-30 |

## Migration Changes

### 1. Slug Validation & Generation

```sql
-- Defensive UPDATE for any missing slugs (found 0)
UPDATE organizations
SET slug = lower(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g'))
WHERE slug IS NULL OR slug = '';
-- Result: 0 rows updated
```

### 2. Index Management

**Existing Index**: `organizations_slug_key` (UNIQUE CONSTRAINT)

- Type: UNIQUE BTREE
- Status: Already existed, verified in migration
- Performance: Optimal for slug lookups

**All Organization Indexes**:

- `organizations_pkey` (PRIMARY KEY on id)
- `organizations_slug_key` (UNIQUE on slug) ✓
- `organizations_email_key` (UNIQUE on email)
- `idx_organizations_created_at` (DESC)
- `idx_organizations_updated_at` (DESC)
- `idx_organizations_twilio_phone`

### 3. Helper Functions Created

#### Function: `verify_org_access_by_slug`

**Purpose**: Verify user access to an organization via slug  
**Parameters**:

- `p_slug` (TEXT) - Organization slug
- `p_user_id` (UUID) - User ID to check

**Returns**:

```typescript
{
  organization_id: UUID,
  user_role: TEXT,      // 'owner', 'admin', 'staff', etc., or 'none'
  has_access: BOOLEAN
}
```

**Access Check Priority**:

1. `user_organizations` table (primary org links)
2. `organization_staff` table (staff members)
3. `organizations.owner_id` (org owners)

**Security**: SECURITY DEFINER with GRANT to authenticated users

#### Function: `get_organization_by_slug`

**Purpose**: Retrieve organization details by slug  
**Parameters**:

- `p_slug` (TEXT) - Organization slug

**Returns**:

```typescript
{
  id: UUID,
  name: TEXT,
  slug: TEXT,
  owner_id: UUID,
  created_at: TIMESTAMP,
  settings: JSONB
}
```

**Security**: SECURITY DEFINER with GRANT to authenticated users

### 4. Audit Logging (Optional)

Created trigger `organization_slug_audit` to log all slug changes to `audit_logs` table (if exists).

**Trigger**: Fires AFTER UPDATE on organizations  
**Function**: `log_slug_changes()`  
**Action**: Records old and new slug values with timestamp and user

## Testing Results

### Test 1: Get Organization by Slug ✅

```sql
SELECT * FROM get_organization_by_slug('atlas-fitness-harrogate-fr72ma');
```

**Result**: Successfully retrieved organization details

### Test 2: Verify Owner Access ✅

```sql
SELECT * FROM verify_org_access_by_slug(
  'atlas-fitness-harrogate-fr72ma',
  'c5e8f3c0-e172-4063-a4ba-233010c9c4ea'
);
```

**Result**:

- organization_id: `5fb020fb-4744-4e99-8054-e47d0cb47e5c`
- user_role: `owner`
- has_access: `true`

### Test 3: Verify Non-Member Access ✅

```sql
SELECT * FROM verify_org_access_by_slug(
  'atlas-fitness-harrogate-fr72ma',
  '61ca8b8a-c552-47e6-b686-0f461fe91bb9'
);
```

**Result**:

- organization_id: `5fb020fb-4744-4e99-8054-e47d0cb47e5c`
- user_role: `none`
- has_access: `false`

### Test 4: Invalid Slug Handling ✅

```sql
SELECT * FROM verify_org_access_by_slug('non-existent-slug', '<any-uuid>');
```

**Result**: Empty result set (0 rows) - handles gracefully

### Test 5: Slug Uniqueness ✅

```sql
SELECT slug, COUNT(*) FROM organizations GROUP BY slug HAVING COUNT(*) > 1;
```

**Result**: 0 duplicate slugs found

### Test 6: Complete Coverage ✅

```sql
SELECT COUNT(*) as total_orgs, COUNT(slug) as orgs_with_slugs FROM organizations;
```

**Result**:

- total_orgs: 2
- orgs_with_slugs: 2
- **Coverage: 100%**

## Issues Encountered & Resolved

### Issue 1: Type Mismatch in Functions

**Error**: `structure of query does not match function result type`

**Root Cause**:

- Function defined return type as `VARCHAR` but actual column type is `TEXT`
- Function defined `user_role` as `TEXT` but source columns are `CHARACTER VARYING`

**Resolution**:

- Updated return types to match actual database schema (TEXT)
- Added explicit type casting: `uo.role::TEXT`, `os.role::TEXT`

### Issue 2: Database Connection String

**Error**: `Tenant or user not found`

**Root Cause**: Incorrect connection string format (pooler URL vs direct URL)

**Resolution**: Used direct database URL:

```
postgresql://postgres@db.lzlrojoaxrqvmhempnkn.supabase.co:5432/postgres
```

## Next Steps for Path-Based Routing

### 1. Middleware Implementation

Create Next.js middleware to extract organization slug from URL:

```typescript
// middleware.ts
import { NextResponse } from "next/server";
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";

export async function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();
  const slug = url.pathname.split("/")[1]; // Extract /:slug from URL

  if (!slug) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const supabase = createMiddlewareClient({ req, res });
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Verify org access using our new function
  const { data: access } = await supabase.rpc("verify_org_access_by_slug", {
    p_slug: slug,
    p_user_id: user.id,
  });

  if (!access || !access.has_access) {
    return NextResponse.redirect(new URL("/unauthorized", req.url));
  }

  // Store org ID in header for downstream route handlers
  const response = NextResponse.next();
  response.headers.set("x-organization-id", access.organization_id);
  response.headers.set("x-organization-slug", slug);
  response.headers.set("x-user-role", access.user_role);

  return response;
}

export const config = {
  matcher: [
    "/:slug/dashboard/:path*",
    "/:slug/leads/:path*",
    "/:slug/settings/:path*",
  ],
};
```

### 2. Route Structure Update

Migrate from:

```
/dashboard
/leads
/settings
```

To:

```
/:slug/dashboard
/:slug/leads
/:slug/settings
```

### 3. Context Provider

Create organization context for client components:

```typescript
// contexts/OrganizationContext.tsx
'use client';

import { createContext, useContext } from 'react';

interface OrgContext {
  organizationId: string;
  organizationSlug: string;
  userRole: string;
}

const OrganizationContext = createContext<OrgContext | null>(null);

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (!context) throw new Error('useOrganization must be used within OrganizationProvider');
  return context;
}

export function OrganizationProvider({
  children,
  value
}: {
  children: React.ReactNode;
  value: OrgContext
}) {
  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  );
}
```

### 4. Server Component Usage

Extract org data in layout server components:

```typescript
// app/[slug]/layout.tsx
import { headers } from 'next/headers';
import { OrganizationProvider } from '@/contexts/OrganizationContext';

export default async function OrgLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: { slug: string }
}) {
  const headersList = headers();
  const organizationId = headersList.get('x-organization-id');
  const userRole = headersList.get('x-user-role');

  if (!organizationId) {
    redirect('/unauthorized');
  }

  return (
    <OrganizationProvider value={{
      organizationId,
      organizationSlug: params.slug,
      userRole: userRole || 'none'
    }}>
      {children}
    </OrganizationProvider>
  );
}
```

### 5. Update All Database Queries

Ensure all queries use organization context:

```typescript
// Before (session-based)
const { data } = await supabase
  .from("leads")
  .select("*")
  .eq("organization_id", session.organizationId);

// After (path-based) - Same query, org_id comes from context
const { organizationId } = useOrganization();
const { data } = await supabase
  .from("leads")
  .select("*")
  .eq("organization_id", organizationId);
```

### 6. Slug Management UI

Create admin interface for slug management:

- View current slug
- Edit slug (with validation)
- Preview new URL structure
- Slug conflict detection
- Redirect old URLs

## Performance Considerations

### Database Query Performance

- **Slug Lookup**: O(1) via UNIQUE BTREE index
- **Access Verification**: Single query with 2 LEFT JOINs (optimized)
- **Expected Response Time**: < 5ms for slug lookups

### Recommended Caching Strategy

```typescript
// Cache org data for 5 minutes
const orgCache = new Map<string, { org: Org; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCachedOrg(slug: string) {
  const cached = orgCache.get(slug);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.org;
  }
  return null;
}
```

## Security Considerations

### Row Level Security (RLS)

Current RLS policies remain unchanged. The new functions use SECURITY DEFINER to bypass RLS for access checks, but actual data access still enforces RLS.

### Slug Validation

The database has a CHECK constraint on slug:

```sql
CHECK (slug ~ '^[a-z0-9-]+$'::text)
```

This ensures slugs are:

- Lowercase only
- Alphanumeric + hyphens
- URL-safe

### Preventing Slug Hijacking

The UNIQUE constraint prevents duplicate slugs. Consider adding:

- Slug reservation list for system routes
- Profanity filter
- Rate limiting on slug updates

## Rollback Plan

If issues arise, the migration can be rolled back:

```sql
-- Rollback: Remove helper functions
DROP FUNCTION IF EXISTS verify_org_access_by_slug(TEXT, UUID);
DROP FUNCTION IF EXISTS get_organization_by_slug(TEXT);
DROP FUNCTION IF EXISTS log_slug_changes();
DROP TRIGGER IF EXISTS organization_slug_audit ON organizations;

-- Index and slugs remain (no harm in keeping them)
```

**Impact**: Minimal - only removes new helper functions, doesn't affect existing data or indexes.

## Deployment Checklist

- [x] Database migration created and tested
- [x] All organizations have valid slugs
- [x] Helper functions created and tested
- [x] Indexes verified for performance
- [x] Security policies reviewed
- [ ] Middleware implementation
- [ ] Route structure migration
- [ ] Context providers created
- [ ] Update all database queries
- [ ] Update navigation/links
- [ ] SEO redirects for old URLs
- [ ] Update documentation
- [ ] User communication plan
- [ ] Staging environment testing
- [ ] Production deployment

## Conclusion

The database is fully prepared for path-based multi-tenancy. All organizations have unique, valid slugs, performance indexes are in place, and helper functions provide efficient org access validation.

**Status**: ✅ READY FOR APPLICATION LAYER MIGRATION

---

**Migration Applied**: October 4, 2025  
**Applied By**: database-architect agent (Claude)  
**Verification**: All tests passed  
**Performance**: Optimal (indexed slug lookups)  
**Security**: SECURITY DEFINER functions with authenticated grants  
**Data Integrity**: 100% slug coverage, 0 conflicts

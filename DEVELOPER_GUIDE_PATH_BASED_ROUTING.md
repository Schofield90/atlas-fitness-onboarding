# Developer Guide: Path-Based Routing Implementation

**Quick Start Guide for Frontend Migration**

## What Changed?

The database is now ready for GoHighLevel-style path-based routing:

**Before**: `/dashboard` (org determined by session)  
**After**: `/atlas-fitness-harrogate-fr72ma/dashboard` (org determined by URL)

## Database Functions Available

### 1. `verify_org_access_by_slug(slug, user_id)`

**Use Case**: Middleware authentication and authorization

```typescript
// In middleware.ts or API routes
const { data: access, error } = await supabase.rpc(
  "verify_org_access_by_slug",
  {
    p_slug: "atlas-fitness-harrogate-fr72ma",
    p_user_id: user.id,
  },
);

if (!access?.has_access) {
  return Response.json({ error: "Unauthorized" }, { status: 403 });
}

// access contains:
// {
//   organization_id: UUID,
//   user_role: 'owner' | 'admin' | 'staff' | 'none',
//   has_access: boolean
// }
```

### 2. `get_organization_by_slug(slug)`

**Use Case**: Loading organization data in layouts/pages

```typescript
// In Server Components
const { data: org, error } = await supabase.rpc("get_organization_by_slug", {
  p_slug: params.slug,
});

if (!org || org.length === 0) {
  notFound(); // Next.js 404 page
}

// org contains:
// {
//   id: UUID,
//   name: string,
//   slug: string,
//   owner_id: UUID,
//   created_at: timestamp,
//   settings: JSONB
// }
```

## Implementation Steps

### Step 1: Create Middleware (High Priority)

**File**: `/middleware.ts`

```typescript
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req: request, res });

  // Extract slug from URL (/:slug/...)
  const pathParts = request.nextUrl.pathname.split("/").filter(Boolean);
  const slug = pathParts[0];

  // Skip middleware for public routes
  if (["login", "signup", "api", "_next", "public"].includes(slug)) {
    return res;
  }

  // Check authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Verify organization access
  const { data: access } = await supabase.rpc("verify_org_access_by_slug", {
    p_slug: slug,
    p_user_id: user.id,
  });

  if (!access || !access.has_access) {
    return NextResponse.redirect(new URL("/unauthorized", request.url));
  }

  // Inject org context into headers for downstream use
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
    "/:slug/booking/:path*",
    "/:slug/automations/:path*",
  ],
};
```

### Step 2: Update Route Structure

**Before** (`/app/dashboard/page.tsx`):

```typescript
export default async function DashboardPage() {
  // ...
}
```

**After** (`/app/[slug]/dashboard/page.tsx`):

```typescript
export default async function DashboardPage({
  params,
}: {
  params: { slug: string };
}) {
  // params.slug contains the organization slug
  // ...
}
```

### Step 3: Create Organization Context

**File**: `/contexts/OrganizationContext.tsx`

```typescript
'use client';

import { createContext, useContext, ReactNode } from 'react';

interface OrgContextType {
  organizationId: string;
  organizationSlug: string;
  userRole: string;
}

const OrgContext = createContext<OrgContextType | undefined>(undefined);

export function useOrganization() {
  const context = useContext(OrgContext);
  if (!context) {
    throw new Error('useOrganization must be used within OrganizationProvider');
  }
  return context;
}

export function OrganizationProvider({
  children,
  value
}: {
  children: ReactNode;
  value: OrgContextType;
}) {
  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>;
}
```

### Step 4: Update Layout to Provide Context

**File**: `/app/[slug]/layout.tsx`

```typescript
import { headers } from 'next/headers';
import { OrganizationProvider } from '@/contexts/OrganizationContext';
import { redirect } from 'next/navigation';

export default async function OrgLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: { slug: string };
}) {
  const headersList = headers();
  const organizationId = headersList.get('x-organization-id');
  const userRole = headersList.get('x-user-role');

  if (!organizationId) {
    redirect('/unauthorized');
  }

  return (
    <OrganizationProvider
      value={{
        organizationId,
        organizationSlug: params.slug,
        userRole: userRole || 'none'
      }}
    >
      {children}
    </OrganizationProvider>
  );
}
```

### Step 5: Use Context in Components

**Client Components**:

```typescript
'use client';

import { useOrganization } from '@/contexts/OrganizationContext';

export function MyComponent() {
  const { organizationId, organizationSlug, userRole } = useOrganization();

  // Use organizationId for queries
  const { data } = await supabase
    .from('leads')
    .select('*')
    .eq('organization_id', organizationId);

  return <div>...</div>;
}
```

**Server Components** (use params directly):

```typescript
export default async function MyServerComponent({
  params
}: {
  params: { slug: string }
}) {
  const supabase = createServerClient();

  // Get org ID from slug
  const { data: org } = await supabase.rpc('get_organization_by_slug', {
    p_slug: params.slug
  });

  // Use org.id for queries
  const { data: leads } = await supabase
    .from('leads')
    .select('*')
    .eq('organization_id', org.id);

  return <div>...</div>;
}
```

### Step 6: Update Navigation Links

**Before**:

```typescript
<Link href="/dashboard">Dashboard</Link>
<Link href="/leads">Leads</Link>
<Link href="/settings">Settings</Link>
```

**After**:

```typescript
import { useOrganization } from '@/contexts/OrganizationContext';

function Navigation() {
  const { organizationSlug } = useOrganization();

  return (
    <>
      <Link href={`/${organizationSlug}/dashboard`}>Dashboard</Link>
      <Link href={`/${organizationSlug}/leads`}>Leads</Link>
      <Link href={`/${organizationSlug}/settings`}>Settings</Link>
    </>
  );
}
```

### Step 7: Update API Routes

**Before** (`/app/api/leads/route.ts`):

```typescript
export async function GET(request: Request) {
  const session = await getSession();
  const organizationId = session.organizationId;
  // ...
}
```

**After** (`/app/api/[slug]/leads/route.ts`):

```typescript
export async function GET(
  request: Request,
  { params }: { params: { slug: string } },
) {
  const supabase = createRouteHandlerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Verify access
  const { data: access } = await supabase.rpc("verify_org_access_by_slug", {
    p_slug: params.slug,
    p_user_id: user.id,
  });

  if (!access?.has_access) {
    return Response.json({ error: "Unauthorized" }, { status: 403 });
  }

  // Use access.organization_id for queries
  const { data: leads } = await supabase
    .from("leads")
    .select("*")
    .eq("organization_id", access.organization_id);

  return Response.json({ leads });
}
```

## Testing Checklist

- [ ] Middleware correctly extracts slug from URL
- [ ] Middleware redirects unauthenticated users
- [ ] Middleware blocks unauthorized org access
- [ ] Context provider works in client components
- [ ] Server components receive params.slug
- [ ] All navigation links include slug
- [ ] All API routes validate org access
- [ ] Database queries use correct organization_id
- [ ] SEO redirects for old URLs (if needed)

## Common Pitfalls

### 1. Missing Slug in Links

**Wrong**: `<Link href="/dashboard">`  
**Correct**: `<Link href={`/${organizationSlug}/dashboard`}>`

### 2. Hard-coded Organization ID

**Wrong**: `eq('organization_id', 'some-uuid')`  
**Correct**: `eq('organization_id', organizationId)` from context

### 3. Forgetting to Verify Access in API Routes

**Wrong**: Just check if user is authenticated  
**Correct**: Always call `verify_org_access_by_slug` in API routes

### 4. Using Client-only APIs in Server Components

**Wrong**: `useOrganization()` in Server Component  
**Correct**: Use `params.slug` directly in Server Components

## Performance Tips

### 1. Cache Organization Data

```typescript
// In middleware or layout
const orgData = await getCachedOrg(slug); // Cache for 5 minutes
```

### 2. Use Server Components for Data Fetching

Server Components are faster and more secure for database queries.

### 3. Minimize Context Re-renders

Only put essential data in OrganizationContext (id, slug, role).

## Migration Strategy

### Phase 1: Parallel Routes (Recommended)

Keep both old and new routes working simultaneously:

- `/dashboard` → redirects to `/:slug/dashboard`
- `/:slug/dashboard` → new path-based route

### Phase 2: Gradual Migration

Migrate routes one by one:

1. Dashboard
2. Leads
3. Settings
4. Booking
5. Automations

### Phase 3: Deprecation

After full migration, remove old routes and add permanent redirects.

## Example: Complete Page Migration

**Before** (`/app/dashboard/page.tsx`):

```typescript
export default async function DashboardPage() {
  const session = await getServerSession();
  const organizationId = session.organizationId;

  const leads = await getLeads(organizationId);

  return <DashboardView leads={leads} />;
}
```

**After** (`/app/[slug]/dashboard/page.tsx`):

```typescript
import { createServerClient } from '@/lib/supabase/server';

export default async function DashboardPage({
  params
}: {
  params: { slug: string }
}) {
  const supabase = createServerClient();

  // Get organization
  const { data: org } = await supabase.rpc('get_organization_by_slug', {
    p_slug: params.slug
  });

  if (!org || org.length === 0) {
    notFound();
  }

  // Fetch data using org.id
  const { data: leads } = await supabase
    .from('leads')
    .select('*')
    .eq('organization_id', org.id);

  return <DashboardView leads={leads} organization={org} />;
}
```

## Support

If you encounter issues:

1. Check middleware is running (`console.log` in middleware)
2. Verify slug format matches database (`^[a-z0-9-]+$`)
3. Test database functions directly in Supabase dashboard
4. Check RLS policies aren't blocking queries

## Reference

- Database Migration: `/supabase/migrations/20251004_prepare_path_based_tenancy.sql`
- Full Documentation: `/PATH_BASED_TENANCY_MIGRATION.md`
- Database Functions:
  - `verify_org_access_by_slug(slug, user_id)`
  - `get_organization_by_slug(slug)`

---

**Last Updated**: October 4, 2025  
**Database Status**: ✅ Ready for application migration  
**Breaking Changes**: Yes (URL structure changes)  
**Backward Compatibility**: Can be implemented with redirects

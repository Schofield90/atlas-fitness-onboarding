# Atlas Fitness CRM - Claude Code Design Contract

## Project Overview

**Atlas Fitness CRM** is a multi-tenant SaaS platform for gym management with AI-powered lead qualification, booking systems, and client management.

### Core Purpose

- **Primary**: CRM system for fitness businesses to manage leads, clients, bookings, and memberships
- **Secondary**: Client portal for members to book classes, track progress, manage subscriptions
- **Tertiary**: Admin system for platform super-admins to monitor/manage all organizations

### Architecture

- **Framework**: Next.js 14 App Router with TypeScript
- **Backend**: Supabase (PostgreSQL + Auth + Real-time)
- **Authentication**: Multi-tenant with organization-level isolation
- **Deployment**: Vercel (3 separate projects for 3 subdomains)

## Portal Separation Strategy

### 🔴 CRITICAL: Three Separate Portals

**1. Admin Portal** - `admin.gymleadhub.co.uk`

- **Purpose**: Platform administration, super-admin only
- **Users**: sam@gymleadhub.co.uk (super admin)
- **Routes**: `/admin/**`
- **Access**: Highest level, can view all organizations
- **Middleware**: `middleware-admin.ts`
- **Cookies**: Scoped to `.admin.gymleadhub.co.uk`

**2. Staff Dashboard** - `login.gymleadhub.co.uk`

- **Purpose**: Gym staff CRM for managing leads, clients, bookings
- **Users**: Gym owners, admins, staff (role: owner/admin/staff/viewer)
- **Routes**: `/dashboard/**`, `/leads/**`, `/clients/**`, `/bookings/**`, `/reports/**`
- **Access**: Organization-scoped via RLS
- **Middleware**: `middleware-login.ts`
- **Cookies**: Scoped to `.login.gymleadhub.co.uk`

**3. Member Portal** - `members.gymleadhub.co.uk`

- **Purpose**: Client/member self-service portal
- **Users**: Gym members (clients table)
- **Routes**: `/client/**`, `/booking/**`, `/profile/**`, `/nutrition/**`
- **Access**: Client-level isolation, can only see own data
- **Middleware**: `middleware-members.ts`
- **Cookies**: Scoped to `.members.gymleadhub.co.uk`

### Security Model

**NO CROSSOVER BETWEEN PORTALS**:

- Admin cookies CANNOT access login or members portals
- Staff users CANNOT access member portal routes
- Members CANNOT access staff dashboard routes
- Each portal has its own authentication context

## Design Principles

### 1. Minimal Diff Policy

- ALWAYS produce the smallest possible change
- Prefer targeted fixes over refactoring
- One concern per PR
- If fix requires < 10 lines, prefer inline patches

### 2. Security-First Development

- **Organization Isolation**: Every API route MUST verify organization_id
- **RLS Everywhere**: All database queries filtered by organization
- **No Bypasses**: Never use service role key except for admin endpoints
- **Explicit Checks**: Always fetch user's organization before data access

### 3. Code Standards

- TypeScript strict mode enabled
- Explicit return types for public functions
- No `any` types without justification
- Guard clauses over nested conditionals
- Early returns to reduce indentation

## Authentication & Authorization

### Auth Flow

```typescript
// ALL API routes must follow this pattern:
export async function GET/POST/PUT/DELETE(request: Request) {
  const supabase = createRouteHandlerClient({ cookies })

  // 1. Verify authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Get user's organization
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('organization_id, role')
    .eq('id', user.id)
    .single()

  if (userError || !userData) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  // 3. Check role permissions (if needed)
  if (!['owner', 'admin'].includes(userData.role)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }

  // 4. Query data with organization filter
  const { data } = await supabase
    .from('table_name')
    .select('*')
    .eq('organization_id', userData.organization_id) // 🔴 CRITICAL
}
```

### Role Hierarchy

1. **Super Admin** (`sam@gymleadhub.co.uk`): Platform-wide access
2. **Owner**: Full access to their organization
3. **Admin**: Management access, can manage users/settings
4. **Staff**: Daily operations (leads, clients, bookings)
5. **Viewer**: Read-only access
6. **Client**: Member portal access only

## Database Schema

### Core Tables

- `organizations`: Multi-tenant boundary
- `users`: Staff members (linked to organizations)
- `clients`: Gym members (linked to organizations)
- `leads`: Potential clients in sales pipeline
- `membership_plans`: Subscription offerings
- `bookings`: Class/session bookings
- `conversations`: Messaging between staff and clients

### RLS Policies Pattern

```sql
-- Every table MUST have organization-level RLS
CREATE POLICY "Users can view their org data" ON table_name
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Owners/Admins can manage their org data" ON table_name
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM users
      WHERE id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );
```

## API Route Organization

### Route Structure

```
/api/
├── admin/                  # Super admin only
│   ├── reset-database/
│   └── verify-super-admin/
├── auth/                   # Authentication
│   ├── login/
│   ├── signup/
│   └── me/
├── leads/                  # Lead management
├── clients/                # Client management
├── membership-plans/       # Subscription plans
├── bookings/               # Class bookings
├── conversations/          # Messaging
└── debug/                  # Development helpers
```

### API Security Checklist

- [ ] Authentication check (`getUser()`)
- [ ] Organization verification (`users.organization_id`)
- [ ] Role authorization (if needed)
- [ ] Organization filter in queries (`.eq('organization_id', ...)`)
- [ ] Input validation (Zod schemas)
- [ ] Error handling (try/catch)
- [ ] Logging (console.error for failures)

## Middleware Configuration

### Current Issue

❌ **ONE middleware handles all domains** - causes security risks

### Required Solution

✅ **THREE separate middleware files**:

1. **middleware-admin.ts**: Block non-admin users, super admin only
2. **middleware-login.ts**: Staff authentication, org context
3. **middleware-members.ts**: Client authentication, member portal only

### Middleware Responsibilities

- Session management
- Cookie scoping (domain-specific)
- Route protection
- Organization context extraction
- Authentication token refresh

## Common Patterns

### Fetching Organization Data

```typescript
// ✅ CORRECT: Filtered by organization
const { data: clients } = await supabase
  .from("clients")
  .select("*")
  .eq("organization_id", userData.organization_id);

// ❌ WRONG: No organization filter
const { data: clients } = await supabase.from("clients").select("*");
```

### Creating Records

```typescript
// ✅ CORRECT: Include organization_id
const { data: lead } = await supabase.from("leads").insert({
  ...leadData,
  organization_id: userData.organization_id, // 🔴 MUST INCLUDE
});

// ❌ WRONG: Missing organization_id
const { data: lead } = await supabase.from("leads").insert(leadData);
```

### Role-Based Access

```typescript
// ✅ CORRECT: Check role before sensitive operations
if (!["owner", "admin"].includes(userData.role)) {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

// Delete/modify operations here...
```

## Critical Files

### Security-Critical

- `middleware.ts`: Authentication guard (NEEDS SPLITTING)
- `lib/supabase/middleware.ts`: Cookie management
- `app/api/**/route.ts`: All API routes (65 files)
- `lib/supabase/migrations/*.sql`: RLS policies

### Feature-Critical

- `app/auth/login/page.tsx`: Login flow
- `components/providers/AuthProvider.tsx`: Auth context
- `lib/supabase/client.ts`: Supabase client initialization

## Known Issues & TODOs

### 🔴 High Priority

1. **Split Middleware**: Separate by subdomain (admin/login/members)
2. **Cookie Scoping**: Domain-specific cookies to prevent crossover
3. **Session Duration**: Increase from 1 hour to 24 hours
4. **Login Performance**: Remove delays, optimize profile fetching

### 🟡 Medium Priority

1. **API Route Audit**: Verify all 65 routes have org checks
2. **RLS Policy Review**: Ensure no data leakage
3. **Vercel Split**: Confirm 3 separate projects deployed
4. **Monitoring**: Add auth failure logging

### 🟢 Low Priority

1. **Documentation**: Update .claude/context files
2. **Testing**: E2E tests for each portal
3. **Performance**: Add caching for org lookups

## Development Commands

```bash
# Local development
npm run dev                    # Port 3003

# Testing
npm run test                   # Unit tests
npm run test:e2e              # Playwright E2E

# Database
supabase db reset             # Reset local DB
supabase db push              # Apply migrations

# Deployment
vercel --prod                 # Deploy to production
```

## Testing Strategy

### Unit Tests

- API route handlers
- Utility functions
- Custom hooks
- Validation schemas

### Integration Tests

- Auth flows
- Database operations
- Third-party integrations

### E2E Tests (Playwright)

- Login/logout flows
- Lead creation/management
- Booking flows
- Member portal actions

## Security Audit Checklist

### Pre-Deployment

- [ ] All API routes have auth checks
- [ ] All queries filtered by organization_id
- [ ] RLS policies enabled on all tables
- [ ] No service role key in client code
- [ ] CORS properly configured
- [ ] Rate limiting on auth endpoints
- [ ] Input validation on all forms
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS prevention (proper escaping)

### Post-Deployment

- [ ] Monitor auth failure rates
- [ ] Track session refresh success
- [ ] Log unauthorized access attempts
- [ ] Review RLS policy violations

## Error Handling

### API Errors

```typescript
try {
  // Operation
} catch (error) {
  console.error("[Context] Error:", error);
  return NextResponse.json(
    {
      error: "User-friendly message",
      details:
        process.env.NODE_ENV === "development" ? String(error) : undefined,
    },
    { status: 500 },
  );
}
```

### Client Errors

- Use `react-hot-toast` for user feedback
- Log errors to console in development
- Send to monitoring service in production

## Contact & Support

- **Super Admin**: sam@gymleadhub.co.uk
- **Repository**: github.com/Schofield90/atlas-fitness-onboarding
- **Documentation**: /docs folder

---

_Last Updated: 2025-09-30_
_Version: 2.0.0_
_Status: Active Development_

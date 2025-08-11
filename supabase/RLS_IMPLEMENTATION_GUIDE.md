# Comprehensive Row Level Security (RLS) Implementation Guide

## Overview

This implementation provides complete database-level multi-tenant security for the Atlas Fitness CRM system. Row Level Security (RLS) ensures that users can only access data from their own organization, even if the application code is compromised.

## Key Features

- ✅ **Complete Multi-Tenant Isolation**: Users can only access their organization's data
- ✅ **Helper Functions**: Efficient organization access checking
- ✅ **Service Role Bypass**: Admin operations can bypass RLS when needed
- ✅ **Comprehensive Coverage**: All multi-tenant tables are protected
- ✅ **Dynamic Policy Creation**: Automatically covers new organization-scoped tables
- ✅ **Validation Tools**: Built-in testing to ensure policies work correctly

## Files Created

1. **`20250811182110_comprehensive_rls_policies.sql`** - Main migration file
2. **`test_rls_comprehensive.sql`** - Testing and validation script
3. **`RLS_IMPLEMENTATION_GUIDE.md`** - This documentation

## How It Works

### 1. Helper Functions

The implementation creates several helper functions in the `auth` schema:

- `auth.organization_id()` - Gets current user's organization from JWT claims
- `auth.has_organization_access(org_id)` - Checks if user can access an organization
- `auth.user_organizations()` - Returns all organizations a user belongs to
- `auth.is_organization_admin(org_id)` - Checks if user is admin/owner

### 2. Policy Pattern

Each multi-tenant table follows this policy pattern:

```sql
-- SELECT: Users can view their organization's data
CREATE POLICY "users_view_org_tablename" ON tablename
FOR SELECT
USING (organization_id IN (SELECT auth.user_organizations()));

-- INSERT: Users can create data for their organization
CREATE POLICY "users_create_org_tablename" ON tablename
FOR INSERT
WITH CHECK (organization_id IN (SELECT auth.user_organizations()));

-- UPDATE: Users can modify their organization's data
CREATE POLICY "users_update_org_tablename" ON tablename
FOR UPDATE
USING (organization_id IN (SELECT auth.user_organizations()))
WITH CHECK (organization_id IN (SELECT auth.user_organizations()));

-- DELETE: Only admins can delete (optional, depends on table)
CREATE POLICY "admins_delete_org_tablename" ON tablename
FOR DELETE
USING (auth.is_organization_admin(organization_id));

-- SERVICE ROLE: System can bypass RLS for admin operations
CREATE POLICY "service_role_bypass_tablename" ON tablename
FOR ALL TO service_role
USING (true)
WITH CHECK (true);
```

### 3. Tables Protected

The following categories of tables are protected:

#### Core Tenant Tables
- `organizations`
- `organization_members`
- `organization_staff`

#### CRM and Lead Management
- `leads`
- `clients` 
- `opportunities`
- `campaigns`
- `lead_activities`
- `lead_ai_insights`

#### Communication
- `messages`
- `email_logs`
- `sms_logs`
- `whatsapp_logs`
- `email_templates`

#### Booking System
- `bookings`
- `class_sessions`
- `classes`
- `booking_links`

#### Staff Management
- `staff`
- `staff_tasks`
- `staff_profiles`
- `staff_documents`

#### Automation
- `automations`
- `workflows`
- `workflow_executions`

#### And many more...

### 4. JWT Claims Integration

The system expects the JWT token to contain an `organization_id` claim:

```json
{
  "aud": "authenticated",
  "exp": 1640995200,
  "sub": "user-uuid",
  "organization_id": "org-uuid",
  "role": "authenticated"
}
```

## Testing the Implementation

### 1. Run the Migration

```sql
-- Apply the migration
\i supabase/migrations/20250811182110_comprehensive_rls_policies.sql
```

### 2. Run Validation Tests

```sql
-- Run comprehensive testing
\i supabase/test_rls_comprehensive.sql
```

### 3. Manual Testing

You can test RLS policies manually:

```sql
-- Set JWT claims for testing (simulates user login)
SELECT set_config('request.jwt.claims', '{"sub":"user-id","organization_id":"org-1"}', true);

-- This should only return data for org-1
SELECT * FROM leads;

-- Change to different organization
SELECT set_config('request.jwt.claims', '{"sub":"user-id","organization_id":"org-2"}', true);

-- This should only return data for org-2
SELECT * FROM leads;
```

## Application Integration

### 1. Ensure JWT Contains organization_id

Your authentication system must include the user's `organization_id` in the JWT token:

```javascript
// When creating JWT token
const payload = {
  sub: user.id,
  organization_id: user.organization_id,
  role: 'authenticated'
};
```

### 2. Supabase Client Configuration

Use the authenticated user's token:

```javascript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// After user login, the RLS policies will automatically filter data
const { data: leads } = await supabase
  .from('leads')
  .select('*'); // Only returns leads from user's organization
```

### 3. Service Role for Admin Operations

For admin operations that need to bypass RLS:

```javascript
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// This can access all data across organizations
const { data: allLeads } = await supabaseAdmin
  .from('leads')
  .select('*');
```

## Security Benefits

### 1. Defense in Depth
Even if your application code has bugs, the database enforces tenant isolation.

### 2. Zero Trust Architecture
Every database query is automatically filtered by organization.

### 3. Audit Trail
All data access is logged and can be audited.

### 4. Compliance Ready
Meets requirements for data isolation in regulated industries.

## Troubleshooting

### Common Issues

1. **"Permission denied" errors**
   - Check that JWT contains valid `organization_id`
   - Verify user is member of the organization
   - Ensure RLS policies are properly created

2. **Empty result sets**
   - User might not have access to the organization
   - Check `organization_members` table for user membership

3. **Service role issues**
   - Ensure service role key is used for admin operations
   - Verify service role bypass policies exist

### Debugging Queries

```sql
-- Check current user context
SELECT 
  auth.uid() as user_id,
  auth.organization_id() as org_id;

-- Check user's organizations
SELECT * FROM auth.user_organizations();

-- Check if user can access specific org
SELECT auth.has_organization_access('org-uuid-here');

-- View all policies for a table
SELECT * FROM pg_policies WHERE tablename = 'leads';
```

## Rollback Instructions

If you need to remove RLS (NOT RECOMMENDED):

```sql
-- WARNING: This removes all multi-tenant security!
-- Only run in development or if you have alternative security measures

-- 1. Disable RLS on all tables
DO $$
DECLARE
  tbl RECORD;
BEGIN
  FOR tbl IN 
    SELECT c.relname 
    FROM pg_class c
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public' 
    AND c.relkind = 'r'
    AND c.relrowsecurity = true
  LOOP
    EXECUTE format('ALTER TABLE %I DISABLE ROW LEVEL SECURITY', tbl.relname);
  END LOOP;
END $$;

-- 2. Drop all policies
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
  END LOOP;
END $$;

-- 3. Drop helper functions
DROP FUNCTION IF EXISTS auth.organization_id();
DROP FUNCTION IF EXISTS auth.has_organization_access(uuid);
DROP FUNCTION IF EXISTS auth.user_organizations();
DROP FUNCTION IF EXISTS auth.is_organization_admin(uuid);
DROP FUNCTION IF EXISTS test_rls_isolation();
```

## Best Practices

### 1. Always Test RLS Changes
- Run the validation script after any changes
- Test with multiple organizations
- Verify service role access works

### 2. Monitor Performance
- RLS adds overhead to queries
- Use appropriate indexes on organization columns
- Monitor slow query logs

### 3. Keep Policies Simple
- Use helper functions consistently
- Avoid complex logic in policies
- Document any custom policies

### 4. Regular Audits
- Review RLS policies quarterly
- Check for new tables that need RLS
- Validate organization memberships

## Conclusion

This comprehensive RLS implementation provides enterprise-grade multi-tenant security for the Atlas Fitness CRM. It ensures complete data isolation while maintaining performance and usability.

The implementation is designed to be:
- **Secure**: Complete tenant isolation
- **Maintainable**: Clear patterns and helper functions
- **Scalable**: Efficient queries with proper indexing
- **Testable**: Built-in validation tools
- **Future-proof**: Dynamic coverage for new tables

Remember: RLS is your last line of defense. While it's extremely powerful, it should complement, not replace, proper application-level security measures.
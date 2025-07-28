# Organization-Based Lead Sharing Update

## Overview
This update transforms the lead management system from user-isolated leads to organization-shared leads, enabling team collaboration within the same gym while maintaining strict isolation between different organizations.

## What Changed

### 1. Authentication System (`/app/lib/api/auth-check.ts`)
- **Before**: `requireAuth()` only returned basic user info
- **After**: Returns `AuthenticatedUser` object with:
  ```typescript
  {
    id: string
    email: string
    organizationId: string
    role?: string
  }
  ```
- Added caching to reduce database lookups (5-minute TTL)
- Fetches organization info from the `users` table

### 2. Database Structure (`/supabase/migrations/20250729_fix_leads_organization_structure.sql`)
- Added `organization_id` column to leads table
- Added `created_by` column to track who created each lead
- Added `assigned_to` column for lead assignment
- Removed dependency on `user_id` for access control
- Created new RLS policies based on organization membership
- Added helper function `auth.get_user_organization_id()` for RLS
- Created view `leads_with_users` for easier querying with user details

### 3. API Routes Updates

#### `/app/api/leads/route.ts`
- **GET**: Filters by `organization_id` instead of `user_id`
- **POST**: Sets both `organization_id` and `created_by`
- **PATCH**: Verifies organization ownership before updates
- **DELETE**: Checks organization membership before deletion
- Added support for filtering by `assigned_to` and `created_by`
- Returns user details for creator and assignee

#### `/app/api/leads/[id]/route.ts`
- **GET**: Verifies lead belongs to user's organization
- **PATCH**: Prevents updating organization_id or created_by
- **DELETE**: Double-checks organization ownership

## Key Benefits

1. **Team Collaboration**: All staff members can see and manage leads
2. **Lead Assignment**: Managers can assign leads to specific team members
3. **Audit Trail**: Tracks who created each lead via `created_by`
4. **Security**: Maintains strict isolation between organizations
5. **Performance**: Caches organization lookups to reduce database queries

## Usage Examples

### Creating a Lead
```typescript
// Lead is automatically assigned to the organization
const response = await fetch('/api/leads', {
  method: 'POST',
  body: JSON.stringify({
    name: 'John Doe',
    email: 'john@example.com',
    phone: '1234567890',
    assigned_to: 'user-id' // Optional: assign to specific team member
  })
})
```

### Fetching Organization Leads
```typescript
// Get all leads for the organization
const response = await fetch('/api/leads')

// Filter by assignment
const response = await fetch('/api/leads?assigned_to=user-id')

// Filter by creator
const response = await fetch('/api/leads?created_by=user-id')
```

### Updating Lead Assignment
```typescript
const response = await fetch('/api/leads', {
  method: 'PATCH',
  body: JSON.stringify({
    id: 'lead-id',
    assigned_to: 'new-user-id'
  })
})
```

## Security Guarantees

1. **Organization Isolation**: Users can ONLY access leads from their own organization
2. **No Cross-Organization Access**: Attempting to access another org's leads returns 404
3. **Immutable Fields**: Cannot change `organization_id` or `created_by` after creation
4. **RLS Protection**: Database-level policies enforce organization boundaries

## Migration Steps

1. **Run the migration**:
   ```bash
   supabase migration up
   ```

2. **Verify existing data**:
   - Check that users have `organization_id` set
   - Existing leads will be migrated to use organization structure

3. **Update frontend**:
   - Remove any user-specific filtering
   - Add UI for lead assignment
   - Show created_by and assigned_to information

## Testing

Run the test suite to verify organization isolation:
```bash
npm test __tests__/api/leads-organization-sharing.test.ts
```

## Important Notes

- The `user_id` column is deprecated and should be removed after migration
- All queries now filter by `organization_id` not `user_id`
- Frontend components need updating to show shared leads
- Consider adding role-based permissions for delete operations
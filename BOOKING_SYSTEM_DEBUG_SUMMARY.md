# Booking System Debug Summary

## Issues Identified and Fixed

### 1. **Foreign Key Constraint Violation (HTTP 409)**

**Problem**: Bookings table had `customer_id` column that referenced `leads` table, but bookings were being created for entries in the `clients` table.

**Root Cause**:

- The system has a dual customer architecture with both `leads` and `clients` tables
- The original booking system only supported `leads` (customer_id)
- Clients couldn't book classes because their IDs didn't exist in the `leads` table

**Solution**:

- Added `client_id` column to bookings table
- Made `customer_id` nullable
- Added constraint to ensure exactly one of `customer_id` OR `client_id` is set
- Updated booking logic to use appropriate field based on customer type

### 2. **RLS Policy Issues (HTTP 400/406)**

**Problem**: Row Level Security policies were inconsistent and blocking legitimate queries.

**Root Cause**:

- Mismatch between table names (`user_organizations` vs `organization_members`)
- Inconsistent column names (`organization_id` vs `org_id`)
- Missing or incorrect RLS policies for dual customer system

**Solution**:

- Standardized on `user_organizations` table with `organization_id` column
- Created comprehensive RLS policies supporting both customer types
- Added public booking creation policy for booking widgets

### 3. **Table Schema Inconsistencies**

**Problem**: Different migrations used different table/column naming conventions.

**Root Cause**:

- Some migrations used `org_id`, others used `organization_id`
- Some referenced `organization_members`, others `user_organizations`

**Solution**:

- Standardized all tables to use `organization_id`
- Ensured consistent table references
- Added indexes for performance

### 4. **Client/Lead Detection Logic**

**Problem**: Booking modal had complex workaround logic that was failing.

**Root Cause**:

- Workaround tried to create lead entries for clients
- Logic was race-condition prone and error-prone

**Solution**:

- Simplified detection logic
- Direct support for both client and lead types
- Proper async handling of customer type detection

## Files Changed

### Database Migrations

- **`20250917_fix_booking_system_comprehensive.sql`**: Comprehensive migration fixing all schema issues

### Frontend Components

- **`app/components/booking/SingleClassBookingModal.tsx`**: Updated to handle dual customer system

### API Endpoints

- **`app/api/test-booking/route.ts`**: Test endpoint to verify booking functionality

## Testing the Fix

### 1. Apply the Migration

```bash
# Run the comprehensive migration
supabase db reset  # Or apply the specific migration
```

### 2. Test Booking for Clients

```javascript
// POST to /api/test-booking
{
  "customerId": "client-uuid-here",
  "customerType": "client",
  "classSessionId": "session-uuid-here",
  "organizationId": "org-uuid-here"
}
```

### 3. Test Booking for Leads

```javascript
// POST to /api/test-booking
{
  "customerId": "lead-uuid-here",
  "customerType": "lead",
  "classSessionId": "session-uuid-here",
  "organizationId": "org-uuid-here"
}
```

### 4. Verify Database State

```sql
-- Check booking was created with correct foreign key
SELECT
  id,
  customer_id,
  client_id,
  booking_status,
  organization_id
FROM bookings
WHERE class_session_id = 'your-session-id';

-- Verify constraint works (should fail)
INSERT INTO bookings (customer_id, client_id, class_session_id, organization_id)
VALUES ('uuid1', 'uuid2', 'session-id', 'org-id');
```

## Database Schema After Fix

### Bookings Table

```sql
CREATE TABLE bookings (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  class_session_id UUID NOT NULL REFERENCES class_sessions(id),
  customer_id UUID REFERENCES leads(id),      -- For leads
  client_id UUID REFERENCES clients(id),       -- For clients
  booking_status VARCHAR(50) DEFAULT 'confirmed',
  payment_status VARCHAR(50) DEFAULT 'pending',
  -- ... other columns
  CONSTRAINT check_customer_or_client_booking
    CHECK ((customer_id IS NOT NULL AND client_id IS NULL) OR
           (customer_id IS NULL AND client_id IS NOT NULL))
);
```

### Key Changes

1. **Dual Foreign Keys**: Both `customer_id` and `client_id` columns
2. **Constraint**: Ensures exactly one is set
3. **Nullable**: `customer_id` is now nullable
4. **RLS Policies**: Support both customer types
5. **Indexes**: Added for performance

## Verification Checklist

- [ ] Migration runs without errors
- [ ] Bookings can be created for clients
- [ ] Bookings can be created for leads
- [ ] RLS policies allow authorized access
- [ ] RLS policies block unauthorized access
- [ ] Existing bookings still work
- [ ] Payment method queries work for both types
- [ ] Membership usage updates work
- [ ] Package usage updates work

## Production Deployment Notes

1. **Zero Downtime**: Migration is designed to be backward compatible
2. **Existing Data**: Preserved - no data loss
3. **Rollback**: Can be rolled back by removing new columns/constraints
4. **Monitoring**: Watch for any remaining 409/406 errors

## Future Improvements

1. **Data Consolidation**: Consider merging `leads` and `clients` tables in the future
2. **Type Safety**: Add TypeScript types for dual customer system
3. **Performance**: Monitor query performance with new dual foreign keys
4. **Consistency**: Ensure all features support both customer types

# Staff Management Module Context

> **Updated**: 2025-08-30T12:00:00Z
> **Last Migration**: 2025-08-08 (staff_management_schema.sql)

## Current State Analysis

The staff management module has a **split implementation** with basic functionality working but advanced features incomplete:

### Working Components
- **Main Page**: `/app/staff/page.tsx` - Basic staff listing with fallback support
- **API Endpoints**: Basic CRUD operations through `/api/staff/*` routes
- **Database Schema**: Comprehensive tables created but some inconsistencies exist
- **Fallback System**: Demo data shows when API fails (development mode)

### Critical Issues Identified
1. **Schema Mismatch**: Page expects `organization_staff` table, but comprehensive schema uses `staff_profiles`
2. **API Disconnect**: `/api/staff/route.ts` tries both tables but returns inconsistent data format
3. **Missing Staff Invitations Table**: Code references `staff_invitations` but table may not exist
4. **Incomplete Feature Tabs**: Schedule, Payroll, and Permissions show "coming soon" placeholders

## Component Locations

### Frontend Components
```
/app/staff/page.tsx                           - Main staff management page
/app/staff/InviteStaffModal.tsx              - Staff invitation modal
/app/staff/StaffLocationModal.tsx            - Location access management
/app/components/staff/StaffList.tsx          - Advanced staff list component (unused)
/app/components/staff/StaffCard.tsx          - Staff member card display
/app/components/staff/StaffForm.tsx          - Staff profile form
/app/components/staff/StaffProfile.tsx       - Staff profile modal
/app/components/staff/ClockInOut.tsx         - Time tracking widget
/app/components/staff/TimesheetTable.tsx     - Timesheet management
/app/components/staff/TimeOffRequests.tsx    - PTO management
/app/components/staff/StaffPayroll.tsx       - Payroll integration
```

### API Endpoints
```
/app/api/staff/route.ts                      - Main staff CRUD operations
/app/api/staff/invite/route.ts               - Staff invitation system
/app/api/staff/[id]/route.ts                 - Individual staff operations
/app/api/staff/timesheets/route.ts           - Timesheet management
/app/api/staff/time-off/route.ts             - Time off requests
/app/api/organization/add-staff/route.ts     - Alternative staff creation
```

### Database Schema Files
```
/supabase/migrations/20250808_staff_management_schema.sql  - Comprehensive staff tables
/supabase/migrations/20250129_organization_staff_table.sql - Basic organization_staff table
/supabase/staff-invitations.sql                           - Staff invitation system
/supabase/staff-permissions.sql                           - Role-based permissions
```

## Database Schema

### Primary Tables

#### `organization_staff` (Currently Used)
```sql
-- Basic staff table - actively used by main page
-- [source: /supabase/migrations/20250129_organization_staff_table.sql:L2-L18]
CREATE TABLE organization_staff (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  user_id TEXT,  -- Can be UUID or pending string
  email TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  role TEXT DEFAULT 'staff' CHECK (role IN ('owner', 'manager', 'staff', 'trainer')),
  is_available BOOLEAN DEFAULT true,
  receives_calls BOOLEAN DEFAULT true,
  receives_sms BOOLEAN DEFAULT true,
  receives_whatsapp BOOLEAN DEFAULT true,
  receives_emails BOOLEAN DEFAULT true,
  routing_priority INTEGER DEFAULT 100,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
)
```

#### `staff_profiles` (Comprehensive Schema)
```sql
-- Advanced staff table - created but not fully utilized
-- [source: /supabase/migrations/20250808_staff_management_schema.sql:L34-L62]
CREATE TABLE staff_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  user_id UUID REFERENCES auth.users(id),
  employee_id VARCHAR(50) UNIQUE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone_number VARCHAR(20),
  job_position VARCHAR(100) NOT NULL,
  department VARCHAR(100),
  hire_date DATE NOT NULL,
  employment_type VARCHAR(20) DEFAULT 'full_time',
  status VARCHAR(20) DEFAULT 'active',
  hourly_rate DECIMAL(10,2),
  salary DECIMAL(12,2),
  -- ... additional fields for addresses, emergency contacts, etc.
)
```

### Supporting Tables
- `staff_time_off_requests` - PTO management
- `staff_shifts` - Schedule management  
- `staff_timesheet_entries` - Time tracking
- `staff_payroll_batches` - Payroll processing
- `staff_documents` - Document storage
- `staff_performance_reviews` - Performance tracking
- `staff_sops` - Standard Operating Procedures

## API Endpoints

### GET /api/staff
**Purpose**: Fetch all staff members for organization  
**Implementation**: `/app/api/staff/route.ts:L4-L138`  
**Issues**: 
- Tries `organization_staff` first, falls back to `staff_profiles` 
- Returns different data formats depending on which table has data
- Missing proper error handling for schema mismatches

### POST /api/staff/invite
**Purpose**: Send staff invitation emails  
**Implementation**: `/app/api/staff/invite/route.ts:L6-L166`  
**Issues**:
- References `staff_invitations` table that may not exist
- Falls back to creating `organization_staff` record directly if invitation table missing
- Email sending may fail silently

### POST /api/organization/add-staff  
**Purpose**: Manually add staff without invitation  
**Implementation**: `/app/api/organization/add-staff/route.ts`  
**Status**: Referenced by main page but exact implementation unknown

## Feature Gaps and Issues

### Critical Issues
1. **Schema Inconsistency**: Two different staff table schemas in use
2. **API Data Format Mismatch**: Frontend expects one format, API returns another
3. **Missing Invitation System**: `staff_invitations` table may not be properly migrated
4. **Incomplete Component Integration**: Advanced components exist but aren't connected

### Missing Features
1. **Schedule Management**: Tab shows placeholder, no implementation
2. **Payroll Integration**: Components exist but not connected to main interface
3. **Time Tracking**: Clock in/out functionality incomplete
4. **Performance Reviews**: Database schema exists but no UI
5. **Document Management**: No file upload/storage system
6. **Advanced Permissions**: Role-based access control incomplete

### UI/UX Issues
1. **Fallback Data Confusion**: Demo data not clearly marked in UI
2. **Location Management**: Modal exists but workflow unclear
3. **Bulk Operations**: No bulk invite or management features
4. **Search/Filter**: Basic implementation, missing advanced filters

## Implementation Plan

### Phase 1: Core Fixes (Priority 1)
1. **Resolve Schema Conflict**
   - Migrate all data to unified `staff_profiles` table
   - Update API endpoints to use consistent schema
   - Fix data format mismatches between frontend/backend

2. **Fix Invitation System**
   - Ensure `staff_invitations` table is properly migrated
   - Test email sending functionality
   - Add proper error handling and user feedback

3. **Complete Basic CRUD Operations**
   - Fix staff creation/editing workflows
   - Implement proper validation
   - Add error boundaries and loading states

### Phase 2: Feature Completion (Priority 2)
1. **Time Tracking System**
   - Connect clock in/out components to main interface
   - Implement shift scheduling
   - Add timesheet approval workflow

2. **Schedule Management**
   - Replace placeholder with functional schedule interface
   - Connect to existing shift management tables
   - Add calendar integration

3. **Advanced Staff List**
   - Replace basic display with advanced `StaffList` component
   - Add proper filtering, sorting, and search
   - Implement bulk operations

### Phase 3: Advanced Features (Priority 3)
1. **Payroll Integration**
   - Connect payroll components to main interface
   - Implement Xero integration
   - Add payroll batch processing

2. **Performance Management**
   - Build UI for performance reviews
   - Add goal tracking system
   - Implement review workflows

3. **Document Management**
   - Add file upload system
   - Implement document categorization
   - Add expiry tracking and notifications

### Phase 4: Polish and Optimization (Priority 4)
1. **Enhanced Permissions**
   - Implement granular role-based access
   - Add location-based permissions
   - Create permission management interface

2. **Reporting and Analytics**
   - Add staff analytics dashboard
   - Implement productivity metrics
   - Create custom report builder

## Dependencies and Blockers

### External Dependencies
- **Supabase**: Database and RLS policies must be properly configured
- **Email Service**: Staff invitation emails require working email system
- **Xero Integration**: Payroll features depend on Xero API configuration
- **File Storage**: Document management requires file upload system

### Technical Blockers
- **Migration Conflicts**: Multiple staff-related migrations may have conflicts
- **RLS Policies**: Row Level Security must be consistent across all staff tables
- **Authentication Flow**: Staff invitation acceptance requires proper auth integration
- **Organization Context**: All operations must properly scope to user's organization

### Development Environment Issues
- **Feature Flags**: `staffFallback` behavior may mask real issues during development
- **Demo Data**: Fallback data doesn't test real database operations
- **Email Testing**: Invitation emails difficult to test in development

---

**Next Steps**: 
1. Audit database for which staff tables actually exist and contain data
2. Fix schema inconsistencies by migrating to single source of truth
3. Test and fix invitation workflow end-to-end
4. Connect existing advanced components to main interface

**Estimated Effort**: 
- Phase 1: 3-5 days
- Phase 2: 5-7 days  
- Phase 3: 7-10 days
- Phase 4: 5-7 days
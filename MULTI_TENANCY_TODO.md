# Multi-Tenancy & Scalability Issues - TODO

**Date**: September 1, 2025  
**Status**: Issues identified, ready for implementation  
**Target**: Scale to 100+ organizations  

## 🚨 CRITICAL ISSUES (Must Fix First)

### 1. Hard-coded Organization IDs
- **Location**: Multiple files throughout codebase
- **Issue**: `63589490-8f55-4157-bd3a-e141594b748e` (Atlas Fitness ID) is hard-coded in 15+ files
- **Files to Fix**:
  - `/app/lib/organization-service.ts`
  - `/app/components/booking/BookingLinksManager.tsx`
  - `/app/customers/new/page.tsx`
  - `/middleware.ts`
  - Multiple SQL migration files
- **Solution**: Use dynamic organization lookup from authenticated user

### 2. Database Column Inconsistencies
- **Issue**: Mix of `org_id` vs `organization_id` columns
- **Tables Affected**: 
  - `clients` table (uses both)
  - `contacts` table (missing organization_id)
  - `leads` table
- **Solution**: Standardize to `organization_id` everywhere

### 3. Missing Row Level Security (RLS)
- **Tables without RLS**:
  - `booking_links`
  - `appointment_types`
  - `calendar_settings`
- **Risk**: Data leakage between organizations
- **Solution**: Add RLS policies for all tenant data

## ⚠️ HIGH PRIORITY ISSUES

### 4. N+1 Query Problems
- **Locations**:
  - `/app/leads/page.tsx` - Fetches organization for each lead
  - `/app/customers/page.tsx` - Multiple queries per customer
  - `/app/messages/page.tsx` - Conversation participant lookups
- **Impact**: Page load times will degrade with more data
- **Solution**: Batch queries, use joins, implement data loaders

### 5. Missing Organization Context
- **API Routes without org filtering**:
  - `/api/calendar/events`
  - `/api/automations/workflows`
  - `/api/forms`
  - `/api/analytics`
- **Solution**: Add organization_id filtering to all queries

### 6. No Pagination
- **Pages loading all records**:
  - Leads page
  - Customers page
  - Messages page
  - Automations list
- **Solution**: Implement cursor-based pagination

## 📊 MEDIUM PRIORITY ISSUES

### 7. Missing Database Indexes
- **Tables needing indexes**:
  - `leads` - on `organization_id, created_at`
  - `calendar_events` - on `organization_id, start_time`
  - `messages` - on `conversation_id, created_at`
- **Impact**: Slow queries as data grows

### 8. No Caching Layer
- **Frequently accessed data**:
  - Organization settings
  - User permissions
  - Calendar configurations
- **Solution**: Implement Redis caching

### 9. Unbounded Data Fetching
- **Issues**:
  - Calendar fetches 3 months of events
  - Messages loads entire conversation history
  - Analytics processes all-time data
- **Solution**: Implement time-based windowing

## 🔧 IMPLEMENTATION ROADMAP

### Phase 1: Critical Security (Week 1)
1. ✅ Fix hard-coded organization IDs
2. ✅ Standardize database columns
3. ✅ Add RLS to all tables
4. ✅ Fix API route filtering

### Phase 2: Performance (Week 2)
1. ⬜ Fix N+1 queries
2. ⬜ Add pagination everywhere
3. ⬜ Create database indexes
4. ⬜ Implement query result limits

### Phase 3: Scalability (Week 3)
1. ⬜ Add Redis caching
2. ⬜ Implement connection pooling
3. ⬜ Add request rate limiting
4. ⬜ Create tenant isolation middleware

### Phase 4: Monitoring (Week 4)
1. ⬜ Add query performance logging
2. ⬜ Implement tenant usage tracking
3. ⬜ Create admin dashboard
4. ⬜ Set up alerts for slow queries

## 📋 CURRENT TODO LIST

1. **Consolidate calendar settings** ✅ (Completed)
2. **Fix calendar integration** ✅ (Completed)
3. **Test booking with conflicts** (In Progress)
4. **Begin multi-tenancy fixes** (Next Task)

## 🎯 IMMEDIATE NEXT STEPS

1. **Test the calendar integration**:
   - Go to: https://atlas-fitness-onboarding.vercel.app/settings/calendar-integration
   - Connect Google Calendar if not connected
   - Update booking link
   - Test at: https://atlas-fitness-onboarding.vercel.app/book/test

2. **Start Phase 1 fixes**:
   - Create environment variable for default org ID
   - Update organization service to remove hard-coding
   - Add migration to standardize column names

## 📝 NOTES FOR CONTINUATION

- Calendar integration is now consolidated at `/settings/calendar-integration`
- Booking system works but needs Google Calendar connected for conflict detection
- Database has mixed schemas that need standardization
- Most critical issue is hard-coded organization IDs throughout codebase

## 🔗 RELATED FILES

- `/app/settings/calendar-integration/page.tsx` - New unified calendar settings
- `/app/api/booking-by-slug/availability/route.ts` - Updated with Google Calendar checking
- `/app/lib/organization-service.ts` - Needs refactoring to remove hard-coded IDs
- `/scripts/create-membership-plans-table.sql` - Example of hard-coded org ID in migrations

---

**Remember**: Test thoroughly in a staging environment before deploying multi-tenancy changes to production. These changes affect data isolation and security.
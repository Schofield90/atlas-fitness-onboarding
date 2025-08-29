# Non-Automation Module Risks & Issues

This document identifies API unknowns, SSR/CSR collisions, data model gaps, and missing endpoints for non-automation modules.

## CRITICAL RISKS

### 1. BILLING MODULE - STRIPE INTEGRATION FAILURES

**Risk**: Stripe not configured error (Lines 139, 157, 176, 268)
- **Location**: `/app/api/saas/billing/route.ts`
- **Issue**: Silent failure when `STRIPE_SECRET_KEY` is missing
- **Impact**: All subscription operations fail with 500 errors
- **Fix Required**: Environment validation + graceful degradation

**Risk**: Mock data fallback in production
- **Location**: `/app/components/saas/SaasBillingDashboard.tsx:62-204`
- **Issue**: API failures trigger mock data display
- **Impact**: Users see fake billing information
- **Fix Required**: Proper error boundaries + retry mechanisms

**Risk**: Database table assumptions
- **Location**: Lines 52-77 in billing API
- **Tables**: `organization_usage_metrics`, `saas_plans`, `saas_subscriptions`
- **Issue**: Queries assume tables exist and have specific schemas
- **Fix Required**: Table existence checks + migration verification

---

### 2. CALENDAR MODULE - DATA CONSISTENCY ISSUES

**Risk**: Duplicate event handling
- **Location**: `/app/calendar/page.tsx:114-120`
- **Issue**: Google Calendar and local events may create duplicates
- **Impact**: Confused scheduling and double-bookings
- **Fix Required**: Robust deduplication logic

**Risk**: Authentication errors with Google Calendar
- **Location**: Lines 31-43 (URL parameter error handling)
- **Issue**: Various auth failure modes not properly handled
- **Impact**: Users stuck in auth failure loops
- **Fix Required**: Better error recovery + re-auth flows

**Risk**: Calendar event modification inconsistency
- **Location**: Lines 174-210 (handleSaveEvent, handleDeleteEvent)
- **Issue**: Updates local DB but may not sync with Google Calendar
- **Impact**: Calendar desync between systems
- **Fix Required**: Two-way sync validation

---

### 3. CUSTOMERS MODULE - DATA INTEGRITY PROBLEMS

**Risk**: Import data corruption
- **Location**: `/app/customers/page.tsx:313-325` (CSV parsing)
- **Issue**: Basic CSV parsing doesn't handle quoted commas or complex data
- **Impact**: Customer data corruption during bulk imports
- **Fix Required**: Robust CSV parser + data validation

**Risk**: Customer/Lead data model confusion  
- **Location**: Lines 372-404 (Import logic)
- **Issue**: Logic to determine client vs lead is unreliable
- **Impact**: Customers imported as leads and vice versa
- **Fix Required**: Clear data type classification rules

**Risk**: Export data exposure
- **Location**: Lines 226-242 (Export includes medical data)
- **Issue**: Medical conditions exported in plain CSV
- **Impact**: GDPR/privacy compliance issues
- **Fix Required**: Data sensitivity controls + export permissions

---

### 4. CONVERSATIONS MODULE - ARCHITECTURE INSTABILITY

**Risk**: Mode switching issues
- **Location**: `/app/conversations/page.tsx:26-34`
- **Issue**: Toggle between enhanced and legacy modes loses state
- **Impact**: Lost conversation context and messages
- **Fix Required**: State preservation across mode switches

**Risk**: Complex multi-table queries
- **Location**: Lines 68-174 (fetchConversations)
- **Issue**: Loops through customers making multiple queries
- **Impact**: Performance degradation + query timeout risks
- **Fix Required**: Optimized single-query approach

**Risk**: Phone number normalization inconsistencies
- **Location**: Lines 86-90 (Phone number handling)
- **Issue**: Multiple phone formats not consistently handled
- **Impact**: Messages not linked to correct customers
- **Fix Required**: Standardized phone number normalization

---

### 5. STAFF MANAGEMENT - AUTHORIZATION GAPS

**Risk**: Role-based access not implemented
- **Location**: `/app/staff/page.tsx:245-249`
- **Issue**: Permissions tab is placeholder
- **Impact**: No access control between staff members
- **Fix Required**: Implement role-based permissions system

**Risk**: Staff scheduling not implemented
- **Location**: Lines 231-235, 238-242
- **Issue**: Schedule and payroll tabs are placeholders
- **Impact**: Manual coordination required, no automated scheduling
- **Fix Required**: Build scheduling and payroll systems

**Risk**: Location access ambiguity
- **Location**: Lines 214-221 (Location access button)
- **Issue**: Shows status but management is unclear
- **Impact**: Staff may have inappropriate location access
- **Fix Required**: Clear location permission management

---

## MISSING API ENDPOINTS

### Required Endpoints Not Found:
1. **GET/POST /api/campaigns** - Campaign management
2. **GET/POST /api/surveys** - Survey creation and management  
3. **GET /api/analytics/dashboard-data** - Consolidated analytics
4. **GET /api/reports/generate** - Report generation
5. **POST /api/staff/schedule** - Staff scheduling
6. **GET/POST /api/payroll/batches** - Payroll processing

### Stub Endpoint Proposals:
```
/api/campaigns/
  - GET: List campaigns
  - POST: Create campaign
  - PUT /{id}: Update campaign
  - DELETE /{id}: Delete campaign

/api/surveys/
  - GET: List surveys  
  - POST: Create survey
  - GET /{id}/responses: Get responses
  - POST /{id}/distribute: Send survey

/api/staff/scheduling/
  - GET /{id}/schedule: Get staff schedule
  - POST /{id}/schedule: Update schedule
  - GET /conflicts: Check scheduling conflicts
```

---

## SSR/CSR COLLISION RISKS

### Client-Side State Management Issues:

**1. Calendar Page State Collision**
- **Issue**: `useEffect` with `window.location` access (Line 32)
- **Risk**: SSR hydration mismatches
- **Fix**: Move to `useLayoutEffect` or check `typeof window`

**2. Billing Dashboard Stripe Loading**
- **Issue**: `loadStripe` called at module level (Line 10)
- **Risk**: Server-side execution attempt
- **Fix**: Dynamic import in `useEffect`

**3. Customer Export Window Access**  
- **Issue**: `window.location.origin` on Line 238
- **Risk**: Server-side rendering errors
- **Fix**: Use Next.js `headers()` or client-only wrapper

### Authentication State Mismatches:
- Multiple components call `supabase.auth.getUser()` without SSR consideration
- Risk of auth state flickering on page load
- Need consistent auth state management pattern

---

## DATA MODEL GAPS

### Missing Relationships:
1. **Conversation Threading**: No proper message threading model
2. **Customer Journey Tracking**: No lead-to-customer conversion tracking  
3. **Staff Scheduling**: No schedule/availability data model
4. **Campaign Performance**: No campaign effectiveness tracking
5. **Survey Response Analytics**: Limited survey-to-outcome tracking

### Schema Inconsistencies:
1. **Phone Number Storage**: Multiple formats across tables
2. **Email Case Sensitivity**: No standardization
3. **Status Enums**: Different status values across modules  
4. **Timezone Handling**: Inconsistent timezone storage

### Missing Indexes:
- `customers.email` needs unique index
- `conversations.customer_id` needs foreign key
- `staff.organization_id` needs composite index
- `calendar_events.start_time` needs range index

---

## SECURITY RISKS

### Data Exposure:
1. **Medical Data in Exports**: Customer medical info exported without encryption
2. **Staff Phone Numbers**: Visible to all organization members
3. **Billing Information**: Mock data exposes fake financial details

### Authentication Bypass:
1. **Organization Context**: Some queries don't verify organization membership
2. **Staff Permissions**: No role validation on sensitive operations
3. **API Rate Limiting**: No protection against abuse

### Cross-Tenant Data Leaks:
1. **Conversation Queries**: Complex phone number matching could cross organizations
2. **Calendar Sync**: Google Calendar integration might leak across tenants
3. **Import Functions**: No organization isolation validation

---

## PERFORMANCE RISKS

### Query Performance:
1. **Conversation Loading**: N+1 query pattern (Line 80-161)
2. **Customer Export**: No pagination for large datasets
3. **Staff Loading**: Missing indexes on organization queries
4. **Calendar Events**: Fetches 3+ months of events without limits

### Memory Issues:
1. **Large CSV Imports**: No streaming parser for big files
2. **Event Caching**: No cleanup of old calendar events  
3. **Conversation History**: Unlimited message loading

### API Response Times:
1. **Analytics Calculations**: Real-time computation without caching
2. **Billing Usage Metrics**: Complex aggregation queries
3. **Export Generation**: Synchronous CSV generation

---

## RECOMMENDED IMMEDIATE FIXES

### Priority 1 (Critical):
1. **Fix Stripe environment validation** in billing
2. **Implement proper CSV parsing** for customer imports
3. **Add organization isolation checks** to all queries
4. **Remove mock data fallbacks** from production paths

### Priority 2 (High):
1. **Optimize conversation loading** with proper queries
2. **Add missing API endpoints** for campaigns and surveys  
3. **Implement role-based access controls** for staff
4. **Fix SSR hydration issues** with window access

### Priority 3 (Medium):
1. **Add proper error boundaries** to all modules
2. **Standardize data models** across tables
3. **Implement caching** for expensive operations
4. **Add comprehensive logging** for debugging

### Monitoring Required:
- Set up error tracking for all identified failure points
- Monitor API response times for performance issues
- Track authentication errors and failures
- Alert on data model inconsistencies
- Watch for security violations and unauthorized access
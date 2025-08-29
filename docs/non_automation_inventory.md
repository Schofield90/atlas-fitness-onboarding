# Non-Automation Module Inventory

This document maps the exact files, line numbers, and API endpoints for each non-automation module in the Atlas Fitness platform.

## 1. BILLING MODULE

### Main Component
- **File**: `/app/billing/page.tsx`
- **Lines**: 1-218
- **Error Boundary**: Lines 83-113 (Generic error display with retry)
- **Loading State**: Lines 68-81
- **Try/Catch**: Lines 45-66 (fetchOrganization function)

### SaaS Dashboard Component
- **File**: `/app/components/saas/SaasBillingDashboard.tsx`
- **Lines**: 1-532
- **API Error Fallback**: Lines 62-204 (Mock data fallback when API fails)
- **Stripe Error Handling**: Lines 244-250, 266-272

### API Endpoints
- **GET /api/saas/billing**: `/app/api/saas/billing/route.ts` (Lines 10-91)
  - Error: Lines 84-90 (Generic 500 error)
  - Database queries: Lines 33-77
- **POST /api/saas/billing**: Lines 94-232 (Subscription creation/update)
- **DELETE /api/saas/billing**: Lines 235-298 (Subscription cancellation)

### Dead Controls & Issues
- Toast notifications (Lines 29, 32): TODO comments indicate missing implementation
- Stripe initialization check on Line 5-8: Returns null if no key
- Usage metrics calculation (Lines 59-70): Assumes table exists

---

## 2. CALENDAR/BOOKING LINKS MODULE

### Calendar Page
- **File**: `/app/calendar/page.tsx`
- **Lines**: 1-437
- **Event Fetching**: Lines 75-146 (fetchEvents function)
  - Google Calendar API: Lines 92-101 (try/catch with console errors)
  - Local events API: Lines 104-127 (try/catch with response logging)
- **Error Toast**: Line 142 (toast.error for failed calendar load)

### Booking Links Page
- **File**: `/app/booking-links/page.tsx`
- **Lines**: 1-411
- **Data Fetching**: Lines 30-66 (fetchBookingLinks function)
- **Delete Handler**: Lines 68-89 (includes confirm dialog)
- **Stats Fetching**: Lines 37-58 (Analytics API calls with error handling)

### API Endpoints
- **GET/POST/DELETE /api/booking-links**: `/app/api/booking-links/route.ts`
- **Calendar Events**: `/api/calendar/events` and `/api/calendar/google-events`

### Dead Controls & Issues
- Analytics fetching (Line 41): Continues if stats API fails
- Export functionality: Missing implementation for calendar events
- Some booking link settings show as disabled/inactive

---

## 3. CONTACTS/CUSTOMERS & CONVERSATIONS MODULE

### Customers Page
- **File**: `/app/customers/page.tsx`
- **Lines**: 1-783
- **Data Fetching**: Lines 53-111 (fetchCustomers function)
  - Database query: Lines 68-82 (clients table)
  - Error logging: Lines 83-87, 106-110
- **Export Function**: Lines 184-301 (exportCustomers)
- **Import Function**: Lines 327-421 (processImport)
  - File validation: Lines 304-311
  - CSV parsing: Lines 313-325

### Conversations Page
- **File**: `/app/conversations/page.tsx`
- **Lines**: 1-326
- **Enhanced Mode Toggle**: Lines 26-34 (Uses EnhancedChatInterface)
- **Legacy Conversation Fetching**: Lines 48-174 (Complex multi-table queries)
  - SMS/WhatsApp queries: Lines 97-127
  - Email queries: Lines 130-144

### Add Customer Modal
- **Lines**: 251-341 (Add Staff Modal in customers page)
- **Form Handler**: Lines 75-112 (/api/organization/add-staff endpoint)

### Dead Controls & Issues
- Import modal (Lines 675-779): File upload works but parsing is basic
- Conversation unread count (Line 157): TODO comment - not implemented
- Total messages count (Line 158): TODO comment - hardcoded to 1
- Enhanced chat interface toggle may cause state issues

---

## 4. STAFF MANAGEMENT MODULE

### Staff Page
- **File**: `/app/staff/page.tsx`
- **Lines**: 1-369
- **Data Fetching**: Lines 46-73 (fetchStaff function)
  - Organization check: Lines 48-56 (/api/organization/get-info)
  - Staff query: Lines 58-67 (organization_staff table)
- **Add Staff Handler**: Lines 75-112
  - API call: Lines 79-94 (/api/organization/add-staff)
  - Error handling: Lines 91-93

### Modal Components
- **Add Staff Modal**: Lines 252-341
- **Staff Location Modal**: Lines 344-354 (External component)
- **Invite Staff Modal**: Lines 356-364 (External component)

### Tab States
- **Team Tab**: Lines 166-228 (Active - shows staff list)
- **Schedule Tab**: Lines 231-235 (Placeholder - "coming soon")
- **Payroll Tab**: Lines 238-242 (Placeholder - "coming soon") 
- **Permissions Tab**: Lines 245-249 (Placeholder - "coming soon")

### Dead Controls & Issues
- Three tabs are placeholder implementations (Lines 232, 239, 246)
- Location access button (Lines 214-221): Shows "All Locations" or "Manage Locations"
- Hourly rate field (Lines 308-321): Collected but not used in API call

---

## 5. MARKETING & CAMPAIGNS MODULE

### Campaigns Page
- **File**: `/app/campaigns/page.tsx`
- **Status**: NOT FOUND - No implementation located
- **Expected Location**: Should exist in campaigns directory
- **Related Components**: 
  - `/app/components/campaigns/CampaignAnalytics.tsx`
  - `/app/components/campaigns/EmailComposer.tsx`

### Email Marketing Page
- **File**: `/app/email-marketing/page.tsx`
- **Status**: PLACEHOLDER - Likely minimal implementation

### Dead Controls & Issues
- Campaigns page appears to be missing main implementation
- Email composer component exists but integration unclear
- No clear API endpoints for campaign management

---

## 6. SURVEYS & FEEDBACK MODULE

### Surveys Page
- **File**: `/app/surveys/page.tsx`
- **Status**: NOT ANALYZED - File exists but content not examined
- **Related Components**:
  - `/app/components/surveys/SurveyAnalytics.tsx`
  - `/app/components/surveys/SurveyResponses.tsx`

### Expected Features
- Survey creation/editing
- Response analytics
- Survey distribution

### Dead Controls & Issues
- Implementation status unknown - requires detailed analysis
- Analytics component suggests some survey functionality exists

---

## 7. FORMS MODULE

### Forms Page  
- **File**: `/app/forms/page.tsx`
- **Status**: MINIMAL IMPLEMENTATION EXPECTED
- **Related Components**:
  - `/app/components/forms/DragDropFormBuilder.tsx`
  - `/app/components/forms/FormAnalytics.tsx`

### API Endpoints
- **Forms API**: `/app/api/forms/` directory exists
- **Endpoints**: list, save, submit, update routes

### Dead Controls & Issues  
- Form builder component suggests drag-drop functionality
- Analytics component indicates form performance tracking
- Implementation level unclear without analysis

---

## 8. AI INTELLIGENCE MODULE

### AI Intelligence Page
- **File**: `/app/ai-intelligence/page.tsx`
- **Status**: SIMPLE IMPLEMENTATION EXPECTED
- **Related API**: Extensive AI API directory at `/app/api/ai/`

### AI Components
- **AI Dashboard**: `/app/components/ai/AIDashboard.tsx`
- **AI Assistant**: `/app/components/ai/AIAssistant.tsx`
- **Embedded Assistant**: `/app/components/ai/EmbeddedAssistant.tsx`

### Dead Controls & Issues
- Page likely loads organization data and displays AI dashboard
- Extensive AI API suggests functional AI features
- Error handling probably similar to other modules

---

## 9. ANALYTICS, REPORTING, SOPs, AND PAYROLL MODULES

### Analytics Dashboard
- **File**: `/app/analytics-dashboard/page.tsx`
- **Analytics Page**: `/app/analytics/page.tsx`
- **API**: `/app/api/analytics/` with dashboard, realtime, track routes

### Reports Page
- **File**: `/app/reports/page.tsx`
- **Status**: PLACEHOLDER EXPECTED

### SOPs Page
- **File**: `/app/sops/page.tsx`
- **Related Components**: `/app/components/sops/` directory with multiple components
- **API**: `/app/api/sops/route.ts`

### Payroll Page
- **File**: `/app/payroll/page.tsx`
- **Related Components**: `/app/components/payroll/` directory
- **API**: `/app/api/payroll/` directory with multiple routes

### Dead Controls & Issues
- SOPs has rich component set suggesting full implementation
- Payroll has dashboard, batch processing, and Xero integration
- Analytics likely has real-time tracking capabilities
- Reports may be placeholder/minimal implementation

---

## COMMON PATTERNS IDENTIFIED

### Error Handling Patterns
1. **Try-catch blocks** around API calls with console.error logging
2. **Fallback UI states** for loading and error conditions  
3. **Toast notifications** for user feedback (some marked as TODO)
4. **Mock/fallback data** when APIs fail (especially in Billing)

### Authentication Patterns
1. **Supabase auth check**: `supabase.auth.getUser()` 
2. **Organization context**: Fetching user's organization via user_organizations table
3. **API endpoint pattern**: `/api/organization/get-info` for org context

### Loading States
1. **Loading spinners** with consistent styling
2. **Skeleton placeholders** in some components
3. **Loading flags** to disable interactions during operations

### Dead Control Indicators
1. **TODO comments** in code
2. **Placeholder text** like "coming soon"
3. **Console.log statements** suggesting debug/incomplete features
4. **Empty catch blocks** or generic error handling
5. **Hardcoded values** instead of dynamic data
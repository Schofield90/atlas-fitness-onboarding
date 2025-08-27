# Atlas Fitness CRM - Non-Automation Module Inventory

## Repository Scan Results

### 📁 Structure Overview

**Repository Path**: `/Users/Sam/atlas-fitness-onboarding`

**Architecture**: Multi-tenant SaaS platform with Next.js 15 App Router
- **Frontend**: React Server/Client Components with TypeScript
- **Backend**: Next.js API routes with Supabase integration
- **Database**: PostgreSQL with RLS (Supabase)
- **State Management**: Local state + Supabase real-time subscriptions
- **Styling**: Tailwind CSS with custom UI components

### 🗺️ Route Inventory

#### Page Routes (Non-Automation)

##### 1. **Billing & Subscription** (`/billing`)
- **Main Page**: `/app/billing/page.tsx`
- **Components**: 
  - `SaasBillingDashboard`
  - `StripeConnect`
- **Features**: Subscription management, revenue tracking, payment settings

##### 2. **Contacts & Leads** (`/leads`)
- **Main Page**: `/app/leads/page.tsx`
- **Detail Page**: `/app/leads/[id]/page.tsx`
- **Components**:
  - `LeadsTable`
  - `AddLeadModal`
  - `BulkImportModal`
  - `LeadDetailsModal`
- **Features**: Lead management, import/export, AI scoring

##### 3. **Conversations** (`/conversations`)
- **Main Page**: `/app/conversations/page.tsx`
- **Components**:
  - `EnhancedChatInterface`
  - `MessageComposer`
  - `MessageHistory`
- **Features**: Unified messaging, WhatsApp/SMS/Email integration

##### 4. **Call Bookings** (`/booking`)
- **Main Page**: `/app/booking/page.tsx`
- **Public Pages**: `/app/book/[slug]/page.tsx`
- **Booking Links**: `/app/booking-links/page.tsx`
- **Components**:
  - `BookingCalendar`
  - `BookingWidget`
  - `BookingLinksManager`
  - `SessionDetailModal`

##### 5. **Staff Management** (`/staff-management`)
- **Main Page**: `/app/staff-management/page.tsx`
- **Staff Directory**: `/app/staff/page.tsx`
- **Components**:
  - `StaffList`
  - `StaffForm`
  - `TimesheetTable`
  - `TimeOffRequests`
  - `ShiftSchedule`
  - `ClockInOut`

##### 6. **Marketing & Campaigns** (`/campaigns`)
- **Main Page**: `/app/campaigns/page.tsx`
- **Components**:
  - `EmailComposer`
- **Features**: Facebook/Instagram/Email campaign management

##### 7. **Surveys & Feedback** (`/surveys`)
- **Main Page**: `/app/surveys/page.tsx`
- **Features**: Survey creation, response tracking, analytics

##### 8. **Website & Forms** (`/forms`)
- **Main Page**: `/app/forms/page.tsx`
- **Components**:
  - `DragDropFormBuilder`
- **Features**: AI-powered form generation, form builder

#### API Routes

##### Billing APIs
- `/api/billing/stripe-connect/*` - Stripe Connect integration

##### Lead Management APIs
- `/api/leads/route.ts` - Main lead CRUD operations
- `/api/leads/[id]/route.ts` - Individual lead operations
- `/api/leads/scoring/route.ts` - AI scoring endpoints
- `/api/leads/activities/route.ts` - Lead activity tracking

##### Communication APIs
- `/api/messages/send/route.ts` - Send messages
- `/api/messages/history/*` - Message history
- `/api/sms/*` - SMS operations
- `/api/whatsapp/*` - WhatsApp operations
- `/api/email/send/route.ts` - Email sending
- `/api/calls/initiate/route.ts` - Voice calls

##### Booking APIs
- `/api/booking/classes/route.ts` - Class bookings
- `/api/booking/availability/route.ts` - Availability checking
- `/api/booking/create/route.ts` - Create bookings
- `/api/booking-links/route.ts` - Booking link management
- `/api/appointment-types/route.ts` - Appointment type configuration

##### Staff APIs
- `/api/staff/route.ts` - Staff CRUD operations
- `/api/staff/[id]/route.ts` - Individual staff operations
- `/api/staff/timesheets/route.ts` - Timesheet management
- `/api/staff/timesheets/clock-in/route.ts` - Clock in/out
- `/api/staff/time-off/route.ts` - Time off requests
- `/api/staff/invite/route.ts` - Staff invitations

##### Campaign APIs
- `/api/campaigns/send-test-email/route.ts` - Test email campaigns
- `/api/integrations/facebook/*` - Facebook integration
- `/api/integrations/meta/*` - Meta ads integration

##### Form APIs
- `/api/forms/list/route.ts` - List forms
- `/api/forms/save/route.ts` - Save forms
- `/api/forms/update/route.ts` - Update forms
- `/api/forms/submit/route.ts` - Form submissions
- `/api/ai/generate-form/route.ts` - AI form generation

### 📋 Relevant Files by Module

#### 1. **Billing & Subscription Module**

**Primary Files (Direct Impact)**
- `/app/billing/page.tsx` - Main billing page with tabs
- `/app/components/saas/SaasBillingDashboard.tsx` - Subscription dashboard
- `/app/components/billing/StripeConnect.tsx` - Stripe integration component
- `/app/api/billing/stripe-connect/*` - Stripe API routes

**Secondary Files (Potential Impact)**
- `/app/lib/stripe-server.ts` - Stripe server utilities
- `/app/lib/stripe.ts` - Stripe client utilities
- `/app/api/payments/*` - Payment processing APIs

#### 2. **Contacts & Leads Module**

**Primary Files (Direct Impact)**
- `/app/leads/page.tsx` - Main leads page
- `/app/leads/[id]/page.tsx` - Lead detail page
- `/app/components/leads/LeadsTable.tsx` - Lead list component
- `/app/components/leads/AddLeadModal.tsx` - Add lead modal
- `/app/components/leads/BulkImportModal.tsx` - Import functionality
- `/app/api/leads/route.ts` - Lead CRUD API

**Secondary Files (Potential Impact)**
- `/app/lib/services/lead-scoring.ts` - AI scoring service
- `/app/lib/cache/cached-lead-service.ts` - Cached lead operations
- `/app/lib/ai/enhanced-lead-processor.ts` - AI processing

#### 3. **Conversations Module**

**Primary Files (Direct Impact)**
- `/app/conversations/page.tsx` - Main conversations page
- `/app/components/chat/EnhancedChatInterface.tsx` - Chat UI
- `/app/components/messaging/MessageComposer.tsx` - Message composer
- `/app/api/messages/send/route.ts` - Message sending API

**Secondary Files (Potential Impact)**
- `/app/lib/services/twilio.ts` - Twilio service
- `/app/lib/whatsapp.ts` - WhatsApp integration
- `/app/lib/sms.ts` - SMS utilities

#### 4. **Call Bookings Module**

**Primary Files (Direct Impact)**
- `/app/booking/page.tsx` - Main booking page (has issues with tabs)
- `/app/booking-links/page.tsx` - Booking links management
- `/app/components/booking/BookingCalendar.tsx` - Calendar component
- `/app/components/booking/BookingLinksManager.tsx` - Links manager
- `/app/api/booking/classes/route.ts` - Class booking API

**Secondary Files (Potential Impact)**
- `/app/lib/services/booking.ts` - Booking service
- `/app/lib/availability-engine.ts` - Availability calculations
- `/app/lib/google-calendar.ts` - Google Calendar sync

#### 5. **Staff Management Module**

**Primary Files (Direct Impact)**
- `/app/staff-management/page.tsx` - Main staff management page
- `/app/components/staff/StaffList.tsx` - Staff directory
- `/app/components/staff/TimesheetTable.tsx` - Timesheet management
- `/app/api/staff/route.ts` - Staff CRUD API
- `/app/api/staff/timesheets/route.ts` - Timesheet API

**Secondary Files (Potential Impact)**
- `/app/lib/types/staff.ts` - Staff type definitions
- `/app/api/payroll/*` - Payroll integration

#### 6. **Marketing & Campaigns Module**

**Primary Files (Direct Impact)**
- `/app/campaigns/page.tsx` - Main campaigns page (extensive UI)
- `/app/components/campaigns/EmailComposer.tsx` - Email editor
- `/app/api/campaigns/send-test-email/route.ts` - Test sending

**Secondary Files (Potential Impact)**
- `/app/api/integrations/facebook/*` - Facebook integration
- `/app/lib/integrations/meta-ads-client.ts` - Meta ads client

#### 7. **Surveys & Feedback Module**

**Primary Files (Direct Impact)**
- `/app/surveys/page.tsx` - Main surveys page

**Secondary Files (Potential Impact)**
- Survey response APIs (not yet implemented)
- Survey analytics components (not yet implemented)

#### 8. **Website & Forms Module**

**Primary Files (Direct Impact)**
- `/app/forms/page.tsx` - Main forms page
- `/app/components/forms/DragDropFormBuilder.tsx` - Form builder
- `/app/api/forms/list/route.ts` - List forms API
- `/app/api/ai/generate-form/route.ts` - AI form generation

### ⚠️ Identified Risks

#### Critical

1. **Hard-coded Organization ID**
   - **Location**: `/app/leads/page.tsx:191`
   - **Risk**: Organization ID is hard-coded, breaking multi-tenancy
   - **Impact**: Data isolation breach, wrong organization data access

2. **Missing Error Boundaries**
   - **Location**: Most page components
   - **Risk**: Component crashes can break entire pages
   - **Impact**: Poor user experience, data loss

3. **Suspense Boundary Issues**
   - **Location**: `/app/billing/page.tsx`, booking pages
   - **Risk**: SSR/hydration mismatches
   - **Impact**: Page loading failures, SEO issues

#### Moderate

1. **Inconsistent State Management**
   - **Location**: Various components
   - **Risk**: State synchronization issues
   - **Impact**: Data inconsistency, UI bugs

2. **Missing Loading States**
   - **Location**: Several async operations
   - **Risk**: User confusion during operations
   - **Impact**: Poor UX, duplicate submissions

3. **Tab Navigation Issues**
   - **Location**: Booking, Campaigns pages
   - **Risk**: Navigation state loss
   - **Impact**: Confusing user experience

4. **API Error Handling**
   - **Location**: Multiple API routes
   - **Risk**: Unhandled errors, inconsistent error formats
   - **Impact**: Silent failures, debugging difficulty

5. **Component Prop Drilling**
   - **Location**: Deep component hierarchies
   - **Risk**: Difficult maintenance, prop management
   - **Impact**: Code complexity, refactoring challenges

### 🔍 Key Observations

1. **Architecture Patterns**
   - App Router with mixed server/client components
   - Organization-based multi-tenancy
   - Supabase for auth and database
   - Mixed use of fetch and Supabase client

2. **Common Issues**
   - Inconsistent error handling across modules
   - Missing or incomplete loading states
   - Hard-coded values that should be dynamic
   - Incomplete TypeScript typing

3. **UI/UX Patterns**
   - Tab-based navigation in most modules
   - Modal-heavy interactions
   - Table-based data displays
   - British localization (£, DD/MM/YYYY)

4. **Integration Points**
   - Twilio for SMS/WhatsApp/Voice
   - Stripe for payments
   - Google Calendar for scheduling
   - Meta/Facebook for marketing
   - OpenAI/Anthropic for AI features

5. **Security Concerns**
   - RLS policies need verification
   - Organization isolation in API routes
   - Token/credential management
   - Public API endpoint security

### 📊 Module Status Summary

| Module | Completeness | Main Issues | Priority |
|--------|-------------|-------------|----------|
| Billing | 70% | Suspense boundaries, incomplete revenue tracking | Medium |
| Leads | 85% | Hard-coded org ID, export functionality | High |
| Conversations | 75% | Message history, real-time updates | Medium |
| Bookings | 60% | Tab navigation, modal management | High |
| Staff | 80% | Timesheet sync, payroll integration | Medium |
| Campaigns | 65% | Mostly UI mockups, limited functionality | Low |
| Surveys | 40% | Mostly placeholder, needs implementation | Low |
| Forms | 70% | AI generation errors, form preview issues | Medium |

### 🔧 Recommended Fixes Priority

1. **Immediate** (Breaking Issues)
   - Fix hard-coded organization IDs
   - Add error boundaries to all pages
   - Fix Suspense/SSR issues

2. **High Priority** (User Impact)
   - Fix booking page tab navigation
   - Complete lead export/import
   - Fix message composer in conversations

3. **Medium Priority** (Enhancement)
   - Implement proper loading states
   - Standardize API error responses
   - Complete staff timesheet features

4. **Low Priority** (Future Development)
   - Complete survey module
   - Enhance campaign functionality
   - Add advanced form features
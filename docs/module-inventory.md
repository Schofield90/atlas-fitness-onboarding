# Atlas Fitness/Gymleadhub Module Inventory

## 📁 Module Structure & Files

### 1. **Automations/Builder Module**
**Status**: ⚠️ Node persistence issues reported

#### Core Files:
- `/app/automations/page.tsx` - Main automations list page
- `/app/automations/builder/page.tsx` - Workflow builder interface
- `/app/automations/builder/[id]/page.tsx` - Edit existing workflow
- `/app/automations/templates/page.tsx` - Workflow templates

#### Components (Multiple conflicting versions):
- `/app/components/automation/WorkflowBuilder.tsx` 
- `/app/components/automation/EnhancedWorkflowBuilder.tsx`
- `/app/components/automation/EnhancedWorkflowBuilderV2.tsx` 
- `/app/components/automation/SimpleWorkflowBuilder.tsx`
- `/app/components/automation/AdvancedWorkflowBuilder.tsx`
- `/app/components/automation/DynamicWorkflowBuilder.tsx`
- `/app/components/automation/ResponsiveWorkflowBuilder.tsx`

#### API Endpoints:
- `/api/automations/workflows/route.ts` - CRUD operations
- `/api/automations/test-email/route.ts` - Test email sending
- `/api/automations/test-internal-message/route.ts` - Test messages
- `/api/automations/scoring-triggers/route.ts` - Lead scoring triggers
- `/api/workflows/route.ts` - Workflow execution
- `/api/workflows/v2/route.ts` - Version 2 API
- `/api/workflows/engine/route.ts` - Execution engine

#### Services:
- `/app/lib/automation/execution-engine.ts` - Core execution logic
- `/app/lib/automation/advanced-node-system.ts` - Node definitions
- `/app/lib/automation/communication-actions.ts` - Message actions
- `/app/lib/workflow/action-handlers/*.ts` - Action implementations

---

### 2. **Dashboard Module**
**Status**: ✅ Working but performance issues

#### Core Files:
- `/app/dashboard/page.tsx` - Main dashboard
- `/app/dashboard/overview/page.tsx` - Overview page
- `/app/dashboard/reports/page.tsx` - Reports section

#### Components:
- `/app/components/dashboard/DashboardMetrics.tsx`
- `/app/components/dashboard/MetricCard.tsx`
- `/app/components/dashboard/ClassDetailModal.tsx`

#### API Endpoints:
- `/api/dashboard/metrics/route.ts` - Dashboard metrics
- `/api/dashboard/metrics-fixed/route.ts` - Fixed metrics endpoint
- `/api/dashboard/cached/route.ts` - Cached data
- `/api/dashboard/charts/route.ts` - Chart data
- `/api/dashboard/activity/route.ts` - Activity feed
- `/api/dashboard/birthdays/route.ts` - Birthday reminders

---

### 3. **Customers/Leads Module**
**Status**: ✅ Working with AI enhancements

#### Core Files:
- `/app/customers/page.tsx` - Customer list
- `/app/customers/[id]/page.tsx` - Customer detail
- `/app/customers/new/page.tsx` - New customer form
- `/app/leads/page.tsx` - Leads list
- `/app/leads/[id]/page.tsx` - Lead detail

#### Components:
- `/app/components/customers/CustomerProfileTabs.tsx`
- `/app/components/customers/AddMembershipModal.tsx`
- `/app/components/customers/LoginLinkButton.tsx`
- `/app/components/leads/LeadsTable.tsx`
- `/app/components/leads/LeadDetailsModal.tsx`
- `/app/components/leads/AIInsightsPanel.tsx`
- `/app/components/leads/LeadScoringBadge.tsx`

#### API Endpoints:
- `/api/customers/[id]/route.ts` - Customer CRUD
- `/api/customers/churn-prediction/route.ts` - AI churn prediction
- `/api/leads/route.ts` - Lead management
- `/api/leads/[id]/route.ts` - Individual lead
- `/api/leads/scoring/route.ts` - Lead scoring
- `/api/leads/cached/route.ts` - Cached leads

---

### 4. **Conversations Module**
**Status**: ⚠️ Missing "New Conversation" button

#### Core Files:
- `/app/conversations/page.tsx` - Main conversations page

#### Components:
- `/app/components/chat/EnhancedChatInterface.tsx` - Chat UI
- `/app/components/messaging/MessageComposer.tsx`
- `/app/components/messaging/MessageHistory.tsx`
- `/app/components/messaging/UnifiedTimeline.tsx`

#### API Endpoints:
- `/api/chat/conversation-summary/route.ts`
- `/api/chat/ai-suggestions/route.ts`
- `/api/chatbot/conversation/route.ts`
- `/api/messages/send/route.ts`
- `/api/messages/history/[conversationId]/route.ts`

---

### 5. **Calendar/Booking Module**
**Status**: 🔴 Public booking 404, navigation issues

#### Core Files:
- `/app/calendar/page.tsx` - Calendar view
- `/app/booking/page.tsx` - Booking management
- `/app/book/[slug]/page.tsx` - Public booking page (currently used)
- `/app/book/public/[organizationId]/page.tsx` - MISSING FILE (causes 404)

#### Components:
- `/app/components/booking/BookingWidget.tsx`
- `/app/components/booking/BookingCalendar.tsx`
- `/app/components/booking/SessionCalendar.tsx`
- `/app/components/booking/ClassBookingModal.tsx`
- `/app/components/calendar/Calendar.tsx`
- `/app/components/calendar/GoogleStyleCalendar.tsx`

#### API Endpoints:
- `/api/booking/book/route.ts` - Create booking
- `/api/booking/availability/route.ts` - Check availability
- `/api/booking/classes/route.ts` - Class management
- `/api/booking-by-slug/book/route.ts` - Slug-based booking
- `/api/booking-links/route.ts` - Booking link management
- `/api/public-api/booking-data/[organizationId]/route.ts` - Public data

---

### 6. **Opportunities Module**
**Status**: ✅ Working

#### Core Files:
- `/app/opportunities/page.tsx` - Opportunities list
- `/app/opportunities/OpportunitiesPage.tsx` - Main component

#### API Endpoints:
- `/api/opportunities/route.ts` - CRUD operations
- `/api/opportunities/[id]/route.ts` - Individual opportunity
- `/api/opportunities/pipelines/route.ts` - Pipeline management

---

### 7. **Staff Management Module**
**Status**: 🔴 API returning 500 errors

#### Core Files:
- `/app/staff-management/page.tsx` - Staff management
- `/app/staff/page.tsx` - Staff list

#### Components:
- `/app/components/staff/StaffList.tsx`
- `/app/components/staff/StaffCard.tsx`
- `/app/components/staff/StaffForm.tsx`
- `/app/components/staff/StaffProfile.tsx`
- `/app/components/staff/TimesheetTable.tsx`

#### API Endpoints:
- `/api/staff/route.ts` - Staff list (500 error - missing users table join)
- `/api/timesheets/route.ts` - Timesheet management
- `/api/payroll/dashboard/route.ts` - Payroll dashboard

---

### 8. **Marketing/Campaigns Module**
**Status**: ⚠️ View/Edit non-functional (using mock data)

#### Core Files:
- `/app/campaigns/page.tsx` - Campaign management (mock data only)
- `/app/marketing/page.tsx` - Marketing dashboard

#### Components:
- `/app/components/campaigns/EmailComposer.tsx`

#### API Endpoints:
- `/api/campaigns/send-test-email/route.ts` - Test email only

---

### 9. **Surveys Module**
**Status**: ⚠️ Actions not working (mock data only)

#### Core Files:
- `/app/surveys/page.tsx` - Survey management (mock data only)

#### API Endpoints:
- None found - fully mocked

---

### 10. **Forms Module**
**Status**: ⚠️ Builder not opening correctly

#### Core Files:
- `/app/forms/page.tsx` - Forms management
- `/app/lead-forms/page.tsx` - Lead forms

#### Components:
- `/app/components/forms/DragDropFormBuilder.tsx`

#### API Endpoints:
- `/api/forms/list/route.ts` - List forms
- `/api/forms/save/route.ts` - Save form
- `/api/forms/update/route.ts` - Update form
- `/api/forms/submit/route.ts` - Form submission
- `/api/ai/generate-form/route.ts` - AI form generation

---

## 🔧 Core Services & Utilities

### Authentication & Organization
- `/app/lib/api/auth-check.ts` - Auth validation
- `/app/lib/api/auth-check-org.ts` - Organization auth
- `/app/lib/organization-service.ts` - Organization management
- `/app/lib/supabase/server.ts` - Server-side Supabase client
- `/app/lib/supabase/client.ts` - Client-side Supabase client

### Communication Services
- `/app/lib/services/twilio.ts` - SMS/WhatsApp/Voice
- `/app/lib/services/email.ts` - Email service
- `/app/lib/services/unified-email.service.ts` - Unified email

### AI Services
- `/app/lib/ai/anthropic.ts` - Claude integration
- `/app/lib/ai/enhanced-lead-processor.ts` - Lead AI
- `/app/lib/ai/real-time-processor.ts` - Real-time AI

### Caching Layer
- `/app/lib/cache/redis-client.ts` - Redis connection
- `/app/lib/cache/cached-lead-service.ts` - Lead caching
- `/app/lib/cache/cached-booking-service.ts` - Booking caching
- `/app/lib/cache/cached-organization-service.ts` - Org caching

### Queue System
- `/app/lib/queue/queue-manager.ts` - Queue management
- `/app/lib/queue/workers.ts` - Worker processes
- `/app/lib/queue/processors/*.ts` - Job processors

### Integration Services
- `/app/lib/integrations/meta-ads-client.ts` - Facebook/Meta
- `/app/lib/google-calendar.ts` - Google Calendar
- `/app/lib/stripe.ts` - Stripe payments

---

## 🗄️ Database Tables (Key)
- `organizations` - Multi-tenant organizations
- `organization_members` - User-org relationships
- `users` - User profiles
- `leads` - Lead management
- `contacts` - Customer contacts
- `bookings` - Booking records
- `class_sessions` - Class schedule
- `automations` - Workflow definitions
- `campaigns` - Marketing campaigns (unused)
- `forms` - Form definitions
- `surveys` - Survey definitions (unused)
- `staff` - Staff records (deprecated?)
- `trainer_specializations` - Staff specializations

---

## 🌐 Public Endpoints
- `/api/public-api/create-lead` - Lead capture
- `/api/public-api/booking-data/[organizationId]` - Booking data
- `/book/[slug]` - Public booking page (working)
- `/book/public/[organizationId]` - Missing route (404)
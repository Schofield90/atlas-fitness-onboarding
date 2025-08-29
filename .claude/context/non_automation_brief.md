# Non-Automation Modules Context Brief

**Updated**: 2025-01-29T08:30:00Z
**Project**: Atlas Fitness Onboarding - Non-Automation Module Analysis

## Executive Summary

Atlas Fitness Onboarding is a comprehensive gym management SaaS platform built with Next.js 15.3.5. The system uses a modern stack with Supabase for backend services, implements React Query for data fetching, Zustand for client-side state management, and includes comprehensive component libraries for UI management.

## Stack Detection

### State Management
- **React Query v5.62.7**: Primary data fetching and caching [source: package.json:L120]
- **Zustand v5.0.2**: Client-side state management [source: package.json:L184]
- **SWR v2.2.5**: Alternative data fetching (legacy) [source: package.json:L176]

### UI Framework
- **Next.js 15.3.5**: React framework with app router [source: package.json:L149]
- **Tailwind CSS 3.4.16**: Styling framework [source: package.json:L237]
- **Radix UI**: Component primitives for dialogs, forms, etc. [source: package.json:L96-L110]

### Database & Backend
- **Supabase**: Backend-as-a-Service with PostgreSQL [source: package.json:L117-L119]
- **Row Level Security (RLS)**: Multi-tenant data isolation implemented

## Module Analysis

### 1. Billing Module (/billing)

**Route**: `/app/billing/page.tsx`
**Status**: ✅ Functional with comprehensive Stripe integration

**Components**:
- `SaasBillingDashboard` [source: app/components/saas/SaasBillingDashboard.tsx]
- `StripeConnect` [source: app/components/billing/StripeConnect.tsx]

**API Endpoints**:
- `/api/billing/stripe-connect/` - Stripe integration management
- `/api/connect/stripe/` - Stripe connection handling
- `/api/connect/gocardless/` - GoCardless payment processing

**State Management**: Direct Supabase client calls with useState hooks

**Features**:
- Subscription management with tabbed interface
- Revenue tracking and analytics placeholders
- Stripe Connect integration for payment processing
- Multi-currency support (British format utilities)

### 2. Calendar/Booking Links (/calendar, /booking-links)

**Route**: `/app/calendar/page.tsx`
**Status**: ✅ Fully functional with Google Calendar integration

**Components**:
- `Calendar` [source: app/components/calendar/Calendar.tsx]
- `GoogleStyleCalendar` [source: app/components/calendar/GoogleStyleCalendar.tsx]
- `BookingLinksManager` [source: app/components/booking/BookingLinksManager.tsx]
- `BookingModal` [source: app/components/calendar/BookingModal.tsx]

**API Endpoints**:
- `/api/calendar/events` - Local calendar events CRUD
- `/api/calendar/google-events` - Google Calendar synchronization
- `/api/booking-links/` - Booking link management
- `/api/calendar/sync/` - Bidirectional calendar sync

**State Management**: useState with real-time event fetching from multiple sources

**Features**:
- Dual calendar view (Google Style + Classic)
- Week/Month view toggle
- Google Calendar bidirectional sync
- Booking link generation and management
- Event management with modal interfaces

### 3. Contacts/Customers (/customers, /contacts)

**Route**: `/app/customers/page.tsx`
**Status**: ✅ Production-ready with comprehensive features

**Components**:
- `CustomerProfileTabs` [source: app/components/customers/CustomerProfileTabs.tsx]
- `AddMembershipModal` [source: app/components/customers/AddMembershipModal.tsx]
- `LoginLinkButton` [source: app/components/customers/LoginLinkButton.tsx]

**API Endpoints**:
- `/api/customers/` - Customer CRUD operations
- `/api/contacts/` - Contact management
- `/api/customers/send-login-link/` - Customer portal access

**Database Tables**: 
- `clients` - Main customer records
- `memberships` - Customer membership associations
- `emergency_contacts` - Emergency contact information
- `customer_medical_info` - Health data storage

**Features**:
- Advanced filtering (status, membership type, date ranges)
- CSV import/export functionality with preview
- Customer status tracking (active, inactive, slipping away)
- Comprehensive customer profiles with membership management
- Bulk operations and search

### 4. Conversations (/conversations)

**Route**: `/app/conversations/page.tsx`
**Status**: ✅ Enhanced chat interface with AI integration

**Components**:
- `EnhancedChatInterface` [source: app/components/chat/EnhancedChatInterface.tsx]
- `MessageComposer` [source: app/components/messaging/MessageComposer.tsx]
- `RealTimeChat` [source: app/components/messaging/RealTimeChat.tsx]
- `UnifiedTimeline` [source: app/components/messaging/UnifiedTimeline.tsx]

**API Endpoints**:
- `/api/chat/conversation/` - Chat conversation management
- `/api/messages/` - Message CRUD operations

**Database Tables**:
- `sms_logs` - SMS message history
- `whatsapp_logs` - WhatsApp message tracking
- `email_logs` - Email communication logs

**Features**:
- Unified messaging across SMS, WhatsApp, Email
- Enhanced vs Classic view toggle
- AI-powered conversation suggestions
- Real-time message aggregation
- Multi-channel communication history

### 5. Staff Management (/staff, /staff-management)

**Route**: `/app/staff/page.tsx`
**Status**: ✅ Full staff management with multi-location support

**Components**:
- `StaffCard` [source: app/components/staff/StaffCard.tsx]
- `StaffForm` [source: app/components/staff/StaffForm.tsx]
- `InviteStaffModal` [source: app/staff/InviteStaffModal.tsx]
- `StaffLocationModal` [source: app/staff/StaffLocationModal.tsx]
- `TimesheetTable` [source: app/components/staff/TimesheetTable.tsx]

**API Endpoints**:
- `/api/staff/` - Staff member CRUD
- `/api/organization/add-staff/` - Staff invitation system

**Database Tables**:
- `organization_staff` - Staff member records
- `staff_invitations` - Invitation tracking
- `timesheets` - Time tracking data

**Features**:
- Staff invitation system with email invites
- Location-based access control
- Communication preferences (SMS, WhatsApp, Email, Calls)
- Role-based permissions (Owner, Manager, Staff, Trainer)
- Tabbed interface (Team, Schedule, Payroll, Permissions)

### 6. Marketing & Campaigns (/campaigns, /email-marketing)

**Route**: `/app/campaigns/page.tsx`
**Status**: 🚧 UI implemented, limited backend functionality

**Components**:
- `CampaignAnalytics` [source: app/components/campaigns/CampaignAnalytics.tsx]
- `EmailComposer` [source: app/components/campaigns/EmailComposer.tsx]

**Feature Flags**: Controlled via feature flags system [source: app/lib/feature-flags.ts:L28-L33]
- `campaigns: true` - Show in navigation
- `campaignsCreate: false` - Disable creation
- `campaignsAnalytics: false` - Analytics not functional
- `campaignsActions: false` - View/Edit buttons disabled

### 7. Surveys & Feedback (/surveys)

**Route**: `/app/surveys/page.tsx`
**Status**: 🚧 UI mockup with feature flag controls

**Components**:
- `SurveyAnalytics` [source: app/components/surveys/SurveyAnalytics.tsx]
- `SurveyResponses` [source: app/components/surveys/SurveyResponses.tsx]

**Feature Flags**: [source: app/lib/feature-flags.ts:L35-L40]
- `surveys: true` - Navigation visible
- `surveysCreate: false` - Creation disabled
- `surveysResponses: false` - Mock responses only

### 8. Forms (/forms, /crm/forms)

**Route**: `/app/forms/page.tsx`
**Status**: ✅ Full AI-powered form builder

**Components**:
- `DragDropFormBuilder` [source: app/components/forms/DragDropFormBuilder.tsx]
- `FormAnalytics` [source: app/components/forms/FormAnalytics.tsx]

**API Endpoints**:
- `/api/forms/list` - Form inventory retrieval
- `/api/forms/save` - Form persistence
- `/api/ai/generate-form` - AI form generation

**Features**:
- AI-powered form generation from natural language
- Manual form builder with drag-drop interface
- Form categorization (Waivers, Contracts, Health, Policies)
- Lead capture form creation
- Form preview and editing capabilities

### 9. AI Intelligence (/ai-intelligence)

**Route**: `/app/ai-intelligence/page.tsx`
**Status**: ✅ Comprehensive AI analytics platform

**Components**:
- `AIDashboard` [source: app/components/ai/AIDashboard.tsx]
- `AIAssistant` [source: app/components/ai/AIAssistant.tsx]

**API Endpoints**:
- `/api/ai/insights` - AI analytics generation
- `/api/ai/chatbot/conversation` - AI assistant chat
- `/api/ai/lead-scoring/` - Lead scoring algorithms

**Features**:
- Lead scoring with conversion predictions
- Churn prediction and retention recommendations  
- Revenue forecasting with confidence metrics
- Customer insights and engagement scoring
- Operational intelligence (peak hours, popular classes)
- Interactive AI chat assistant

### 10. Analytics (/analytics, /analytics-dashboard)

**Routes**: 
- `/app/analytics/page.tsx` - Basic placeholder
- `/app/analytics-dashboard/page.tsx` - Enhanced version

**Status**: 🚧 Placeholder implementation

**API Endpoints**:
- `/api/analytics/dashboard/` - Analytics data aggregation
- `/api/analytics/track/` - Event tracking

### 11. Reporting (/reports, /dashboard/reports)

**Route**: `/app/reports/page.tsx`
**Status**: 🚧 UI mockup with coming soon notice

**Features Planned**:
- Revenue reports with financial performance tracking
- Attendance reports and participation rates
- Member growth and retention metrics
- Staff performance and schedule analysis
- Lead conversion and marketing effectiveness
- Custom report builder

### 12. SOPs (/sops)

**Route**: `/app/sops/page.tsx`
**Status**: ✅ AI-powered SOP management

**Components**:
- `SOPEditor` [source: app/components/sops/SOPEditor.tsx]
- `SOPViewer` [source: app/components/sops/SOPViewer.tsx]
- `SOPAnalysis` [source: app/components/sops/SOPAnalysis.tsx]

**API Endpoints**:
- `/api/sops/` - SOP CRUD operations

**Features**:
- AI-powered SOP creation and analysis
- Document management with categorization
- SOP compliance tracking

### 13. Payroll (/payroll)

**Route**: `/app/payroll/page.tsx`
**Status**: ✅ Xero integration with batch processing

**Components**:
- `PayrollDashboard` [source: app/components/payroll/PayrollDashboard.tsx]
- `PayrollBatch` [source: app/components/payroll/PayrollBatch.tsx]
- `XeroSync` [source: app/components/payroll/XeroSync.tsx]

**API Endpoints**:
- `/api/payroll/process/` - Payroll batch processing
- `/api/payroll/sync-xero/` - Xero synchronization

## Environment Variables & Feature Flags

### Key Environment Variables
- `NEXT_PUBLIC_FEATURE_CAMPAIGNS` - Enable campaign functionality
- `NEXT_PUBLIC_FEATURE_SURVEYS` - Enable survey features
- `NODE_ENV` - Development/production mode controls

### Feature Flag System
[source: app/lib/feature-flags.ts]
- Centralized feature toggle management
- Environment-based overrides
- Development mode defaults
- Component-level feature gating

## Test Coverage

### Unit Tests Present
- `/tests/unit/leads.test.ts` - Multi-tenancy and export functionality
- `/tests/unit/booking.test.ts` - Navigation and calendar integration
- `/tests/unit/staff.test.ts` - Staff management operations
- `/tests/unit/billing.test.ts` - Payment processing
- `/tests/unit/conversations.test.ts` - Messaging functionality

### Integration Tests
- `/tests/integration/booking-workflow.test.ts` - End-to-end booking flow
- `/tests/e2e/critical-fixes.spec.ts` - Playwright end-to-end tests

### Testing Stack
- **Jest 29.7.0**: Unit testing framework
- **Playwright 1.55.0**: End-to-end testing
- **Testing Library**: React component testing

## Known Issues & Limitations

### 🚨 Critical Issues
1. **Hard-coded Organization IDs**: Some components may still reference static organization IDs instead of dynamic user context
2. **RLS Policy Gaps**: Row Level Security policies may not be consistently applied across all tables
3. **Cache Invalidation**: React Query cache may not invalidate properly on organization switching

### ⚠️ Feature Limitations  
1. **Campaigns Module**: UI-only implementation without backend processing
2. **Surveys Module**: Mock data with no actual survey creation/response handling
3. **Analytics Dashboard**: Placeholder implementation with minimal functionality
4. **Reports Module**: Coming soon UI with no report generation

### 🔧 Technical Debt
1. **Mixed State Management**: Some components use direct Supabase calls while others use React Query
2. **Component Organization**: Large components could benefit from further decomposition
3. **Error Boundary Coverage**: Not all components have comprehensive error handling

## Security Implementation

### Multi-Tenancy
- Row Level Security (RLS) policies implemented in Supabase
- Dynamic organization ID resolution from user context
- Data isolation between organizations enforced at database level

### Authentication
- Supabase Auth with JWT tokens
- Magic link authentication supported
- Staff invitation system with secure token validation

## Performance Considerations

### Caching Strategy
- React Query for server state caching
- Redis integration for application-level caching [source: app/lib/cache/]
- Supabase real-time subscriptions for live updates

### Optimization Features
- Next.js Image optimization
- Component-level code splitting
- Database query optimization with proper indexing
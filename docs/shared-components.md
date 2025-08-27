# Atlas Fitness CRM - Shared Components Inventory

## Component Architecture Overview

### Component Organization
- **Location**: `/app/components/`
- **Pattern**: Feature-based organization with shared UI components
- **Stack**: React with TypeScript, Tailwind CSS
- **State**: Local state + props, some Supabase real-time subscriptions

## Core Shared Components

### 1. Layout Components

#### DashboardLayout
- **Path**: `/app/components/DashboardLayout.tsx`
- **Used By**: All authenticated pages
- **Dependencies**: OrganizationSwitcher, navigation menu
- **Issues**: Inconsistent prop passing, missing error handling

#### ErrorBoundary
- **Path**: `/app/components/ErrorBoundary.tsx`
- **Used By**: Should be used by all pages (many missing)
- **Issues**: Not consistently implemented

### 2. UI Components (`/app/components/ui/`)

#### Button
- **Path**: `/app/components/ui/Button.tsx`
- **Variants**: default, ghost, danger, success
- **Issues**: Inconsistent usage across modules

#### Card
- **Path**: `/app/components/ui/Card.tsx`
- **Components**: Card, CardHeader, CardContent, CardTitle
- **Used By**: Dashboard metrics, settings pages

#### Toast
- **Path**: `/app/components/ui/Toast.tsx`
- **Features**: Success, error, warning, info variants
- **Issues**: Not integrated with global error handling

#### Dialog/Modal Components
- **Path**: `/app/components/ui/dialog.tsx`
- **Used By**: All modal-based interactions
- **Issues**: Z-index conflicts, backdrop issues

#### Form Elements
- Input: `/app/components/ui/input.tsx`
- Textarea: `/app/components/ui/textarea.tsx`
- Label: `/app/components/ui/label.tsx`
- Switch: `/app/components/ui/switch.tsx`
- Radio Group: `/app/components/ui/radio-group.tsx`

### 3. Authentication Components

#### OrganizationSwitcher
- **Path**: `/app/components/OrganizationSwitcher.tsx`
- **Features**: Switch between multiple organizations
- **Issues**: Doesn't refresh data properly after switch

#### AuthWrapper
- **Path**: `/app/components/auth/AuthWrapper.tsx`
- **Purpose**: Protect routes requiring authentication
- **Issues**: Inconsistent redirect behavior

#### RequireOrganization
- **Path**: `/app/components/auth/RequireOrganization.tsx`
- **Purpose**: Ensure user has active organization
- **Issues**: Hard-coded fallback values

### 4. Data Display Components

#### Tables
- **LeadsTable**: `/app/components/leads/LeadsTable.tsx`
- **TimesheetTable**: `/app/components/staff/TimesheetTable.tsx`
- **Common Issues**: Pagination inconsistency, sorting bugs

#### Modals
- **AddLeadModal**: `/app/components/leads/AddLeadModal.tsx`
- **BulkImportModal**: `/app/components/leads/BulkImportModal.tsx`
- **AddClassModal**: `/app/components/booking/AddClassModal.tsx`
- **Common Issues**: Form validation, close behavior

#### Charts/Metrics
- **DashboardMetrics**: `/app/components/dashboard/DashboardMetrics.tsx`
- **MetricCard**: `/app/components/dashboard/MetricCard.tsx`
- **Issues**: Real-time update missing

### 5. Feature-Specific Components

#### Messaging Components
- **MessageComposer**: `/app/components/messaging/MessageComposer.tsx`
  - Used for SMS, WhatsApp, Email composition
  - Issues: Template selection broken
  
- **MessageHistory**: `/app/components/messaging/MessageHistory.tsx`
  - Displays conversation history
  - Issues: Pagination, real-time updates

- **EnhancedChatInterface**: `/app/components/chat/EnhancedChatInterface.tsx`
  - Unified messaging interface
  - Issues: Performance with large conversations

#### Booking Components
- **BookingCalendar**: `/app/components/booking/BookingCalendar.tsx`
  - Calendar grid for class selection
  - Issues: Mobile responsiveness
  
- **BookingWidget**: `/app/components/booking/BookingWidget.tsx`
  - Embeddable booking widget
  - Issues: Public authentication

- **SessionDetailModal**: `/app/components/booking/SessionDetailModal.tsx`
  - Class/session details popup
  - Issues: Data refresh

#### Staff Components
- **StaffList**: `/app/components/staff/StaffList.tsx`
  - Staff directory display
  
- **StaffForm**: `/app/components/staff/StaffForm.tsx`
  - Add/edit staff members
  
- **ClockInOut**: `/app/components/staff/ClockInOut.tsx`
  - Time tracking widget

#### Campaign Components
- **EmailComposer**: `/app/components/campaigns/EmailComposer.tsx`
  - Rich text email editor
  - Issues: Limited functionality, no preview

### 6. Integration Components

#### Payment Components
- **StripeConnect**: `/app/components/billing/StripeConnect.tsx`
  - Stripe onboarding and management
  
- **MembershipPayment**: `/app/components/payments/MembershipPayment.tsx`
  - Payment processing for memberships

#### Social Media Components
- **MetaAdsConnection**: `/app/components/integrations/MetaAdsConnection.tsx`
  - Facebook/Instagram integration
  
- **DiagnosticPanel**: `/app/components/facebook/DiagnosticPanel.tsx`
  - Facebook connection debugging

### 7. AI Components

#### AI Assistants
- **AIAssistant**: `/app/components/ai/AIAssistant.tsx`
- **EmbeddedAssistant**: `/app/components/ai/EmbeddedAssistant.tsx`
- **AIDashboard**: `/app/components/ai/AIDashboard.tsx`

#### Lead Intelligence
- **LeadScoringBadge**: `/app/components/leads/LeadScoringBadge.tsx`
- **AIInsightsPanel**: `/app/components/leads/AIInsightsPanel.tsx`
- **AIRecommendationsPanel**: `/app/components/leads/AIRecommendationsPanel.tsx`

## Component Dependencies Map

### High-Level Dependencies
```
DashboardLayout
├── OrganizationSwitcher
├── Navigation Menu
├── Toast Provider
└── Error Boundary

Page Components
├── DashboardLayout
├── Feature Components
│   ├── UI Components
│   ├── Data Components
│   └── Integration Components
└── API Services
```

### Cross-Component Issues

#### 1. State Management
- **Problem**: Props drilling through multiple levels
- **Affected**: Most deeply nested components
- **Solution Needed**: Context API or state management library

#### 2. Error Handling
- **Problem**: Inconsistent error boundaries
- **Affected**: All page components
- **Solution Needed**: Global error boundary implementation

#### 3. Loading States
- **Problem**: Missing or inconsistent loading indicators
- **Affected**: Async data components
- **Solution Needed**: Standardized loading component

#### 4. Type Safety
- **Problem**: Incomplete TypeScript interfaces
- **Affected**: API response handling
- **Solution Needed**: Generated types from backend

#### 5. Responsive Design
- **Problem**: Mobile layout issues
- **Affected**: Tables, modals, complex forms
- **Solution Needed**: Mobile-first redesign

## Reusability Analysis

### Highly Reusable (Used 5+ places)
- Button
- Card
- Input/Form elements
- Toast notifications
- Modal/Dialog

### Moderately Reusable (Used 3-4 places)
- Data tables
- Loading spinners
- Error messages
- Date pickers
- Metric cards

### Feature-Specific (Used 1-2 places)
- Booking calendar
- Message composer
- Staff timesheet
- Campaign editor
- AI panels

## Component Quality Metrics

### Well-Implemented ✅
- Basic UI components (Button, Card, Input)
- Authentication flow components
- Dashboard metrics display

### Needs Improvement ⚠️
- Modal management (z-index, backdrop)
- Table components (pagination, sorting)
- Form validation
- Error boundaries

### Critical Issues 🔴
- Organization switcher (data refresh)
- Message composer (template selection)
- Booking calendar (mobile view)
- Hard-coded organization IDs

## Recommended Component Improvements

### 1. Create Missing Components
- Global error boundary wrapper
- Standardized loading skeleton
- Pagination component
- Data table wrapper with sorting/filtering
- File upload component
- Date/time picker

### 2. Refactor Existing Components
- Extract common modal logic
- Standardize form validation
- Implement proper TypeScript generics
- Add proper accessibility attributes
- Improve mobile responsiveness

### 3. Documentation Needs
- Component API documentation
- Usage examples
- Props interface documentation
- Accessibility guidelines
- Testing patterns

### 4. Testing Requirements
- Unit tests for utility functions
- Component rendering tests
- Integration tests for complex components
- Accessibility tests
- Visual regression tests

## Component Migration Path

### Phase 1: Foundation (Immediate)
1. Implement global error boundary
2. Fix organization switcher
3. Standardize loading states
4. Fix TypeScript interfaces

### Phase 2: Core Components (High Priority)
1. Refactor table components
2. Fix modal z-index issues
3. Improve form validation
4. Add missing UI components

### Phase 3: Feature Components (Medium Priority)
1. Enhance message composer
2. Improve booking calendar
3. Complete campaign editor
4. Add missing integrations

### Phase 4: Polish (Low Priority)
1. Add animations/transitions
2. Improve accessibility
3. Enhance mobile experience
4. Add component documentation
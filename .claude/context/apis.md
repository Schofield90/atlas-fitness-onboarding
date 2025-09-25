# API Endpoints Documentation

**Updated**: 2025-01-29T08:35:00Z
**Project**: Atlas Fitness Onboarding - API Endpoint Analysis

## Overview

This document catalogs all API endpoints available in the Atlas Fitness Onboarding platform, organized by functional module. Each endpoint includes implementation status, authentication requirements, and usage notes.

## Authentication & Security

### Authentication Methods

- **Staff Authentication**: Supabase JWT Tokens for organization members
- **Client Authentication**: GoTeamUp-style invitation tokens + password login
- **Row Level Security**: Database-level multi-tenancy enforcement
- **Organization Scoping**: Dynamic organization ID resolution from user context

### Common Headers

```typescript
{
  "Authorization": "Bearer <supabase_jwt>",
  "Content-Type": "application/json"
}
```

## Client Authentication Module APIs

### ✅ Implemented Endpoints

**`POST /api/auth/claim`** - Claim Client Invitation

- **Purpose**: Claim unique invitation link and set password
- **Auth**: Invitation token (public endpoint with token validation)
- **Request Body**:
  ```typescript
  {
    token: string;
    password: string;
    confirmPassword: string;
    firstName?: string;
    lastName?: string;
  }
  ```
- **Response**: Client session token and profile data
- **File**: [app/api/auth/claim/route.ts]

**`POST /api/auth/simple-login`** - Client Password Login

- **Purpose**: Authenticate client with email and password
- **Auth**: None (public endpoint)
- **Request Body**:
  ```typescript
  {
    email: string;
    password: string;
    organizationId: string;
  }
  ```
- **Response**: Client session token and profile data
- **File**: [app/api/auth/simple-login/route.ts]

**`POST /api/client-invitations`** - Create Client Invitation

- **Purpose**: Generate unique invitation link for new client
- **Auth**: Required (Staff level)
- **Request Body**:
  ```typescript
  {
    email: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    customMessage?: string;
  }
  ```
- **Response**: Invitation record with unique token
- **File**: [app/api/client-invitations/route.ts]

**`GET /api/client-invitations/[token]/validate`** - Validate Invitation Token

- **Purpose**: Check if invitation token is valid and unclaimed
- **Auth**: None (public endpoint with rate limiting)
- **Response**: Invitation details without sensitive data
- **File**: [app/api/client-invitations/[token]/validate/route.ts]

### 🚧 Removed/Deprecated Endpoints

**`POST /api/login-otp`** - ❌ REMOVED

- **Reason**: Replaced by GoTeamUp-style authentication system
- **Migration**: Use `/api/auth/claim` for first-time setup, `/api/auth/simple-login` for subsequent logins

## Billing Module APIs

### ✅ Implemented Endpoints

**`POST /api/connect/stripe`** - Stripe Connect Integration

- **Purpose**: Initialize Stripe Connect account
- **Auth**: Required (Organization member)
- **File**: [app/api/connect/stripe/route.ts]

**`GET /api/connect/stripe/refresh`** - Refresh Stripe Connection

- **Purpose**: Refresh expired Stripe tokens
- **Auth**: Required (Organization owner)
- **File**: [app/api/connect/stripe/refresh/route.ts]

**`POST /api/connect/gocardless`** - GoCardless Integration

- **Purpose**: Set up GoCardless payment processing
- **Auth**: Required (Organization owner)
- **File**: [app/api/connect/gocardless/route.ts]

### 🚧 Missing/Needed Endpoints

- `GET /api/billing/revenue-reports` - Revenue analytics
- `GET /api/billing/transactions` - Transaction history
- `POST /api/billing/process-payment` - Direct payment processing
- `GET /api/billing/subscription-metrics` - SaaS billing analytics

## Calendar/Booking Module APIs

### ✅ Implemented Endpoints

**`GET /api/calendar/events`** - Local Calendar Events

- **Purpose**: Retrieve organization's calendar events
- **Auth**: Required (Organization member)
- **Params**: `start`, `end` (ISO 8601 dates)
- **File**: [app/api/calendar/events/route.ts]

**`POST /api/calendar/events`** - Create Calendar Event

- **Purpose**: Create new calendar event
- **Auth**: Required (Staff level)
- **File**: [app/api/calendar/events/route.ts]

**`PATCH /api/calendar/events`** - Update Calendar Event

- **Purpose**: Modify existing calendar event
- **Auth**: Required (Event creator or admin)
- **File**: [app/api/calendar/events/route.ts]

**`DELETE /api/calendar/events`** - Delete Calendar Event

- **Purpose**: Remove calendar event
- **Auth**: Required (Event creator or admin)
- **Params**: `id` (event identifier)
- **File**: [app/api/calendar/events/route.ts]

**`GET /api/calendar/google-events`** - Google Calendar Sync

- **Purpose**: Fetch events from synced Google Calendar
- **Auth**: Required + Google OAuth token
- **Params**: `start`, `end` (ISO 8601 dates)
- **File**: [app/api/calendar/google-events/route.ts]

**`POST /api/calendar/sync`** - Bidirectional Calendar Sync

- **Purpose**: Synchronize local events with Google Calendar
- **Auth**: Required + Google OAuth
- **File**: [app/api/calendar/sync/route.ts]

**`GET /api/booking-links`** - List Booking Links

- **Purpose**: Retrieve organization's booking links
- **Auth**: Required (Organization member)
- **File**: [app/api/booking-links/route.ts]

**`POST /api/booking-links`** - Create Booking Link

- **Purpose**: Generate new booking link
- **Auth**: Required (Staff level)
- **File**: [app/api/booking-links/route.ts]

**`GET /api/appointment-types`** - Available Appointment Types

- **Purpose**: List configured appointment/class types
- **Auth**: Required (Organization member)
- **File**: [app/api/appointment-types/route.ts]

### 🚧 Missing/Needed Endpoints

- `GET /api/calendar/availability` - Check staff/resource availability
- `POST /api/calendar/recurring-events` - Bulk create recurring events
- `GET /api/calendar/conflicts` - Detect scheduling conflicts

## Customer/Contact Module APIs

### ✅ Implemented Endpoints

**`GET /api/customers`** - List Customers

- **Purpose**: Retrieve organization's customer list
- **Auth**: Required (Organization member)
- **Query Params**: Filtering, pagination, search
- **File**: [app/api/customers/route.ts]

**`POST /api/customers`** - Create Customer

- **Purpose**: Add new customer record
- **Auth**: Required (Staff level)
- **File**: [app/api/customers/route.ts]

**`GET /api/customers/[id]`** - Customer Details

- **Purpose**: Retrieve specific customer information
- **Auth**: Required (Organization member)
- **File**: [app/api/customers/[id]/route.ts]

**`PUT /api/customers/[id]`** - Update Customer

- **Purpose**: Modify customer information
- **Auth**: Required (Staff level)
- **File**: [app/api/customers/[id]/route.ts]

**`POST /api/customers/send-login-link`** - Customer Portal Access

- **Purpose**: Send magic link for customer portal access
- **Auth**: Required (Staff level)
- **File**: [app/api/customers/send-login-link/route.ts]

**`GET /api/contacts/tags`** - Customer Tags

- **Purpose**: Retrieve available customer tags
- **Auth**: Required (Organization member)
- **File**: [app/api/contacts/tags/route.ts]

**`GET /api/contacts/birthdays`** - Upcoming Birthdays

- **Purpose**: Get customers with upcoming birthdays
- **Auth**: Required (Organization member)
- **File**: [app/api/contacts/birthdays/route.ts]

### 🚧 Missing/Needed Endpoints

- `POST /api/customers/bulk-import` - CSV customer import
- `GET /api/customers/export` - Customer data export
- `POST /api/customers/merge` - Duplicate customer merge
- `GET /api/customers/analytics` - Customer insights and metrics

## Conversations/Messaging Module APIs

### ✅ Implemented Endpoints

**`GET /api/messages/history`** - Message History

- **Purpose**: Retrieve conversation history for customer
- **Auth**: Required (Organization member)
- **Params**: `customer_id`, `channel` (sms, whatsapp, email)
- **File**: [app/api/messages/history/route.ts]

**`POST /api/messages/send`** - Send Message

- **Purpose**: Send message via specified channel
- **Auth**: Required (Staff level)
- **Channels**: SMS, WhatsApp, Email
- **File**: [app/api/messages/send/route.ts]

**`GET /api/chat/conversation`** - Chat Conversations

- **Purpose**: List active conversations
- **Auth**: Required (Organization member)
- **File**: [app/api/chat/conversation/route.ts]

### 🚧 Missing/Needed Endpoints

- `GET /api/messages/unread` - Unread message count
- `POST /api/messages/mark-read` - Mark conversation as read
- `GET /api/conversations/search` - Search conversation history
- `POST /api/conversations/archive` - Archive conversations

## Staff Management Module APIs

### ✅ Implemented Endpoints

**`GET /api/staff`** - List Staff Members

- **Purpose**: Retrieve organization staff list
- **Auth**: Required (Organization member)
- **File**: [app/api/staff/route.ts]

**`POST /api/organization/add-staff`** - Add Staff Member

- **Purpose**: Invite new staff member to organization
- **Auth**: Required (Admin level)
- **File**: [app/api/organization/add-staff/route.ts]

**`GET /api/check-staff-setup`** - Staff Configuration Check

- **Purpose**: Validate staff setup for organization
- **Auth**: Required (Organization member)
- **File**: [app/api/check-staff-setup/route.ts]

**`GET /api/timesheets`** - Staff Timesheets

- **Purpose**: Retrieve staff time tracking data
- **Auth**: Required (Admin level)
- **File**: [app/api/timesheets/route.ts]

### 🚧 Missing/Needed Endpoints

- `PUT /api/staff/[id]/permissions` - Update staff permissions
- `POST /api/staff/[id]/schedule` - Set staff schedule
- `GET /api/staff/availability` - Check staff availability
- `POST /api/staff/invite/resend` - Resend staff invitation

## Forms Module APIs

### ✅ Implemented Endpoints

**`GET /api/forms/list`** - List Organization Forms

- **Purpose**: Retrieve all forms created by organization
- **Auth**: Required (Organization member)
- **File**: [app/api/forms/list/route.ts]

**`POST /api/forms/save`** - Save Form

- **Purpose**: Create new form definition
- **Auth**: Required (Staff level)
- **File**: [app/api/forms/save/route.ts]

**`PUT /api/forms/update`** - Update Form

- **Purpose**: Modify existing form
- **Auth**: Required (Form creator or admin)
- **File**: [app/api/forms/update/route.ts]

**`POST /api/ai/generate-form`** - AI Form Generation

- **Purpose**: Generate form schema from natural language description
- **Auth**: Required (Staff level)
- **File**: [app/api/ai/generate-form/route.ts]

**`POST /api/forms/submit`** - Form Submission

- **Purpose**: Submit completed form data
- **Auth**: Public (with rate limiting)
- **File**: [app/api/forms/submit/route.ts]

### 🚧 Missing/Needed Endpoints

- `GET /api/forms/[id]/responses` - Form response data
- `GET /api/forms/analytics` - Form completion metrics
- `POST /api/forms/duplicate` - Duplicate form template

## AI Intelligence Module APIs

### ✅ Implemented Endpoints

**`GET /api/ai/insights`** - AI Analytics Insights

- **Purpose**: Generate AI-powered business insights
- **Auth**: Required (Admin level)
- **Params**: `organization_id`
- **File**: [app/api/ai/insights/route.ts]

**`POST /api/ai/insights`** - Refresh AI Insights

- **Purpose**: Trigger AI analysis refresh
- **Auth**: Required (Admin level)
- **File**: [app/api/ai/insights/route.ts]

**`POST /api/ai/chatbot/conversation`** - AI Assistant Chat

- **Purpose**: Interact with AI business assistant
- **Auth**: Required (Organization member)
- **File**: [app/api/ai/chatbot/conversation/route.ts]

**`GET /api/ai/lead-scoring`** - Lead Scoring Analysis

- **Purpose**: AI-powered lead scoring and recommendations
- **Auth**: Required (Staff level)
- **File**: [app/api/ai/lead-scoring/route.ts]

**`POST /api/ai/process`** - AI Data Processing

- **Purpose**: Process customer data for insights
- **Auth**: Required (Admin level)
- **File**: [app/api/ai/process/route.ts]

### 🚧 Missing/Needed Endpoints

- `GET /api/ai/predictions/churn` - Customer churn predictions
- `GET /api/ai/recommendations/retention` - Retention recommendations
- `POST /api/ai/training/feedback` - AI model feedback

## Analytics Module APIs

### ✅ Implemented Endpoints

**`GET /api/analytics/dashboard`** - Dashboard Analytics

- **Purpose**: Retrieve dashboard metrics and KPIs
- **Auth**: Required (Organization member)
- **File**: [app/api/analytics/dashboard/route.ts]

**`POST /api/analytics/track`** - Event Tracking

- **Purpose**: Track user actions and events
- **Auth**: Required (Organization member)
- **File**: [app/api/analytics/track/route.ts]

### 🚧 Missing/Needed Endpoints

- `GET /api/analytics/revenue` - Revenue analytics
- `GET /api/analytics/attendance` - Class attendance metrics
- `GET /api/analytics/member-growth` - Member acquisition analytics
- `GET /api/analytics/custom-reports` - Custom report generation

## SOPs Module APIs

### ✅ Implemented Endpoints

**`GET /api/sops`** - List SOPs

- **Purpose**: Retrieve organization's standard operating procedures
- **Auth**: Required (Organization member)
- **File**: [app/api/sops/route.ts]

**`POST /api/sops`** - Create SOP

- **Purpose**: Create new SOP document
- **Auth**: Required (Admin level)
- **File**: [app/api/sops/route.ts]

### 🚧 Missing/Needed Endpoints

- `PUT /api/sops/[id]` - Update SOP
- `DELETE /api/sops/[id]` - Delete SOP
- `GET /api/sops/[id]/compliance` - SOP compliance tracking

## Payroll Module APIs

### ✅ Implemented Endpoints

**`GET /api/payroll/dashboard`** - Payroll Dashboard

- **Purpose**: Retrieve payroll overview and metrics
- **Auth**: Required (Admin level)
- **File**: [app/api/payroll/dashboard/route.ts]

**`POST /api/payroll/process`** - Process Payroll

- **Purpose**: Process payroll batch for staff
- **Auth**: Required (Owner level)
- **File**: [app/api/payroll/process/route.ts]

**`POST /api/payroll/sync-xero`** - Xero Integration

- **Purpose**: Synchronize payroll data with Xero
- **Auth**: Required (Owner level)
- **File**: [app/api/payroll/sync-xero/route.ts]

**`GET /api/payroll/batches`** - Payroll Batches

- **Purpose**: List processed payroll batches
- **Auth**: Required (Admin level)
- **File**: [app/api/payroll/batches/route.ts]

### 🚧 Missing/Needed Endpoints

- `GET /api/payroll/reports` - Payroll reports
- `POST /api/payroll/adjustments` - Manual payroll adjustments
- `GET /api/payroll/tax-reports` - Tax reporting data

## System & Utility APIs

### ✅ Implemented Endpoints

**`GET /api/health`** - System Health Check

- **Purpose**: API and system status verification
- **Auth**: None (public)
- **File**: [app/api/health/route.ts]

**`GET /api/organization/current`** - Current Organization

- **Purpose**: Get current user's organization context
- **Auth**: Required
- **File**: [app/api/organization/current/route.ts]

**`GET /api/organization/get-info`** - Organization Information

- **Purpose**: Retrieve organization details
- **Auth**: Required (Organization member)
- **File**: [app/api/organization/get-info/route.ts]

**`GET /api/settings`** - Organization Settings

- **Purpose**: Retrieve organization configuration
- **Auth**: Required (Organization member)
- **File**: [app/api/settings/route.ts]

**`PUT /api/settings`** - Update Settings

- **Purpose**: Modify organization settings
- **Auth**: Required (Admin level)
- **File**: [app/api/settings/route.ts]

### 🚧 Missing/Needed Endpoints

- `GET /api/system/metrics` - System performance metrics
- `POST /api/system/backup` - Data backup operations
- `GET /api/audit-logs` - Audit trail and logs

## Module API Coverage Summary

| Module                | Implemented APIs | Missing Critical APIs | Coverage % |
| --------------------- | ---------------- | --------------------- | ---------- |
| Client Authentication | 4                | 1                     | 80%        |
| Billing               | 3                | 4                     | 43%        |
| Calendar/Booking      | 8                | 3                     | 73%        |
| Customers/Contacts    | 7                | 4                     | 64%        |
| Conversations         | 3                | 4                     | 43%        |
| Staff Management      | 4                | 4                     | 50%        |
| Forms                 | 5                | 3                     | 63%        |
| AI Intelligence       | 5                | 3                     | 63%        |
| Analytics             | 2                | 4                     | 33%        |
| SOPs                  | 2                | 3                     | 40%        |
| Payroll               | 4                | 3                     | 57%        |
| **Overall**           | **47**           | **36**                | **57%**    |

## Security Considerations

### Authentication Patterns

- All endpoints validate Supabase JWT tokens
- Organization scoping enforced through RLS policies
- Role-based access control implemented at endpoint level

### Rate Limiting

- Public endpoints (forms submission) include rate limiting
- Staff-level endpoints have higher rate limits
- Admin operations have strict rate limiting

### Data Validation

- All POST/PUT endpoints include input validation
- File upload endpoints include MIME type validation
- SQL injection prevention through parameterized queries

## Performance Optimizations

### Caching Strategy

- GET endpoints implement Redis caching where appropriate
- Cache invalidation on data mutations
- Organization-scoped cache keys

### Database Optimization

- Proper indexing on frequently queried fields
- Query optimization for list endpoints
- Connection pooling for high-traffic endpoints

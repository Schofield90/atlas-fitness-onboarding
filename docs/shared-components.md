# Shared Components & Services Inventory

## 🎨 UI Components (Shared Across Modules)

### Layout Components
- **DashboardLayout** (`/app/components/DashboardLayout.tsx`)
  - Used by: All authenticated pages
  - Dependencies: Organization context, user auth
  - Risk: Changes affect entire app layout

### Error Boundaries
- **ErrorBoundary** (`/app/components/ErrorBoundary.tsx`)
- **GlobalErrorBoundary** (`/app/components/errors/GlobalErrorBoundary.tsx`)
- **AsyncErrorBoundary** (`/app/components/errors/AsyncErrorBoundary.tsx`)
  - Used by: All modules for error handling
  - Risk: Improper error handling can crash entire sections

### Auth Components
- **AuthWrapper** (`/app/components/auth/AuthWrapper.tsx`)
- **RequireOrganization** (`/app/components/auth/RequireOrganization.tsx`)
  - Used by: All authenticated routes
  - Risk: Auth failures block all access

### Organization Components
- **OrganizationSwitcher** (`/app/components/OrganizationSwitcher.tsx`)
- **LocationSwitcher** (`/app/components/LocationSwitcher.tsx`)
  - Used by: Dashboard, settings, all multi-org features
  - Risk: Multi-tenant data leakage if broken

---

## 🔧 Core Services (Used System-Wide)

### Supabase Clients
- **Server Client** (`/app/lib/supabase/server.ts`)
  - Used by: All server-side API routes
  - Pattern: `createClient()` for authenticated requests
  - Risk: Incorrect RLS policies expose data

- **Client-side Client** (`/app/lib/supabase/client.ts`)
  - Used by: All React components
  - Pattern: `createClient()` for browser requests
  - Risk: Client-side auth token exposure

### Authentication Services
- **Auth Check** (`/app/lib/api/auth-check.ts`)
  - Used by: API routes without org context
  - Returns: User object or error

- **Auth Check Org** (`/app/lib/api/auth-check-org.ts`)
  - Used by: Most API routes
  - Returns: User + organizationId
  - Critical for multi-tenancy

### Organization Service
- **Organization Service** (`/app/lib/organization-service.ts`)
  - Used by: All org-related operations
  - Manages: Org creation, member management, permissions
  - Risk: Permission bypass if compromised

---

## 🗂️ Data Services

### Caching Layer (Redis/Upstash)
- **Redis Client** (`/app/lib/cache/redis-client.ts`)
  - Used by: All cached services
  - Pattern: Key prefix with org ID for isolation
  - Risk: Cache poisoning, stale data

- **Cached Services**:
  - `cached-lead-service.ts` - Lead data caching
  - `cached-booking-service.ts` - Booking data caching
  - `cached-organization-service.ts` - Org data caching
  - `cached-analytics-service.ts` - Analytics caching

### Queue System (BullMQ)
- **Queue Manager** (`/app/lib/queue/queue-manager.ts`)
  - Used by: Automations, email campaigns, heavy processing
  - Requires: Redis running
  - Risk: Queue backup if Redis down

- **Workers** (`/app/lib/queue/workers.ts`)
  - Process: Workflow execution, email sending, AI processing
  - Risk: Job loss if worker crashes

---

## 📡 Communication Services

### Twilio Service
- **Main Service** (`/app/lib/services/twilio.ts`)
  - Used by: SMS, WhatsApp, Voice features
  - Functions: `sendSMS()`, `sendWhatsApp()`, `makeCall()`
  - Risk: Rate limiting, cost overruns

### Email Services
- **Unified Email** (`/app/lib/services/unified-email.service.ts`)
  - Providers: Resend, SendGrid, Mailgun, SMTP
  - Used by: All email sending features
  - Risk: Provider failures, deliverability issues

---

## 🤖 AI Services

### Anthropic/Claude
- **Server Integration** (`/app/lib/ai/anthropic-server.ts`)
  - Used by: Lead scoring, content generation, chatbot
  - Risk: API key exposure, rate limits

### OpenAI
- **Client** (`/app/lib/ai/providers/openai-client.ts`)
  - Used by: Form generation, insights
  - Risk: Cost management, prompt injection

### Lead Processing
- **Enhanced Processor** (`/app/lib/ai/enhanced-lead-processor.ts`)
- **Real-time Processor** (`/app/lib/ai/real-time-processor.ts`)
  - Used by: Lead scoring, insights generation
  - Risk: Processing delays affect conversions

---

## 🎯 Shared Patterns & Conventions

### API Response Format
```typescript
// Success
{ success: true, data: {...} }

// Error
{ error: "Error message", details?: {...} }
```

### Organization Scoping Pattern
```typescript
// All queries include organization_id
.eq('organization_id', organizationId)
```

### Caching Key Pattern
```typescript
`org:${organizationId}:${resource}:${id}`
```

### Error Handling Pattern
```typescript
try {
  // operation
} catch (error) {
  console.error('Context:', error)
  return NextResponse.json({ error: 'User-friendly message' }, { status: 500 })
}
```

---

## ⚠️ Critical Dependencies

### Environment Variables
All modules depend on these being set:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `TWILIO_*` credentials
- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `STRIPE_*` keys

### Database Tables
Core tables used by multiple modules:
- `organizations` - Everything depends on this
- `organization_members` - User access control
- `users` - User profiles
- `contacts` - Shared customer data

### Third-party Services
- **Supabase**: Database, auth, storage
- **Redis**: Caching, queues
- **Twilio**: Communications
- **Stripe**: Payments
- **Google**: Calendar, OAuth
- **Meta/Facebook**: Lead forms, ads

---

## 🔄 Shared Utilities

### Date Formatting
- **British Format** (`/app/lib/utils/british-format.ts`)
  - Functions: `formatBritishDate()`, `formatBritishDateTime()`
  - Used by: All date displays

### Safe Alert
- **Safe Alert** (`/app/lib/utils/safe-alert.ts`)
  - Wrapper for window.alert to prevent SSR errors
  - Used by: Client-side error displays

### Type Definitions
- **Database Types** (`/app/lib/supabase/database.types.ts`)
  - Generated from Supabase schema
  - Used by: All database operations

---

## 🚨 High-Risk Shared Components

1. **Organization Context** - Breaking this affects all multi-tenant isolation
2. **Auth Services** - Failures lock out all users
3. **Supabase Clients** - Connection issues break everything
4. **Cache Layer** - Can cause stale data issues across modules
5. **Queue System** - Backup causes automation failures
6. **Error Boundaries** - Poor error handling cascades failures
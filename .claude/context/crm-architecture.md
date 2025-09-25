# CRM Architecture Context

## Overview

Atlas Fitness CRM is a multi-tenant SaaS platform designed for gyms and fitness coaches to manage leads, automate communications, and leverage AI for better customer engagement.

## Tech Stack

### Frontend

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript 5.x
- **Styling**: Tailwind CSS 3.x
- **State Management**: React Context + Zustand
- **UI Components**: Custom components with Radix UI primitives
- **Forms**: React Hook Form + Zod validation

### Backend

- **API**: Next.js API Routes
- **Type Safety**: tRPC (planned) / REST with Zod
- **Database**: Supabase (PostgreSQL 15)
- **Authentication**: Supabase Auth
- **Queue**: BullMQ + Redis (planned)
- **File Storage**: Supabase Storage

### Infrastructure

- **Hosting**: Vercel
- **Database**: Supabase Cloud
- **Redis**: Upstash (planned)
- **Monitoring**: Vercel Analytics
- **Error Tracking**: Sentry (planned)

## Multi-Tenant Architecture

### Organization Isolation

```typescript
// Every tenant-specific table includes:
interface TenantTable {
  id: string;
  organization_id: string; // Foreign key to organizations
  created_at: Date;
  updated_at: Date;
}
```

### Authentication Flow

#### Organization Members (Staff/Admins)

1. User signs up → Organization created
2. User logs in → Organization context loaded
3. All queries filtered by organization_id
4. RLS policies enforce data isolation

#### Client Authentication (GoTeamUp-Style)

1. Client added to system → Unique invitation record created
2. Client receives unique, non-expiring magic link
3. First-time claim → Client sets password during onboarding
4. Subsequent logins → Email + password authentication only
5. Password-based access to client portal and services

### Data Access Patterns

```typescript
// Client-side access
const { data } = await supabase
  .from("leads")
  .select("*")
  .eq("organization_id", currentOrg.id);

// Server-side with admin client
const supabase = createAdminClient();
const { data } = await supabase
  .from("leads")
  .select("*")
  .eq("organization_id", organizationId);
```

## Current Implementation Status

### ✅ Completed Features

1. **Authentication System**
   - Staff: Email/password login with Google OAuth
   - Clients: GoTeamUp-style unique invite links with password setup
   - Organization creation on signup
   - Multi-tenancy with secure client portal access

2. **Lead Management**
   - CRUD operations
   - Import from CSV
   - Facebook lead forms
   - Tag system
   - Advanced filtering

3. **Communication Channels**
   - Email via Resend
   - SMS via Twilio
   - WhatsApp Business
   - Two-way messaging
   - Message history

4. **Basic Automation**
   - Visual workflow builder
   - Trigger system
   - Action execution
   - Email/SMS/WhatsApp actions

5. **Calendar Integration**
   - Google Calendar sync
   - Event management
   - Booking system

### 🚧 In Progress

1. **Advanced Automation**
   - BullMQ integration
   - Complex conditionals
   - A/B testing
   - Performance optimization

2. **AI Features**
   - Lead scoring
   - Predictive analytics
   - Content generation
   - Conversation AI improvements

3. **Meta Ads Integration**
   - Campaign import
   - Audience sync
   - Performance tracking
   - Lead attribution

4. **Payment Processing**
   - Stripe Connect setup
   - Subscription management
   - Payment forms
   - Invoice generation

### 📋 Planned Features

1. **Analytics Dashboard**
   - Real-time metrics
   - Custom reports
   - Export functionality
   - Predictive insights

2. **Team Collaboration**
   - Role-based permissions
   - Task assignment
   - Internal notes
   - Activity feeds

3. **Mobile App**
   - React Native
   - Push notifications
   - Offline support
   - Quick actions

## Key Design Decisions

### 1. Database-First Approach

- All business logic via RLS policies
- Stored procedures for complex operations
- Triggers for audit trails
- Real-time subscriptions

### 2. Server Components

- Default to server components
- Client components only for interactivity
- Streaming for better performance
- Edge runtime where applicable

### 3. Type Safety

- End-to-end TypeScript
- Zod for runtime validation
- Generated types from database
- Strict mode enabled

### 4. API Design

```typescript
// Standard API response format
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    pagination?: PaginationMeta;
  };
}
```

## Security Considerations

### Authentication

- JWT tokens with short expiry
- Refresh token rotation
- Session management
- MFA support (planned)

### Authorization

- Organization-level isolation
- Role-based access control
- Resource-level permissions
- API key management

### Data Protection

- Encryption at rest
- TLS for all connections
- PII handling compliance
- GDPR considerations

## Performance Requirements

### Response Times

- API endpoints: < 200ms p95
- Page loads: < 1s FCP
- Database queries: < 50ms
- Background jobs: < 30s

### Scalability Targets

- 10,000 active organizations
- 1M leads across platform
- 10M messages/month
- 1000 concurrent users

## Development Workflow

### Branch Strategy

- `main`: Production-ready code
- `develop`: Integration branch
- `feature/*`: New features
- `fix/*`: Bug fixes

### Code Standards

- ESLint + Prettier
- Conventional commits
- PR reviews required
- Automated testing

### Deployment Pipeline

1. Push to GitHub
2. Vercel preview deployment
3. Automated tests
4. Manual QA
5. Merge to main
6. Production deployment

## Directory Structure

```
/app
  /api          # API routes
  /components   # React components
  /lib          # Business logic
    /supabase   # Database utilities
    /ai         # AI integrations
    /email      # Email service
    /sms        # SMS service
  /(auth)       # Auth pages
  /(dashboard)  # App pages
/public         # Static assets
/supabase       # Migrations
/.claude        # AI agents
```

## Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# External Services
RESEND_API_KEY=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
STRIPE_SECRET_KEY=

# App Config
NEXT_PUBLIC_APP_URL=
NODE_ENV=
```

This architecture prioritizes developer experience, type safety, and scalability while maintaining flexibility for rapid feature development.

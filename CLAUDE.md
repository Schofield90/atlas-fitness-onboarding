# Claude Code Memory Management System

This file serves as persistent memory for Claude Code to maintain context across sessions.

## Project Overview

**Project**: Atlas Fitness Onboarding - AI-Powered Gym SaaS Platform
**Repository**: atlas-fitness-onboarding
**Production URL**: https://atlas-fitness-onboarding.vercel.app
**Stack**: Next.js 15.3.5, Supabase, TypeScript, Tailwind CSS, Twilio, OpenAI, Anthropic
**Architecture**: Multi-tenant SaaS with organization-based isolation

## Current State (As of August 11, 2025)

### Production Features (Verified in Codebase)
- ✅ Multi-tenant authentication with Supabase Auth
- ✅ Organization management with role-based permissions
- ✅ Complete CRM with lead management and AI scoring
- ✅ WhatsApp/SMS/Voice integration via Twilio
- ✅ Email integration (Resend, SendGrid, Mailgun, SMTP)
- ✅ Facebook/Meta ads integration with OAuth
- ✅ AI-powered form builder with OpenAI GPT-4
- ✅ Anthropic Claude integration for advanced AI
- ✅ Google Calendar bidirectional sync
- ✅ Comprehensive booking system with public widget
- ✅ Visual workflow automation builder (React Flow)
- ✅ Staff management with timesheets and payroll
- ✅ Stripe Connect for payments and billing
- ✅ Real-time analytics and reporting
- ✅ Client portal with magic link authentication
- ✅ Nutrition planning system
- ✅ SOP management with AI assistance
- ✅ British localization (£, DD/MM/YYYY, Europe/London)

### Technical Status
- ✅ 51 database migrations (including new AI and customer systems)
- ✅ 350+ API endpoints (enhanced with caching and AI)
- ✅ 200+ React components (with error boundaries)
- ✅ Redis caching layer implemented
- ✅ Enhanced error handling system
- ✅ Comprehensive RLS policies applied
- 🔧 Queue system requires Redis setup locally
- 🔧 Some features need environment variables configured

### Known Issues
- 🔧 Call feature needs USER_PHONE_NUMBER environment variable
- 🔧 Some database migrations may need to be run
- 🔧 OAuth credentials need configuration for local dev
- 🔧 Limited test coverage

### Database Status
- **Supabase Project ID**: lzlrojoaxrqvmhempnkn
- **Primary Organization**: Atlas Fitness (63589490-8f55-4157-bd3a-e141594b748e)
- **Migration Files**: 40+ comprehensive migrations
- **Core Tables**: organizations, users, leads, bookings, class_sessions, staff, automations, etc.
- **RLS Policies**: Comprehensive row-level security implemented
- **Indexes**: Performance optimization indexes in place

## Environment Variables Required

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://lzlrojoaxrqvmhempnkn.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[YOUR_KEY]
SUPABASE_SERVICE_ROLE_KEY=[YOUR_KEY]

# Twilio
TWILIO_ACCOUNT_SID=[YOUR_SID]
TWILIO_AUTH_TOKEN=[YOUR_TOKEN]
TWILIO_SMS_FROM=[YOUR_NUMBER]
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
USER_PHONE_NUMBER=[YOUR_PHONE_FOR_CALLS]

# AI Services
ANTHROPIC_API_KEY=[YOUR_KEY]
OPENAI_API_KEY=[YOUR_KEY]

# Stripe
STRIPE_SECRET_KEY=[YOUR_KEY]
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=[YOUR_KEY]
STRIPE_WEBHOOK_SECRET=[YOUR_SECRET]

# Google OAuth
GOOGLE_CLIENT_ID=[YOUR_ID]
GOOGLE_CLIENT_SECRET=[YOUR_SECRET]

# Email
RESEND_API_KEY=[YOUR_KEY]
```

## File Structure

```
/atlas-fitness-onboarding
├── /app                    # Next.js app directory
│   ├── /api               # API routes
│   ├── /components        # React components
│   ├── /lib              # Utility functions and services
│   └── /(pages)          # Page routes
├── /supabase              # Database migrations and functions
├── /scripts               # Utility scripts
├── /public               # Static assets
└── /styles              # Global styles
```

## Key Commands

```bash
# Development
npm run dev              # Start development server
npm run build           # Build for production
npm run lint            # Run ESLint
npm run type-check      # Run TypeScript check

# Deployment
vercel --prod           # Deploy to production
npm run vercel:deploy   # Optimized deployment

# Database
supabase db push        # Push migrations
supabase db reset       # Reset database
```

## Development History

### Previous Development
- Built comprehensive multi-tenant SaaS platform
- Implemented 100+ API endpoints
- Created visual automation workflow builder
- Integrated multiple third-party services
- Deployed to production on Vercel

### Current Session (August 11, 2025)
- Created CLI tools installation script
- Set up VS Code configuration
- Created development workflow scripts
- Performed comprehensive codebase analysis
- Discovered platform is production-ready with extensive features
- Created accurate documentation reflecting actual implementation

## Development Setup Steps

1. **Configure Environment Variables**
   ```bash
   cp .env.example .env.local
   # Fill in all required values from production/staging
   ```

2. **Install Dependencies**
   ```bash
   pnpm install  # or npm install
   ```

3. **Set up Local Services**
   ```bash
   # Start Supabase locally (optional)
   supabase start
   
   # Or connect to cloud Supabase instance
   ```

4. **Run Database Migrations**
   ```bash
   supabase db push  # Apply any pending migrations
   ```

5. **Configure OAuth (for full functionality)**
   - Set up Google OAuth credentials
   - Configure Facebook app for Meta integration
   - Set up Stripe Connect account

6. **Start Development Server**
   ```bash
   pnpm dev  # Runs on http://localhost:3000
   ```

## Important URLs

- **Production**: https://atlas-fitness-onboarding.vercel.app
- **GitHub**: https://github.com/Schofield90/atlas-fitness-onboarding
- **Supabase Dashboard**: https://supabase.com/dashboard/project/lzlrojoaxrqvmhempnkn

## Code Patterns and Conventions

### API Routes
```typescript
// Organization-scoped queries with auth check
import { checkAuthAndOrganization } from '@/app/lib/api/auth-check-org'

export async function POST(request: Request) {
  const authResult = await checkAuthAndOrganization(request)
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: 401 })
  }
  
  const { user, organizationId } = authResult
  // Proceed with organization-scoped logic
}
```

### Component Structure
```typescript
'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/app/lib/supabase/client'

export default function Component() {
  const supabase = createClient()
  // Component logic with organization context
}
```

### Service Pattern
```typescript
// Services are organized by domain
import { sendWhatsAppMessage } from '@/app/lib/services/twilio'
import { scoreLeadWithAI } from '@/app/lib/services/lead-scoring'
import { processBooking } from '@/app/lib/services/booking'
```

## Core Features Testing Checklist

### Authentication & Multi-tenancy
- [ ] User signup/login via Supabase Auth
- [ ] Organization creation and switching
- [ ] Role-based permissions (owner, admin, coach, staff)
- [ ] Magic link authentication for clients

### Lead Management
- [ ] Lead capture from multiple sources
- [ ] AI-powered lead scoring
- [ ] Lead assignment and follow-up
- [ ] Bulk import/export

### Communications
- [ ] WhatsApp messaging (templates & conversations)
- [ ] SMS sending with Twilio
- [ ] Email via multiple providers
- [ ] Voice calls with TwiML

### Booking System
- [ ] Class creation and scheduling
- [ ] Public booking widget
- [ ] Waitlist management
- [ ] Google Calendar sync

### Automation
- [ ] Visual workflow builder
- [ ] Trigger execution (lead, booking, etc.)
- [ ] Communication actions
- [ ] Queue processing with Redis

### Integrations
- [ ] Facebook lead forms sync
- [ ] Stripe payment processing
- [ ] Google OAuth and Calendar
- [ ] Twilio phone provisioning

## Key API Endpoints

### Public APIs
- `/api/public-api/create-lead` - Lead capture endpoint
- `/api/public-api/booking-data/[organizationId]` - Public booking data
- `/book/public/[organizationId]` - Public booking page

### Core Features
- `/api/leads/*` - Lead management
- `/api/booking/*` - Booking operations
- `/api/calendar/*` - Calendar management
- `/api/automations/*` - Workflow automation
- `/api/integrations/facebook/*` - Meta integration
- `/api/ai/*` - AI services

### Debug Tools (Development)
- `/api/debug/check-user-org` - User organization validation
- `/api/debug/test-twilio` - Twilio configuration test
- `/api/debug/ai-knowledge-test` - AI response testing
- `/booking-debug` - Booking system debugging
- `/whatsapp-debug` - WhatsApp integration test

## Architecture Insights

### Service Architecture
- **Database**: Supabase (PostgreSQL with RLS)
- **Queue**: BullMQ with Redis for async jobs
- **File Storage**: Supabase Storage
- **Real-time**: Supabase Realtime subscriptions
- **Analytics**: Custom implementation with Supabase

### Key Design Patterns
1. **Multi-tenancy**: Organization-based data isolation
2. **Service Layer**: Domain-specific service modules
3. **Queue Processing**: Async job handling for heavy operations
4. **AI Integration**: Multiple providers with fallback
5. **Webhook Handling**: Standardized webhook receivers

### Performance Optimizations
- Database indexes on all foreign keys
- Materialized views for analytics
- Redis caching for frequently accessed data
- Lazy loading for heavy components
- API route caching where appropriate

## Technical Debt & Improvements

### High Priority
1. Consolidate multiple booking UI implementations
2. Standardize error handling across API routes
3. Add comprehensive test coverage
4. Implement centralized feature flags

### Medium Priority
1. Optimize database migrations (consolidate old ones)
2. Extract debug routes to separate module
3. Implement request rate limiting
4. Add API documentation (OpenAPI/Swagger)

### Future Enhancements
1. Native mobile applications
2. Advanced business intelligence
3. White-label capabilities
4. Multi-language support
5. Advanced marketplace features

---

Last Updated: August 12, 2025
Session Status: Repository synchronized with latest changes

## Recent Updates (August 12, 2025)

### Major Enhancements
1. **Enhanced AI System**
   - Real-time lead processing with Claude + OpenAI
   - Sentiment analysis and buying signal detection
   - Background processing with job queues
   - Comprehensive insight generation

2. **Redis Caching Layer**
   - Multi-tenant cache architecture
   - Cached services for all major components
   - Cache monitoring and optimization
   - Support for both Redis and Upstash

3. **Error Handling System**
   - Comprehensive error monitoring
   - User-friendly error messages
   - Error recovery mechanisms
   - Global error boundaries

4. **Customer Detail System**
   - Enhanced customer profiles
   - Family member management
   - Emergency contacts
   - Medical information tracking

5. **Security Enhancements**
   - Comprehensive RLS policies
   - Multi-tenant security fixes
   - Enhanced authentication middleware
   - Organization isolation improvements

### New Critical Files
- `.claude/CRITICAL_CONTEXT.md` - Must-read platform requirements
- `AI_SYSTEM_DOCUMENTATION.md` - Enhanced AI system guide
- `REDIS_CACHING_IMPLEMENTATION_GUIDE.md` - Cache setup instructions
- `MULTI_TENANT_SECURITY_FIX_REPORT.md` - Security improvements
- `supabase/RLS_IMPLEMENTATION_GUIDE.md` - RLS best practices
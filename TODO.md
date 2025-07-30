# Remaining Work for Multi-Tenant SaaS Gym CRM Platform

## 🚨 Immediate Build Issues to Fix

### 1. SSR "self is not defined" Error
- **Issue**: ReactFlow and other browser-only packages cause SSR errors during build
- **Partial Fix Applied**: Dynamic imports with `ssr: false` in some components
- **Still Needs**: Complete audit of all components using browser-only packages
- **Files to Check**:
  - Any components using ReactFlow, DnD Kit, or similar browser-only libraries
  - Consider using dynamic imports or checking `typeof window !== 'undefined'`

## ✅ Completed Work (January 30, 2025)

### 1. SaaS Billing & Organization Management System ✅
- Multi-tier subscription plans (Starter £99, Pro £299, Enterprise £999)
- Stripe Connect integration for gym payment processing
- Platform commission tracking (3% on all transactions)
- Usage metrics and limits per plan
- Organization onboarding flow
- Database schema and API endpoints ready

### 2. Staff Management System ✅
- Organization-based staff table created
- Staff addition and display functionality working
- Fixed "Database integration pending" error
- Staff list with proper authentication

### 3. AI Form Builder ✅
- Switched from Anthropic to OpenAI (GPT-3.5-turbo)
- Form preview and edit before saving
- View and edit existing forms
- Proper multi-tenant isolation

### 4. Google Calendar Integration ✅
- OAuth2 authentication working
- Multi-tenant token storage with user_id
- Calendar selection and sync settings
- Two-way sync capability

### 5. WhatsApp AI Integration ✅
- Fully integrated with real gym data
- AI uses knowledge base for responses
- Two-way conversation tracking
- Message history with all channels (Email/SMS/WhatsApp)

## 🔧 Remaining Implementation Tasks (Priority Order)

### 1. Fix Call Feature
- **Current State**: "Failed to initiate call" error
- **Needs**: 
  - [ ] Add USER_PHONE_NUMBER to Vercel environment variables
  - [ ] Test call bridging functionality

### 2. Fix Multi-Tenant Booking System
- **Current State**: Schema exists but no data creation working
- **Needs**:
  - [ ] Fix data seeding issues
  - [ ] Create sample booking data
  - [ ] Public booking pages with organization branding
  - [ ] Payment integration through connected Stripe accounts
  - [ ] Waitlist automation
  - [ ] Class capacity management
  - [ ] Recurring class schedules

### 3. Enhance WhatsApp AI Context for Multi-Tenant
- **Current State**: Basic conversation context implemented with organization data
- **Needs**:
  - [ ] Add per-organization AI training and customization
  - [ ] Track AI usage against plan limits
  - [ ] Implement conversation routing by organization phone numbers

### 4. Build Multi-Tenant Membership Management
- **Current State**: Basic schema exists
- **Needs**:
  - [ ] Membership plan creation UI
  - [ ] Recurring payment processing via Stripe
  - [ ] Membership freezing/pausing
  - [ ] Family/corporate memberships
  - [ ] Payment failure handling
  - [ ] Direct debit via GoCardless

### 5. Create Multi-Tenant Customer Profile System
- **Needs**:
  - [ ] Complete customer profiles with photos
  - [ ] Medical information and waivers
  - [ ] Goal tracking
  - [ ] Progress photos
  - [ ] Attendance history
  - [ ] Payment history

### 6. Rebuild Multi-Tenant Automation System
- **Current State**: UI exists but execution engine missing
- **Needs**:
  - [ ] Workflow execution engine
  - [ ] Organization-specific triggers
  - [ ] SMS/Email/WhatsApp action execution
  - [ ] Rate limiting per organization
  - [ ] Template library

### 7. Build Multi-Tenant Lead Forms System
- **Current State**: Form builder exists and working
- **Needs**:
  - [ ] Public form URLs with organization branding
  - [ ] Lead capture and routing
  - [ ] Integration with automation system
  - [ ] Conversion tracking

### 8. Create Multi-Tenant Data Import System
- **Needs**:
  - [ ] CSV import for customers/members
  - [ ] Data mapping UI
  - [ ] Duplicate detection
  - [ ] Import from other gym software
  - [ ] Bulk operations

### 9. Implement Multi-Tenant Reports & Analytics
- **Needs**:
  - [ ] Revenue reports per organization
  - [ ] Member retention analytics
  - [ ] Class popularity metrics
  - [ ] Staff performance reports
  - [ ] Custom report builder
  - [ ] Export to PDF/Excel

### 10. Build Multi-Tenant Discount Codes System
- **Needs**:
  - [ ] Discount code generation
  - [ ] Usage tracking and limits
  - [ ] Time-based expiration
  - [ ] Integration with payments
  - [ ] Referral program support

### 11. Add Google OAuth for Signup/Login ✅
- **Completed**:
  - [x] Added Google OAuth buttons to login and signup pages
  - [x] Created OAuth callback route handler
  - [x] Automatic organization creation for Google signups
  - [x] Session storage for organization name during OAuth flow
  - [x] Comprehensive setup documentation created
- **Remaining**:
  - [ ] Configure Supabase Google OAuth provider (admin task)
  - [ ] Test full OAuth flow once configured

## 🔐 Security & Infrastructure Tasks

### 1. Row Level Security (RLS)
- [x] Forms table has proper RLS policies
- [x] Staff table has organization isolation
- [ ] Audit remaining tables for proper RLS policies
- [ ] Test cross-organization data access attempts

### 2. API Security
- [ ] Add rate limiting per organization
- [ ] Implement API key management for Enterprise plan
- [ ] Add webhook signature validation

### 3. White Label Setup
- [ ] Custom domain support for Enterprise
- [ ] Dynamic branding based on domain
- [ ] Email domain configuration

## 🚀 Deployment & DevOps

### 1. Environment Variables Needed
```env
# Stripe (Required)
STRIPE_SECRET_KEY=sk_live_xxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Google Calendar (Set up ✅)
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx

# Existing vars that must be set
ANTHROPIC_API_KEY=xxx (optional - not used currently)
OPENAI_API_KEY=xxx ✅
TWILIO_ACCOUNT_SID=xxx ✅
TWILIO_AUTH_TOKEN=xxx ✅
USER_PHONE_NUMBER=xxx (Needed for calls)
NEXT_PUBLIC_APP_URL=https://atlas-fitness-onboarding.vercel.app ✅
```

### 2. Database Migrations to Run
- [x] `/supabase/migrations/20250129_organization_staff_table.sql`
- [x] `/supabase/migrations/20250129_forms_documents_table.sql`
- [x] `/supabase/migrations/20250130_fix_forms_table.sql`
- [x] `/supabase/google-calendar-tokens.sql`
- [ ] `/supabase/saas-billing-system.sql`
- [ ] `/supabase/payment-transactions.sql`
- [x] `/supabase/conversation-contexts.sql`

### 3. Stripe Setup
- [ ] Configure webhook endpoints
- [ ] Set up Connect OAuth
- [ ] Configure platform settings

## 📊 Business Logic Implementation

### 1. Usage Enforcement
- [ ] Block actions when limits exceeded
- [ ] Show usage warnings at 80%
- [ ] Automated upgrade prompts

### 2. Billing Automation
- [ ] Failed payment retry logic
- [ ] Dunning emails
- [ ] Account suspension for non-payment
- [ ] Grace periods

### 3. Platform Analytics
- [ ] MRR tracking
- [ ] Churn analysis
- [ ] Feature usage analytics
- [ ] Platform commission reports

## 🎯 Quick Wins (Can be done immediately)

1. **Fix SSR Build Issues** - Critical for deployment
2. **Add Sample Data** - For booking system testing
3. **Add USER_PHONE_NUMBER** - To fix call feature
4. **Run Remaining Migrations** - For billing system

## 📝 Notes

- All features must respect organization boundaries
- Every API endpoint needs organization_id validation
- Usage tracking must be implemented for all billable actions
- Platform commission applies to all payment transactions
- White label features only available on Enterprise plan

**Last Updated**: January 30, 2025
**Current Status**: Core features working, need to fix booking system and add billing

## 🚀 Today's Achievements
- ✅ Fixed AI Form Builder completely
- ✅ Added form preview/edit functionality
- ✅ Fixed Google Calendar OAuth integration
- ✅ Updated all documentation
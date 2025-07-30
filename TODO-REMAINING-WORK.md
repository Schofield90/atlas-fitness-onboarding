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

## 🔧 Remaining Implementation Tasks (Priority Order)

### 2. Enhance WhatsApp AI Context for Multi-Tenant (IN PROGRESS)
- **Current State**: Basic conversation context implemented
- **Needs**:
  - [ ] Ensure organization_id isolation in all AI interactions
  - [ ] Add organization-specific knowledge base per gym
  - [ ] Implement conversation routing by organization phone numbers
  - [ ] Add per-organization AI training and customization
  - [ ] Track AI usage against plan limits

### 3. Fix Multi-Tenant Staff Management System
- **Current State**: Basic staff table exists
- **Needs**:
  - [ ] Complete staff invitation flow with email
  - [ ] Role-based permissions (owner, admin, staff, viewer)
  - [ ] Staff scheduling and availability
  - [ ] Staff commission tracking
  - [ ] Performance metrics per staff member

### 4. Fix Multi-Tenant Booking System
- **Current State**: Schema exists but no data creation working
- **Needs**:
  - [ ] Fix data seeding issues
  - [ ] Public booking pages with organization branding
  - [ ] Payment integration through connected Stripe accounts
  - [ ] Waitlist automation
  - [ ] Class capacity management
  - [ ] Recurring class schedules

### 5. Build Multi-Tenant Membership Management
- **Current State**: Basic schema exists
- **Needs**:
  - [ ] Membership plan creation UI
  - [ ] Recurring payment processing via Stripe
  - [ ] Membership freezing/pausing
  - [ ] Family/corporate memberships
  - [ ] Payment failure handling
  - [ ] Direct debit via GoCardless

### 6. Create Multi-Tenant Customer Profile System
- **Needs**:
  - [ ] Complete customer profiles with photos
  - [ ] Medical information and waivers
  - [ ] Goal tracking
  - [ ] Progress photos
  - [ ] Attendance history
  - [ ] Payment history

### 7. Rebuild Multi-Tenant Automation System
- **Current State**: UI exists but execution engine missing
- **Needs**:
  - [ ] Workflow execution engine
  - [ ] Organization-specific triggers
  - [ ] SMS/Email/WhatsApp action execution
  - [ ] Rate limiting per organization
  - [ ] Template library

### 8. Build Multi-Tenant Lead Forms System
- **Current State**: Form builder exists but not multi-tenant
- **Needs**:
  - [ ] Public form URLs with organization branding
  - [ ] Lead capture and routing
  - [ ] Custom fields per organization
  - [ ] Integration with automation system
  - [ ] Conversion tracking

### 9. Create Multi-Tenant Data Import System
- **Needs**:
  - [ ] CSV import for customers/members
  - [ ] Data mapping UI
  - [ ] Duplicate detection
  - [ ] Import from other gym software
  - [ ] Bulk operations

### 10. Implement Multi-Tenant Reports & Analytics
- **Needs**:
  - [ ] Revenue reports per organization
  - [ ] Member retention analytics
  - [ ] Class popularity metrics
  - [ ] Staff performance reports
  - [ ] Custom report builder
  - [ ] Export to PDF/Excel

### 11. Build Multi-Tenant Discount Codes System
- **Needs**:
  - [ ] Discount code generation
  - [ ] Usage tracking and limits
  - [ ] Time-based expiration
  - [ ] Integration with payments
  - [ ] Referral program support

## 🔐 Security & Infrastructure Tasks

### 1. Row Level Security (RLS)
- [ ] Audit all tables for proper RLS policies
- [ ] Ensure organization_id isolation everywhere
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

# Existing vars that must be set
ANTHROPIC_API_KEY=xxx
OPENAI_API_KEY=xxx
TWILIO_ACCOUNT_SID=xxx
TWILIO_AUTH_TOKEN=xxx
USER_PHONE_NUMBER=xxx
```

### 2. Database Migrations to Run
- `/supabase/saas-billing-system.sql`
- `/supabase/payment-transactions.sql`
- `/supabase/conversation-contexts.sql`

### 3. Stripe Setup
- Configure webhook endpoints
- Set up Connect OAuth
- Configure platform settings

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
3. **Complete Staff Invitation Flow** - Already partially built
4. **Add Organization Switcher** - For users with multiple gyms

## 📝 Notes

- All features must respect organization boundaries
- Every API endpoint needs organization_id validation
- Usage tracking must be implemented for all billable actions
- Platform commission applies to all payment transactions
- White label features only available on Enterprise plan

**Last Updated**: January 30, 2025
**Current Blockers**: SSR build issues with browser-only packages
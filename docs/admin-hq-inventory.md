# Admin HQ Database Inventory & Risk Assessment

**Date**: 2025-08-21  
**Purpose**: Comprehensive mapping of existing database entities and risk assessment for Admin HQ implementation

## Executive Summary

This document provides a complete inventory of the current database schema, focusing on multi-tenant isolation, billing systems, and security implications for the proposed Admin HQ feature. The system uses a sophisticated multi-tenant architecture with Row Level Security (RLS) policies that will need careful consideration for admin access.

## 1. Core Tenant Infrastructure

### 1.1 Organizations Table
```sql
organizations (
  id UUID PRIMARY KEY,
  slug TEXT UNIQUE,
  name TEXT NOT NULL,
  plan TEXT DEFAULT 'starter' CHECK (plan IN ('starter', 'pro', 'enterprise')),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  settings JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
```
- **RLS Status**: ✅ Enabled
- **Admin Risk**: HIGH - Contains sensitive plan and billing info
- **Access Pattern**: Users can only view organizations they belong to

### 1.2 User Organizations Junction Table  
```sql
user_organizations (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  organization_id UUID REFERENCES organizations(id),
  role VARCHAR CHECK (role IN ('owner', 'admin', 'member', 'staff')),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
```
- **RLS Status**: ✅ Enabled  
- **Admin Risk**: CRITICAL - Controls all access permissions
- **Current Limitation**: No super-admin role defined

### 1.3 Organization Members (Legacy)
```sql
organization_members (
  user_id UUID,
  org_id UUID,
  role TEXT CHECK (role IN ('owner', 'admin', 'coach', 'staff')),
  permissions JSONB DEFAULT '{}',
  joined_at TIMESTAMPTZ,
  PRIMARY KEY (user_id, org_id)
)
```
- **Status**: Legacy table, partially replaced by user_organizations
- **Admin Risk**: MEDIUM - May contain conflicting permissions

## 2. Billing & Payment System (Two-Rail Architecture)

### 2.1 SaaS Billing Tables

#### Billing Customers
```sql
billing_customers (
  id UUID PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id),
  stripe_customer_id TEXT UNIQUE,
  email TEXT NOT NULL,
  currency TEXT DEFAULT 'gbp',
  tax_exempt TEXT DEFAULT 'none',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
```
- **RLS Status**: ✅ Enabled with user_has_org_access()
- **Admin Risk**: HIGH - Contains billing customer data
- **Data Sensitivity**: PII + Financial

#### Billing Subscriptions  
```sql
billing_subscriptions (
  id UUID PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id),
  billing_customer_id UUID REFERENCES billing_customers(id),
  stripe_subscription_id TEXT UNIQUE,
  stripe_price_id TEXT,
  plan_key TEXT,
  status TEXT, -- trialing, active, past_due, canceled, incomplete
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'
)
```
- **RLS Status**: ✅ Enabled
- **Admin Risk**: CRITICAL - Core revenue data
- **Admin Need**: Monitor subscription health, plan changes

### 2.2 Merchant Processing Tables

#### Connected Accounts (Stripe Connect + GoCardless)
```sql
connected_accounts (
  id UUID PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) UNIQUE,
  stripe_account_id TEXT UNIQUE,
  stripe_account_status TEXT,
  stripe_charges_enabled BOOLEAN DEFAULT false,
  gc_organization_id TEXT UNIQUE,
  gc_access_token TEXT, -- encrypted
  default_currency TEXT DEFAULT 'GBP',
  platform_fee_bps INTEGER DEFAULT 300
)
```
- **RLS Status**: ✅ Enabled
- **Admin Risk**: CRITICAL - Contains encrypted payment tokens
- **Security Concern**: Access tokens for financial systems

#### Gym Products
```sql
gym_products (
  id UUID PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id),
  name TEXT NOT NULL,
  type TEXT, -- membership, class_pack, personal_training, merchandise
  price_cents INTEGER,
  payment_methods TEXT[],
  stripe_product_id TEXT,
  active BOOLEAN DEFAULT true
)
```
- **RLS Status**: ✅ Enabled
- **Admin Risk**: MEDIUM - Business model insights

#### Gym Charges
```sql
gym_charges (
  id UUID PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id),
  client_id UUID REFERENCES clients(id),
  amount_cents INTEGER NOT NULL,
  platform_fee_cents INTEGER DEFAULT 0,
  processor TEXT, -- stripe, gocardless
  processor_payment_id TEXT UNIQUE,
  status TEXT -- pending, succeeded, failed, refunded
)
```
- **RLS Status**: ✅ Enabled
- **Admin Risk**: HIGH - Revenue and fee tracking
- **Admin Need**: Platform fee analysis, payment success rates

## 3. CRM & Customer Data

### 3.1 Leads
```sql
leads (
  id UUID PRIMARY KEY,
  org_id UUID REFERENCES organizations(id),
  assigned_to UUID REFERENCES users(id),
  status TEXT CHECK (status IN ('new', 'contacted', 'qualified', 'converted', 'lost')),
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  score INTEGER CHECK (score >= 0 AND score <= 100),
  tags TEXT[],
  metadata JSONB DEFAULT '{}'
)
```
- **RLS Status**: ✅ Enabled
- **Admin Risk**: HIGH - PII data
- **Admin Need**: Lead quality analysis, conversion tracking

### 3.2 Clients
```sql
clients (
  id UUID PRIMARY KEY,
  org_id UUID REFERENCES organizations(id),
  user_id UUID REFERENCES users(id),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  membership_tier TEXT,
  stripe_customer_id TEXT
)
```
- **RLS Status**: ✅ Enabled
- **Admin Risk**: HIGH - Customer PII + payment IDs

## 4. Audit & Logging System

### 4.1 Audit Logs
```sql
audit_logs (
  id UUID PRIMARY KEY,
  org_id UUID REFERENCES organizations(id),
  actor_id UUID REFERENCES users(id),
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id UUID,
  details JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ
)
```
- **RLS Status**: ✅ Enabled
- **Admin Risk**: MEDIUM - Contains user activity
- **Admin Need**: Cross-organization audit trail

### 4.2 Error Logs
```sql
error_logs (
  id UUID PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id),
  user_id UUID REFERENCES users(id),
  level TEXT, -- error, warning, info
  message TEXT NOT NULL,
  error_code TEXT,
  endpoint TEXT,
  stack_trace TEXT,
  metadata JSONB
)
```
- **RLS Status**: ✅ Enabled
- **Admin Risk**: LOW - System diagnostics

### 4.3 Webhook Events
```sql
webhook_events (
  id UUID PRIMARY KEY,
  provider TEXT, -- stripe, gocardless
  event_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  organization_id UUID REFERENCES organizations(id),
  status TEXT DEFAULT 'pending',
  payload JSONB NOT NULL,
  processed_at TIMESTAMPTZ
)
```
- **RLS Status**: ✅ Enabled  
- **Admin Risk**: MEDIUM - Contains payment webhook data
- **Admin Need**: Monitor webhook failures across organizations

## 5. Current RLS Policy Analysis

### 5.1 Helper Functions
```sql
-- Core RLS functions that control all access
auth.user_organizations() RETURNS SETOF uuid
auth.has_organization_access(org_id uuid) RETURNS boolean
auth.is_organization_admin(org_id uuid) RETURNS boolean
user_has_org_access(org_id uuid) RETURNS boolean
```

### 5.2 Standard Policy Pattern
Most tables follow this pattern:
```sql
-- SELECT: Users can view data in their organizations
FOR SELECT USING (org_id IN (SELECT auth.user_organizations()))

-- INSERT: Users can create data for their organizations  
FOR INSERT WITH CHECK (org_id IN (SELECT auth.user_organizations()))

-- UPDATE: Users can modify data in their organizations
FOR UPDATE USING (org_id IN (SELECT auth.user_organizations()))

-- DELETE: Only admins can delete (organization-level)
FOR DELETE USING (auth.is_organization_admin(org_id))
```

### 5.3 Service Role Bypass
```sql
-- Critical: Service role can bypass all RLS
CREATE POLICY "service_role_bypass_*" ON *
FOR ALL TO service_role
USING (true) WITH CHECK (true)
```

## 6. Missing Tables for Admin HQ

The following tables need to be created to support Admin HQ functionality:

### 6.1 Super Admin Users
```sql
-- MISSING: Need to create
super_admin_users (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) UNIQUE,
  role TEXT CHECK (role IN ('super_admin', 'support_admin', 'billing_admin')),
  permissions JSONB DEFAULT '{}',
  granted_by UUID REFERENCES super_admin_users(id),
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE
)
```

### 6.2 Admin Activity Logs  
```sql
-- MISSING: Need to create
admin_activity_logs (
  id UUID PRIMARY KEY,
  admin_user_id UUID REFERENCES super_admin_users(id),
  action TEXT NOT NULL,
  target_organization_id UUID REFERENCES organizations(id),
  target_user_id UUID,
  details JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
)
```

### 6.3 Organization Access Grants
```sql  
-- MISSING: Need to create
admin_organization_access (
  id UUID PRIMARY KEY,
  admin_user_id UUID REFERENCES super_admin_users(id),
  organization_id UUID REFERENCES organizations(id),
  access_type TEXT CHECK (access_type IN ('read', 'write', 'billing', 'full')),
  granted_by UUID REFERENCES super_admin_users(id),
  reason TEXT NOT NULL,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(admin_user_id, organization_id)
)
```

## 7. Security Risks Assessment

### 7.1 CRITICAL Risks

1. **RLS Bypass Exposure**
   - Current service role bypasses all RLS
   - Admin HQ will need similar bypass capabilities  
   - Risk: Accidental cross-tenant data access

2. **Financial Data Access**
   - billing_customers, billing_subscriptions contain sensitive financial data
   - connected_accounts has encrypted payment tokens
   - Risk: Unauthorized access to payment credentials

3. **PII Data Exposure**
   - leads, clients tables contain customer PII
   - No data masking for admin views
   - Risk: Privacy violations, GDPR compliance issues

### 7.2 HIGH Risks

1. **Audit Trail Gaps**
   - No dedicated admin activity logging
   - Current audit_logs are organization-scoped
   - Risk: Cannot track cross-organization admin actions

2. **Role Escalation**  
   - No super-admin role in user_organizations
   - No time-limited admin access
   - Risk: Permanent elevated access

3. **Data Isolation Failure**
   - Admin functions may accidentally leak data across tenants
   - No organization-aware admin UI components
   - Risk: Wrong data displayed to wrong organization

### 7.3 MEDIUM Risks

1. **Webhook Security**
   - webhook_events contain raw payment webhooks
   - Admin can see all webhook payloads
   - Risk: Payment processor data exposure

2. **Billing Plan Changes**
   - No approval workflow for plan changes
   - Direct stripe_subscription_id updates possible
   - Risk: Unauthorized billing modifications

## 8. Admin HQ Implementation Recommendations

### 8.1 Infrastructure Requirements

1. **Create Admin Role System**
   ```sql
   -- Add super_admin_users table
   -- Add admin_activity_logs table
   -- Add admin_organization_access table
   ```

2. **Implement Admin RLS Policies**
   ```sql
   -- Create admin-specific RLS functions
   -- Add admin bypass policies to sensitive tables
   -- Maintain audit trail for all admin actions
   ```

3. **Data Masking Layer**
   ```sql
   -- Create views that mask PII for admin access
   -- Implement field-level access controls
   -- Add data classification metadata
   ```

### 8.2 Required Middleware

1. **Admin Authentication Middleware**
   - Verify super-admin status
   - Log all admin requests
   - Implement time-based access tokens

2. **Organization Context Middleware**
   - Ensure admin explicitly selects target organization
   - Prevent accidental cross-tenant operations  
   - Add "acting as admin" UI indicators

3. **Audit Middleware**
   - Log all admin database operations
   - Track data accessed and modified
   - Generate compliance reports

### 8.3 UI/UX Safeguards

1. **Organization Selector**
   - Prominent organization selection UI
   - Confirmation dialogs for sensitive operations
   - Visual indicators when acting as admin

2. **Data Masking**
   - Mask PII by default in admin views
   - Require explicit "reveal" actions for sensitive data
   - Log all data unmasking events

## 9. Migration Strategy

### Phase 1: Infrastructure (Week 1)
- Create admin role tables
- Implement admin RLS functions  
- Add admin activity logging

### Phase 2: Security Hardening (Week 2)
- Implement data masking views
- Add admin middleware
- Create audit trails

### Phase 3: UI Implementation (Week 3-4)  
- Build admin dashboard
- Add organization selection
- Implement safety controls

### Phase 4: Testing & Validation (Week 5)
- Penetration testing
- Cross-tenant isolation validation
- Compliance review

## 10. Compliance Considerations

### GDPR Requirements
- Data masking for PII fields
- Admin access logging
- Right to be forgotten capability
- Data breach notification procedures

### Financial Compliance  
- PCI DSS considerations for payment data
- Audit trail for all financial operations
- Separation of duties for billing changes
- Regular access reviews

## Conclusion

The current system has a sophisticated multi-tenant architecture with comprehensive RLS policies. However, implementing Admin HQ requires careful addition of super-admin capabilities while maintaining security isolation. The primary risks involve data leakage between tenants and unauthorized access to financial/PII data.

**Critical Success Factors:**
1. Comprehensive audit logging of all admin actions
2. Explicit organization context selection
3. Data masking for sensitive fields
4. Time-limited admin access grants
5. Regular security reviews and compliance audits

**Immediate Actions Required:**
1. Create super_admin_users table
2. Implement admin activity logging
3. Add data masking views for PII fields
4. Build organization selection middleware
5. Add admin authentication middleware

This inventory provides the foundation for secure Admin HQ implementation while maintaining the existing multi-tenant security model.
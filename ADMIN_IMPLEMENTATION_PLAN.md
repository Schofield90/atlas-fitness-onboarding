# Atlas CRM SaaS Admin Console - Implementation Plan

## Current Foundation (Keep & Enhance)

### ✅ What We Have Built
1. **`/saas-admin`** - Working standalone dashboard
2. **Basic authentication** - Email-based for sam@atlas-gyms.co.uk
3. **Simple metrics** - Organization, user, and lead counts
4. **Database tables** - super_admin_users, admin_organization_access, admin_activity_logs

### 🔧 Immediate Enhancements Needed

#### Phase 0: Fix Foundation (Week 1)
```typescript
// 1. Fix RLS policies
// 2. Implement proper RBAC
// 3. Add audit logging middleware
// 4. Create admin API namespace
```

## Implementation Roadmap (Building on Existing)

### Phase 1: Core Tenant & Billing (Weeks 1-3)

#### M1: Tenant Directory & Impersonation
```typescript
// New routes to add:
app/
  saas-admin/
    tenants/
      page.tsx                    // Enhanced tenant list
      [id]/
        page.tsx                  // Tenant detail view
        impersonate/route.ts      // Impersonation handler
        
// Key features:
- Tenant lifecycle management
- Risk scoring system
- Secure impersonation with audit
- Tenant health dashboard
```

#### M2-M3: Plans, Billing & Metering
```typescript
app/
  saas-admin/
    billing/
      page.tsx                    // Billing dashboard
      plans/page.tsx              // Plan management
      invoices/page.tsx           // Invoice management
      
// Stripe integration:
- MRR/ARR calculation
- Dunning management
- Usage-based billing
- Refunds & credits
```

### Phase 2: Operations & Monitoring (Weeks 4-6)

#### M4: Integrations Control Center
```typescript
app/
  saas-admin/
    integrations/
      page.tsx                    // Integration status grid
      [provider]/page.tsx         // Provider details
      
// Monitor:
- Google Calendar/OAuth status
- WhatsApp/Twilio quotas
- Webhook failures
- API rate limits
```

#### M5: Messaging & Deliverability
```typescript
app/
  saas-admin/
    deliverability/
      page.tsx                    // Email/SMS health
      domains/page.tsx            // SPF/DKIM/DMARC
      
// Features:
- Sender reputation monitoring
- Template compliance checking
- Spam score prediction
```

### Phase 3: AI & Automation (Weeks 7-9)

#### M8: AI Control Room
```typescript
app/
  saas-admin/
    ai/
      page.tsx                    // AI usage & costs
      prompts/page.tsx            // Prompt management
      guardrails/page.tsx         // Safety controls
      
// AI governance:
- Model selection & costs
- Prompt versioning
- Eval suites
- Per-tenant limits
```

#### M6-M7: Automations & Templates
```typescript
app/
  saas-admin/
    automations/
      page.tsx                    // Workflow governance
      templates/page.tsx          // Blueprint publisher
      
// Publishing system:
- Version control
- Canary releases
- A/B testing
- Performance tracking
```

## Database Schema Extensions

```sql
-- Extend existing tables with GHL-style requirements

-- Tenant management (M1)
ALTER TABLE organizations ADD COLUMN 
  status TEXT DEFAULT 'trial',
  risk_score INTEGER DEFAULT 0,
  health_score INTEGER DEFAULT 100,
  mrr_cents INTEGER DEFAULT 0,
  churn_risk_level TEXT,
  owner_csm_id UUID,
  metadata JSONB DEFAULT '{}';

-- Plans & limits (M2)
CREATE TABLE plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  price_cents INTEGER NOT NULL,
  currency TEXT DEFAULT 'GBP',
  features JSONB NOT NULL,
  limits JSONB NOT NULL,
  trial_days INTEGER DEFAULT 14,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Usage metering (M2)
CREATE TABLE usage_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  metric_name TEXT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  value DECIMAL NOT NULL,
  limit_value DECIMAL,
  overage_qty DECIMAL,
  overage_cost_cents INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Billing & invoices (M3)
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  stripe_invoice_id TEXT,
  amount_cents INTEGER NOT NULL,
  tax_cents INTEGER,
  status TEXT NOT NULL,
  due_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  line_items JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Integration monitoring (M4)
CREATE TABLE integration_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  provider TEXT NOT NULL,
  status TEXT NOT NULL,
  scopes TEXT[],
  last_successful_sync TIMESTAMPTZ,
  error_count INTEGER DEFAULT 0,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI usage tracking (M8)
CREATE TABLE ai_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  feature_name TEXT NOT NULL,
  model_name TEXT NOT NULL,
  input_tokens INTEGER,
  output_tokens INTEGER,
  cost_cents INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## API Structure

```typescript
// Admin API namespace with proper auth
app/api/admin/
  auth/
    verify/route.ts               // Verify admin access
  tenants/
    route.ts                      // GET list, POST create
    [id]/
      route.ts                    // GET, PATCH, DELETE
      impersonate/route.ts        // POST start session
      health/route.ts             // GET health metrics
  billing/
    metrics/route.ts              // MRR, churn, LTV
    invoices/route.ts             // Invoice management
    stripe/webhook/route.ts       // Stripe events
  integrations/
    status/route.ts               // Global status
    [provider]/route.ts           // Provider-specific
  ai/
    usage/route.ts                // Usage & costs
    prompts/route.ts              // Prompt management
```

## Sub-Agent Architecture

```typescript
// Use specialized agents for complex tasks

// 1. Analytics Agent
await Task({
  subagent_type: 'analytics',
  prompt: 'Calculate MRR, churn rate, and LTV for all tenants'
});

// 2. Security Auditor
await Task({
  subagent_type: 'security-auditor',
  prompt: 'Audit all admin actions in the last 24 hours'
});

// 3. Performance Optimizer
await Task({
  subagent_type: 'perf-cost-optimizer',
  prompt: 'Analyze admin dashboard query performance'
});

// 4. Database Migrator
await Task({
  subagent_type: 'db-migrator',
  prompt: 'Create migration for new billing tables'
});
```

## MVP Implementation Order (90 Days)

### Month 1: Foundation & Revenue
1. Fix auth/RLS (Week 1)
2. M1: Tenant Directory (Week 2)
3. M2: Plans & Limits (Week 3)
4. M3: Billing/Stripe (Week 4)

### Month 2: Operations
5. M4: Integrations (Week 5)
6. M5: Deliverability (Week 6)
7. M17: Onboarding (Week 7)
8. M18: Health Scores (Week 8)

### Month 3: Growth & AI
9. M8: AI Control (Week 9)
10. M6-7: Automations/Templates (Week 10)
11. M21: Reliability (Week 11)
12. M22: Weekly Brief (Week 12)

## Component Library Structure

```typescript
// Reusable admin components
components/
  admin/
    // Data display
    MetricsCard.tsx
    TenantTable.tsx
    RevenueChart.tsx
    HealthGauge.tsx
    
    // Actions
    ImpersonateModal.tsx
    RefundDialog.tsx
    PlanSelector.tsx
    
    // Monitoring
    IntegrationStatus.tsx
    DeliverabilityScore.tsx
    AIUsageChart.tsx
    
    // Common
    AuditLog.tsx
    RiskBadge.tsx
    StatusChip.tsx
```

## Monitoring & Alerts

```typescript
// Event emission for all admin actions
export const adminEvents = {
  // Tenant events
  'admin.tenant.created': (data) => emit(data),
  'admin.tenant.suspended': (data) => emit(data),
  'admin.impersonation.started': (data) => emit(data),
  
  // Billing events
  'admin.invoice.refunded': (data) => emit(data),
  'admin.plan.changed': (data) => emit(data),
  
  // System events
  'admin.integration.failed': (data) => emit(data),
  'admin.ai.limit.exceeded': (data) => emit(data),
};
```

## Security Requirements

```typescript
// Every admin action must:
1. Verify admin role
2. Log to audit trail
3. Emit telemetry event
4. Support rollback where applicable

// Middleware chain:
export const adminMiddleware = [
  verifyAdminAuth,
  checkIPWhitelist,
  enforceRateLimit,
  logAuditTrail,
  validatePermissions
];
```

## Testing Strategy

```typescript
// Test coverage requirements
describe('Admin Console', () => {
  // Unit tests
  test('MRR calculation accuracy')
  test('Risk scoring algorithm')
  test('Impersonation token generation')
  
  // Integration tests
  test('Stripe webhook processing')
  test('Tenant lifecycle transitions')
  test('Audit log completeness')
  
  // E2E tests
  test('Full impersonation flow')
  test('Refund processing')
  test('Plan upgrade/downgrade')
});
```

## Performance Targets

- Dashboard load: < 1.5s (P95)
- API response: < 500ms (P95)
- Real-time metrics lag: < 60s
- Audit log write: < 100ms
- Impersonation start: < 2s

## Next Immediate Actions

1. **Fix RLS policies** - Resolve the infinite recursion
2. **Add Stripe integration** - Connect billing data
3. **Build tenant table** - Enhanced organization list
4. **Add MRR calculation** - Real revenue metrics
5. **Implement audit logging** - Track all actions

This builds on our `/saas-admin` foundation while adding the comprehensive GHL-style features needed for a production multi-tenant SaaS platform.
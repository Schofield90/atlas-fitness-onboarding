# GoCardless Integration - Step by Step Setup Guide

## Overview

GoCardless integration follows the same pattern as Stripe:

1. Connect account via API key
2. Import subscriptions (auto-create plans)
3. Import payments (historical data)
4. View unified financial reports (Stripe + GoCardless)

---

## Step 1: Get Your GoCardless API Key

### Development (Sandbox):

1. Go to https://manage-sandbox.gocardless.com/
2. Sign in or create sandbox account
3. Navigate to **Developers** → **Create** → **Access Token**
4. Copy the token (starts with `sandbox_`)

### Production (Live):

1. Go to https://manage.gocardless.com/
2. Sign in to your live account
3. Navigate to **Developers** → **Create** → **Access Token**
4. Copy the token (starts with `live_`)

**⚠️ Keep this token secure - it provides full access to your GoCardless account**

---

## Step 2: Database Setup

### A. Create GoCardless Connection Table

```sql
-- Add to Supabase migration
CREATE TABLE IF NOT EXISTS payment_provider_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL, -- 'stripe', 'gocardless'
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  environment VARCHAR(20) DEFAULT 'live', -- 'live' or 'sandbox'
  connected_at TIMESTAMP DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(organization_id, provider)
);

-- Enable RLS
ALTER TABLE payment_provider_accounts ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their organization's payment providers
CREATE POLICY payment_provider_accounts_select
  ON payment_provider_accounts FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
    )
  );
```

### B. Add Payment Provider Column to Existing Tables

```sql
-- Add to payments table
ALTER TABLE payments
ADD COLUMN IF NOT EXISTS payment_provider VARCHAR(50) DEFAULT 'stripe',
ADD COLUMN IF NOT EXISTS provider_payment_id VARCHAR(255); -- GoCardless payment ID

-- Add to customer_memberships table
ALTER TABLE customer_memberships
ADD COLUMN IF NOT EXISTS payment_provider VARCHAR(50) DEFAULT 'stripe',
ADD COLUMN IF NOT EXISTS provider_subscription_id VARCHAR(255); -- GoCardless subscription ID

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_payments_provider ON payments(payment_provider);
CREATE INDEX IF NOT EXISTS idx_payments_provider_id ON payments(provider_payment_id);
CREATE INDEX IF NOT EXISTS idx_memberships_provider ON customer_memberships(payment_provider);
```

---

## Step 3: Create Connection API Endpoint

I'll create `/app/api/gym/gocardless/connect/route.ts` for you.

This will:

- Validate the GoCardless API key
- Test connection by fetching account details
- Store in `payment_provider_accounts` table

---

## Step 4: Create Import Endpoints

### A. Payments Import

`/app/api/gym/gocardless/import/payments/route.ts`

- Fetch payments from GoCardless API
- Auto-create archived clients if needed
- Store in `payments` table with `payment_provider='gocardless'`

### B. Subscriptions Import

`/app/api/gym/gocardless/import/subscriptions/route.ts`

- Fetch subscriptions from GoCardless
- Auto-create membership plans
- Link clients to plans via `customer_memberships`

---

## Step 5: Update Financial Reports

Modify `/app/api/reports/stripe-revenue/route.ts` to:

- Fetch payments from BOTH Stripe and GoCardless
- Calculate combined MRR/ARR
- Show revenue breakdown by provider

---

## Implementation Checklist

Ready to implement? Here's what I'll do:

- [ ] Create `payment_provider_accounts` database table
- [ ] Add payment provider columns to existing tables
- [ ] Create GoCardless connection API endpoint
- [ ] Create GoCardless payments import
- [ ] Create GoCardless subscriptions import
- [ ] Update financial reports for multi-provider support
- [ ] Create UI page for GoCardless connection
- [ ] Test with sandbox account
- [ ] Document usage

**Estimated Time**: 2-3 hours implementation

---

## Quick Questions Before We Start:

1. **Do you have a GoCardless sandbox account?** (for testing)
2. **Should I start with sandbox or go straight to live?**
3. **Do you want the connection UI in Settings → Integrations → Payments?** (same place as Stripe)

Let me know and I'll start building! 🚀

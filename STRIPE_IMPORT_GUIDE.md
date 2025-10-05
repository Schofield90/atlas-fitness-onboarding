# Stripe Import & Financial Reporting Guide

## Overview

This system eliminates the need for clunky GoTeamUp CSV imports by directly importing payment and subscription data from Stripe, then automatically creating membership plans and assigning customers.

## Features

✅ **Direct Stripe Integration** - No more manual CSV exports
✅ **Auto-Create Membership Plans** - Plans created from Stripe prices automatically
✅ **Auto-Assign Customers** - Customers linked to their subscription plans
✅ **Historical Payment Data** - Import all past charges from Stripe
✅ **Enhanced Financial Reports** - MRR, ARR, churn rate, and more

## Architecture

### Data Flow

```
Stripe Account (via API key)
    ↓
1. Import Charges → payments table
2. Import Subscriptions → membership_plans table (auto-created)
    ↓
3. Auto-assign → customer_memberships table
    ↓
4. Financial Reports → Stripe-powered analytics
```

### Database Tables

- **`payments`** - All Stripe charges (from Phase 1)
- **`membership_plans`** - Auto-created from Stripe prices (Phase 2)
  - `stripe_price_id` - Links to Stripe price
  - `stripe_product_id` - Stored in metadata
- **`customer_memberships`** - Customer → Plan assignments (Phase 3)
  - `stripe_subscription_id` - Links to Stripe subscription
- **`clients`** - Updated with subscription status
  - `stripe_customer_id` - Links to Stripe customer
  - `stripe_subscription_id` - Current subscription
  - `subscription_status` - "active", "trialing", "cancelled"

## API Endpoints

### 1. Import Stripe Charges (Payment History)

**Endpoint**: `POST /api/gym/stripe-connect/import/charges`

**Purpose**: Import historical payment data from Stripe charges

**Request Body**:

```json
{
  "organizationId": "uuid",
  "startDate": "2024-01-01", // Optional: YYYY-MM-DD
  "endDate": "2024-12-31", // Optional: YYYY-MM-DD
  "limit": 100, // Optional: default 100
  "startingAfter": "ch_xxx" // Optional: for pagination
}
```

**Response**:

```json
{
  "success": true,
  "stats": {
    "total": 150,
    "imported": 145,
    "skipped": 5,
    "totalAmount": 12450.0,
    "hasMore": true,
    "nextStartingAfter": "ch_xyz"
  },
  "message": "Imported 145 charges totaling 12450.00 GBP"
}
```

**Features**:

- Automatically links payments to clients via `stripe_customer_id`
- **Auto-creates archived clients** for historical customers not in CRM
- Skips duplicate charges (checks `charge_id`)
- Only imports successful charges (`status = 'succeeded'`)
- Stores full payment metadata (receipt URL, billing details, etc.)
- Supports pagination for large datasets

**Auto-Create Archived Clients**:
When importing charges, if a Stripe customer is not found in your CRM:

1. Fetches customer details from Stripe API
2. Creates new client record with:
   - Name, email, phone from Stripe
   - `status = 'archived'` (won't show in active client lists)
   - `source = 'stripe_import'` (tracks origin)
   - Original Stripe creation date
3. Links payment to newly created client

**Why This Matters**:

- ✅ Complete historical revenue (payments from customers who left 5 years ago)
- ✅ Accurate long-term financial reports
- ✅ No manual client creation needed
- ✅ Archived clients don't clutter active lists

---

### 2. Import Subscriptions (Auto-Create Plans & Assign)

**Endpoint**: `POST /api/gym/stripe-connect/import/subscriptions`

**Purpose**: Import subscriptions, auto-create membership plans, and assign customers

**Request Body**:

```json
{
  "organizationId": "uuid"
}
```

**Response**:

```json
{
  "success": true,
  "stats": {
    "total": 200,
    "active": 180,
    "plansCreated": 5,
    "membershipsCreated": 175,
    "clientsUpdated": 180
  },
  "message": "Imported 180 subscriptions, created 5 new plans, and assigned 175 memberships"
}
```

**What It Does**:

#### Phase 1: Auto-Create Membership Plans

- Extracts unique Stripe prices from all subscriptions
- Fetches product details from Stripe API
- Creates membership plans with:
  - Name from Stripe product name
  - Price from Stripe price amount
  - Billing period (weekly, monthly, quarterly, yearly)
  - `stripe_price_id` for matching
  - Metadata with Stripe product ID and import timestamp
- Skips plans that already exist for that price

#### Phase 2: Auto-Assign Customer Memberships

- Links Stripe customers to CRM clients via `stripe_customer_id`
- Updates client subscription status and renewal date
- Matches subscription prices to auto-created plans
- Creates `customer_memberships` records with:
  - Status: "active" or "trial"
  - Stripe subscription ID
  - Start and next billing dates
- Updates existing memberships instead of creating duplicates

**Billing Period Detection**:

- `year` → "yearly"
- `month` + `interval_count=3` → "quarterly"
- `month` → "monthly"
- `week` → "weekly"

---

### 3. Stripe Revenue Report

**Endpoint**: `GET /api/reports/stripe-revenue?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`

**Purpose**: Enhanced financial reporting using Stripe data

**Query Parameters**:

- `startDate` (optional) - Default: 30 days ago
- `endDate` (optional) - Default: today

**Response**:

```json
{
  "success": true,
  "summary": {
    "totalRevenue": 45600.0,
    "mrr": 3800.0,
    "arr": 45600.0,
    "activeSubscriptions": 95,
    "trialSubscriptions": 12,
    "paymentSuccessRate": 97.5,
    "churnRate": 2.3,
    "averageCustomerValue": 40.0,
    "dateRange": {
      "start": "2024-01-01T00:00:00Z",
      "end": "2024-12-31T23:59:59Z"
    }
  },
  "revenueByMethod": [
    { "method": "card", "amount": 42000.0 },
    { "method": "bank_transfer", "amount": 3600.0 }
  ],
  "revenueByPlan": [
    {
      "planId": "uuid",
      "name": "Premium Membership",
      "revenue": 28500.0,
      "subscriptions": 75,
      "mrr": 380.0
    }
  ],
  "dailyTrend": [
    { "date": "2024-01-01", "revenue": 1200.0 },
    { "date": "2024-01-02", "revenue": 1350.0 }
  ],
  "metrics": {
    "totalPayments": 456,
    "averageTransactionValue": 100.0,
    "totalCustomers": 120,
    "customersWithSubscriptions": 107
  }
}
```

**Metrics Explained**:

- **MRR (Monthly Recurring Revenue)**: Total monthly revenue from active subscriptions
- **ARR (Annual Recurring Revenue)**: MRR × 12
- **Payment Success Rate**: Percentage of successful payments (all time)
- **Churn Rate**: Percentage of cancelled subscriptions in date range
- **Average Customer Value**: MRR per customer

---

## Usage Flow

### Initial Setup (One-Time)

1. **Connect Stripe Account**
   - Navigate to Settings → Integrations → Payments
   - Choose "Connect Existing Account"
   - Enter Stripe API key (sk_live_xxx or sk_test_xxx)
   - System validates and stores connection

### Import Historical Data

2. **Import Past Payments**

   ```bash
   curl -X POST https://login.gymleadhub.co.uk/api/gym/stripe-connect/import/charges \
     -H "Content-Type: application/json" \
     -d '{
       "organizationId": "your-org-id",
       "startDate": "2023-01-01",
       "endDate": "2024-12-31"
     }'
   ```

3. **Import Subscriptions & Auto-Create Plans**
   ```bash
   curl -X POST https://login.gymleadhub.co.uk/api/gym/stripe-connect/import/subscriptions \
     -H "Content-Type: application/json" \
     -d '{"organizationId": "your-org-id"}'
   ```

### View Financial Reports

4. **Access Stripe Revenue Report**
   ```bash
   curl "https://login.gymleadhub.co.uk/api/reports/stripe-revenue?startDate=2024-01-01&endDate=2024-12-31"
   ```

---

## Troubleshooting

### Issue: "Stripe account not connected"

**Solution**: Ensure Stripe API key is configured in Settings → Integrations → Payments

### Issue: "Client not found for Stripe customer"

**Solution**: Import clients from GoTeamUp first, ensuring `stripe_customer_id` is populated

### Issue: "No membership plan found for price"

**Solution**: Run subscription import again - plans are auto-created on first run

### Issue: Duplicate memberships

**Solution**: The system checks for existing memberships by `client_id` + `membership_plan_id` and updates instead of duplicating

---

## Security Notes

- ✅ All endpoints use `requireOrgAccess()` for authentication
- ✅ Organization-level data isolation via RLS
- ✅ Stripe API keys stored securely in `stripe_connect_accounts` table
- ✅ Admin client used to bypass RLS for import operations
- ⚠️ **TODO**: Encrypt Stripe API keys in production

---

## Performance

- **Timeout**: 60 seconds per request
- **Batch Size**: 100 records per Stripe API call
- **Pagination**: Supported for large datasets (charges endpoint)
- **Duplicate Prevention**: Checks existing records before insert
- **Optimization**: Uses admin client to bypass RLS during bulk imports

---

## Migration Path from GoTeamUp

### Old Process (Deprecated)

1. Export CSV from GoTeamUp
2. Upload to `/dashboard/import`
3. Parse CSV and import

### New Process (Recommended)

1. Connect Stripe account (one-time)
2. Import charges (historical payments)
3. Import subscriptions (auto-creates plans and assigns customers)
4. View enhanced financial reports

**Benefits**:

- ✅ No manual CSV exports
- ✅ Real-time data from Stripe
- ✅ Automatic plan creation
- ✅ Accurate MRR/ARR tracking
- ✅ Better financial insights

---

## Next Steps

1. ✅ Import charges endpoint - COMPLETED
2. ✅ Enhanced subscription import - COMPLETED
3. ✅ Stripe revenue reports - COMPLETED
4. ⏳ Add UI for import progress
5. ⏳ Schedule automatic daily sync
6. ⏳ Add webhook handling for real-time updates
7. ⏳ Encrypt API keys in database

---

_Last Updated: October 5, 2025_
_Status: Production Ready_

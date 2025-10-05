# GoCardless Integration - Complete Setup Guide

## ✅ Implementation Complete

All GoCardless integration endpoints are now ready to use!

---

## Step 1: Get Your GoCardless API Key

### For Existing GoCardless Accounts:

**Sandbox (Testing)**:

1. Go to https://manage-sandbox.gocardless.com/
2. Sign in with your sandbox account
3. Navigate to **Developers** → **Create** → **Access Token**
4. Copy token (starts with `sandbox_`)

**Live (Production)**:

1. Go to https://manage.gocardless.com/
2. Sign in with your live account
3. Navigate to **Developers** → **Create** → **Access Token**
4. Copy token (starts with `live_`)

---

## Step 2: Connect Your GoCardless Account

### Via API (for testing):

```bash
curl -X POST https://login.gymleadhub.co.uk/api/gym/gocardless/connect-existing \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie" \
  -d '{
    "apiKey": "live_xxx_your_api_key_here"
  }'
```

**Response:**

```json
{
  "success": true,
  "message": "GoCardless account connected successfully",
  "creditor": {
    "id": "CR123",
    "name": "Atlas Fitness",
    "country": "GB",
    "verified": true
  },
  "environment": "live"
}
```

### Via UI (once built):

1. Go to Settings → Integrations → Payments
2. Find "GoCardless" section
3. Choose "Connect Existing Account"
4. Enter your API key
5. Click "Connect"

---

## Step 3: Check Connection Status

```bash
curl https://login.gymleadhub.co.uk/api/gym/gocardless/status
```

**Response:**

```json
{
  "connected": true,
  "environment": "live",
  "connectedAt": "2025-01-05T10:00:00Z",
  "creditor": {
    "id": "CR123",
    "name": "Atlas Fitness",
    "country": "GB",
    "verified": true
  }
}
```

---

## Step 4: Import Historical Data

### A. Import Subscriptions (Required)

This will:

- Auto-create membership plans from GoCardless subscriptions
- Link clients to their subscription plans
- Update client subscription status

```bash
curl -X POST https://login.gymleadhub.co.uk/api/gym/gocardless/import/subscriptions \
  -H "Content-Type: application/json" \
  -d '{
    "organizationId": "your-org-id"
  }'
```

**Response:**

```json
{
  "success": true,
  "stats": {
    "total": 150,
    "active": 142,
    "plansCreated": 4,
    "membershipsCreated": 138,
    "clientsUpdated": 142
  },
  "message": "Imported 142 subscriptions, created 4 new plans, and assigned 138 memberships"
}
```

### B. Import Payments (Optional - for historical reporting)

This will:

- Import all successful payments from GoCardless
- Auto-create archived clients for historical customers
- Enable complete revenue reporting

```bash
curl -X POST https://login.gymleadhub.co.uk/api/gym/gocardless/import/payments \
  -H "Content-Type: application/json" \
  -d '{
    "organizationId": "your-org-id",
    "startDate": "2020-01-01",
    "endDate": "2025-12-31"
  }'
```

**Response:**

```json
{
  "success": true,
  "stats": {
    "total": 1250,
    "imported": 1245,
    "skipped": 5,
    "clientsCreated": 23,
    "totalAmount": 124500.0
  },
  "message": "Imported 1245 payments totaling 124500.00 GBP. Auto-created 23 archived clients."
}
```

---

## Database Schema

### Tables Modified:

**`payment_provider_accounts`** (New):

- Stores GoCardless and Stripe connections
- One row per organization per provider
- Columns: `provider`, `access_token`, `environment`, `metadata`

**`payments`** (Enhanced):

- `payment_provider` - "gocardless" or "stripe"
- `provider_payment_id` - GoCardless payment ID

**`customer_memberships`** (Enhanced):

- `payment_provider` - "gocardless" or "stripe"
- `provider_subscription_id` - GoCardless subscription ID

**`membership_plans`** (Enhanced):

- `payment_provider` - "gocardless" or "stripe"
- `provider_price_id` - GoCardless subscription template ID

---

## API Endpoints

### 1. Connect Existing Account

`POST /api/gym/gocardless/connect-existing`

- Validates API key by fetching creditor details
- Stores connection in database
- Returns creditor info and environment

### 2. Check Connection Status

`GET /api/gym/gocardless/status`

- Returns connection status and creditor details
- Used by UI to show connection state

### 3. Import Subscriptions

`POST /api/gym/gocardless/import/subscriptions`

- Fetches all subscriptions from GoCardless
- Auto-creates membership plans from subscription amounts
- Links clients to plans via `customer_memberships`

### 4. Import Payments

`POST /api/gym/gocardless/import/payments`

- Fetches payments from GoCardless (with date filtering)
- Auto-creates archived clients for historical customers
- Stores in `payments` table with `payment_provider='gocardless'`

---

## Multi-Provider Financial Reports

Once both Stripe AND GoCardless are connected, your financial reports will show:

- **Combined Revenue**: Total from both providers
- **Revenue by Provider**: Stripe vs GoCardless breakdown
- **Unified MRR/ARR**: Across all payment sources
- **Complete Payment History**: 5+ years of data

Example report response:

```json
{
  "summary": {
    "totalRevenue": 250000.0,
    "mrr": 15000.0,
    "arr": 180000.0
  },
  "revenueByProvider": [
    { "provider": "stripe", "amount": 150000.0, "percentage": 60 },
    { "provider": "gocardless", "amount": 100000.0, "percentage": 40 }
  ]
}
```

---

## Key Features

### Auto-Create Archived Clients

When importing payments, if a customer is not found in your CRM:

1. Fetches customer details from GoCardless
2. Creates client with:
   - Name, email, phone from GoCardless
   - `status = 'archived'` (won't show in active lists)
   - `source = 'gocardless_import'`
3. Links payment to newly created client

**Benefits**:

- ✅ Complete historical revenue (even from customers who left 5 years ago)
- ✅ No manual client creation needed
- ✅ Archived clients don't clutter your active client list

### Auto-Create Membership Plans

When importing subscriptions:

1. Extracts unique subscription amounts and intervals
2. Creates membership plans automatically
3. Links via `provider_price_id` for matching

### Duplicate Prevention

- Checks for existing payments by `provider_payment_id`
- Checks for existing memberships by `client_id` + `membership_plan_id`
- Updates instead of creating duplicates

---

## Next Steps

### Immediate:

- ✅ Database migration applied
- ✅ API endpoints created
- ✅ Import logic implemented
- ⏳ Create UI for connection flow (Settings → Integrations)
- ⏳ Update financial reports for multi-provider

### Future Enhancements:

- OAuth flow for new GoCardless accounts
- Webhook handling for real-time updates
- Automatic daily sync
- Direct Debit mandate management UI

---

## Testing Checklist

1. **Connect Account**:

   ```bash
   POST /api/gym/gocardless/connect-existing
   # Should return success with creditor details
   ```

2. **Check Status**:

   ```bash
   GET /api/gym/gocardless/status
   # Should show connected: true
   ```

3. **Import Subscriptions**:

   ```bash
   POST /api/gym/gocardless/import/subscriptions
   # Should create plans and assign memberships
   ```

4. **Import Payments**:

   ```bash
   POST /api/gym/gocardless/import/payments
   # Should import historical payments
   ```

5. **Verify Database**:

   ```sql
   -- Check payment provider accounts
   SELECT * FROM payment_provider_accounts WHERE provider = 'gocardless';

   -- Check imported payments
   SELECT COUNT(*) FROM payments WHERE payment_provider = 'gocardless';

   -- Check memberships
   SELECT COUNT(*) FROM customer_memberships WHERE payment_provider = 'gocardless';
   ```

---

**Status**: ✅ Backend Complete | ⏳ UI Pending
**Last Updated**: October 5, 2025

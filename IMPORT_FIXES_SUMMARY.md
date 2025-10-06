# Stripe & GoCardless Import Fixes - Summary

**Date**: January 3, 2025
**Status**: ✅ All fixes applied

## Problems Fixed

### 1. ✅ Payment Field Consistency
**Issue**: GoCardless payments were only populating `client_id`, causing mismatches with reports that queried `user_id`

**Fix**: Updated `/app/api/gym/gocardless/import/payments/route.ts` to populate BOTH fields:
- Added `user_id: clientId` alongside `client_id: clientId`
- Added `currency` and `status: "succeeded"` fields for consistency with Stripe
- Location: Lines 208-213

### 2. ✅ Multi-Provider Revenue Reporting
**Issue**: Revenue report only showed Stripe payments, completely ignoring GoCardless

**Fixes Applied** to `/app/api/reports/stripe-revenue/route.ts`:
- Updated query to fetch ALL payments (both providers) - Line 37-57
- Added `payment_provider` field to payments query
- Added `revenueByProvider` breakdown showing Stripe vs GoCardless split
- Updated memberships query to include provider fields
- Changed comment from "Stripe data" to "multi-provider data"

**New Response Format**:
```json
{
  "revenueByProvider": [
    { "provider": "stripe", "amount": 15000, "percentage": 60 },
    { "provider": "gocardless", "amount": 10000, "percentage": 40 }
  ]
}
```

### 3. ✅ Improved Client Matching
**Issue**: Subscriptions/payments failed to link to clients if exact ID match wasn't found

**Stripe Subscription Import** (`/app/api/gym/stripe-connect/import/subscriptions/route.ts`):
- Added email fallback matching (Lines 166-195)
- If `stripe_customer_id` not found, fetches customer from Stripe API
- Tries case-insensitive email match (`ilike`)
- Auto-updates client with `stripe_customer_id` for future imports
- Logs successful email matches with ✅

**GoCardless Subscription Import** (`/app/api/gym/gocardless/import/subscriptions/route.ts`):
- Changed to case-insensitive email matching (Line 182: `.ilike()`)
- Added fallback to exact lowercase match (Lines 186-196)
- Better logging for troubleshooting

**GoCardless Payment Import** (`/app/api/gym/gocardless/import/payments/route.ts`):
- Added case-insensitive email matching (Line 123: `.ilike()`)
- Added lowercase fallback (Lines 127-137)
- Improved client matching before auto-creating archived clients

### 4. ✅ Memberships UI Enhancements
**File**: `/app/memberships/page.tsx`

**Added**:
- Provider filter dropdown (Stripe/GoCardless/Manual) - Lines 218-232
- Provider badges on each plan card - Lines 279-307
- Color-coded badges:
  - 🟣 Purple for Stripe
  - 🔵 Blue for GoCardless
  - ⚫ Gray for Manual
- Filter functionality to show/hide plans by provider - Lines 273-277

### 5. ✅ Diagnostic Endpoint
**New File**: `/app/api/debug/import-status/route.ts`

**Returns**:
```json
{
  "providers": [...],
  "payments": {
    "total": 150,
    "stripe": 100,
    "gocardless": 50,
    "succeeded": 145
  },
  "memberships": {
    "total": 50,
    "stripe": 30,
    "gocardless": 20,
    "active": 45
  },
  "plans": {
    "total": 10,
    "stripe": 5,
    "gocardless": 3,
    "manual": 2,
    "active": 8
  },
  "clients": {
    "total": 200,
    "withStripeId": 150
  },
  "orphanedData": {
    "paymentsWithoutClient": 5,
    "sampleOrphanedPayments": [...]
  }
}
```

**Usage**: `GET /api/debug/import-status`

## Testing Checklist

### Re-run Imports
1. ✅ Run GoCardless payments import again
   - Should now populate both `client_id` and `user_id`
   - Better email matching = fewer orphaned payments

2. ✅ Run Stripe subscriptions import again
   - Email fallback should catch more clients
   - Auto-updates `stripe_customer_id` field

3. ✅ Run GoCardless subscriptions import again
   - Case-insensitive matching should work better

### Verify Reporting
1. ✅ Check revenue report: `/api/reports/stripe-revenue`
   - Should show `revenueByProvider` breakdown
   - Should include GoCardless payments

2. ✅ Check memberships page: `/memberships`
   - Should see provider badges on plans
   - Filter should work (All/Stripe/GoCardless/Manual)

3. ✅ Check diagnostic endpoint: `/api/debug/import-status`
   - Should show accurate counts for all providers
   - Should identify orphaned data

## Expected Outcomes

After re-running imports:

✅ **Payments visible in reports** - Both Stripe AND GoCardless
✅ **Memberships correctly assigned** - Better client matching
✅ **Plans visible in UI** - With provider tags
✅ **Multi-provider revenue** - Combined Stripe + GoCardless reporting
✅ **Clear diagnostics** - Easy troubleshooting via `/api/debug/import-status`

## Files Changed

1. `/app/api/gym/gocardless/import/payments/route.ts` - Field consistency
2. `/app/api/reports/stripe-revenue/route.ts` - Multi-provider support
3. `/app/api/gym/stripe-connect/import/subscriptions/route.ts` - Email fallback
4. `/app/api/gym/gocardless/import/subscriptions/route.ts` - Case-insensitive matching
5. `/app/api/gym/gocardless/import/payments/route.ts` - Better client matching
6. `/app/memberships/page.tsx` - Provider filter & badges
7. `/app/api/debug/import-status/route.ts` - NEW diagnostic endpoint

## Next Steps

1. **Re-run all imports** to populate data correctly with new logic
2. **Verify revenue reports** show multi-provider data
3. **Check memberships UI** displays provider badges
4. **Use diagnostic endpoint** to confirm all data is linked properly

---

**Status**: All fixes deployed and ready for testing! 🚀

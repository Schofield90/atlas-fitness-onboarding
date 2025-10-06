# Billing Migration Guide: GoTeamUp → CRM

## Problem Statement

Running GoTeamUp and the new CRM side-by-side creates a risk of **double billing** clients since both systems could trigger charges for the same membership.

## Solution: Billing Source Control

A safety system that tracks which platform handles billing for each client, ensuring only ONE system charges them.

---

## How It Works

### 1. Billing Source Field

Every membership has a `billing_source` field:
- **`goteamup`** ← Default for imports - GoTeamUp is billing this client
- **`crm`** - CRM should bill this client
- **`stripe`** - Direct Stripe subscription (not GoTeamUp)
- **`gocardless`** - Direct GoCardless subscription (not GoTeamUp)

### 2. CRM Billing Logic

```typescript
// Before charging ANY client, CRM checks:
if (membership.billing_source !== 'crm') {
  // SKIP - Another system is handling this
  return;
}

if (membership.billing_paused) {
  // SKIP - Billing paused for this client
  return;
}

if (!orgSettings.allow_auto_billing) {
  // SKIP - Auto-billing disabled org-wide
  return;
}

// Safe to charge
processPayment(membership);
```

### 3. Organization-Level Control

Settings at `/settings/billing-migration`:

**Billing Modes:**
- **GoTeamUp Mode** (Default): CRM never charges anyone
- **Hybrid Mode**: Per-client control (testing phase)
- **CRM Mode**: CRM handles all billing

**Safety Switches:**
- `allow_auto_billing`: Global kill switch (default: OFF)
- `require_manual_approval`: All charges need approval

---

## Migration Workflow

### Phase 1: Import & Setup (Week 1)

1. **Import clients from GoTeamUp**
   ```
   Go to: /dashboard/import
   Upload: GoTeamUp customer CSV
   Result: All memberships set to billing_source='goteamup'
   ```

2. **Verify Settings**
   ```
   Go to: /settings/billing-migration
   Check: billing_mode = 'goteamup'
   Check: allow_auto_billing = false
   ```

3. **Connect Payment Providers**
   ```
   Go to: /settings/integrations/payments
   Connect: Stripe (API key or OAuth)
   Connect: GoCardless (API key or OAuth)
   ```

**Status:** ✅ CRM will NOT charge anyone. GoTeamUp continues handling all billing.

---

### Phase 2: Hybrid Testing (Week 2-3)

1. **Start Migration**
   ```
   Go to: /settings/billing-migration
   Click: "Start Migration"
   Result: billing_mode changes to 'hybrid'
   ```

2. **Test with Selected Clients**

   Pick 5-10 friendly clients for testing:

   ```sql
   -- Update test clients to CRM billing
   UPDATE customer_memberships
   SET billing_source = 'crm'
   WHERE client_id IN (
     SELECT id FROM clients
     WHERE email IN ('test1@example.com', 'test2@example.com')
   );
   ```

3. **Monitor Test Charges**
   - Check Stripe/GoCardless dashboards
   - Verify NO duplicate charges
   - Confirm GoTeamUp stopped charging these clients

4. **Enable Auto-Billing (Optional)**
   ```
   Go to: /settings/billing-migration
   Toggle: allow_auto_billing = true (only if testing successful)
   ```

**Status:** 🔄 CRM charges 5-10 test clients. GoTeamUp charges everyone else.

---

### Phase 3: Full Migration (Week 4)

1. **Disable GoTeamUp Billing**
   ```
   In GoTeamUp dashboard:
   - Pause all subscriptions
   - OR cancel payment schedules
   - OR disable payment processing
   ```

2. **Complete Migration**
   ```
   Go to: /settings/billing-migration
   Click: "Complete Migration"
   Confirms: Switch ALL clients to CRM billing
   ```

   This will:
   - Set `billing_mode = 'crm'`
   - Update ALL memberships to `billing_source = 'crm'`
   - Enable `allow_auto_billing = true`

3. **Monitor First Billing Cycle**
   - Check all charges processed
   - Verify amounts match expected
   - Handle any failed payments

**Status:** ✅ CRM handles all billing. GoTeamUp disabled.

---

## Safety Features

### Individual Client Controls

Pause billing for specific client:
```sql
UPDATE customer_memberships
SET
  billing_paused = true,
  billing_paused_reason = 'Payment issue - contacting client',
  billing_paused_at = NOW()
WHERE client_id = 'abc-123';
```

Resume billing:
```sql
UPDATE customer_memberships
SET
  billing_paused = false,
  billing_paused_reason = NULL,
  billing_paused_at = NULL
WHERE client_id = 'abc-123';
```

### Emergency Stop

Pause ALL billing immediately:
```
Go to: /settings/billing-migration
Toggle: allow_auto_billing = false
```

This stops ALL CRM billing org-wide instantly.

### Rollback to GoTeamUp

If issues arise:
```sql
-- Revert all clients back to GoTeamUp
UPDATE customer_memberships
SET billing_source = 'goteamup'
WHERE organization_id = 'your-org-id';

-- Update org settings
UPDATE organization_billing_settings
SET
  billing_mode = 'goteamup',
  allow_auto_billing = false,
  migration_status = 'rolled_back'
WHERE organization_id = 'your-org-id';
```

Re-enable billing in GoTeamUp.

---

## Database Schema

### customer_memberships

```sql
billing_source VARCHAR(50) DEFAULT 'goteamup'
  -- Which system handles billing

billing_paused BOOLEAN DEFAULT false
  -- Per-client pause switch

billing_paused_reason TEXT
  -- Why paused (shown to staff)

billing_paused_at TIMESTAMPTZ
  -- When paused

billing_paused_by UUID
  -- Staff member who paused
```

### organization_billing_settings

```sql
billing_mode VARCHAR(50) DEFAULT 'goteamup'
  -- 'goteamup' | 'crm' | 'hybrid'

require_manual_approval BOOLEAN DEFAULT true
  -- All charges need approval?

allow_auto_billing BOOLEAN DEFAULT false
  -- Global kill switch

migration_status VARCHAR(50) DEFAULT 'not_started'
  -- 'not_started' | 'in_progress' | 'completed' | 'rolled_back'
```

---

## API Endpoints

### Get Settings
```bash
GET /api/settings/billing-migration?organizationId={id}

Response:
{
  "success": true,
  "settings": {
    "billing_mode": "goteamup",
    "require_manual_approval": true,
    "allow_auto_billing": false,
    "migration_status": "not_started"
  }
}
```

### Update Settings
```bash
PUT /api/settings/billing-migration

Body:
{
  "organizationId": "abc-123",
  "billing_mode": "hybrid",
  "allow_auto_billing": true
}

Response:
{
  "success": true,
  "settings": { ... }
}
```

### Get Stats
```bash
GET /api/settings/billing-migration/stats?organizationId={id}

Response:
{
  "success": true,
  "stats": {
    "total": 150,
    "goteamup": 145,
    "crm": 5,
    "paused": 2
  }
}
```

---

## Frequently Asked Questions

### Q: What happens if I run import while CRM is already billing?

**A:** All imported memberships default to `billing_source='goteamup'`, so CRM won't charge them. Safe to import anytime.

### Q: Can I test with just one client?

**A:** Yes! Set that one client to `billing_source='crm'` and everyone else stays on GoTeamUp.

### Q: What if CRM charges fail?

**A:** If `require_manual_approval=true`, failed charges are flagged for manual retry. If `allow_auto_billing=false`, no charges happen at all.

### Q: How do I know which clients are on which system?

**A:** Visit `/settings/billing-migration` to see:
- Total memberships
- How many on GoTeamUp billing
- How many on CRM billing
- How many paused

### Q: Can I migrate some memberships and not others?

**A:** Yes! That's exactly what Hybrid Mode is for. Useful for:
- Different membership types (monthly vs annual)
- Different locations
- VIP clients vs regular members

### Q: What happens to payment history?

**A:** Historical payments remain in the database regardless of billing_source. Reports show ALL payments from all sources.

---

## Troubleshooting

### Client charged twice

1. Check billing_source for that client
2. Check if GoTeamUp AND CRM both think they're billing
3. Immediately pause one system:
   ```sql
   UPDATE customer_memberships
   SET billing_paused = true
   WHERE client_id = 'affected-client';
   ```
4. Issue refund from whichever system shouldn't have charged
5. Verify billing_source is correct going forward

### CRM not charging anyone

Check these in order:
1. `allow_auto_billing` = true?
2. `billing_mode` = 'crm' or 'hybrid'?
3. Client's `billing_source` = 'crm'?
4. Client's `billing_paused` = false?
5. Payment provider connected?

### Can't find billing settings

Settings page: `https://login.gymleadhub.co.uk/settings/billing-migration`

If page doesn't exist, verify deployment included these files:
- `/app/settings/billing-migration/page.tsx`
- `/app/api/settings/billing-migration/route.ts`
- Database migration applied

---

## Support Checklist

Before contacting support, gather:

- [ ] Organization ID
- [ ] Current billing_mode
- [ ] Number of memberships by source (from stats page)
- [ ] Example affected client ID
- [ ] Screenshots of error messages
- [ ] Database query results:
  ```sql
  SELECT billing_source, billing_paused, COUNT(*)
  FROM customer_memberships
  WHERE organization_id = 'your-org-id'
  GROUP BY billing_source, billing_paused;
  ```

---

## Summary

✅ **Safe to run GoTeamUp and CRM simultaneously**
✅ **No risk of double billing with proper setup**
✅ **Gradual migration supported (Hybrid Mode)**
✅ **Emergency stop available anytime**
✅ **Full rollback possible**

**Default State:** Everything imports with `billing_source='goteamup'`, so CRM won't charge anyone unless you explicitly switch them to `'crm'`.

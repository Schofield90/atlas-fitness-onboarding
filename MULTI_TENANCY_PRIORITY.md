# Multi-Tenancy Priority Fixes for Atlas Fitness

## Current State
The application was built initially for single-tenant use and needs updates to support 100+ organizations properly. All booking and calendar features are now working, but the codebase has hard-coded IDs and missing tenant isolation.

## Critical Issues to Fix First (Phase 1)

### 1. Hard-coded Organization IDs (URGENT)
**Files with hard-coded `63589490-8f55-4157-bd3a-e141594b748e`:**
- `/app/api/booking-by-slug/book/route.ts:56` - Default org ID in booking fallback
- `/app/api/booking-by-slug/book/route.ts:96` - Lead creation fallback
- `/app/api/leads/route.ts:31` - Default org in lead creation
- `/app/api/customers/[id]/route.ts:113` - Customer update
- `/app/api/customers/route.ts:34` - Customer creation
- `/app/api/integrations/facebook/route.ts:49` - FB integration
- `/app/api/integrations/facebook/leads/route.ts:111` - FB lead sync
- `/app/api/integrations/facebook/forms/route.ts:39` - FB forms
- `/app/api/integrations/facebook/test-forms/route.ts:46` - FB test
- `/app/api/n8n/webhook/route.ts:37` - Webhook handler
- `/app/components/forms/EditCustomerForm.tsx:47` - Customer form
- `/app/components/forms/NewCustomerForm.tsx:39` - New customer form
- `/app/leads/page.tsx:23` - Leads page default
- `/app/customers/page.tsx:24` - Customers page default

**Fix:** Replace with dynamic organization ID from user session

### 2. Database Column Standardization
**Tables using `org_id` instead of `organization_id`:**
- `leads` table
- `customers` table  
- `facebook_leads` table
- `calendar_events` table
- `tasks` table
- `notes` table
- `email_templates` table
- `automations` table
- `workout_programs` table
- `exercises` table
- `facebook_integrations` table

**Fix:** Migrate all to use `organization_id` for consistency

### 3. Missing Row Level Security (RLS)
**Tables without RLS policies:**
- `booking_links`
- `appointment_types`
- `calendar_settings`
- `google_calendar_tokens`
- `facebook_integrations`
- `integrations`
- `automations`
- `workout_programs`
- `exercises`

**Fix:** Add RLS policies to ensure data isolation

## Quick Wins (Can be done immediately)

### API Route Organization Filtering
Add organization filtering to these routes:
```typescript
// Example fix pattern:
const { data: { user } } = await supabase.auth.getUser()
const { data: profile } = await supabase
  .from('profiles')
  .select('organization_id')
  .eq('id', user.id)
  .single()

// Then use profile.organization_id in queries
```

Routes needing this:
- `/app/api/leads/route.ts`
- `/app/api/customers/route.ts`
- `/app/api/calendar/events/route.ts`
- `/app/api/booking-links/route.ts`
- `/app/api/integrations/facebook/route.ts`

### Performance Issues to Fix
1. **N+1 Queries:**
   - `/app/leads/page.tsx` - Fetches notes/tasks separately for each lead
   - `/app/customers/page.tsx` - Same issue with customer data
   
2. **Missing Pagination:**
   - All list pages load entire datasets
   - Add limit/offset or cursor pagination

## Testing Checklist for Multi-Tenancy

After fixes, test these scenarios:
- [ ] User A cannot see User B's leads
- [ ] User A cannot see User B's customers  
- [ ] User A cannot see User B's calendar events
- [ ] User A cannot see User B's booking links
- [ ] User A cannot modify User B's data via API
- [ ] Booking links work for correct organization only
- [ ] Facebook integrations isolated per organization
- [ ] Automations run only for correct organization

## Next Session Starting Point

1. Start with fixing hard-coded organization IDs in API routes
2. Add helper function to get organization ID from session:
```typescript
// /app/lib/auth/get-org-id.ts
export async function getOrgId(supabase: SupabaseClient, userId: string) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', userId)
    .single()
  
  if (!profile?.organization_id) {
    throw new Error('No organization found for user')
  }
  
  return profile.organization_id
}
```

3. Update all API routes to use this helper
4. Test each fix before moving to next

## Commands to Run
```bash
# Check for hard-coded IDs
grep -r "63589490-8f55-4157-bd3a-e141594b748e" app/

# Find org_id usage
grep -r "org_id" app/ --include="*.ts" --include="*.tsx"

# Test multi-tenancy
# Create test users in different orgs and verify isolation
```

## Success Metrics
- Zero hard-coded organization IDs
- All tables use `organization_id` consistently  
- All tables have RLS policies
- No cross-tenant data leaks
- Performance: Pages load in <2s with 10k+ records

---
Ready to implement Phase 1 fixes on next machine.
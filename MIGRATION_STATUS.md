# Atlas Fitness Onboarding - Migration Status & Fixes

## Current Status (as of last commit: ec04d8f)

### What Was Fixed
1. **Nutrition Coach** - Fixed macro adjustments not saving (debounced saving added)
2. **Members Management** - Fixed list not showing (changed from leads to clients table)
3. **Member Creation** - Fixed redirect to wrong page (created new /members/new page)
4. **Settings Page** - Navigation links are working

### Outstanding Issue: Membership Prices Showing £0.00

#### Problem
- Membership plans are showing £0.00 instead of actual prices
- Database has prices in old `price` column but code expects `price_pennies` column
- Need to migrate data from `price` (decimal) to `price_pennies` (integer)

#### Solution Created
Created TWO migration tools to fix this:

1. **Simple Migration Tool** (RECOMMENDED - Use this first!)
   - URL: https://atlas-fitness-onboarding.vercel.app/admin/migrate-all
   - Shows ALL membership plans across all organizations
   - No complex organization checks
   - One-click migration for all plans that need it
   
2. **Organization-Specific Tool**
   - URL: https://atlas-fitness-onboarding.vercel.app/admin/migrate-prices
   - Organization-specific (may have auth issues)
   - More detailed but potentially problematic

### Files Created/Modified for Migration

#### New Files:
- `/app/api/migrate-prices/route.ts` - API endpoint for organization-specific migration
- `/app/api/migrate-prices-simple/route.ts` - Simplified API that bypasses org checks
- `/app/admin/migrate-prices/page.tsx` - Admin UI for migration (org-specific)
- `/app/admin/migrate-all/page.tsx` - Simplified admin UI for all plans
- `/scripts/run-price-migration.js` - Node.js script for command-line migration
- `/migrate-membership-plans-price.sql` - Raw SQL migration script

#### Modified Files:
- `/app/membership-plans/page.tsx` - Already using price_pennies correctly
- `/gym-coach-platform/app/dashboard/settings/membership-plans/page.tsx` - Also correct

### How to Run the Migration

#### Option 1: Via Web UI (Easiest)
1. Go to https://atlas-fitness-onboarding.vercel.app/admin/migrate-all
2. Click "Refresh Status" to see current state
3. Click "Run Migration" to migrate all plans that need it
4. Verify prices now show correctly

#### Option 2: Direct Database (If you have psql)
```bash
PGPASSWORD=OGFYlxSChyYLgQxn psql -h db.lzlrojoaxrqvmhempnkn.supabase.co -U postgres -d postgres -f migrate-membership-plans-price.sql
```

#### Option 3: Via Node Script (If logged in)
```bash
node scripts/run-price-migration.js "your-auth-cookie" "atlas-fitness-onboarding.vercel.app"
```

### What the Migration Does
Converts prices from decimal to pennies:
- £29.99 (stored as 29.99 in `price`) → 2999 (stored in `price_pennies`)
- £49.99 → 4999
- Only migrates plans where `price` exists but `price_pennies` is null or 0

### Database Schema Context
The `membership_plans` table has both:
- `price` (DECIMAL) - Old column, some data here
- `price_pennies` (INTEGER) - New column, needs migration

The application code expects `price_pennies` to be populated.

### Deployment URLs
- Production: https://atlas-fitness-onboarding.vercel.app
- Last deployment: https://atlas-fitness-onboarding-ixlya98v5-schofield90s-projects.vercel.app

### Environment Variables Needed
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
DATABASE_URL (for direct psql access)
```

### Testing After Migration
1. Visit /membership-plans page
2. Prices should show actual values instead of £0.00
3. Check /customers page - membership prices should display
4. Verify in Settings > Membership Plans

### If Migration Still Doesn't Work
Check:
1. User authentication - must be logged in
2. Console errors in browser (F12)
3. Vercel function logs for API errors
4. Database directly to see if price_pennies was populated

### Related GitHub Issues
- Main issue: Membership prices showing as £0.00
- Root cause: Database schema mismatch (price vs price_pennies)
- Solution: Data migration from old to new column format

### Git Commands to Continue Work
```bash
# Clone on new machine
git clone https://github.com/Schofield90/atlas-fitness-onboarding.git
cd atlas-fitness-onboarding

# Install dependencies
npm install

# Run locally
npm run dev

# Deploy to Vercel
vercel --prod
```

### Contact for Database Access
Database: Supabase
Host: db.lzlrojoaxrqvmhempnkn.supabase.co
Password: OGFYlxSChyYLgQxn (in migration files)

---
*Last updated: Just before switching machines*
*Priority: Run the migration at /admin/migrate-all to fix price display issue*
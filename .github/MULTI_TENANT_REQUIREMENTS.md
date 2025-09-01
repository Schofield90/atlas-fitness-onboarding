# 🚨 MANDATORY: Multi-Tenant SaaS Requirements

**THIS IS A MULTI-TENANT SAAS APPLICATION - ALL CODE MUST SUPPORT MULTIPLE ORGANIZATIONS**

## ❌ NEVER DO THIS

### 1. NEVER Hard-code Organization IDs
```typescript
// ❌ WRONG - NEVER DO THIS
const organizationId = '63589490-8f55-4157-bd3a-e141594b748e'

// ✅ CORRECT - Always get from user context
const organizationId = await getUserOrganization(userId)
```

### 2. NEVER Query Without Organization Filter
```typescript
// ❌ WRONG - Returns data from ALL organizations
const leads = await supabase.from('leads').select('*')

// ✅ CORRECT - Filtered by organization
const leads = await supabase
  .from('leads')
  .select('*')
  .eq('organization_id', organizationId)
```

### 3. NEVER Create Tables Without RLS
```sql
-- ❌ WRONG - No security
CREATE TABLE contacts (...)

-- ✅ CORRECT - With RLS
CREATE TABLE contacts (...);
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org isolation" ON contacts 
  USING (organization_id = auth.organization_id());
```

## ✅ ALWAYS DO THIS

### 1. Get Organization from User Context
```typescript
// Create a helper function
import { getUserOrganization } from '@/app/lib/auth/organization'

export async function handler(req: Request) {
  const organizationId = await getUserOrganization()
  // Use organizationId in all queries
}
```

### 2. Use Organization Filter in EVERY Query
```typescript
// Always include organization_id
const result = await supabase
  .from('any_table')
  .select('*')
  .eq('organization_id', organizationId)
```

### 3. Add RLS to Every Table
```sql
-- Template for new tables
CREATE TABLE new_table (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  -- other columns
);

ALTER TABLE new_table ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only see their org data"
  ON new_table FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations 
      WHERE user_id = auth.uid()
    )
  );
```

### 4. Test Multi-Tenancy
Before merging ANY PR, test:
- [ ] Create 2 test organizations
- [ ] Create users in each org
- [ ] Verify User A cannot see User B's data
- [ ] Verify no hard-coded IDs exist

## 🎯 Code Review Checklist

Before approving any code:
1. **No hard-coded organization IDs** - Search for UUID strings
2. **All queries filtered by organization_id**
3. **All new tables have RLS policies**
4. **API routes use getUserOrganization()**
5. **No cross-tenant data leaks**

## 🛠 Required Utilities

### 1. Organization Helper
```typescript
// app/lib/auth/organization.ts
export async function getUserOrganization(userId?: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) throw new Error('Not authenticated')
  
  const { data: profile } = await supabase
    .from('user_organizations')
    .select('organization_id')
    .eq('user_id', userId || user.id)
    .single()
  
  if (!profile?.organization_id) {
    throw new Error('No organization found')
  }
  
  return profile.organization_id
}
```

### 2. API Route Template
```typescript
// Template for ALL API routes
export async function GET(request: Request) {
  try {
    const organizationId = await getUserOrganization()
    
    const result = await supabase
      .from('table_name')
      .select('*')
      .eq('organization_id', organizationId) // ALWAYS filter
    
    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json({ error }, { status: 401 })
  }
}
```

## 🚫 Blocked Patterns

These patterns should NEVER appear in code:
- `'63589490-8f55-4157-bd3a-e141594b748e'` (hard-coded org ID)
- `.select('*')` without `.eq('organization_id', ...)`
- `CREATE TABLE` without `ENABLE ROW LEVEL SECURITY`
- API routes without organization filtering

## 📋 Migration Standards

All migrations must:
1. Use `organization_id` (not `org_id`)
2. Include RLS policies
3. Add foreign key to organizations table
4. Include organization-based indexes

## 🔍 Testing Requirements

Every feature must be tested with:
1. Multiple organizations
2. Multiple users per organization
3. Verification of data isolation
4. Performance with 10,000+ records

## 🚨 Security Alert

**DATA LEAKS = BUSINESS FAILURE**

- One data leak can destroy the entire business
- Always err on the side of over-filtering
- When in doubt, add more security

---

**Remember**: This is a MULTI-TENANT SaaS application. Every line of code must respect organization boundaries.
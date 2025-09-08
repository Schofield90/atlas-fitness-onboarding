# Migration Security Notes

## Critical Issues to Address

### 1. Service Role Key Exposure

**Issue**: All migration scripts contain hardcoded service role keys
**Risk**: Full database access if scripts are committed to version control
**Solution**:

- Move credentials to environment variables
- Use `.env.local` for local development
- Never commit scripts with credentials

### 2. Multi-Tenant Data Isolation

**Issue**: Scripts use hardcoded organization IDs without validation
**Risk**: Could accidentally modify data across different organizations
**Solution**:

- Always validate organization context
- Use RLS policies where possible
- Add organization_id checks to all queries

### 3. Dual Identity Problem (clients vs leads)

**Issue**: Same customer exists with different IDs in different tables
**Risk**: Data inconsistency, booking errors, membership confusion
**Solution**:

- Implement UUID consistency across tables
- Create database triggers for automatic sync
- Add foreign key constraints with proper cascading

## Safe Migration Template

```javascript
#!/usr/bin/env node
require("dotenv").config({ path: ".env.local" });

const { createClient } = require("@supabase/supabase-js");

// Load from environment
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Missing environment variables");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function safeMigration(organizationId, customerId) {
  // Validate inputs
  if (!organizationId || !customerId) {
    throw new Error("Organization ID and Customer ID required");
  }

  try {
    // Always verify organization context
    const { data: customer } = await supabase
      .from("clients")
      .select("organization_id")
      .eq("id", customerId)
      .single();

    if (customer?.organization_id !== organizationId) {
      throw new Error("Customer does not belong to organization");
    }

    // Perform migration within organization boundaries
    // ... migration logic ...
  } catch (error) {
    console.error("Migration failed:", error);
    throw error;
  }
}

// Run with command line args
const [, , orgId, customerId] = process.argv;
if (orgId && customerId) {
  safeMigration(orgId, customerId).catch(console.error);
} else {
  console.log("Usage: node script.js <orgId> <customerId>");
}
```

## Database-Level Solutions

### 1. UUID Synchronization Trigger

```sql
-- Ensure clients and leads use same UUID
CREATE OR REPLACE FUNCTION sync_client_lead_ids()
RETURNS TRIGGER AS $$
BEGIN
  -- When inserting into clients, check/create in leads
  IF TG_TABLE_NAME = 'clients' AND TG_OP = 'INSERT' THEN
    INSERT INTO leads (id, organization_id, name, email, phone, status)
    VALUES (
      NEW.id,
      NEW.organization_id,
      CONCAT(NEW.first_name, ' ', NEW.last_name),
      NEW.email,
      NEW.phone,
      'member'
    )
    ON CONFLICT (id) DO UPDATE
    SET
      name = EXCLUDED.name,
      email = EXCLUDED.email,
      phone = EXCLUDED.phone,
      updated_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_ids_trigger
AFTER INSERT ON clients
FOR EACH ROW
EXECUTE FUNCTION sync_client_lead_ids();
```

### 2. Organization Boundary Enforcement

```sql
-- Add check constraint to ensure bookings stay within org
ALTER TABLE class_bookings
ADD CONSTRAINT booking_org_match
CHECK (
  organization_id = (
    SELECT organization_id
    FROM leads
    WHERE id = customer_id
  )
);
```

### 3. RLS Policy for Multi-Tenant Isolation

```sql
-- Ensure users can only see their organization's data
CREATE POLICY "org_isolation" ON class_bookings
FOR ALL
USING (
  organization_id = (
    SELECT organization_id
    FROM auth.users
    WHERE id = auth.uid()
  )
);
```

## Testing Checklist

- [ ] All scripts use environment variables
- [ ] Organization context validated before operations
- [ ] Customer IDs verified to belong to organization
- [ ] No cross-tenant data access possible
- [ ] Audit trail for all data modifications
- [ ] Rollback strategy defined
- [ ] Backup created before migration

## Production Deployment

1. **Never run scripts with hardcoded credentials**
2. **Always test in staging environment first**
3. **Create database backup before migration**
4. **Run within transaction when possible**
5. **Monitor for cross-tenant data leaks**
6. **Audit all modified records**

---

_Generated to address security vulnerabilities in migration scripts_
_Follows CLAUDE.md security requirements for multi-tenant isolation_

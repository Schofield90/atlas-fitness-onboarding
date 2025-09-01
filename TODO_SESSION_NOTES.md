# Session Notes - September 1, 2025

## Issues Fixed Today

### ✅ Completed Fixes

1. **Contacts Page Not Showing Leads** 
   - Fixed organization association logic to check multiple tables
   - 156 leads exist in database and should now display
   - Updated `/app/contacts/page.tsx` to handle missing organizations

2. **Organization Association Issues**
   - Updated `requireAuth()` in `/app/lib/api/auth-check.ts` to check:
     - `users` table first
     - Falls back to `user_organizations` table
     - Falls back to `organization_members` table  
     - Auto-creates association with default org if missing
   - Created fix scripts in `/scripts/` directory

3. **Lead Creation "Could not find organization" Error**
   - Fixed with improved organization lookup in auth system
   - Now auto-creates organization association if missing

4. **Facebook Integration Page**
   - Verified working correctly - no issues found

5. **Contact Creation Form Issues**
   - Fixed leads table insert - uses `name` field not `first_name/last_name`
   - Improved error handling to show actual error messages
   - Created API endpoint `/api/contacts/route.ts` with better auth

## 🚨 CRITICAL - Manual Actions Required

### 1. Create Contacts Table (MUST DO FIRST!)
The `contacts` table doesn't exist in the database. This is why contact creation fails.

**Steps:**
1. Go to: https://supabase.com/dashboard/project/lzlrojoaxrqvmhempnkn/sql/new
2. Run this SQL:

```sql
-- Create contacts table if it doesn't exist
CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Basic info
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  
  -- Additional info
  company TEXT,
  position TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  country TEXT,
  website TEXT,
  birthday DATE,
  
  -- Communication preferences
  email_opt_in BOOLEAN DEFAULT true,
  sms_opt_in BOOLEAN DEFAULT true,
  whatsapp_opt_in BOOLEAN DEFAULT true,
  
  -- Metadata
  source TEXT DEFAULT 'manual',
  status TEXT DEFAULT 'active',
  tags TEXT[],
  notes TEXT,
  social_media JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_contacts_organization_id ON contacts(organization_id);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);
CREATE INDEX IF NOT EXISTS idx_contacts_phone ON contacts(phone);
CREATE INDEX IF NOT EXISTS idx_contacts_lead_id ON contacts(lead_id);
CREATE INDEX IF NOT EXISTS idx_contacts_client_id ON contacts(client_id);

-- Enable RLS
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DROP POLICY IF EXISTS "Users can view contacts in their organization" ON contacts;
CREATE POLICY "Users can view contacts in their organization"
  ON contacts FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations 
      WHERE user_id = auth.uid()
      UNION
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

DROP POLICY IF EXISTS "Users can create contacts in their organization" ON contacts;
CREATE POLICY "Users can create contacts in their organization"
  ON contacts FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_organizations 
      WHERE user_id = auth.uid()
      UNION
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

DROP POLICY IF EXISTS "Users can update contacts in their organization" ON contacts;
CREATE POLICY "Users can update contacts in their organization"
  ON contacts FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations 
      WHERE user_id = auth.uid()
      UNION
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

DROP POLICY IF EXISTS "Users can delete contacts in their organization" ON contacts;
CREATE POLICY "Users can delete contacts in their organization"
  ON contacts FOR DELETE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations 
      WHERE user_id = auth.uid()
      UNION
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_contacts_updated_at ON contacts;
CREATE TRIGGER update_contacts_updated_at
  BEFORE UPDATE ON contacts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### 2. Fix Clients Table (For Customers Page)
The clients table has a column naming issue (`org_id` vs `organization_id`).

**Steps:**
1. Go to: https://supabase.com/dashboard/project/lzlrojoaxrqvmhempnkn/sql/new
2. Run this SQL:

```sql
-- Fix clients table to use org_id instead of organization_id
DO $$ 
BEGIN
    -- Check if organization_id column exists and org_id doesn't
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'clients' AND column_name = 'organization_id')
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'clients' AND column_name = 'org_id') THEN
        -- Rename the column
        ALTER TABLE clients RENAME COLUMN organization_id TO org_id;
        RAISE NOTICE 'Renamed organization_id to org_id';
    
    -- Check if neither column exists
    ELSIF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                     WHERE table_name = 'clients' AND column_name = 'org_id') THEN
        -- Add org_id column with default organization
        ALTER TABLE clients 
        ADD COLUMN org_id UUID NOT NULL DEFAULT '63589490-8f55-4157-bd3a-e141594b748e' 
        REFERENCES organizations(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added org_id column';
    ELSE
        RAISE NOTICE 'org_id column already exists';
    END IF;
END $$;

-- Update RLS policies to use org_id
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view clients in their organization" ON clients;
CREATE POLICY "Users can view clients in their organization"
    ON clients FOR SELECT TO authenticated
    USING (org_id IN (
        SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
        UNION
        SELECT organization_id FROM organization_members 
        WHERE user_id = auth.uid() AND is_active = true
    ));

DROP POLICY IF EXISTS "Users can create clients in their organization" ON clients;
CREATE POLICY "Users can create clients in their organization"
    ON clients FOR INSERT TO authenticated
    WITH CHECK (org_id IN (
        SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
        UNION
        SELECT organization_id FROM organization_members 
        WHERE user_id = auth.uid() AND is_active = true
    ));

DROP POLICY IF EXISTS "Users can update clients in their organization" ON clients;
CREATE POLICY "Users can update clients in their organization"
    ON clients FOR UPDATE TO authenticated
    USING (org_id IN (
        SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
        UNION
        SELECT organization_id FROM organization_members 
        WHERE user_id = auth.uid() AND is_active = true
    ));

DROP POLICY IF EXISTS "Users can delete clients in their organization" ON clients;
CREATE POLICY "Users can delete clients in their organization"
    ON clients FOR DELETE TO authenticated
    USING (org_id IN (
        SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
        UNION
        SELECT organization_id FROM organization_members 
        WHERE user_id = auth.uid() AND is_active = true
    ));

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
```

## 📝 TODO List for Next Session

### High Priority
- [ ] Run the SQL to create `contacts` table (see above)
- [ ] Run the SQL to fix `clients` table column issue (see above)
- [ ] Test contact creation after running SQL
- [ ] Test customer creation after running SQL
- [ ] Verify leads are showing on contacts page

### Medium Priority  
- [ ] Check memberships page - still not showing memberships
- [ ] Test booking link creation (was showing "undefined" error)
- [ ] Verify booking page menu buttons are clickable

### Low Priority
- [ ] Clean up duplicate test scripts in `/scripts/` directory
- [ ] Add proper error boundaries to all pages
- [ ] Implement better loading states

## Key Information

### Organization Details
- **Default Organization ID**: `63589490-8f55-4157-bd3a-e141594b748e` (Atlas Fitness)
- **User ID (Sam)**: `ea1fc8e3-35a2-4c59-80af-5fde557391a1`
- **Database**: 156 leads exist, 0 contacts, 0 customers

### Important Files Modified
- `/app/lib/api/auth-check.ts` - Improved organization lookup
- `/app/contacts/new/page.tsx` - Fixed lead creation fields
- `/app/api/contacts/route.ts` - New API endpoint with better auth
- `/app/api/fix-clients-table/route.ts` - Diagnostic endpoint
- `/app/api/fix-user-organization/route.ts` - Organization fix endpoint

### Useful Debug Endpoints
- https://atlas-fitness-onboarding.vercel.app/api/fix-user-organization
- https://atlas-fitness-onboarding.vercel.app/api/fix-clients-table
- https://atlas-fitness-onboarding.vercel.app/api/contacts/fetch-all

### Scripts Created (in `/scripts/`)
- `fix-sam-organization.js` - Fixes user organization association
- `fix-organization-association.js` - Improved version of above
- `test-contact-creation.js` - Tests contact/lead creation
- `check-contacts-table.js` - Checks if contacts table exists
- `create-contacts-table.sql` - SQL to create contacts table
- `fix-clients-table.js` - Tests clients table issues

## Notes for Next Developer

1. **Main Issue**: The `contacts` table doesn't exist in the database - this MUST be created first
2. **Secondary Issue**: The `clients` table uses `org_id` but code expects `organization_id`
3. **Authentication**: The system now auto-creates organization associations if missing
4. **Leads vs Contacts**: Leads table uses `name` field, not `first_name/last_name`
5. **Cache Issues**: Use Shift+Cmd+R to hard refresh when testing changes

## Git Status
- ✅ All changes committed and pushed to GitHub
- Branch: `main`
- Last commit: "fix: Fix contact creation errors"
- Repository: https://github.com/Schofield90/atlas-fitness-onboarding

---
*Session ended: September 1, 2025*
*Next step: Run the SQL commands in Supabase to create/fix tables*
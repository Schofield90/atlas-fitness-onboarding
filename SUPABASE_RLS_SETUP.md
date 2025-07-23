# Supabase Row Level Security (RLS) Setup

## 🚨 CRITICAL: Enable RLS on all tables

This application requires Row Level Security (RLS) to be enabled on all tables to ensure data isolation between organizations.

## Step 1: Add Supabase credentials to .env.local

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Step 2: Run the migration

1. Go to your Supabase dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `supabase/migrations/20240722_enable_rls_security.sql`
4. Run the query

## Step 3: Verify RLS is working

1. Install dependencies:
```bash
npm install
```

2. Test RLS policies:
```bash
# Visit this endpoint after logging in
/api/test/rls
```

## Important Tables and Their Policies:

### 1. **leads** table
- Users can only see/modify leads from their organization
- Prevents data leakage between organizations

### 2. **users** table  
- Users can only see members of their organization
- Users can only update their own profile

### 3. **organizations** table
- Users can only see their own organization
- Only admins can update organization settings

### 4. **facebook_pages** table
- Users can only see/modify their organization's Facebook pages
- Ensures Facebook tokens are protected

### 5. **facebook_integrations** table
- Users can only see/modify their own integrations
- Protects sensitive OAuth tokens

## Testing RLS:

### Test 1: Cross-organization data access (should fail)
```sql
-- As a user from org A, try to see org B's leads
SELECT * FROM leads WHERE organization_id = 'org-b-id';
-- Should return 0 rows
```

### Test 2: Own organization data access (should succeed)
```sql
-- As a user from org A, see own org's leads
SELECT * FROM leads WHERE organization_id = 'org-a-id';
-- Should return org A's leads
```

## Common Issues:

1. **"permission denied for table"** - RLS is enabled but no policies exist
2. **Can see all data** - RLS is not enabled on the table
3. **Can't see any data** - Check if user is properly authenticated

## Emergency Disable (NOT RECOMMENDED):
```sql
-- Only use in development
ALTER TABLE public.leads DISABLE ROW LEVEL SECURITY;
```

## Monitoring:
Check RLS status:
```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';
```
# Auth Permission Diagnostic Guide
**Date**: October 9, 2025
**Status**: PRODUCTION BREAKING - All authentication disabled

## Critical Issue Summary

### Symptoms
- ❌ All login attempts fail with "Database error querying schema"
- ❌ New user creation fails
- ❌ Admin API returns "Database error finding users"
- ❌ `supabase_auth_admin` role has NO INSERT/UPDATE/DELETE permissions

### Evidence
```sql
-- Query shows ONLY SELECT privileges (missing INSERT, UPDATE, DELETE)
SELECT grantee, privilege_type, table_name
FROM information_schema.table_privileges
WHERE grantee = 'supabase_auth_admin'
AND table_schema = 'auth';

Result:
[
  {"grantee": "supabase_auth_admin", "privilege_type": "SELECT", "table_name": "identities"},
  {"grantee": "supabase_auth_admin", "privilege_type": "SELECT", "table_name": "refresh_tokens"},
  {"grantee": "supabase_auth_admin", "privilege_type": "SELECT", "table_name": "sessions"},
  {"grantee": "supabase_auth_admin", "privilege_type": "SELECT", "table_name": "users"}
]
```

## Root Cause Analysis

### Why GRANT Statements Only Give SELECT

**PostgreSQL Rule**: You can only GRANT permissions you have yourself.

If you run:
```sql
GRANT ALL ON auth.users TO supabase_auth_admin;
```

But you're running as a user that only has SELECT permission, PostgreSQL will:
1. ✅ Grant SELECT (you have it)
2. ❌ Silently skip INSERT (you don't have it)
3. ❌ Silently skip UPDATE (you don't have it)
4. ❌ Silently skip DELETE (you don't have it)
5. ❌ **No error or warning**

### Likely Scenarios

**Scenario 1: Running as wrong user**
- Supabase SQL Editor might be running as `authenticator` role instead of `postgres`
- `authenticator` only has SELECT on auth tables
- Need to switch to `postgres` superuser

**Scenario 2: Table ownership changed**
- Auth tables might have been re-owned to different role
- Original owner was `supabase_auth_admin`, now might be `postgres` or `authenticator`
- Without ownership, GRANT statements won't work

**Scenario 3: Recent security script**
- User mentioned "we ran a lot of security fixes today"
- Some security script might have run REVOKE statements
- Or changed table ownership as part of "hardening"

## Diagnostic Steps

### Step 1: Check Current User
Run in Supabase SQL Editor:
```sql
SELECT current_user, session_user;
```

**Expected Results:**
- ✅ GOOD: `postgres` / `postgres` (superuser)
- ⚠️ CONCERNING: `authenticator` / `postgres` (limited role)
- ❌ BAD: `authenticator` / `authenticator` (very limited)

### Step 2: Check Table Ownership
Run in Supabase SQL Editor:
```sql
SELECT
  tablename,
  tableowner
FROM pg_tables
WHERE schemaname = 'auth'
ORDER BY tablename;
```

**Expected Results:**
- ✅ GOOD: Owner is `supabase_auth_admin` (as designed)
- ⚠️ CONCERNING: Owner is `postgres` (need to re-grant)
- ❌ BAD: Owner is `authenticator` (security misconfiguration)

### Step 3: Check Current Permissions on Auth Tables
Run in Supabase SQL Editor:
```sql
SELECT
  grantee,
  privilege_type,
  table_name
FROM information_schema.table_privileges
WHERE table_schema = 'auth'
AND table_name IN ('users', 'identities', 'sessions', 'refresh_tokens')
ORDER BY table_name, grantee, privilege_type;
```

**This will show ALL roles and their permissions. Look for:**
- Does `supabase_auth_admin` have INSERT, UPDATE, DELETE?
- Does `authenticator` have too many permissions?
- Who else has access to these tables?

### Step 4: Check Who Owns the Auth Schema
Run in Supabase SQL Editor:
```sql
SELECT
  schema_name,
  schema_owner
FROM information_schema.schemata
WHERE schema_name = 'auth';
```

**Expected**: `supabase_admin` or `postgres`

## Fix Attempts (Try in Order)

### Fix 1: Run GRANT as Postgres Superuser

**If Step 1 shows you're running as `authenticator`:**

Try prepending `SET ROLE postgres;` to force superuser context:

```sql
-- Force postgres superuser context
SET ROLE postgres;

-- Re-run GRANT statements
GRANT USAGE ON SCHEMA auth TO supabase_auth_admin;
GRANT ALL ON auth.users TO supabase_auth_admin;
GRANT ALL ON auth.identities TO supabase_auth_admin;
GRANT ALL ON auth.sessions TO supabase_auth_admin;
GRANT ALL ON auth.refresh_tokens TO supabase_auth_admin;
GRANT ALL ON ALL TABLES IN SCHEMA auth TO supabase_auth_admin;
GRANT ALL ON ALL SEQUENCES IN SCHEMA auth TO supabase_auth_admin;

-- Verify it worked
SELECT grantee, privilege_type, table_name
FROM information_schema.table_privileges
WHERE grantee = 'supabase_auth_admin'
AND table_schema = 'auth'
AND table_name = 'users'
ORDER BY privilege_type;
```

**Expected**: Should now see INSERT, UPDATE, DELETE, SELECT (4 rows for users table)

### Fix 2: Re-own Tables to supabase_auth_admin

**If tables are owned by wrong role:**

```sql
-- Force postgres superuser context
SET ROLE postgres;

-- Re-own auth tables to supabase_auth_admin
ALTER TABLE auth.users OWNER TO supabase_auth_admin;
ALTER TABLE auth.identities OWNER TO supabase_auth_admin;
ALTER TABLE auth.sessions OWNER TO supabase_auth_admin;
ALTER TABLE auth.refresh_tokens OWNER TO supabase_auth_admin;
ALTER TABLE auth.mfa_factors OWNER TO supabase_auth_admin;
ALTER TABLE auth.mfa_challenges OWNER TO supabase_auth_admin;
ALTER TABLE auth.mfa_amr_claims OWNER TO supabase_auth_admin;
ALTER TABLE auth.sso_providers OWNER TO supabase_auth_admin;
ALTER TABLE auth.sso_domains OWNER TO supabase_auth_admin;
ALTER TABLE auth.saml_providers OWNER TO supabase_auth_admin;
ALTER TABLE auth.saml_relay_states OWNER TO supabase_auth_admin;
ALTER TABLE auth.flow_state OWNER TO supabase_auth_admin;

-- Verify ownership
SELECT tablename, tableowner
FROM pg_tables
WHERE schemaname = 'auth'
ORDER BY tablename;
```

**Expected**: All tables owned by `supabase_auth_admin`

### Fix 3: Nuclear Option - Restore Default Permissions

**ONLY if Fix 1 and Fix 2 fail:**

Contact Supabase support to restore default auth schema permissions, or:

```sql
-- Force postgres superuser
SET ROLE postgres;

-- Restore default Supabase auth permissions
GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA auth TO postgres, supabase_auth_admin;
GRANT ALL ON ALL SEQUENCES IN SCHEMA auth TO postgres, supabase_auth_admin;
GRANT SELECT ON ALL TABLES IN SCHEMA auth TO dashboard_user;

-- Specific role permissions
GRANT SELECT ON auth.users TO authenticator;
GRANT SELECT ON auth.sessions TO authenticator;
GRANT SELECT, INSERT, UPDATE ON auth.identities TO authenticator;
GRANT SELECT, INSERT, UPDATE ON auth.refresh_tokens TO authenticator;

-- Verify
SELECT grantee, privilege_type, table_name
FROM information_schema.table_privileges
WHERE table_schema = 'auth'
AND grantee IN ('supabase_auth_admin', 'authenticator', 'postgres')
ORDER BY table_name, grantee, privilege_type;
```

## Verification After Fix

### Test 1: Check Permissions
```sql
SELECT grantee, privilege_type, table_name
FROM information_schema.table_privileges
WHERE grantee = 'supabase_auth_admin'
AND table_schema = 'auth'
AND table_name IN ('users', 'identities', 'sessions', 'refresh_tokens')
ORDER BY table_name, privilege_type;
```

**Expected**: Should see at least INSERT, UPDATE, DELETE, SELECT for each table (16 rows minimum)

### Test 2: Test Admin API
```bash
curl -X POST https://login.gymleadhub.co.uk/api/admin/reset-demo-user \
  -H 'Content-Type: application/json' \
  --silent | jq
```

**Expected**:
```json
{
  "success": true,
  "message": "Demo user password reset successfully",
  "userId": "..."
}
```

**NOT**:
```json
{
  "error": "Database permission error",
  "details": "Database error finding users"
}
```

### Test 3: Test Actual Login
1. Navigate to: https://login.gymleadhub.co.uk/owner-login
2. Enter: test@test.co.uk / Test123
3. Expected: Redirect to dashboard
4. NOT: "Invalid email or password"

### Test 4: Run Playwright Test
```bash
cd /Users/samschofield/atlas-fitness-onboarding
npx playwright test e2e/verify-demo-login.spec.ts --reporter=line
```

**Expected**: ✅ PASSED - Demo login credentials work

## Historical Context

From CLAUDE.md (lines 1615-1637), this EXACT issue occurred before and was fixed with these GRANT statements:

```sql
GRANT ALL ON auth.users TO supabase_auth_admin;
GRANT ALL ON auth.identities TO supabase_auth_admin;
GRANT ALL ON auth.sessions TO supabase_auth_admin;
GRANT ALL ON auth.refresh_tokens TO supabase_auth_admin;
GRANT USAGE ON SCHEMA auth TO supabase_auth_admin;
GRANT ALL ON ALL TABLES IN SCHEMA auth TO supabase_auth_admin;
GRANT ALL ON ALL SEQUENCES IN SCHEMA auth TO supabase_auth_admin;
```

**BUT**: Those statements worked before. Now they only grant SELECT.

**Conclusion**: Something changed in the database environment (user context or table ownership) since the last fix.

## Questions to Answer

1. **What security fixes did you run today?**
   - Scripts run in Supabase SQL Editor?
   - Migrations applied?
   - Manual SQL commands?

2. **Did you run any ALTER TABLE OWNER commands?**
   - On auth tables?
   - On any tables?

3. **Did you run any REVOKE commands?**
   - On auth schema?
   - On supabase_auth_admin role?

4. **Did you change any RLS policies on auth tables?**
   - Usually auth tables don't have RLS
   - But security scripts might have enabled it

## Next Immediate Steps

**PRIORITY 1**: Run diagnostic queries (Steps 1-4 above)

**PRIORITY 2**: Send me the results so I can analyze

**PRIORITY 3**: Try Fix 1 (SET ROLE postgres + GRANT statements)

**PRIORITY 4**: Verify with Test 1-4

**DO NOT**: Make any other changes until we understand the root cause

---

**File Location**: `/Users/samschofield/atlas-fitness-onboarding/AUTH_PERMISSION_DIAGNOSTIC.md`
**Created**: October 9, 2025 14:00 BST
**Purpose**: Guide user through auth permission debugging

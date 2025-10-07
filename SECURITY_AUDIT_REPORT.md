# Security Audit Report

**Date**: October 7, 2025  
**Audited By**: Claude Code  
**Scope**: Hardcoded credentials, org IDs, emails, passwords, and security leaks

---

## 🔴 CRITICAL ISSUES

### 1. Hardcoded Production Password: `@Aa80236661`

**Severity**: CRITICAL  
**Found in**: 39 files  
**Risk**: Anyone with access to the repository can use this password

**Critical Files Containing Password**:

- `CLAUDE.md` - Documentation file with test credentials
- Multiple test files in `tests/`, `e2e/`, `scripts/`
- `apps/gym-dashboard/app/api/auth/custom-signin/route.ts`
- Multiple SQL migration files

**Recommendation**:

- ✅ **IMMEDIATE**: Rotate this password immediately
- ✅ Remove from ALL files (especially CLAUDE.md and documentation)
- ✅ Use environment variables for test credentials
- ✅ Add to `.gitignore` any files containing credentials

---

### 2. Database Password in Scripts: `PGPASSWORD='@Aa80236661'`

**Severity**: CRITICAL  
**Found in**: 22 shell scripts  
**Risk**: Direct database access with full permissions

**Files**:

- `scripts/sync-database.sh`
- `scripts/apply-*.sh` (multiple migration scripts)
- Various deployment and fix scripts

**Recommendation**:

- ✅ **IMMEDIATE**: Remove PGPASSWORD from all scripts
- ✅ Use `.pgpass` file or environment variables instead
- ✅ Rotate database password
- ✅ Audit database access logs for unauthorized access

---

### 3. Hardcoded Organization ID: `ee1206d7-62fb-49cf-9f39-95b9c54423a4`

**Severity**: HIGH  
**Found in**: 20 files  
**Risk**: Exposes specific customer/organization data

**Production Code Files**:

- `scripts/fix-malformed-gocardless-clients.mjs`
- `scripts/import-gocardless-csv.mjs`
- `apps/gym-dashboard/app/api/gym/gocardless/test-single-payment/route.ts`

**Recommendation**:

- ⚠️ Replace with dynamic organization lookup
- ⚠️ Remove from test/debug endpoints
- ⚠️ Use environment variable `TEST_ORG_ID` for development

---

### 4. Hardcoded Supabase Project ID: `lzlrojoaxrqvmhempnkn`

**Severity**: MEDIUM  
**Found in**: 230 files  
**Risk**: Exposes database project ID

**Files**: Mostly connection strings in scripts and migration files

**Recommendation**:

- ℹ️ This is semi-public (appears in browser Network tab)
- ℹ️ Not critical alone, but combined with service role key = full access
- ℹ️ Ensure RLS policies are properly configured

---

### 5. Personal Email Addresses Hardcoded

**Severity**: MEDIUM  
**Found in**:

- `samschofield90@hotmail.co.uk` - 61 files
- `sam@atlas-gyms.co.uk` - 218 files

**Risk**: Used in test data, could receive unintended notifications

**Recommendation**:

- ⚠️ Replace with test email addresses (e.g., `test@example.com`)
- ⚠️ Use email mocking in tests
- ⚠️ Remove from CLAUDE.md documentation

---

## 🟡 MODERATE CONCERNS

### 6. Supabase Service Role Key Visible

**Severity**: MODERATE (if in public files)  
**Found in**: 634 files (mostly imports)

**Note**: Most uses are correct (`process.env.SUPABASE_SERVICE_ROLE_KEY`)

**Check**: Ensure the actual key is NOT committed to git:

```bash
# This should return 0 results:
grep -r "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSI" .
```

**Recommendation**:

- ✅ Verify `.env` and `.env.local` are in `.gitignore`
- ✅ Check git history for accidentally committed keys
- ✅ Rotate service role key if found in commit history

---

## 📊 AUDIT SUMMARY

| Issue Type          | Severity | Count      | Action Required             |
| ------------------- | -------- | ---------- | --------------------------- |
| Hardcoded Password  | CRITICAL | 39 files   | Immediate rotation          |
| Database Password   | CRITICAL | 22 scripts | Immediate removal           |
| Organization ID     | HIGH     | 20 files   | Replace with dynamic lookup |
| Email Addresses     | MEDIUM   | 279 files  | Replace with test emails    |
| Supabase Project ID | MEDIUM   | 230 files  | Monitor, not urgent         |

---

## 🔧 REMEDIATION STEPS

### Immediate Actions (Do Now)

1. **Rotate Production Passwords**

   ```sql
   -- In Supabase dashboard, change passwords for:
   -- 1. Database password
   -- 2. User: samschofield90@hotmail.co.uk
   -- 3. User: sam@atlas-gyms.co.uk
   ```

2. **Remove from Documentation**

   ```bash
   # Edit CLAUDE.md to remove:
   - Password: @Aa80236661
   - Emails: samschofield90@hotmail.co.uk, sam@atlas-gyms.co.uk
   - Replace with: "Use credentials from .env.local"
   ```

3. **Clean Up Scripts**
   ```bash
   # Replace in all .sh files:
   PGPASSWORD='@Aa80236661' psql ...
   # With:
   psql ... # Uses .pgpass or env variable
   ```

### Short Term (This Week)

4. **Environment Variable Setup**

   ```bash
   # Create .env.test for test credentials:
   TEST_USER_EMAIL=test@example.com
   TEST_USER_PASSWORD=<random-secure-password>
   TEST_ORG_ID=<test-org-uuid>
   DB_PASSWORD=<secure-password>
   ```

5. **Update Test Files**
   - Replace hardcoded credentials with `process.env.TEST_*`
   - Use test doubles/mocks for sensitive operations

### Long Term (This Month)

6. **Secret Management**
   - Use Vercel environment variables for production
   - Use `.env.local` for local development (never commit!)
   - Consider using a secrets manager (AWS Secrets Manager, 1Password, etc.)

7. **Audit Git History**

   ```bash
   # Check if secrets were ever committed:
   git log -S '@Aa80236661' --all
   # If found, consider:
   # - Rotating those secrets
   # - Using git-filter-repo to clean history (DESTRUCTIVE!)
   ```

8. **Add Pre-commit Hooks**
   ```bash
   # Install git-secrets or similar:
   npm install --save-dev git-secrets
   # Configure to block commits with secrets
   ```

---

## ✅ SECURE FILES (No Issues Found)

The following file patterns appear secure:

- `/app/lib/supabase/server.ts` - Uses env variables correctly
- `/app/lib/supabase/client.ts` - Uses public keys only
- `/app/api/**` - Most routes use env variables
- `.env.example` - Template file (no actual secrets)

---

## 📝 NEXT STEPS

1. [ ] Rotate all passwords mentioned in CRITICAL section
2. [ ] Update CLAUDE.md to remove credentials
3. [ ] Clean up all shell scripts to remove PGPASSWORD
4. [ ] Replace hardcoded org ID with dynamic lookup
5. [ ] Add pre-commit hooks to prevent future leaks
6. [ ] Audit git history for past leaks
7. [ ] Update documentation with secure practices

---

**Report Generated**: October 7, 2025  
**Next Audit Recommended**: Monthly or after major changes

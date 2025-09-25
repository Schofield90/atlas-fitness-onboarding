# Complete Testing Guide - Atlas Fitness SaaS

## 🔄 Full System Reset & Testing Process

### Step 1: Reset Database to Clean State

Run this SQL in your Supabase SQL editor to completely reset the system:

```sql
-- Run the contents of RESET_TO_CLEAN_STATE.sql
```

This will:

- Delete all organizations, clients, and business data
- Keep the schema intact
- Set up admin access for @gymleadhub.co.uk emails

### Step 2: Set Up Admin User

If you need to create or update an admin user:

```bash
# Note: You'll need to add SUPABASE_SERVICE_KEY to your .env.local first
# Get it from Supabase Dashboard > Settings > API > Service Role Key

node scripts/setup-admin-user.js sam@gymleadhub.co.uk yourpassword
```

### Step 3: Test Authentication Flows

#### A. Admin Login

1. Navigate to: `https://login.gymleadhub.co.uk/admin`
2. Login with admin credentials
3. Should access admin dashboard
4. Can view all organizations (initially empty)

#### B. Create First Organization

1. Navigate to: `https://login.gymleadhub.co.uk/signup`
2. Create a new gym organization
3. Set up owner account
4. Should redirect to owner dashboard

#### C. Test Owner Login

1. Navigate to: `https://login.gymleadhub.co.uk/owner-login`
2. Login with gym owner credentials
3. Should access gym dashboard
4. Can manage gym settings, clients, etc.

#### D. Test Client/Member Registration

1. From owner dashboard, create client invitation
2. Client receives magic link
3. Client sets password on first visit
4. Client can login at: `https://login.gymleadhub.co.uk/simple-login`

### Step 4: Verify System Health

Run the test script to check overall system health:

```bash
node scripts/test-complete-flow.js
```

This checks:

- Database connectivity
- API endpoints
- RLS policies
- Authentication flow

### Step 5: Common Issues & Solutions

#### Issue: 500 Error on clients table

**Solution**: Run the emergency fix SQL to reset RLS policies

#### Issue: Login works but redirect fails

**Solution**: Check middleware.ts routing logic

#### Issue: "Invalid credentials" for known user

**Solution**: User might not have proper role assignments in database

### Step 6: Production vs Local Testing

#### Local Testing

```bash
npm run dev
# Visit http://localhost:3000
```

#### Production Testing

- Admin: https://login.gymleadhub.co.uk/admin
- Owner: https://login.gymleadhub.co.uk/owner-login
- Client: https://login.gymleadhub.co.uk/simple-login

### Important URLs by Subdomain

- `login.gymleadhub.co.uk` - Authentication portal
- `admin.gymleadhub.co.uk` - Super admin dashboard
- `[gym-slug].gymleadhub.co.uk` - Individual gym portals

### Database Tables to Monitor

Key tables for debugging:

- `auth.users` - All user accounts
- `organizations` - Gym organizations
- `clients` - Gym members/clients
- `user_organizations` - User-org relationships
- `organization_members` - Alternative user-org table
- `organization_staff` - Staff assignments
- `super_admin_users` - Platform admins

### Testing Checklist

- [ ] Database reset successful
- [ ] Admin user can login
- [ ] Admin can view empty organizations list
- [ ] New organization can be created
- [ ] Organization owner can login
- [ ] Owner can access dashboard
- [ ] Owner can create client invitations
- [ ] Client can claim invitation
- [ ] Client can set password
- [ ] Client can login with password
- [ ] All RLS policies working
- [ ] No 500 errors in console
- [ ] Proper redirects after login

## 🚨 Emergency Fixes

If things go wrong, these scripts help recover:

1. `RESET_TO_CLEAN_STATE.sql` - Complete reset
2. `emergency-fix-clients-500.sql` - Fix client table errors
3. `scripts/setup-admin-user.js` - Fix admin access

## 📝 Notes

- Never hardcode credentials in SQL or code
- Always test locally before production
- Check browser console for detailed errors
- RLS policies are critical - test after changes
- Keep service keys secure and never commit them

# Fresh Start Guide - Complete Reset and Setup

## Step 1: Clean Up Existing Data in Supabase

1. Go to your Supabase dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `cleanup-test-users.sql`
4. Run the script to remove all test users and their data

**Note**: This will delete all users created in the last 24 hours or with 'test' in their email.

## Step 2: Sign Out Completely

1. Go to http://localhost:3000/dashboard
2. Open browser console (F12)
3. Run this command to sign out completely:

```javascript
localStorage.clear();
sessionStorage.clear();
document.cookie.split(";").forEach(function (c) {
  document.cookie = c
    .replace(/^ +/, "")
    .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
});
window.location.href = "/";
```

## Step 3: Test the Complete Signup Flow

1. Go to http://localhost:3000/signup
2. Fill in the form:
   - Full Name: Your Name
   - Gym/Organization Name: Your Gym Name (IMPORTANT: Don't leave empty!)
   - Email: your-email@example.com
   - Password: (at least 6 characters)
3. Click "Start Your Free Trial"

## What Should Happen:

✅ User account created in Supabase Auth
✅ User record created in users table
✅ Organization created with:

- name: Your provided gym name
- owner_id: Your user ID
- subscription_status: "trialing"
  ✅ User linked to organization in user_organizations table
  ✅ Redirected to dashboard
  ✅ Dashboard shows your organization data
  ✅ You can add clients without errors

## Step 4: Verify Everything Works

1. After signup, you should land on the dashboard
2. Click on "Leads & Customers" or go to http://localhost:3000/members
3. Click "Add New Member"
4. Fill in the form and save
5. Member should be created successfully

## If Something Goes Wrong:

### Check the server logs:

Look for any error messages in the terminal where the dev server is running.

### Check browser console:

Press F12 and look for any red error messages.

### Verify database records:

In Supabase, check these tables:

- auth.users - Should have your user
- organizations - Should have your organization with subscription_status = 'trialing'
- user_organizations - Should link your user to the organization
- users - Should have your user record

## Key Changes Made:

1. **Signup always creates an organization** - Even if organization name is not provided, it uses "My Gym" as default
2. **Organizations are created with "trialing" status** - This is allowed in the auth checks
3. **Proper error handling** - Organization creation failures now return proper errors
4. **Service role client used** - Bypasses RLS for initial setup

## Clean Database State SQL:

If you want to completely start fresh (DELETE ALL DATA):

```sql
-- WARNING: This deletes EVERYTHING!
TRUNCATE TABLE user_organizations CASCADE;
TRUNCATE TABLE organization_members CASCADE;
TRUNCATE TABLE organization_staff CASCADE;
TRUNCATE TABLE clients CASCADE;
TRUNCATE TABLE organizations CASCADE;
TRUNCATE TABLE users CASCADE;
DELETE FROM auth.users;
```

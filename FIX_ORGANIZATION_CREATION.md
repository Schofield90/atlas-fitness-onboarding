# Fix Organization Creation - CRITICAL

## The Problem
Organization creation is failing because:
1. **No INSERT policy on organizations table** - RLS is blocking all inserts
2. **Column mismatches** - org_id vs organization_id, missing is_active
3. **Missing columns** - slug, type, phone, email, address not in organizations table

## The Solution

### Step 1: Apply Database Migration (DO THIS IMMEDIATELY)

1. Go to Supabase SQL Editor:
   https://supabase.com/dashboard/project/lzlrojoaxrqvmhempnkn/sql

2. Copy and paste the ENTIRE contents of:
   `/supabase/migrations/20250811_fix_organization_creation.sql`

3. Click "Run" to execute

This migration will:
- Add missing columns to organizations table
- Add the critical INSERT policy for organizations
- Fix column name issues
- Create a compatibility view for middleware

### Step 2: Verify the Fix

After running the migration, test organization creation:
1. Go to https://atlas-fitness-onboarding.vercel.app/onboarding
2. Fill in the organization details
3. Click Continue
4. It should work now!

## What This Fixes

✅ Adds INSERT permission for organizations table
✅ Fixes org_id vs organization_id column mismatch
✅ Adds missing is_active column
✅ Adds missing columns (slug, type, phone, email, address)
✅ Creates backward compatibility view for middleware
✅ Proper RLS policies for both tables

## If It Still Doesn't Work

Check these:
1. Make sure you're logged in
2. Check browser console for errors
3. Try logging out and back in
4. Clear browser cookies for the site

The main issue was the missing INSERT policy - without it, Supabase RLS was blocking ALL attempts to create organizations!
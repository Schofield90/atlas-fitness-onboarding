# Localhost Authentication Issue - Summary

## Problem

Authentication not working on localhost:3001 - cookies are not being set properly by Supabase SSR in Next.js 15.

## Root Cause

Supabase SSR library is not properly setting auth cookies in the development environment. Even after successful login (API returns 200), no `sb-*` cookies are being created.

## Attempted Fixes

1. ✅ Updated Supabase redirect URLs to include localhost:3001
2. ✅ Fixed cookie settings (secure: false for localhost)
3. ✅ Fixed httpOnly settings
4. ⚠️ Created alternative login endpoint - still not setting cookies

## Current Workaround Options

### Option 1: Use Production Environment

The authentication works perfectly in production. You can test at:

- https://login.gymleadhub.co.uk
- https://members.gymleadhub.co.uk
- https://admin.gymleadhub.co.uk

### Option 2: Use Supabase Local Development

Set up Supabase locally using their CLI:

```bash
npx supabase init
npx supabase start
```

Then update `.env.development.local` to use local Supabase URLs.

### Option 3: Temporary Dev Bypass

For development only, you can temporarily bypass authentication by:

1. Uncommenting the localhost bypass in middleware.ts (lines 248-250)
2. Using a mock user session for development

## The Real Solution (TODO)

This appears to be a compatibility issue between:

- Next.js 15.3.5
- Supabase SSR library
- Cookie handling in development mode

Consider:

1. Downgrading to Next.js 14 (known to work)
2. Waiting for Supabase SSR library update
3. Using a custom auth implementation for development

## Production Status

✅ Production authentication is working correctly
✅ All three subdomains are properly configured
⚠️ Profile update issue is being deployed now (fix in progress)

---

_Last Updated: September 29, 2025_

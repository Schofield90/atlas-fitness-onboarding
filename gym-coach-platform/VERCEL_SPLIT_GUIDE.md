# Vercel Project Split Guide - 3 Portal Architecture

## Current State

**❌ ISSUE**: Currently ONE Vercel project deploys to ALL three subdomains

- Project: `gym-coach-platform`
- This is a security risk as all code is shared across portals

## Required Configuration

### 3 Separate Vercel Projects

#### 1. Admin Portal Project

**Project Name**: `gym-coach-admin`
**Domain**: admin.gymleadhub.co.uk
**Purpose**: Super admin platform management
**Middleware**: Use `middleware-admin.ts`

**vercel.json**:

```json
{
  "version": 2,
  "name": "gym-coach-admin",
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/next"
    }
  ],
  "routes": [
    {
      "src": "/admin/(.*)",
      "dest": "/admin/$1"
    },
    {
      "src": "/(.*)",
      "dest": "/admin/$1"
    }
  ],
  "env": {
    "NEXT_PUBLIC_APP_URL": "https://admin.gymleadhub.co.uk",
    "PORTAL_TYPE": "admin"
  }
}
```

**Required Environment Variables**:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (admin needs this)
- `NEXT_PUBLIC_APP_URL=https://admin.gymleadhub.co.uk`
- `PORTAL_TYPE=admin`

**Build Command**: `next build`
**Root Directory**: `./gym-coach-platform`
**Framework Preset**: Next.js

---

#### 2. Staff Dashboard Project

**Project Name**: `gym-coach-login`
**Domain**: login.gymleadhub.co.uk
**Purpose**: Gym staff CRM (leads, clients, bookings)
**Middleware**: Use `middleware-login.ts`

**vercel.json**:

```json
{
  "version": 2,
  "name": "gym-coach-login",
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/next"
    }
  ],
  "routes": [
    {
      "src": "/dashboard/(.*)",
      "dest": "/dashboard/$1"
    },
    {
      "src": "/leads/(.*)",
      "dest": "/leads/$1"
    },
    {
      "src": "/clients/(.*)",
      "dest": "/clients/$1"
    },
    {
      "src": "/(.*)",
      "dest": "/$1"
    }
  ],
  "env": {
    "NEXT_PUBLIC_APP_URL": "https://login.gymleadhub.co.uk",
    "PORTAL_TYPE": "staff"
  }
}
```

**Required Environment Variables**:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_APP_URL=https://login.gymleadhub.co.uk`
- `PORTAL_TYPE=staff`
- `OPENAI_API_KEY` (for AI features)
- `RESEND_API_KEY` (for emails)
- `TWILIO_*` (for SMS)

**Build Command**: `next build`
**Root Directory**: `./gym-coach-platform`
**Framework Preset**: Next.js

---

#### 3. Member Portal Project

**Project Name**: `gym-coach-members`
**Domain**: members.gymleadhub.co.uk
**Purpose**: Client self-service (booking, nutrition, profile)
**Middleware**: Use `middleware-members.ts`

**vercel.json**:

```json
{
  "version": 2,
  "name": "gym-coach-members",
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/next"
    }
  ],
  "routes": [
    {
      "src": "/client/(.*)",
      "dest": "/client/$1"
    },
    {
      "src": "/booking/(.*)",
      "dest": "/booking/$1"
    },
    {
      "src": "/profile/(.*)",
      "dest": "/profile/$1"
    },
    {
      "src": "/(.*)",
      "dest": "/$1"
    }
  ],
  "env": {
    "NEXT_PUBLIC_APP_URL": "https://members.gymleadhub.co.uk",
    "PORTAL_TYPE": "member"
  }
}
```

**Required Environment Variables**:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_APP_URL=https://members.gymleadhub.co.uk`
- `PORTAL_TYPE=member`
- `OPENAI_API_KEY` (for nutrition AI)

**Build Command**: `next build`
**Root Directory**: `./gym-coach-platform`
**Framework Preset**: Next.js

---

## DNS Configuration

### Required CNAME Records

| Subdomain | Type  | Value                |
| --------- | ----- | -------------------- |
| admin     | CNAME | cname.vercel-dns.com |
| login     | CNAME | cname.vercel-dns.com |
| members   | CNAME | cname.vercel-dns.com |

**TTL**: 300 seconds (5 minutes)

### SSL Certificates

Each subdomain will automatically get its own Let's Encrypt SSL certificate from Vercel.

---

## Deployment Strategy

### Option 1: Manual Setup (Recommended for Initial Setup)

1. **Create Projects via Vercel Dashboard**:

   ```bash
   # Login to Vercel
   vercel login

   # Create admin project
   cd gym-coach-platform
   vercel --prod --name gym-coach-admin

   # Create staff project
   vercel --prod --name gym-coach-login

   # Create member project
   vercel --prod --name gym-coach-members
   ```

2. **Configure Domains**:
   - Admin: Settings → Domains → Add `admin.gymleadhub.co.uk`
   - Login: Settings → Domains → Add `login.gymleadhub.co.uk`
   - Members: Settings → Domains → Add `members.gymleadhub.co.uk`

3. **Set Environment Variables**:
   - Copy from existing `gym-coach-platform` project
   - Update `NEXT_PUBLIC_APP_URL` for each portal
   - Add `PORTAL_TYPE` variable

### Option 2: Automated via Vercel CLI

```bash
# Script to create all 3 projects
#!/bin/bash

# Admin Portal
vercel --prod \
  --name gym-coach-admin \
  --env PORTAL_TYPE=admin \
  --env NEXT_PUBLIC_APP_URL=https://admin.gymleadhub.co.uk \
  --force

# Staff Portal
vercel --prod \
  --name gym-coach-login \
  --env PORTAL_TYPE=staff \
  --env NEXT_PUBLIC_APP_URL=https://login.gymleadhub.co.uk \
  --force

# Member Portal
vercel --prod \
  --name gym-coach-members \
  --env PORTAL_TYPE=member \
  --env NEXT_PUBLIC_APP_URL=https://members.gymleadhub.co.uk \
  --force
```

---

## Middleware Configuration

### Using Correct Middleware per Portal

**Update `next.config.js`** to conditionally load middleware:

```javascript
const portalType = process.env.PORTAL_TYPE || "staff";

const middlewareFile = {
  admin: "./middleware-admin",
  staff: "./middleware-login",
  member: "./middleware-members",
}[portalType];

module.exports = {
  // ... other config
  experimental: {
    middlewareFile,
  },
};
```

**OR** use build-time configuration:

```bash
# Admin build
PORTAL_TYPE=admin npm run build

# Staff build
PORTAL_TYPE=staff npm run build

# Member build
PORTAL_TYPE=member npm run build
```

---

## Testing the Split

### 1. Verify Domain Isolation

```bash
# Should work
curl -I https://admin.gymleadhub.co.uk/admin/verify-super-admin
# → 200 OK (or 401 if not logged in)

# Should redirect or 403
curl -I https://admin.gymleadhub.co.uk/dashboard
# → 403 Forbidden or redirect to admin

curl -I https://login.gymleadhub.co.uk/admin/verify-super-admin
# → 403 Forbidden or redirect to login.gymleadhub.co.uk

# Should work
curl -I https://login.gymleadhub.co.uk/dashboard
# → 200 OK (or 401 if not logged in)
```

### 2. Verify Cookie Isolation

```javascript
// Check cookies are scoped correctly
// Admin portal cookies should have domain=.admin.gymleadhub.co.uk
document.cookie.split(";").forEach((c) => console.log(c));

// Login portal cookies should have domain=.login.gymleadhub.co.uk
// Members portal cookies should have domain=.members.gymleadhub.co.uk
```

### 3. Verify Headers

```bash
# Admin portal
curl -I https://admin.gymleadhub.co.uk
# Should see: X-Portal-Type: admin

# Staff portal
curl -I https://login.gymleadhub.co.uk
# Should see: X-Portal-Type: staff

# Member portal
curl -I https://members.gymleadhub.co.uk
# Should see: X-Portal-Type: member
```

---

## Security Checklist

- [ ] Each portal has separate Vercel project
- [ ] Domains configured correctly in Vercel
- [ ] DNS CNAME records pointing to Vercel
- [ ] SSL certificates active for all 3 subdomains
- [ ] Environment variables set per portal
- [ ] Correct middleware file used per portal
- [ ] Cookie domain scoped to each subdomain
- [ ] Cross-portal access blocked (test with curl)
- [ ] Admin routes only accessible on admin subdomain
- [ ] Staff routes only accessible on login subdomain
- [ ] Member routes only accessible on members subdomain

---

## Rollback Plan

If split causes issues:

1. **Keep existing `gym-coach-platform` project as fallback**
2. **DNS can be reverted instantly** (5min TTL)
3. **Gradual migration**:
   - Week 1: Deploy admin portal only
   - Week 2: Deploy staff portal
   - Week 3: Deploy member portal
   - Week 4: Decommission old unified project

---

## Cost Implications

- **Current**: 1 Vercel project = 1 seat
- **After Split**: 3 Vercel projects = 3 seats (if on Pro plan)
- **Mitigation**: Use Hobby plan (free) for testing, or keep all under one team

---

## Support & Troubleshooting

### Common Issues

**Issue**: "Domain already in use"
**Fix**: Remove domain from old `gym-coach-platform` project first

**Issue**: Environment variables missing
**Fix**: Copy all vars from existing project, update URLs

**Issue**: Build fails with middleware error
**Fix**: Ensure correct middleware file is being used per portal

**Issue**: 403 errors on all routes
**Fix**: Check `PORTAL_TYPE` env var is set correctly

---

_Last Updated: 2025-09-30_
_Status: Configuration Required_
_Priority: High - Security Improvement_

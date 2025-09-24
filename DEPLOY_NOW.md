# 🚀 Quick Deployment Guide - 3 Vercel Projects

## Step 1: Deploy Admin Portal

```bash
cd apps/admin-portal
vercel --yes --name atlas-admin
```

When prompted, answer:

- Set up and deploy? **Y**
- Which scope? **Your account**
- Link to existing project? **N**
- What's your project name? **atlas-admin**
- In which directory? **./** (current)
- Override settings? **N**

## Step 2: Deploy Gym Dashboard

```bash
cd ../gym-dashboard
vercel --yes --name atlas-gym-dashboard
```

Same prompts, use project name: **atlas-gym-dashboard**

## Step 3: Deploy Member Portal

```bash
cd ../member-portal
vercel --yes --name atlas-member-portal
```

Same prompts, use project name: **atlas-member-portal**

## Step 4: Add Environment Variables

### For ALL three projects, run these in each app directory:

```bash
# Basic Supabase variables (ALL APPS NEED THESE)
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
```

### For Gym Dashboard ONLY, also add:

```bash
# Redis (Required)
vercel env add UPSTASH_REDIS_REST_URL
vercel env add UPSTASH_REDIS_REST_TOKEN

# Optional APIs
vercel env add OPENAI_API_KEY
vercel env add TWILIO_ACCOUNT_SID
vercel env add TWILIO_AUTH_TOKEN
```

## Step 5: Deploy to Production

In each app directory:

```bash
vercel --prod
```

## Step 6: Add Custom Domains

In Vercel Dashboard (https://vercel.com/dashboard):

1. **atlas-admin** → Settings → Domains → Add `admin.gymleadhub.co.uk`
2. **atlas-gym-dashboard** → Settings → Domains → Add `login.gymleadhub.co.uk`
3. **atlas-member-portal** → Settings → Domains → Add `members.gymleadhub.co.uk`

## Your Environment Variable Values

Copy these when prompted:

```
NEXT_PUBLIC_SUPABASE_URL=https://lzlrojoaxrqvmhempnkn.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjQ1MTA2NTUsImV4cCI6MjA0MDA4NjY1NX0.6taEJs76bZBbeuQBc5qZ0m-pS5ZxUX91RsPh-qvvGK4

SUPABASE_SERVICE_ROLE_KEY=[Check your .env.local file]

UPSTASH_REDIS_REST_URL=https://helping-pegasus-10661.upstash.io
UPSTASH_REDIS_REST_TOKEN=ASmlAAIncDI1OTBiNjA3NDM2NmY0YmIzYmFlYjEwMjVmOTc5M2YwMnAyMTA2NjE
```

## 🎯 Quick Alternative: Use the Script

```bash
# Run this from the root directory
./scripts/deploy-to-vercel.sh
```

This will deploy all three apps automatically!

## Verification

After deployment, check:

- https://atlas-admin.vercel.app
- https://atlas-gym-dashboard.vercel.app
- https://atlas-member-portal.vercel.app

Then your custom domains once DNS propagates:

- https://admin.gymleadhub.co.uk
- https://login.gymleadhub.co.uk
- https://members.gymleadhub.co.uk

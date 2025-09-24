# 🚀 Deploy to 3 Separate Vercel Projects - FIXED GUIDE

## Important: Deploy from ROOT directory using separate config files

## Step 1: Deploy Admin Portal

```bash
# From ROOT directory (atlas-fitness-onboarding)
vercel --yes -A vercel.admin.json --prod
```

When prompted for project name, enter: **atlas-admin**

## Step 2: Deploy Gym Dashboard

```bash
# From ROOT directory
vercel --yes -A vercel.gym.json --prod
```

When prompted for project name, enter: **atlas-gym-dashboard**

## Step 3: Deploy Member Portal

```bash
# From ROOT directory
vercel --yes -A vercel.member.json --prod
```

When prompted for project name, enter: **atlas-member-portal**

## Alternative: Use the original single project approach

Since the apps share a monorepo structure, you can also deploy from each app directory individually, but you need to ensure the root dependencies are installed:

### Option A: Deploy Admin Portal

```bash
cd apps/admin-portal
# Remove old link if exists
rm -rf .vercel

# Deploy with custom install command
vercel --yes --prod \
  --build-env NEXT_PUBLIC_APP_TYPE=admin \
  --build-env NEXT_PUBLIC_BASE_URL=https://admin.gymleadhub.co.uk
```

### Option B: Deploy All as Single Project (Simpler)

Since your monorepo is already set up, the simplest approach might be to deploy the entire monorepo as ONE Vercel project and use rewrites to route to different apps:

```bash
# From root directory
vercel --yes --prod
```

Then in Vercel dashboard:

1. Add domain admin.gymleadhub.co.uk → rewrites to /apps/admin-portal
2. Add domain login.gymleadhub.co.uk → rewrites to /apps/gym-dashboard
3. Add domain members.gymleadhub.co.uk → rewrites to /apps/member-portal

## Environment Variables to Add (via Vercel Dashboard)

After deployment, go to each project's settings and add:

### All Projects Need:

```
NEXT_PUBLIC_SUPABASE_URL=https://lzlrojoaxrqvmhempnkn.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjQ1MTA2NTUsImV4cCI6MjA0MDA4NjY1NX0.6taEJs76bZBbeuQBc5qZ0m-pS5ZxUX91RsPh-qvvGK4
SUPABASE_SERVICE_ROLE_KEY=[from your .env.local]
```

### Gym Dashboard Also Needs:

```
UPSTASH_REDIS_REST_URL=https://helping-pegasus-10661.upstash.io
UPSTASH_REDIS_REST_TOKEN=ASmlAAIncDI1OTBiNjA3NDM2NmY0YmIzYmFlYjEwMjVmOTc5M2YwMnAyMTA2NjE
OPENAI_API_KEY=[if you have one]
TWILIO_ACCOUNT_SID=[if you have one]
TWILIO_AUTH_TOKEN=[if you have one]
```

## Verification URLs

After deployment:

- Admin: https://atlas-admin.vercel.app
- Gym: https://atlas-gym-dashboard.vercel.app
- Member: https://atlas-member-portal.vercel.app

## DNS Setup

Add CNAME records:

```
admin.gymleadhub.co.uk → cname.vercel-dns.com
login.gymleadhub.co.uk → cname.vercel-dns.com
members.gymleadhub.co.uk → cname.vercel-dns.com
```

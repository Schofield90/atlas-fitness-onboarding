# Vercel Multi-Project Deployment Guide

## 🎯 Goal: Deploy 3 Separate Vercel Projects

You'll have three independent Vercel projects:

1. **atlas-admin** → admin.gymleadhub.co.uk
2. **atlas-gym-dashboard** → login.gymleadhub.co.uk
3. **atlas-member-portal** → members.gymleadhub.co.uk

## Prerequisites

1. Install Vercel CLI:

```bash
npm i -g vercel
```

2. Login to Vercel:

```bash
vercel login
```

## Step 1: Deploy Admin Portal

```bash
cd apps/admin-portal

# Initialize new Vercel project
vercel

# Answer the prompts:
# - Set up and deploy? Y
# - Which scope? (your account)
# - Link to existing project? N
# - Project name? atlas-admin
# - Directory? ./
# - Override settings? N

# Add environment variables
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY

# Deploy to production
vercel --prod
```

## Step 2: Deploy Gym Dashboard

```bash
cd ../gym-dashboard

# Initialize new Vercel project
vercel

# Answer the prompts:
# - Set up and deploy? Y
# - Which scope? (your account)
# - Link to existing project? N
# - Project name? atlas-gym-dashboard
# - Directory? ./
# - Override settings? N

# Add environment variables (including Redis)
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add UPSTASH_REDIS_REST_URL
vercel env add UPSTASH_REDIS_REST_TOKEN

# Deploy to production
vercel --prod
```

## Step 3: Deploy Member Portal

```bash
cd ../member-portal

# Initialize new Vercel project
vercel

# Answer the prompts:
# - Set up and deploy? Y
# - Which scope? (your account)
# - Link to existing project? N
# - Project name? atlas-member-portal
# - Directory? ./
# - Override settings? N

# Add environment variables
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY

# Deploy to production
vercel --prod
```

## Step 4: Configure Custom Domains

### In Vercel Dashboard:

1. **atlas-admin project**:
   - Go to Settings → Domains
   - Add: `admin.gymleadhub.co.uk`
   - Follow DNS instructions

2. **atlas-gym-dashboard project**:
   - Go to Settings → Domains
   - Add: `login.gymleadhub.co.uk`
   - Follow DNS instructions

3. **atlas-member-portal project**:
   - Go to Settings → Domains
   - Add: `members.gymleadhub.co.uk`
   - Follow DNS instructions

## Step 5: DNS Configuration

Add these CNAME records in your DNS provider:

```
admin.gymleadhub.co.uk    → cname.vercel-dns.com
login.gymleadhub.co.uk    → cname.vercel-dns.com
members.gymleadhub.co.uk  → cname.vercel-dns.com
```

## Environment Variables Per Project

### All Projects Need:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

### Gym Dashboard Also Needs:

```env
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
OPENAI_API_KEY=
```

### Member Portal Also Needs:

```env
# Minimal - mostly public facing
```

## Deployment Commands (After Initial Setup)

```bash
# Deploy admin portal
cd apps/admin-portal && vercel --prod

# Deploy gym dashboard
cd apps/gym-dashboard && vercel --prod

# Deploy member portal
cd apps/member-portal && vercel --prod
```

## Monitoring & Management

Each project will have:

- **Separate deployment history**
- **Independent scaling**
- **Isolated logs**
- **Individual analytics**

View them at:

- https://vercel.com/[your-team]/atlas-admin
- https://vercel.com/[your-team]/atlas-gym-dashboard
- https://vercel.com/[your-team]/atlas-member-portal

## Benefits Achieved

✅ **Independent deployments** - Deploy one without affecting others
✅ **Separate scaling** - Each scales based on its traffic
✅ **Isolated failures** - Issues in one don't affect others
✅ **Better security** - Admin portal completely isolated
✅ **Cost optimization** - Pay per project usage

## Rollback Strategy

Each project can be rolled back independently:

```bash
# List deployments
vercel ls

# Rollback to previous
vercel rollback [deployment-url]
```

## Next Steps

1. Move code to appropriate apps:
   - Admin routes → `apps/admin-portal/app/`
   - Dashboard routes → `apps/gym-dashboard/app/`
   - Member routes → `apps/member-portal/app/`

2. Extract shared code to packages

3. Test each app locally:

   ```bash
   npm run dev:admin    # :3002
   npm run dev:gym      # :3001
   npm run dev:member   # :3003
   ```

4. Deploy and test on Vercel

5. Update DNS records

6. Monitor performance of each project

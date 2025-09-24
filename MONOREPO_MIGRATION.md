# Monorepo Migration Guide - Multiple Vercel Projects

## Overview

We're splitting the Atlas Fitness platform into three separate Next.js applications that can be deployed to individual Vercel projects:

1. **admin-portal** → admin.gymleadhub.co.uk (Super admin only)
2. **gym-dashboard** → login.gymleadhub.co.uk (Gym owners)
3. **member-portal** → members.gymleadhub.co.uk (Gym members)

## Target Structure

```
atlas-fitness-platform/
├── apps/
│   ├── admin-portal/        # Super admin app
│   ├── gym-dashboard/        # Gym owner app
│   └── member-portal/        # Member app
├── packages/
│   ├── shared-ui/           # Shared components
│   ├── database/            # DB schemas & types
│   ├── auth/                # Auth utilities
│   └── redis/               # Redis/caching
├── turbo.json
└── package.json
```

## Step 1: Create App Directories

```bash
# Create the apps directory structure
mkdir -p apps/admin-portal
mkdir -p apps/gym-dashboard
mkdir -p apps/member-portal
mkdir -p packages/shared-ui
mkdir -p packages/database
mkdir -p packages/auth
```

## Step 2: Route Distribution

### Admin Portal Routes

- `/admin/*`
- `/saas-admin/*`
- `/admin-debug/*`
- Super admin specific APIs

### Gym Dashboard Routes

- `/dashboard/*`
- `/leads/*`
- `/booking/*`
- `/classes/*`
- `/settings/*`
- `/automations/*`
- `/integrations/*`
- All gym management features

### Member Portal Routes

- `/client/*`
- `/book/*`
- `/simple-login`
- Member-specific APIs

## Step 3: Shared Packages

### shared-ui package

- Common React components
- Design system components
- Layout components

### database package

- Supabase client configuration
- Database types
- Pooled client utilities

### auth package

- Authentication utilities
- RBAC functions
- Session management

## Step 4: Individual Vercel Deployments

Each app will have its own:

- `vercel.json` configuration
- Environment variables
- Build settings
- Domain configuration

## Step 5: Deployment Commands

```bash
# Deploy admin portal
cd apps/admin-portal
vercel --prod

# Deploy gym dashboard
cd apps/gym-dashboard
vercel --prod

# Deploy member portal
cd apps/member-portal
vercel --prod
```

## Benefits of This Approach

1. **Independent Scaling** - Each app scales based on its usage
2. **Isolated Deployments** - Deploy one without affecting others
3. **Separate CI/CD** - Different deployment pipelines
4. **Security Isolation** - Admin portal completely separated
5. **Cost Optimization** - Pay for what each app uses

## Environment Variables Per App

### Admin Portal (.env)

```
NEXT_PUBLIC_APP_TYPE=admin
NEXT_PUBLIC_BASE_URL=https://admin.gymleadhub.co.uk
```

### Gym Dashboard (.env)

```
NEXT_PUBLIC_APP_TYPE=gym
NEXT_PUBLIC_BASE_URL=https://login.gymleadhub.co.uk
```

### Member Portal (.env)

```
NEXT_PUBLIC_APP_TYPE=member
NEXT_PUBLIC_BASE_URL=https://members.gymleadhub.co.uk
```

## Migration Timeline

1. **Phase 1** (Now): Set up monorepo structure
2. **Phase 2**: Move routes to respective apps
3. **Phase 3**: Extract shared code to packages
4. **Phase 4**: Configure Vercel projects
5. **Phase 5**: Deploy and test
6. **Phase 6**: Switch DNS to new deployments

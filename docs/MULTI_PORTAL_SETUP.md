# Multi-Portal Architecture

## Overview

GymLeadHub uses a single-repo, single-deploy architecture with three distinct user portals:

- **Admin Portal** (`admin.gymleadhub.co.uk`) - SaaS platform administration
- **Owner Portal** (`login.gymleadhub.co.uk`) - Gym owner management dashboard
- **Member Portal** (`members.gymleadhub.co.uk`) - Gym member client portal

## Architecture

### Route Groups

The application uses Next.js route groups to isolate each portal:

```
app/
├── (admin)/       # Admin portal routes
├── (owner)/       # Owner portal routes
├── (member)/      # Member portal routes
├── api/           # Shared API routes
└── ...           # Shared components and utilities
```

### Subdomain Routing

Edge middleware handles subdomain detection and routing:

1. Parses the hostname to extract subdomain
2. Validates user role against portal requirements
3. Rewrites requests to appropriate route group
4. Returns 404 (not 401) for unauthorized access

### RBAC (Role-Based Access Control)

| Portal | Allowed Roles                  | Description                  |
| ------ | ------------------------------ | ---------------------------- |
| Admin  | `superadmin`                   | Platform administrators only |
| Owner  | `owner`, `coach`, `superadmin` | Gym staff and owners         |
| Member | `member`                       | Gym members/clients          |

### Cookie Isolation

Each portal uses separate session cookies:

- Admin: `admin_session`
- Owner: `owner_session`
- Member: `member_session`

Cookies are scoped to their subdomain with `HttpOnly`, `Secure`, and `SameSite=Strict` attributes.

## Local Development Setup

### 1. Configure Hosts File

Add these entries to `/etc/hosts`:

```bash
127.0.0.1 admin.localhost
127.0.0.1 login.localhost
127.0.0.1 members.localhost
```

### 2. Environment Variables

Copy `.env.example` to `.env.local` and configure portal-specific variables:

```bash
cp .env.example .env.local
```

Key variables per portal:

- **Admin**: `ADMIN_SECRET_KEY`, `ADMIN_SENTRY_DSN`, `ADMIN_ANALYTICS_ID`
- **Owner**: `OWNER_STRIPE_*`, `OWNER_TWILIO_*`, `OWNER_OPENAI_API_KEY`
- **Member**: `MEMBER_STRIPE_PUBLISHABLE_KEY`, `MEMBER_ANALYTICS_ID`

### 3. Run Development Server

```bash
npm run dev
```

Access portals at:

- Admin: http://admin.localhost:3000
- Owner: http://login.localhost:3000
- Member: http://members.localhost:3000

## Security Features

### Content Security Policy (CSP)

Each portal has tailored CSP headers:

- **Admin**: Strict CSP, no marketing pixels
- **Owner**: Allows analytics, blocks unsafe inline scripts
- **Member**: Allows analytics for conversion tracking

### Environment Variable Hygiene

- Server-only keys never have `NEXT_PUBLIC_` prefix
- Portal-specific prefixes (`ADMIN_`, `OWNER_`, `MEMBER_`)
- Build-time validation of required variables
- Runtime checks prevent client access to server-only vars

### Cross-Portal Protection

- Cookies scoped to subdomains
- No shared state between portals
- Role validation at edge (middleware)
- Tenant isolation in database queries

## Testing

### Unit Tests

```bash
npm test
```

Key test files:

- `app/lib/auth/__tests__/rbac.test.ts` - RBAC logic
- `app/lib/env/__tests__/validation.test.ts` - Environment validation

### E2E Tests

```bash
npm run test:e2e
```

Tests subdomain routing, role enforcement, and cookie isolation.

### Manual Testing Checklist

- [ ] Admin portal blocks non-superadmin users (404)
- [ ] Owner portal blocks members (404)
- [ ] Member portal blocks owners (404)
- [ ] Cookies don't leak between portals
- [ ] CSP headers applied correctly
- [ ] Analytics tracked separately per portal

## Deployment

### Vercel Configuration

The application auto-deploys with proper subdomain routing on Vercel.

### Production Domains

Configure DNS with your provider:

```
admin.gymleadhub.co.uk    → CNAME to Vercel
login.gymleadhub.co.uk    → CNAME to Vercel
members.gymleadhub.co.uk  → CNAME to Vercel
```

### Environment Variables

Set portal-specific variables in Vercel dashboard:

1. Go to Project Settings → Environment Variables
2. Add variables with appropriate scopes (Production/Preview/Development)
3. Use portal prefixes consistently

## Monitoring

### Analytics

Each portal has separate Google Analytics tracking:

- Admin: `ADMIN_ANALYTICS_ID`
- Owner: `OWNER_ANALYTICS_ID`
- Member: `MEMBER_ANALYTICS_ID`

### Error Tracking

Sentry projects per portal:

- Admin: `ADMIN_SENTRY_DSN`
- Owner: `OWNER_SENTRY_DSN`
- Member: `MEMBER_SENTRY_DSN`

Errors include sanitized `tenant_id` and `role` for debugging.

## Known Limitations

1. **Single Deployment**: All portals deploy together (by design)
2. **Shared Dependencies**: Package updates affect all portals
3. **Build Time**: Larger build due to three portal bundles
4. **Local Development**: Requires hosts file modification

## Migration Guide

If migrating from single portal:

1. Move routes to appropriate `(group)` directories
2. Update import paths to use route groups
3. Update environment variables with portal prefixes
4. Test RBAC with different user roles
5. Verify cookie isolation
6. Update CI/CD for multi-portal tests

## Troubleshooting

### "Not Found" on Valid Route

- Check user role matches portal requirements
- Verify subdomain detection in middleware
- Check route group mapping

### Cookies Not Persisting

- Verify cookie domain configuration
- Check `SameSite` attribute for cross-origin requests
- Ensure HTTPS in production

### Environment Variable Issues

- Run build with `npm run build` to validate
- Check for `NEXT_PUBLIC_` prefix on server-only vars
- Verify portal-specific prefixes

## Support

For issues or questions:

1. Check this documentation
2. Review middleware logs
3. Test with `BYPASS_MIDDLEWARE=true` for isolation
4. Contact platform team with portal-specific details

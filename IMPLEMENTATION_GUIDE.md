# Atlas Fitness - Implementation Guide

## Phase 1: Critical Infrastructure (Completed)

### ✅ What We've Implemented

#### 1. Redis Caching Layer

- **Location**: `/app/lib/redis/`
- **Features**:
  - Tenant-aware caching with organization isolation
  - Configurable TTL for different data types
  - Cache invalidation utilities
  - Batch operations for efficiency

#### 2. Connection Pooling

- **Location**: `/app/lib/supabase/pooled-client.ts`
- **Features**:
  - Connection reuse per organization
  - Automatic retry with exponential backoff
  - Query timeout protection
  - Service client for admin operations

#### 3. Rate Limiting

- **Location**: `/app/lib/redis/rate-limit.ts`
- **Features**:
  - Per-organization rate limits
  - Tiered limits (basic/premium/enterprise)
  - Automatic header injection
  - Redis-backed for distributed systems

### 🔧 How to Use These Features

#### Using Caching in API Routes

```typescript
// app/api/your-route/route.ts
import { withOrgCache, CACHE_TTL } from "@/app/lib/redis";

export async function GET(request: NextRequest) {
  const orgId = request.headers.get("x-organization-id")!;

  // Cache expensive operations
  const data = await withOrgCache(
    orgId,
    "resource-key",
    async () => {
      // Expensive database query here
      return await fetchExpensiveData();
    },
    CACHE_TTL.MEDIUM, // 5 minutes
  );

  return NextResponse.json(data);
}
```

#### Using Connection Pooling

```typescript
// app/api/your-route/route.ts
import { queryWithTenantIsolation } from "@/app/lib/supabase/pooled-client";

export async function GET(request: NextRequest) {
  const orgId = request.headers.get("x-organization-id")!;

  const result = await queryWithTenantIsolation(orgId, async (client) => {
    return client.from("your_table").select("*").eq("organization_id", orgId);
  });

  return NextResponse.json(result);
}
```

#### Adding Rate Limiting

```typescript
// app/api/your-route/route.ts
import { rateLimit } from "@/app/lib/redis/rate-limit";

export async function POST(request: NextRequest) {
  const orgId = request.headers.get("x-organization-id")!;

  // Apply rate limiting
  const rateLimitResult = await rateLimit(request, {
    organizationId: orgId,
    tier: "basic",
  });

  if (rateLimitResult && "status" in rateLimitResult) {
    return rateLimitResult; // 429 Too Many Requests
  }

  // Your API logic here
}
```

## Setup Instructions

### 1. Set Up Redis (Required for Production)

1. Sign up for [Upstash](https://upstash.com)
2. Create a new Redis database
3. Copy your credentials to `.env.local`:

```bash
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-redis-token
```

### 2. Configure Environment Variables

Copy the example file:

```bash
cp .env.example .env.local
```

Fill in your values, especially:

- Supabase credentials
- Redis credentials
- Rate limiting tiers

### 3. Test the Implementation

Test the example cached API:

```bash
# Get cached stats
curl http://localhost:3000/api/example-cached \
  -H "x-organization-id: your-org-id"

# Clear cache
curl -X POST http://localhost:3000/api/example-cached \
  -H "x-organization-id: your-org-id" \
  -H "x-user-role: owner"
```

## Next Steps: Critical RLS Fixes

### Tables Requiring RLS Policies

Run this SQL to identify tables without RLS:

```sql
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename NOT IN (
    SELECT tablename
    FROM pg_policies
    WHERE schemaname = 'public'
  );
```

### RLS Policy Template

For each table, apply this pattern:

```sql
-- Enable RLS
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;

-- Add organization_id if missing
ALTER TABLE table_name
ADD COLUMN IF NOT EXISTS organization_id UUID
REFERENCES organizations(id);

-- Create isolation policy
CREATE POLICY "tenant_isolation" ON table_name
FOR ALL USING (
  organization_id IN (
    SELECT organization_id
    FROM organization_staff
    WHERE user_id = auth.uid()
  )
);
```

## Migration to Multi-Zone Architecture

### Current Issues to Fix

1. **Hardcoded domains** - Search and replace:
   - `members.gymleadhub.co.uk` → Use environment variable
   - `login.gymleadhub.co.uk` → Use environment variable

2. **Post-fetch filtering** - Replace patterns like:

   ```typescript
   // BAD - Fetches all then filters
   const all = await supabase.from("table").select("*");
   const filtered = all.filter((x) => x.org_id === orgId);

   // GOOD - Filters at database level
   const filtered = await supabase
     .from("table")
     .select("*")
     .eq("organization_id", orgId);
   ```

3. **Missing organization context** - Ensure all API routes check:
   ```typescript
   const orgId = request.headers.get("x-organization-id");
   if (!orgId) {
     return NextResponse.json(
       { error: "Organization required" },
       { status: 400 },
     );
   }
   ```

### Monorepo Structure (Future)

When ready to split into multiple apps:

1. Install Turborepo:

   ```bash
   npm install -D turbo
   ```

2. Create turbo.json:

   ```json
   {
     "pipeline": {
       "build": {
         "dependsOn": ["^build"],
         "outputs": [".next/**"]
       },
       "dev": {
         "cache": false
       }
     }
   }
   ```

3. Split apps gradually:
   - Start with extracting shared components
   - Move subdomain-specific code
   - Keep single database

## Performance Monitoring

### Key Metrics to Track

1. **Cache Hit Rate**

   ```typescript
   // Add to your monitoring
   const cacheHitRate = cacheHits / (cacheHits + cacheMisses);
   ```

2. **Database Connection Usage**

   ```typescript
   import { getSupabasePoolStats } from "@/app/lib/supabase/pooled-client";
   const stats = getSupabasePoolStats();
   ```

3. **Rate Limit Violations**
   - Monitor 429 responses
   - Track by organization
   - Adjust tiers as needed

### Recommended Monitoring Tools

- **Sentry** - Error tracking
- **PostHog** - Analytics
- **Upstash Console** - Redis metrics
- **Supabase Dashboard** - Database performance

## Security Checklist

- [ ] All tables have RLS enabled
- [ ] Organization_id on every table
- [ ] Service role key only used for admin operations
- [ ] Rate limiting on all public endpoints
- [ ] Cache keys include organization context
- [ ] No post-fetch filtering
- [ ] Proper error handling (no stack traces in production)
- [ ] Environment variables for all sensitive data

## Troubleshooting

### Redis Not Working

- Check credentials in `.env.local`
- Verify Upstash database is active
- Application works without Redis (bypasses caching)

### Rate Limiting Issues

- Check Redis connection
- Verify organization ID is being passed
- Monitor rate limit headers in responses

### Connection Pool Exhaustion

- Increase `DATABASE_POOL_SIZE`
- Check for connection leaks
- Monitor long-running queries

## Support

For implementation questions:

- Review `/app/api/example-cached/route.ts` for reference
- Check `ARCHITECTURE.md` for design decisions
- Test with the provided example endpoints

---

_Last Updated: September 2024_
_Phase 1 Implementation Complete_

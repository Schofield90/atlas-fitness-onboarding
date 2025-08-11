# Redis Caching Layer Implementation Guide

## Overview

This guide covers the comprehensive Redis caching implementation for the Atlas Fitness CRM. The caching layer is designed to support 100+ businesses with sub-200ms API response times through intelligent multi-tenant caching, cache warming, and monitoring.

## Architecture

### Core Components

1. **Redis Client** (`/app/lib/cache/redis-client.ts`)
   - Singleton Redis connection manager
   - Support for both standard Redis and Upstash Redis
   - Connection health monitoring and automatic reconnection
   - Graceful fallback when Redis is unavailable

2. **Cache Utilities** (`/app/lib/cache/cache-utils.ts`)
   - Multi-tenant cache key generation
   - TTL management with predefined durations
   - Cache-aside pattern implementation
   - Distributed lock mechanism for cache stampede prevention
   - Stale-while-revalidate pattern for better UX

3. **Cached Services**
   - Lead Service: 5-minute TTL for lists, stale-while-revalidate for details
   - Analytics Service: 1-minute TTL for dashboard, 5-minute for historical data
   - Organization Service: 10-minute TTL for settings, 5-minute for permissions
   - Booking Service: 5-minute TTL for schedules, 2-minute for availability

4. **Cache Monitoring** (`/app/lib/cache/cache-monitor.ts`)
   - Real-time health monitoring
   - Hit/miss ratio tracking
   - Memory usage monitoring
   - Automatic optimization recommendations

## Setup Instructions

### 1. Environment Configuration

Add the following to your `.env.local` file:

```bash
# For local Redis
REDIS_URL=redis://localhost:6379

# OR for Upstash Redis (recommended for production)
UPSTASH_REDIS_REST_URL=https://your-redis-instance.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-upstash-token

# Optional Redis configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your-password
REDIS_TLS=false
```

### 2. Local Development Setup

For local development with Docker:

```bash
# Start Redis with Docker
docker run -d --name atlas-redis -p 6379:6379 redis:alpine

# Or with Docker Compose (add to docker-compose.yml)
services:
  redis:
    image: redis:alpine
    ports:
      - "6379:6379"
    command: redis-server --maxmemory 256mb --maxmemory-policy allkeys-lru
```

### 3. Upstash Redis Setup (Production)

1. Create account at [Upstash](https://upstash.com/)
2. Create a new Redis database
3. Copy the REST URL and token to your environment variables
4. Configure in Vercel/deployment platform

### 4. Dependencies

The required dependencies are already installed:
- `ioredis`: Redis client for Node.js
- `bullmq`: Queue management (uses Redis)

## Cache Strategy by Service

### Lead Management
```typescript
// Cache keys: org:{orgId}:lead:{type}:{hash}
// TTL: 5 minutes for lists, stale-while-revalidate for details

await cachedLeadService.getLeads(orgId, filters, page, limit)
await cachedLeadService.searchLeads(orgId, query, filters)
await cachedLeadService.getLead(leadId) // Stale-while-revalidate
```

### Dashboard & Analytics  
```typescript
// Cache keys: org:{orgId}:dashboard:{type}
// TTL: 1 minute for real-time, 5 minutes for historical

await cachedAnalyticsService.getDashboardMetrics(orgId) // 1min TTL
await cachedAnalyticsService.getRealTimeDashboardMetrics(orgId) // 30s TTL
await cachedAnalyticsService.getFullDashboard(orgId) // Parallel fetch
```

### Organization Settings
```typescript
// Cache keys: org:{orgId}:settings:{type}
// TTL: 10 minutes for settings, 5 minutes for permissions

await cachedOrganizationService.getOrganizationSettings(orgId) // 10min TTL
await cachedOrganizationService.getUserPermissions(userId, orgId) // 5min TTL
await cachedOrganizationService.getFeatureFlags(orgId) // 5min TTL
```

### Class Schedules & Bookings
```typescript
// Cache keys: org:{orgId}:class:{type}:{date}
// TTL: 5 minutes for schedules, 2 minutes for availability

await cachedBookingService.getClassSchedule(orgId, startDate, endDate)
await cachedBookingService.getAvailableSlots(orgId, date) // 2min TTL
await cachedBookingService.getClassSession(sessionId)
```

## API Integration

### Cached API Endpoints

Use the cached versions of API endpoints for better performance:

```typescript
// Instead of /api/leads, use:
GET /api/leads/cached
POST /api/leads/cached
PATCH /api/leads/cached

// Instead of /api/dashboard, use:
GET /api/dashboard/cached?type=full
GET /api/dashboard/cached?type=realtime
POST /api/dashboard/cached (for cache actions)
```

### Cache Management APIs

```typescript
// Cache health monitoring
GET /api/cache/health
GET /api/cache/health?detailed=true
POST /api/cache/health (start/stop monitoring)

// Cache metrics
GET /api/cache/metrics
GET /api/cache/metrics?orgId=123
POST /api/cache/metrics (reset/optimize)

// Cache invalidation
POST /api/cache/invalidate
{
  "type": "organization",
  "orgId": "123",
  "resource": "leads" // optional
}

// Cache warming
POST /api/cache/warm
{
  "orgId": "123",
  "services": ["analytics", "leads"],
  "priority": "parallel"
}
```

## Multi-Tenant Cache Isolation

Cache keys are automatically namespaced by organization:

```
org:{orgId}:lead:list:{filterHash}
org:{orgId}:dashboard:metrics
org:{orgId}:settings:config
org:{orgId}:permissions:user:{userId}
```

This ensures complete isolation between organizations.

## Cache Warming Strategies

### Automatic Warming

The system automatically warms caches in these scenarios:

1. **First user login** - Organization settings and permissions
2. **Dashboard access** - Analytics and metrics data
3. **CRM usage** - Lead lists and recent data
4. **Booking system** - Class schedules and availability

### Manual Warming

Use the warming API for planned cache warming:

```bash
# Warm all caches for organization
curl -X POST /api/cache/warm \
  -H "Content-Type: application/json" \
  -d '{"orgId": "123", "services": ["all"]}'

# Warm specific services
curl -X POST /api/cache/warm \
  -H "Content-Type: application/json" \
  -d '{"orgId": "123", "services": ["analytics", "leads"], "priority": "sequential"}'
```

## Monitoring and Alerting

### Built-in Monitoring

The cache monitor tracks:
- Connection health and latency
- Hit/miss ratios by service
- Memory usage and key counts
- Error rates and performance

### Health Check Endpoint

```bash
# Basic health check
curl /api/cache/health

# Detailed monitoring report
curl /api/cache/health?detailed=true
```

### Alerts and Recommendations

The system generates automatic alerts for:
- Low hit ratios (< 50% warning, < 30% critical)
- High latency (> 100ms warning, > 500ms critical)
- Memory usage (> 80% warning, > 95% critical)
- Connection issues

## Performance Optimization

### Cache Hit Ratio Optimization

1. **Monitor hit ratios** regularly using `/api/cache/metrics`
2. **Adjust TTL values** based on data change frequency
3. **Implement cache warming** for frequently accessed data
4. **Use stale-while-revalidate** for better user experience

### Memory Management

1. **Set appropriate TTL values** to prevent memory bloat
2. **Use Redis eviction policies** (allkeys-lru recommended)
3. **Monitor key counts** per organization
4. **Regular cache optimization** via `/api/cache/metrics` POST

### Response Time Targets

With proper caching:
- Dashboard metrics: < 100ms (cached)
- Lead lists: < 150ms (cached)
- Search results: < 200ms (cached)
- Class schedules: < 100ms (cached)

## Deployment Considerations

### Development
```bash
# Use local Redis
REDIS_URL=redis://localhost:6379
```

### Staging/Production
```bash
# Use Upstash Redis for reliability
UPSTASH_REDIS_REST_URL=https://your-instance.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token
```

### Vercel Deployment

1. Add environment variables in Vercel dashboard
2. Redis connection will auto-initialize on first request
3. Monitor cache health via API endpoints

## Best Practices

### Do's
✅ Use cached services instead of direct database queries
✅ Monitor cache hit ratios regularly  
✅ Warm caches during off-peak hours
✅ Set appropriate TTL values based on data volatility
✅ Use stale-while-revalidate for better UX
✅ Implement graceful fallbacks when cache fails

### Don'ts
❌ Don't cache sensitive data without proper encryption
❌ Don't set TTL values too high for frequently changing data
❌ Don't ignore cache health alerts
❌ Don't flush cache unnecessarily in production
❌ Don't cache large objects without consideration

## Troubleshooting

### Common Issues

1. **Cache misses high**
   - Check TTL values
   - Verify cache warming
   - Monitor data change frequency

2. **Redis connection issues**  
   - Verify environment variables
   - Check Redis server status
   - Review connection logs

3. **Memory usage high**
   - Review cached data sizes
   - Adjust TTL values
   - Run cache optimization

4. **Performance not improving**
   - Check hit ratios
   - Verify cached endpoints are being used
   - Monitor query patterns

### Debug Commands

```bash
# Check cache health
curl /api/cache/health?detailed=true

# Get organization metrics
curl "/api/cache/metrics?orgId=123"

# Reset statistics
curl -X POST /api/cache/metrics -d '{"action": "reset"}'

# Optimize cache
curl -X POST /api/cache/metrics -d '{"action": "optimize"}'
```

## Migration from Existing System

### Gradual Migration

1. Start with read-only caching on analytics
2. Move to cached lead services
3. Implement cached booking system  
4. Add organization settings caching
5. Enable full caching across all services

### Testing Strategy

1. Compare response times before/after caching
2. Verify data consistency between cache and database
3. Test cache invalidation scenarios
4. Monitor hit ratios and adjust TTL values
5. Load test with multiple organizations

## Future Enhancements

1. **Redis Cluster** support for high availability
2. **Cache compression** for large objects
3. **Intelligent prefetching** based on user patterns
4. **Cross-region replication** for global deployment
5. **ML-based TTL optimization** based on access patterns

This comprehensive caching implementation provides the foundation for supporting 100+ organizations with sub-200ms response times while maintaining data consistency and reliability.
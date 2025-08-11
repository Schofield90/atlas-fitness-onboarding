import { NextRequest, NextResponse } from 'next/server';
import { cacheService, getCacheHealth } from '@/app/lib/cache/cache-utils';
import { logger } from '@/app/lib/logger/logger';

/**
 * Cache Middleware
 * 
 * Adds cache health monitoring headers and handles cache warming
 * for incoming requests
 */
export function cacheMiddleware(request: NextRequest) {
  const response = NextResponse.next();
  
  // Add cache health header for monitoring
  addCacheHealthHeaders(response);
  
  // Handle cache warming for dashboard routes
  handleCacheWarming(request);
  
  return response;
}

/**
 * Add cache health information to response headers
 */
async function addCacheHealthHeaders(response: NextResponse) {
  try {
    const health = await getCacheHealth();
    
    // Add custom headers for cache monitoring
    response.headers.set('X-Cache-Status', health.connected ? 'healthy' : 'disconnected');
    
    if (health.connected && health.latency) {
      response.headers.set('X-Cache-Latency', health.latency.toString());
    }
    
    // Add overall hit ratio if available
    const stats = cacheService.getCacheStats();
    const overallHitRatio = calculateOverallHitRatio(stats);
    if (overallHitRatio > 0) {
      response.headers.set('X-Cache-Hit-Ratio', (overallHitRatio * 100).toFixed(1));
    }
    
    // Add cache recommendation header
    if (overallHitRatio < 0.5) {
      response.headers.set('X-Cache-Recommendation', 'Consider cache warming');
    }
    
  } catch (error) {
    logger.error('Failed to add cache health headers:', error);
    response.headers.set('X-Cache-Status', 'error');
  }
}

/**
 * Handle automatic cache warming for critical routes
 */
function handleCacheWarming(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  // Identify critical routes that benefit from cache warming
  const criticalRoutes = [
    '/dashboard',
    '/leads',
    '/analytics',
    '/booking',
    '/classes'
  ];
  
  const isCriticalRoute = criticalRoutes.some(route => pathname.startsWith(route));
  
  if (isCriticalRoute) {
    // Schedule cache warming (async, don't block request)
    scheduleCacheWarming(request);
  }
}

/**
 * Schedule cache warming based on request context
 */
async function scheduleCacheWarming(request: NextRequest) {
  try {
    // Extract organization ID from various sources
    const orgId = extractOrganizationId(request);
    
    if (!orgId) return;
    
    // Warm cache based on route
    const pathname = request.nextUrl.pathname;
    
    if (pathname.startsWith('/dashboard')) {
      // Warm analytics cache
      const { cachedAnalyticsService } = await import('@/app/lib/cache/cached-analytics-service');
      cachedAnalyticsService.warmAnalyticsCaches(orgId).catch(error => {
        logger.error('Failed to warm analytics cache:', error);
      });
    } else if (pathname.startsWith('/leads')) {
      // Warm lead cache
      const { cachedLeadService } = await import('@/app/lib/cache/cached-lead-service');
      cachedLeadService.warmLeadCaches(orgId).catch(error => {
        logger.error('Failed to warm lead cache:', error);
      });
    } else if (pathname.startsWith('/booking') || pathname.startsWith('/classes')) {
      // Warm booking cache
      const { cachedBookingService } = await import('@/app/lib/cache/cached-booking-service');
      cachedBookingService.warmBookingCaches(orgId).catch(error => {
        logger.error('Failed to warm booking cache:', error);
      });
    }
    
  } catch (error) {
    logger.error('Cache warming scheduling failed:', error);
  }
}

/**
 * Extract organization ID from request
 */
function extractOrganizationId(request: NextRequest): string | null {
  // Try to extract from various sources
  
  // From URL parameters
  const searchParams = request.nextUrl.searchParams;
  const orgIdFromParams = searchParams.get('orgId') || searchParams.get('organizationId');
  if (orgIdFromParams) return orgIdFromParams;
  
  // From pathname (e.g., /org/123/dashboard)
  const pathSegments = request.nextUrl.pathname.split('/');
  const orgIndex = pathSegments.indexOf('org');
  if (orgIndex !== -1 && pathSegments[orgIndex + 1]) {
    return pathSegments[orgIndex + 1];
  }
  
  // From headers (for API routes)
  const orgIdFromHeader = request.headers.get('x-organization-id');
  if (orgIdFromHeader) return orgIdFromHeader;
  
  // Could also extract from JWT token, cookies, etc.
  
  return null;
}

/**
 * Calculate overall hit ratio from cache stats
 */
function calculateOverallHitRatio(stats: Record<string, any>): number {
  let totalHits = 0;
  let totalRequests = 0;
  
  Object.values(stats).forEach((stat: any) => {
    totalHits += stat.hits || 0;
    totalRequests += (stat.hits || 0) + (stat.misses || 0);
  });
  
  return totalRequests > 0 ? totalHits / totalRequests : 0;
}

/**
 * Cache warming strategy based on user behavior
 */
export interface CacheWarmingStrategy {
  route: string;
  priority: 'high' | 'medium' | 'low';
  services: string[];
  conditions?: {
    timeOfDay?: string[];
    userRole?: string[];
    frequency?: 'always' | 'first-visit' | 'periodic';
  };
}

/**
 * Default cache warming strategies
 */
export const DEFAULT_WARMING_STRATEGIES: CacheWarmingStrategy[] = [
  {
    route: '/dashboard',
    priority: 'high',
    services: ['analytics', 'organization'],
    conditions: {
      frequency: 'first-visit',
      timeOfDay: ['morning', 'afternoon'] // 9 AM - 5 PM
    }
  },
  {
    route: '/leads',
    priority: 'high',
    services: ['leads', 'organization'],
    conditions: {
      frequency: 'first-visit',
      userRole: ['admin', 'sales']
    }
  },
  {
    route: '/booking',
    priority: 'medium',
    services: ['bookings', 'classes'],
    conditions: {
      frequency: 'always' // Always warm for booking performance
    }
  },
  {
    route: '/analytics',
    priority: 'medium',
    services: ['analytics'],
    conditions: {
      frequency: 'periodic',
      userRole: ['admin', 'manager']
    }
  }
];

/**
 * Advanced cache warming with strategy evaluation
 */
export async function advancedCacheWarming(
  request: NextRequest,
  strategies: CacheWarmingStrategy[] = DEFAULT_WARMING_STRATEGIES
) {
  const pathname = request.nextUrl.pathname;
  const currentHour = new Date().getHours();
  const timeOfDay = getTimeOfDay(currentHour);
  
  // Find matching strategies
  const matchingStrategies = strategies.filter(strategy => 
    pathname.startsWith(strategy.route)
  );
  
  for (const strategy of matchingStrategies) {
    // Check conditions
    if (strategy.conditions?.timeOfDay && 
        !strategy.conditions.timeOfDay.includes(timeOfDay)) {
      continue;
    }
    
    // Execute warming based on priority
    if (strategy.priority === 'high') {
      // Immediate warming
      await executeCacheWarming(request, strategy);
    } else {
      // Schedule for later
      setTimeout(() => {
        executeCacheWarming(request, strategy);
      }, strategy.priority === 'medium' ? 1000 : 5000);
    }
  }
}

function getTimeOfDay(hour: number): string {
  if (hour >= 6 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'afternoon';
  if (hour >= 18 && hour < 22) return 'evening';
  return 'night';
}

async function executeCacheWarming(
  request: NextRequest, 
  strategy: CacheWarmingStrategy
): Promise<void> {
  const orgId = extractOrganizationId(request);
  if (!orgId) return;
  
  try {
    for (const service of strategy.services) {
      switch (service) {
        case 'analytics':
          const { cachedAnalyticsService } = await import('@/app/lib/cache/cached-analytics-service');
          await cachedAnalyticsService.warmAnalyticsCaches(orgId);
          break;
        case 'leads':
          const { cachedLeadService } = await import('@/app/lib/cache/cached-lead-service');
          await cachedLeadService.warmLeadCaches(orgId);
          break;
        case 'bookings':
          const { cachedBookingService } = await import('@/app/lib/cache/cached-booking-service');
          await cachedBookingService.warmBookingCaches(orgId);
          break;
        case 'organization':
          const { cachedOrganizationService } = await import('@/app/lib/cache/cached-organization-service');
          // This would need userId - could extract from auth context
          break;
      }
    }
    
    logger.info(`Cache warming completed for strategy: ${strategy.route} (${strategy.priority})`);
    
  } catch (error) {
    logger.error(`Cache warming failed for strategy ${strategy.route}:`, error);
  }
}
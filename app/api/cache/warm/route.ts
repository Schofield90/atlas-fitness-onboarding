import { NextRequest, NextResponse } from 'next/server';
import { cacheMonitor } from '@/app/lib/cache/cache-monitor';
import { cachedAnalyticsService } from '@/app/lib/cache/cached-analytics-service';
import { cachedLeadService } from '@/app/lib/cache/cached-lead-service';
import { cachedOrganizationService } from '@/app/lib/cache/cached-organization-service';
import { cachedBookingService } from '@/app/lib/cache/cached-booking-service';
import { logger } from '@/app/lib/logger/logger';

/**
 * Cache Warming API
 * 
 * POST /api/cache/warm - Warm cache for organization or specific services
 * GET /api/cache/warm - Get cache warming plans and recommendations
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orgId, userId, services, priority } = body;
    
    if (!orgId) {
      return NextResponse.json({
        success: false,
        error: 'Missing orgId',
        message: 'Organization ID is required for cache warming'
      }, { status: 400 });
    }
    
    const startTime = Date.now();
    const results: any[] = [];
    const selectedServices = services || ['all'];
    
    // Define service warming functions
    const serviceWarming = {
      organization: async () => {
        if (!userId) throw new Error('userId required for organization cache warming');
        await cachedOrganizationService.warmOrganizationCaches(userId, orgId);
        return 'organization';
      },
      analytics: async () => {
        await cachedAnalyticsService.warmAnalyticsCaches(orgId);
        return 'analytics';
      },
      leads: async () => {
        await cachedLeadService.warmLeadCaches(orgId);
        return 'leads';
      },
      bookings: async () => {
        await cachedBookingService.warmBookingCaches(orgId);
        return 'bookings';
      }
    };
    
    // Determine which services to warm
    let servicesToWarm: string[] = [];
    
    if (selectedServices.includes('all')) {
      servicesToWarm = Object.keys(serviceWarming);
    } else {
      servicesToWarm = selectedServices.filter((service: string) => 
        Object.keys(serviceWarming).includes(service)
      );
    }
    
    if (servicesToWarm.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No valid services specified',
        message: 'Available services: organization, analytics, leads, bookings, or "all"'
      }, { status: 400 });
    }
    
    // Execute cache warming based on priority
    if (priority === 'parallel') {
      // Warm all services in parallel (faster but more resource intensive)
      const warmingPromises = servicesToWarm.map(async (service) => {
        try {
          const startServiceTime = Date.now();
          await (serviceWarming as any)[service]();
          const duration = Date.now() - startServiceTime;
          
          return {
            service,
            success: true,
            duration,
            timestamp: new Date().toISOString()
          };
        } catch (error) {
          logger.error(`Cache warming failed for ${service}:`, error);
          return {
            service,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
          };
        }
      });
      
      const warmingResults = await Promise.allSettled(warmingPromises);
      results.push(...warmingResults.map(result => 
        result.status === 'fulfilled' ? result.value : {
          success: false,
          error: 'Promise rejected',
          reason: result.reason
        }
      ));
      
    } else {
      // Warm services sequentially (slower but more controlled)
      for (const service of servicesToWarm) {
        try {
          const startServiceTime = Date.now();
          await (serviceWarming as any)[service]();
          const duration = Date.now() - startServiceTime;
          
          results.push({
            service,
            success: true,
            duration,
            timestamp: new Date().toISOString()
          });
        } catch (error) {
          logger.error(`Cache warming failed for ${service}:`, error);
          results.push({
            service,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
          });
        }
      }
    }
    
    const totalDuration = Date.now() - startTime;
    const successCount = results.filter(r => r.success).length;
    
    logger.info(`Cache warming completed for org ${orgId}: ${successCount}/${results.length} services warmed in ${totalDuration}ms`);
    
    return NextResponse.json({
      success: successCount > 0,
      message: `Cache warming completed: ${successCount}/${results.length} services warmed successfully`,
      data: {
        orgId,
        totalDuration,
        servicesWarmed: successCount,
        totalServices: results.length,
        results,
        strategy: priority || 'sequential'
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('Cache warming failed:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Cache warming failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * GET /api/cache/warm - Get cache warming recommendations and plans
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get('orgId');
    
    if (orgId) {
      // Get warming plan for specific organization
      const warmingPlan = cacheMonitor.generateWarmingPlan(orgId);
      
      return NextResponse.json({
        success: true,
        data: {
          plan: warmingPlan,
          recommendations: generateWarmingRecommendations(orgId),
          estimatedImpact: calculateWarmingImpact(warmingPlan)
        },
        timestamp: new Date().toISOString()
      });
      
    } else {
      // Get general warming options and best practices
      return NextResponse.json({
        success: true,
        data: {
          availableServices: [
            {
              name: 'organization',
              description: 'Organization settings, permissions, and feature flags',
              priority: 1,
              estimatedTime: 500,
              requirements: ['orgId', 'userId']
            },
            {
              name: 'analytics',
              description: 'Dashboard metrics and analytics data',
              priority: 2,
              estimatedTime: 1000,
              requirements: ['orgId']
            },
            {
              name: 'leads',
              description: 'Lead lists, stats, and search results',
              priority: 3,
              estimatedTime: 1500,
              requirements: ['orgId']
            },
            {
              name: 'bookings',
              description: 'Class schedules and booking data',
              priority: 4,
              estimatedTime: 2000,
              requirements: ['orgId']
            }
          ],
          strategies: [
            {
              name: 'sequential',
              description: 'Warm services one by one (recommended for production)',
              pros: ['Lower resource usage', 'More predictable', 'Better error isolation'],
              cons: ['Slower overall completion']
            },
            {
              name: 'parallel',
              description: 'Warm all services simultaneously (faster but resource intensive)',
              pros: ['Faster completion', 'Better for development/testing'],
              cons: ['Higher resource usage', 'Potential for cache contention']
            }
          ],
          bestPractices: [
            'Warm caches during low-traffic periods',
            'Start with high-priority services (organization, dashboard)',
            'Use sequential warming in production environments',
            'Monitor cache hit ratios after warming',
            'Consider warming caches after data updates'
          ]
        },
        timestamp: new Date().toISOString()
      });
    }
    
  } catch (error) {
    logger.error('Cache warming info retrieval failed:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Cache warming info retrieval failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

function generateWarmingRecommendations(orgId: string): string[] {
  const recommendations = [
    'Start with organization settings cache for immediate user experience improvement',
    'Dashboard metrics cache provides the highest visibility impact',
    'Lead caches improve CRM performance significantly',
    'Schedule cache warming during off-peak hours for best results',
  ];
  
  // Add time-based recommendations
  const hour = new Date().getHours();
  if (hour >= 9 && hour <= 17) {
    recommendations.push('Consider warming during evening hours (after 6 PM) to avoid peak usage');
  } else {
    recommendations.push('Current time is optimal for cache warming (off-peak hours)');
  }
  
  return recommendations;
}

function calculateWarmingImpact(plan: any) {
  return {
    expectedHitRatioImprovement: '15-25%',
    responseTimeImprovement: '200-500ms faster',
    userExperienceImpact: 'Significant improvement in dashboard load times',
    recommendedFrequency: 'After major data updates or during deployment',
    optimalTiming: 'Off-peak hours (evening/early morning)'
  };
}
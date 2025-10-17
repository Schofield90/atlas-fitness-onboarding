import { analyticsService, type DashboardMetrics, type LeadAnalytics, type RevenueAnalytics } from '@/src/services/analytics.service';
import { 
  cacheService, 
  getCacheKey, 
  CACHE_TTL, 
  CACHE_PREFIXES,
  getOrSet,
  invalidateOrgCache 
} from './cache-utils';
import { logger } from '@/app/lib/logger/logger';

/**
 * Enhanced Cached Analytics Service
 * 
 * Cache Strategy:
 * - Dashboard metrics: 1 minute TTL with stale-while-revalidate
 * - Lead analytics: 5 minute TTL  
 * - Revenue analytics: 5 minute TTL
 * - Real-time metrics: 30 second TTL
 * - Historical data: 1 hour TTL
 */
class CachedAnalyticsService {
  private readonly DASHBOARD_TTL = CACHE_TTL.DASHBOARD_METRICS;
  private readonly ANALYTICS_TTL = CACHE_TTL.MEDIUM_TERM;
  private readonly REALTIME_TTL = 30; // 30 seconds for real-time data
  private readonly HISTORICAL_TTL = CACHE_TTL.LONG_TERM;

  /**
   * Get dashboard metrics with aggressive caching and stale-while-revalidate
   */
  async getDashboardMetrics(orgId: string): Promise<DashboardMetrics | null> {
    const cacheKey = getCacheKey(orgId, CACHE_PREFIXES.DASHBOARD, 'metrics');
    
    return cacheService.getStaleWhileRevalidate(
      cacheKey,
      () => analyticsService.getDashboardMetrics(orgId),
      this.DASHBOARD_TTL,
      this.DASHBOARD_TTL * 3 // Keep stale data for 3 minutes
    );
  }

  /**
   * Get real-time dashboard metrics (shorter TTL)
   */
  async getRealTimeDashboardMetrics(orgId: string): Promise<DashboardMetrics | null> {
    const cacheKey = getCacheKey(orgId, CACHE_PREFIXES.DASHBOARD, 'realtime');
    
    return getOrSet(
      cacheKey,
      () => analyticsService.getDashboardMetrics(orgId),
      this.REALTIME_TTL
    );
  }

  /**
   * Get lead analytics with caching
   */
  async getLeadAnalytics(orgId: string, days: number = 30): Promise<LeadAnalytics | null> {
    const cacheKey = getCacheKey(orgId, CACHE_PREFIXES.ANALYTICS, 'leads', days.toString());
    
    return getOrSet(
      cacheKey,
      () => analyticsService.getLeadAnalytics(orgId, days),
      this.ANALYTICS_TTL
    );
  }

  /**
   * Get revenue analytics with caching
   */
  async getRevenueAnalytics(orgId: string, days: number = 30): Promise<RevenueAnalytics | null> {
    const cacheKey = getCacheKey(orgId, CACHE_PREFIXES.ANALYTICS, 'revenue', days.toString());
    
    return getOrSet(
      cacheKey,
      () => analyticsService.getRevenueAnalytics(orgId, days),
      this.ANALYTICS_TTL
    );
  }

  /**
   * Get conversion funnel analytics with caching
   */
  async getConversionFunnel(orgId: string, period: 'week' | 'month' | 'quarter' = 'month') {
    const cacheKey = getCacheKey(orgId, CACHE_PREFIXES.ANALYTICS, 'funnel', period);
    
    return getOrSet(
      cacheKey,
      async () => {
        // Get lead analytics to derive funnel data
        const days = period === 'week' ? 7 : period === 'month' ? 30 : 90;
        const leadAnalytics = await analyticsService.getLeadAnalytics(orgId, days);
        
        if (!leadAnalytics) return null;

        // Calculate funnel stages
        const totalLeads = Object.values(leadAnalytics.byStatus).reduce((sum, count) => sum + count, 0);
        const contacted = leadAnalytics.byStatus['contacted'] || 0;
        const qualified = leadAnalytics.byStatus['qualified'] || 0;
        const converted = leadAnalytics.byStatus['converted'] || 0;

        return {
          stages: [
            { name: 'Leads', count: totalLeads, percentage: 100 },
            { name: 'Contacted', count: contacted, percentage: totalLeads > 0 ? (contacted / totalLeads) * 100 : 0 },
            { name: 'Qualified', count: qualified, percentage: totalLeads > 0 ? (qualified / totalLeads) * 100 : 0 },
            { name: 'Converted', count: converted, percentage: totalLeads > 0 ? (converted / totalLeads) * 100 : 0 },
          ],
          conversionRate: totalLeads > 0 ? (converted / totalLeads) * 100 : 0,
          period
        };
      },
      this.ANALYTICS_TTL
    );
  }

  /**
   * Get top performing sources with caching
   */
  async getTopSources(orgId: string, limit: number = 10) {
    const cacheKey = getCacheKey(orgId, CACHE_PREFIXES.ANALYTICS, 'top-sources', limit.toString());
    
    return getOrSet(
      cacheKey,
      async () => {
        const leadAnalytics = await analyticsService.getLeadAnalytics(orgId, 30);
        if (!leadAnalytics) return [];

        return Object.entries(leadAnalytics.bySource)
          .sort(([, a], [, b]) => b - a)
          .slice(0, limit)
          .map(([source, count]) => ({ source, count }));
      },
      this.ANALYTICS_TTL
    );
  }

  /**
   * Get campaign performance metrics with caching
   */
  async getCampaignPerformance(orgId: string, campaignId?: string) {
    const cacheKey = getCacheKey(
      orgId, 
      CACHE_PREFIXES.CAMPAIGN, 
      'performance',
      campaignId || 'all'
    );
    
    return getOrSet(
      cacheKey,
      async () => {
        // This would integrate with actual campaign data
        // For now, return mock data structure
        return {
          totalSpend: 0,
          totalLeads: 0,
          costPerLead: 0,
          conversionRate: 0,
          roi: 0,
          impressions: 0,
          clicks: 0,
          ctr: 0,
          campaigns: []
        };
      },
      CACHE_TTL.CAMPAIGN_PERFORMANCE
    );
  }

  /**
   * Get historical trends with longer caching
   */
  async getHistoricalTrends(
    orgId: string, 
    metric: 'leads' | 'revenue' | 'bookings',
    period: 'daily' | 'weekly' | 'monthly' = 'daily',
    days: number = 30
  ) {
    const cacheKey = getCacheKey(
      orgId, 
      CACHE_PREFIXES.ANALYTICS, 
      'trends',
      `${metric}-${period}-${days}`
    );
    
    return getOrSet(
      cacheKey,
      async () => {
        const analytics = await analyticsService.getLeadAnalytics(orgId, days);
        if (!analytics) return [];

        // Return timeline data (could be enhanced with actual trend calculation)
        return analytics.timeline.map(item => ({
          ...item,
          metric,
          period
        }));
      },
      this.HISTORICAL_TTL
    );
  }

  /**
   * Get organization comparison metrics
   */
  async getOrgComparison(orgId: string, compareToIndustry: boolean = false) {
    const cacheKey = getCacheKey(
      orgId, 
      CACHE_PREFIXES.ANALYTICS, 
      'comparison',
      compareToIndustry ? 'industry' : 'self'
    );
    
    return getOrSet(
      cacheKey,
      async () => {
        const currentMetrics = await this.getDashboardMetrics(orgId);
        if (!currentMetrics) return null;

        // Industry benchmarks (would come from aggregated data)
        const industryBenchmarks = {
          conversionRate: 15, // 15% industry average
          responseTime: 2, // 2 hours average response
          customerSatisfaction: 85, // 85% average
          retentionRate: 75 // 75% average
        };

        return {
          current: {
            conversionRate: currentMetrics.leads.conversionRate,
            totalLeads: currentMetrics.leads.total,
            revenue: currentMetrics.revenue.mtd,
          },
          benchmark: compareToIndustry ? industryBenchmarks : null,
          comparison: compareToIndustry ? {
            conversionRate: currentMetrics.leads.conversionRate - industryBenchmarks.conversionRate,
          } : null
        };
      },
      this.HISTORICAL_TTL
    );
  }

  /**
   * Multi-metric dashboard data (optimized with parallel caching)
   */
  async getFullDashboard(orgId: string) {
    const [
      metrics,
      leadAnalytics,
      revenueAnalytics,
      funnel,
      topSources
    ] = await Promise.all([
      this.getDashboardMetrics(orgId),
      this.getLeadAnalytics(orgId, 30),
      this.getRevenueAnalytics(orgId, 30),
      this.getConversionFunnel(orgId),
      this.getTopSources(orgId, 5)
    ]);

    return {
      metrics,
      leadAnalytics,
      revenueAnalytics,
      funnel,
      topSources,
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * Refresh daily metrics and invalidate caches
   */
  async refreshDailyMetrics(orgId: string, date: Date = new Date()): Promise<void> {
    // Call the original service method
    await analyticsService.refreshDailyMetrics(orgId, date);
    
    // Invalidate all analytics caches for this org
    await this.invalidateAnalyticsCaches(orgId);
    
    logger.info(`Refreshed daily metrics and invalidated caches for org ${orgId}`);
  }

  /**
   * Clear analytics cache for organization
   */
  async clearCache(orgId: string): Promise<void> {
    await this.invalidateAnalyticsCaches(orgId);
    logger.info(`Cleared analytics cache for org ${orgId}`);
  }

  /**
   * Warm analytics caches for better initial load performance
   */
  async warmAnalyticsCaches(orgId: string): Promise<void> {
    logger.info(`Warming analytics caches for org ${orgId}`);
    
    const warmTasks = [
      {
        key: getCacheKey(orgId, CACHE_PREFIXES.DASHBOARD, 'metrics'),
        fetchFunction: () => analyticsService.getDashboardMetrics(orgId),
        ttl: this.DASHBOARD_TTL
      },
      {
        key: getCacheKey(orgId, CACHE_PREFIXES.ANALYTICS, 'leads', '30'),
        fetchFunction: () => analyticsService.getLeadAnalytics(orgId, 30),
        ttl: this.ANALYTICS_TTL
      },
      {
        key: getCacheKey(orgId, CACHE_PREFIXES.ANALYTICS, 'revenue', '30'),
        fetchFunction: () => analyticsService.getRevenueAnalytics(orgId, 30),
        ttl: this.ANALYTICS_TTL
      },
      {
        key: getCacheKey(orgId, CACHE_PREFIXES.ANALYTICS, 'funnel', 'month'),
        fetchFunction: () => this.getConversionFunnel(orgId, 'month'),
        ttl: this.ANALYTICS_TTL
      }
    ];

    await cacheService.warmCache(warmTasks);
    logger.info(`Analytics cache warming completed for org ${orgId}`);
  }

  /**
   * Get cache performance metrics for analytics
   */
  async getAnalyticsCachePerformance() {
    const health = await cacheService.getCacheHealth();
    
    // Filter stats for analytics-related prefixes
    const analyticsStats = Object.entries(health.stats)
      .filter(([prefix]) => [
        CACHE_PREFIXES.DASHBOARD,
        CACHE_PREFIXES.ANALYTICS,
        CACHE_PREFIXES.CAMPAIGN
      ].includes(prefix as any))
      .reduce((acc, [prefix, stats]) => {
        acc[prefix] = stats;
        return acc;
      }, {} as Record<string, any>);

    return {
      ...health,
      analyticsStats,
      recommendations: this.generateCacheRecommendations(analyticsStats)
    };
  }

  /**
   * Generate cache optimization recommendations
   */
  private generateCacheRecommendations(stats: Record<string, any>): string[] {
    const recommendations: string[] = [];
    
    Object.entries(stats).forEach(([prefix, stat]) => {
      if (stat.hitRatio < 0.5) {
        recommendations.push(`${prefix} cache hit ratio is low (${(stat.hitRatio * 100).toFixed(1)}%) - consider increasing TTL`);
      }
      
      if (stat.errors > stat.hits * 0.1) {
        recommendations.push(`${prefix} has high error rate - check Redis connection`);
      }
    });
    
    if (recommendations.length === 0) {
      recommendations.push('Cache performance is optimal');
    }
    
    return recommendations;
  }

  /**
   * Invalidate all analytics-related caches for an organization
   */
  private async invalidateAnalyticsCaches(orgId: string): Promise<void> {
    const patterns = [
      `${CACHE_PREFIXES.ORG}:${orgId}:${CACHE_PREFIXES.DASHBOARD}:*`,
      `${CACHE_PREFIXES.ORG}:${orgId}:${CACHE_PREFIXES.ANALYTICS}:*`,
      `${CACHE_PREFIXES.ORG}:${orgId}:${CACHE_PREFIXES.CAMPAIGN}:*`,
      `${CACHE_PREFIXES.ORG}:${orgId}:${CACHE_PREFIXES.METRICS}:*`,
    ];

    for (const pattern of patterns) {
      await cacheService.invalidateCache(pattern);
    }
  }

  /**
   * Schedule cache refresh for analytics data
   */
  async scheduleAnalyticsRefresh(orgId: string, intervalMinutes: number = 60): Promise<void> {
    // This would integrate with a job scheduler
    logger.info(`Scheduled analytics refresh for org ${orgId} every ${intervalMinutes} minutes`);
    
    // For now, just warm the cache immediately
    await this.warmAnalyticsCaches(orgId);
  }
}

export const cachedAnalyticsService = new CachedAnalyticsService();

// Export types for consistency
export type { DashboardMetrics, LeadAnalytics, RevenueAnalytics } from '@/src/services/analytics.service';
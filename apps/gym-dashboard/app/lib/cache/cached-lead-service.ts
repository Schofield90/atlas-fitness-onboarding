import { leadService, type LeadFilter, type Lead } from '@/src/services/lead.service';
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
 * Cached Lead Service - Wraps the existing lead service with comprehensive caching
 * 
 * Cache Strategy:
 * - Lead lists: 5 minute TTL with search result caching
 * - Individual leads: 5 minute TTL with stale-while-revalidate
 * - Lead counts/stats: 2 minute TTL
 * - Search results: 5 minute TTL based on query hash
 */
class CachedLeadService {
  private readonly LEAD_LIST_TTL = CACHE_TTL.LEAD_LISTS;
  private readonly LEAD_DETAIL_TTL = CACHE_TTL.MEDIUM_TERM;
  private readonly SEARCH_TTL = CACHE_TTL.SEARCH_RESULTS;
  private readonly STATS_TTL = CACHE_TTL.CAMPAIGN_PERFORMANCE;

  /**
   * Get leads with caching support
   */
  async getLeads(
    orgId: string, 
    filter: LeadFilter = {}, 
    page = 1, 
    limit = 50
  ) {
    // Create cache key based on filter parameters
    const filterHash = this.createFilterHash(filter, page, limit);
    const cacheKey = getCacheKey(
      orgId, 
      CACHE_PREFIXES.LEAD, 
      'list', 
      filterHash
    );

    return getOrSet(
      cacheKey,
      () => leadService.getLeads(orgId, filter, page, limit),
      this.LEAD_LIST_TTL
    );
  }

  /**
   * Get single lead with caching (stale-while-revalidate for better UX)
   */
  async getLead(leadId: string) {
    const cacheKey = getCacheKey('', CACHE_PREFIXES.LEAD, leadId);
    
    return cacheService.getStaleWhileRevalidate(
      cacheKey,
      () => leadService.getLead(leadId),
      this.LEAD_DETAIL_TTL,
      this.LEAD_DETAIL_TTL * 2 // Stale TTL
    );
  }

  /**
   * Create lead with cache invalidation
   */
  async createLead(orgId: string, data: Lead): Promise<string> {
    const leadId = await leadService.createLead(orgId, data);
    
    // Invalidate relevant caches
    await this.invalidateLeadCaches(orgId);
    
    logger.info(`Created lead ${leadId}, invalidated caches for org ${orgId}`);
    return leadId;
  }

  /**
   * Update lead with selective cache invalidation
   */
  async updateLead(leadId: string, updates: Partial<Lead>): Promise<void> {
    await leadService.updateLead(leadId, updates);
    
    // Get lead org_id for cache invalidation
    const lead = await leadService.getLead(leadId);
    if (lead?.org_id) {
      // Invalidate specific lead cache
      const leadCacheKey = getCacheKey('', CACHE_PREFIXES.LEAD, leadId);
      await cacheService.invalidateCache(leadCacheKey);
      
      // Invalidate list caches for this org
      await invalidateOrgCache(lead.org_id, CACHE_PREFIXES.LEAD);
      
      logger.info(`Updated lead ${leadId}, invalidated relevant caches`);
    }
  }

  /**
   * Bulk update leads with cache invalidation
   */
  async bulkUpdateLeads(
    leadIds: string[],
    updates: {
      status?: string;
      tags?: { add?: string[]; remove?: string[] };
      assignedTo?: string;
    }
  ): Promise<void> {
    await leadService.bulkUpdateLeads(leadIds, updates);
    
    // Get unique org IDs from leads to invalidate caches
    const orgIds = await this.getOrgIdsFromLeads(leadIds);
    
    // Invalidate caches for each org
    for (const orgId of orgIds) {
      await this.invalidateLeadCaches(orgId);
    }
    
    // Invalidate individual lead caches
    for (const leadId of leadIds) {
      const leadCacheKey = getCacheKey('', CACHE_PREFIXES.LEAD, leadId);
      await cacheService.invalidateCache(leadCacheKey);
    }
    
    logger.info(`Bulk updated ${leadIds.length} leads, invalidated caches`);
  }

  /**
   * Convert lead with cache invalidation
   */
  async convertLead(leadId: string): Promise<string> {
    const clientId = await leadService.convertLead(leadId);
    
    // Get lead org_id for cache invalidation
    const lead = await leadService.getLead(leadId);
    if (lead?.org_id) {
      await this.invalidateLeadCaches(lead.org_id);
      
      // Also invalidate client caches
      await invalidateOrgCache(lead.org_id, 'client');
    }
    
    logger.info(`Converted lead ${leadId} to client ${clientId}`);
    return clientId;
  }

  /**
   * Get lead statistics with caching
   */
  async getLeadStats(orgId: string) {
    const cacheKey = getCacheKey(orgId, CACHE_PREFIXES.LEAD, 'stats');
    
    return getOrSet(
      cacheKey,
      async () => {
        // Get basic lead counts
        const [
          totalLeads,
          newLeads,
          qualifiedLeads,
          convertedLeads
        ] = await Promise.all([
          this.getLeadCount(orgId),
          this.getLeadCount(orgId, { status: ['new'] }),
          this.getLeadCount(orgId, { status: ['qualified'] }),
          this.getLeadCount(orgId, { status: ['converted'] })
        ]);

        return {
          total: totalLeads,
          new: newLeads,
          qualified: qualifiedLeads,
          converted: convertedLeads,
          conversionRate: totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0
        };
      },
      this.STATS_TTL
    );
  }

  /**
   * Get lead count with specific filters
   */
  private async getLeadCount(orgId: string, filter: LeadFilter = {}): Promise<number> {
    const result = await leadService.getLeads(orgId, filter, 1, 1);
    return result.total;
  }

  /**
   * Search leads with result caching
   */
  async searchLeads(
    orgId: string, 
    query: string, 
    filters: LeadFilter = {},
    page = 1,
    limit = 20
  ) {
    const searchHash = this.createSearchHash(query, filters, page, limit);
    const cacheKey = getCacheKey(
      orgId, 
      CACHE_PREFIXES.SEARCH, 
      'leads', 
      searchHash
    );

    return getOrSet(
      cacheKey,
      () => leadService.getLeads(orgId, { ...filters, search: query }, page, limit),
      this.SEARCH_TTL
    );
  }

  /**
   * Get leads by source with caching
   */
  async getLeadsBySource(orgId: string) {
    const cacheKey = getCacheKey(orgId, CACHE_PREFIXES.LEAD, 'by-source');
    
    return getOrSet(
      cacheKey,
      async () => {
        const leads = await leadService.getLeads(orgId, {}, 1, 1000);
        const bySource: Record<string, number> = {};
        
        leads.data?.forEach(lead => {
          const source = lead.source || 'Direct';
          bySource[source] = (bySource[source] || 0) + 1;
        });
        
        return bySource;
      },
      this.STATS_TTL
    );
  }

  /**
   * Get leads by status with caching
   */
  async getLeadsByStatus(orgId: string) {
    const cacheKey = getCacheKey(orgId, CACHE_PREFIXES.LEAD, 'by-status');
    
    return getOrSet(
      cacheKey,
      async () => {
        const leads = await leadService.getLeads(orgId, {}, 1, 1000);
        const byStatus: Record<string, number> = {};
        
        leads.data?.forEach(lead => {
          byStatus[lead.status] = (byStatus[lead.status] || 0) + 1;
        });
        
        return byStatus;
      },
      this.STATS_TTL
    );
  }

  /**
   * Warm lead caches for an organization (for better initial performance)
   */
  async warmLeadCaches(orgId: string): Promise<void> {
    logger.info(`Warming lead caches for org ${orgId}`);
    
    const warmTasks = [
      {
        key: getCacheKey(orgId, CACHE_PREFIXES.LEAD, 'list', 'default'),
        fetchFunction: () => leadService.getLeads(orgId),
        ttl: this.LEAD_LIST_TTL
      },
      {
        key: getCacheKey(orgId, CACHE_PREFIXES.LEAD, 'stats'),
        fetchFunction: () => this.getLeadStats(orgId),
        ttl: this.STATS_TTL
      },
      {
        key: getCacheKey(orgId, CACHE_PREFIXES.LEAD, 'by-source'),
        fetchFunction: () => this.getLeadsBySource(orgId),
        ttl: this.STATS_TTL
      },
      {
        key: getCacheKey(orgId, CACHE_PREFIXES.LEAD, 'by-status'),
        fetchFunction: () => this.getLeadsByStatus(orgId),
        ttl: this.STATS_TTL
      }
    ];

    await cacheService.warmCache(warmTasks);
    logger.info(`Lead cache warming completed for org ${orgId}`);
  }

  /**
   * Invalidate all lead-related caches for an organization
   */
  private async invalidateLeadCaches(orgId: string): Promise<void> {
    const patterns = [
      `${CACHE_PREFIXES.ORG}:${orgId}:${CACHE_PREFIXES.LEAD}:*`,
      `${CACHE_PREFIXES.ORG}:${orgId}:${CACHE_PREFIXES.SEARCH}:leads:*`,
      `${CACHE_PREFIXES.ORG}:${orgId}:${CACHE_PREFIXES.DASHBOARD}:*`, // Dashboard shows lead stats
    ];

    for (const pattern of patterns) {
      await cacheService.invalidateCache(pattern);
    }
  }

  /**
   * Get organization IDs from lead IDs (for cache invalidation)
   */
  private async getOrgIdsFromLeads(leadIds: string[]): Promise<string[]> {
    const orgIds: Set<string> = new Set();
    
    // This could be optimized with a single query
    for (const leadId of leadIds) {
      try {
        const lead = await leadService.getLead(leadId);
        if (lead?.org_id) {
          orgIds.add(lead.org_id);
        }
      } catch (error) {
        logger.error(`Failed to get org_id for lead ${leadId}:`, error);
      }
    }
    
    return Array.from(orgIds);
  }

  /**
   * Create hash for filter parameters to use as cache key
   */
  private createFilterHash(filter: LeadFilter, page: number, limit: number): string {
    const hashObject = {
      ...filter,
      page,
      limit,
      // Convert dates to ISO strings for consistent hashing
      dateFrom: filter.dateFrom?.toISOString(),
      dateTo: filter.dateTo?.toISOString(),
    };
    
    // Create a simple hash from the stringified object
    const str = JSON.stringify(hashObject);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * Create hash for search parameters
   */
  private createSearchHash(
    query: string, 
    filters: LeadFilter, 
    page: number, 
    limit: number
  ): string {
    return this.createFilterHash({ ...filters, search: query }, page, limit);
  }

  // Delegate non-cached methods to original service
  async importLeads(orgId: string, file: File, mapping: Record<string, string>) {
    const result = await leadService.importLeads(orgId, file, mapping);
    
    // Invalidate caches after import
    await this.invalidateLeadCaches(orgId);
    
    logger.info(`Imported ${result.success} leads for org ${orgId}`);
    return result;
  }

  async scoreLead(leadId: string): Promise<number> {
    const score = await leadService.scoreLead(leadId);
    
    // Invalidate the specific lead cache
    const leadCacheKey = getCacheKey('', CACHE_PREFIXES.LEAD, leadId);
    await cacheService.invalidateCache(leadCacheKey);
    
    return score;
  }
}

export const cachedLeadService = new CachedLeadService();

// Export types for consistency
export type { Lead, LeadFilter } from '@/src/services/lead.service';
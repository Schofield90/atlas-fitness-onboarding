import { redisClient, checkRedisHealth } from './redis-client';
import { cacheMonitor } from './cache-monitor';
import { logger } from '@/app/lib/logger/logger';

/**
 * Cache Initialization and Bootstrap
 * 
 * Handles cache system startup, health checks, and initial configuration
 */
export class CacheInitializer {
  private static initialized = false;
  private static initializationPromise: Promise<boolean> | null = null;

  /**
   * Initialize the cache system
   */
  static async initialize(): Promise<boolean> {
    // Prevent multiple initializations
    if (this.initialized) return true;
    
    // Return existing initialization promise if in progress
    if (this.initializationPromise) return this.initializationPromise;
    
    this.initializationPromise = this.performInitialization();
    return this.initializationPromise;
  }

  private static async performInitialization(): Promise<boolean> {
    try {
      logger.info('Initializing Redis cache system...');
      
      // Step 1: Check Redis connection
      const isHealthy = await this.checkCacheHealth();
      if (!isHealthy) {
        logger.warn('Redis cache not available - running without cache');
        this.initialized = true; // Mark as initialized even without Redis
        return false;
      }
      
      // Step 2: Validate cache configuration
      await this.validateCacheConfiguration();
      
      // Step 3: Start monitoring if enabled
      if (process.env.CACHE_MONITORING_ENABLED !== 'false') {
        this.startCacheMonitoring();
      }
      
      // Step 4: Warm critical caches if specified
      if (process.env.CACHE_WARM_ON_STARTUP === 'true') {
        await this.warmCriticalCaches();
      }
      
      this.initialized = true;
      logger.info('Redis cache system initialized successfully');
      return true;
      
    } catch (error) {
      logger.error('Failed to initialize cache system:', error);
      this.initialized = true; // Mark as initialized to prevent retries
      return false;
    }
  }

  /**
   * Check cache health and connectivity
   */
  private static async checkCacheHealth(): Promise<boolean> {
    try {
      const health = await checkRedisHealth();
      
      if (!health.connected) {
        logger.warn('Redis connection failed - cache will be disabled');
        return false;
      }
      
      if (health.latency && health.latency > 1000) {
        logger.warn(`Redis latency high: ${health.latency}ms`);
      }
      
      logger.info(`Redis connected successfully - latency: ${health.latency}ms`);
      return true;
      
    } catch (error) {
      logger.error('Redis health check failed:', error);
      return false;
    }
  }

  /**
   * Validate cache configuration settings
   */
  private static async validateCacheConfiguration(): Promise<void> {
    const redis = redisClient.getClient();
    if (!redis) return;
    
    try {
      // Test basic operations
      await redis.set('test:init', 'ok', 'EX', 10);
      const testValue = await redis.get('test:init');
      
      if (testValue !== 'ok') {
        throw new Error('Cache set/get test failed');
      }
      
      await redis.del('test:init');
      
      // Check memory configuration
      const info = await redis.info('memory');
      const memoryLines = info.split('\r\n');
      const maxMemory = memoryLines
        .find(line => line.startsWith('maxmemory:'))
        ?.split(':')[1];
      
      if (maxMemory && parseInt(maxMemory) > 0) {
        logger.info(`Redis max memory configured: ${parseInt(maxMemory) / 1024 / 1024}MB`);
      } else {
        logger.warn('Redis max memory not configured - consider setting maxmemory policy');
      }
      
    } catch (error) {
      logger.error('Cache configuration validation failed:', error);
      throw error;
    }
  }

  /**
   * Start cache monitoring
   */
  private static startCacheMonitoring(): void {
    try {
      const monitoringInterval = parseInt(
        process.env.CACHE_MONITORING_INTERVAL_MS || '60000'
      );
      
      cacheMonitor.startMonitoring(monitoringInterval);
      logger.info(`Cache monitoring started with ${monitoringInterval}ms interval`);
      
    } catch (error) {
      logger.error('Failed to start cache monitoring:', error);
    }
  }

  /**
   * Warm critical caches on startup
   */
  private static async warmCriticalCaches(): Promise<void> {
    try {
      logger.info('Warming critical caches on startup...');
      
      // This would typically warm caches for active organizations
      // For now, just log the intention
      const orgIds = await this.getActiveOrganizations();
      
      const warmingPromises = orgIds.map(async (orgId) => {
        try {
          // Warm high-priority caches only
          await this.warmOrganizationCaches(orgId, ['settings']);
        } catch (error) {
          logger.error(`Failed to warm cache for org ${orgId}:`, error);
        }
      });
      
      await Promise.allSettled(warmingPromises);
      logger.info(`Cache warming completed for ${orgIds.length} organizations`);
      
    } catch (error) {
      logger.error('Cache warming failed:', error);
    }
  }

  /**
   * Get list of active organizations for cache warming
   */
  private static async getActiveOrganizations(): Promise<string[]> {
    try {
      // This would typically query the database for active orgs
      // For demo purposes, return empty array
      // In real implementation, would use:
      // const { createClient } = await import('@/app/lib/supabase/server');
      // const supabase = await createClient();
      // ... query for active organizations
      
      return [];
      
    } catch (error) {
      logger.error('Failed to get active organizations:', error);
      return [];
    }
  }

  /**
   * Warm caches for specific organization
   */
  private static async warmOrganizationCaches(
    orgId: string, 
    services: string[] = ['settings', 'analytics']
  ): Promise<void> {
    try {
      for (const service of services) {
        switch (service) {
          case 'settings':
            // Would warm organization settings cache
            // const { cachedOrganizationService } = await import('./cached-organization-service');
            // await cachedOrganizationService.warmOrganizationCaches(userId, orgId);
            break;
            
          case 'analytics':
            const { cachedAnalyticsService } = await import('./cached-analytics-service');
            await cachedAnalyticsService.warmAnalyticsCaches(orgId);
            break;
            
          // Add other services as needed
        }
      }
      
    } catch (error) {
      logger.error(`Failed to warm caches for org ${orgId}:`, error);
    }
  }

  /**
   * Shutdown cache system gracefully
   */
  static async shutdown(): Promise<void> {
    try {
      logger.info('Shutting down cache system...');
      
      // Stop monitoring
      cacheMonitor.stopMonitoring();
      
      // Disconnect from Redis
      await redisClient.disconnect();
      
      this.initialized = false;
      this.initializationPromise = null;
      
      logger.info('Cache system shutdown complete');
      
    } catch (error) {
      logger.error('Error during cache system shutdown:', error);
    }
  }

  /**
   * Get initialization status
   */
  static isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Force re-initialization (useful for testing)
   */
  static async reinitialize(): Promise<boolean> {
    this.initialized = false;
    this.initializationPromise = null;
    return this.initialize();
  }
}

/**
 * Convenience function for initializing cache in Next.js
 */
export async function initializeCache(): Promise<boolean> {
  return CacheInitializer.initialize();
}

/**
 * Environment-based cache configuration
 */
export interface CacheConfig {
  enabled: boolean;
  monitoring: boolean;
  warmOnStartup: boolean;
  monitoringInterval: number;
  fallbackEnabled: boolean;
}

/**
 * Get cache configuration from environment
 */
export function getCacheConfig(): CacheConfig {
  return {
    enabled: process.env.CACHE_ENABLED !== 'false',
    monitoring: process.env.CACHE_MONITORING_ENABLED !== 'false',
    warmOnStartup: process.env.CACHE_WARM_ON_STARTUP === 'true',
    monitoringInterval: parseInt(process.env.CACHE_MONITORING_INTERVAL_MS || '60000'),
    fallbackEnabled: process.env.CACHE_FALLBACK_ENABLED !== 'false'
  };
}

/**
 * Express/Next.js middleware factory for cache initialization
 */
export function createCacheMiddleware() {
  return async (req: any, res: any, next: any) => {
    // Initialize cache if not already done
    if (!CacheInitializer.isInitialized()) {
      await CacheInitializer.initialize();
    }
    
    next();
  };
}

// Auto-initialize in development mode
if (process.env.NODE_ENV === 'development' && process.env.CACHE_AUTO_INIT === 'true') {
  CacheInitializer.initialize().catch(error => {
    logger.error('Auto cache initialization failed:', error);
  });
}
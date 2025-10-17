import { cacheService, getCacheHealth } from './cache-utils';
import { redisClient } from './redis-client';
import { logger } from '@/app/lib/logger/logger';

/**
 * Cache Monitoring Service
 * 
 * Provides comprehensive monitoring, alerting, and optimization
 * recommendations for the Redis caching layer
 */
class CacheMonitoringService {
  private monitoringInterval: NodeJS.Timeout | null = null;
  private alertThresholds = {
    hitRatioWarning: 0.5, // Warn if hit ratio < 50%
    hitRatioCritical: 0.3, // Critical if hit ratio < 30%
    errorRateWarning: 0.05, // Warn if error rate > 5%
    errorRateCritical: 0.1, // Critical if error rate > 10%
    latencyWarning: 100, // Warn if latency > 100ms
    latencyCritical: 500, // Critical if latency > 500ms
    memoryWarning: 0.8, // Warn if memory usage > 80%
    memoryCritical: 0.95, // Critical if memory usage > 95%
  };

  /**
   * Start cache monitoring with periodic health checks
   */
  startMonitoring(intervalMs: number = 60000): void { // Default: 1 minute
    if (this.monitoringInterval) {
      this.stopMonitoring();
    }

    logger.info(`Starting cache monitoring with ${intervalMs}ms interval`);
    
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.performHealthCheck();
      } catch (error) {
        logger.error('Cache monitoring health check failed:', error);
      }
    }, intervalMs);

    // Initial health check
    this.performHealthCheck();
  }

  /**
   * Stop cache monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      logger.info('Cache monitoring stopped');
    }
  }

  /**
   * Perform comprehensive health check
   */
  async performHealthCheck(): Promise<CacheHealthReport> {
    const health = await getCacheHealth();
    const redis = redisClient.getClient();
    
    let memoryInfo = null;
    let keyCount = 0;
    let connectionInfo = null;

    if (redis && health.connected) {
      try {
        // Get memory information
        const memoryInfoRaw = await redis.info('memory');
        memoryInfo = this.parseMemoryInfo(memoryInfoRaw);
        
        // Get key count
        keyCount = await redis.dbsize();
        
        // Get connection info
        const clientsInfo = await redis.info('clients');
        connectionInfo = this.parseConnectionInfo(clientsInfo);
        
      } catch (error) {
        logger.error('Error gathering Redis info:', error);
      }
    }

    const report: CacheHealthReport = {
      timestamp: new Date().toISOString(),
      status: this.calculateOverallStatus(health, memoryInfo),
      connection: {
        connected: health.connected,
        latency: health.latency,
      },
      memory: memoryInfo,
      performance: {
        keyCount,
        stats: health.stats,
        overallHitRatio: this.calculateOverallHitRatio(health.stats),
        overallErrorRate: this.calculateOverallErrorRate(health.stats),
      },
      connections: connectionInfo,
      alerts: this.generateAlerts(health, memoryInfo),
      recommendations: this.generateRecommendations(health, memoryInfo, keyCount),
    };

    // Log alerts if any
    if (report.alerts.length > 0) {
      report.alerts.forEach(alert => {
        if (alert.severity === 'critical') {
          logger.error(`Cache Alert [${alert.severity.toUpperCase()}]: ${alert.message}`);
        } else {
          logger.warn(`Cache Alert [${alert.severity.toUpperCase()}]: ${alert.message}`);
        }
      });
    }

    return report;
  }

  /**
   * Get cache performance metrics for specific organization
   */
  async getOrganizationMetrics(orgId: string): Promise<OrganizationCacheMetrics> {
    const redis = redisClient.getClient();
    if (!redis) {
      throw new Error('Redis not connected');
    }

    try {
      // Get organization-specific keys
      const orgKeys = await redis.keys(`org:${orgId}:*`);
      
      // Calculate memory usage for organization keys
      let totalMemory = 0;
      const keyDetails: Array<{
        key: string;
        type: string;
        ttl: number;
        memory: number;
      }> = [];

      for (const key of orgKeys.slice(0, 100)) { // Limit to 100 keys to avoid performance issues
        const [type, ttl, memoryUsage] = await Promise.all([
          redis.type(key),
          redis.ttl(key),
          redis.memory('usage', key).catch(() => 0) // Memory usage might not be available
        ]);

        const keyMemory = typeof memoryUsage === 'number' ? memoryUsage : 0;
        totalMemory += keyMemory;
        
        keyDetails.push({
          key,
          type,
          ttl,
          memory: keyMemory
        });
      }

      // Get stats for organization-related prefixes
      const globalStats = cacheService.getCacheStats();
      const orgStats = Object.entries(globalStats)
        .filter(([prefix]) => ['org', 'lead', 'booking', 'class', 'dashboard'].includes(prefix))
        .reduce((acc, [prefix, stats]) => {
          acc[prefix] = stats;
          return acc;
        }, {} as Record<string, any>);

      return {
        organizationId: orgId,
        totalKeys: orgKeys.length,
        totalMemoryBytes: totalMemory,
        keyDetails: keyDetails.slice(0, 20), // Return top 20 keys
        stats: orgStats,
        lastUpdated: new Date().toISOString(),
        recommendations: this.generateOrgRecommendations(orgKeys.length, totalMemory, orgStats)
      };
      
    } catch (error) {
      logger.error(`Error getting organization metrics for ${orgId}:`, error);
      throw error;
    }
  }

  /**
   * Clear expired keys and optimize cache
   */
  async optimizeCache(): Promise<CacheOptimizationResult> {
    const redis = redisClient.getClient();
    if (!redis) {
      throw new Error('Redis not connected');
    }

    const startTime = Date.now();
    let keysScanned = 0;
    let keysDeleted = 0;
    let memoryFreed = 0;

    try {
      // Scan for expired or problematic keys
      const stream = redis.scanStream({
        match: '*',
        count: 100
      });

      stream.on('data', async (keys: string[]) => {
        keysScanned += keys.length;
        
        for (const key of keys) {
          try {
            const ttl = await redis.ttl(key);
            
            // Delete keys that are expired or have no TTL when they should
            if (ttl === -1 && !key.includes(':permanent')) {
              const memoryUsage = await redis.memory('usage', key).catch(() => 0);
              await redis.del(key);
              keysDeleted++;
              memoryFreed += typeof memoryUsage === 'number' ? memoryUsage : 0;
            }
          } catch (error) {
            logger.error(`Error processing key ${key} during optimization:`, error);
          }
        }
      });

      return new Promise((resolve) => {
        stream.on('end', () => {
          const duration = Date.now() - startTime;
          const result: CacheOptimizationResult = {
            keysScanned,
            keysDeleted,
            memoryFreedBytes: memoryFreed,
            durationMs: duration,
            timestamp: new Date().toISOString()
          };

          logger.info(`Cache optimization completed: ${keysDeleted} keys deleted, ${memoryFreed} bytes freed in ${duration}ms`);
          resolve(result);
        });

        stream.on('error', (error) => {
          logger.error('Cache optimization failed:', error);
          resolve({
            keysScanned,
            keysDeleted,
            memoryFreedBytes: memoryFreed,
            durationMs: Date.now() - startTime,
            timestamp: new Date().toISOString(),
            error: error.message
          });
        });
      });

    } catch (error) {
      logger.error('Cache optimization error:', error);
      throw error;
    }
  }

  /**
   * Generate cache warming plan for organization
   */
  generateWarmingPlan(orgId: string): CacheWarmingPlan {
    return {
      organizationId: orgId,
      priorityOrder: [
        {
          service: 'organization-settings',
          keys: [`org:${orgId}:settings:*`],
          estimatedTime: 500,
          priority: 1
        },
        {
          service: 'dashboard-metrics',
          keys: [`org:${orgId}:dashboard:*`],
          estimatedTime: 1000,
          priority: 2
        },
        {
          service: 'class-schedules',
          keys: [`org:${orgId}:class:schedule:*`],
          estimatedTime: 1500,
          priority: 3
        },
        {
          service: 'lead-lists',
          keys: [`org:${orgId}:lead:list:*`],
          estimatedTime: 2000,
          priority: 4
        },
        {
          service: 'analytics',
          keys: [`org:${orgId}:analytics:*`],
          estimatedTime: 3000,
          priority: 5
        }
      ],
      totalEstimatedTime: 8000, // 8 seconds
      createdAt: new Date().toISOString()
    };
  }

  private parseMemoryInfo(info: string): MemoryInfo {
    const lines = info.split('\r\n');
    const memory: any = {};
    
    lines.forEach(line => {
      if (line.includes(':')) {
        const [key, value] = line.split(':');
        if (key.startsWith('used_memory')) {
          memory[key] = parseInt(value) || 0;
        }
      }
    });
    
    return {
      used: memory.used_memory || 0,
      peak: memory.used_memory_peak || 0,
      rss: memory.used_memory_rss || 0,
      overhead: memory.used_memory_overhead || 0,
      usageRatio: memory.used_memory / (memory.used_memory_peak || 1)
    };
  }

  private parseConnectionInfo(info: string): ConnectionInfo {
    const lines = info.split('\r\n');
    let connectedClients = 0;
    let maxClients = 0;
    
    lines.forEach(line => {
      if (line.startsWith('connected_clients:')) {
        connectedClients = parseInt(line.split(':')[1]) || 0;
      } else if (line.startsWith('maxclients:')) {
        maxClients = parseInt(line.split(':')[1]) || 0;
      }
    });
    
    return {
      connected: connectedClients,
      max: maxClients,
      utilization: maxClients > 0 ? connectedClients / maxClients : 0
    };
  }

  private calculateOverallStatus(health: any, memoryInfo: MemoryInfo | null): 'healthy' | 'warning' | 'critical' {
    if (!health.connected) return 'critical';
    
    const overallHitRatio = this.calculateOverallHitRatio(health.stats);
    const overallErrorRate = this.calculateOverallErrorRate(health.stats);
    
    if (overallHitRatio < this.alertThresholds.hitRatioCritical ||
        overallErrorRate > this.alertThresholds.errorRateCritical ||
        (health.latency && health.latency > this.alertThresholds.latencyCritical) ||
        (memoryInfo && memoryInfo.usageRatio > this.alertThresholds.memoryCritical)) {
      return 'critical';
    }
    
    if (overallHitRatio < this.alertThresholds.hitRatioWarning ||
        overallErrorRate > this.alertThresholds.errorRateWarning ||
        (health.latency && health.latency > this.alertThresholds.latencyWarning) ||
        (memoryInfo && memoryInfo.usageRatio > this.alertThresholds.memoryWarning)) {
      return 'warning';
    }
    
    return 'healthy';
  }

  private calculateOverallHitRatio(stats: Record<string, any>): number {
    let totalHits = 0;
    let totalRequests = 0;
    
    Object.values(stats).forEach(stat => {
      totalHits += stat.hits || 0;
      totalRequests += (stat.hits || 0) + (stat.misses || 0);
    });
    
    return totalRequests > 0 ? totalHits / totalRequests : 0;
  }

  private calculateOverallErrorRate(stats: Record<string, any>): number {
    let totalErrors = 0;
    let totalOperations = 0;
    
    Object.values(stats).forEach(stat => {
      totalErrors += stat.errors || 0;
      totalOperations += (stat.hits || 0) + (stat.misses || 0) + (stat.sets || 0) + (stat.errors || 0);
    });
    
    return totalOperations > 0 ? totalErrors / totalOperations : 0;
  }

  private generateAlerts(health: any, memoryInfo: MemoryInfo | null): CacheAlert[] {
    const alerts: CacheAlert[] = [];
    
    if (!health.connected) {
      alerts.push({
        type: 'connection',
        severity: 'critical',
        message: 'Redis connection is down',
        timestamp: new Date().toISOString()
      });
      return alerts;
    }
    
    const overallHitRatio = this.calculateOverallHitRatio(health.stats);
    const overallErrorRate = this.calculateOverallErrorRate(health.stats);
    
    if (overallHitRatio < this.alertThresholds.hitRatioCritical) {
      alerts.push({
        type: 'performance',
        severity: 'critical',
        message: `Cache hit ratio critically low: ${(overallHitRatio * 100).toFixed(1)}%`,
        timestamp: new Date().toISOString()
      });
    } else if (overallHitRatio < this.alertThresholds.hitRatioWarning) {
      alerts.push({
        type: 'performance',
        severity: 'warning',
        message: `Cache hit ratio low: ${(overallHitRatio * 100).toFixed(1)}%`,
        timestamp: new Date().toISOString()
      });
    }
    
    if (health.latency && health.latency > this.alertThresholds.latencyCritical) {
      alerts.push({
        type: 'performance',
        severity: 'critical',
        message: `Redis latency critically high: ${health.latency}ms`,
        timestamp: new Date().toISOString()
      });
    } else if (health.latency && health.latency > this.alertThresholds.latencyWarning) {
      alerts.push({
        type: 'performance',
        severity: 'warning',
        message: `Redis latency high: ${health.latency}ms`,
        timestamp: new Date().toISOString()
      });
    }
    
    if (memoryInfo && memoryInfo.usageRatio > this.alertThresholds.memoryCritical) {
      alerts.push({
        type: 'memory',
        severity: 'critical',
        message: `Redis memory usage critically high: ${(memoryInfo.usageRatio * 100).toFixed(1)}%`,
        timestamp: new Date().toISOString()
      });
    } else if (memoryInfo && memoryInfo.usageRatio > this.alertThresholds.memoryWarning) {
      alerts.push({
        type: 'memory',
        severity: 'warning',
        message: `Redis memory usage high: ${(memoryInfo.usageRatio * 100).toFixed(1)}%`,
        timestamp: new Date().toISOString()
      });
    }
    
    return alerts;
  }

  private generateRecommendations(
    health: any, 
    memoryInfo: MemoryInfo | null, 
    keyCount: number
  ): string[] {
    const recommendations: string[] = [];
    
    const overallHitRatio = this.calculateOverallHitRatio(health.stats);
    
    if (overallHitRatio < 0.6) {
      recommendations.push('Consider increasing cache TTL for frequently accessed data');
      recommendations.push('Implement cache warming for critical data');
    }
    
    if (health.latency && health.latency > 50) {
      recommendations.push('Consider optimizing Redis configuration or upgrading infrastructure');
    }
    
    if (memoryInfo && memoryInfo.usageRatio > 0.7) {
      recommendations.push('Consider implementing cache eviction policies');
      recommendations.push('Review and optimize large cached objects');
    }
    
    if (keyCount > 100000) {
      recommendations.push('High key count detected - consider key expiration optimization');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('Cache performance is optimal');
    }
    
    return recommendations;
  }

  private generateOrgRecommendations(
    keyCount: number, 
    memoryUsage: number, 
    stats: Record<string, any>
  ): string[] {
    const recommendations: string[] = [];
    
    if (keyCount > 1000) {
      recommendations.push('High number of cached keys for this organization');
    }
    
    if (memoryUsage > 10 * 1024 * 1024) { // 10MB
      recommendations.push('High memory usage for this organization');
    }
    
    Object.entries(stats).forEach(([prefix, stat]) => {
      if (stat.hitRatio < 0.5) {
        recommendations.push(`${prefix} cache has low hit ratio - consider adjusting caching strategy`);
      }
    });
    
    return recommendations.length > 0 ? recommendations : ['Organization cache usage is optimal'];
  }
}

// Types
export interface CacheHealthReport {
  timestamp: string;
  status: 'healthy' | 'warning' | 'critical';
  connection: {
    connected: boolean;
    latency: number | null;
  };
  memory: MemoryInfo | null;
  performance: {
    keyCount: number;
    stats: Record<string, any>;
    overallHitRatio: number;
    overallErrorRate: number;
  };
  connections: ConnectionInfo | null;
  alerts: CacheAlert[];
  recommendations: string[];
}

export interface MemoryInfo {
  used: number;
  peak: number;
  rss: number;
  overhead: number;
  usageRatio: number;
}

export interface ConnectionInfo {
  connected: number;
  max: number;
  utilization: number;
}

export interface CacheAlert {
  type: 'connection' | 'performance' | 'memory' | 'error';
  severity: 'warning' | 'critical';
  message: string;
  timestamp: string;
}

export interface OrganizationCacheMetrics {
  organizationId: string;
  totalKeys: number;
  totalMemoryBytes: number;
  keyDetails: Array<{
    key: string;
    type: string;
    ttl: number;
    memory: number;
  }>;
  stats: Record<string, any>;
  lastUpdated: string;
  recommendations: string[];
}

export interface CacheOptimizationResult {
  keysScanned: number;
  keysDeleted: number;
  memoryFreedBytes: number;
  durationMs: number;
  timestamp: string;
  error?: string;
}

export interface CacheWarmingPlan {
  organizationId: string;
  priorityOrder: Array<{
    service: string;
    keys: string[];
    estimatedTime: number;
    priority: number;
  }>;
  totalEstimatedTime: number;
  createdAt: string;
}

export const cacheMonitor = new CacheMonitoringService();
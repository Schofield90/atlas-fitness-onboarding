import { createAdminClient } from '@/app/lib/supabase/admin';
import { enhancedQueueManager } from '../enhanced-queue-manager';
import { QUEUE_NAMES, JOB_TYPES, JOB_PRIORITIES, HEALTH_THRESHOLDS } from '../enhanced-config';
import * as os from 'os';

interface HealthCheckResult {
  status: 'healthy' | 'warning' | 'critical';
  checks: {
    redis: ComponentHealth;
    database: ComponentHealth;
    queues: ComponentHealth;
    workers: ComponentHealth;
    system: ComponentHealth;
  };
  timestamp: Date;
  issues: string[];
  recommendations: string[];
}

interface ComponentHealth {
  status: 'healthy' | 'warning' | 'critical';
  details: Record<string, any>;
  issues: string[];
}

export class HealthMonitor {
  private supabase = createAdminClient();
  private isMonitoring: boolean = false;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private lastHealthCheck: HealthCheckResult | null = null;
  private alertCooldowns: Map<string, number> = new Map();
  
  // Thresholds
  private readonly ALERT_COOLDOWN_MS = 15 * 60 * 1000; // 15 minutes
  private readonly HEALTH_CHECK_INTERVAL = 30 * 1000; // 30 seconds
  
  constructor() {
    console.log('🏥 Health Monitor initialized');
  }
  
  // Start monitoring
  async startMonitoring(): Promise<void> {
    if (this.isMonitoring) {
      console.log('Health monitoring already active');
      return;
    }
    
    console.log('🏥 Starting health monitoring...');
    this.isMonitoring = true;
    
    // Run initial health check
    await this.performHealthCheck();
    
    // Schedule periodic health checks
    this.monitoringInterval = setInterval(async () => {
      await this.performHealthCheck();
    }, this.HEALTH_CHECK_INTERVAL);
  }
  
  // Stop monitoring
  stopMonitoring(): void {
    if (!this.isMonitoring) return;
    
    console.log('🛑 Stopping health monitoring...');
    this.isMonitoring = false;
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }
  
  // Perform comprehensive health check
  async performHealthCheck(): Promise<HealthCheckResult> {
    console.log('🏥 Performing health check...');
    
    const healthResult: HealthCheckResult = {
      status: 'healthy',
      checks: {
        redis: await this.checkRedisHealth(),
        database: await this.checkDatabaseHealth(),
        queues: await this.checkQueuesHealth(),
        workers: await this.checkWorkersHealth(),
        system: await this.checkSystemHealth(),
      },
      timestamp: new Date(),
      issues: [],
      recommendations: [],
    };
    
    // Aggregate issues and determine overall status
    const allIssues: string[] = [];
    let hasWarning = false;
    let hasCritical = false;
    
    for (const [component, health] of Object.entries(healthResult.checks)) {
      allIssues.push(...health.issues);
      
      if (health.status === 'critical') {
        hasCritical = true;
      } else if (health.status === 'warning') {
        hasWarning = true;
      }
    }
    
    healthResult.issues = allIssues;
    healthResult.status = hasCritical ? 'critical' : hasWarning ? 'warning' : 'healthy';
    
    // Generate recommendations
    healthResult.recommendations = this.generateRecommendations(healthResult);
    
    // Store health check result
    await this.storeHealthCheckResult(healthResult);
    
    // Handle alerts if needed
    if (healthResult.status !== 'healthy') {
      await this.handleHealthAlerts(healthResult);
    }
    
    this.lastHealthCheck = healthResult;
    
    console.log(`✅ Health check completed: ${healthResult.status}`);
    
    return healthResult;
  }
  
  // Check Redis health
  private async checkRedisHealth(): Promise<ComponentHealth> {
    const health: ComponentHealth = {
      status: 'healthy',
      details: {},
      issues: [],
    };
    
    try {
      const connectionHealth = enhancedQueueManager.getConnectionHealth();
      
      health.details = {
        connected: connectionHealth.redis,
        lastError: connectionHealth.lastError,
        lastConnected: connectionHealth.lastConnected,
        reconnectAttempts: connectionHealth.reconnectAttempts,
      };
      
      if (!connectionHealth.redis) {
        health.status = 'critical';
        health.issues.push('Redis connection lost');
      } else if (connectionHealth.reconnectAttempts > 0) {
        health.status = 'warning';
        health.issues.push(`Redis reconnected after ${connectionHealth.reconnectAttempts} attempts`);
      }
      
    } catch (error) {
      health.status = 'critical';
      health.issues.push(`Redis health check failed: ${error.message}`);
    }
    
    return health;
  }
  
  // Check database health
  private async checkDatabaseHealth(): Promise<ComponentHealth> {
    const health: ComponentHealth = {
      status: 'healthy',
      details: {},
      issues: [],
    };
    
    try {
      const startTime = Date.now();
      
      // Simple database query to check connectivity
      const { data, error } = await this.supabase
        .from('organizations')
        .select('count')
        .limit(1)
        .single();
      
      const queryTime = Date.now() - startTime;
      
      health.details = {
        connected: !error,
        queryTime,
        error: error?.message,
      };
      
      if (error) {
        health.status = 'critical';
        health.issues.push(`Database query failed: ${error.message}`);
      } else if (queryTime > 5000) {
        health.status = 'warning';
        health.issues.push(`Database query slow: ${queryTime}ms`);
      }
      
    } catch (error) {
      health.status = 'critical';
      health.issues.push(`Database health check failed: ${error.message}`);
    }
    
    return health;
  }
  
  // Check queues health
  private async checkQueuesHealth(): Promise<ComponentHealth> {
    const health: ComponentHealth = {
      status: 'healthy',
      details: {},
      issues: [],
    };
    
    try {
      const queueStats = await enhancedQueueManager.getAllQueueStats();
      
      let totalWaiting = 0;
      let totalActive = 0;
      let totalFailed = 0;
      let totalStalled = 0;
      
      for (const [queueName, stats] of Object.entries(queueStats)) {
        totalWaiting += stats.waiting;
        totalActive += stats.active;
        totalFailed += stats.failed;
        totalStalled += stats.stalled;
        
        // Check individual queue health
        if (stats.failed > HEALTH_THRESHOLDS.FAILED_JOBS_CRITICAL) {
          health.status = 'critical';
          health.issues.push(`Queue ${queueName} has ${stats.failed} failed jobs`);
        } else if (stats.failed > HEALTH_THRESHOLDS.FAILED_JOBS_WARNING) {
          if (health.status !== 'critical') health.status = 'warning';
          health.issues.push(`Queue ${queueName} has ${stats.failed} failed jobs`);
        }
        
        if (stats.stalled > HEALTH_THRESHOLDS.STALLED_JOBS_CRITICAL) {
          health.status = 'critical';
          health.issues.push(`Queue ${queueName} has ${stats.stalled} stalled jobs`);
        } else if (stats.stalled > HEALTH_THRESHOLDS.STALLED_JOBS_WARNING) {
          if (health.status !== 'critical') health.status = 'warning';
          health.issues.push(`Queue ${queueName} has ${stats.stalled} stalled jobs`);
        }
        
        const queueSize = stats.waiting + stats.active + stats.delayed;
        if (queueSize > HEALTH_THRESHOLDS.QUEUE_SIZE_CRITICAL) {
          health.status = 'critical';
          health.issues.push(`Queue ${queueName} size critical: ${queueSize} jobs`);
        } else if (queueSize > HEALTH_THRESHOLDS.QUEUE_SIZE_WARNING) {
          if (health.status !== 'critical') health.status = 'warning';
          health.issues.push(`Queue ${queueName} size warning: ${queueSize} jobs`);
        }
      }
      
      health.details = {
        queueCount: Object.keys(queueStats).length,
        totalWaiting,
        totalActive,
        totalFailed,
        totalStalled,
        queueStats,
      };
      
    } catch (error) {
      health.status = 'critical';
      health.issues.push(`Queue health check failed: ${error.message}`);
    }
    
    return health;
  }
  
  // Check workers health
  private async checkWorkersHealth(): Promise<ComponentHealth> {
    const health: ComponentHealth = {
      status: 'healthy',
      details: {},
      issues: [],
    };
    
    try {
      const metrics = enhancedQueueManager.getMetrics();
      
      health.details = {
        processedJobs: metrics.processedJobs,
        failedJobs: metrics.failedJobs,
        retriedJobs: metrics.retriedJobs,
        lastMetricsReset: metrics.lastMetricsReset,
      };
      
      // Calculate failure rate
      const totalJobs = metrics.processedJobs + metrics.failedJobs;
      const failureRate = totalJobs > 0 ? (metrics.failedJobs / totalJobs) * 100 : 0;
      
      health.details.failureRate = failureRate;
      
      if (failureRate > 20) {
        health.status = 'critical';
        health.issues.push(`High failure rate: ${failureRate.toFixed(2)}%`);
      } else if (failureRate > 10) {
        health.status = 'warning';
        health.issues.push(`Elevated failure rate: ${failureRate.toFixed(2)}%`);
      }
      
    } catch (error) {
      health.status = 'warning';
      health.issues.push(`Worker health check failed: ${error.message}`);
    }
    
    return health;
  }
  
  // Check system health
  private async checkSystemHealth(): Promise<ComponentHealth> {
    const health: ComponentHealth = {
      status: 'healthy',
      details: {},
      issues: [],
    };
    
    try {
      // Get system metrics
      const totalMemory = os.totalmem();
      const freeMemory = os.freemem();
      const usedMemory = totalMemory - freeMemory;
      const memoryUsagePercent = (usedMemory / totalMemory) * 100;
      
      const cpuUsage = os.loadavg()[0]; // 1-minute load average
      const cpuCount = os.cpus().length;
      const cpuUsagePercent = (cpuUsage / cpuCount) * 100;
      
      health.details = {
        memoryUsageMB: Math.round(usedMemory / 1024 / 1024),
        memoryUsagePercent: memoryUsagePercent.toFixed(2),
        cpuUsagePercent: cpuUsagePercent.toFixed(2),
        cpuLoadAverage: cpuUsage,
        cpuCount,
        platform: os.platform(),
        uptime: os.uptime(),
      };
      
      // Check memory usage
      if (memoryUsagePercent > 90) {
        health.status = 'critical';
        health.issues.push(`Critical memory usage: ${memoryUsagePercent.toFixed(2)}%`);
      } else if (memoryUsagePercent > 80) {
        health.status = 'warning';
        health.issues.push(`High memory usage: ${memoryUsagePercent.toFixed(2)}%`);
      }
      
      // Check CPU usage
      if (cpuUsagePercent > 90) {
        if (health.status !== 'critical') health.status = 'warning';
        health.issues.push(`High CPU usage: ${cpuUsagePercent.toFixed(2)}%`);
      }
      
    } catch (error) {
      health.status = 'warning';
      health.issues.push(`System health check failed: ${error.message}`);
    }
    
    return health;
  }
  
  // Generate recommendations based on health check results
  private generateRecommendations(healthResult: HealthCheckResult): string[] {
    const recommendations: string[] = [];
    
    // Redis recommendations
    if (healthResult.checks.redis.status !== 'healthy') {
      recommendations.push('Check Redis connection configuration and network connectivity');
      recommendations.push('Consider implementing Redis Sentinel or Cluster for high availability');
    }
    
    // Database recommendations
    if (healthResult.checks.database.status !== 'healthy') {
      recommendations.push('Check database connection pooling settings');
      recommendations.push('Consider database query optimization or scaling');
    }
    
    // Queue recommendations
    const queueHealth = healthResult.checks.queues;
    if (queueHealth.details.totalFailed > 100) {
      recommendations.push('Investigate and resolve failed jobs in the queue');
      recommendations.push('Consider implementing better error handling and retry strategies');
    }
    
    if (queueHealth.details.totalStalled > 50) {
      recommendations.push('Check for long-running jobs causing stalls');
      recommendations.push('Consider adjusting job timeout settings');
    }
    
    // Worker recommendations
    const workerHealth = healthResult.checks.workers;
    if (workerHealth.details.failureRate > 10) {
      recommendations.push('Review job processing logic to reduce failure rate');
      recommendations.push('Consider implementing circuit breakers for external dependencies');
    }
    
    // System recommendations
    const systemHealth = healthResult.checks.system;
    if (systemHealth.details.memoryUsagePercent > 80) {
      recommendations.push('Consider increasing system memory or optimizing memory usage');
      recommendations.push('Review for memory leaks in the application');
    }
    
    if (systemHealth.details.cpuUsagePercent > 80) {
      recommendations.push('Consider scaling horizontally or optimizing CPU-intensive operations');
    }
    
    return recommendations;
  }
  
  // Store health check result
  private async storeHealthCheckResult(healthResult: HealthCheckResult): Promise<void> {
    try {
      await this.supabase
        .from('system_health_reports')
        .insert({
          status: healthResult.status,
          checks: healthResult.checks,
          issues: healthResult.issues,
          recommendations: healthResult.recommendations,
          timestamp: healthResult.timestamp.toISOString(),
          created_at: new Date().toISOString(),
        });
    } catch (error) {
      console.error('Failed to store health check result:', error);
    }
  }
  
  // Handle health alerts
  private async handleHealthAlerts(healthResult: HealthCheckResult): Promise<void> {
    const alertKey = `health:${healthResult.status}`;
    const lastAlertTime = this.alertCooldowns.get(alertKey) || 0;
    const now = Date.now();
    
    // Check cooldown
    if (now - lastAlertTime < this.ALERT_COOLDOWN_MS) {
      console.log('⏭️  Health alert throttled due to cooldown');
      return;
    }
    
    // Update cooldown
    this.alertCooldowns.set(alertKey, now);
    
    // Queue health alert
    await enhancedQueueManager.addJob(
      QUEUE_NAMES.RETRY_QUEUE,
      JOB_TYPES.ESCALATE_ERROR,
      {
        organizationId: 'system', // System-level alert
        alertType: 'system_health',
        title: `System Health ${healthResult.status.toUpperCase()}`,
        description: `System health check detected ${healthResult.issues.length} issues`,
        severity: healthResult.status === 'critical' ? 'critical' : 'warning',
        data: {
          healthResult,
          issues: healthResult.issues,
          recommendations: healthResult.recommendations,
        },
        recipients: ['admin@example.com'], // Should be configured
        channels: healthResult.status === 'critical' ? ['email', 'webhook'] : ['email'],
      },
      {
        priority: JOB_PRIORITIES.HIGH,
      }
    );
  }
  
  // Get last health check result
  getLastHealthCheck(): HealthCheckResult | null {
    return this.lastHealthCheck;
  }
  
  // Get current health status
  async getCurrentHealth(): Promise<HealthCheckResult> {
    if (this.lastHealthCheck && 
        Date.now() - this.lastHealthCheck.timestamp.getTime() < this.HEALTH_CHECK_INTERVAL) {
      return this.lastHealthCheck;
    }
    
    return this.performHealthCheck();
  }
  
  // Emergency recovery procedures
  async performEmergencyRecovery(): Promise<void> {
    console.log('🚨 Performing emergency recovery procedures...');
    
    try {
      // Step 1: Pause all queues
      console.log('⏸️  Pausing all queues...');
      for (const queueName of Object.values(QUEUE_NAMES)) {
        try {
          await enhancedQueueManager.pauseQueue(queueName as any);
        } catch (error) {
          console.error(`Failed to pause queue ${queueName}:`, error);
        }
      }
      
      // Step 2: Clear stalled jobs
      console.log('🧹 Clearing stalled jobs...');
      for (const queueName of Object.values(QUEUE_NAMES)) {
        try {
          await enhancedQueueManager.cleanQueue(
            queueName as any,
            0,
            100,
            'stalled'
          );
        } catch (error) {
          console.error(`Failed to clean stalled jobs from ${queueName}:`, error);
        }
      }
      
      // Step 3: Restart failed jobs
      console.log('🔄 Retrying failed jobs...');
      for (const queueName of Object.values(QUEUE_NAMES)) {
        try {
          await enhancedQueueManager.retryFailedJobs(queueName as any);
        } catch (error) {
          console.error(`Failed to retry failed jobs in ${queueName}:`, error);
        }
      }
      
      // Step 4: Resume queues
      console.log('▶️  Resuming all queues...');
      for (const queueName of Object.values(QUEUE_NAMES)) {
        try {
          await enhancedQueueManager.resumeQueue(queueName as any);
        } catch (error) {
          console.error(`Failed to resume queue ${queueName}:`, error);
        }
      }
      
      // Step 5: Perform health check
      const healthResult = await this.performHealthCheck();
      
      console.log(`✅ Emergency recovery completed. Health status: ${healthResult.status}`);
      
      // Log recovery event
      await this.supabase
        .from('system_events')
        .insert({
          event_type: 'emergency_recovery',
          status: 'completed',
          details: {
            healthStatus: healthResult.status,
            issues: healthResult.issues,
          },
          created_at: new Date().toISOString(),
        });
      
    } catch (error) {
      console.error('❌ Emergency recovery failed:', error);
      throw error;
    }
  }
}

// Create and export singleton instance
export const healthMonitor = new HealthMonitor();

// Export convenience functions
export async function startHealthMonitoring(): Promise<void> {
  return healthMonitor.startMonitoring();
}

export function stopHealthMonitoring(): void {
  return healthMonitor.stopMonitoring();
}

export async function getSystemHealth(): Promise<HealthCheckResult> {
  return healthMonitor.getCurrentHealth();
}

export async function performEmergencyRecovery(): Promise<void> {
  return healthMonitor.performEmergencyRecovery();
}

// Process health check job (for worker)
export async function processHealthCheck(job: any): Promise<void> {
  const result = await healthMonitor.performHealthCheck();
  return result;
}
'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/app/components/ui/Card';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';

interface QueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  stalled?: number;
  paused: boolean;
}

interface SystemStatus {
  status: 'healthy' | 'warning' | 'critical';
  queues: Record<string, QueueStats>;
  workers: Record<string, any>;
  connection: {
    redis: boolean;
    lastError?: string;
  };
  metrics: any;
  timestamp: string;
}

export default function QueueMonitor() {
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchSystemStatus = async () => {
    try {
      const response = await fetch('/api/queues/health');
      const data = await response.json();
      
      if (data.status === 'success' || data.status === 'warning') {
        setSystemStatus(data.data);
        setError(null);
      } else {
        setError(data.message || 'Failed to fetch system status');
      }
    } catch (err) {
      setError('Network error: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const triggerHealthCheck = async () => {
    try {
      setLoading(true);
      await fetch('/api/queues/health', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'health-check' }),
      });
      
      // Refresh after health check
      setTimeout(() => fetchSystemStatus(), 2000);
    } catch (err) {
      setError('Failed to trigger health check: ' + (err as Error).message);
      setLoading(false);
    }
  };

  const triggerEmergencyRecovery = async () => {
    if (!confirm('Are you sure you want to trigger emergency recovery? This will restart the queue system.')) {
      return;
    }
    
    try {
      setLoading(true);
      await fetch('/api/queues/health', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'emergency-recovery' }),
      });
      
      // Refresh after recovery
      setTimeout(() => fetchSystemStatus(), 5000);
    } catch (err) {
      setError('Failed to trigger emergency recovery: ' + (err as Error).message);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSystemStatus();
    
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(fetchSystemStatus, 5000); // Refresh every 5 seconds
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-100 text-green-800';
      case 'warning': return 'bg-yellow-100 text-yellow-800';
      case 'critical': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getQueueHealth = (stats: QueueStats) => {
    const totalJobs = stats.waiting + stats.active + stats.delayed;
    
    if (stats.failed > 200 || totalJobs > 5000) return 'critical';
    if (stats.failed > 50 || totalJobs > 1000) return 'warning';
    return 'healthy';
  };

  if (loading && !systemStatus) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card className="border-red-200 bg-red-50">
          <div className="p-4">
            <h3 className="text-lg font-semibold text-red-800 mb-2">Error</h3>
            <p className="text-red-600 mb-4">{error}</p>
            <Button 
              onClick={fetchSystemStatus}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Retry
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (!systemStatus) {
    return (
      <div className="p-6">
        <Card>
          <div className="p-4 text-center text-gray-500">
            No system status available
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Queue Monitor</h2>
          <p className="text-gray-600">Real-time queue system status and metrics</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={autoRefresh ? 'default' : 'outline'}
            onClick={() => setAutoRefresh(!autoRefresh)}
            className="text-sm"
          >
            {autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
          </Button>
          <Button
            onClick={triggerHealthCheck}
            disabled={loading}
            className="text-sm"
          >
            Health Check
          </Button>
          {systemStatus.status === 'critical' && (
            <Button
              onClick={triggerEmergencyRecovery}
              disabled={loading}
              className="text-sm bg-red-600 hover:bg-red-700"
            >
              Emergency Recovery
            </Button>
          )}
        </div>
      </div>

      {/* System Status Overview */}
      <Card>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">System Status</h3>
            <Badge className={getStatusColor(systemStatus.status)}>
              {systemStatus.status.toUpperCase()}
            </Badge>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {Object.keys(systemStatus.queues).length}
              </div>
              <div className="text-sm text-gray-600">Active Queues</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {Object.keys(systemStatus.workers).length}
              </div>
              <div className="text-sm text-gray-600">Workers</div>
            </div>
            
            <div className="text-center">
              <div className={`text-2xl font-bold ${systemStatus.connection.redis ? 'text-green-600' : 'text-red-600'}`}>
                {systemStatus.connection.redis ? 'Connected' : 'Disconnected'}
              </div>
              <div className="text-sm text-gray-600">Redis</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {systemStatus.metrics.processedJobs || 0}
              </div>
              <div className="text-sm text-gray-600">Jobs Processed</div>
            </div>
          </div>
          
          <div className="mt-4 text-xs text-gray-500">
            Last updated: {new Date(systemStatus.timestamp).toLocaleString()}
          </div>
        </div>
      </Card>

      {/* Queue Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(systemStatus.queues).map(([queueName, stats]) => {
          const health = getQueueHealth(stats);
          const totalJobs = stats.waiting + stats.active + stats.delayed;
          
          return (
            <Card key={queueName}>
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-gray-900 truncate">
                    {queueName.replace(/^(dev|prod):/, '')}
                  </h4>
                  <Badge className={getStatusColor(health)} size="sm">
                    {health}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="font-medium text-blue-600">{stats.waiting}</div>
                    <div className="text-gray-500">Waiting</div>
                  </div>
                  <div>
                    <div className="font-medium text-green-600">{stats.active}</div>
                    <div className="text-gray-500">Active</div>
                  </div>
                  <div>
                    <div className="font-medium text-gray-600">{stats.completed}</div>
                    <div className="text-gray-500">Completed</div>
                  </div>
                  <div>
                    <div className="font-medium text-red-600">{stats.failed}</div>
                    <div className="text-gray-500">Failed</div>
                  </div>
                </div>
                
                {stats.delayed > 0 && (
                  <div className="mt-2 pt-2 border-t">
                    <div className="text-sm">
                      <span className="font-medium text-orange-600">{stats.delayed}</span>
                      <span className="text-gray-500 ml-1">delayed</span>
                    </div>
                  </div>
                )}
                
                {stats.paused && (
                  <div className="mt-2">
                    <Badge className="bg-yellow-100 text-yellow-800" size="sm">
                      PAUSED
                    </Badge>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Worker Status */}
      {Object.keys(systemStatus.workers).length > 0 && (
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Worker Status</h3>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Worker</th>
                    <th className="text-right py-2">Processed</th>
                    <th className="text-right py-2">Failed</th>
                    <th className="text-right py-2">Active</th>
                    <th className="text-right py-2">Uptime</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(systemStatus.workers).map(([workerName, metrics]: [string, any]) => (
                    <tr key={workerName} className="border-b">
                      <td className="py-2 font-medium">{workerName}</td>
                      <td className="py-2 text-right text-green-600">{metrics.processed || 0}</td>
                      <td className="py-2 text-right text-red-600">{metrics.failed || 0}</td>
                      <td className="py-2 text-right text-blue-600">{metrics.active || 0}</td>
                      <td className="py-2 text-right text-gray-600">
                        {metrics.startTime ? 
                          Math.floor((Date.now() - new Date(metrics.startTime).getTime()) / 1000) + 's' : 
                          'N/A'
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
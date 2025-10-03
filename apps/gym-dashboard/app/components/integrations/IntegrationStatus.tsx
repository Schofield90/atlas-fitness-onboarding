'use client';

import React, { useState, useEffect } from 'react';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  RefreshCw, 
  Settings, 
  ExternalLink,
  Loader2,
  Wifi,
  WifiOff
} from 'lucide-react';
import { Button } from '@/app/components/ui/Button';
import { Badge } from '@/app/components/ui/Badge';

interface IntegrationConfig {
  integration_type: string;
  validation_result: {
    is_valid: boolean;
    connection_status: 'connected' | 'disconnected' | 'error' | 'warning';
    error_message?: string;
    warnings?: string[];
    capabilities?: string[];
    test_results?: any;
  };
  created_at: string;
}

interface IntegrationStatusProps {
  className?: string;
  onConfigureIntegration?: (integrationType: string) => void;
  showActions?: boolean;
}

const INTEGRATION_INFO = {
  facebook: {
    name: 'Facebook Ads',
    description: 'Sync lead forms and run targeted campaigns',
    color: 'bg-blue-500',
    icon: '📘'
  },
  google: {
    name: 'Google Calendar',
    description: 'Sync classes and appointments',
    color: 'bg-red-500',
    icon: '📅'
  },
  stripe: {
    name: 'Stripe Payments',
    description: 'Process payments and subscriptions',
    color: 'bg-purple-500',
    icon: '💳'
  },
  twilio: {
    name: 'Twilio SMS',
    description: 'Send SMS notifications and reminders',
    color: 'bg-green-500',
    icon: '📱'
  },
  whatsapp: {
    name: 'WhatsApp Business',
    description: 'Send WhatsApp messages to customers',
    color: 'bg-green-600',
    icon: '💬'
  },
  email: {
    name: 'Email Service',
    description: 'Send automated emails and newsletters',
    color: 'bg-gray-500',
    icon: '📧'
  },
  webhook: {
    name: 'Webhooks',
    description: 'Custom API integrations and automations',
    color: 'bg-indigo-500',
    icon: '🔗'
  }
};

export default function IntegrationStatus({ 
  className = '', 
  onConfigureIntegration,
  showActions = true 
}: IntegrationStatusProps) {
  const [integrations, setIntegrations] = useState<{ [key: string]: IntegrationConfig }>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState<string | null>(null);

  useEffect(() => {
    fetchIntegrationStatus();
  }, []);

  const fetchIntegrationStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/integrations/validate');
      
      if (response.ok) {
        const data = await response.json();
        setIntegrations(data.integrations || {});
      }
    } catch (error) {
      console.error('Error fetching integration status:', error);
    } finally {
      setLoading(false);
    }
  };

  const validateIntegration = async (integrationType: string, config: any, testAction?: string) => {
    try {
      setRefreshing(integrationType);
      
      const response = await fetch('/api/integrations/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          integration_type: integrationType,
          config,
          test_action: testAction
        })
      });

      if (response.ok) {
        const data = await response.json();
        setIntegrations(prev => ({
          ...prev,
          [integrationType]: {
            integration_type: integrationType,
            validation_result: data.validation,
            created_at: new Date().toISOString()
          }
        }));
      }
    } catch (error) {
      console.error('Error validating integration:', error);
    } finally {
      setRefreshing(null);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'error':
      case 'disconnected':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <WifiOff className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'connected':
        return <Badge variant="success">Connected</Badge>;
      case 'warning':
        return <Badge variant="warning">Warning</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      case 'disconnected':
        return <Badge variant="destructive">Disconnected</Badge>;
      default:
        return <Badge variant="secondary">Not Configured</Badge>;
    }
  };

  const getConnectionStrength = (integration: IntegrationConfig) => {
    const { validation_result } = integration;
    
    if (!validation_result.is_valid) return 0;
    if (validation_result.warnings && validation_result.warnings.length > 0) return 2;
    return 3;
  };

  if (loading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Integration Status</h3>
          <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-lg border p-4 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const allIntegrationTypes = Object.keys(INTEGRATION_INFO);
  const connectedCount = Object.values(integrations).filter(
    int => int.validation_result?.connection_status === 'connected'
  ).length;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Integration Status</h3>
          <p className="text-sm text-gray-600">
            {connectedCount} of {allIntegrationTypes.length} integrations connected
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchIntegrationStatus}
          className="flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-green-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{connectedCount}</div>
          <div className="text-sm text-green-600">Connected</div>
        </div>
        <div className="bg-yellow-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-yellow-600">
            {Object.values(integrations).filter(
              int => int.validation_result?.connection_status === 'warning'
            ).length}
          </div>
          <div className="text-sm text-yellow-600">Warnings</div>
        </div>
        <div className="bg-red-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-red-600">
            {Object.values(integrations).filter(
              int => int.validation_result?.connection_status === 'error'
            ).length}
          </div>
          <div className="text-sm text-red-600">Errors</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-gray-600">
            {allIntegrationTypes.length - Object.keys(integrations).length}
          </div>
          <div className="text-sm text-gray-600">Not Set Up</div>
        </div>
      </div>

      {/* Integration Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {allIntegrationTypes.map((integrationType) => {
          const integration = integrations[integrationType];
          const info = INTEGRATION_INFO[integrationType as keyof typeof INTEGRATION_INFO];
          const status = integration?.validation_result?.connection_status || 'disconnected';
          const connectionStrength = integration ? getConnectionStrength(integration) : 0;

          return (
            <div
              key={integrationType}
              className="bg-white rounded-lg border p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 ${info.color} rounded-lg flex items-center justify-center text-white text-lg`}>
                    {info.icon}
                  </div>
                  <div>
                    <h4 className="font-semibold">{info.name}</h4>
                    <p className="text-sm text-gray-600">{info.description}</p>
                  </div>
                </div>
                {getStatusIcon(status)}
              </div>

              {/* Status Badge and Connection Strength */}
              <div className="flex items-center justify-between mb-3">
                {getStatusBadge(status)}
                
                {/* Connection Strength Indicator */}
                <div className="flex items-center gap-1">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div
                      key={i}
                      className={`w-1 h-3 rounded-full ${
                        i < connectionStrength ? 'bg-green-500' : 'bg-gray-200'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Error Message */}
              {integration?.validation_result?.error_message && (
                <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-600">
                  {integration.validation_result.error_message}
                </div>
              )}

              {/* Warnings */}
              {integration?.validation_result?.warnings && integration.validation_result.warnings.length > 0 && (
                <div className="mb-3 p-2 bg-yellow-50 border border-yellow-200 rounded">
                  <div className="text-sm text-yellow-700 font-medium mb-1">Warnings:</div>
                  <ul className="text-sm text-yellow-600 space-y-1">
                    {integration.validation_result.warnings.map((warning, i) => (
                      <li key={i} className="flex items-start gap-1">
                        <span>•</span>
                        <span>{warning}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Capabilities */}
              {integration?.validation_result?.capabilities && integration.validation_result.capabilities.length > 0 && (
                <div className="mb-3">
                  <div className="text-sm text-gray-700 font-medium mb-2">Capabilities:</div>
                  <div className="flex flex-wrap gap-1">
                    {integration.validation_result.capabilities.map((capability, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {capability.replace(/_/g, ' ')}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Last Checked */}
              {integration && (
                <div className="text-xs text-gray-500 mb-3">
                  Last checked: {new Date(integration.created_at).toLocaleString()}
                </div>
              )}

              {/* Actions */}
              {showActions && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onConfigureIntegration?.(integrationType)}
                    className="flex-1 flex items-center gap-1"
                  >
                    <Settings className="h-3 w-3" />
                    Configure
                  </Button>
                  
                  {integration && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => validateIntegration(
                        integrationType, 
                        integration.validation_result, 
                        'test'
                      )}
                      disabled={refreshing === integrationType}
                      className="flex items-center gap-1"
                    >
                      {refreshing === integrationType ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <RefreshCw className="h-3 w-3" />
                      )}
                      Test
                    </Button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Overall Health Score */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="font-semibold mb-2">Integration Health Score</h4>
        <div className="flex items-center gap-4">
          <div className="flex-1 bg-gray-200 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 h-2 rounded-full transition-all duration-300"
              style={{
                width: `${(connectedCount / allIntegrationTypes.length) * 100}%`
              }}
            />
          </div>
          <div className="text-sm font-medium">
            {Math.round((connectedCount / allIntegrationTypes.length) * 100)}%
          </div>
        </div>
        <p className="text-sm text-gray-600 mt-1">
          {connectedCount === allIntegrationTypes.length
            ? '🎉 All integrations are connected!'
            : connectedCount > allIntegrationTypes.length / 2
            ? '👍 Most integrations are working well'
            : '⚠️ Several integrations need attention'
          }
        </p>
      </div>
    </div>
  );
}
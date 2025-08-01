"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Activity, RefreshCw, TrendingUp, TrendingDown, AlertTriangle, Target } from 'lucide-react';
import { LookInBodyService } from '@/lib/services/lookinbody/LookInBodyService';
import { useOrganization } from '@/hooks/useOrganization';
import { toast } from 'react-hot-toast';

interface BodyCompositionSectionProps {
  clientId: string;
  clientPhone?: string;
}

interface Scan {
  id: string;
  weight: number;
  height: number;
  bmi: number;
  body_fat_percentage: number;
  skeletal_muscle_mass: number;
  visceral_fat_level: number;
  phase_angle: number;
  ecw_tbw_ratio: number;
  inbody_score: number;
  scan_date: string;
  weight_change?: number;
  body_fat_change?: number;
  muscle_mass_change?: number;
  days_since_last_scan?: number;
  segmental_lean_mass?: any;
  target_values?: any;
}

export function BodyCompositionSection({ clientId, clientPhone }: BodyCompositionSectionProps) {
  const { organization } = useOrganization();
  const [scans, setScans] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [activeAlerts, setActiveAlerts] = useState<any[]>([]);

  const latestScan = scans[0];

  useEffect(() => {
    if (clientId) {
      loadScans();
      loadAlerts();
    }
  }, [clientId]);

  const loadScans = async () => {
    try {
      const response = await fetch(`/api/clients/${clientId}/body-composition`);
      if (response.ok) {
        const data = await response.json();
        setScans(data.scans || []);
      }
    } catch (error) {
      console.error('Error loading scans:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAlerts = async () => {
    try {
      const response = await fetch(`/api/clients/${clientId}/body-composition/alerts`);
      if (response.ok) {
        const data = await response.json();
        setActiveAlerts(data.alerts || []);
      }
    } catch (error) {
      console.error('Error loading alerts:', error);
    }
  };

  const syncLatestData = async () => {
    if (!clientPhone || !organization) {
      toast.error('Client phone number not available');
      return;
    }

    setSyncing(true);
    try {
      const response = await fetch(`/api/clients/${clientId}/body-composition/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: clientPhone })
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(`Synced ${data.count} new scans`);
        await loadScans();
        await loadAlerts();
      } else {
        toast.error('Failed to sync data');
      }
    } catch (error) {
      console.error('Error syncing data:', error);
      toast.error('Error syncing data');
    } finally {
      setSyncing(false);
    }
  };

  const getScoreStatus = (score: number) => {
    if (score >= 80) return 'excellent';
    if (score >= 70) return 'good';
    if (score >= 60) return 'average';
    return 'needs-improvement';
  };

  const getHealthIndicatorStatus = (metric: string, value: number) => {
    switch (metric) {
      case 'visceral_fat':
        return value > 13 ? 'high' : value > 10 ? 'medium' : 'normal';
      case 'phase_angle':
        return value < 4.0 ? 'low' : value < 5.0 ? 'medium' : 'normal';
      case 'ecw_tbw':
        return value > 0.400 ? 'high' : value > 0.390 ? 'medium' : 'normal';
      default:
        return 'normal';
    }
  };

  if (loading) {
    return (
      <Card className="mt-6">
        <CardContent className="py-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground mt-4">Loading body composition data...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mt-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Body Composition Analysis
          </CardTitle>
          <div className="flex gap-2">
            {organization?.features?.lookinbody && (
              <Button onClick={syncLatestData} size="sm" variant="outline" disabled={syncing}>
                <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                Sync Latest
              </Button>
            )}
            {scans.length > 1 && (
              <Button onClick={() => setShowHistory(!showHistory)} size="sm" variant="outline">
                {showHistory ? 'Hide' : 'View'} History
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {latestScan ? (
          <div className="space-y-6">
            {/* Key Metrics Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <MetricCard
                title="Weight"
                value={latestScan.weight}
                unit="kg"
                change={latestScan.weight_change}
                changeLabel={latestScan.days_since_last_scan ? `${latestScan.days_since_last_scan} days` : undefined}
              />
              <MetricCard
                title="Body Fat"
                value={latestScan.body_fat_percentage}
                unit="%"
                change={latestScan.body_fat_change}
                target={latestScan.target_values?.body_fat_percentage}
              />
              <MetricCard
                title="Muscle Mass"
                value={latestScan.skeletal_muscle_mass}
                unit="kg"
                change={latestScan.muscle_mass_change}
                target={latestScan.target_values?.skeletal_muscle_mass}
              />
              <MetricCard
                title="InBody Score"
                value={latestScan.inbody_score}
                unit="/100"
                status={getScoreStatus(latestScan.inbody_score)}
              />
            </div>

            {/* Health Indicators */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <HealthIndicator
                title="Visceral Fat"
                value={latestScan.visceral_fat_level}
                threshold={10}
                unit="level"
                status={getHealthIndicatorStatus('visceral_fat', latestScan.visceral_fat_level)}
              />
              <HealthIndicator
                title="Phase Angle"
                value={latestScan.phase_angle}
                threshold={5.0}
                unit="°"
                status={getHealthIndicatorStatus('phase_angle', latestScan.phase_angle)}
              />
              <HealthIndicator
                title="ECW/TBW Ratio"
                value={latestScan.ecw_tbw_ratio}
                threshold={0.390}
                unit=""
                status={getHealthIndicatorStatus('ecw_tbw', latestScan.ecw_tbw_ratio)}
              />
            </div>

            {/* Active Alerts */}
            {activeAlerts.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">Active Alerts</h4>
                {activeAlerts.map(alert => (
                  <div key={alert.id} className={`p-3 rounded-lg border ${
                    alert.severity === 'high' ? 'border-red-200 bg-red-50' :
                    alert.severity === 'medium' ? 'border-yellow-200 bg-yellow-50' :
                    'border-blue-200 bg-blue-50'
                  }`}>
                    <div className="flex items-start gap-2">
                      <AlertTriangle className={`h-4 w-4 mt-0.5 ${
                        alert.severity === 'high' ? 'text-red-600' :
                        alert.severity === 'medium' ? 'text-yellow-600' :
                        'text-blue-600'
                      }`} />
                      <div className="flex-1">
                        <p className="font-medium text-sm">{alert.title}</p>
                        <p className="text-sm text-muted-foreground mt-1">{alert.message}</p>
                      </div>
                      <Badge variant={alert.alert_type === 'achievement' ? 'default' : 'destructive'}>
                        {alert.alert_type}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Scan History */}
            {showHistory && scans.length > 1 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">Scan History</h4>
                <div className="space-y-2">
                  {scans.slice(1, 6).map((scan) => (
                    <div key={scan.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{new Date(scan.scan_date).toLocaleDateString('en-GB')}</p>
                        <p className="text-sm text-muted-foreground">
                          Weight: {scan.weight}kg | Body Fat: {scan.body_fat_percentage}% | Muscle: {scan.skeletal_muscle_mass}kg
                        </p>
                      </div>
                      <Badge variant="outline">Score: {scan.inbody_score}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Last Scan Date */}
            <div className="text-sm text-muted-foreground text-center">
              Last scan: {new Date(latestScan.scan_date).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
              })}
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No Body Composition Data</h3>
            <p className="text-muted-foreground mb-4">
              {clientPhone 
                ? "No InBody scans found for this client. Click 'Sync Latest' to check for new data."
                : "Add a phone number to this client's profile to sync their InBody scan data."
              }
            </p>
            {clientPhone && organization?.features?.lookinbody && (
              <Button onClick={syncLatestData} disabled={syncing}>
                <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                Sync InBody Data
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Metric Card Component
function MetricCard({ 
  title, 
  value, 
  unit, 
  change, 
  changeLabel,
  target,
  status 
}: {
  title: string;
  value: number;
  unit: string;
  change?: number;
  changeLabel?: string;
  target?: number;
  status?: string;
}) {
  const isPositiveChange = change && change > 0;
  const isNegativeChange = change && change < 0;
  const changeColor = title === 'Body Fat' 
    ? (isNegativeChange ? 'text-green-600' : 'text-red-600')
    : (isPositiveChange ? 'text-green-600' : 'text-red-600');

  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className="text-2xl font-bold">
          {value}{unit}
        </p>
        {change !== undefined && change !== 0 && (
          <div className="flex items-center gap-1 mt-1">
            {isPositiveChange ? (
              <TrendingUp className={`h-4 w-4 ${changeColor}`} />
            ) : (
              <TrendingDown className={`h-4 w-4 ${changeColor}`} />
            )}
            <span className={`text-sm ${changeColor}`}>
              {isPositiveChange ? '+' : ''}{change.toFixed(1)}{unit}
            </span>
            {changeLabel && (
              <span className="text-xs text-muted-foreground">({changeLabel})</span>
            )}
          </div>
        )}
        {target && (
          <div className="flex items-center gap-1 mt-1">
            <Target className="h-3 h-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Target: {target}{unit}</span>
          </div>
        )}
        {status && (
          <Badge 
            variant={status === 'excellent' ? 'default' : status === 'good' ? 'secondary' : 'outline'}
            className="mt-2"
          >
            {status}
          </Badge>
        )}
      </CardContent>
    </Card>
  );
}

// Health Indicator Component  
function HealthIndicator({
  title,
  value,
  threshold,
  unit,
  status
}: {
  title: string;
  value: number;
  threshold: number;
  unit: string;
  status: 'normal' | 'medium' | 'high' | 'low';
}) {
  const statusColors = {
    normal: 'text-green-600 bg-green-50 border-green-200',
    medium: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    high: 'text-red-600 bg-red-50 border-red-200',
    low: 'text-red-600 bg-red-50 border-red-200'
  };

  return (
    <div className={`p-4 rounded-lg border ${statusColors[status]}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">{title}</p>
          <p className="text-2xl font-bold">
            {value}{unit}
          </p>
          <p className="text-xs opacity-75">
            Threshold: {threshold}{unit}
          </p>
        </div>
        {status !== 'normal' && (
          <AlertTriangle className="h-5 w-5" />
        )}
      </div>
    </div>
  );
}
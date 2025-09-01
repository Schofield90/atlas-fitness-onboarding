"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Copy, Check, AlertCircle, Activity, CreditCard, MapPin, Settings } from 'lucide-react';
import { useOrganization } from '@/hooks/useOrganization';
import { toast } from 'react-hot-toast';

interface LookInBodyConfig {
  api_key: string;
  account_name: string;
  region: string;
  webhook_secret: string;
  webhook_enabled: boolean;
  auto_sync_enabled: boolean;
  alert_thresholds: {
    significant_weight_change: number;
    significant_fat_change: number;
    high_visceral_fat: number;
    low_phase_angle: number;
  };
  api_plan: string;
  billing_status: string;
  is_active: boolean;
}

interface UsageStats {
  api_calls: number;
  webhooks: number;
  scans: number;
  limit: number;
  remaining: number;
  cost: number;
}

export default function LookInBodySettings() {
  const { organization } = useOrganization();
  const [config, setConfig] = useState<LookInBodyConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [usage, setUsage] = useState<UsageStats | null>(null);
  const [locations, setLocations] = useState<any[]>([]);

  const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : 'https://gym-coach-platform.vercel.app')}/api/webhooks/lookinbody/${organization?.id}`;

  useEffect(() => {
    if (organization) {
      loadConfig();
      loadUsage();
      loadLocations();
    }
  }, [organization]);

  const loadConfig = async () => {
    try {
      const response = await fetch('/api/settings/lookinbody');
      if (response.ok) {
        const data = await response.json();
        setConfig(data.config || getDefaultConfig());
      } else {
        setConfig(getDefaultConfig());
      }
    } catch (error) {
      console.error('Error loading config:', error);
      setConfig(getDefaultConfig());
    } finally {
      setLoading(false);
    }
  };

  const loadUsage = async () => {
    try {
      const response = await fetch('/api/settings/lookinbody/usage');
      if (response.ok) {
        const data = await response.json();
        setUsage(data);
      }
    } catch (error) {
      console.error('Error loading usage:', error);
    }
  };

  const loadLocations = async () => {
    try {
      const response = await fetch('/api/settings/locations');
      if (response.ok) {
        const data = await response.json();
        setLocations(data.locations || []);
      }
    } catch (error) {
      console.error('Error loading locations:', error);
    }
  };

  const getDefaultConfig = (): LookInBodyConfig => ({
    api_key: '',
    account_name: '',
    region: 'usa',
    webhook_secret: generateWebhookSecret(),
    webhook_enabled: true,
    auto_sync_enabled: true,
    alert_thresholds: {
      significant_weight_change: 2.0,
      significant_fat_change: 3.0,
      high_visceral_fat: 13,
      low_phase_angle: 4.0
    },
    api_plan: 'basic',
    billing_status: 'inactive',
    is_active: false
  });

  const generateWebhookSecret = () => {
    return Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  };

  const handleSave = async () => {
    if (!config) return;

    setSaving(true);
    try {
      const response = await fetch('/api/settings/lookinbody', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });

      if (response.ok) {
        toast.success('LookInBody settings saved successfully');
      } else {
        toast.error('Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Error saving settings');
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy to clipboard');
    }
  };

  const updateConfig = (updates: Partial<LookInBodyConfig>) => {
    setConfig(prev => prev ? { ...prev, ...updates } : null);
  };

  const updateThreshold = (key: string, value: number) => {
    setConfig(prev => prev ? {
      ...prev,
      alert_thresholds: {
        ...prev.alert_thresholds,
        [key]: value
      }
    } : null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">LookInBody Integration</h1>
          <p className="text-muted-foreground">Configure your InBody scanner integration and automation settings</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={config?.is_active ? 'default' : 'secondary'}>
            {config?.is_active ? 'Active' : 'Inactive'}
          </Badge>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="setup" className="space-y-6">
        <TabsList>
          <TabsTrigger value="setup">Setup</TabsTrigger>
          <TabsTrigger value="alerts">Health Alerts</TabsTrigger>
          <TabsTrigger value="locations">Locations</TabsTrigger>
          <TabsTrigger value="usage">Usage & Billing</TabsTrigger>
        </TabsList>

        <TabsContent value="setup" className="space-y-6">
          {/* API Configuration */}
          <Card>
            <CardHeader>
              <CardTitle>API Configuration</CardTitle>
              <CardDescription>
                Connect your LookInBody account to sync body composition data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="api-key">API Key</Label>
                  <Input
                    id="api-key"
                    type="password"
                    placeholder="Enter your LookInBody API key"
                    value={config?.api_key || ''}
                    onChange={(e) => updateConfig({ api_key: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="account-name">Account Name</Label>
                  <Input
                    id="account-name"
                    placeholder="Your LookInBody account name"
                    value={config?.account_name || ''}
                    onChange={(e) => updateConfig({ account_name: e.target.value })}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="region">Region</Label>
                <Select
                  value={config?.region || 'usa'}
                  onValueChange={(value) => updateConfig({ region: value })}
                >
                  <SelectTrigger id="region">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="usa">United States</SelectItem>
                    <SelectItem value="uk">United Kingdom</SelectItem>
                    <SelectItem value="eur">Europe</SelectItem>
                    <SelectItem value="asia">Asia Pacific</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="active"
                  checked={config?.is_active || false}
                  onCheckedChange={(checked) => updateConfig({ is_active: checked })}
                />
                <Label htmlFor="active">Enable LookInBody integration</Label>
              </div>
            </CardContent>
          </Card>

          {/* Webhook Configuration */}
          <Card>
            <CardHeader>
              <CardTitle>Webhook Configuration</CardTitle>
              <CardDescription>
                Configure this webhook URL in your LookInBody Web account to receive real-time scan data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Webhook URL</Label>
                <div className="flex items-center gap-2">
                  <Input
                    value={webhookUrl}
                    readOnly
                    className="flex-1"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(webhookUrl)}
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Add this URL to your LookInBody Web webhook settings
                </p>
              </div>

              <div className="space-y-2">
                <Label>Webhook Secret</Label>
                <div className="flex items-center gap-2">
                  <Input
                    value={config?.webhook_secret || ''}
                    readOnly
                    className="flex-1 font-mono text-xs"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateConfig({ webhook_secret: generateWebhookSecret() })}
                  >
                    Regenerate
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Used to verify webhook authenticity
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="webhook-enabled"
                  checked={config?.webhook_enabled || false}
                  onCheckedChange={(checked) => updateConfig({ webhook_enabled: checked })}
                />
                <Label htmlFor="webhook-enabled">Enable webhook processing</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="auto-sync"
                  checked={config?.auto_sync_enabled || false}
                  onCheckedChange={(checked) => updateConfig({ auto_sync_enabled: checked })}
                />
                <Label htmlFor="auto-sync">Auto-sync client data daily</Label>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Health Alert Thresholds</CardTitle>
              <CardDescription>
                Configure when to generate health alerts based on scan results
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="weight-change">Significant Weight Change (kg)</Label>
                  <Input
                    id="weight-change"
                    type="number"
                    step="0.5"
                    value={config?.alert_thresholds.significant_weight_change || 2}
                    onChange={(e) => updateThreshold('significant_weight_change', parseFloat(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Alert when weight changes by this amount or more
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fat-change">Significant Body Fat Change (%)</Label>
                  <Input
                    id="fat-change"
                    type="number"
                    step="0.5"
                    value={config?.alert_thresholds.significant_fat_change || 3}
                    onChange={(e) => updateThreshold('significant_fat_change', parseFloat(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Alert when body fat percentage changes by this amount or more
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="visceral-fat">High Visceral Fat Level</Label>
                  <Input
                    id="visceral-fat"
                    type="number"
                    value={config?.alert_thresholds.high_visceral_fat || 13}
                    onChange={(e) => updateThreshold('high_visceral_fat', parseInt(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Alert when visceral fat level exceeds this value
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phase-angle">Low Phase Angle (°)</Label>
                  <Input
                    id="phase-angle"
                    type="number"
                    step="0.1"
                    value={config?.alert_thresholds.low_phase_angle || 4.0}
                    onChange={(e) => updateThreshold('low_phase_angle', parseFloat(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Alert when phase angle falls below this value
                  </p>
                </div>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Health alerts will automatically notify trainers and can trigger automation workflows
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="locations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Gym Locations</CardTitle>
              <CardDescription>
                Manage locations with InBody scanners
              </CardDescription>
            </CardHeader>
            <CardContent>
              {locations.length > 0 ? (
                <div className="space-y-4">
                  {locations.map((location) => (
                    <div key={location.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <MapPin className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{location.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {location.device_serials?.length || 0} scanner(s)
                          </p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        Configure
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">No locations configured</p>
                  <Button variant="outline" className="mt-4">
                    Add Location
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="usage" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Usage & Billing</CardTitle>
              <CardDescription>
                Monitor your LookInBody API usage and costs
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Current Plan */}
              <div className="p-4 border rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Current Plan</p>
                    <p className="text-sm text-muted-foreground">
                      {config?.api_plan === 'basic' && 'Basic - 500 API calls/month'}
                      {config?.api_plan === 'professional' && 'Professional - 1,500 API calls/month'}
                      {config?.api_plan === 'enterprise' && 'Enterprise - 5,000 API calls/month'}
                    </p>
                  </div>
                  <Button variant="outline" size="sm">
                    Upgrade Plan
                  </Button>
                </div>
              </div>

              {/* Usage Stats */}
              {usage && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="p-4 border rounded-lg">
                    <p className="text-sm text-muted-foreground">API Calls</p>
                    <p className="text-2xl font-bold">{usage.api_calls}</p>
                    <p className="text-xs text-muted-foreground">
                      {usage.remaining} remaining
                    </p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <p className="text-sm text-muted-foreground">Webhooks</p>
                    <p className="text-2xl font-bold">{usage.webhooks}</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <p className="text-sm text-muted-foreground">Scans Processed</p>
                    <p className="text-2xl font-bold">{usage.scans}</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <p className="text-sm text-muted-foreground">Est. Cost</p>
                    <p className="text-2xl font-bold">£{usage.cost.toFixed(2)}</p>
                  </div>
                </div>
              )}

              {/* Usage Progress */}
              {usage && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>API Usage</span>
                    <span>{((usage.api_calls / usage.limit) * 100).toFixed(0)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full"
                      style={{ width: `${Math.min((usage.api_calls / usage.limit) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
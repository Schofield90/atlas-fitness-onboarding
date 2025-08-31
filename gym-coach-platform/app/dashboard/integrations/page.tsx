'use client'

import { useState } from 'react'
import { Settings, Zap, Shield, Check, X, ExternalLink, Plug, RefreshCw, AlertCircle, Globe, CreditCard, MessageSquare, Calendar, BarChart3, Users, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface Integration {
  id: string
  name: string
  description: string
  category: string
  icon: React.ReactNode
  connected: boolean
  status: 'active' | 'inactive' | 'error' | 'pending'
  lastSync?: string
  settings?: IntegrationSetting[]
  features: string[]
  popular?: boolean
  premium?: boolean
}

interface IntegrationSetting {
  key: string
  label: string
  type: 'text' | 'password' | 'select' | 'boolean'
  value: string
  required: boolean
  options?: string[]
}

const mockIntegrations: Integration[] = [
  {
    id: 'stripe',
    name: 'Stripe',
    description: 'Accept payments and manage subscriptions',
    category: 'Payments',
    icon: <CreditCard className="w-6 h-6" />,
    connected: true,
    status: 'active',
    lastSync: '2024-01-22T10:30:00',
    popular: true,
    features: ['Payment processing', 'Subscription management', 'Refunds', 'Analytics'],
    settings: [
      { key: 'publishable_key', label: 'Publishable Key', type: 'text', value: 'pk_test_***', required: true },
      { key: 'secret_key', label: 'Secret Key', type: 'password', value: 'sk_test_***', required: true },
      { key: 'webhook_url', label: 'Webhook URL', type: 'text', value: 'https://example.com/webhook', required: false }
    ]
  },
  {
    id: 'mailchimp',
    name: 'Mailchimp',
    description: 'Email marketing and automation',
    category: 'Marketing',
    icon: <MessageSquare className="w-6 h-6" />,
    connected: false,
    status: 'inactive',
    popular: true,
    features: ['Email campaigns', 'Audience segmentation', 'Automation', 'Analytics'],
    settings: [
      { key: 'api_key', label: 'API Key', type: 'password', value: '', required: true },
      { key: 'list_id', label: 'Audience ID', type: 'text', value: '', required: true }
    ]
  },
  {
    id: 'google-calendar',
    name: 'Google Calendar',
    description: 'Sync classes and appointments',
    category: 'Calendar',
    icon: <Calendar className="w-6 h-6" />,
    connected: true,
    status: 'active',
    lastSync: '2024-01-22T09:15:00',
    features: ['Calendar sync', 'Event creation', 'Automated reminders'],
    settings: [
      { key: 'calendar_id', label: 'Calendar ID', type: 'text', value: 'primary', required: true },
      { key: 'sync_frequency', label: 'Sync Frequency', type: 'select', value: 'hourly', required: true, options: ['15min', 'hourly', 'daily'] }
    ]
  },
  {
    id: 'facebook-pixel',
    name: 'Facebook Pixel',
    description: 'Track conversions and optimize ads',
    category: 'Analytics',
    icon: <BarChart3 className="w-6 h-6" />,
    connected: false,
    status: 'inactive',
    features: ['Conversion tracking', 'Audience insights', 'Ad optimization'],
    settings: [
      { key: 'pixel_id', label: 'Pixel ID', type: 'text', value: '', required: true },
      { key: 'access_token', label: 'Access Token', type: 'password', value: '', required: true }
    ]
  },
  {
    id: 'zapier',
    name: 'Zapier',
    description: 'Connect with 5000+ apps',
    category: 'Automation',
    icon: <Zap className="w-6 h-6" />,
    connected: false,
    status: 'inactive',
    premium: true,
    features: ['Workflow automation', '5000+ app connections', 'Custom triggers'],
    settings: [
      { key: 'webhook_url', label: 'Webhook URL', type: 'text', value: '', required: true }
    ]
  },
  {
    id: 'quickbooks',
    name: 'QuickBooks',
    description: 'Sync financial data and invoices',
    category: 'Accounting',
    icon: <BarChart3 className="w-6 h-6" />,
    connected: false,
    status: 'inactive',
    premium: true,
    features: ['Invoice sync', 'Financial reporting', 'Tax preparation'],
    settings: [
      { key: 'company_id', label: 'Company ID', type: 'text', value: '', required: true },
      { key: 'client_id', label: 'Client ID', type: 'text', value: '', required: true }
    ]
  },
  {
    id: 'twilio',
    name: 'Twilio',
    description: 'SMS notifications and reminders',
    category: 'Communication',
    icon: <MessageSquare className="w-6 h-6" />,
    connected: true,
    status: 'error',
    lastSync: '2024-01-21T15:45:00',
    features: ['SMS messaging', 'Automated reminders', 'Two-way communication'],
    settings: [
      { key: 'account_sid', label: 'Account SID', type: 'text', value: 'AC***', required: true },
      { key: 'auth_token', label: 'Auth Token', type: 'password', value: '***', required: true },
      { key: 'phone_number', label: 'Phone Number', type: 'text', value: '+1234567890', required: true }
    ]
  },
  {
    id: 'mindbody',
    name: 'MindBody',
    description: 'Import classes and member data',
    category: 'Fitness',
    icon: <Users className="w-6 h-6" />,
    connected: false,
    status: 'inactive',
    premium: true,
    features: ['Class import', 'Member sync', 'Schedule management'],
    settings: [
      { key: 'source_name', label: 'Source Name', type: 'text', value: '', required: true },
      { key: 'username', label: 'Username', type: 'text', value: '', required: true },
      { key: 'password', label: 'Password', type: 'password', value: '', required: true }
    ]
  }
]

const categories = ['All', 'Payments', 'Marketing', 'Calendar', 'Analytics', 'Automation', 'Accounting', 'Communication', 'Fitness']

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>(mockIntegrations)
  const [showConfigDialog, setShowConfigDialog] = useState(false)
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false)
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null)
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [isLoading, setIsLoading] = useState(false)

  const filteredIntegrations = integrations.filter(integration => 
    selectedCategory === 'All' || integration.category === selectedCategory
  )

  const handleToggleIntegration = async (integrationId: string) => {
    const integration = integrations.find(i => i.id === integrationId)
    
    if (integration?.premium) {
      setShowUpgradeDialog(true)
      return
    }

    if (integration?.connected) {
      // Disconnect
      setIntegrations(integrations.map(i => 
        i.id === integrationId 
          ? { ...i, connected: false, status: 'inactive' as const }
          : i
      ))
    } else {
      // Show configuration dialog
      setSelectedIntegration(integration || null)
      setShowConfigDialog(true)
    }
  }

  const handleConfigureIntegration = (integration: Integration) => {
    setSelectedIntegration(integration)
    setShowConfigDialog(true)
  }

  const handleSaveConfig = async () => {
    if (!selectedIntegration) return

    setIsLoading(true)
    
    // Simulate API call
    setTimeout(() => {
      setIntegrations(integrations.map(i => 
        i.id === selectedIntegration.id 
          ? { ...i, connected: true, status: 'active' as const, lastSync: new Date().toISOString() }
          : i
      ))
      setIsLoading(false)
      setShowConfigDialog(false)
    }, 2000)
  }

  const handleTestConnection = async () => {
    if (!selectedIntegration) return
    
    setIsLoading(true)
    
    // Simulate test
    setTimeout(() => {
      setIsLoading(false)
      // In real app, would show success/error message
    }, 1500)
  }

  const handleSyncNow = async (integrationId: string) => {
    setIntegrations(integrations.map(i => 
      i.id === integrationId 
        ? { ...i, lastSync: new Date().toISOString() }
        : i
    ))
  }

  const handlePaidFeature = () => {
    setShowUpgradeDialog(true)
  }

  const getStatusColor = (status: Integration['status']) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'inactive':
        return 'bg-gray-100 text-gray-800'
      case 'error':
        return 'bg-red-100 text-red-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: Integration['status']) => {
    switch (status) {
      case 'active':
        return <Check className="w-4 h-4 text-green-600" />
      case 'error':
        return <X className="w-4 h-4 text-red-600" />
      case 'pending':
        return <RefreshCw className="w-4 h-4 text-yellow-600 animate-spin" />
      default:
        return null
    }
  }

  const connectedCount = integrations.filter(i => i.connected).length
  const errorCount = integrations.filter(i => i.status === 'error').length

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Integrations</h1>
          <p className="text-gray-600">Connect your gym with third-party services</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={handlePaidFeature}>
            <Globe className="w-4 h-4 mr-2" />
            Browse More
          </Button>
        </div>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Connected</CardTitle>
            <Plug className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{connectedCount}</div>
            <p className="text-xs text-muted-foreground">Active integrations</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{integrations.length}</div>
            <p className="text-xs text-muted-foreground">Total integrations</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Issues</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{errorCount}</div>
            <p className="text-xs text-muted-foreground">Require attention</p>
          </CardContent>
        </Card>
      </div>

      {errorCount > 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {errorCount} integration{errorCount > 1 ? 's' : ''} {errorCount > 1 ? 'have' : 'has'} connection issues that need attention.
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="all" className="space-y-6">
        <TabsList>
          {categories.map((category) => (
            <TabsTrigger 
              key={category} 
              value={category.toLowerCase()}
              onClick={() => setSelectedCategory(category)}
            >
              {category}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={selectedCategory.toLowerCase()} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredIntegrations.map((integration) => (
              <Card key={integration.id} className={`relative ${integration.popular ? 'border-blue-500' : ''}`}>
                {integration.popular && (
                  <div className="absolute -top-3 left-4">
                    <Badge className="bg-blue-600 text-white">Popular</Badge>
                  </div>
                )}
                {integration.premium && (
                  <div className="absolute -top-3 right-4">
                    <Badge className="bg-purple-600 text-white">
                      <Lock className="w-3 h-3 mr-1" />
                      Pro
                    </Badge>
                  </div>
                )}
                
                <CardHeader className="pb-3">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      {integration.icon}
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-lg">{integration.name}</CardTitle>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge className={getStatusColor(integration.status)}>
                          {getStatusIcon(integration.status)}
                          <span className="ml-1">
                            {integration.status.charAt(0).toUpperCase() + integration.status.slice(1)}
                          </span>
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <CardDescription>{integration.description}</CardDescription>
                  
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-gray-900">Features:</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      {integration.features.slice(0, 3).map((feature, index) => (
                        <li key={index} className="flex items-center">
                          <Check className="w-3 h-3 text-green-600 mr-2 flex-shrink-0" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  {integration.lastSync && (
                    <div className="text-xs text-gray-600">
                      Last sync: {new Date(integration.lastSync).toLocaleString()}
                    </div>
                  )}
                  
                  <div className="flex items-center space-x-2 pt-2">
                    <Switch
                      checked={integration.connected}
                      onCheckedChange={() => handleToggleIntegration(integration.id)}
                    />
                    <span className="text-sm text-gray-700">
                      {integration.connected ? 'Connected' : 'Connect'}
                    </span>
                  </div>
                  
                  <div className="flex space-x-2">
                    {integration.connected && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleConfigureIntegration(integration)}
                          className="flex-1"
                        >
                          <Settings className="w-4 h-4 mr-1" />
                          Configure
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSyncNow(integration.id)}
                        >
                          <RefreshCw className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                    
                    {!integration.connected && !integration.premium && (
                      <Button
                        size="sm"
                        onClick={() => handleToggleIntegration(integration.id)}
                        className="flex-1"
                      >
                        Connect
                      </Button>
                    )}
                    
                    {integration.premium && !integration.connected && (
                      <Button
                        size="sm"
                        onClick={handlePaidFeature}
                        className="flex-1"
                      >
                        <Lock className="w-4 h-4 mr-1" />
                        Upgrade to Connect
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Configuration Dialog */}
      <Dialog open={showConfigDialog} onOpenChange={setShowConfigDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-3">
              {selectedIntegration?.icon}
              <span>Configure {selectedIntegration?.name}</span>
            </DialogTitle>
            <DialogDescription>
              Set up your {selectedIntegration?.name} integration settings
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {selectedIntegration?.settings?.map((setting) => (
              <div key={setting.key} className="space-y-2">
                <Label htmlFor={setting.key}>
                  {setting.label}
                  {setting.required && <span className="text-red-500 ml-1">*</span>}
                </Label>
                
                {setting.type === 'text' || setting.type === 'password' ? (
                  <Input
                    id={setting.key}
                    type={setting.type}
                    defaultValue={setting.value}
                    placeholder={`Enter ${setting.label.toLowerCase()}`}
                  />
                ) : setting.type === 'select' ? (
                  <select 
                    id={setting.key}
                    defaultValue={setting.value}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    {setting.options?.map((option) => (
                      <option key={option} value={option}>
                        {option.charAt(0).toUpperCase() + option.slice(1)}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="flex items-center space-x-2">
                    <Switch
                      id={setting.key}
                      defaultChecked={setting.value === 'true'}
                    />
                    <Label htmlFor={setting.key} className="text-sm">
                      {setting.value === 'true' ? 'Enabled' : 'Disabled'}
                    </Label>
                  </div>
                )}
              </div>
            ))}
            
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                Your integration credentials are encrypted and stored securely.
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleTestConnection} disabled={isLoading}>
              {isLoading ? 'Testing...' : 'Test Connection'}
            </Button>
            <Button variant="outline" onClick={() => setShowConfigDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveConfig} disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Save & Connect'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upgrade Dialog */}
      <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upgrade Required</DialogTitle>
            <DialogDescription>
              This integration requires a paid subscription to access.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <p className="text-gray-600 mb-4">
              Upgrade to unlock premium integrations and features including:
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
              <li>Advanced automation tools (Zapier)</li>
              <li>Professional accounting software (QuickBooks)</li>
              <li>Fitness industry platforms (MindBody)</li>
              <li>Priority support and setup assistance</li>
              <li>Custom integration development</li>
              <li>Enhanced security and compliance</li>
            </ul>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUpgradeDialog(false)}>
              Maybe Later
            </Button>
            <Button onClick={() => setShowUpgradeDialog(false)}>
              Upgrade Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
'use client'

import { useState, useEffect } from 'react'
import { Copy, Eye, EyeOff, RotateCcw, Zap, Shield, Settings, ChevronDown, ChevronUp, Code2, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { toast } from 'sonner'
import { 
  WebhookTriggerData, 
  ContentType, 
  webhookTriggerDataSchema,
  WebhookVerifyConfig,
  WebhookDedupeConfig 
} from '@/types/webhook-trigger'

interface WebhookTriggerConfigProps {
  workflowId: string
  nodeId: string
  value?: Partial<WebhookTriggerData>
  onChange?: (config: WebhookTriggerData) => void
  onSave?: () => void
  onCancel?: () => void
}

export function WebhookTriggerConfig({
  workflowId,
  nodeId,
  value = {},
  onChange,
  onSave,
  onCancel
}: WebhookTriggerConfigProps) {
  // Generate webhook endpoint URL
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://yourdomain.com'
  const webhookEndpoint = `${baseUrl}/api/automations/webhooks/${workflowId}/${nodeId}`

  // Initialize webhook configuration with defaults
  const [config, setConfig] = useState<WebhookTriggerData>({
    kind: 'webhook',
    name: value.name || '',
    description: value.description || '',
    endpoint: webhookEndpoint,
    secretId: value.secretId || crypto.randomUUID(),
    secretLast4: value.secretLast4 || '****',
    verify: value.verify || {
      algorithm: 'hmac-sha256',
      signatureHeader: 'X-Atlas-Signature',
      timestampHeader: 'X-Atlas-Timestamp',
      toleranceSeconds: 300
    },
    contentTypes: value.contentTypes || ['application/json'],
    ipAllowlist: value.ipAllowlist || [],
    dedupe: value.dedupe,
    paused: value.paused || false,
    active: value.active || true,
    ...value
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [secretRevealed, setSecretRevealed] = useState(false)
  const [isRotatingSecret, setIsRotatingSecret] = useState(false)
  const [showSampleCode, setShowSampleCode] = useState(false)
  const [ipInput, setIpInput] = useState('')
  const [dedupeEnabled, setDedupeEnabled] = useState(!!config.dedupe)

  // Update parent when config changes and is valid
  useEffect(() => {
    const result = webhookTriggerDataSchema.safeParse(config)
    if (result.success) {
      setErrors({})
      onChange?.(result.data)
    } else {
      const fieldErrors: Record<string, string> = {}
      result.error.errors.forEach(error => {
        const path = error.path.join('.')
        fieldErrors[path] = error.message
      })
      setErrors(fieldErrors)
    }
  }, [config, onChange])

  const handleConfigChange = (updates: Partial<WebhookTriggerData>) => {
    setConfig(prev => ({ ...prev, ...updates }))
  }

  const copyToClipboard = async (text: string, description: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success(`${description} copied to clipboard`)
    } catch (error) {
      toast.error('Failed to copy to clipboard')
    }
  }

  const handleRotateSecret = async () => {
    setIsRotatingSecret(true)
    try {
      const response = await fetch(`/api/automations/webhooks/${workflowId}/${nodeId}/rotate-secret`, {
        method: 'POST'
      })
      
      if (!response.ok) {
        throw new Error('Failed to rotate secret')
      }
      
      const { secretId, last4, revealToken } = await response.json()
      
      handleConfigChange({ 
        secretId, 
        secretLast4: last4 
      })
      
      toast.success('Webhook secret rotated successfully')
      
      // Auto-reveal the new secret briefly
      setSecretRevealed(true)
      setTimeout(() => setSecretRevealed(false), 10000) // Hide after 10 seconds
      
    } catch (error) {
      toast.error('Failed to rotate webhook secret')
    } finally {
      setIsRotatingSecret(false)
    }
  }

  const addIpAddress = () => {
    if (!ipInput.trim()) return
    
    const newIps = [...config.ipAllowlist, ipInput.trim()]
    handleConfigChange({ ipAllowlist: newIps })
    setIpInput('')
  }

  const removeIpAddress = (index: number) => {
    const newIps = config.ipAllowlist.filter((_, i) => i !== index)
    handleConfigChange({ ipAllowlist: newIps })
  }

  const handleContentTypeToggle = (contentType: ContentType) => {
    const newTypes = config.contentTypes.includes(contentType)
      ? config.contentTypes.filter(t => t !== contentType)
      : [...config.contentTypes, contentType]
    
    if (newTypes.length > 0) {
      handleConfigChange({ contentTypes: newTypes })
    }
  }

  const handleDedupeToggle = (enabled: boolean) => {
    setDedupeEnabled(enabled)
    if (enabled) {
      handleConfigChange({
        dedupe: {
          header: 'X-Request-ID',
          windowSeconds: 300
        }
      })
    } else {
      handleConfigChange({ dedupe: undefined })
    }
  }

  const handleTestWebhook = async () => {
    try {
      const testPayload = {
        test: true,
        timestamp: new Date().toISOString(),
        message: 'Test webhook delivery from Atlas Fitness automation builder'
      }

      // This would trigger a test webhook call
      toast.info('Test webhook feature coming soon')
    } catch (error) {
      toast.error('Failed to send test webhook')
    }
  }

  const isValid = Object.keys(errors).length === 0

  const curlExample = `curl -X POST '${config.endpoint}' \\
  -H 'Content-Type: application/json' \\
  -H 'X-Atlas-Signature: sha256=YOUR_SIGNATURE' \\
  -H 'X-Atlas-Timestamp: $(date +%s)' \\
  -d '{
    "event": "user_action",
    "user_id": "12345",
    "data": {
      "action": "signup",
      "email": "user@example.com"
    }
  }'`

  const nodejsExample = `const crypto = require('crypto');
const fetch = require('node-fetch');

const webhookUrl = '${config.endpoint}';
const secret = 'YOUR_WEBHOOK_SECRET';
const payload = {
  event: 'user_action',
  user_id: '12345',
  data: {
    action: 'signup',
    email: 'user@example.com'
  }
};

const timestamp = Math.floor(Date.now() / 1000);
const body = JSON.stringify(payload);
const signature = crypto
  .createHmac('sha256', secret)
  .update(\`\${timestamp}.\${body}\`)
  .digest('hex');

fetch(webhookUrl, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Atlas-Signature': \`sha256=\${signature}\`,
    'X-Atlas-Timestamp': timestamp.toString()
  },
  body: body
})
.then(response => console.log('Status:', response.status))
.catch(error => console.error('Error:', error));`

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Zap className="w-5 h-5 text-orange-500" />
          <span>Webhook Trigger</span>
        </CardTitle>
        <CardDescription>
          Trigger this automation when external systems send HTTP requests to your webhook endpoint
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Basic Configuration */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="webhook-name">Name (Optional)</Label>
            <Input
              id="webhook-name"
              value={config.name || ''}
              onChange={(e) => handleConfigChange({ name: e.target.value })}
              placeholder="e.g., User Signup Webhook"
              data-testid="webhook-name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="webhook-description">Description (Optional)</Label>
            <Input
              id="webhook-description"
              value={config.description || ''}
              onChange={(e) => handleConfigChange({ description: e.target.value })}
              placeholder="Brief description of what this webhook handles"
              data-testid="webhook-description"
            />
          </div>
        </div>

        {/* Webhook Endpoint */}
        <div className="space-y-2">
          <Label>Webhook Endpoint URL</Label>
          <div className="flex space-x-2">
            <Input
              value={config.endpoint}
              readOnly
              className="font-mono text-sm bg-gray-50"
              data-testid="webhook-endpoint"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => copyToClipboard(config.endpoint, 'Webhook endpoint')}
              data-testid="copy-endpoint"
            >
              <Copy className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-xs text-gray-600">
            This is your unique webhook endpoint. External systems should POST to this URL.
          </p>
        </div>

        {/* Secret Management */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="flex items-center space-x-2">
              <Shield className="w-4 h-4" />
              <span>Webhook Secret</span>
            </Label>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRotateSecret}
              disabled={isRotatingSecret}
              data-testid="rotate-secret"
            >
              <RotateCcw className={`w-4 h-4 mr-1 ${isRotatingSecret ? 'animate-spin' : ''}`} />
              Rotate
            </Button>
          </div>
          <div className="space-y-2">
            <div className="flex space-x-2">
              <Input
                value={secretRevealed ? 'wh_secret_abcd1234...' : `****${config.secretLast4}`}
                readOnly
                className="font-mono text-sm bg-gray-50"
                type={secretRevealed ? 'text' : 'password'}
                data-testid="webhook-secret"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSecretRevealed(!secretRevealed)}
                data-testid="toggle-secret-visibility"
              >
                {secretRevealed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard('wh_secret_abcd1234...', 'Webhook secret')}
                disabled={!secretRevealed}
                data-testid="copy-secret"
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-gray-600">
              Use this secret to generate HMAC signatures for request verification.
            </p>
          </div>
        </div>

        {/* Status Controls */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Pause Intake</Label>
              <p className="text-xs text-gray-600">Temporarily pause incoming webhooks</p>
            </div>
            <Switch
              checked={config.paused}
              onCheckedChange={(paused) => handleConfigChange({ paused })}
              data-testid="pause-intake"
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Active</Label>
              <p className="text-xs text-gray-600">Enable this webhook trigger</p>
            </div>
            <Switch
              checked={config.active}
              onCheckedChange={(active) => handleConfigChange({ active })}
              data-testid="webhook-active"
            />
          </div>
        </div>

        {/* Content Types */}
        <div className="space-y-2">
          <Label>Accepted Content Types</Label>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="json-content-type"
                checked={config.contentTypes.includes('application/json')}
                onCheckedChange={() => handleContentTypeToggle('application/json')}
                data-testid="json-content-type"
              />
              <Label htmlFor="json-content-type" className="font-normal">
                application/json
              </Label>
              <span className="text-xs text-gray-500">(Recommended)</span>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="form-content-type"
                checked={config.contentTypes.includes('application/x-www-form-urlencoded')}
                onCheckedChange={() => handleContentTypeToggle('application/x-www-form-urlencoded')}
                data-testid="form-content-type"
              />
              <Label htmlFor="form-content-type" className="font-normal">
                application/x-www-form-urlencoded
              </Label>
            </div>
          </div>
        </div>

        {/* Security Settings */}
        <Collapsible>
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full justify-between" data-testid="security-toggle">
              <span className="flex items-center space-x-2">
                <Shield className="w-4 h-4" />
                <span>Security Settings</span>
              </span>
              <ChevronDown className="w-4 h-4" />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 mt-4">
            {/* IP Allowlist */}
            <div className="space-y-2">
              <Label>IP Allowlist</Label>
              <div className="space-y-2">
                <div className="flex space-x-2">
                  <Input
                    value={ipInput}
                    onChange={(e) => setIpInput(e.target.value)}
                    placeholder="192.168.1.0/24 or 203.0.113.42"
                    data-testid="ip-input"
                  />
                  <Button onClick={addIpAddress} size="sm" data-testid="add-ip">
                    Add
                  </Button>
                </div>
                {config.ipAllowlist.length > 0 && (
                  <div className="space-y-1">
                    {config.ipAllowlist.map((ip, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-50 px-2 py-1 rounded text-sm">
                        <span className="font-mono">{ip}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeIpAddress(index)}
                          data-testid={`remove-ip-${index}`}
                        >
                          ×
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-xs text-gray-600">
                  Only requests from these IP addresses will be accepted. Leave empty to allow all IPs.
                </p>
              </div>
            </div>

            {/* Signature Verification Settings */}
            <div className="space-y-2">
              <Label>Signature Verification</Label>
              <div className="bg-gray-50 p-3 rounded text-sm space-y-1">
                <p><strong>Algorithm:</strong> {config.verify.algorithm}</p>
                <p><strong>Signature Header:</strong> {config.verify.signatureHeader}</p>
                <p><strong>Timestamp Header:</strong> {config.verify.timestampHeader}</p>
                <div className="flex items-center space-x-2">
                  <Label htmlFor="tolerance">Tolerance (seconds):</Label>
                  <Input
                    id="tolerance"
                    type="number"
                    value={config.verify.toleranceSeconds}
                    onChange={(e) => handleConfigChange({
                      verify: { ...config.verify, toleranceSeconds: parseInt(e.target.value) || 300 }
                    })}
                    min={30}
                    max={600}
                    className="w-20"
                    data-testid="signature-tolerance"
                  />
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Deduplication */}
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="dedupe-enabled"
              checked={dedupeEnabled}
              onCheckedChange={handleDedupeToggle}
              data-testid="dedupe-enabled"
            />
            <Label htmlFor="dedupe-enabled" className="font-normal">
              Enable Deduplication
            </Label>
          </div>
          {dedupeEnabled && config.dedupe && (
            <div className="ml-6 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="dedupe-header">Header Name</Label>
                  <Input
                    id="dedupe-header"
                    value={config.dedupe.header || ''}
                    onChange={(e) => handleConfigChange({
                      dedupe: { ...config.dedupe!, header: e.target.value }
                    })}
                    placeholder="X-Request-ID"
                    data-testid="dedupe-header"
                  />
                </div>
                <div>
                  <Label htmlFor="dedupe-window">Window (seconds)</Label>
                  <Input
                    id="dedupe-window"
                    type="number"
                    value={config.dedupe.windowSeconds}
                    onChange={(e) => handleConfigChange({
                      dedupe: { ...config.dedupe!, windowSeconds: parseInt(e.target.value) || 300 }
                    })}
                    min={60}
                    max={3600}
                    data-testid="dedupe-window"
                  />
                </div>
              </div>
              <p className="text-xs text-gray-600">
                Prevent duplicate webhook processing within the specified time window.
              </p>
            </div>
          )}
        </div>

        {/* Sample Code */}
        <Collapsible open={showSampleCode} onOpenChange={setShowSampleCode}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full justify-between" data-testid="sample-code-toggle">
              <span className="flex items-center space-x-2">
                <Code2 className="w-4 h-4" />
                <span>Sample Code</span>
              </span>
              {showSampleCode ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>cURL Example</Label>
              <div className="relative">
                <pre className="bg-gray-900 text-gray-100 p-3 rounded text-xs overflow-x-auto">
                  <code>{curlExample}</code>
                </pre>
                <Button
                  variant="outline"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={() => copyToClipboard(curlExample, 'cURL example')}
                  data-testid="copy-curl"
                >
                  <Copy className="w-3 h-3" />
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Node.js Example</Label>
              <div className="relative">
                <pre className="bg-gray-900 text-gray-100 p-3 rounded text-xs overflow-x-auto">
                  <code>{nodejsExample}</code>
                </pre>
                <Button
                  variant="outline"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={() => copyToClipboard(nodejsExample, 'Node.js example')}
                  data-testid="copy-nodejs"
                >
                  <Copy className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Test Section */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-blue-900">Test Webhook</h4>
              <p className="text-sm text-blue-800">
                Send a test request to verify your webhook configuration
              </p>
            </div>
            <Button
              variant="outline"
              onClick={handleTestWebhook}
              disabled={!isValid}
              data-testid="test-webhook"
            >
              <Play className="w-4 h-4 mr-1" />
              Test
            </Button>
          </div>
        </div>

        {/* Validation Errors */}
        {Object.keys(errors).length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-red-900 mb-2">Configuration Errors</h4>
            <ul className="space-y-1">
              {Object.entries(errors).map(([field, error]) => (
                <li key={field} className="text-sm text-red-800">
                  <strong>{field}:</strong> {error}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Action Buttons */}
        {(onSave || onCancel) && (
          <div className="flex justify-end space-x-3 pt-4 border-t">
            {onCancel && (
              <Button variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
            {onSave && (
              <Button
                onClick={onSave}
                disabled={!isValid}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                data-testid="save-webhook-config"
              >
                Save Configuration
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
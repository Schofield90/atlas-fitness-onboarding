'use client'

import React, { useState } from 'react'
import { toast } from 'react-hot-toast'
import { CheckCircle, XCircle, Settings, Send, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

interface IntegrationCardProps {
  name: string
  status: 'connected' | 'disconnected'
  icon: React.ReactNode
  description?: string
}

export function IntegrationCard({ name, status, icon, description }: IntegrationCardProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [localStatus, setLocalStatus] = useState(status)

  const handleManageConnection = () => {
    // Route to proper integration route
    toast('Redirecting to integration settings...')
    // In a real implementation:
    // router.push(`/integrations/${name.toLowerCase()}`)
  }

  const handleDisconnect = async () => {
    if (window.confirm(`Are you sure you want to disconnect ${name}?`)) {
      setIsLoading(true)
      try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000))
        setLocalStatus('disconnected')
        toast.success(`${name} disconnected successfully`)
      } catch (error) {
        toast.error('Failed to disconnect integration')
      } finally {
        setIsLoading(false)
      }
    }
  }

  const handleConfigureAI = () => {
    // Check if AI configuration is available
    if (name === 'WhatsApp') {
      toast('Coming soon - AI configuration for WhatsApp')
    } else {
      toast('Redirecting to AI configuration...')
      // router.push('/integrations/ai')
    }
  }

  const handleSendTest = () => {
    if (name === 'WhatsApp') {
      // Validate required phone
      const phoneNumber = '+44123456789' // This would come from settings
      if (!phoneNumber) {
        toast.error('Please configure a phone number first')
        return
      }
      toast.success('Test message sent (stub)')
    } else {
      toast.success('Test sent successfully (stub)')
    }
  }

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            {icon}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{name}</h3>
            {description && (
              <p className="text-sm text-gray-600 mt-1">{description}</p>
            )}
            <div className="flex items-center mt-2">
              {localStatus === 'connected' ? (
                <>
                  <CheckCircle className="w-4 h-4 text-green-500 mr-1" />
                  <span className="text-sm text-green-600">Connected</span>
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 text-red-500 mr-1" />
                  <span className="text-sm text-red-600">Disconnected</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {localStatus === 'connected' ? (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={handleManageConnection}
              data-testid={`manage-connection-${name.toLowerCase()}`}
              title="Manage connection settings"
              aria-label={`Manage ${name} connection`}
            >
              <Settings className="w-4 h-4 mr-1" />
              Manage Connection
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleDisconnect}
              disabled={isLoading}
              data-testid={`disconnect-${name.toLowerCase()}`}
              title={`Disconnect ${name}`}
              aria-label={`Disconnect ${name}`}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <XCircle className="w-4 h-4 mr-1" />
              )}
              Disconnect
            </Button>
            
            {name === 'WhatsApp' && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleConfigureAI}
                  data-testid="configure-ai-whatsapp"
                  title="Configure AI settings"
                  aria-label="Configure AI for WhatsApp"
                >
                  <Settings className="w-4 h-4 mr-1" />
                  Configure AI
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSendTest}
                  data-testid="send-test-whatsapp"
                  title="Send test message"
                  aria-label="Send test WhatsApp message"
                >
                  <Send className="w-4 h-4 mr-1" />
                  Send Test
                </Button>
              </>
            )}
            
            {name !== 'WhatsApp' && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleConfigureAI}
                data-testid={`configure-ai-${name.toLowerCase()}`}
                title="Configure AI settings"
                aria-label={`Configure AI for ${name}`}
              >
                <Settings className="w-4 h-4 mr-1" />
                Configure AI
              </Button>
            )}
          </>
        ) : (
          <Button
            variant="default"
            size="sm"
            onClick={handleManageConnection}
            data-testid={`connect-${name.toLowerCase()}`}
            title={`Connect ${name}`}
            aria-label={`Connect to ${name}`}
          >
            Connect {name}
          </Button>
        )}
      </div>
    </Card>
  )
}

// Sample integrations for demonstration
export function IntegrationCardsDemo() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <IntegrationCard
        name="WhatsApp"
        status="connected"
        icon={<div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center text-white font-bold">W</div>}
        description="Send automated messages and handle customer inquiries"
      />
      <IntegrationCard
        name="Facebook"
        status="connected"
        icon={<div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center text-white font-bold">f</div>}
        description="Sync leads from Facebook advertising campaigns"
      />
      <IntegrationCard
        name="Google Calendar"
        status="disconnected"
        icon={<div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center text-white font-bold">G</div>}
        description="Sync appointments and booking availability"
      />
    </div>
  )
}
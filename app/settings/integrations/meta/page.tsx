'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/app/lib/supabase/client'
import DashboardLayout from '@/app/components/DashboardLayout'
import { 
  MessageCircle, 
  Link as LinkIcon, 
  Trash2, 
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle,
  Plus
} from 'lucide-react'
import { formatBritishDateTime } from '@/app/lib/utils/british-format'

interface IntegrationAccount {
  id: string
  page_id: string
  page_name: string
  status: 'active' | 'error' | 'revoked'
  connected_at: string
  error_message?: string
  metadata?: any
}

export default function MetaIntegrationSettings() {
  const [integrations, setIntegrations] = useState<IntegrationAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    loadIntegrations()
  }, [])

  const loadIntegrations = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: member } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .single()

    if (member) {
      const { data } = await supabase
        .from('integration_accounts')
        .select('*')
        .eq('organization_id', member.organization_id)
        .eq('provider', 'facebook')
        .order('created_at', { ascending: false })

      if (data) {
        setIntegrations(data)
      }
    }
    setLoading(false)
  }

  const connectPage = () => {
    setConnecting(true)
    window.location.href = '/api/integrations/meta/connect'
  }

  const disconnectPage = async (integrationId: string, pageId: string) => {
    if (!confirm('Are you sure you want to disconnect this Facebook Page? You will stop receiving messages.')) {
      return
    }

    try {
      // Call disconnect API
      const response = await fetch('/api/integrations/meta/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ integrationId })
      })

      if (!response.ok) {
        throw new Error('Failed to disconnect')
      }

      // Reload integrations
      await loadIntegrations()
      alert('Page disconnected successfully')
    } catch (error) {
      console.error('Disconnect error:', error)
      alert('Failed to disconnect page')
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <span className="flex items-center gap-1 text-green-600">
            <CheckCircle className="w-4 h-4" />
            Active
          </span>
        )
      case 'error':
        return (
          <span className="flex items-center gap-1 text-red-600">
            <XCircle className="w-4 h-4" />
            Error
          </span>
        )
      case 'revoked':
        return (
          <span className="flex items-center gap-1 text-gray-600">
            <AlertCircle className="w-4 h-4" />
            Revoked
          </span>
        )
      default:
        return status
    }
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow">
          {/* Header */}
          <div className="p-6 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-br from-blue-400 via-blue-500 to-purple-600 rounded-lg p-2">
                  <MessageCircle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    Facebook Messenger Integration
                  </h2>
                  <p className="text-sm text-gray-500">
                    Connect Facebook Pages to receive and reply to messages
                  </p>
                </div>
              </div>
              <button
                onClick={connectPage}
                disabled={connecting}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
              >
                <Plus className="w-4 h-4" />
                {connecting ? 'Connecting...' : 'Connect Page'}
              </button>
            </div>
          </div>

          {/* Connected Pages */}
          <div className="p-6">
            {loading ? (
              <div className="text-center py-8 text-gray-500">
                Loading...
              </div>
            ) : integrations.length === 0 ? (
              <div className="text-center py-12">
                <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No Pages Connected
                </h3>
                <p className="text-gray-500 mb-6 max-w-md mx-auto">
                  Connect a Facebook Page to start receiving Messenger conversations in your chat interface.
                </p>
                <button
                  onClick={connectPage}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <LinkIcon className="w-4 h-4" />
                  Connect Your First Page
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {integrations.map((integration) => (
                  <div
                    key={integration.id}
                    className="border rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-medium text-gray-900">
                            {integration.page_name}
                          </h3>
                          {getStatusBadge(integration.status)}
                        </div>
                        <div className="text-sm text-gray-500 space-y-1">
                          <p>Page ID: {integration.page_id}</p>
                          <p>Connected: {formatBritishDateTime(new Date(integration.connected_at))}</p>
                          {integration.metadata?.category && (
                            <p>Category: {integration.metadata.category}</p>
                          )}
                        </div>
                        {integration.error_message && (
                          <div className="mt-2 p-2 bg-red-50 rounded text-sm text-red-700">
                            {integration.error_message}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {integration.status === 'error' && (
                          <button
                            onClick={connectPage}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                            title="Reconnect"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => disconnectPage(integration.id, integration.page_id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                          title="Disconnect"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Instructions */}
          <div className="p-6 bg-gray-50 border-t">
            <h3 className="font-medium text-gray-900 mb-3">Setup Instructions</h3>
            <ol className="text-sm text-gray-600 space-y-2">
              <li>1. Click "Connect Page" to authorize with Facebook</li>
              <li>2. Select the Facebook Page you want to connect</li>
              <li>3. Grant the required permissions for messaging</li>
              <li>4. Start receiving Messenger conversations in your chat interface</li>
            </ol>
            <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> You can only send messages within 24 hours of receiving a message from the customer (Facebook's policy).
              </p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
'use client'

import { useEffect, useState } from 'react'

export default function WebhookHealthPage() {
  const [health, setHealth] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/saas-admin/webhooks/health')
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to load health')
        setHealth(data)
      } catch (e: any) {
        setError(e.message || 'Failed to load')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-gray-400">Loading webhook health...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <p className="text-red-300">{error}</p>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Webhook Health</h1>
      <div className="bg-gray-800 border border-gray-700 rounded p-4 space-y-2">
        <div className="text-sm text-gray-300">
          <div>
            <span className="text-gray-400">Callback URL:</span>{' '}
            <code className="bg-gray-900 px-2 py-1 rounded">{health?.callbackUrl}</code>
          </div>
          <div>
            <span className="text-gray-400">Last Event:</span>{' '}
            {health?.lastEventAt ? new Date(health.lastEventAt).toLocaleString() : 'Never'}
          </div>
          <div>
            <span className="text-gray-400">Last Status:</span>{' '}
            {health?.lastStatus || 'n/a'}
          </div>
        </div>
      </div>
      <div className="bg-gray-800 border border-gray-700 rounded p-4">
        <h2 className="font-medium mb-3">Recent Events</h2>
        <div className="space-y-2 text-sm">
          {(health?.recent || []).map((e: any, idx: number) => (
            <div key={idx} className="flex justify-between border-b border-gray-700 pb-1">
              <span className="text-gray-300">{e.processing_status}</span>
              <span className="text-gray-500">{new Date(e.created_at).toLocaleString()}</span>
            </div>
          ))}
          {(!health?.recent || health.recent.length === 0) && (
            <p className="text-gray-500">No recent events</p>
          )}
        </div>
      </div>
    </div>
  )
}


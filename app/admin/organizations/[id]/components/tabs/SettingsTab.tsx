'use client'

import { useEffect, useState } from 'react'

interface SettingsTabProps {
  organizationId: string
}

export default function SettingsTab({ organizationId }: SettingsTabProps) {
  const [settings, setSettings] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSettings()
  }, [organizationId])

  const fetchSettings = async () => {
    try {
      const res = await fetch(`/api/admin/organizations/${organizationId}/settings`)
      if (res.ok) {
        const data = await res.json()
        setSettings(data.settings)
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="animate-pulse space-y-4">
      <div className="h-40 bg-gray-200 rounded"></div>
    </div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Organization Settings</h3>
        
        <div className="border rounded-lg p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Organization Name
            </label>
            <input
              type="text"
              value={settings?.name || ''}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              readOnly
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Slug
            </label>
            <input
              type="text"
              value={settings?.slug || ''}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              readOnly
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Settings JSON
            </label>
            <pre className="bg-gray-50 p-3 rounded text-xs overflow-auto max-h-60">
              {JSON.stringify(settings?.settings || {}, null, 2)}
            </pre>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Metadata
            </label>
            <pre className="bg-gray-50 p-3 rounded text-xs overflow-auto max-h-60">
              {JSON.stringify(settings?.metadata || {}, null, 2)}
            </pre>
          </div>
        </div>
      </div>

      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-red-900 mb-2">Danger Zone</h4>
        <p className="text-sm text-red-700 mb-3">
          These actions are irreversible. Please be certain.
        </p>
        <div className="flex gap-3">
          <button className="px-3 py-1 text-sm text-red-600 border border-red-600 rounded hover:bg-red-50">
            Suspend Organization
          </button>
          <button className="px-3 py-1 text-sm text-red-600 border border-red-600 rounded hover:bg-red-50">
            Delete Organization
          </button>
        </div>
      </div>
    </div>
  )
}
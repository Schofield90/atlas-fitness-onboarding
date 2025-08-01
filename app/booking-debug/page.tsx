'use client'

import { useState } from 'react'
import DashboardLayout from '@/app/components/DashboardLayout'
import { getCurrentUserOrganization } from '@/app/lib/organization-service'

export default function BookingDebugPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [organizationId, setOrganizationId] = useState<string | null>(null)

  const checkOrganization = async () => {
    const { organizationId: orgId, error } = await getCurrentUserOrganization()
    if (orgId) {
      setOrganizationId(orgId)
      setResult({ organizationId: orgId })
    } else {
      setResult({ error })
    }
  }

  const seedClasses = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/booking/seed-classes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()
      setResult(data)
    } catch (error: any) {
      setResult({ error: error.message })
    } finally {
      setLoading(false)
    }
  }

  const fetchClasses = async () => {
    if (!organizationId) {
      await checkOrganization()
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/booking/classes?organizationId=${organizationId}`)
      const data = await response.json()
      setResult(data)
    } catch (error: any) {
      setResult({ error: error.message })
    } finally {
      setLoading(false)
    }
  }

  const clearClasses = async () => {
    if (!organizationId) {
      setResult({ error: 'No organization ID' })
      return
    }

    setLoading(true)
    try {
      // This would need an endpoint to clear classes
      setResult({ message: 'Clear endpoint not implemented yet' })
    } catch (error: any) {
      setResult({ error: error.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-white mb-6">Booking System Debug</h1>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <button
              onClick={checkOrganization}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg"
            >
              Check Organization
            </button>
            
            <button
              onClick={seedClasses}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-4 py-3 rounded-lg"
            >
              {loading ? 'Seeding...' : 'Seed Classes'}
            </button>
            
            <button
              onClick={fetchClasses}
              disabled={loading}
              className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white px-4 py-3 rounded-lg"
            >
              {loading ? 'Fetching...' : 'Fetch Classes'}
            </button>
            
            <button
              onClick={clearClasses}
              disabled={loading}
              className="bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white px-4 py-3 rounded-lg"
            >
              {loading ? 'Clearing...' : 'Clear Classes'}
            </button>
          </div>

          {organizationId && (
            <div className="bg-gray-800 rounded-lg p-4 mb-6">
              <p className="text-gray-400">Organization ID: <span className="text-white font-mono">{organizationId}</span></p>
            </div>
          )}

          {result && (
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Result:</h2>
              <pre className="text-gray-300 whitespace-pre-wrap overflow-x-auto text-sm">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}

          <div className="mt-8 bg-gray-800 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Instructions:</h2>
            <ol className="list-decimal list-inside space-y-2 text-gray-300">
              <li>Click "Check Organization" to verify your organization ID</li>
              <li>Click "Seed Classes" to create sample programs and class sessions</li>
              <li>Click "Fetch Classes" to see what classes exist</li>
              <li>Go to the <a href="/booking" className="text-blue-400 hover:text-blue-300">Booking page</a> to see the calendar view</li>
            </ol>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
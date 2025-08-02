'use client'

import { useState } from 'react'
import { CheckCircle, Loader2, AlertCircle } from 'lucide-react'

export default function SeedDataPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')

  const seedBookingData = async () => {
    setLoading(true)
    setError('')
    setResult(null)

    try {
      const response = await fetch('/api/seed/booking-data', {
        method: 'POST'
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to seed data')
      }

      setResult(data.summary)
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        <div className="bg-white shadow rounded-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Seed Sample Data</h1>
          
          <div className="space-y-4">
            <div className="border rounded-lg p-4">
              <h2 className="font-semibold mb-2">Booking System Data</h2>
              <p className="text-sm text-gray-600 mb-4">
                This will create:
              </p>
              <ul className="text-sm text-gray-600 space-y-1 mb-4">
                <li>• 3 Programs (Group Fitness, Personal Training, Specialty)</li>
                <li>• 6 Class Types (Yoga, HIIT, Spin, etc.)</li>
                <li>• 4 Instructors</li>
                <li>• 2 weeks of class sessions</li>
                <li>• Sample bookings for Sam Schofield</li>
              </ul>
              
              <button
                onClick={seedBookingData}
                disabled={loading}
                className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin h-4 w-4 mr-2" />
                    Creating...
                  </>
                ) : (
                  'Create Booking Data'
                )}
              </button>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start">
                <AlertCircle className="h-5 w-5 text-red-400 mr-2 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-red-800 font-medium">Error</p>
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              </div>
            )}

            {result && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-400 mr-2 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-green-800 font-medium">Success!</p>
                    <p className="text-sm text-green-600 mt-1">{result.message}</p>
                    <ul className="text-sm text-green-600 mt-2 space-y-1">
                      <li>• {result.programs} programs created</li>
                      <li>• {result.classTypes} class types created</li>
                      <li>• {result.instructors} instructors created</li>
                      <li>• {result.sessions} class sessions created</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 pt-6 border-t">
            <h3 className="text-sm font-medium text-gray-900 mb-2">Next Steps</h3>
            <ul className="text-sm text-gray-600 space-y-2">
              <li>
                <a href="/booking" className="text-blue-600 hover:text-blue-800">
                  → View Booking Calendar
                </a>
              </li>
              <li>
                <a href="/client/booking" className="text-blue-600 hover:text-blue-800">
                  → Test Client Booking
                </a>
              </li>
              <li>
                <a href="/test-client" className="text-blue-600 hover:text-blue-800">
                  → View Test Client Portal
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
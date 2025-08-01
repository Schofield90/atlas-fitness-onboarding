'use client'

import { useState } from 'react'
import DashboardLayout from '../components/DashboardLayout'

export default function CleanClassesPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  const checkClasses = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/debug/check-classes')
      const data = await response.json()
      setResult(data)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const deleteAllClasses = async () => {
    if (!confirm('Are you sure you want to delete ALL classes? This cannot be undone.')) return
    
    setLoading(true)
    try {
      const response = await fetch('/api/debug/force-clean-classes', {
        method: 'DELETE'
      })
      const data = await response.json()
      setResult(data)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold mb-6">Clean Up Classes</h1>
          
          <div className="bg-gray-800 rounded-lg p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Check Current Classes</h2>
            <button
              onClick={checkClasses}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 px-6 py-2 rounded-lg transition-colors"
            >
              {loading ? 'Checking...' : 'Check Classes'}
            </button>
          </div>

          <div className="bg-red-900/20 border border-red-700 rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4 text-red-400">Delete All Classes</h2>
            <p className="text-sm text-gray-400 mb-4">
              This will delete ALL classes for your organization. This action cannot be undone.
            </p>
            <button
              onClick={deleteAllClasses}
              disabled={loading}
              className="bg-red-600 hover:bg-red-700 disabled:bg-gray-600 px-6 py-2 rounded-lg transition-colors"
            >
              {loading ? 'Deleting...' : 'Delete All Classes'}
            </button>
          </div>

          {result && (
            <div className="mt-6 bg-gray-800 rounded-lg p-6">
              <h3 className="font-semibold mb-2">Result:</h3>
              <pre className="text-sm bg-gray-900 p-4 rounded overflow-x-auto">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
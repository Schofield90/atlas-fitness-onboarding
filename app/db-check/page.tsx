'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function DatabaseCheckPage() {
  const [results, setResults] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    checkDatabase()
  }, [])

  const checkDatabase = async () => {
    try {
      // Get user
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        setResults({ error: 'Not authenticated' })
        setLoading(false)
        return
      }

      // Get organization
      const { data: userOrg } = await supabase
        .from('user_organizations')
        .select('organization_id')
        .eq('user_id', user.id)
        .single()

      if (!userOrg) {
        setResults({ error: 'No organization found' })
        setLoading(false)
        return
      }

      // Count classes multiple ways
      const orgId = userOrg.organization_id

      // Method 1: Direct count
      const { count: directCount, error: countError } = await supabase
        .from('class_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', orgId)

      // Method 2: Get all IDs
      const { data: classIds, error: idsError } = await supabase
        .from('class_sessions')
        .select('id')
        .eq('organization_id', orgId)

      // Method 3: Get sample classes
      const { data: sampleClasses, error: sampleError } = await supabase
        .from('class_sessions')
        .select('id, name, start_time, instructor_name')
        .eq('organization_id', orgId)
        .limit(5)
        .order('created_at', { ascending: false })

      // Method 4: Check all organizations
      const { data: allOrgClasses, error: allError } = await supabase
        .from('class_sessions')
        .select('organization_id', { count: 'exact' })
        .order('organization_id')

      setResults({
        user: user.email,
        organizationId: orgId,
        directCount: directCount || 0,
        idCount: classIds?.length || 0,
        sampleClasses: sampleClasses || [],
        totalInDatabase: allOrgClasses?.length || 0,
        errors: {
          count: countError?.message,
          ids: idsError?.message,
          sample: sampleError?.message,
          all: allError?.message
        }
      })
    } catch (error) {
      setResults({ error: error instanceof Error ? error.message : 'Unknown error' })
    } finally {
      setLoading(false)
    }
  }

  const deleteAllClasses = async () => {
    if (!results?.organizationId) return
    
    if (!confirm(`This will delete ALL classes for organization ${results.organizationId}. Are you sure?`)) return

    setLoading(true)
    try {
      const { error } = await supabase
        .from('class_sessions')
        .delete()
        .eq('organization_id', results.organizationId)

      if (error) throw error

      alert('All classes deleted successfully!')
      checkDatabase() // Refresh
    } catch (error) {
      alert('Error deleting classes: ' + (error instanceof Error ? error.message : 'Unknown error'))
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Database Check</h1>
        
        <div className="bg-white rounded-lg shadow p-6 space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-4">Results:</h2>
            <pre className="bg-gray-100 p-4 rounded overflow-auto text-sm">
              {JSON.stringify(results, null, 2)}
            </pre>
          </div>

          {results?.directCount > 0 && (
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold mb-4 text-red-600">
                Found {results.directCount} classes in database
              </h3>
              <button
                onClick={deleteAllClasses}
                className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-medium"
              >
                Delete All {results.directCount} Classes
              </button>
            </div>
          )}

          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold mb-2">What this shows:</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
              <li>directCount: Number of classes using COUNT query</li>
              <li>idCount: Number of classes by counting returned IDs</li>
              <li>sampleClasses: Latest 5 classes (if any)</li>
              <li>totalInDatabase: Total classes across ALL organizations</li>
            </ul>
          </div>

          <div className="border-t pt-6">
            <button
              onClick={() => checkDatabase()}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium mr-4"
            >
              Refresh
            </button>
            <button
              onClick={() => window.location.href = '/classes-debug'}
              className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-medium"
            >
              Go to Classes Debug
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
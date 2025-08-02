'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/app/lib/supabase/client'
import { Calendar, Clock, Users, MapPin, Plus, Edit, Trash2 } from 'lucide-react'
import DashboardLayout from '../components/DashboardLayout'
import AddClassModal from '../classes/AddClassModal'

interface ClassSession {
  id: string
  name: string
  instructor_name: string
  start_time: string
  duration_minutes: number
  capacity: number
  price: number
  location: string
  description?: string
  recurring: boolean
  day_of_week?: number
  bookings_count: number
}

export default function ClassesDebugPage() {
  const [classes, setClasses] = useState<ClassSession[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [organizationId, setOrganizationId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    checkAuthAndLoadClasses()
  }, [])

  const checkAuthAndLoadClasses = async () => {
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        setError('Not authenticated. Please log in.')
        setLoading(false)
        return
      }

      // Get user's organization directly
      const { data: userOrg, error: orgError } = await supabase
        .from('user_organizations')
        .select('organization_id')
        .eq('user_id', user.id)
        .single()

      if (orgError || !userOrg) {
        setError('No organization found. Please create one.')
        setLoading(false)
        return
      }

      setOrganizationId(userOrg.organization_id)
      await loadClasses(userOrg.organization_id)
    } catch (err) {
      console.error('Error:', err)
      setError('Failed to load data')
      setLoading(false)
    }
  }

  const loadClasses = async (orgId: string) => {
    try {
      const { data, error } = await supabase
        .from('class_sessions')
        .select('*')
        .eq('organization_id', orgId)
        .order('start_time', { ascending: true })

      if (error) throw error

      setClasses(data || [])
    } catch (error) {
      console.error('Error loading classes:', error)
      setError('Failed to load classes')
    } finally {
      setLoading(false)
    }
  }

  const forceRefresh = async () => {
    setLoading(true)
    setClasses([]) // Clear current state
    if (organizationId) {
      await loadClasses(organizationId)
    }
  }

  const deleteClass = async (classId: string) => {
    if (!confirm('Are you sure you want to delete this class?')) return

    try {
      const { error } = await supabase
        .from('class_sessions')
        .delete()
        .eq('id', classId)

      if (error) throw error
      if (organizationId) {
        await loadClasses(organizationId)
      }
    } catch (error) {
      console.error('Error deleting class:', error)
      alert('Failed to delete class')
    }
  }

  const deleteAllClasses = async () => {
    if (!organizationId) return
    if (!confirm('Are you sure you want to delete ALL classes? This cannot be undone!')) return

    try {
      const { error } = await supabase
        .from('class_sessions')
        .delete()
        .eq('organization_id', organizationId)

      if (error) throw error
      setClasses([])
      alert('All classes deleted successfully')
    } catch (error) {
      console.error('Error deleting all classes:', error)
      alert('Failed to delete classes')
    }
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    })
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-900 p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">Classes (Debug)</h1>
              <p className="text-gray-400">Direct database access - bypassing organization context</p>
              {organizationId && (
                <p className="text-sm text-gray-500 mt-1">Organization ID: {organizationId}</p>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={forceRefresh}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg flex items-center gap-2 transition-colors"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Refreshing...
                  </>
                ) : (
                  <>
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Force Refresh
                  </>
                )}
              </button>
              {classes.length > 0 && (
                <button
                  onClick={deleteAllClasses}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-lg flex items-center gap-2 transition-colors"
                >
                  <Trash2 className="h-5 w-5" />
                  Delete All ({classes.length})
                </button>
              )}
              <button
                onClick={() => setShowAddModal(true)}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 transition-colors"
                disabled={!organizationId}
              >
                <Plus className="h-5 w-5" />
                Add New Class
              </button>
            </div>
          </div>

          {/* Error display */}
          {error && (
            <div className="bg-red-900/50 border border-red-600 text-red-300 p-4 rounded-lg mb-6">
              {error}
            </div>
          )}

          {/* Loading state */}
          {loading && (
            <div className="text-white text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
              Loading classes...
            </div>
          )}

          {/* Stats */}
          {!loading && !error && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-gray-800 rounded-lg p-6">
                  <h3 className="text-gray-400 text-sm mb-2">Total Classes</h3>
                  <p className="text-3xl font-bold text-white">{classes.length}</p>
                </div>
                <div className="bg-gray-800 rounded-lg p-6">
                  <h3 className="text-gray-400 text-sm mb-2">Database Status</h3>
                  <p className="text-sm text-green-400">Connected</p>
                </div>
                <div className="bg-gray-800 rounded-lg p-6">
                  <h3 className="text-gray-400 text-sm mb-2">Cache Status</h3>
                  <p className="text-sm text-yellow-400">Fresh Data</p>
                </div>
                <div className="bg-gray-800 rounded-lg p-6">
                  <h3 className="text-gray-400 text-sm mb-2">Actions</h3>
                  <p className="text-sm text-gray-400">Add / Edit / Delete</p>
                </div>
              </div>

              {/* Classes List */}
              {classes.length === 0 ? (
                <div className="bg-gray-800 rounded-lg p-12 text-center">
                  <p className="text-gray-400 mb-4">No classes found</p>
                  <p className="text-sm text-gray-500">Database is empty - click "Add New Class" to create one</p>
                </div>
              ) : (
                <div className="bg-gray-800 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-700">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          Class
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          Instructor
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          Time
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          Capacity
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          Location
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {classes.map((classSession) => (
                        <tr key={classSession.id} className="hover:bg-gray-700/50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-white">{classSession.name}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-300">{classSession.instructor_name}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-300">
                              {formatDate(classSession.start_time)} {formatTime(classSession.start_time)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-300">
                              {classSession.bookings_count || 0}/{classSession.capacity}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-300">{classSession.location}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={() => deleteClass(classSession.id)}
                              className="text-red-400 hover:text-red-300 ml-4"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {/* Add Class Modal */}
          {showAddModal && organizationId && (
            <AddClassModal
              onClose={() => setShowAddModal(false)}
              onClassAdded={() => {
                setShowAddModal(false)
                if (organizationId) loadClasses(organizationId)
              }}
              organizationId={organizationId}
            />
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
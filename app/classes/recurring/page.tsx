'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Calendar, Clock, Users, MapPin, Plus, Edit, Trash2, Activity, Repeat } from 'lucide-react'
import DashboardLayout from '../../components/DashboardLayout'
import { RequireOrganization } from '../../components/auth/RequireOrganization'
import { useOrganization } from '../../hooks/useOrganization'

interface RecurringClass {
  id: string
  name: string
  description?: string
  program_id: string
  program_name: string
  start_time: string
  end_time: string
  max_capacity: number
  current_bookings: number
  location?: string
  is_recurring: boolean
  recurrence_pattern?: string
  next_occurrence?: string
  total_instances?: number
}

function RecurringClassesPageContent() {
  const { organizationId } = useOrganization()
  const router = useRouter()
  const [recurringClasses, setRecurringClasses] = useState<RecurringClass[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    if (organizationId) {
      loadRecurringClasses()
    }
  }, [organizationId])

  const loadRecurringClasses = async () => {
    if (!organizationId) return

    try {
      setError(null)
      
      // Get all recurring class sessions for this organization
      const { data, error } = await supabase
        .from('class_sessions')
        .select(`
          id,
          name,
          description,
          program_id,
          start_time,
          end_time,
          max_capacity,
          current_bookings,
          location,
          is_recurring,
          recurrence_pattern,
          programs!inner (
            name,
            is_active
          )
        `)
        .eq('organization_id', organizationId)
        .eq('is_recurring', true)
        .eq('programs.is_active', true)
        .order('start_time', { ascending: true })

      if (error) throw error

      // Transform the data
      const transformedData = data?.map(session => ({
        ...session,
        program_name: session.programs?.name || 'Unknown Program',
        next_occurrence: session.start_time,
        total_instances: 1 // This would need to be calculated based on recurrence pattern
      })) || []

      setRecurringClasses(transformedData)
    } catch (error: any) {
      console.error('Error loading recurring classes:', error)
      setError('Failed to load recurring classes. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteRecurring = async (classId: string) => {
    if (!confirm('Are you sure you want to delete this recurring class series? This will delete all future instances.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('class_sessions')
        .delete()
        .eq('id', classId)
        .eq('organization_id', organizationId)

      if (error) throw error

      setRecurringClasses(prev => prev.filter(cls => cls.id !== classId))
    } catch (error: any) {
      console.error('Error deleting recurring class:', error)
      setError('Failed to delete recurring class: ' + error.message)
    }
  }

  const formatRecurrencePattern = (pattern: string) => {
    if (!pattern) return 'Unknown'
    
    // Basic pattern parsing - this would need to be more sophisticated for real RRULE parsing
    if (pattern.includes('WEEKLY')) return 'Weekly'
    if (pattern.includes('DAILY')) return 'Daily'
    if (pattern.includes('MONTHLY')) return 'Monthly'
    return 'Custom'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading recurring classes...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="p-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Recurring Classes</h1>
            <p className="text-gray-400 mt-2">Manage your recurring class schedules and patterns</p>
          </div>
          <div className="flex gap-4">
            <button
              onClick={() => router.push('/class-types')}
              className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-800 border border-gray-700 rounded-lg hover:bg-gray-700 transition-colors"
            >
              Manage Class Types
            </button>
            <button
              onClick={() => router.push('/classes')}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Create Classes
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-700 rounded-lg">
            <div className="flex items-center gap-2 text-red-400">
              <Activity className="h-5 w-5" />
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-gray-400 text-sm mb-2">Total Recurring Series</h3>
            <p className="text-3xl font-bold text-white">{recurringClasses.length}</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-gray-400 text-sm mb-2">Weekly Classes</h3>
            <p className="text-3xl font-bold text-white">
              {recurringClasses.filter(cls => cls.recurrence_pattern?.includes('WEEKLY')).length}
            </p>
          </div>
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-gray-400 text-sm mb-2">Total Capacity</h3>
            <p className="text-3xl font-bold text-white">
              {recurringClasses.reduce((sum, cls) => sum + cls.max_capacity, 0)}
            </p>
          </div>
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-gray-400 text-sm mb-2">Average Occupancy</h3>
            <p className="text-3xl font-bold text-white">
              {recurringClasses.length > 0 
                ? Math.round((recurringClasses.reduce((sum, cls) => sum + cls.current_bookings, 0) / 
                    recurringClasses.reduce((sum, cls) => sum + cls.max_capacity, 0)) * 100)
                : 0}%
            </p>
          </div>
        </div>

        {/* Recurring Classes List */}
        {recurringClasses.length === 0 ? (
          <div className="text-center py-12 bg-gray-800 rounded-lg shadow">
            <Repeat className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No Recurring Classes</h3>
            <p className="text-gray-400 mb-6">
              Set up recurring class schedules to automate your class management.
            </p>
            <div className="space-y-3">
              <p className="text-sm text-gray-500">
                To create recurring classes:
              </p>
              <ol className="text-sm text-gray-400 space-y-1 max-w-md mx-auto">
                <li>1. Create or edit a class type</li>
                <li>2. Add a class session</li>
                <li>3. Use the "Create Recurring" option</li>
              </ol>
            </div>
            <div className="flex gap-3 justify-center mt-6">
              <button
                onClick={() => router.push('/class-types')}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
              >
                Manage Class Types
              </button>
              <button
                onClick={() => router.push('/classes')}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700"
              >
                Create Classes
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-gray-800 rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-700">
              <thead className="bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Class
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Schedule
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Pattern
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Capacity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Next Class
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-gray-800 divide-y divide-gray-700">
                {recurringClasses.map((recurringClass) => (
                  <tr key={recurringClass.id} className="hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-white flex items-center gap-2">
                          <Repeat className="h-4 w-4 text-orange-400" />
                          {recurringClass.name || recurringClass.program_name}
                        </div>
                        <div className="text-sm text-gray-400">
                          {recurringClass.program_name}
                        </div>
                        {recurringClass.location && (
                          <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                            <MapPin className="h-3 w-3" />
                            {recurringClass.location}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-300">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(recurringClass.start_time).toLocaleTimeString('en-GB', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Duration: {Math.round((new Date(recurringClass.end_time).getTime() - new Date(recurringClass.start_time).getTime()) / (1000 * 60))} min
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-900 text-green-300">
                        {formatRecurrencePattern(recurringClass.recurrence_pattern || '')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1 text-sm text-gray-300">
                        <Users className="h-3 w-3" />
                        {recurringClass.current_bookings}/{recurringClass.max_capacity}
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-1 mt-1">
                        <div 
                          className="bg-orange-600 h-1 rounded-full" 
                          style={{ 
                            width: `${(recurringClass.current_bookings / recurringClass.max_capacity) * 100}%` 
                          }}
                        ></div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(recurringClass.next_occurrence || recurringClass.start_time).toLocaleDateString('en-GB')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button 
                        onClick={() => router.push(`/classes/${recurringClass.program_id}`)}
                        className="text-blue-400 hover:text-blue-300 mr-4"
                        title="Edit class type"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => handleDeleteRecurring(recurringClass.id)}
                        className="text-red-400 hover:text-red-300"
                        title="Delete recurring series"
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
      </div>
    </div>
  )
}

export default function RecurringClassesPage() {
  return (
    <DashboardLayout>
      <RequireOrganization>
        <RecurringClassesPageContent />
      </RequireOrganization>
    </DashboardLayout>
  )
}
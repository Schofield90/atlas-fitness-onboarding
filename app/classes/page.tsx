'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/app/lib/supabase/client'
import { Calendar, Clock, Users, MapPin, DollarSign, Plus, Edit, Trash2, AlertTriangle, Activity } from 'lucide-react'
import DashboardLayout from '../components/DashboardLayout'
import AddClassTypeModal from './AddClassTypeModal'
import { RequireOrganization } from '../components/auth/RequireOrganization'
import { useOrganization } from '../hooks/useOrganization'
import { useRouter } from 'next/navigation'

interface ClassType {
  id: string
  name: string
  description?: string
  price_pennies: number
  is_active: boolean
  metadata?: {
    category?: string
    visibility?: string
    registrationSetting?: string
    defaultOccupancy?: string
  }
  sessions_count?: number
}

function ClassesPageContent() {
  const { organizationId } = useOrganization()
  const router = useRouter()
  const [classTypes, setClassTypes] = useState<ClassType[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false)
  const [deletingAll, setDeletingAll] = useState(false)
  const [lastRefresh, setLastRefresh] = useState(Date.now())
  const supabase = createClient()

  useEffect(() => {
    loadClassTypes()
  }, [organizationId, lastRefresh])

  const forceRefresh = () => {
    setLastRefresh(Date.now())
    setClassTypes([]) // Clear current state
    setLoading(true)
  }

  const loadClassTypes = async () => {
    if (!organizationId) return;
    
    try {
      // Get all programs (class types) for this organization
      const { data, error } = await supabase
        .from('programs')
        .select(`
          *,
          class_sessions(count)
        `)
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Transform the data to include session count
      const transformedData = data?.map(program => ({
        ...program,
        sessions_count: program.class_sessions?.[0]?.count || 0
      })) || []

      setClassTypes(transformedData)
    } catch (error: any) {
      console.error('Error loading class types:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteClassType = async (id: string) => {
    if (!confirm('Are you sure you want to delete this class type? This will also delete all associated class sessions.')) return

    try {
      // First delete all class sessions for this program
      await supabase
        .from('class_sessions')
        .delete()
        .eq('program_id', id)

      // Then delete the program
      const { error } = await supabase
        .from('programs')
        .delete()
        .eq('id', id)

      if (error) throw error

      forceRefresh()
    } catch (error: any) {
      console.error('Error deleting class type:', error)
      alert('Failed to delete class type: ' + error.message)
    }
  }

  const handleDeleteAll = async () => {
    if (!organizationId) return;
    
    setDeletingAll(true)
    try {
      // Delete all class sessions first
      await supabase
        .from('class_sessions')
        .delete()
        .eq('organization_id', organizationId)

      // Delete all programs
      const { error } = await supabase
        .from('programs')
        .delete()
        .eq('organization_id', organizationId)

      if (error) throw error

      setShowDeleteAllModal(false)
      forceRefresh()
    } catch (error: any) {
      console.error('Error deleting all:', error)
      alert('Failed to delete all: ' + error.message)
    } finally {
      setDeletingAll(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Class Types</h1>
            <p className="text-gray-600 mt-2">Manage your class types and schedules</p>
          </div>
          <div className="flex gap-4">
            <button
              onClick={forceRefresh}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              🔄 Force Refresh
            </button>
            <button
              onClick={() => setShowDeleteAllModal(true)}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Delete All
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Class Type
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">Loading class types...</p>
          </div>
        ) : classTypes.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <Activity className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-lg font-medium text-gray-900">No class types</h3>
            <p className="mt-1 text-gray-500">Get started by creating a new class type.</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-4 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              Add Class Type
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Class Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Visibility
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sessions
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Default Capacity
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {classTypes.map((classType) => (
                  <tr key={classType.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => router.push(`/classes/${classType.id}`)}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900 hover:text-blue-600">{classType.name}</div>
                        {classType.description && (
                          <div className="text-sm text-gray-500">{classType.description}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">
                        No category
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        everyone
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {classType.sessions_count || 0} sessions
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      Not set
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button className="text-indigo-600 hover:text-indigo-900 mr-4">
                        <Edit className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => handleDeleteClassType(classType.id)}
                        className="text-red-600 hover:text-red-900"
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

        {/* Delete All Confirmation Modal */}
        {showDeleteAllModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md">
              <div className="flex items-center gap-3 mb-4">
                <AlertTriangle className="h-6 w-6 text-red-600" />
                <h3 className="text-lg font-semibold">Delete All Class Types?</h3>
              </div>
              <p className="text-gray-600 mb-6">
                This will permanently delete all class types and their associated sessions. This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowDeleteAllModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                  disabled={deletingAll}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAll}
                  className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700"
                  disabled={deletingAll}
                >
                  {deletingAll ? 'Deleting...' : 'Delete All'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add Class Type Modal */}
        {showAddModal && (
          <AddClassTypeModal
            onClose={() => setShowAddModal(false)}
            onSuccess={() => {
              setShowAddModal(false)
              forceRefresh()
            }}
          />
        )}
      </div>
    </div>
  )
}

export default function ClassesPage() {
  return (
    <DashboardLayout>
      <RequireOrganization>
        <ClassesPageContent />
      </RequireOrganization>
    </DashboardLayout>
  )
}
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Settings, Calendar, Users, Clock, MapPin } from 'lucide-react'
import DashboardLayout from '../components/DashboardLayout'
import CreateClassTypeModal from '../classes/CreateClassTypeModal'
import { RequireOrganization } from '../components/auth/RequireOrganization'
import { useOrganization } from '../hooks/useOrganization'

interface ClassType {
  id: string
  name: string
  description: string
  category: string
  visibility: string
  max_participants: number
  is_active: boolean
  session_count?: number
}

function ClassTypesPageContent() {
  const { organizationId } = useOrganization()
  const [classTypes, setClassTypes] = useState<ClassType[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    loadClassTypes()
  }, [organizationId])

  const loadClassTypes = async () => {
    if (!organizationId) return
    
    try {
      // Get class types (programs) with session counts
      const { data, error } = await supabase
        .from('programs')
        .select(`
          *,
          class_sessions(count)
        `)
        .eq('organization_id', organizationId)
        .eq('program_type', 'class_type')
        .order('created_at', { ascending: false })

      if (error) throw error

      // Process the data to get session counts
      const processedData = data.map((item: any) => ({
        ...item,
        session_count: item.class_sessions?.[0]?.count || 0
      }))

      setClassTypes(processedData || [])
    } catch (error) {
      console.error('Error loading class types:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleClassTypeCreated = (newClassType: ClassType) => {
    setClassTypes(prev => [{ ...newClassType, session_count: 0 }, ...prev])
  }

  const getVisibilityBadge = (visibility: string) => {
    const badges = {
      everyone: { text: 'Everyone', color: 'bg-green-100 text-green-800' },
      membership_holders: { text: 'Members', color: 'bg-blue-100 text-blue-800' },
      business_only: { text: 'Staff Only', color: 'bg-gray-100 text-gray-800' }
    }
    const badge = badges[visibility as keyof typeof badges] || badges.everyone
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${badge.color}`}>
        {badge.text}
      </span>
    )
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="min-h-screen bg-gray-900 p-8 flex items-center justify-center">
          <div className="text-white">Loading class types...</div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-900 p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">Class Types</h1>
              <p className="text-gray-400">Create class types first, then add sessions and schedules</p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 transition-colors"
            >
              <Plus className="h-5 w-5" />
              New Class Type
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-gray-400 text-sm mb-2">Total Class Types</h3>
              <p className="text-3xl font-bold text-white">{classTypes.length}</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-gray-400 text-sm mb-2">Active Types</h3>
              <p className="text-3xl font-bold text-white">
                {classTypes.filter(ct => ct.is_active).length}
              </p>
            </div>
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-gray-400 text-sm mb-2">Total Sessions</h3>
              <p className="text-3xl font-bold text-white">
                {classTypes.reduce((sum, ct) => sum + (ct.session_count || 0), 0)}
              </p>
            </div>
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-gray-400 text-sm mb-2">Avg Sessions per Type</h3>
              <p className="text-3xl font-bold text-white">
                {classTypes.length > 0 
                  ? Math.round(classTypes.reduce((sum, ct) => sum + (ct.session_count || 0), 0) / classTypes.length) 
                  : 0
                }
              </p>
            </div>
          </div>

          {/* Class Types List */}
          {classTypes.length === 0 ? (
            <div className="bg-gray-800 rounded-lg p-12 text-center">
              <div className="text-gray-400 mb-4">
                <Calendar className="h-16 w-16 mx-auto mb-4" />
              </div>
              <h3 className="text-lg font-medium text-gray-300 mb-2">No Class Types Created</h3>
              <p className="text-gray-500 mb-6">
                Create your first class type to get started. Class types are templates that you can use to create multiple sessions.
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 mx-auto transition-colors"
              >
                <Plus className="h-5 w-5" />
                Create First Class Type
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {classTypes.map((classType) => (
                <div key={classType.id} className="bg-gray-800 rounded-lg p-6 hover:bg-gray-750 transition-colors">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-white mb-2">{classType.name}</h3>
                      {classType.category && (
                        <span className="inline-block px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded-full mb-2">
                          {classType.category}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {getVisibilityBadge(classType.visibility)}
                      <button
                        className="text-gray-400 hover:text-white p-1"
                        title="Settings"
                      >
                        <Settings className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {classType.description && (
                    <p className="text-gray-400 text-sm mb-4 line-clamp-2">
                      {classType.description}
                    </p>
                  )}

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <Calendar className="h-4 w-4" />
                      <span>{classType.session_count || 0} sessions</span>
                    </div>
                    {classType.max_participants && (
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        <Users className="h-4 w-4" />
                        <span>Max {classType.max_participants} people</span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => window.location.href = `/classes?type=${classType.id}`}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors"
                    >
                      Add Sessions
                    </button>
                    <button
                      className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded text-sm font-medium transition-colors"
                    >
                      View Sessions
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Create Class Type Modal */}
          {showCreateModal && (
            <CreateClassTypeModal
              onClose={() => setShowCreateModal(false)}
              onSuccess={handleClassTypeCreated}
            />
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}

export default function ClassTypesPage() {
  return (
    <RequireOrganization>
      <ClassTypesPageContent />
    </RequireOrganization>
  )
}
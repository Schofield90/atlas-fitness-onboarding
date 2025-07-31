'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/app/lib/supabase/client'
import { Calendar, Clock, Users, MapPin, DollarSign, Plus, Edit, Trash2, AlertTriangle } from 'lucide-react'
import DashboardLayout from '../components/DashboardLayout'
import AddClassModal from './AddClassModal'

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

export default function ClassesPage() {
  const [classes, setClasses] = useState<ClassSession[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false)
  const [deletingAll, setDeletingAll] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    loadClasses()
  }, [])

  const loadClasses = async () => {
    try {
      const { data, error } = await supabase
        .from('class_sessions')
        .select(`
          *,
          bookings:bookings(count)
        `)
        .order('start_time', { ascending: true })

      if (error) throw error

      setClasses(data || [])
    } catch (error) {
      console.error('Error loading classes:', error)
    } finally {
      setLoading(false)
    }
  }

  const deleteAllClasses = async () => {
    setDeletingAll(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: staffData } = await supabase
        .from('organization_staff')
        .select('organization_id')
        .eq('user_id', user.id)
        .single()

      if (!staffData) return

      // Delete all classes for this organization
      const { error } = await supabase
        .from('class_sessions')
        .delete()
        .eq('organization_id', staffData.organization_id)

      if (error) throw error

      setShowDeleteAllModal(false)
      loadClasses()
    } catch (error) {
      console.error('Error deleting classes:', error)
      alert('Failed to delete classes')
    } finally {
      setDeletingAll(false)
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
      loadClasses()
    } catch (error) {
      console.error('Error deleting class:', error)
      alert('Failed to delete class')
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

  const getDayName = (dayNumber: number) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    return days[dayNumber]
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="min-h-screen bg-gray-900 p-8 flex items-center justify-center">
          <div className="text-white">Loading classes...</div>
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
              <h1 className="text-4xl font-bold text-white mb-2">Classes</h1>
              <p className="text-gray-400">Manage your gym classes and schedules</p>
            </div>
            <div className="flex gap-3">
              {classes.length > 0 && (
                <button
                  onClick={() => setShowDeleteAllModal(true)}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-lg flex items-center gap-2 transition-colors"
                >
                  <Trash2 className="h-5 w-5" />
                  Delete All
                </button>
              )}
              <button
                onClick={() => setShowAddModal(true)}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 transition-colors"
              >
                <Plus className="h-5 w-5" />
                Add New Class
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-gray-400 text-sm mb-2">Total Classes</h3>
              <p className="text-3xl font-bold text-white">{classes.length}</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-gray-400 text-sm mb-2">Today's Classes</h3>
              <p className="text-3xl font-bold text-white">
                {classes.filter(c => {
                  const classDate = new Date(c.start_time).toDateString()
                  const today = new Date().toDateString()
                  return classDate === today
                }).length}
              </p>
            </div>
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-gray-400 text-sm mb-2">Total Bookings</h3>
              <p className="text-3xl font-bold text-white">
                {classes.reduce((sum, c) => sum + (c.bookings_count || 0), 0)}
              </p>
            </div>
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-gray-400 text-sm mb-2">Average Capacity</h3>
              <p className="text-3xl font-bold text-white">
                {classes.length > 0 
                  ? Math.round(classes.reduce((sum, c) => sum + ((c.bookings_count || 0) / c.capacity * 100), 0) / classes.length) 
                  : 0}%
              </p>
            </div>
          </div>

          {/* Classes List */}
          <div className="bg-gray-800 rounded-lg overflow-hidden">
            <div className="p-6 border-b border-gray-700">
              <h2 className="text-xl font-semibold text-white">All Classes</h2>
            </div>
            
            {classes.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-gray-400 mb-4">No classes scheduled yet</p>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="text-green-500 hover:text-green-400"
                >
                  Create your first class
                </button>
              </div>
            ) : (
              <div className="divide-y divide-gray-700">
                {classes.map((classSession) => (
                  <div key={classSession.id} className="p-6 hover:bg-gray-700/50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-4 mb-2">
                          <h3 className="text-lg font-semibold text-white">{classSession.name}</h3>
                          {classSession.recurring && (
                            <span className="px-2 py-1 bg-blue-900 text-blue-300 text-xs rounded">
                              Recurring
                            </span>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-400">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            <span>{classSession.instructor_name}</span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span>
                              {classSession.recurring 
                                ? `Every ${getDayName(classSession.day_of_week || 0)}`
                                : formatDate(classSession.start_time)
                              }
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            <span>
                              {formatTime(classSession.start_time)} ({classSession.duration_minutes} min)
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            <span>{classSession.location || 'Main Studio'}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-6 mt-3">
                          <div className="flex items-center gap-2 text-sm">
                            <Users className="h-4 w-4 text-gray-500" />
                            <span className="text-white">
                              {classSession.bookings_count || 0} / {classSession.capacity}
                            </span>
                            <span className="text-gray-400">booked</span>
                          </div>
                          
                          <div className="flex items-center gap-2 text-sm">
                            <DollarSign className="h-4 w-4 text-gray-500" />
                            <span className="text-white">£{(classSession.price / 100).toFixed(2)}</span>
                          </div>
                        </div>
                        
                        {classSession.description && (
                          <p className="text-sm text-gray-400 mt-2">{classSession.description}</p>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 ml-4">
                        <button className="p-2 text-gray-400 hover:text-white transition-colors">
                          <Edit className="h-5 w-5" />
                        </button>
                        <button 
                          onClick={() => deleteClass(classSession.id)}
                          className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add Class Modal */}
          {showAddModal && (
            <AddClassModal
              onClose={() => setShowAddModal(false)}
              onSuccess={() => {
                setShowAddModal(false)
                loadClasses()
              }}
            />
          )}

          {/* Delete All Modal */}
          {showDeleteAllModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full">
                <div className="flex items-center gap-3 mb-4">
                  <AlertTriangle className="h-6 w-6 text-red-500" />
                  <h2 className="text-xl font-semibold text-white">Delete All Classes</h2>
                </div>
                <p className="text-gray-300 mb-6">
                  Are you sure you want to delete all classes? This will remove all {classes.length} classes and cannot be undone.
                </p>
                <div className="flex gap-4">
                  <button
                    onClick={deleteAllClasses}
                    disabled={deletingAll}
                    className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white py-2 rounded transition-colors"
                  >
                    {deletingAll ? 'Deleting...' : 'Delete All Classes'}
                  </button>
                  <button
                    onClick={() => setShowDeleteAllModal(false)}
                    disabled={deletingAll}
                    className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}